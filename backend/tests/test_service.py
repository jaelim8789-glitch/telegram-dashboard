"""
Unit tests for bot/service.py — handle_update dispatch logic.

Covers:
  - guest_message → GuestEngine.handle_guest_message()
  - /start command → _handle_start()
  - Group message with @mention → AiEmployee.process_group_message()
  - Regular message → default response
  - callback_query → _handle_verify_callback()
  - pre_checkout_query → _handle_pre_checkout_query()
  - Missing TELEGRAM_BOT_TOKEN → graceful skip
"""

from __future__ import annotations

import json
import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from backend.bot.service import (
    _get_ai_employee,
    _get_guest_engine,
    handle_update,
)
from backend.bot.guest_engine import GuestEngine, RequestContext
from backend.bot.ai_employee import AiEmployee


# ── Fake TelegramBotClient ────────────────────────────────────────────


class FakeTelegramClient:
    """Records all API calls — no real network requests."""

    def __init__(self) -> None:
        self.calls: list[dict] = []
        self.bot_token = "fake:token"

    async def send_message(
        self, chat_id: int | str, text: str,
        parse_mode: str | None = None,
        reply_markup: dict | None = None,
        receiver_user_id: int | None = None,
    ) -> dict:
        self.calls.append({
            "method": "sendMessage",
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode,
            "reply_markup": reply_markup,
            "receiver_user_id": receiver_user_id,
        })
        return {"ok": True}

    async def answer_callback_query(
        self, callback_query_id: str, text: str | None = None, show_alert: bool = False,
    ) -> dict:
        self.calls.append({
            "method": "answerCallbackQuery",
            "callback_query_id": callback_query_id,
            "text": text,
            "show_alert": show_alert,
        })
        return {"ok": True}

    async def answer_pre_checkout_query(
        self, pre_checkout_query_id: str, ok: bool, error_message: str | None = None,
    ) -> dict:
        self.calls.append({
            "method": "answerPreCheckoutQuery",
            "pre_checkout_query_id": pre_checkout_query_id,
            "ok": ok,
            "error_message": error_message,
        })
        return {"ok": True}

    async def get_chat_member(self, chat_id: int | str, user_id: int) -> dict:
        return {"status": "creator"}

    async def answer_guest_query(self, *args, **kwargs) -> dict:
        return {"ok": True}


# ── Fixtures ──────────────────────────────────────────────────────────


@pytest.fixture(autouse=True)
def _reset_singletons():
    """Reset module-level singletons between tests."""
    import backend.bot.service as svc
    svc._guest_engine_instance = None
    svc._ai_employee_instance = None
    yield


@pytest.fixture()
def fake_client() -> FakeTelegramClient:
    return FakeTelegramClient()


# ── setup: mock _client() and config ──────────────────────────────────


def _mock_deps(monkeypatch, fake_client):
    """Configure all dependencies for handle_update to work.

    IMPORTANT: service.py uses 'from module import name' imports, creating
    local references. We must patch those local refs on svc directly.
    """
    import backend.bot.service as svc

    _fake_bot_token = "fake:token"

    # Fake config — patched on svc.get_config (local import reference)
    class FakeTelegramBotConfig:
        bot_token = _fake_bot_token
        channel_id = "-100123456789"
        admin_chat_ids: list = []
        webhook_secret = "test-secret"
        webhook_url = "https://example.com/webhook"

        @staticmethod
        def is_configured():
            return True

    class FakeConfig:
        telegram_bot = FakeTelegramBotConfig()

    monkeypatch.setattr(svc, "get_config", lambda: FakeConfig())

    # Mock _client() to return our fake
    monkeypatch.setattr(svc, "_client", lambda: fake_client)

    # Mock DB operations (imported as 'from . import db as bot_db' in svc)
    monkeypatch.setattr(svc.bot_db, "init_bot_tables", lambda: None)
    monkeypatch.setattr(svc.bot_db, "init_ai_tables", lambda: None)
    monkeypatch.setattr(svc.bot_db, "upsert_session", lambda *a, **kw: None)
    monkeypatch.setattr(svc.bot_db, "insert_scheduled_message", lambda *a, **kw: "mock-id")
    monkeypatch.setattr(svc.bot_db, "get_pending_scheduled_messages", lambda: [])

    # Mock free_api_key (imported as 'from ..routers import free_api_key as fak' in svc)
    monkeypatch.setattr(svc.fak, "_init_db", lambda: None)
    monkeypatch.setattr(svc.fak, "_get_request", lambda token: {"token": token})
    monkeypatch.setattr(svc.fak, "_upsert_request", lambda *a, **kw: None)

    # Mock admin_platform AdminPlatform singleton (imported as local refs in svc)
    class FakeAdmin:
        async def change_plan(self, *a, **kw): pass
        async def create_subscription(self, *a, **kw): pass
        async def create_invoice(self, *a, **kw): pass
        def record_usage(self, *a, **kw): pass
        def _audit(self, *a, **kw): pass

    monkeypatch.setattr(svc.AdminPlatform, "get_instance", lambda: FakeAdmin())

    return fake_client


# ── Tests ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_handle_update_no_token(monkeypatch: pytest.MonkeyPatch) -> None:
    """TELEGRAM_BOT_TOKEN이 없으면 조용히 리턴."""
    import backend.bot.service as svc

    # _client returns None when no token configured
    monkeypatch.setattr(svc, "_client", lambda: None)

    update = {"message": {"text": "/start foo", "chat": {"id": 123}}}
    # should not raise
    await handle_update(update)


@pytest.mark.asyncio
async def test_handle_guest_message(monkeypatch: pytest.MonkeyPatch, fake_client: FakeTelegramClient) -> None:
    """guest_message 업데이트는 GuestEngine.handle_guest_message()로 전달."""
    fake_client = _mock_deps(monkeypatch, fake_client)

    handled = False

    class FakeEngine(GuestEngine):
        def __init__(self):
            pass

        async def handle_guest_message(self, update):
            nonlocal handled
            handled = True
            assert update["guest_message"]["guest_query_id"] == "gqid_1"

    import backend.bot.service as svc
    monkeypatch.setattr(svc, "_get_guest_engine", lambda c: FakeEngine())

    update = {
        "guest_message": {
            "guest_query_id": "gqid_1",
            "text": "@TeleMonBot 도움말",
            "chat_id": -1001234567890,
            "user_id": 12345,
        }
    }
    await handle_update(update)
    assert handled, "GuestEngine.handle_guest_message() must be called"


@pytest.mark.asyncio
async def test_handle_start_command(monkeypatch: pytest.MonkeyPatch, fake_client: FakeTelegramClient) -> None:
    """/start 명령어는 _handle_start()로 전달되어 메시지를 보냄."""
    fake_client = _mock_deps(monkeypatch, fake_client)

    update = {
        "message": {
            "text": f"/start {uuid.uuid4()}",
            "chat": {"id": 12345},
            "from": {"id": 67890, "username": "testuser"},
        }
    }
    await handle_update(update)

    assert len(fake_client.calls) >= 1
    # /start should send a welcome message (not the fallback text)
    text = fake_client.calls[0]["text"]
    assert "안녕하세요" in text or "채널" in text or "잘못된" in text


@pytest.mark.asyncio
async def test_handle_group_mention(monkeypatch: pytest.MonkeyPatch, fake_client: FakeTelegramClient) -> None:
    """그룹 @멘션 메시지는 AiEmployee.process_group_message()로 전달."""
    fake_client = _mock_deps(monkeypatch, fake_client)
    import backend.bot.service as svc

    processed = False

    class FakeAiEmployee:
        def __init__(self, client, engine):
            pass

        async def process_group_message(self, update):
            nonlocal processed
            processed = True
            assert update["message"]["text"] == "@TeleMonBot 도움말"

    # Mock AiEmployee to intercept
    monkeypatch.setattr(svc, "_get_ai_employee", lambda c: FakeAiEmployee(fake_client, None))

    update = {
        "message": {
            "text": "@TeleMonBot 도움말",
            "chat": {"id": -1001234567890, "type": "supergroup"},
            "from": {"id": 12345},
        }
    }
    await handle_update(update)
    assert processed, "AiEmployee.process_group_message() must be called for group @mentions"


@pytest.mark.asyncio
async def test_handle_regular_message(monkeypatch: pytest.MonkeyPatch, fake_client: FakeTelegramClient) -> None:
    """일반 1:1 메시지는 안내 메시지로 응답."""
    fake_client = _mock_deps(monkeypatch, fake_client)

    update = {
        "message": {
            "text": "안녕하세요",
            "chat": {"id": 12345, "type": "private"},
            "from": {"id": 67890},
        }
    }
    await handle_update(update)

    assert len(fake_client.calls) >= 1
    text = fake_client.calls[0]["text"]
    assert "무료 체험" in text or "웹사이트" in text


@pytest.mark.asyncio
async def test_handle_group_message_without_mention(
    monkeypatch: pytest.MonkeyPatch, fake_client: FakeTelegramClient,
) -> None:
    """@멘션 없는 그룹 메시지는 아무것도 하지 않음 (서비스 레벨에서 처리 안 함)."""
    fake_client = _mock_deps(monkeypatch, fake_client)

    update = {
        "message": {
            "text": "일반 그룹 메시지",
            "chat": {"id": -1001234567890, "type": "supergroup"},
            "from": {"id": 12345},
        }
    }
    await handle_update(update)

    # No API calls should be made for non-mentioned group messages
    assert len(fake_client.calls) == 0


@pytest.mark.asyncio
async def test_handle_callback_query(monkeypatch: pytest.MonkeyPatch, fake_client: FakeTelegramClient) -> None:
    """callback_query는 verify 처리로 전달."""
    fake_client = _mock_deps(monkeypatch, fake_client)
    import backend.bot.service as svc

    update = {
        "callback_query": {
            "id": "cb_1",
            "data": "verify:test-token-123",
            "from": {"id": 67890},
            "message": {"chat": {"id": 12345}},
        }
    }
    await handle_update(update)

    # Should attempt to answer callback
    assert len(fake_client.calls) >= 1
    first_call = fake_client.calls[0]
    # Either answerCallbackQuery or getChatMember
    assert first_call["method"] in ("answerCallbackQuery", "getChatMember")


@pytest.mark.asyncio
async def test_handle_pre_checkout_query(
    monkeypatch: pytest.MonkeyPatch, fake_client: FakeTelegramClient,
) -> None:
    """pre_checkout_query는 Stars 결제 처리로 전달."""
    fake_client = _mock_deps(monkeypatch, fake_client)

    payload = json.dumps({"pid": "pro_monthly", "uid": "user123"})
    update = {
        "pre_checkout_query": {
            "id": "pcq_1",
            "invoice_payload": payload,
        }
    }
    await handle_update(update)

    assert len(fake_client.calls) >= 1
    # Should have called answerPreCheckoutQuery
    methods = [c["method"] for c in fake_client.calls]
    assert "answerPreCheckoutQuery" in methods


@pytest.mark.asyncio
async def test_handle_successful_payment(
    monkeypatch: pytest.MonkeyPatch, fake_client: FakeTelegramClient,
) -> None:
    """successful_payment가 포함된 메시지는 결제 완료 처리로 전달."""
    fake_client = _mock_deps(monkeypatch, fake_client)
    import backend.bot.service as svc

    payload = json.dumps({"pid": "pro_monthly", "uid": "user123"})
    update = {
        "message": {
            "text": "",
            "chat": {"id": 12345, "type": "private"},
            "successful_payment": {
                "invoice_payload": payload,
                "telegram_payment_charge_id": "ch_123",
                "total_amount": 1500,
            },
        }
    }
    await handle_update(update)

    # Payment handling should proceed without crashing
    # If the product is valid and AdminPlatform is mocked, no API calls
    # to Telegram (sendMessage) should be made for the payment itself,
    # but the method should not raise
    assert True  # No exception = success
