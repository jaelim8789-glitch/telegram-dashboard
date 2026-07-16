"""
Regression tests for the free-trial / free-API-key verification flow
(backend/routers/free_api_key.py).

Guards against a real bug found while building the Telegram Bot Module:
`_upsert_request()` previously never persisted the `token` column on
INSERT (so every verification lookup 404'd forever and every call
created a new NULL-token row), and its UPDATE branch had a mismatched
parameter count that only surfaced once the INSERT bug was fixed.

Runs fully in-process (FastAPI TestClient, only the free_api_key router
mounted) against a throwaway SQLite file — no live server, no
Telethon/account runtime involved.
"""

from __future__ import annotations

import importlib
import os
import sqlite3
import uuid

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

TEST_DB_PATH = os.path.join(os.path.dirname(__file__), "_tmp_free_api_key_test.db")


@pytest.fixture()
def client(monkeypatch):
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)
    monkeypatch.setenv("ADMIN_DB_PATH", TEST_DB_PATH)

    from backend.routers import free_api_key as fak_module
    importlib.reload(fak_module)  # re-read ADMIN_DB_PATH into the module-level DB_PATH

    app = FastAPI()
    app.include_router(fak_module.router, prefix="/api")

    with TestClient(app) as c:
        yield c

    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)


def _start(client: TestClient) -> dict:
    resp = client.post("/api/free-api-key/start")
    assert resp.status_code == 200
    return resp.json()


def test_start_returns_token_and_links(client: TestClient) -> None:
    data = _start(client)
    assert data["token"]
    assert data["bot_deep_link"].endswith(data["token"])
    assert data["channel_url"]


def test_check_unknown_token_404(client: TestClient) -> None:
    resp = client.post("/api/telegram-verify/check", json={"token": str(uuid.uuid4())})
    assert resp.status_code == 404


def test_check_reflects_pending_status_immediately_after_start(client: TestClient) -> None:
    data = _start(client)
    resp = client.post("/api/telegram-verify/check", json={"token": data["token"]})
    assert resp.status_code == 200
    assert resp.json()["status"] == "pending_bot_start"


def test_issue_before_verification_returns_no_key(client: TestClient) -> None:
    data = _start(client)
    resp = client.post(
        "/api/free-api-key/issue", json={"token": data["token"], "phone": "+821000000001"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["api_key"] is None
    assert body["already_issued"] is False


def test_full_verification_and_issue_flow(client: TestClient) -> None:
    from backend.routers import free_api_key as fak_module

    data = _start(client)
    token = data["token"]

    # Simulates what the Telegram bot does after a successful channel-membership check.
    fak_module._upsert_request(token, status="verified", reason=None)

    check_resp = client.post("/api/telegram-verify/check", json={"token": token})
    assert check_resp.json()["status"] == "verified"

    issue_resp = client.post(
        "/api/free-api-key/issue", json={"token": token, "phone": "+821000000002"}
    )
    body = issue_resp.json()
    assert body["api_key"] is not None
    assert body["api_key"].startswith("tm_free_")
    assert body["already_issued"] is False

    # Re-issuing for the same phone via a fresh token must return the same key.
    data2 = _start(client)
    token2 = data2["token"]
    fak_module._upsert_request(token2, status="verified", reason=None)
    issue_resp2 = client.post(
        "/api/free-api-key/issue", json={"token": token2, "phone": "+821000000002"}
    )
    body2 = issue_resp2.json()
    assert body2["already_issued"] is True
    assert body2["api_key"] == body["api_key"]


def test_upsert_request_persists_token_without_duplicating_rows(client: TestClient) -> None:
    """Regression test for the exact bug fixed: token was never written on
    INSERT, and the UPDATE branch had a parameter-count mismatch."""
    from backend.routers import free_api_key as fak_module

    fak_module._init_db()
    token = str(uuid.uuid4())
    fak_module._upsert_request(token, phone="", status="pending_bot_start", reason=None, api_key=None)
    fak_module._upsert_request(token, status="unverified", reason="not_channel_member")
    fak_module._upsert_request(token, status="verified", reason=None)

    conn = sqlite3.connect(TEST_DB_PATH)
    try:
        rows = conn.execute(
            "SELECT token, status FROM free_api_key_requests WHERE token = ?", (token,)
        ).fetchall()
    finally:
        conn.close()

    assert len(rows) == 1, "status transitions must UPDATE the existing row, not insert duplicates"
    assert rows[0][0] == token
    assert rows[0][1] == "verified"
