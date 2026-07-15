"""
RateLimiter — per-account, per-action token-bucket rate limiter.

Telegram enforces several implicit rate limits:
  - 1 message per second per chat (broadcast → 1 recipient per second)
  - ~30 messages per second per account overall
  - ~20 group joins per day for new accounts

This limiter uses a simple token-bucket per action type so the runtime
can self-throttle instead of hitting Telegram's 420 FLOOD_WAIT.
"""

from __future__ import annotations

import asyncio
import logging
import time
from collections import defaultdict

logger = logging.getLogger(__name__)


class RateLimitBucket:
    """Token bucket for a single action type."""

    __slots__ = ("max_rate", "_period_seconds", "_tokens", "_last_refill", "_lock")

    def __init__(self, max_rate: float, period_seconds: float = 1.0) -> None:
        self.max_rate = max_rate
        self._period_seconds = period_seconds
        self._tokens = float(max_rate)
        self._last_refill = time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self, tokens: float = 1.0, timeout: float | None = None) -> bool:
        """Acquire *tokens* from the bucket. Blocks until available.

        Returns True when acquired. Returns False if *timeout* elapsed.
        """
        deadline = None if timeout is None else time.monotonic() + timeout
        while True:
            async with self._lock:
                self._refill()
                if self._tokens >= tokens:
                    self._tokens -= tokens
                    return True
                wait = (tokens - self._tokens) * (self._period_seconds / self.max_rate) if self.max_rate > 0 else 0.5
            # Wait outside the lock so other acquire() calls can proceed.
            actual_wait = min(wait, 0.1)
            if deadline is not None and time.monotonic() + actual_wait > deadline:
                return False
            await asyncio.sleep(actual_wait)

    def _refill(self) -> None:
        now = time.monotonic()
        elapsed = now - self._last_refill
        self._tokens = min(self.max_rate, self._tokens + elapsed * (self.max_rate / max(self._period_seconds, 0.001)))
        self._last_refill = now


class RateLimiter:
    """Per-account rate limiter with multiple action buckets.

    Default limits (Telegram-friendly):
      - send_message:    1 per second per chat  (bucketed by chat)
      - overall_send:   30 per second            (global bucket)
      - join_group:      1 per 3 seconds
      - fetch_dialogs:   1 per 2 seconds
      - auto_reply:      1 per 1.5 seconds
    """

    BUCKET_DEFAULTS: dict[str, tuple[float, float]] = {
        "send_message": (1.0, 1.0),       # 1 msg/sec
        "overall_send": (30.0, 1.0),      # 30 msg/sec overall
        "join_group": (1.0, 3.0),         # 1 join / 3 sec
        "fetch_dialogs": (1.0, 2.0),      # 1 fetch / 2 sec
        "auto_reply": (1.0, 1.5),         # 1 reply / 1.5 sec
        "broadcast": (1.0, 1.0),          # 1 broadcast / sec
        "health_check": (5.0, 1.0),       # 5 checks / sec
    }

    def __init__(self, account_id: str) -> None:
        self._account_id = account_id
        # action -> bucket (global per action)
        self._buckets: dict[str, RateLimitBucket] = {}
        # (action, chat_id) -> bucket (per-chat)
        self._per_chat_buckets: dict[tuple[str, int | str], RateLimitBucket] = {}
        self._lock = asyncio.Lock()

        for action, (rate, period) in self.BUCKET_DEFAULTS.items():
            self._buckets[action] = RateLimitBucket(rate, period)

    async def acquire(self, action: str, chat_id: int | str | None = None, timeout: float | None = 30.0) -> bool:
        """Acquire a token for *action*, optionally scoped to *chat_id*.

        Returns True when the action is allowed. If *timeout* is reached,
        returns False (caller should handle the backoff).
        """
        bucket = self._buckets.get(action)
        if bucket is None:
            bucket = RateLimitBucket(1.0, 1.0)
            self._buckets[action] = bucket

        # Try the main bucket first.
        if not await bucket.acquire(1.0, timeout=1.0):
            logger.warning("[%s] rate limited on %s (global)", self._account_id, action)
            return False

        # Per-chat limiting for send actions.
        if chat_id is not None and action in ("send_message", "auto_reply", "broadcast"):
            key = (action, chat_id)
            async with self._lock:
                chat_bucket = self._per_chat_buckets.get(key)
                if chat_bucket is None:
                    chat_bucket = RateLimitBucket(1.0, 1.0)
                    self._per_chat_buckets[key] = chat_bucket
            if not await chat_bucket.acquire(1.0, timeout=1.0):
                logger.warning("[%s] rate limited on %s chat=%s", self._account_id, action, chat_id)
                return False

        # Overall send throttle (applies to all send actions).
        if action in ("send_message", "auto_reply", "broadcast", "join_group"):
            overall = self._buckets.get("overall_send")
            if overall and not await overall.acquire(1.0, timeout=0.5):
                logger.warning("[%s] overall send rate limited", self._account_id)
                return False

        return True

    async def wait_and_acquire(self, action: str, chat_id: int | str | None = None) -> None:
        """Block until a token is available (no timeout)."""
        while not await self.acquire(action, chat_id, timeout=5.0):
            await asyncio.sleep(0.5)

    def get_bucket(self, action: str) -> RateLimitBucket | None:
        return self._buckets.get(action)

    def adjust_limit(self, action: str, max_rate: float, period_seconds: float = 1.0) -> None:
        """Dynamically adjust rate limit (e.g., after a 420 FLOOD_WAIT)."""
        self._buckets[action] = RateLimitBucket(max_rate, period_seconds)
        logger.info("[%s] adjusted %s limit to %.1f/%.1fs", self._account_id, action, max_rate, period_seconds)
