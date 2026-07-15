"""
AccountRuntime — each Telegram account runs as an independent runtime.

One instance per account. Contains:
  - Telethon client (connected, auto-reconnecting)
  - EventBus (internal pub/sub)
  - RateLimiter (per-action token bucket)
  - AutoReply engine (listens for incoming messages, matches rules)
  - ReplyMacro engine (scheduled messages to target chats)
  - Broadcast Queue (async dispatcher for outgoing messages)
  - Group/Dialog Cache (periodically refreshed)
  - Health Monitor (tracks session status, errors, rate limits)
  - Auto Recovery (handles session expiry, rate limits, bans)
  - Scheduler (manages recurring tasks)
"""

from __future__ import annotations

import asyncio
import logging
import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Coroutine

from telethon import TelegramClient
from telethon.errors import (
    FloodWaitError,
    SessionPasswordNeededError,
    AuthKeyUnregisteredError,
    RPCError,
)
from telethon.events import NewMessage
from telethon.tl.types import (
    Channel,
    Chat,
    Dialog,
    Message,
    User,
)

from .event_bus import (
    EventBus,
    AccountBannedEvent,
    AutoReplyTriggeredEvent,
    BroadcastCompletedEvent,
    BroadcastQueuedEvent,
    GroupCacheUpdatedEvent,
    HealthStatusChangedEvent,
    MessageReceivedEvent,
    RateLimitHitEvent,
    RecoveryTriggeredEvent,
    SessionExpiredEvent,
)
from .models import (
    Account,
    AccountHealthItem,
    AutoReplyLog,
    AutoReplyRule,
    AutoReplySettings,
    Broadcast,
    BroadcastChild,
    CreateBroadcastInput,
    Group,
    InlineButton,
    ReplyMacro,
    ReplyMacroLog,
)
from .rate_limiter import RateLimiter

logger = logging.getLogger(__name__)


# ── Scheduler ───────────────────────────────────────────────────────


class Scheduler:
    """Lightweight async task scheduler for recurring operations."""

    def __init__(self, account_id: str) -> None:
        self._account_id = account_id
        self._tasks: dict[str, asyncio.Task[None]] = {}
        self._interval_handlers: dict[str, tuple[float, Callable[[], Coroutine[Any, Any, None]]]] = {}
        self._running = False

    def start(self) -> None:
        self._running = True

    def stop(self) -> None:
        self._running = False
        for name, task in self._tasks.items():
            task.cancel()
        self._tasks.clear()

    def every(self, name: str, interval_seconds: float, handler: Callable[[], Coroutine[Any, Any, None]]) -> None:
        """Schedule *handler* to run every *interval_seconds*."""
        self._interval_handlers[name] = (interval_seconds, handler)
        if self._running:
            self._spawn(name, interval_seconds, handler)

    def cancel(self, name: str) -> None:
        task = self._tasks.pop(name, None)
        if task:
            task.cancel()
        self._interval_handlers.pop(name, None)

    def _spawn(self, name: str, interval: float, handler: Callable[[], Coroutine[Any, Any, None]]) -> None:
        if name in self._tasks:
            self._tasks[name].cancel()

        async def loop() -> None:
            while self._running:
                try:
                    # Fire handler as task so long-running handlers don't
                    # delay the next interval.
                    task = asyncio.create_task(handler())
                    await asyncio.sleep(interval)
                except asyncio.CancelledError:
                    break
                except Exception:
                    logger.exception("[%s] scheduler error in %s", self._account_id, name)

        self._tasks[name] = asyncio.create_task(loop(), name=f"scheduler-{self._account_id}-{name}")


# ── Group/Dialog Cache ─────────────────────────────────────────────


class GroupCache:
    """Cached list of dialogs (groups/channels/users) for this account."""

    def __init__(self, account_id: str) -> None:
        self._account_id = account_id
        self._groups: list[Group] = []
        self._by_id: dict[str, Group] = {}
        self._last_refreshed: float = 0.0
        self._lock = asyncio.Lock()

    async def refresh(self, client: TelegramClient) -> list[Group]:
        """Fetch all dialogs from Telegram and update the cache."""
        async with self._lock:
            try:
                dialogs = client.iter_dialogs()
                groups: list[Group] = []
                async for dialog in dialogs:
                    entity = dialog.entity
                    g = Group(
                        id=str(entity.id),
                        title=dialog.name or "Unknown",
                        type=self._entity_type(entity),
                        participants_count=getattr(entity, "participants_count", None),
                    )
                    groups.append(g)

                self._groups = groups
                self._by_id = {g.id: g for g in groups}
                self._last_refreshed = time.time()
                logger.info("[%s] group cache refreshed: %d groups", self._account_id, len(groups))
                return groups
            except Exception:
                logger.exception("[%s] failed to refresh group cache", self._account_id)
                return self._groups

    def get_all(self) -> list[Group]:
        return list(self._groups)

    def get(self, group_id: str) -> Group | None:
        return self._by_id.get(group_id)

    def count(self) -> int:
        return len(self._groups)

    def last_refreshed(self) -> float:
        return self._last_refreshed

    @staticmethod
    def _entity_type(entity: Any) -> str:
        if isinstance(entity, Channel):
            return "megagroup" if getattr(entity, "megagroup", False) else "channel"
        elif isinstance(entity, Chat):
            return "group"
        return "group"


# ── Broadcast Queue ─────────────────────────────────────────────────


class BroadcastQueue:
    """Async queue that dispatches messages to Telegram recipients.

    Processes one broadcast at a time per account, respecting rate limits.
    """

    MAX_RETRIES = 5
    """Maximum number of flood-wait retries before marking a broadcast as failed."""

    def __init__(self, account_id: str, client: TelegramClient, rate_limiter: RateLimiter, event_bus: EventBus) -> None:
        self._account_id = account_id
        self._client = client
        self._rate_limiter = rate_limiter
        self._event_bus = event_bus
        self._queue: asyncio.Queue[Broadcast] = asyncio.Queue()
        self._active_broadcasts: dict[str, Broadcast] = {}
        self._completed: list[Broadcast] = []
        self._max_completed = 200
        self._retry_counts: dict[str, int] = {}  # broadcast_id -> retry count
        self._processing = False
        self._task: asyncio.Task[None] | None = None

    def start(self) -> None:
        if self._task is None:
            self._task = asyncio.create_task(
                self._process_loop(), name=f"broadcast-queue-{self._account_id}"
            )

    def stop(self) -> None:
        if self._task:
            self._task.cancel()
            self._task = None

    async def enqueue(self, broadcast: Broadcast) -> None:
        await self._queue.put(broadcast)
        self._active_broadcasts[broadcast.id] = broadcast
        await self._event_bus.emit(BroadcastQueuedEvent(
            broadcast_id=broadcast.id,
            recipient_count=len(broadcast.recipients),
        ))

    async def _process_loop(self) -> None:
        while True:
            try:
                broadcast = await self._queue.get()
                await self._dispatch(broadcast)
            except asyncio.CancelledError:
                break
            except Exception:
                logger.exception("[%s] broadcast processing error", self._account_id)

    async def _dispatch(self, broadcast: Broadcast) -> None:
        """Send the broadcast message to all recipients one by one."""
        broadcast.status = "sending"
        success_count = 0
        fail_count = 0

        for recipient_id in broadcast.recipients:
            # Rate limit: 1 msg/sec per chat
            if not await self._rate_limiter.acquire("send_message", chat_id=recipient_id, timeout=30):
                fail_count += 1
                continue

            try:
                entity = await self._client.get_entity(int(recipient_id))
                if broadcast.reply_to_message_id:
                    await self._client.send_message(
                        entity,
                        broadcast.message,
                        reply_to=broadcast.reply_to_message_id,
                    )
                else:
                    await self._client.send_message(entity, broadcast.message)
                success_count += 1
            except FloodWaitError as e:
                retry_count = self._retry_counts.get(broadcast.id, 0)
                if retry_count >= self.MAX_RETRIES:
                    broadcast.status = "failed"
                    broadcast.error_message = f"Flood wait limit exceeded after {self.MAX_RETRIES} retries"
                    break

                await self._event_bus.emit(RateLimitHitEvent(
                    action="send_message",
                    retry_after_seconds=e.seconds,
                ))
                self._rate_limiter.adjust_limit("send_message", 1.0, max(e.seconds + 1, 5.0))
                self._retry_counts[broadcast.id] = retry_count + 1

                # Clone recipient list — re-queue remaining after flood wait
                current_idx = list(broadcast.recipients).index(recipient_id)
                remaining = list(broadcast.recipients)[current_idx:]
                logger.info(
                    "[%s] flood wait %.0fs (retry %d/%d), %d remaining",
                    self._account_id, e.seconds, retry_count + 1, self.MAX_RETRIES, len(remaining),
                )
                await asyncio.sleep(min(e.seconds, 60))  # Cap sleep at 60s
                # Re-queue only the remaining (unprocessed) recipients
                broadcast.recipients = [recipient_id] + list(broadcast.recipients)[current_idx + 1:]
                await self._queue.put(broadcast)
                return
            except AuthKeyUnregisteredError:
                broadcast.status = "failed"
                broadcast.error_message = "세션이 만료되었습니다. 계정 재인증이 필요합니다."
                await self._event_bus.emit(SessionExpiredEvent(detail="Broadcast failed - auth key unregistered"))
                break
            except RPCError as e:
                fail_count += 1
                logger.warning("[%s] RPC error sending to %s: %s", self._account_id, recipient_id, e)
            except Exception as e:
                fail_count += 1
                logger.warning("[%s] error sending to %s: %s", self._account_id, recipient_id, e)

            # 1 second delay between recipients (Telegram best practice)
            await asyncio.sleep(1)

        broadcast.status = "sent" if fail_count == 0 else "failed" if success_count == 0 else "sent"
        broadcast.sent_at = datetime.now(timezone.utc).isoformat()
        self._completed.append(broadcast)
        if len(self._completed) > self._max_completed:
            self._completed = self._completed[-self._max_completed:]
        self._active_broadcasts.pop(broadcast.id, None)

        await self._event_bus.emit(BroadcastCompletedEvent(
            broadcast_id=broadcast.id,
            status=broadcast.status,
            error_message=broadcast.error_message,
        ))

    def get_active(self) -> list[Broadcast]:
        return list(self._active_broadcasts.values())

    def get_completed(self, limit: int = 50) -> list[Broadcast]:
        return list(self._completed)[-limit:]


# ── AutoReply Engine ────────────────────────────────────────────────


class AutoReplyEngine:
    """Listens for incoming messages and responds based on configured rules."""

    def __init__(
        self,
        account_id: str,
        client: TelegramClient,
        rate_limiter: RateLimiter,
        event_bus: EventBus,
    ) -> None:
        self._account_id = account_id
        self._client = client
        self._rate_limiter = rate_limiter
        self._event_bus = event_bus
        self._enabled = False
        self._rules: list[AutoReplyRule] = []
        self._logs: list[AutoReplyLog] = []
        self._max_logs = 200
        self._daily_counts: dict[str, int] = defaultdict(int)  # rule_id -> count
        self._last_cooldown: dict[str, float] = {}  # (rule_id, user_id) -> timestamp
        self._handler: Any = None
        self._lock = asyncio.Lock()  # Protects _rules and _enabled from concurrent access

    async def start(self) -> None:
        """Register the Telethon event handler for incoming messages."""
        if self._handler is not None:
            return
        self._handler = self._on_message
        self._client.add_event_handler(self._handler, NewMessage(incoming=True))

    def stop(self) -> None:
        """Remove the event handler."""
        if self._handler is not None and self._client.is_connected():
            try:
                self._client.remove_event_handler(self._handler, NewMessage)
            except Exception:
                pass
        self._handler = None
        self._enabled = False

    def set_enabled(self, enabled: bool) -> None:
        self._enabled = enabled

    def is_enabled(self) -> bool:
        return self._enabled

    def set_rules(self, rules: list[AutoReplyRule]) -> None:
        self._rules = rules

    def get_settings(self) -> AutoReplySettings:
        return AutoReplySettings(
            account_id=self._account_id,
            auto_reply_enabled=self._enabled,
            rules=self._rules,
        )

    def get_logs(self) -> list[AutoReplyLog]:
        return list(self._logs)

    async def _on_message(self, event: Any) -> None:
        """Process an incoming message."""
        # Snapshot rules under lock to avoid race with API mutations
        async with self._lock:
            enabled = self._enabled
            rules = list(self._rules)

        if not enabled or not rules:
            return

        message = event.message
        if not message or not message.text:
            return
        if message.out:
            return  # Don't react to own messages

        text = message.text.strip()
        chat_id = str(message.chat_id)
        user_id = str(message.sender_id)
        user_name = getattr(message.sender, "first_name", None) or getattr(message.sender, "username", None) or None

        await self._event_bus.emit(MessageReceivedEvent(
            chat_id=int(chat_id),
            user_id=int(user_id),
            user_name=user_name,
            message=text,
            message_id=message.id,
        ))

        for rule in rules:
            if not rule.is_active:
                continue

            # Match the rule
            matched = False
            if rule.match_type == "exact":
                matched = text == rule.match_value
            elif rule.match_type == "keyword":
                matched = rule.match_value.lower() in text.lower()

            if not matched:
                continue

            # Check cooldown per user
            cooldown_key = (rule.id, user_id)
            last_time = self._last_cooldown.get(cooldown_key, 0.0)
            if rule.cooldown_hours > 0 and (time.time() - last_time) < (rule.cooldown_hours * 3600):
                continue

            # Check daily limit
            if self._daily_counts[rule.id] >= rule.max_replies_per_day:
                continue

            # Rate limit auto-reply
            if not await self._rate_limiter.acquire("auto_reply", chat_id=chat_id, timeout=10):
                # Log as rate limited
                self._add_log(AutoReplyLog(
                    id="",
                    rule_id=rule.id,
                    account_id=self._account_id,
                    chat_id=chat_id,
                    user_id=user_id,
                    user_name=user_name,
                    trigger_message=text,
                    reply_sent=rule.reply_content,
                    status="rate_limited",
                    created_at=datetime.now(timezone.utc).isoformat(),
                ))
                continue

            try:
                entity = await self._client.get_entity(int(chat_id))
                await self._client.send_message(entity, rule.reply_content, reply_to=message.id)

                self._daily_counts[rule.id] += 1
                self._last_cooldown[cooldown_key] = time.time()

                log_entry = AutoReplyLog(
                    id="",
                    rule_id=rule.id,
                    account_id=self._account_id,
                    chat_id=chat_id,
                    user_id=user_id,
                    user_name=user_name,
                    trigger_message=text,
                    reply_sent=rule.reply_content,
                    status="success",
                    created_at=datetime.now(timezone.utc).isoformat(),
                )
                self._add_log(log_entry)

                await self._event_bus.emit(AutoReplyTriggeredEvent(
                    rule_id=rule.id,
                    rule_name=rule.name,
                    target_chat_id=int(chat_id),
                    target_user_id=int(user_id),
                    reply_sent=rule.reply_content,
                    status="success",
                ))
            except Exception as e:
                log_entry = AutoReplyLog(
                    id="",
                    rule_id=rule.id,
                    account_id=self._account_id,
                    chat_id=chat_id,
                    user_id=user_id,
                    user_name=user_name,
                    trigger_message=text,
                    reply_sent=rule.reply_content,
                    status="failed",
                    created_at=datetime.now(timezone.utc).isoformat(),
                    error_message=str(e),
                )
                self._add_log(log_entry)
            break  # Only match the first applicable rule

    def _add_log(self, log: AutoReplyLog) -> None:
        self._logs.append(log)
        if len(self._logs) > self._max_logs:
            self._logs = self._logs[-self._max_logs:]


# ── ReplyMacro Engine ────────────────────────────────────────────────


class ReplyMacroEngine:
    """Manages scheduled message macros (interval-based or fixed-time)."""

    def __init__(
        self,
        account_id: str,
        client: TelegramClient,
        rate_limiter: RateLimiter,
        event_bus: EventBus,
        scheduler: Scheduler,
    ) -> None:
        self._account_id = account_id
        self._client = client
        self._rate_limiter = rate_limiter
        self._event_bus = event_bus
        self._scheduler = scheduler
        self._macros: dict[str, ReplyMacro] = {}
        self._logs: list[ReplyMacroLog] = []
        self._max_logs = 200

    def set_macros(self, macros: list[ReplyMacro]) -> None:
        """Replace all macros and reschedule."""
        old_ids = set(self._macros.keys())
        new_ids = set()

        for macro in macros:
            new_ids.add(macro.id)
            old = self._macros.get(macro.id)
            if old is None or old.is_active != macro.is_active or old.interval_hours != macro.interval_hours:
                # Reschedule
                schedule_name = f"macro-{macro.id}"
                self._scheduler.cancel(schedule_name)
                if macro.is_active:
                    self._schedule_macro(macro)

        # Remove deleted macros
        for oid in old_ids - new_ids:
            self._scheduler.cancel(f"macro-{oid}")

        self._macros = {m.id: m for m in macros}

    def get_macros(self) -> list[ReplyMacro]:
        return list(self._macros.values())

    def get_logs(self, macro_id: str | None = None) -> list[ReplyMacroLog]:
        if macro_id:
            return [log for log in self._logs if log.macro_id == macro_id]
        return list(self._logs)

    def _schedule_macro(self, macro: ReplyMacro) -> None:
        """Register the macro in the scheduler."""
        if macro.schedule_type == "interval":
            interval = max(macro.interval_hours * 3600, 300)  # At least 5 minutes
            self._scheduler.every(
                f"macro-{macro.id}",
                interval,
                lambda m=macro: self._execute_macro(m),
            )
        elif macro.schedule_type == "fixed" and macro.fixed_time:
            # For fixed time, we check every minute if it's time to send
            self._scheduler.every(
                f"macro-{macro.id}",
                60,  # Check every minute
                lambda m=macro: self._check_fixed_time(m),
            )

    async def _execute_macro(self, macro: ReplyMacro) -> None:
        """Send the macro message to all target chats."""
        for target_chat_id in macro.target_chats:
            if not await self._rate_limiter.acquire("send_message", chat_id=target_chat_id, timeout=30):
                continue

            try:
                entity = await self._client.get_entity(int(target_chat_id))
                await self._client.send_message(entity, macro.message_content)
                self._add_log(ReplyMacroLog(
                    id="",
                    macro_id=macro.id,
                    account_id=self._account_id,
                    target_chat_id=target_chat_id,
                    message_sent=macro.message_content,
                    status="sent",
                    created_at=datetime.now(timezone.utc).isoformat(),
                ))
            except Exception as e:
                self._add_log(ReplyMacroLog(
                    id="",
                    macro_id=macro.id,
                    account_id=self._account_id,
                    target_chat_id=target_chat_id,
                    message_sent=macro.message_content,
                    status="failed",
                    error_message=str(e),
                    created_at=datetime.now(timezone.utc).isoformat(),
                ))

            await asyncio.sleep(2)  # Delay between targets

        # Update last_sent_at
        macro.last_sent_at = datetime.now(timezone.utc).isoformat()

    async def _check_fixed_time(self, macro: ReplyMacro) -> None:
        """Check if it's time to execute a fixed-time macro."""
        if not macro.fixed_time:
            return
        now = datetime.now(timezone.utc)
        # Parse fixed_time as HH:MM (in UTC)
        try:
            parts = macro.fixed_time.split(":")
            target_hour = int(parts[0])
            target_min = int(parts[1])
        except (ValueError, IndexError):
            return

        if now.hour == target_hour and now.minute == target_min:
            await self._execute_macro(macro)

    def _add_log(self, log: ReplyMacroLog) -> None:
        self._logs.append(log)
        if len(self._logs) > self._max_logs:
            self._logs = self._logs[-self._max_logs:]


# ── Health Monitor ─────────────────────────────────────────────────


@dataclass
class HealthState:
    status: str = "unknown"  # healthy, unauthorized, banned, rate_limited, error
    last_activity: float = 0.0
    last_error: str | None = None
    last_error_status: str | None = None
    recent_success_count: int = 0
    recent_failure_count: int = 0
    total_delivery_attempts: int = 0
    has_session: bool = False


class HealthMonitor:
    """Monitors account health by tracking errors, sessions, and activity."""

    def __init__(self, account_id: str, client: TelegramClient, event_bus: EventBus) -> None:
        self._account_id = account_id
        self._client = client
        self._event_bus = event_bus
        self._state = HealthState()
        self._success_window: list[float] = []  # timestamps of recent successes
        self._error_window: list[float] = []  # timestamps of recent failures

    def record_success(self) -> None:
        now = time.time()
        self._state.last_activity = now
        self._state.recent_success_count += 1
        self._state.total_delivery_attempts += 1
        self._success_window.append(now)
        self._prune_windows()

    def record_failure(self, error_message: str, error_status: str | None = None) -> None:
        now = time.time()
        self._state.last_error = error_message
        self._state.last_error_status = error_status
        self._state.recent_failure_count += 1
        self._state.total_delivery_attempts += 1
        self._error_window.append(now)
        self._prune_windows()

        # Update status based on error
        old_status = self._state.status
        if "ban" in error_message.lower():
            self._state.status = "banned"
        elif "unauthorized" in error_message.lower() or "auth" in error_message.lower():
            self._state.status = "unauthorized"
        elif "flood" in error_message.lower() or "limit" in error_message.lower():
            self._state.status = "rate_limited"
        else:
            self._state.status = "error"

        if old_status != self._state.status:
            asyncio.create_task(self._event_bus.emit(HealthStatusChangedEvent(
                previous_status=old_status,
                new_status=self._state.status,
                reason=error_message,
            )))

    def set_session_status(self, has_session: bool) -> None:
        old_status = self._state.status
        self._state.has_session = has_session
        if not has_session:
            self._state.status = "unauthorized"
        elif self._state.status == "unauthorized" and has_session:
            self._state.status = "healthy"
        if old_status != self._state.status:
            asyncio.create_task(self._event_bus.emit(HealthStatusChangedEvent(
                previous_status=old_status,
                new_status=self._state.status,
            )))

    def get_health_item(self, phone: str, name: str | None = None) -> AccountHealthItem:
        return AccountHealthItem(
            account_id=self._account_id,
            phone=phone,
            name=name,
            status=self._state.status,
            has_session=self._state.has_session,
            last_activity=datetime.fromtimestamp(self._state.last_activity, tz=timezone.utc).isoformat() if self._state.last_activity else None,
            last_error=self._state.last_error,
            last_error_status=self._state.last_error_status,
            recent_success_count=self._state.recent_success_count,
            recent_failure_count=self._state.recent_failure_count,
            total_delivery_attempts=self._state.total_delivery_attempts,
        )

    def _prune_windows(self) -> None:
        cutoff = time.time() - 3600  # Keep 1 hour window
        self._success_window = [t for t in self._success_window if t > cutoff]
        self._error_window = [t for t in self._error_window if t > cutoff]


# ── Auto Recovery ──────────────────────────────────────────────────


class AutoRecovery:
    """Attempts to recover from common failure modes automatically."""

    RECOVERY_RULES: dict[str, tuple[str, str]] = {
        "rate_limited": ("wait_and_retry", "retryable"),
        "unauthorized": ("reauthenticate_account", "not_retryable"),
        "banned": ("account_is_banned", "not_retryable"),
        "error": ("retry_broadcast", "conditional"),
    }

    def __init__(self, account_id: str, client: TelegramClient, health_monitor: HealthMonitor, event_bus: EventBus) -> None:
        self._account_id = account_id
        self._client = client
        self._health_monitor = health_monitor
        self._event_bus = event_bus

    async def attempt_recovery(self, error_category: str) -> str:
        """Attempt to recover from *error_category*.

        Returns "success", "failed", or "skipped".
        """
        rule, _ = self.RECOVERY_RULES.get(error_category, ("none", "not_retryable"))

        if rule == "wait_and_retry":
            await asyncio.sleep(30)
            outcome = "success"

        elif rule == "reauthenticate_account":
            # Check if the session is still valid by pinging Telegram
            try:
                me = await self._client.get_me()
                if me:
                    self._health_monitor.set_session_status(True)
                    outcome = "success"
                else:
                    outcome = "failed"
            except Exception:
                outcome = "failed"

        elif rule == "retry_broadcast":
            outcome = "success"  # Will be retried by the broadcast queue

        else:
            outcome = "skipped"

        await self._event_bus.emit(RecoveryTriggeredEvent(
            recovery_action=rule,
            result=outcome,
        ))

        if outcome == "success":
            self._health_monitor.set_session_status(True)

        return outcome


# ── AccountRuntime ─────────────────────────────────────────────────


class AccountRuntime:
    """Complete independent runtime for one Telegram account."""

    def __init__(
        self,
        account_id: str,
        phone: str,
        api_id: int,
        api_hash: str,
        session_path: str,
    ) -> None:
        self.account_id = account_id
        self.phone = phone

        # Core components
        self.client = TelegramClient(session_path, api_id, api_hash)
        self.event_bus = EventBus(account_id)
        self.rate_limiter = RateLimiter(account_id)
        self.scheduler = Scheduler(account_id)
        self.group_cache = GroupCache(account_id)
        self.broadcast_queue = BroadcastQueue(account_id, self.client, self.rate_limiter, self.event_bus)
        self.auto_reply = AutoReplyEngine(account_id, self.client, self.rate_limiter, self.event_bus)
        self.health_monitor = HealthMonitor(account_id, self.client, self.event_bus)
        self.auto_recovery = AutoRecovery(account_id, self.client, self.health_monitor, self.event_bus)
        self.reply_macro = ReplyMacroEngine(account_id, self.client, self.rate_limiter, self.event_bus, self.scheduler)

        # State
        self._name: str | None = None
        self._status: str = "inactive"  # active, inactive, banned
        self._auto_reply_enabled: bool = False
        self._today_sent: int = 0
        self._started_at: float | None = None
        self._running = False

        # Persistence
        self._broadcast_store: list[Broadcast] = []
        self._max_broadcasts = 500

        # Wire up event bus subscriptions for health monitoring
        self.event_bus.subscribe(BroadcastCompletedEvent, self._on_broadcast_completed)
        self.event_bus.subscribe(RateLimitHitEvent, self._on_rate_limit_hit)

    # ── Lifecycle ─────────────────────────────────────────────────

    async def start(self) -> bool:
        """Connect the Telethon client and start all subsystems.

        Returns True if the session is usable (already authenticated).
        """
        try:
            await self.client.start(phone=self.phone)
            self._running = True
            self._started_at = time.time()
            self._status = "active"

            # Check if we're authenticated
            me = await self.client.get_me()
            if me:
                self._name = getattr(me, "first_name", None) or getattr(me, "username", None) or None
                self.health_monitor.set_session_status(True)
            else:
                self.health_monitor.set_session_status(False)

            # Start subsystems
            self.scheduler.start()
            self.broadcast_queue.start()
            await self.auto_reply.start()

            # Schedule periodic tasks
            self.scheduler.every(
                "refresh_groups",
                300,  # Every 5 minutes
                self._refresh_groups,
            )
            self.scheduler.every(
                "check_health",
                60,  # Every minute
                self._check_health,
            )

            # Initial group cache refresh
            await self._refresh_groups()

            logger.info("[%s] runtime started (authenticated=%s)", self.account_id, bool(me))
            return bool(me)
        except Exception as e:
            logger.exception("[%s] failed to start runtime: %s", self.account_id, e)
            self._status = "error"
            self.health_monitor.set_session_status(False)
            return False

    async def stop(self) -> None:
        """Stop all subsystems and disconnect the client."""
        self._running = False
        self.scheduler.stop()
        self.broadcast_queue.stop()
        self.auto_reply.stop()
        await self.client.disconnect()
        logger.info("[%s] runtime stopped", self.account_id)

    def is_running(self) -> bool:
        return self._running

    # ── Periodic Tasks ────────────────────────────────────────────

    async def _refresh_groups(self) -> None:
        try:
            await self.group_cache.refresh(self.client)
            await self.event_bus.emit(GroupCacheUpdatedEvent(
                group_count=self.group_cache.count(),
            ))
        except Exception:
            logger.exception("[%s] group refresh failed", self.account_id)

    async def _check_health(self) -> None:
        try:
            me = await self.client.get_me()
            self.health_monitor.set_session_status(bool(me))
        except Exception:
            self.health_monitor.set_session_status(False)

    async def _on_broadcast_completed(self, event: BroadcastCompletedEvent) -> None:
        if event.status == "sent":
            self._today_sent += 1
            self.health_monitor.record_success()
        elif event.status == "failed":
            self.health_monitor.record_failure(event.error_message or "Unknown error")

    async def _on_rate_limit_hit(self, event: RateLimitHitEvent) -> None:
        await self.auto_recovery.attempt_recovery("rate_limited")

    # ── Account Info ──────────────────────────────────────────────

    def get_account(self) -> Account:
        from datetime import datetime, timezone
        return Account(
            id=self.account_id,
            phone=self.phone,
            name=self._name,
            status=self._status,
            today_sent=self._today_sent,
            group_count=self.group_cache.count(),
            last_activity=datetime.fromtimestamp(self.health_monitor._state.last_activity, tz=timezone.utc).isoformat() if self.health_monitor._state.last_activity else None,
            auto_reply_enabled=self.auto_reply.is_enabled(),
            created_at="",  # TODO: persist creation time
            updated_at="",
        )

    def get_health(self) -> AccountHealthItem:
        return self.health_monitor.get_health_item(self.phone, self._name)

    # ── Broadcast Operations ──────────────────────────────────────

    async def create_broadcast(self, input_data: CreateBroadcastInput) -> Broadcast:
        from datetime import datetime, timezone
        import uuid
        broadcast = Broadcast(
            id=str(uuid.uuid4()),
            account_id=self.account_id,
            message=input_data.message,
            recipients=input_data.recipients,
            scheduled_at=input_data.scheduled_at,
            recurring_interval_minutes=input_data.recurring_interval_minutes,
            delivery_mode=input_data.delivery_mode,
            reply_to_message_id=input_data.reply_to_message_id,
            inline_buttons=input_data.inline_buttons,
            created_at=datetime.now(timezone.utc).isoformat(),
        )

        self._broadcast_store.append(broadcast)
        if len(self._broadcast_store) > self._max_broadcasts:
            self._broadcast_store = self._broadcast_store[-self._max_broadcasts:]

        if broadcast.scheduled_at:
            # Schedule for later
            pass  # TODO: implement scheduled delivery
        else:
            await self.broadcast_queue.enqueue(broadcast)

        return broadcast

    def get_broadcasts(self, limit: int = 50) -> list[Broadcast]:
        return list(self._broadcast_store)[-limit:]

    # ── Auto Reply Operations ─────────────────────────────────────

    def set_auto_reply_rules(self, rules: list[AutoReplyRule]) -> None:
        self.auto_reply.set_rules(rules)

    def set_auto_reply_enabled(self, enabled: bool) -> None:
        self._auto_reply_enabled = enabled
        self.auto_reply.set_enabled(enabled)

    # ── Reply Macro Operations ────────────────────────────────────

    def set_reply_macros(self, macros: list[ReplyMacro]) -> None:
        self.reply_macro.set_macros(macros)
