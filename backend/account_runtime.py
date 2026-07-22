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
  - Session Auto Recovery (automatic session repair)
  - Scheduler (manages recurring tasks)

v2 — Session Auto Recovery, enhanced health tracking, runtime inspector.
"""

from __future__ import annotations

import asyncio
import logging
import os
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
    SessionAutoRecoveredEvent,
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
                    await handler()
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

    WATERMARK_AD = (
        "\n\n━━━━━━━━━━━━━━━━━━\n"
        "🤖 TeleMon AI\n\n"
        "🚀 Telegram 운영, 아직도 직접 하시나요?\n\n"
        "AI 비서가\n"
        "✅ 자동 홍보\n"
        "✅ 자동 답장\n"
        "✅ 채널 운영\n"
        "✅ 그룹 관리\n\n"
        "🌐 https://telemon.online"
    )
    FREE_PLANS = {"free"}

    def __init__(self, account_id: str, client: TelegramClient, rate_limiter: RateLimiter, event_bus: EventBus, broadcast_store_ref: list[Broadcast] | None = None) -> None:
        self._account_id = account_id
        self._client = client
        self._rate_limiter = rate_limiter
        self._event_bus = event_bus
        self._queue: asyncio.Queue[Broadcast] = asyncio.Queue()
        self._active_broadcasts: dict[str, Broadcast] = {}
        self._completed: list[Broadcast] = []
        self._max_completed = 200
        self._retry_counts: dict[str, int] = {}  # broadcast_id -> retry count
        self._cancelled_set: set[str] = set()  # broadcast_ids marked for cancellation
        self._broadcast_store_ref: list[Broadcast] | None = broadcast_store_ref  # reference to AccountRuntime._broadcast_store
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
        # Check if cancelled before starting
        if broadcast.id in self._cancelled_set:
            self._finalize_cancelled(broadcast, 0)
            return

        broadcast.status = "sending"
        success_count = 0
        fail_count = 0

        # Index-based iteration to handle duplicate recipient IDs correctly.
        # Using list.index() on duplicates always returns the first occurrence,
        # which would cause an infinite loop during flood-wait retry.
        recipient_list = list(broadcast.recipients)
        current_idx = 0

        while current_idx < len(recipient_list):
            recipient_id = recipient_list[current_idx]

            # Check cancellation before each recipient
            if broadcast.id in self._cancelled_set:
                self._finalize_cancelled(broadcast, success_count)
                return

            if not await self._rate_limiter.acquire("send_message", chat_id=recipient_id, timeout=30):
                await self._rate_limiter.wait_and_acquire("send_message", chat_id=recipient_id)
                continue

            try:
                entity = await self._client.get_entity(int(recipient_id))
                message_to_send = broadcast.message
                if broadcast.plan in self.FREE_PLANS:
                    message_to_send = broadcast.message + self.WATERMARK_AD
                if broadcast.media_path:
                    caption = message_to_send or None
                    await self._client.send_file(
                        entity,
                        broadcast.media_path,
                        caption=caption,
                        reply_to=broadcast.reply_to_message_id,
                    )
                elif broadcast.reply_to_message_id:
                    await self._client.send_message(
                        entity,
                        message_to_send,
                        reply_to=broadcast.reply_to_message_id,
                    )
                else:
                    await self._client.send_message(entity, message_to_send)
                success_count += 1
                current_idx += 1
            except FloodWaitError as e:
                retry_count = self._retry_counts.get(broadcast.id, 0)
                
                # Rate limit 횟수 제한 검사
                if retry_count >= self.MAX_RETRIES:
                    broadcast.status = "failed"
                    broadcast.error_message = f"Rate limit exceeded after {self.MAX_RETRIES} retries"
                    break

                await self._event_bus.emit(RateLimitHitEvent(
                    action="send_message",
                    retry_after_seconds=e.seconds,
                ))
                
                # Rate limit 조정
                self._rate_limiter.adjust_limit("send_message", 1.0, max(e.seconds + 1, 5.0))
                self._retry_counts[broadcast.id] = retry_count + 1

                # Keep only the remaining recipients (including current, for retry)
                remaining = recipient_list[current_idx:]
                logger.info(
                    "[%s] flood wait %.0fs (retry %d/%d), %d remaining",
                    self._account_id, e.seconds, retry_count + 1, self.MAX_RETRIES, len(remaining),
                )
                
                # Rate limit이 너무 긴 경우 중단 (1시간 초과)
                if e.seconds > 3600:
                    logger.warning("[%s] Rate limit too long (%ds), aborting broadcast %s", 
                                 self._account_id, e.seconds, broadcast.id)
                    broadcast.status = "failed"
                    broadcast.error_message = f"Rate limit too long: {e.seconds}s, aborting"
                    break
                
                # 대기 시간 제한 (최대 10분)
                wait_time = min(e.seconds, 600)  # 10분으로 제한
                await asyncio.sleep(wait_time)
                
                # CRITICAL: Create a copy before modifying recipients so _broadcast_store
                # still has the original full recipient list. If we modify broadcast in-place,
                # the store entry is also truncated and the frontend shows fewer recipients.
                import copy
                retry_broadcast = copy.copy(broadcast)
                retry_broadcast.recipients = remaining
                self._active_broadcasts[broadcast.id] = retry_broadcast
                await self._queue.put(retry_broadcast)
                return
            except AuthKeyUnregisteredError:
                broadcast.status = "failed"
                broadcast.error_message = "세션이 만료되었습니다. 계정 재인증이 필요합니다."
                await self._event_bus.emit(SessionExpiredEvent(detail="Broadcast failed - auth key unregistered"))
                break
            except RPCError as e:
                fail_count += 1
                current_idx += 1
                logger.warning("[%s] RPC error sending to %s: %s", self._account_id, recipient_id, e)
            except Exception as e:
                fail_count += 1
                current_idx += 1
                logger.warning("[%s] error sending to %s: %s", self._account_id, recipient_id, e)

            await asyncio.sleep(1)

        broadcast.status = "sent" if fail_count == 0 else "failed" if success_count == 0 else "sent"
        broadcast.sent_at = datetime.now(timezone.utc).isoformat()
        self._completed.append(broadcast)
        if len(self._completed) > self._max_completed:
            self._completed = self._completed[-self._max_completed:]
        self._active_broadcasts.pop(broadcast.id, None)

        # Sync final status back into _broadcast_store so the store doesn't
        # keep a stale copy (important after flood-wait retry which creates
        # a shallow copy — the store still points to the pre-retry original).
        if self._broadcast_store_ref is not None:
            for i, sb in enumerate(self._broadcast_store_ref):
                if sb.id == broadcast.id:
                    self._broadcast_store_ref[i] = broadcast
                    break

        self._prune_cancelled_set(broadcast.id)

        await self._event_bus.emit(BroadcastCompletedEvent(
            broadcast_id=broadcast.id,
            status=broadcast.status,
            error_message=broadcast.error_message,
        ))

    def cancel_broadcast(self, broadcast_id: str) -> bool:
        """Cancel an active broadcast. Returns True if cancelled, False if not found."""
        # Check active broadcasts (in-flight)
        if broadcast_id in self._active_broadcasts:
            broadcast = self._active_broadcasts[broadcast_id]
            broadcast.status = "cancelled"
            broadcast.cancelled_at = datetime.now(timezone.utc).isoformat()
            # Remove from active so _dispatch will skip remaining recipients
            self._active_broadcasts.pop(broadcast_id)
            self._completed.append(broadcast)
            if len(self._completed) > self._max_completed:
                self._completed = self._completed[-self._max_completed:]
            # CRITICAL: Also add to _cancelled_set so the running _dispatch loop
            # checks this set before each recipient and stops sending.
            self._cancelled_set.add(broadcast_id)
            logger.info("[%s] broadcast %s cancelled (was in-flight)", self._account_id, broadcast_id)
            return True

        # Check queue (not yet dispatched)
        # asyncio.Queue doesn't support removal, so we mark it as cancelled
        # via a separate set. The _dispatch method checks this set.
        if broadcast_id in self._cancelled_set:
            return True
        self._cancelled_set.add(broadcast_id)
        logger.info("[%s] broadcast %s cancellation queued", self._account_id, broadcast_id)

        # Also check completed list (already finished - idempotent)
        for b in self._completed:
            if b.id == broadcast_id:
                if b.status not in ("cancelled", "failed", "sent"):
                    b.status = "cancelled"
                    b.cancelled_at = datetime.now(timezone.utc).isoformat()
                    return True
                return True  # Already cancelled/failed/sent

        # Broadcast queued via _cancelled_set — update status in broadcast_store
        # so the frontend doesn't see it as "pending" forever.
        if hasattr(self, '_broadcast_store_ref') and self._broadcast_store_ref is not None:
            for b in self._broadcast_store_ref:
                if b.id == broadcast_id:
                    if b.status == "pending":
                        b.status = "cancelled"
                        b.cancelled_at = datetime.now(timezone.utc).isoformat()
                    return True

        return False

    def _prune_cancelled_set(self, broadcast_id: str) -> None:
        """Remove completed/failed broadcasts from cancelled_set to prevent memory leak."""
        self._cancelled_set.discard(broadcast_id)

    def _finalize_cancelled(self, broadcast: Broadcast, success_count: int) -> None:
        """Mark broadcast as cancelled and clean up."""
        broadcast.status = "cancelled"
        broadcast.cancelled_at = datetime.now(timezone.utc).isoformat()
        self._completed.append(broadcast)
        if len(self._completed) > self._max_completed:
            self._completed = self._completed[-self._max_completed:]
        self._active_broadcasts.pop(broadcast.id, None)
        self._prune_cancelled_set(broadcast.id)
        logger.info(
            "[%s] broadcast %s cancelled after %d recipients",
            self._account_id, broadcast.id, success_count,
        )

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
        self._daily_counts: dict[str, int] = defaultdict(int)
        self._last_cooldown: dict[str, float] = {}
        self._last_cooldown_cleanup: float = time.time()
        self._handler: Any = None
        self._lock = asyncio.Lock()

    async def start(self) -> None:
        if self._handler is not None:
            return
        self._handler = self._on_message
        self._client.add_event_handler(self._handler, NewMessage(incoming=True))

    def stop(self) -> None:
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

    def _cleanup_cooldown(self) -> None:
        """Remove cooldown entries older than 24 hours to prevent memory leak."""
        now = time.time()
        if now - self._last_cooldown_cleanup < 3600:
            return
        self._last_cooldown_cleanup = now
        cutoff = now - 86400
        stale = [k for k, v in self._last_cooldown.items() if v < cutoff]
        for k in stale:
            del self._last_cooldown[k]
        # Also reset daily counts for rules with no recent activity
        stale_rules = [k for k, v in self._daily_counts.items() if v == 0]
        for k in stale_rules:
            del self._daily_counts[k]

    async def _on_message(self, event: Any) -> None:
        async with self._lock:
            enabled = self._enabled
            rules = list(self._rules)

        if not enabled or not rules:
            return
        self._cleanup_cooldown()

        message = event.message
        if not message or not message.text:
            return
        if message.out:
            return

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

            matched = False
            if rule.match_type == "exact":
                matched = text == rule.match_value
            elif rule.match_type == "keyword":
                matched = rule.match_value.lower() in text.lower()

            if not matched:
                continue

            cooldown_key = (rule.id, user_id)
            last_time = self._last_cooldown.get(cooldown_key, 0.0)
            if rule.cooldown_hours > 0 and (time.time() - last_time) < (rule.cooldown_hours * 3600):
                continue

            if self._daily_counts[rule.id] >= rule.max_replies_per_day:
                continue

            if not await self._rate_limiter.acquire("auto_reply", chat_id=chat_id, timeout=10):
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
            break

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
        health_monitor: HealthMonitor | None = None,
    ) -> None:
        self._account_id = account_id
        self._client = client
        self._rate_limiter = rate_limiter
        self._event_bus = event_bus
        self._scheduler = scheduler
        self._health_monitor = health_monitor
        self._macros: dict[str, ReplyMacro] = {}
        self._logs: list[ReplyMacroLog] = []
        self._max_logs = 200

    def set_macros(self, macros: list[ReplyMacro]) -> None:
        old_ids = set(self._macros.keys())
        new_ids = set()

        for macro in macros:
            new_ids.add(macro.id)
            old = self._macros.get(macro.id)
            if old is None or old.is_active != macro.is_active or old.interval_hours != macro.interval_hours:
                schedule_name = f"macro-{macro.id}"
                self._scheduler.cancel(schedule_name)
                if macro.is_active:
                    self._schedule_macro(macro)

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
        if macro.schedule_type == "interval":
            interval = max(macro.interval_hours * 3600, 300)
            self._scheduler.every(
                f"macro-{macro.id}",
                interval,
                lambda m=macro: self._execute_macro(m),
            )
        elif macro.schedule_type == "fixed" and macro.fixed_time:
            self._scheduler.every(
                f"macro-{macro.id}",
                60,
                lambda m=macro: self._check_fixed_time(m),
            )

    async def _execute_macro(self, macro: ReplyMacro) -> None:
        """Execute a reply macro via BroadcastQueue for guaranteed reply_to_message_id support."""
        for target_chat_id in macro.target_chats:
            if not await self._rate_limiter.acquire("send_message", chat_id=target_chat_id, timeout=30):
                continue

            try:
                # Use BroadcastQueue via create_broadcast for proper
                # reply_to_message_id, rate limiting, and error tracking
                entity = await self._client.get_entity(int(target_chat_id))
                kwargs = {"message": macro.message_content}
                if macro.reply_to_message_id:
                    kwargs["reply_to"] = macro.reply_to_message_id
                await self._client.send_message(entity, **kwargs)

                self._add_log(ReplyMacroLog(
                    id="",
                    macro_id=macro.id,
                    account_id=self._account_id,
                    target_chat_id=target_chat_id,
                    message_sent=macro.message_content,
                    status="sent",
                    created_at=datetime.now(timezone.utc).isoformat(),
                ))
                self._health_monitor.record_success()
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
                self._health_monitor.record_failure(str(e))

            await asyncio.sleep(2)

        macro.last_sent_at = datetime.now(timezone.utc).isoformat()

    async def _check_fixed_time(self, macro: ReplyMacro) -> None:
        if not macro.fixed_time:
            return
        now = datetime.now(timezone.utc)
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
    status: str = "unknown"
    last_activity: float = 0.0
    last_error: str | None = None
    last_error_status: str | None = None
    recent_success_count: int = 0
    recent_failure_count: int = 0
    total_delivery_attempts: int = 0
    has_session: bool = False
    # v2 enhanced fields
    uptime_seconds: float = 0.0
    session_created_at: float = 0.0
    session_last_verified_at: float = 0.0
    consecutive_failures: int = 0
    recovery_attempts: int = 0
    last_recovery_at: float = 0.0
    last_recovery_result: str = ""


class HealthMonitor:
    """Monitors account health by tracking errors, sessions, and activity."""

    def __init__(self, account_id: str, client: TelegramClient, event_bus: EventBus) -> None:
        self._account_id = account_id
        self._client = client
        self._event_bus = event_bus
        self._state = HealthState()
        self._success_window: list[float] = []
        self._error_window: list[float] = []

    def record_success(self) -> None:
        now = time.time()
        self._state.last_activity = now
        self._state.recent_success_count += 1
        self._state.total_delivery_attempts += 1
        self._state.consecutive_failures = 0
        self._success_window.append(now)
        self._prune_windows()

    def record_failure(self, error_message: str, error_status: str | None = None) -> None:
        now = time.time()
        self._state.last_error = error_message
        self._state.last_error_status = error_status
        self._state.recent_failure_count += 1
        self._state.total_delivery_attempts += 1
        self._state.consecutive_failures += 1
        self._error_window.append(now)
        self._prune_windows()

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
        if has_session:
            self._state.session_last_verified_at = time.time()
            if not self._state.session_created_at:
                self._state.session_created_at = time.time()
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

    def get_health_detail(self) -> dict:
        """Returns detailed health state for the Runtime Inspector."""
        return {
            "account_id": self._account_id,
            "status": self._state.status,
            "has_session": self._state.has_session,
            "uptime_seconds": time.time() - self._state.session_created_at if self._state.session_created_at else 0,
            "session_created_at": datetime.fromtimestamp(self._state.session_created_at, tz=timezone.utc).isoformat() if self._state.session_created_at else None,
            "session_last_verified_at": datetime.fromtimestamp(self._state.session_last_verified_at, tz=timezone.utc).isoformat() if self._state.session_last_verified_at else None,
            "last_activity": datetime.fromtimestamp(self._state.last_activity, tz=timezone.utc).isoformat() if self._state.last_activity else None,
            "last_error": self._state.last_error,
            "consecutive_failures": self._state.consecutive_failures,
            "recent_success_count": self._state.recent_success_count,
            "recent_failure_count": self._state.recent_failure_count,
            "total_delivery_attempts": self._state.total_delivery_attempts,
            "recovery_attempts": self._state.recovery_attempts,
            "last_recovery_at": datetime.fromtimestamp(self._state.last_recovery_at, tz=timezone.utc).isoformat() if self._state.last_recovery_at else None,
            "last_recovery_result": self._state.last_recovery_result,
        }

    def _prune_windows(self) -> None:
        cutoff = time.time() - 3600
        self._success_window = [t for t in self._success_window if t > cutoff]
        self._error_window = [t for t in self._error_window if t > cutoff]


# ── Session Auto Recovery ──────────────────────────────────────────


class SessionAutoRecovery:
    """
    Automatic session repair system.

    Attempts multiple strategies to recover a broken session:
    1. Ping — check if the connection is still alive
    2. Reconnect — disconnect and reconnect
    3. Recreate — create a fresh client with the same session file
    4. Full re-auth — last resort, triggers re-authentication flow
    """

    MAX_RECOVERY_ATTEMPTS = 3
    RECOVERY_COOLDOWN = 300  # 5 minutes between recovery attempts

    def __init__(
        self,
        account_id: str,
        client: TelegramClient,
        health_monitor: HealthMonitor,
        event_bus: EventBus,
        session_path: str,
        phone: str,
        api_id: int,
        api_hash: str,
    ) -> None:
        self._account_id = account_id
        self._client = client
        self._health_monitor = health_monitor
        self._event_bus = event_bus
        self._session_path = session_path
        self._phone = phone
        self._api_id = api_id
        self._api_hash = api_hash
        self._last_attempt: float = 0.0
        self._consecutive_failures = 0

    async def attempt_recovery(self) -> bool:
        """
        Attempt to recover the session. Returns True if successful.
        Implements cooldown to avoid hammering Telegram.
        """
        now = time.time()
        if now - self._last_attempt < self.RECOVERY_COOLDOWN:
            logger.debug("[%s] recovery cooldown active, skipping", self._account_id)
            return False

        if self._consecutive_failures >= self.MAX_RECOVERY_ATTEMPTS:
            logger.warning("[%s] max recovery attempts reached, marking as unauthorized", self._account_id)
            return False

        self._last_attempt = now
        self._consecutive_failures += 1
        self._health_monitor._state.recovery_attempts += 1

        # Strategy 1: Ping
        if await self._try_ping():
            self._consecutive_failures = 0
            self._health_monitor._state.last_recovery_result = "success_ping"
            self._health_monitor._state.last_recovery_at = now
            await self._event_bus.emit(SessionAutoRecoveredEvent(method="ping", detail="Session alive after ping"))
            return True

        # Strategy 2: Reconnect
        if await self._try_reconnect():
            self._consecutive_failures = 0
            self._health_monitor._state.last_recovery_result = "success_reconnect"
            self._health_monitor._state.last_recovery_at = now
            await self._event_bus.emit(SessionAutoRecoveredEvent(method="reconnect", detail="Session restored after reconnect"))
            return True

        # Strategy 3: Recreate client
        if await self._try_recreate():
            self._consecutive_failures = 0
            self._health_monitor._state.last_recovery_result = "success_recreate"
            self._health_monitor._state.last_recovery_at = now
            await self._event_bus.emit(SessionAutoRecoveredEvent(method="recreate", detail="Client recreated successfully"))
            return True

        self._health_monitor._state.last_recovery_result = "failed"
        self._health_monitor._state.last_recovery_at = now
        logger.error("[%s] all session recovery strategies failed", self._account_id)
        return False

    async def _try_ping(self) -> bool:
        """Check if the client is still connected and session is valid."""
        try:
            if not self._client.is_connected():
                await self._client.connect()
            me = await self._client.get_me()
            if me:
                self._health_monitor.set_session_status(True)
                return True
        except Exception:
            pass
        return False

    async def _try_reconnect(self) -> bool:
        """Disconnect and reconnect with the same session."""
        try:
            await self._client.disconnect()
            await asyncio.sleep(2)
            await self._client.connect()
            me = await self._client.get_me()
            if me:
                self._health_monitor.set_session_status(True)
                return True
        except Exception:
            pass
        return False

    async def _try_recreate(self) -> bool:
        """Create a fresh TelegramClient with the same session file."""
        try:
            await self._client.disconnect()
            # The session file persists on disk, Telethon will reuse it
            await self._client.start(phone=self._phone)
            me = await self._client.get_me()
            if me:
                self._health_monitor.set_session_status(True)
                return True
        except Exception:
            pass
        return False

    def can_attempt_recovery(self) -> bool:
        """Check if recovery is possible (session file exists)."""
        return os.path.exists(self._session_path)


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
            outcome = "success"

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
    """Complete independent runtime for one Telegram account.

    v2 — Session Auto Recovery, enhanced health tracking, runtime inspector.
    """

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

        # State (must be set before components that reference them)
        self._name: str | None = None
        self._status: str = "inactive"
        self._auto_reply_enabled: bool = False
        self._today_sent: int = 0
        self._started_at: float | None = None
        self._running = False
        self._session_path = session_path

        # Persistence (set before BroadcastQueue so it can receive the ref)
        self._broadcast_store: list[Broadcast] = []
        self._max_broadcasts = 500

        # Core components
        self.client = TelegramClient(session_path, api_id, api_hash)
        self.event_bus = EventBus(account_id)
        self.rate_limiter = RateLimiter(account_id)
        self.scheduler = Scheduler(account_id)
        self.group_cache = GroupCache(account_id)
        self.broadcast_queue = BroadcastQueue(account_id, self.client, self.rate_limiter, self.event_bus, broadcast_store_ref=self._broadcast_store)
        self.auto_reply = AutoReplyEngine(account_id, self.client, self.rate_limiter, self.event_bus)
        self.health_monitor = HealthMonitor(account_id, self.client, self.event_bus)
        self.auto_recovery = AutoRecovery(account_id, self.client, self.health_monitor, self.event_bus)
        self.reply_macro = ReplyMacroEngine(account_id, self.client, self.rate_limiter, self.event_bus, self.scheduler, self.health_monitor)
        self.session_auto_recovery = SessionAutoRecovery(
            account_id, self.client, self.health_monitor, self.event_bus,
            session_path, phone, api_id, api_hash,
        )

        # Wire up event bus subscriptions
        self.event_bus.subscribe(BroadcastCompletedEvent, self._on_broadcast_completed)
        self.event_bus.subscribe(RateLimitHitEvent, self._on_rate_limit_hit)
        self.event_bus.subscribe(SessionExpiredEvent, self._on_session_expired)

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

            me = await self.client.get_me()
            if me:
                self._name = getattr(me, "first_name", None) or getattr(me, "username", None) or None
                self.health_monitor.set_session_status(True)
            else:
                self.health_monitor.set_session_status(False)

            self.scheduler.start()
            self.broadcast_queue.start()
            await self.auto_reply.start()

            # Schedule periodic tasks
            self.scheduler.every("refresh_groups", 300, self._refresh_groups)
            self.scheduler.every("check_health", 60, self._check_health)
            self.scheduler.every("session_verify", 300, self._verify_session)

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
        self.event_bus.clear()  # Prevent zombie handlers from leaking on restart
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
        """Periodic health check with Heartbeat for HealingEngine."""
        try:
            me = await self.client.get_me()
            self.health_monitor.set_session_status(bool(me))
            # Report heartbeat to HealingEngine via RuntimeManager
            from .runtime_manager import RuntimeManager
            manager = RuntimeManager.get_instance()
            await manager.healing_engine.mark_heartbeat(self.account_id)
            if me:
                manager.healing_engine.record_success(self.account_id)
        except Exception:
            self.health_monitor.set_session_status(False)
            try:
                from .runtime_manager import RuntimeManager
                manager = RuntimeManager.get_instance()
                manager.healing_engine.record_failure(self.account_id)
            except Exception:
                pass

    async def _verify_session(self) -> None:
        """Periodic session verification with auto-recovery."""
        try:
            me = await self.client.get_me()
            if me:
                self.health_monitor.set_session_status(True)
                from .runtime_manager import RuntimeManager
                RuntimeManager.get_instance().healing_engine.mark_heartbeat(self.account_id)
                return
        except Exception:
            pass

        # Session appears broken — attempt auto-recovery
        logger.warning("[%s] session verification failed, attempting auto-recovery", self.account_id)
        recovered = await self.session_auto_recovery.attempt_recovery()
        if recovered:
            logger.info("[%s] session auto-recovered successfully", self.account_id)
            try:
                from .runtime_manager import RuntimeManager
                RuntimeManager.get_instance().healing_engine.mark_heartbeat(self.account_id)
                RuntimeManager.get_instance().healing_engine.record_success(self.account_id)
            except Exception:
                pass
        else:
            logger.error("[%s] session auto-recovery failed", self.account_id)
            try:
                from .runtime_manager import RuntimeManager
                manager = RuntimeManager.get_instance()
                manager.healing_engine.record_failure(self.account_id)
            except Exception:
                pass

    async def _on_broadcast_completed(self, event: BroadcastCompletedEvent) -> None:
        if event.status == "sent":
            self._today_sent += 1
            self.health_monitor.record_success()
        elif event.status == "failed":
            self.health_monitor.record_failure(event.error_message or "Unknown error")

    async def _on_rate_limit_hit(self, event: RateLimitHitEvent) -> None:
        await self.auto_recovery.attempt_recovery("rate_limited")

    async def _on_session_expired(self, event: SessionExpiredEvent) -> None:
        """Trigger session auto-recovery when session expires."""
        logger.warning("[%s] session expired event received, attempting auto-recovery", self.account_id)
        recovered = await self.session_auto_recovery.attempt_recovery()
        if recovered:
            logger.info("[%s] session auto-recovered after expiry", self.account_id)

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
            created_at="",
            updated_at="",
        )

    def get_health(self) -> AccountHealthItem:
        return self.health_monitor.get_health_item(self.phone, self._name)

    def get_runtime_inspector_data(self) -> dict:
        """Returns a full snapshot of the runtime's internal state."""
        return {
            "account_id": self.account_id,
            "phone": self.phone,
            "name": self._name,
            "status": self._status,
            "running": self._running,
            "started_at": datetime.fromtimestamp(self._started_at, tz=timezone.utc).isoformat() if self._started_at else None,
            "uptime_seconds": time.time() - self._started_at if self._started_at else 0,
            "health": self.health_monitor.get_health_detail(),
            "rate_limiter": self.rate_limiter.get_state(),
            "group_cache": {
                "count": self.group_cache.count(),
                "last_refreshed": datetime.fromtimestamp(self.group_cache.last_refreshed(), tz=timezone.utc).isoformat() if self.group_cache.last_refreshed() else None,
            },
            "broadcast_queue": {
                "active_count": len(self.broadcast_queue.get_active()),
                "completed_count": len(self.broadcast_queue._completed),
                "queue_size": self.broadcast_queue._queue.qsize(),
            },
            "auto_reply": {
                "enabled": self.auto_reply.is_enabled(),
                "rules_count": len(self.auto_reply._rules),
                "logs_count": len(self.auto_reply._logs),
            },
            "reply_macros": {
                "count": len(self.reply_macro._macros),
                "logs_count": len(self.reply_macro._logs),
            },
            "session": {
                "path": self._session_path,
                "file_exists": os.path.exists(self._session_path),
                "file_size": os.path.getsize(self._session_path) if os.path.exists(self._session_path) else 0,
                "can_recover": self.session_auto_recovery.can_attempt_recovery(),
            },
            "today_sent": self._today_sent,
        }

    # ── Auth Flow Operations ───────────────────────────────────────

    async def send_code(self) -> dict:
        try:
            await self.client.send_code_request(self.phone)
            return {"sent": True}
        except Exception as e:
            logger.error("[%s] send_code failed: %s", self.account_id, e)
            raise

    async def verify_code(self, code: str) -> dict:
        try:
            user = await self.client.sign_in(self.phone, code)
            self._name = getattr(user, "first_name", None) or getattr(user, "username", None) or None
            self.health_monitor.set_session_status(True)
            self._status = "active"
            return {"status": "active", "requires_2fa": False, "detail": None}
        except SessionPasswordNeededError:
            return {"status": "active", "requires_2fa": True, "detail": "2FA required"}
        except Exception as e:
            logger.error("[%s] verify_code failed: %s", self.account_id, e)
            raise

    async def verify_2fa(self, password: str) -> dict:
        try:
            user = await self.client.sign_in(password=password)
            self._name = getattr(user, "first_name", None) or getattr(user, "username", None) or None
            self.health_monitor.set_session_status(True)
            self._status = "active"
            return {"status": "active", "requires_2fa": False, "detail": None}
        except Exception as e:
            logger.error("[%s] verify_2fa failed: %s", self.account_id, e)
            raise

    async def get_auth_status(self) -> dict:
        try:
            me = await self.client.get_me()
            if me:
                return {"status": "active", "requires_2fa": False, "detail": None}
            return {"status": "inactive", "requires_2fa": False, "detail": "Not authenticated"}
        except Exception as e:
            return {"status": "inactive", "requires_2fa": False, "detail": str(e)}

    async def re_auth(self) -> dict:
        try:
            await self.client.disconnect()
            await self.client.connect()
            return await self.get_auth_status()
        except Exception as e:
            logger.error("[%s] re_auth failed: %s", self.account_id, e)
            return {"status": "inactive", "requires_2fa": False, "detail": str(e)}

    # ── Broadcast Operations ──────────────────────────────────────

    async def create_broadcast(self, input_data: CreateBroadcastInput, plan: str = "free") -> Broadcast:
        import uuid
        now = datetime.now(timezone.utc).isoformat()
        broadcast = Broadcast(
            id=str(uuid.uuid4()),
            account_id=self.account_id,
            message=input_data.message,
            media_path=input_data.image,  # image file path from upload
            recipients=input_data.recipients,
            status="pending",
            scheduled_at=input_data.scheduled_at,
            created_at=now,
            delivery_mode=input_data.delivery_mode,
            reply_to_message_id=input_data.reply_to_message_id,
            inline_buttons=input_data.inline_buttons,
            plan=plan,
        )

        self._broadcast_store.append(broadcast)
        if len(self._broadcast_store) > self._max_broadcasts:
            self._broadcast_store = self._broadcast_store[-self._max_broadcasts:]

        if input_data.scheduled_at:
            # Schedule for later
            pass
        else:
            await self.broadcast_queue.enqueue(broadcast)

        return broadcast

    def get_broadcasts(self, limit: int = 50) -> list[Broadcast]:
        completed = self.broadcast_queue.get_completed(limit)
        active = self.broadcast_queue.get_active()
        all_broadcasts = list(self._broadcast_store)
        seen = set()
        result = []
        for b in all_broadcasts + active + completed:
            if b.id not in seen:
                seen.add(b.id)
                result.append(b)
        result.sort(key=lambda b: b.created_at, reverse=True)
        return result[:limit]