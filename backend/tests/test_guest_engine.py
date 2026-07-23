"""
Unit tests for GuestEngine (backend/bot/guest_engine.py).

Covers:
  - decide_action(): command routing, rate limiting, fallback
  - execute_decision(): Telegram API call verification
  - Individual handlers: translate, summarize, weather, news, help, start
  - _call_ai(): AI integration point
  - Daily limit enforcement and user limit overrides
"""

from __future__ import annotations

import pytest

from backend.bot.guest_engine import (
    Decision,
    GuestEngine,
    RequestContext,
    _call_ai,
    _DEEPSEEK_API_KEY,
    GUEST_HELP_TEXT,
)


# ── Fake TelegramBotClient ────────────────────────────────────────────


class FakeClient:
    """Records all API calls instead of making real network requests."""

    def __init__(self) -> None:
        self.calls: list[dict] = []

    async def answer_guest_query(
        self, guest_query_id: str, text: str, parse_mode: str | None = None,
        reply_markup: dict | None = None,
    ) -> dict:
        self.calls.append({
            "method": "answerGuestQuery",
            "guest_query_id": guest_query_id,
            "text": text,
            "parse_mode": parse_mode,
            "reply_markup": reply_markup,
        })
        return {"ok": True}


# ── Fixtures ──────────────────────────────────────────────────────────


@pytest.fixture()
def engine() -> GuestEngine:
    client = FakeClient()
    return GuestEngine(client, daily_limit=5)


# ── decide_action: command routing ────────────────────────────────────


@pytest.mark.asyncio
async def test_decide_action_help_command(engine: GuestEngine) -> None:
    """도움말 명령어는 GUEST_HELP_TEXT를 반환."""
    ctx = RequestContext(text="도움말", chat_id=123, user_id="u1")
    decision = await engine.decide_action(ctx)
    assert decision.action == "reply"
    assert GUEST_HELP_TEXT in decision.text
    assert decision.reply_markup is not None  # promo keyboard


@pytest.mark.asyncio
async def test_decide_action_start_command(engine: GuestEngine) -> None:
    """시작 명령어는 환영 메시지를 반환."""
    ctx = RequestContext(text="시작", chat_id=123, user_id="u1")
    decision = await engine.decide_action(ctx)
    assert decision.action == "reply"
    assert "TeleMon AI 비서" in decision.text


@pytest.mark.asyncio
async def test_decide_action_translate_without_args(engine: GuestEngine) -> None:
    """번역 명령어에 인자가 없으면 사용법을 반환."""
    ctx = RequestContext(text="번역", chat_id=123, user_id="u1")
    decision = await engine.decide_action(ctx)
    assert decision.action == "reply"
    assert "번역 사용법" in decision.text


@pytest.mark.asyncio
async def test_decide_action_summarize_short_text(engine: GuestEngine) -> None:
    """요약 명령어에 짧은 텍스트는 경고 메시지."""
    ctx = RequestContext(text="요약 짧음", chat_id=123, user_id="u1")
    decision = await engine.decide_action(ctx)
    assert decision.action == "reply"
    assert "너무 짧습니다" in decision.text


@pytest.mark.asyncio
async def test_decide_action_fallback_unknown_command(engine: GuestEngine) -> None:
    """알 수 없는 명령어는 fallback 메시지."""
    ctx = RequestContext(text="xyz123", chat_id=123, user_id="u1")
    decision = await engine.decide_action(ctx)
    assert decision.action == "reply"
    assert "xyz123" in decision.text
    assert "이해하지 못했어요" in decision.text


@pytest.mark.asyncio
async def test_decide_action_parse_mention_prefix(engine: GuestEngine) -> None:
    """@TeleMonBot 접두사가 있어도 정상 처리."""
    ctx = RequestContext(text="@TeleMonBot 도움말", chat_id=123, user_id="u1")
    decision = await engine.decide_action(ctx)
    assert decision.action == "reply"
    assert GUEST_HELP_TEXT in decision.text


@pytest.mark.asyncio
async def test_decide_action_english_command(engine: GuestEngine) -> None:
    """영어 명령어(help, translate 등)도 정상 처리."""
    ctx = RequestContext(text="help", chat_id=123, user_id="u1")
    decision = await engine.decide_action(ctx)
    assert decision.action == "reply"
    assert GUEST_HELP_TEXT in decision.text


# ── decide_action: rate limiting ──────────────────────────────────────


@pytest.mark.asyncio
async def test_decide_action_rate_limited(engine: GuestEngine) -> None:
    """일일 한도 초과 시 rate_limited 결정 반환."""
    # 사용량을 한도까지 채움
    engine._daily_usage["u1"] = 5  # daily_limit=5

    ctx = RequestContext(text="도움말", chat_id=123, user_id="u1")
    decision = await engine.decide_action(ctx)
    assert decision.action == "rate_limited"
    assert "사용 한도" in decision.text


@pytest.mark.asyncio
async def test_decide_action_rate_limited_respects_user_override(engine: GuestEngine) -> None:
    """사용자별 한도 오버라이드가 글로벌 한도보다 우선."""
    engine._user_limits["u1"] = 2
    engine._daily_usage["u1"] = 2  # 글로벌 5보다 작지만 유저 한도 2 도달

    ctx = RequestContext(text="도움말", chat_id=123, user_id="u1")
    decision = await engine.decide_action(ctx)
    assert decision.action == "rate_limited"
    assert "2회" in decision.text  # 유저 한도 2회 표시


@pytest.mark.asyncio
async def test_decide_action_not_rate_limited_below_limit(engine: GuestEngine) -> None:
    """한도 이내에서는 정상 응답."""
    engine._daily_usage["u1"] = 3  # daily_limit=5, 아직 여유 있음

    ctx = RequestContext(text="도움말", chat_id=123, user_id="u1")
    decision = await engine.decide_action(ctx)
    assert decision.action == "reply"


# ── execute_decision ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_execute_decision_calls_answer_guest_query(engine: GuestEngine) -> None:
    """execute_decision이 answerGuestQuery를 호출하는지 확인."""
    decision = Decision(action="reply", text="Hello", reply_markup=None)
    await engine.execute_decision(decision, "gqid_123")
    assert len(engine._client.calls) == 1  # type: ignore[attr-defined]
    call = engine._client.calls[0]  # type: ignore[attr-defined]
    assert call["method"] == "answerGuestQuery"
    assert call["guest_query_id"] == "gqid_123"
    assert call["text"] == "Hello"


@pytest.mark.asyncio
async def test_execute_decision_noop_skips_api(engine: GuestEngine) -> None:
    """action='noop'인 경우 API 호출 건너뜀."""
    decision = Decision(action="noop", text="")
    await engine.execute_decision(decision, "gqid_123")
    assert len(engine._client.calls) == 0  # type: ignore[attr-defined]


# ── handle_guest_message ──────────────────────────────────────────────


@pytest.mark.asyncio
async def test_handle_guest_message_full_flow(engine: GuestEngine) -> None:
    """handle_guest_message: 업데이트 파싱 → 결정 → 실행 → 사용량 증가."""
    update = {
        "guest_message": {
            "guest_query_id": "gqid_999",
            "text": "@TeleMonBot 도움말",
            "chat_id": 12345,
            "user_id": 67890,
        }
    }
    await engine.handle_guest_message(update)
    # API 호출 확인
    assert len(engine._client.calls) == 1  # type: ignore[attr-defined]
    assert engine._client.calls[0]["guest_query_id"] == "gqid_999"  # type: ignore[attr-defined]
    # 사용량 증가 확인
    assert engine._daily_usage.get("67890") == 1


@pytest.mark.asyncio
async def test_handle_guest_message_missing_fields(engine: GuestEngine) -> None:
    """필수 필드가 없으면 조용히 무시."""
    await engine.handle_guest_message({"guest_message": {"text": "hi"}})  # guest_query_id 없음
    assert len(engine._client.calls) == 0  # type: ignore[attr-defined]

    await engine.handle_guest_message({"guest_message": {"guest_query_id": "x"}})  # text 없음
    assert len(engine._client.calls) == 0  # type: ignore[attr-defined]


# ── Command parsing ───────────────────────────────────────────────────


class TestParseCommand:
    def test_mention_stripped(self, engine: GuestEngine) -> None:
        cmd, args = engine._parse_command("@TeleMonBot 번역 Hello")
        assert cmd == "번역"
        assert args == "Hello"

    def test_no_mention(self, engine: GuestEngine) -> None:
        cmd, args = engine._parse_command("날씨 서울")
        assert cmd == "날씨"
        assert args == "서울"

    def test_mention_only(self, engine: GuestEngine) -> None:
        cmd, args = engine._parse_command("@TeleMonBot")
        assert cmd == "도움말"
        assert args == ""

    def test_empty_text(self, engine: GuestEngine) -> None:
        cmd, args = engine._parse_command("")
        assert cmd == "도움말"
        assert args == ""

    def test_english_mention(self, engine: GuestEngine) -> None:
        cmd, args = engine._parse_command("@telemonbot help")
        assert cmd == "help"
        assert args == ""


# ── Daily limit management ────────────────────────────────────────────


def test_daily_limit_setter(engine: GuestEngine) -> None:
    engine.daily_limit = 10
    assert engine.daily_limit == 10

    engine.daily_limit = 0  # 최소값 1로 설정
    assert engine.daily_limit == 1


def test_daily_usage_snapshot(engine: GuestEngine) -> None:
    engine._daily_usage["u1"] = 3
    engine._daily_usage["u2"] = 5
    snapshot = engine.daily_usage_snapshot
    assert snapshot == {"u1": 3, "u2": 5}
    # 스냅샷 수정이 원본에 영향을 주지 않음
    snapshot["u1"] = 99
    assert engine._daily_usage["u1"] == 3


def test_unique_users_today(engine: GuestEngine) -> None:
    engine._daily_usage["u1"] = 1
    engine._daily_usage["u2"] = 5
    assert engine.unique_users_today == 2


def test_total_requests_today(engine: GuestEngine) -> None:
    engine._daily_usage["u1"] = 3
    engine._daily_usage["u2"] = 7
    assert engine.total_requests_today == 10


# ── User limit overrides ──────────────────────────────────────────────


def test_user_limit_override(engine: GuestEngine) -> None:
    engine._user_limits["u1"] = 3
    assert engine._user_limits["u1"] == 3


# ── Custom command registration ──────────────────────────────────────


@pytest.mark.asyncio
async def test_handle_register_command_without_args(engine: GuestEngine) -> None:
    """인자 없이 등록 명령어를 호출하면 사용법을 반환."""
    ctx = RequestContext(text="등록", chat_id=123, user_id="u1")
    decision = await engine.decide_action(ctx)
    assert decision.action == "reply"
    assert "명령어 등록 사용법" in decision.text


@pytest.mark.asyncio
async def test_handle_register_command_with_name_only(engine: GuestEngine) -> None:
    """명령어 이름만 있고 프롬프트가 없으면 안내 메시지."""
    ctx = RequestContext(text="등록 mycmd", chat_id=123, user_id="u1")
    decision = await engine.decide_action(ctx)
    assert decision.action == "reply"
    assert "프롬프트를 입력" in decision.text


@pytest.mark.asyncio
async def test_handle_register_command_success(engine: GuestEngine) -> None:
    """정상적인 등록 명령어가 성공 메시지를 반환하고 명령어를 등록."""
    ctx = RequestContext(
        text="등록 mycmd You are a helpful assistant that does X",
        chat_id=123, user_id="u1",
    )
    decision = await engine.decide_action(ctx)
    assert decision.action == "reply"
    assert "mycmd" in decision.text
    assert "등록되었습니다" in decision.text
    # 실제로 _commands에 등록되었는지 확인
    assert "mycmd" in engine._commands
    # 커스텀 명령어 이름 목록에 추가되었는지 확인
    assert "mycmd" in engine._custom_command_names


@pytest.mark.asyncio
async def test_register_command_then_execute(engine: GuestEngine) -> None:
    """등록된 커스텀 명령어를 실행할 수 있는지 확인."""
    # 1. 등록
    ctx_reg = RequestContext(
        text="등록 spellcheck Check spelling and fix errors",
        chat_id=123, user_id="u1",
    )
    await engine.decide_action(ctx_reg)
    assert "spellcheck" in engine._commands

    # 2. 실행 (실제 AI 호출 없이, handler가 _commands에 등록되었는지만 확인)
    handler = engine._commands["spellcheck"]
    assert handler is not None
    ctx_exec = RequestContext(
        text="hello", chat_id=123, user_id="u1",
        command="spellcheck",
    )
    # handler를 직접 호출해서 최소한 에러가 나지 않는지 확인
    result = await handler(ctx_exec)
    assert isinstance(result, str)
    assert len(result) > 0


# ── _call_ai ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_call_ai_no_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    """API 키가 없으면 안내 메시지를 반환."""
    monkeypatch.setattr("backend.bot.guest_engine._DEEPSEEK_API_KEY", "")
    result = await _call_ai("test prompt")
    assert "AI 연동 준비 중" in result


@pytest.mark.asyncio
async def test_call_ai_custom_system_prompt(monkeypatch: pytest.MonkeyPatch) -> None:
    """custom system_prompt가 API 요청 body에 전달되는지 검증."""
    monkeypatch.setattr("backend.bot.guest_engine._DEEPSEEK_API_KEY", "sk-test")

    captured_kwargs: dict = {}

    import httpx
    from unittest.mock import MagicMock

    async def fake_post(self, url, **kwargs):
        nonlocal captured_kwargs
        captured_kwargs = kwargs
        resp = httpx.Response(200, json={
            "choices": [{"message": {"content": "Mocked response"}}]
        })
        resp._request = MagicMock()  # raise_for_status()에서 필요
        return resp

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    result = await _call_ai("Translate hello", system_prompt="Custom system prompt")

    assert result == "Mocked response"
    assert captured_kwargs["json"]["messages"][0]["content"] == "Custom system prompt"
    assert captured_kwargs["json"]["messages"][1]["content"] == "Translate hello"
