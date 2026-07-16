from __future__ import annotations

import asyncio
import uuid

import pytest

import backend.account_runtime as ar
from backend.account_runtime import BroadcastQueue
from backend.event_bus import EventBus
from backend.models import Broadcast


class FakeClient:
    def __init__(self, failing_recipients: set[int] | None = None) -> None:
        self.failing_recipients = failing_recipients or set()
        self.sent: list[tuple[int, str, int | None]] = []

    async def get_entity(self, value):
        return value

    async def send_message(self, entity, message=None, reply_to=None):
        recipient = int(entity)
        if recipient in self.failing_recipients:
            raise RuntimeError(f"failed for {recipient}")
        self.sent.append((recipient, message, reply_to))


class FakeRateLimiter:
    def __init__(self, acquire_results: list[bool]) -> None:
        self.acquire_results = acquire_results
        self.acquire_calls: list[tuple[str, int | str | None, float | None]] = []
        self.wait_calls: list[tuple[str, int | str | None]] = []

    async def acquire(self, action: str, chat_id=None, timeout=None) -> bool:
        self.acquire_calls.append((action, chat_id, timeout))
        if self.acquire_results:
            return self.acquire_results.pop(0)
        return True

    async def wait_and_acquire(self, action: str, chat_id=None) -> None:
        self.wait_calls.append((action, chat_id))

    def adjust_limit(self, action: str, max_rate: float, period_seconds: float = 1.0) -> None:
        pass


@pytest.fixture(autouse=True)
def fast_sleep(monkeypatch):
    async def _noop_sleep(_seconds: float) -> None:
        return None

    monkeypatch.setattr(ar.asyncio, "sleep", _noop_sleep)


def make_broadcast(*, recipients: list[str], message: str = "hello") -> Broadcast:
    return Broadcast(
        id=str(uuid.uuid4()),
        account_id="acct-1",
        message=message,
        recipients=recipients,
        status="pending",
        created_at="2026-07-16T00:00:00Z",
    )


@pytest.mark.asyncio
async def test_rate_limiter_failure_waits_instead_of_skipping() -> None:
    broadcast = make_broadcast(recipients=["101"])
    client = FakeClient()
    limiter = FakeRateLimiter([False, True])
    queue = BroadcastQueue("acct-1", client, limiter, EventBus("acct-1"), broadcast_store_ref=[broadcast])

    await queue._dispatch(broadcast)

    assert limiter.acquire_calls == [
        ("send_message", "101", 30),
        ("send_message", "101", 30),
    ]
    assert limiter.wait_calls == [("send_message", "101")]
    assert client.sent == [(101, "hello", None)]
    assert broadcast.status == "sent"


@pytest.mark.asyncio
async def test_partial_success_is_not_marked_sent() -> None:
    broadcast = make_broadcast(recipients=["101", "102"])
    client = FakeClient(failing_recipients={102})
    limiter = FakeRateLimiter([True, True])
    queue = BroadcastQueue("acct-1", client, limiter, EventBus("acct-1"), broadcast_store_ref=[broadcast])

    await queue._dispatch(broadcast)

    assert client.sent == [(101, "hello", None)]
    assert broadcast.status == "failed"
    assert broadcast.error_message is not None
    assert "Partial delivery" in broadcast.error_message
    assert "1/2" in broadcast.error_message


@pytest.mark.asyncio
async def test_full_success_stays_sent() -> None:
    broadcast = make_broadcast(recipients=["101", "102"])
    client = FakeClient()
    limiter = FakeRateLimiter([True, True])
    queue = BroadcastQueue("acct-1", client, limiter, EventBus("acct-1"), broadcast_store_ref=[broadcast])

    await queue._dispatch(broadcast)

    assert client.sent == [(101, "hello", None), (102, "hello", None)]
    assert broadcast.status == "sent"
    assert broadcast.error_message is None
