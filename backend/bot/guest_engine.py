"""
Guest Mode Engine — Bot API 10.0+ (May 2026) Guest Mode 처리.

@TeleMonBot 멘션을 받으면:
1. 명령어 파싱 (번역/요약/날씨/뉴스/도움말)
2. 일일 무료 사용 한도 체크
3. AI 응답 생성 (또는 기본 응답)
4. answerGuestQuery() 로 응답
5. 방문 기록 DB 저장

이 모듈은 Telethon을 전혀 사용하지 않으며, Bot API 전용입니다.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Callable, Coroutine

from .telegram_api import TelegramBotClient

logger = logging.getLogger(__name__)

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


# ── 핸들러 타입 ─────────────────────────────────────────────────────

GuestHandler = Callable[[str, str, int | None], Coroutine[Any, Any, str]]
"""Signature: (args, user_id, chat_id) -> response_text"""


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

        # 날짜 변경 시 usage 리셋
        self._rotate_date()

        # 1. 일일 한도 체크 — 한도를 넘으면 업그레이드 유도 메시지
        current_usage = self._daily_usage.get(user_id_str, 0)
        if current_usage >= self._daily_limit:
            logger.info("[guest] user %s hit daily limit (%d)", user_id_str, self._daily_limit)
            await self._client.answer_guest_query(
                guest_query_id,
                f"⚠️ 오늘의 무료 사용 한도({self._daily_limit}회)를 모두 사용했습니다.\n\n"
                f"🚀 **TeleMon 프리미엄**으로 업그레이드하면 무제한으로 이용할 수 있어요!\n"
                f"👉 telemon.online",
                parse_mode="Markdown",
                reply_markup={
                    "inline_keyboard": [[
                        {"text": "🚀 TeleMon 시작하기", "url": "https://telemon.online"}
                    ]]
                },
            )
            return

        # 2. 명령어 파싱
        command, args = self._parse_command(raw_text)

        # 3. 응답 생성 (실패 시 fallback 메시지)
        try:
            response_text = await self._generate_response(
                command, args, user_id_str, chat_id
            )
        except Exception:
            logger.exception("[guest] response generation failed for user %s", user_id_str)
            response_text = (
                "⚠️ 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.\n\n"
                f"💡 telemon.online 에서 더 많은 기능을 이용할 수 있어요!"
            )

        # 4. answerGuestQuery 로 응답 (그룹에서 멘션한 사람만 볼 수 있음)
        await self._client.answer_guest_query(
            guest_query_id,
            response_text,
            parse_mode="Markdown",
            reply_markup={
                "inline_keyboard": [[
                    {"text": "🚀 TeleMon에서 더 많은 기능 사용하기", "url": "https://telemon.online"}
                ]]
            },
        )

        # 5. 사용량 증가
        self._daily_usage[user_id_str] = current_usage + 1

        logger.info(
            "[guest] %s used '%s' (usage: %d/%d)",
            user_id_str, command, current_usage + 1, self._daily_limit,
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

    # ── Response generation ────────────────────────────────────────

    async def _generate_response(
        self,
        command: str,
        args: str,
        user_id: str,
        chat_id: int | None,
    ) -> str:
        """명령어에 맞는 핸들러를 찾아 실행."""
        handler = self._commands.get(command.lower(), self._handle_fallback)
        if handler is self._handle_fallback:
            return await self._handle_fallback(args, user_id, chat_id, original_command=command)
        return await handler(args, user_id, chat_id)

    # ── Individual command handlers ────────────────────────────────

    async def _handle_translate(
        self, args: str, user_id: str, chat_id: int | None
    ) -> str:
        if not args:
            return (
                "📝 **번역 사용법**\n\n"
                f"`@TeleMonBot 번역 [텍스트]`\n\n"
                f"예시: `@TeleMonBot 번역 Hello World`\n"
                f"예시: `@TeleMonBot translate 안녕하세요`"
            )
        # TODO: 실제 AI 번역 API 연동 (DeepSeek / Google Translate)
        return (
            f"🌐 **번역 결과**\n\n"
            f"```\n{args}\n```\n\n"
            f"⏳ AI 번역 엔진 연동 예정입니다.\n"
            f"💡 TeleMon에서 더 많은 AI 기능을 이용하세요!"
        )

    async def _handle_summarize(
        self, args: str, user_id: str, chat_id: int | None
    ) -> str:
        if not args:
            return (
                "📝 **요약 사용법**\n\n"
                f"`@TeleMonBot 요약 [긴 텍스트]`\n\n"
                f"예시: `@TeleMonBot 요약 오늘 회의에서는 ...`"
            )
        if len(args) < 20:
            return "📋 요약할 텍스트가 너무 짧습니다. 더 긴 텍스트를 입력해주세요."

        preview = args[:100] + "..." if len(args) > 100 else args
        return (
            f"📋 **요약 결과**\n\n"
            f"{preview}\n\n"
            f"📊 원문 길이: {len(args)}자\n\n"
            f"⏳ AI 요약 엔진 연동 예정입니다."
        )

    async def _handle_weather(
        self, args: str, user_id: str, chat_id: int | None
    ) -> str:
        if not args:
            return (
                "🌤️ **날씨 사용법**\n\n"
                f"`@TeleMonBot 날씨 [도시명]`\n\n"
                f"예시: `@TeleMonBot 날씨 서울`\n"
                f"예시: `@TeleMonBot weather London`"
            )
        # TODO: OpenWeatherMap / WeatherAPI 연동
        return (
            f"🌤️ **{args} 날씨**\n\n"
            f"현재: ⛅ 구름 조금\n"
            f"온도: 22°C (체감 20°C)\n"
            f"습도: 65%\n"
            f"풍속: 3.2m/s\n\n"
            f"⏳ 날씨 API 연동 예정입니다."
        )

    async def _handle_news(
        self, args: str, user_id: str, chat_id: int | None
    ) -> str:
        if not args:
            args = "종합"
        # TODO: 뉴스 API 연동
        return (
            f"📰 **{args} 뉴스**\n\n"
            f"⏳ 뉴스 API 연동 예정입니다.\n\n"
            f"💡 telemon.online 에서 더 많은 뉴스를 확인하세요!"
        )

    async def _handle_help(
        self, args: str, user_id: str, chat_id: int | None
    ) -> str:
        return GUEST_HELP_TEXT

    async def _handle_start(
        self, args: str, user_id: str, chat_id: int | None
    ) -> str:
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

    async def _handle_fallback(
        self, args: str, user_id: str, chat_id: int | None,
        original_command: str = "",
    ) -> str:
        """등록되지 않은 명령어에 대한 fallback."""
        bad = original_command or (args.split()[0] if args else "알 수 없는")
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
