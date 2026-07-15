"""
EventBus — an in-process async pub/sub system.

Each AccountRuntime owns one EventBus instance. Internal components (AutoReply,
ReplyMacro, Scheduler, HealthMonitor, etc.) subscribe to events and react
without direct coupling.

v2 — Added cross-account events for RuntimeManager-level coordination.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable

logger = logging.getLogger(__name__)


# ── Event types ──────────────────────────────────────────────────────


@dataclass
class Event:
    """Base event — all runtime events inherit from this."""
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    account_id: str = ""


@dataclass
class MessageReceivedEvent(Event):
    """A new message was received from Telegram (user → account)."""
    chat_id: int = 0
    user_id: int = 0
    user_name: str | None = None
    message: str = ""
    message_id: int = 0


@dataclass
class AutoReplyTriggeredEvent(Event):
    """An auto-reply rule matched and a response was sent."""
    rule_id: str = ""
    rule_name: str = ""
    target_chat_id: int = 0
    target_user_id: int = 0
    reply_sent: str = ""
    status: str = ""  # "success" | "failed" | "rate_limited"


@dataclass
class BroadcastQueuedEvent(Event):
    """A new broadcast was queued for delivery."""
    broadcast_id: str = ""
    recipient_count: int = 0


@dataclass
class BroadcastCompletedEvent(Event):
    """A broadcast (or one child execution) finished."""
    broadcast_id: str = ""
    status: str = ""  # "sent" | "failed" | "cancelled"
    error_message: str | None = None


@dataclass
class RateLimitHitEvent(Event):
    """A rate limit was encountered for this account."""
    action: str = ""  # "send_message", "join_group", etc.
    retry_after_seconds: float = 0.0


@dataclass
class HealthStatusChangedEvent(Event):
    """Account health status changed."""
    previous_status: str = ""
    new_status: str = ""
    reason: str | None = None


@dataclass
class SessionExpiredEvent(Event):
    """The Telethon session expired or became invalid."""
    detail: str | None = None


@dataclass
class AccountBannedEvent(Event):
    """Account was banned by Telegram."""
    detail: str | None = None


@dataclass
class GroupCacheUpdatedEvent(Event):
    """The group/dialog cache was refreshed."""
    group_count: int = 0


@dataclass
class RecoveryTriggeredEvent(Event):
    """Auto-recovery routine was triggered."""
    recovery_action: str = ""
    result: str = ""  # "success" | "failed" | "skipped"


@dataclass
class SessionAutoRecoveredEvent(Event):
    """Session auto-recovery completed successfully."""
    method: str = ""  # "reconnect" | "recreate" | "ping"
    detail: str | None = None


# ── Cross-account Events (emitted from RuntimeManager) ────────────────

@dataclass
class CrossAccountBroadcastRequestedEvent(Event):
    """A broadcast needs to be sent from a specific account."""
    broadcast_id: str = ""
    target_account_id: str = ""
    message: str = ""
    recipients: list[str] = field(default_factory=list)
    reply_to_message_id: int | None = None


@dataclass
class AccountRuntimeInspectorEvent(Event):
    """Snapshot of a runtime's internal state for inspection."""
    runtime_state: dict = field(default_factory=dict)


# ── Callback type ───────────────────────────────────────────────────

EventHandler = Callable[[Event], Awaitable[None]]
"""Signature for async event handlers."""


# ── EventBus ─────────────────────────────────────────────────────────


class EventBus:
    """Lightweight in-process pub/sub.

    Usage::

        bus = EventBus("account_123")
        bus.subscribe(MessageReceivedEvent, my_handler)
        await bus.emit(MessageReceivedEvent(chat_id=..., ...))
        bus.unsubscribe(MessageReceivedEvent, my_handler)
    """

    def __init__(self, account_id: str) -> None:
        self._account_id = account_id
        self._subscribers: dict[type[Event], list[EventHandler]] = {}
        self._lock = asyncio.Lock()

    # ── Public API ─────────────────────────────────────────────────

    def subscribe(self, event_type: type[Event], handler: EventHandler) -> None:
        """Register *handler* to be called when an *event_type* is emitted."""
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(handler)
        logger.debug(
            "[%s] subscribed %s.%s",
            self._account_id,
            event_type.__name__,
            getattr(handler, "__name__", "<lambda>"),
        )

    def unsubscribe(self, event_type: type[Event], handler: EventHandler) -> None:
        """Remove a previously registered *handler*."""
        handlers = self._subscribers.get(event_type)
        if handlers:
            try:
                handlers.remove(handler)
            except ValueError:
                pass

    async def emit(self, event: Event) -> None:
        """Publish *event* to all subscribers of its type (and parents)."""
        event.account_id = self._account_id
        event.timestamp = datetime.now(timezone.utc)
        mro = type(event).__mro__
        tasks: list[asyncio.Task[None]] = []
        async with self._lock:
            for event_type in mro:
                if event_type is Event or event_type is object:
                    continue
                handlers = list(self._subscribers.get(event_type, []))
                for handler in handlers:
                    tasks.append(asyncio.create_task(self._safe_call(handler, event)))

        if tasks:
            done, pending = await asyncio.wait(tasks, timeout=30)
            for t in pending:
                t.cancel()
                logger.warning(
                    "[%s] handler timed out for %s",
                    self._account_id,
                    type(event).__name__,
                )

    async def _safe_call(self, handler: EventHandler, event: Event) -> None:
        try:
            await handler(event)
        except Exception:
            logger.exception(
                "[%s] handler error for %s (%s)",
                self._account_id,
                type(event).__name__,
                getattr(handler, "__name__", "<anonymous>"),
            )

    def clear(self) -> None:
        """Remove all subscribers (used during account removal)."""
        self._subscribers.clear()