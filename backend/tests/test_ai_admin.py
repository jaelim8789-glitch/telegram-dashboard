"""
Unit tests for ai_admin.py router — StyleProfile CRUD, scheduled message API.
"""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.routers import ai_admin as ai_admin_module


# ── Mock admin user dependency ─────────────────────────────────────────


async def _fake_admin_user():
    return {"id": "admin1", "role": "admin"}


@pytest.fixture()
def client(monkeypatch: pytest.MonkeyPatch):
    """FastAPI TestClient with ai_admin router and mocked admin auth.

    Uses app.dependency_overrides to replace require_admin_user
    (Depends captures function ref at module import time).
    """
    # Override dependency at app level (FastAPI's testing pattern)
    from backend.auth_middleware import require_admin_user

    import backend.bot.db as bot_db
    monkeypatch.setattr(bot_db, "init_ai_tables", lambda: None)

    app = FastAPI()
    app.include_router(ai_admin_module.router)
    app.dependency_overrides[require_admin_user] = _fake_admin_user
    with TestClient(app) as c:
        yield c


# ── StyleProfile tests ────────────────────────────────────────────────


def test_get_style_profile_not_found(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    """설정되지 않은 그룹은 기본값 반환."""
    import backend.bot.db as bot_db
    monkeypatch.setattr(bot_db, "get_group_style_profile", lambda cid: None)

    resp = client.get("/api/bot/ai/style-profile/12345")
    assert resp.status_code == 200
    data = resp.json()
    assert data["chat_id"] == 12345
    assert data["configured"] is False
    assert data["style_profile_id"] is None


def test_get_style_profile_found(client: TestClient, monkeypatch) -> None:
    """설정된 그룹은 저장된 프로필 반환."""
    import backend.bot.db as bot_db
    monkeypatch.setattr(
        bot_db, "get_group_style_profile",
        lambda cid: {
            "chat_id": cid,
            "style_profile_id": "friendly",
            "available_actions": ["번역", "요약", "날씨"],
            "updated_at": "2026-07-20T00:00:00",
        },
    )
    resp = client.get("/api/bot/ai/style-profile/12345")
    assert resp.status_code == 200
    data = resp.json()
    assert data["style_profile_id"] == "friendly"
    assert data["available_actions"] == ["번역", "요약", "날씨"]
    assert data["configured"] is True


def test_set_style_profile(client: TestClient, monkeypatch) -> None:
    """POST로 StyleProfile을 설정하면 성공 응답."""
    saved = {}

    import backend.bot.db as bot_db
    monkeypatch.setattr(
        bot_db, "upsert_group_style_profile",
        lambda chat_id, style_profile_id, available_actions=None: saved.update(
            {"chat_id": chat_id, "style_profile_id": style_profile_id, "actions": available_actions}
        ),
    )

    resp = client.post(
        "/api/bot/ai/style-profile/12345",
        json={"style_profile_id": "professional", "available_actions": ["번역", "요약"]},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["updated"] is True
    assert data["style_profile_id"] == "professional"
    assert saved["chat_id"] == 12345


def test_set_style_profile_empty_id(client: TestClient) -> None:
    """빈 style_profile_id는 400 에러."""
    resp = client.post("/api/bot/ai/style-profile/12345", json={"style_profile_id": ""})
    assert resp.status_code == 400


def test_delete_style_profile_found(client: TestClient, monkeypatch) -> None:
    """DELETE로 StyleProfile 삭제."""
    import backend.bot.db as bot_db
    monkeypatch.setattr(bot_db, "delete_group_style_profile", lambda cid: True)

    resp = client.delete("/api/bot/ai/style-profile/12345")
    assert resp.status_code == 200
    assert resp.json()["deleted"] is True


def test_delete_style_profile_not_found(client: TestClient, monkeypatch) -> None:
    """존재하지 않는 프로필 삭제는 404."""
    import backend.bot.db as bot_db
    monkeypatch.setattr(bot_db, "delete_group_style_profile", lambda cid: False)

    resp = client.delete("/api/bot/ai/style-profile/99999")
    assert resp.status_code == 404


# ── Scheduled Messages tests ──────────────────────────────────────────


def test_list_scheduled_messages(client: TestClient, monkeypatch) -> None:
    """예약 메시지 목록 조회."""
    import backend.bot.db as bot_db
    monkeypatch.setattr(
        bot_db, "get_scheduled_messages",
        lambda status=None, limit=100: [
            {"id": "msg1", "chat_id": 123, "text": "hello", "status": "pending"},
        ],
    )

    resp = client.get("/api/bot/ai/scheduled-messages")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["messages"]) == 1
    assert data["messages"][0]["id"] == "msg1"


def test_list_scheduled_messages_with_status(client: TestClient, monkeypatch) -> None:
    """status 필터로 조회."""
    import backend.bot.db as bot_db
    captured = {}

    def mock_get(status=None, limit=100):
        captured["status"] = status
        return []

    monkeypatch.setattr(bot_db, "get_scheduled_messages", mock_get)

    client.get("/api/bot/ai/scheduled-messages?status=sent")
    assert captured["status"] == "sent"


def test_list_scheduled_messages_invalid_status(client: TestClient) -> None:
    """잘못된 status는 400 에러."""
    resp = client.get("/api/bot/ai/scheduled-messages?status=invalid")
    assert resp.status_code == 400


def test_cancel_scheduled_message_found(client: TestClient, monkeypatch) -> None:
    """예약 메시지 취소 성공."""
    import backend.bot.db as bot_db
    monkeypatch.setattr(bot_db, "cancel_scheduled_message", lambda mid: True)

    resp = client.post("/api/bot/ai/scheduled-messages/msg-123/cancel")
    assert resp.status_code == 200
    assert resp.json()["cancelled"] is True


def test_cancel_scheduled_message_not_found(client: TestClient, monkeypatch) -> None:
    """이미 발송된 메시지 취소는 404."""
    import backend.bot.db as bot_db
    monkeypatch.setattr(bot_db, "cancel_scheduled_message", lambda mid: False)

    resp = client.post("/api/bot/ai/scheduled-messages/msg-999/cancel")
    assert resp.status_code == 404


# ── Health tests ──────────────────────────────────────────────────────


def test_health_endpoint(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    """health 엔드포인트가 정상 응답.

    ai_admin.py imports get_config via 'from ..production_config import get_config'
    which creates a local reference. We must patch the local reference
    on ai_admin_module directly.
    """
    # Create a mock config with telegram_bot attribute
    class FakeTelegramBotConfig:
        bot_token = "fake:token"

        @staticmethod
        def is_configured():
            return True

    class FakeConfig:
        telegram_bot = FakeTelegramBotConfig()

    monkeypatch.setattr(ai_admin_module, "get_config", lambda: FakeConfig())

    resp = client.get("/api/bot/ai/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["configured"] is True
    assert data["tables_initialized"] is True
