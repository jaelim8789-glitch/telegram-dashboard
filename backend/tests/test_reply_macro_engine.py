"""
Tests for ReplyMacroEngine's scheduled-execution path (backend/account_runtime.py).

Covers two bugs found during manual verification of the Reply Macro feature:
  - max_sends_per_day was never enforced for scheduled (interval/fixed-time) runs
  - scheduled-run logs only went to an in-memory list, never to the SQLite
    reply_macro_logs table the /logs REST endpoint actually reads

Uses a fake Telethon client (no live session/network) — Scheduler, EventBus,
and RateLimiter are the real production classes.
"""

from __future__ import annotations

import os
import sqlite3
import uuid

import pytest

import backend.account_runtime as ar
from backend.account_runtime import ReplyMacroEngine, Scheduler
from backend.event_bus import EventBus
from backend.rate_limiter import RateLimiter
from backend.models import ReplyMacro

TEST_DB_PATH = os.path.join(os.path.dirname(__file__), "_tmp_reply_macro_engine_test.db")


class FakeClient:
    def __init__(self) -> None:
        self.sent: list[tuple] = []

    async def get_entity(self, x):
        return x

    async def send_message(self, entity, message=None, reply_to=None):
        self.sent.append((entity, message, reply_to))

        class _Msg:
            id = 999

        return _Msg()


class FakeHealthMonitor:
    def record_success(self) -> None:
        pass

    def record_failure(self, msg: str) -> None:
        pass


def _init_tables() -> None:
    conn = sqlite3.connect(TEST_DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS reply_macro_logs (
            id TEXT PRIMARY KEY,
            macro_id TEXT NOT NULL,
            account_id TEXT NOT NULL,
            target_chat_id TEXT NOT NULL,
            message_sent TEXT DEFAULT '',
            status TEXT DEFAULT '',
            error_message TEXT,
            reply_to_message_id INTEGER,
            created_at TEXT DEFAULT ''
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS reply_macros (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            last_sent_at TEXT
        )
    """)
    conn.commit()
    conn.close()


@pytest.fixture()
def engine(monkeypatch):
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)
    monkeypatch.setattr(ar, "_REPLY_MACRO_DB_PATH", TEST_DB_PATH)
    _init_tables()

    account_id = "test-acct"
    client = FakeClient()
    eng = ReplyMacroEngine(
        account_id, client, RateLimiter(account_id), EventBus(account_id),
        Scheduler(account_id), FakeHealthMonitor(),
    )
    eng._test_client = client
    yield eng

    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)


def _make_macro(**overrides) -> ReplyMacro:
    defaults = dict(
        id=str(uuid.uuid4()), account_id="test-acct", name="test macro", is_active=True,
        target_chats=["111", "222", "333"], message_content="hello",
        schedule_type="interval", interval_hours=1, max_sends_per_day=2,
    )
    defaults.update(overrides)
    return ReplyMacro(**defaults)


@pytest.mark.asyncio
async def test_max_sends_per_day_is_enforced(engine) -> None:
    macro = _make_macro(max_sends_per_day=2, target_chats=["1", "2", "3"])
    await engine._execute_macro(macro)
    assert len(engine._test_client.sent) == 2


@pytest.mark.asyncio
async def test_limit_persists_across_separate_runs_same_day(engine) -> None:
    macro = _make_macro(max_sends_per_day=2, target_chats=["1"])
    await engine._execute_macro(macro)  # sent_today: 0 -> 1
    await engine._execute_macro(macro)  # sent_today: 1 -> 2 (hits cap)
    await engine._execute_macro(macro)  # cap already reached -> sends 0 more
    assert len(engine._test_client.sent) == 2


@pytest.mark.asyncio
async def test_unlimited_when_max_sends_per_day_is_zero(engine) -> None:
    macro = _make_macro(max_sends_per_day=0, target_chats=["1", "2", "3", "4"])
    await engine._execute_macro(macro)
    assert len(engine._test_client.sent) == 4


@pytest.mark.asyncio
async def test_scheduled_execution_persists_logs_to_sqlite(engine) -> None:
    macro = _make_macro(max_sends_per_day=0, target_chats=["1", "2"])
    await engine._execute_macro(macro)

    conn = sqlite3.connect(TEST_DB_PATH)
    try:
        rows = conn.execute(
            "SELECT target_chat_id, status FROM reply_macro_logs WHERE macro_id = ? ORDER BY target_chat_id",
            (macro.id,),
        ).fetchall()
    finally:
        conn.close()
    assert rows == [("1", "sent"), ("2", "sent")]


@pytest.mark.asyncio
async def test_scheduled_execution_persists_last_sent_at(engine) -> None:
    macro = _make_macro(target_chats=["1"])
    conn = sqlite3.connect(TEST_DB_PATH)
    conn.execute(
        "INSERT INTO reply_macros (id, account_id, last_sent_at) VALUES (?, ?, NULL)",
        (macro.id, "test-acct"),
    )
    conn.commit()
    conn.close()

    await engine._execute_macro(macro)

    conn = sqlite3.connect(TEST_DB_PATH)
    try:
        row = conn.execute("SELECT last_sent_at FROM reply_macros WHERE id = ?", (macro.id,)).fetchone()
    finally:
        conn.close()
    assert row[0] is not None


@pytest.mark.asyncio
async def test_manual_execute_endpoint_unaffected(monkeypatch) -> None:
    """Regression: the manual '/execute' REST endpoint (backend/routers/reply_macro.py)
    must keep working exactly as before -- it goes through RuntimeManager.create_broadcast,
    a completely different code path from the scheduled engine fixed above, and untouched
    by this change."""
    import backend.routers.reply_macro as rm
    from backend.runtime_manager import RuntimeManager
    from backend.models import Broadcast
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)
    monkeypatch.setattr(rm, "DB_PATH", TEST_DB_PATH)

    class _FakeReplyMacroSync:
        def get_macros(self):
            return []

        def set_macros(self, macros):
            pass

    class _FakeRuntime:
        reply_macro = _FakeReplyMacroSync()

    manager = RuntimeManager.get_instance()
    account_id = "manual-test-acct"
    manager._runtimes[account_id] = _FakeRuntime()  # router only checks existence + syncs macros to it

    async def fake_create_broadcast(input_data):
        return Broadcast(
            id="b1", account_id=input_data.account_id,
            message=input_data.message, recipients=input_data.recipients,
        )
    monkeypatch.setattr(manager, "create_broadcast", fake_create_broadcast)

    app = FastAPI()
    app.include_router(rm.router, prefix="/api")

    try:
        client = TestClient(app)

        create_resp = client.post(
            f"/api/accounts/{account_id}/reply-macros",
            json={
                "name": "manual test", "target_chats": ["1", "2"], "message_content": "hi",
                "max_sends_per_day": 1,  # must NOT be enforced here -- manual path is untouched
            },
        )
        assert create_resp.status_code == 200
        macro_id = create_resp.json()["id"]

        exec_resp = client.post(f"/api/accounts/{account_id}/reply-macros/{macro_id}/execute")
        assert exec_resp.status_code == 200
        body = exec_resp.json()
        assert body["success_count"] == 2  # both targets attempted -- confirms no cap applied here
        assert body["fail_count"] == 0

        logs_resp = client.get(f"/api/accounts/{account_id}/reply-macros/{macro_id}/logs")
        assert len(logs_resp.json()) == 2
    finally:
        manager._runtimes.pop(account_id, None)
