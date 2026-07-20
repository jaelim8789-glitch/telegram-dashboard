"""
Guest Mode Engine — Bot API 10.0+ (May 2026) Guest Mode 처리.

@TeleMonBot 멘션을 받으면:
1. 컨텍스트 생성 (RequestContext)
2. decide_action() 으로 응답 결정 (순수 판단 로직)
3. execute_decision() 으로 Telegram Bot API 전송
4. 방문 기록 DB 저장

아키텍처:
  decide_action(RequestContext) -> Decision    ← 판단과 실행의 분리
  execute_decision(Decision, guest_query_id)   ← Telegram API 호출
  _call_ai(prompt, context) -> str             ← AI 호출 단일 진입점

Guest Bot은 Decision을 answerGuestQuery로 실행합니다.
AI Employee는 같은 decide_action 호출 후 sendMessage/예약발송 등
다른 방식으로 실행할 수 있습니다 — 판단 로직 자체는 재사용.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Callable, Coroutine

import httpx

if TYPE_CHECKING:
    from .telegram_api import TelegramBotClient

logger = logging.getLogger(__name__)

# ── AI 설정 ──────────────────────────────────────────────────────────

_DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
_DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"
_DEEPSEEK_MODEL = "deepseek-chat"


# ── 컨텍스트 / 결정 자료구조 ─────────────────────────────────────────


@dataclass
class RequestContext:
    """요청 컨텍스트 — 확장 가능한 입력 객체.

    Guest Bot은 style_profile_id=None, 액션 종류 고정으로 채웁니다.
    AI Employee는 그룹의 StyleProfile과 더 넓은 액션 메뉴를 채워넣습니다.

    Attributes:
        text: 핸들러에 전달된 텍스트 (명령어 파싱 후 args 부분).
        chat_id: 요청이 발생한 채팅 ID.
        user_id: 요청한 사용자 ID (문자열).
        style_profile_id: AI 응답 스타일 프로필 ID (Guest는 None).
        available_actions: 사용 가능한 액션 목록.
        command: 파싱된 명령어 이름 (내부 라우팅용).
    """

    text: str
    chat_id: int | None
    user_id: str
    style_profile_id: str | None = None
    available_actions: list[str] | None = None
    # ── 내부 라우팅용 ────────────────────────────────────────────────
    command: str = ""

    def __post_init__(self) -> None:
        if self.available_actions is None:
            self.available_actions = [
                "번역", "translate",
                "요약", "summarize",
                "날씨", "weather",
                "뉴스", "news",
                "도움말", "help",
                "시작", "start",
            ]


@dataclass
class Decision:
    """순수 판단 결과 — '무엇을 할지'만 결정, 실행 방법은 포함하지 않음.

    execute_decision()이 action 타입에 따라 적절한 Telegram API를 호출합니다.

    Attributes:
        action: 응답 유형 ("reply" | "rate_limited" | "error" | "noop").
        text: 응답 텍스트.
        parse_mode: Telegram parse_mode (기본 "Markdown").
        reply_markup: 인라인 키보드 등.
    """

    action: str  # "reply" | "rate_limited" | "error" | "noop"
    text: str
    parse_mode: str | None = "Markdown"
    reply_markup: dict[str, Any] | None = None


# ── AI 호출 단일 진입점 ──────────────────────────────────────────────


async def _call_ai(prompt: str, context: RequestContext | None = None) -> str:
    """DeepSeek (또는 다른 LLM)을 호출하고 응답 텍스트를 반환.

    이 함수가 이 모듈의 유일한 AI 호출 지점입니다.
    나중에 AI Employee가 추가될 때 이 함수 하나만 교체/확장하면 됩니다.

    현재 구현: DEEPSEEK_API_KEY 환경변수가 설정되어 있으면 실제 API 호출,
    없으면 안내 메시지를 반환합니다.
    """
    if not _DEEPSEEK_API_KEY:
        return "⏳ AI 연동 준비 중입니다. 곧 사용할 수 있어요!"

    system_prompt = (
        "You are TeleMon AI, a helpful Telegram assistant. "
        "Respond in Korean unless the user wrote in another language. "
        "Keep responses concise and friendly."
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt},
    ]

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                _DEEPSEEK_API_URL,
                headers={
                    "Authorization": f"Bearer {_DEEPSEEK_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": _DEEPSEEK_MODEL,
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 1024,
                },
            )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]
    except Exception:
        logger.exception("[ai] DeepSeek API call failed")
        return "⚠️ AI 응답 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."


# ── 도움말 텍스트 ───────────────────────────────────────────────────

GUEST_HELP_TEXT = """🤖 **TeleMon AI 비서**

저를 @멘션하면 언제든지 도와드려요:

• `@TeleMonBot 번역 [텍스트]` — 영어↔한국어 번역
• `@TeleMonBot 요약 [텍스트]` — 긴 글 요약
• `@TeleMonBot 날씨 [도시]` — 날씨 정보
• `@TeleMonBot 뉴스 [주제]` — 최신 뉴스 요약
• `@TeleMonBot 도움말` — 이 메시지 표시

💡 **TeleMon의 모든 기능을 사용해보세요**
👉 자동 응답 / 예약 발송 / AI 채팅 / 채널 분석
👉 **telemon.online** 에서 무료로 시작!"""


# ── 공통 프로모션 키보드 ──────────────────────────────────────────────

_PROMO_REPLY_MARKUP: dict[str, Any] = {
    "inline_keyboard": [[
        {"text": "🚀 TeleMon에서 더 많은 기능 사용하기", "url": "https://telemon.online"}
    ]],
}

_LIMIT_REPLY_MARKUP: dict[str, Any] = {
    "inline_keyboard": [[
        {"text": "🚀 TeleMon 시작하기", "url": "https://telemon.online"}
    ]],
}


# ── 핸들러 타입 ─────────────────────────────────────────────────────

GuestHandler = Callable[["RequestContext"], Coroutine[Any, Any, str]]
"""Signature: (context: RequestContext) -> response_text"""


# ── GuestEngine ─────────────────────────────────────────────────────


class GuestEngine:
    """Guest Mode 요청을 처리하는 엔진.

    Thread-safe 하게 설계: _daily_usage 는 int 증가만 하므로
    GIL 아래에서 별도 Lock 없이 안전합니다.
    """

    def __init__(
        self,
        client: TelegramBotClient,
        daily_limit: int = 20,
    ) -> None:
        self._client = client
        self._daily_limit = daily_limit

        # user_id -> today_count (in-memory, 서버 재시작 시 리셋)
        self._daily_usage: dict[str, int] = {}
        # user_id -> per-user limit override (None = use global daily_limit)
        self._user_limits: dict[str, int] = {}
        # 오늘 날짜 캐시 (자정에 자동 리셋)
        self._today = datetime.now(timezone.utc).date()

        # 등록된 명령어 핸들러
        self._commands: dict[str, GuestHandler] = {
            "번역": self._handle_translate,
            "translate": self._handle_translate,
            "요약": self._handle_summarize,
            "summarize": self._handle_summarize,
            "날씨": self._handle_weather,
            "weather": self._handle_weather,
            "뉴스": self._handle_news,
            "news": self._handle_news,
            "help": self._handle_help,
            "도움말": self._handle_help,
            "시작": self._handle_start,
            "start": self._handle_start,
        }

        # ————————

    # ── Public API ─────────────────────────────────────────────────

    @property
    def daily_limit(self) -> int:
        return self._daily_limit

    @daily_limit.setter
    def daily_limit(self, value: int) -> None:
        self._daily_limit = max(1, value)

    @property
    def daily_usage_snapshot(self) -> dict[str, int]:
        """오늘의 사용량 스냅샷 (읽기 전용 복사본)."""
        self._rotate_date()
        return dict(self._daily_usage)

    @property
    def unique_users_today(self) -> int:
        self._rotate_date()
        return len(self._daily_usage)

    @property
    def total_requests_today(self) -> int:
        self._rotate_date()
        return sum(self._daily_usage.values())

    # ── Core handler ───────────────────────────────────────────────

    async def handle_guest_message(self, update: dict[str, Any]) -> None:
        """Process a single guest_message update from Telegram.

        This is the main entry point called by bot/service.py.
        Extracts the update fields, builds context, then delegates to
        decide_action() + execute_decision().
        """
        guest_msg = update.get("guest_message", {})
        guest_query_id = guest_msg.get("guest_query_id", "")
        raw_text = guest_msg.get("text", "").strip()
        chat_id = guest_msg.get("chat_id")
        user_id = guest_msg.get("user_id")
        user_id_str = str(user_id) if user_id else "0"

        if not guest_query_id or not raw_text:
            logger.warning("Guest update missing guest_query_id or text")
            return

        # 1. Build context & decide action (pure judgment)
        context = RequestContext(
            text=raw_text,
            chat_id=chat_id,
            user_id=user_id_str,
        )
        decision = await self.decide_action(context)

        # 2. Execute decision via Telegram Bot API
        await self.execute_decision(decision, guest_query_id)

        # 3. Track usage only for successful replies
        if decision.action == "reply":
            self._rotate_date()
            current_usage = self._daily_usage.get(user_id_str, 0)
            self._daily_usage[user_id_str] = current_usage + 1
            effective_limit = self._user_limits.get(user_id_str, self._daily_limit)
            logger.info(
                "[guest] %s used (usage: %d/%d, action=%s)",
                user_id_str, current_usage + 1, effective_limit, decision.action,
            )

    # ── 판단(Decide) — 순수 로직, API 호출 없음 ──────────────────────

    async def decide_action(self, context: RequestContext) -> Decision:
        """순수 판단 로직 — 컨텍스트를 바탕으로 뭘 할지만 결정.

        이 메서드는 Telegram API를 전혀 호출하지 않습니다.
        반환된 Decision은 execute_decision()으로 실행됩니다.

        AI Employee가 그룹 메시지에 대해 이 메서드를 호출하면
        같은 판단 로직을 재사용할 수 있습니다.
        """
        self._rotate_date()

        # 1. 일일 한도 체크
        current_usage = self._daily_usage.get(context.user_id, 0)
        effective_limit = self._user_limits.get(context.user_id, self._daily_limit)
        if current_usage >= effective_limit:
            logger.info(
                "[guest] user %s hit daily limit (%d)",
                context.user_id, effective_limit,
            )
            return Decision(
                action="rate_limited",
                text=(
                    f"⚠️ 오늘의 무료 사용 한도({effective_limit}회)를 모두 사용했습니다.\n\n"
                    f"🚀 **TeleMon 프리미엄**으로 업그레이드하면 무제한으로 이용할 수 있어요!\n"
                    f"👉 telemon.online"
                ),
                reply_markup=_LIMIT_REPLY_MARKUP,
            )

        # 2. 명령어 파싱
        command, args = self._parse_command(context.text)

        # 3. 적절한 핸들러 찾기
        handler = self._commands.get(command.lower(), self._handle_fallback)

        # 4. 핸들러 전용 컨텍스트 생성 (text = args, command = 파싱된 명령어)
        handler_context = RequestContext(
            text=args,
            chat_id=context.chat_id,
            user_id=context.user_id,
            style_profile_id=context.style_profile_id,
            available_actions=context.available_actions,
            command=command,
        )

        # 5. 응답 생성
        try:
            response_text = await handler(handler_context)
        except Exception:
            logger.exception(
                "[guest] response generation failed for user %s", context.user_id,
            )
            response_text = (
                "⚠️ 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.\n\n"
                f"💡 telemon.online 에서 더 많은 기능을 이용할 수 있어요!"
            )

        return Decision(
            action="reply",
            text=response_text,
            reply_markup=_PROMO_REPLY_MARKUP,
        )

    # ── 실행(Execute) — Decision을 Telegram API로 전송 ──────────────

    async def execute_decision(self, decision: Decision, guest_query_id: str) -> None:
        """Decision을 Telegram Bot API로 실행.

        현재는 answerGuestQuery()로 응답합니다.
        AI Employee 도입 시 이 메서드를 확장하여 sendMessage/예약발송
        등 다른 실행 방식을 지원할 수 있습니다.
        """
        if decision.action == "noop":
            return

        await self._client.answer_guest_query(
            guest_query_id,
            decision.text,
            parse_mode=decision.parse_mode,
            reply_markup=decision.reply_markup,
        )

    # ── Command parsing ────────────────────────────────────────────

    def _parse_command(self, raw_text: str) -> tuple[str, str]:
        """@멘션 제거 + 첫 단어를 명령어로 분리.

        "@TeleMonBot 번역 Hello World" -> ("번역", "Hello World")
        "번역 Hello World"              -> ("번역", "Hello World")
        "@TeleMonBot"                   -> ("도움말", "")
        """
        text = raw_text.strip()

        # @멘션 접두사 제거 (대소문자 무시)
        for prefix in ["@TeleMonBot", "@telemonbot", "@telemon_bot", "@TeleMon_Bot"]:
            if text.lower().startswith(prefix.lower()):
                text = text[len(prefix):].strip()
                break

        if not text:
            return "도움말", ""

        parts = text.split(maxsplit=1)
        command = parts[0].strip()
        args = parts[1].strip() if len(parts) > 1 else ""
        return command, args

    # ── Individual command handlers ────────────────────────────────

    async def _handle_translate(self, context: RequestContext) -> str:
        if not context.text:
            return (
                "📝 **번역 사용법**\n\n"
                f"`@TeleMonBot 번역 [텍스트]`\n\n"
                f"예시: `@TeleMonBot 번역 Hello World`\n"
                f"예시: `@TeleMonBot translate 안녕하세요`"
            )
        # TODO: AI 번역 연동
        return (
            f"🌐 **번역 결과**\n\n"
            f"```\n{context.text}\n```\n\n"
            f"⏳ AI 번역 엔진 연동 예정입니다.\n"
            f"💡 TeleMon에서 더 많은 AI 기능을 이용하세요!"
        )

    async def _handle_summarize(self, context: RequestContext) -> str:
        if not context.text:
            return (
                "📝 **요약 사용법**\n\n"
                f"`@TeleMonBot 요약 [긴 텍스트]`\n\n"
                f"예시: `@TeleMonBot 요약 오늘 회의에서는 ...`"
            )
        if len(context.text) < 20:
            return "📋 요약할 텍스트가 너무 짧습니다. 더 긴 텍스트를 입력해주세요."

        preview = context.text[:100] + "..." if len(context.text) > 100 else context.text
        return (
            f"📋 **요약 결과**\n\n"
            f"{preview}\n\n"
            f"📊 원문 길이: {len(context.text)}자\n\n"
            f"⏳ AI 요약 엔진 연동 예정입니다."
        )

    async def _handle_weather(self, context: RequestContext) -> str:
        if not context.text:
            return (
                "🌤️ **날씨 사용법**\n\n"
                f"`@TeleMonBot 날씨 [도시명]`\n\n"
                f"예시: `@TeleMonBot 날씨 서울`\n"
                f"예시: `@TeleMonBot weather London`"
            )
        # TODO: OpenWeatherMap / WeatherAPI 연동
        return (
            f"🌤️ **{context.text} 날씨**\n\n"
            f"현재: ⛅ 구름 조금\n"
            f"온도: 22°C (체감 20°C)\n"
            f"습도: 65%\n"
            f"풍속: 3.2m/s\n\n"
            f"⏳ 날씨 API 연동 예정입니다."
        )

    async def _handle_news(self, context: RequestContext) -> str:
        topic = context.text or "종합"
        # TODO: 뉴스 API 연동
        return (
            f"📰 **{topic} 뉴스**\n\n"
            f"⏳ 뉴스 API 연동 예정입니다.\n\n"
            f"💡 telemon.online 에서 더 많은 뉴스를 확인하세요!"
        )

    async def _handle_help(self, context: RequestContext) -> str:
        return GUEST_HELP_TEXT

    async def _handle_start(self, context: RequestContext) -> str:
        return (
            "👋 **TeleMon AI 비서입니다!**\n\n"
            "저를 @멘션하면 언제든지:\n"
            "• 🌐 **번역** — 실시간 언어 번역\n"
            "• 📋 **요약** — 긴 글 핵심 요약\n"
            "• 🌤️ **날씨** — 전세계 날씨 정보\n"
            "• 📰 **뉴스** — 최신 뉴스 요약\n\n"
            "을 도와드립니다.\n\n"
            "💡 **TeleMon의 모든 기능**을 사용하려면\n"
            f"👉 telemon.online 에서 가입하세요!"
        )

    async def _handle_fallback(self, context: RequestContext) -> str:
        """등록되지 않은 명령어에 대한 fallback."""
        bad = context.command or (context.text.split()[0] if context.text else "알 수 없는")
        return (
            f"🤔 죄송합니다. '{bad}' 명령어를 이해하지 못했어요.\n\n"
            f"사용 가능한 명령어:\n"
            f"• `@TeleMonBot 번역 [텍스트]`\n"
            f"• `@TeleMonBot 요약 [텍스트]`\n"
            f"• `@TeleMonBot 날씨 [도시]`\n"
            f"• `@TeleMonBot 뉴스 [주제]`\n"
            f"• `@TeleMonBot 도움말`\n\n"
            f"💡 telemon.online 에서 더 많은 기능을!"
        )

    # ── Daily usage rotation ───────────────────────────────────────

    def _rotate_date(self) -> None:
        """날짜가 변경되었으면 daily_usage 를 리셋."""
        today = datetime.now(timezone.utc).date()
        if today != self._today:
            self._daily_usage.clear()
            self._today = today
