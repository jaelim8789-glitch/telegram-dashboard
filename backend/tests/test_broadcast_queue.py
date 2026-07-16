from __future__ import annotations

import asyncio
import json
import sqlite3
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


# ── Broadcast Persistence Tests ────────────────────────────────────────


def test_persist_broadcast_inserts_and_loads(tmp_path):
    """Broadcast persisted via _persist_broadcast must be loadable via _load_broadcasts."""
    import os
    from backend.account_runtime import _persist_broadcast, _load_broadcasts, _BROADCAST_DB_PATH

    db_path = tmp_path / "test_broadcasts.db"
    monkeypatch = pytest.MonkeyPatch()
    monkeypatch.setattr("backend.account_runtime._BROADCAST_DB_PATH", str(db_path))
    monkeypatch.setattr("backend.account_runtime.os.makedirs", lambda p, exist_ok: None)

    conn = sqlite3.connect(str(db_path))
    conn.execute("""
        CREATE TABLE IF NOT EXISTS broadcasts (
            id TEXT PRIMARY KEY, account_id TEXT NOT NULL,
            message TEXT DEFAULT '', recipients TEXT DEFAULT '[]',
            status TEXT DEFAULT 'pending', scheduled_at TEXT,
            sent_at TEXT, created_at TEXT DEFAULT '',
            error_message TEXT, recurring_interval_minutes INTEGER,
            cancelled_at TEXT, next_scheduled_at TEXT,
            is_recurring_paused INTEGER DEFAULT 0,
            delivery_mode TEXT DEFAULT 'normal',
            reply_to_message_id INTEGER,
            failure_info TEXT, inline_buttons TEXT
        )
    """)
    conn.commit()
    conn.close()

    b = Broadcast(
        id="test-b-1",
        account_id="acct-1",
        message="hello world",
        recipients=["101", "102"],
        status="pending",
        created_at="2026-07-16T00:00:00Z",
    )
    _persist_broadcast(b)

    loaded = _load_broadcasts("acct-1")
    assert len(loaded) == 1
    assert loaded[0].id == "test-b-1"
    assert loaded[0].message == "hello world"
    assert loaded[0].recipients == ["101", "102"]


def test_load_broadcasts_returns_empty_for_unknown_account(tmp_path):
    from backend.account_runtime import _load_broadcasts, _BROADCAST_DB_PATH

    db_path = tmp_path / "test_broadcasts_empty.db"
    monkeypatch = pytest.MonkeyPatch()
    monkeypatch.setattr("backend.account_runtime._BROADCAST_DB_PATH", str(db_path))

    conn = sqlite3.connect(str(db_path))
    conn.execute("""
        CREATE TABLE IF NOT EXISTS broadcasts (
            id TEXT PRIMARY KEY, account_id TEXT NOT NULL, message TEXT DEFAULT '',
            recipients TEXT DEFAULT '[]', status TEXT DEFAULT 'pending',
            scheduled_at TEXT, sent_at TEXT, created_at TEXT DEFAULT '',
            error_message TEXT, recurring_interval_minutes INTEGER,
            cancelled_at TEXT, next_scheduled_at TEXT,
            is_recurring_paused INTEGER DEFAULT 0,
            delivery_mode TEXT DEFAULT 'normal',
            reply_to_message_id INTEGER,
            failure_info TEXT, inline_buttons TEXT
        )
    """)
    conn.commit()
    conn.close()

    result = _load_broadcasts("non-existent-account")
    assert result == []


def test_persist_broadcast_updates_status(tmp_path):
    """_persist_broadcast must update (INSERT OR REPLACE) status on second call."""
    from backend.account_runtime import _persist_broadcast, _load_broadcasts, _BROADCAST_DB_PATH

    db_path = tmp_path / "test_broadcasts_update.db"
    monkeypatch = pytest.MonkeyPatch()
    monkeypatch.setattr("backend.account_runtime._BROADCAST_DB_PATH", str(db_path))

    conn = sqlite3.connect(str(db_path))
    conn.execute("""
        CREATE TABLE IF NOT EXISTS broadcasts (
            id TEXT PRIMARY KEY, account_id TEXT NOT NULL,
            message TEXT DEFAULT '', recipients TEXT DEFAULT '[]',
            status TEXT DEFAULT 'pending', scheduled_at TEXT,
            sent_at TEXT, created_at TEXT DEFAULT '',
            error_message TEXT, recurring_interval_minutes INTEGER,
            cancelled_at TEXT, next_scheduled_at TEXT,
            is_recurring_paused INTEGER DEFAULT 0,
            delivery_mode TEXT DEFAULT 'normal',
            reply_to_message_id INTEGER,
            failure_info TEXT, inline_buttons TEXT
        )
    """)
    conn.commit()
    conn.close()

    b = Broadcast(id="u-1", account_id="acct-1", message="hi", recipients=["1"], status="pending")
    _persist_broadcast(b)

    b.status = "sent"
    _persist_broadcast(b)

    loaded = _load_broadcasts("acct-1")
    assert loaded[0].status == "sent"
