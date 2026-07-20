"""
Unit tests for AiEmployee (backend/bot/ai_employee.py).

Covers:
  - Bot mention detection and stripping
  - process_group_message() full flow
  - _execute_for_group() action handling
  - Integration with GuestEngine's decide_action
"""

from __future__ import annotations

import pytest

from backend.bot.ai_employee import AiEmployee
from backend.bot.guest_engine import Decision, GuestEngine, RequestContext


# ── Fakes ──────────────────────────────────────────────────────────────


class FakeClient:
    def __init__(self) -> None:
        self.calls: list[dict] = []

    async def send_message(
        self, chat_id: int | str, text: str,
        parse_mode: str | None = None,
        reply_markup: dict | None = None,
    ) -> dict:
        self.calls.append({
            "method": "sendMessage",
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode,
            "reply_markup": reply_markup,
        })
        return {"ok": True}

    async def answer_guest_query(self, *args, **kwargs) -> dict:
        return {"ok": True}


class FakeGuestEngine(GuestEngine):
    """GuestEngine의 decide_action을 오버라이드하여 예측 가능한 Decision 반환."""

    def __init__(self) -> None:
        # TelegramBotClient 없이 초기화 (부모 __init__ 사용 안 함)
        self._daily_usage: dict[str, int] = {}
        self._user_limits: dict[str, int] = {}
        self._commands = {}

    async def decide_action(self, context: RequestContext) -> Decision:
        return Decision(
            action="reply",
            text=f"AI response for: {context.text}",
            parse_mode="Markdown",
            reply_markup=None,
        )


# ── Fixtures ────────────────────────────────────────────────────────────


@pytest.fixture()
def employee() -> AiEmployee:
    client = FakeClient()
    engine = FakeGuestEngine()
    return AiEmployee(client, engine)


@pytest.fixture()
def employee_with_rate_limit() -> AiEmployee:
    client = FakeClient()
    engine = FakeGuestEngine()

    class RateLimitedEngine(FakeGuestEngine):
        async def decide_action(self, context: RequestContext) -> Decision:
            return Decision(action="rate_limited", text="Daily limit reached")

    return AiEmployee(client, RateLimitedEngine())


# ── Bot mention detection ──────────────────────────────────────────────


class TestBotMention:
    def test_is_bot_mentioned_with_at_symbol(self) -> None:
        assert AiEmployee._is_bot_mentioned("@TeleMonBot 번역 Hello")
        assert AiEmployee._is_bot_mentioned("@telemonbot 도움말")
        assert AiEmployee._is_bot_mentioned("@TeleMon_Bot 날씨")

    def test_is_bot_mentioned_case_insensitive(self) -> None:
        assert AiEmployee._is_bot_mentioned("@TELEMONBOT help")
        assert AiEmployee._is_bot_mentioned("@telemon_bot test")

    def test_is_bot_mentioned_without_mention(self) -> None:
        assert not AiEmployee._is_bot_mentioned("그냥 일반 메시지")
        assert not AiEmployee._is_bot_mentioned("번역 Hello")
        assert not AiEmployee._is_bot_mentioned("")

    def test_strip_bot_mention(self) -> None:
        assert AiEmployee._strip_bot_mention("@TeleMonBot 번역 Hello") == "번역 Hello"
        assert AiEmployee._strip_bot_mention("@telemonbot 도움말") == "도움말"
        assert AiEmployee._strip_bot_mention("@TeleMon_Bot 날씨 서울") == "날씨 서울"

    def test_strip_bot_mention_no_mention(self) -> None:
        assert AiEmployee._strip_bot_mention("일반 텍스트") == "일반 텍스트"
        assert AiEmployee._strip_bot_mention("") == ""


# ── process_group_message ──────────────────────────────────────────────


@pytest.mark.asyncio
async def test_process_group_message_with_mention(employee: AiEmployee) -> None:
    """@멘션이 포함된 그룹 메시지를 처리하고 sendMessage를 호출."""
    update = {
        "message": {
            "text": "@TeleMonBot 번역 Hello World",
            "chat": {"id": -1001234567890, "type": "supergroup"},
            "from": {"id": 12345, "username": "testuser"},
        }
    }
    await employee.process_group_message(update)
    assert len(employee._client.calls) == 1  # type: ignore[attr-defined]
    call = employee._client.calls[0]  # type: ignore[attr-defined]
    assert call["method"] == "sendMessage"
    assert call["chat_id"] == -1001234567890
    assert "AI response for: 번역 Hello World" in call["text"]
    # reply_markup은 그룹에서 None이어야 함
    assert call["reply_markup"] is None


@pytest.mark.asyncio
async def test_process_group_message_without_mention(employee: AiEmployee) -> None:
    """@멘션이 없으면 그룹 메시지를 무시."""
    update = {
        "message": {
            "text": "일반 그룹 메시지입니다",
            "chat": {"id": -1001234567890, "type": "supergroup"},
            "from": {"id": 12345},
        }
    }
    await employee.process_group_message(update)
    assert len(employee._client.calls) == 0  # type: ignore[attr-defined]


@pytest.mark.asyncio
async def test_process_group_message_empty_text(employee: AiEmployee) -> None:
    """빈 텍스트 메시지는 무시."""
    update = {"message": {"text": "", "chat": {"id": -1001234567890}}}
    await employee.process_group_message(update)
    assert len(employee._client.calls) == 0  # type: ignore[attr-defined]


@pytest.mark.asyncio
async def test_process_group_message_no_chat_id(employee: AiEmployee) -> None:
    """chat_id가 없으면 무시."""
    update = {"message": {"text": "@TeleMonBot 도움말", "chat": {}}}
    await employee.process_group_message(update)
    assert len(employee._client.calls) == 0  # type: ignore[attr-defined]


@pytest.mark.asyncio
async def test_process_group_message_mention_only(employee: AiEmployee) -> None:
    """@멘션만 있고 명령어가 없으면 도움말로 처리."""
    update = {
        "message": {
            "text": "@TeleMonBot",
            "chat": {"id": -1001234567890, "type": "group"},
            "from": {"id": 12345},
        }
    }
    await employee.process_group_message(update)
    assert len(employee._client.calls) == 1  # type: ignore[attr-defined]
    # clean_text가 ""이므로 "도움말"로 대체되어 AI가 처리
    call_text = employee._client.calls[0]["text"]  # type: ignore[attr-defined]
    assert "도움말" in call_text


# ── _execute_for_group ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_execute_for_group_skips_rate_limited(
    employee_with_rate_limit: AiEmployee,
) -> None:
    """rate_limited 결정은 그룹에서 무시됨."""
    employee = employee_with_rate_limit
    update = {
        "message": {
            "text": "@TeleMonBot 도움말",
            "chat": {"id": -1001234567890, "type": "supergroup"},
            "from": {"id": 12345},
        }
    }
    await employee.process_group_message(update)
    assert len(employee._client.calls) == 0  # type: ignore[attr-defined]


@pytest.mark.asyncio
async def test_execute_for_group_skips_noop(employee: AiEmployee) -> None:
    """noop 결정은 그룹에서 무시됨."""
    client = FakeClient()

    class NoopEngine(FakeGuestEngine):
        async def decide_action(self, context: RequestContext) -> Decision:
            return Decision(action="noop", text="")

    emp = AiEmployee(client, NoopEngine())
    update = {
        "message": {
            "text": "@TeleMonBot 도움말",
            "chat": {"id": -1001234567890, "type": "group"},
            "from": {"id": 12345},
        }
    }
    await emp.process_group_message(update)
    assert len(client.calls) == 0


# ── Style profile & available actions ──────────────────────────────────


def test_get_style_profile_default(employee: AiEmployee) -> None:
    """기본 style_profile_id는 None."""
    assert employee._get_style_profile(-1001234567890) is None


def test_get_available_actions_default(employee: AiEmployee) -> None:
    """기본 available_actions에 핵심 명령어가 포함됨."""
    actions = employee._get_available_actions(-1001234567890)
    assert "번역" in actions
    assert "요약" in actions
    assert "날씨" in actions
    assert "뉴스" in actions
    assert "도움말" in actions
