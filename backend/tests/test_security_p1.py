"""
P1 security regressions for TeleMon production hardening.
"""

from __future__ import annotations

import asyncio
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
    compose = open("docker-compose.observability.yml", encoding="utf-8").read()
    assert "127.0.0.1:9090:9090" in compose
    assert "127.0.0.1:3001:3000" in compose
    assert "127.0.0.1:3100:3100" in compose
    assert "127.0.0.1:3200:3200" in compose
    assert "GRAFANA_ADMIN_PASSWORD is required" in compose
