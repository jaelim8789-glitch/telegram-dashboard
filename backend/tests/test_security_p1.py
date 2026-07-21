"""
P1 security regressions for TeleMon production hardening.
"""

from __future__ import annotations

import asyncio
import os
import sqlite3
import tempfile
from types import SimpleNamespace

import pytest
from fastapi import HTTPException


class _FakeAdminPlatform:
    def validate_api_key(self, raw_key: str) -> dict[str, object]:
        return {
            "id": "key-1",
            "user_id": "user-1",
            "permissions": "admin",
            "plan": "free",
            "feature_flags": {},
            "max_accounts": 1,
            "daily_limit": 10,
            "usage_count": 0,
            "name": "test",
        }


class _FakeHealthEngine:
    def get_healing_status(self) -> dict[str, object]:
        return {
            "total_accounts": 2,
            "accounts": [
                {"account_id": "a-1", "heartbeat_alive": True, "circuit_state": "closed"},
                {"account_id": "a-2", "heartbeat_alive": False, "circuit_state": "open"},
            ],
        }

    def get_recovery_history(self, limit: int = 100) -> list[dict[str, object]]:
        return [
            {"account_id": "a-1", "event": "recover"},
            {"account_id": "a-2", "event": "recover"},
        ][:limit]

    def get_account_health_detail(self, account_id: str) -> dict[str, object]:
        return {"account_id": account_id, "heartbeat": True, "circuit_breaker": True}


class _FakeRuntimeManager:
    def __init__(self) -> None:
        self.healing_engine = _FakeHealthEngine()

    async def get_health(self):
        return [
            SimpleNamespace(account_id="a-1", phone="111", status="healthy"),
            SimpleNamespace(account_id="a-2", phone="222", status="healthy"),
        ]

    async def get_account_health(self, account_id: str):
        return SimpleNamespace(account_id=account_id, phone="111", status="healthy")

    def get_account_ids_by_user(self, user_id: str):
        return ["a-1"]

    def get_account_owner(self, account_id: str):
        return {"user_id": "owner-2" if account_id == "a-2" else "owner-1"}


@pytest.fixture()
def fake_runtime_manager(monkeypatch):
    from backend import auth_middleware

    fake = _FakeRuntimeManager()
    monkeypatch.setattr(auth_middleware.RuntimeManager, "get_instance", staticmethod(lambda: fake))
    return fake


def test_api_key_cannot_impersonate_admin_role(monkeypatch):
    from backend import auth_middleware

    fake_admin = _FakeAdminPlatform()
    monkeypatch.setattr(auth_middleware.AdminPlatform, "get_instance", staticmethod(lambda: fake_admin))

    original_connect = sqlite3.connect
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = f"{tmpdir}/sessions.db"
        conn = original_connect(db_path)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at REAL NOT NULL, expires_at REAL NOT NULL)"
        )
        conn.commit()
        conn.close()

        def _connect(path, *args, **kwargs):
            if path == "data/sessions.db":
                return original_connect(db_path, *args, **kwargs)
            return original_connect(path, *args, **kwargs)

        monkeypatch.setattr(sqlite3, "connect", _connect)

        user = asyncio.run(auth_middleware.get_current_user(authorization="tm_demo"))

    assert user["role"] == "api_key"
    assert user["api_key_permissions"] == "admin"


def test_health_endpoints_are_tenant_filtered(fake_runtime_manager):
    from backend.routers import health

    items = asyncio.run(health.get_account_health(current_user={"id": "owner-1", "role": "user"}))
    assert [item.account_id for item in items] == ["a-1"]

    with pytest.raises(HTTPException) as exc:
        asyncio.run(health.get_single_account_health("a-2", current_user={"id": "owner-1", "role": "user"}))
    assert exc.value.status_code == 403


def test_healing_endpoints_are_tenant_filtered(fake_runtime_manager):
    from backend.routers import healing

    status = asyncio.run(healing.get_healing_status(current_user={"id": "owner-1", "role": "user"}))
    assert [acct["account_id"] for acct in status["accounts"]] == ["a-1"]
    assert status["total_accounts"] == 1

    history = asyncio.run(healing.get_healing_history(current_user={"id": "owner-1", "role": "user"}))
    assert [event["account_id"] for event in history["events"]] == ["a-1"]

    with pytest.raises(HTTPException) as exc:
        asyncio.run(healing.get_account_healing_detail("a-2", current_user={"id": "owner-1", "role": "user"}))
    assert exc.value.status_code == 403


def test_webhook_secret_is_required(monkeypatch):
    from backend.routers import telegram_bot

    class _FakeBotConfig:
        webhook_secret = ""

    class _FakeTelegramConfig:
        telegram_bot = _FakeBotConfig()

    monkeypatch.setattr(telegram_bot, "get_config", lambda: _FakeTelegramConfig())

    class _Req:
        async def json(self):
            return {}

    with pytest.raises(HTTPException) as exc:
        asyncio.run(telegram_bot.telegram_webhook(_Req()))
    assert exc.value.status_code == 503


def test_observability_defaults_are_hardened():
    compose = open(os.path.join(os.path.dirname(__file__), "..", "..", "docker-compose.observability.yml"), encoding="utf-8").read()
    assert "127.0.0.1:9090:9090" in compose
    assert "127.0.0.1:3001:3000" in compose
    assert "127.0.0.1:3100:3100" in compose
    assert "127.0.0.1:3200:3200" in compose
    assert "GRAFANA_ADMIN_PASSWORD is required" in compose


def test_free_api_key_authenticates_successfully(monkeypatch):
    """tm_free_* keys stored in free_api_keys table must authenticate via validate_api_key."""
    from backend import admin_platform

    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = f"{tmpdir}/free_api_keys.db"
        monkeypatch.setattr("backend.routers.free_api_key.DB_PATH", db_path)

        # Create the table and insert a free key
        conn = sqlite3.connect(db_path)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS free_api_keys (
                id TEXT PRIMARY KEY,
                phone TEXT NOT NULL UNIQUE,
                api_key TEXT NOT NULL UNIQUE,
                created_at TEXT DEFAULT ''
            )
        """)
        test_key = "tm_free_" + "a" * 32
        conn.execute(
            "INSERT INTO free_api_keys (id, phone, api_key, created_at) VALUES (?, ?, ?, ?)",
            ("key-1", "+8201012345678", test_key, "2026-07-16T00:00:00"),
        )
        conn.commit()
        conn.close()

        # Direct instantiation for test (AdminPlatform uses __init__)
        class _FakeDb:
            def _get_conn(self):
                return sqlite3.connect(db_path)

        ap = admin_platform.AdminPlatform.__new__(admin_platform.AdminPlatform)
        ap.db = _FakeDb()
        result = ap.validate_api_key(test_key)

    assert result is not None
    assert result["plan"] == "free"
    assert result["max_accounts"] == 1
    assert result["permissions"] == "read"


def test_free_api_key_rejects_unknown_key():
    """Non-existent tm_free_* key must return None."""
    from backend import admin_platform

    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = f"{tmpdir}/empty_free_api_keys.db"

        class _FakeDb:
            def _get_conn(self):
                return sqlite3.connect(db_path)

        ap = admin_platform.AdminPlatform.__new__(admin_platform.AdminPlatform)
        ap.db = _FakeDb()
        result = ap.validate_api_key("tm_free_" + "b" * 32)

    assert result is None


def test_regular_api_key_still_works(monkeypatch):
    """Existing api_keys JOIN users path must be untouched by the free key change."""
    from backend import admin_platform

    with tempfile.TemporaryDirectory() as tmpdir:
        admin_db = f"{tmpdir}/admin.db"
        conn = sqlite3.connect(admin_db)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS api_keys (
                id TEXT PRIMARY KEY, key_hash TEXT, user_id TEXT,
                name TEXT, key_prefix TEXT, plan TEXT, permissions TEXT,
                max_accounts INTEGER DEFAULT 1, daily_limit INTEGER DEFAULT 0,
                feature_flags TEXT DEFAULT '{}',
                usage_count INTEGER DEFAULT 0, usage_reset_at TEXT,
                last_used_at TEXT,
                is_active INTEGER DEFAULT 1, expires_at TEXT
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY, role TEXT, plan TEXT,
                is_active INTEGER DEFAULT 1, is_suspended INTEGER DEFAULT 0
            )
        """)
        conn.execute(
            "INSERT INTO users (id, role, plan, is_active, is_suspended) VALUES (?, ?, ?, 1, 0)",
            ("user-1", "user", "pro"),
        )
        import hashlib
        key_hash = hashlib.sha256("tm_pro_test_key".encode("utf-8")).hexdigest()
        conn.execute(
            "INSERT INTO api_keys (id, key_hash, user_id, name, key_prefix, plan, permissions, max_accounts, daily_limit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            ("api-key-1", key_hash, "user-1", "test key", "tm_pro", "pro", "read", 10, 100),
        )
        conn.commit()
        conn.close()

        class _FakeDb:
            def _get_conn(self):
                conn = sqlite3.connect(admin_db)
                conn.row_factory = sqlite3.Row
                return conn

        ap = admin_platform.AdminPlatform.__new__(admin_platform.AdminPlatform)
        ap.db = _FakeDb()
        result = ap.validate_api_key("tm_pro_test_key")

    assert result is not None
    assert result["plan"] == "pro"
    assert result["max_accounts"] == 10
