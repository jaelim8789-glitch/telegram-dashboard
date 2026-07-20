"""
AI Employee — 그룹 채팅에서 @TeleMonBot 멘션을 처리하는 엔진.

GuestEngine과 동일한 decide_action()을 재사용하지만, 실행은
answerGuestQuery 대신 sendMessage로 수행합니다.

아키텍처:
  AiEmployee.process_group_message() 
    → GuestEngine.decide_action()  ← 판단 로직 재사용
    → AiEmployee._execute_for_group() ← sendMessage 실행

style_profile_id 를 지원하여 그룹별 응답 스타일을 적용할 수 있습니다.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from .guest_engine import Decision, GuestEngine, RequestContext, _BOT_MENTION_PREFIXES

if TYPE_CHECKING:
    from .telegram_api import TelegramBotClient

logger = logging.getLogger(__name__)


# ── AiEmployee ──────────────────────────────────────────────────────


class AiEmployee:
    """그룹 채팅 AI 어시스턴트.

    GuestEngine의 decide_action()을 재사용하여 명령어 파싱과 핸들러
    디스패치를 수행하고, 실행은 sendMessage()로 합니다.

    Args:
        client: TelegramBotClient 인스턴스.
        guest_engine: 명령어 핸들러와 파싱 로직을 제공할 GuestEngine.
    """

    def __init__(self, client: TelegramBotClient, guest_engine: GuestEngine) -> None:
        self._client = client
        self._guest = guest_engine

    # ── Public API ─────────────────────────────────────────────────

    async def process_group_message(self, update: dict[str, Any]) -> None:
        """그룹 메시지에서 @봇 멘션을 감지하고 처리.

        update는 Telegram Bot API의 message 객체를 포함한 dict입니다.
        GuestEngine.decide_action()을 호출한 후 sendMessage()로 실행합니다.
        """
        message = update.get("message", {})
        text = message.get("text", "").strip()
        chat_id = message.get("chat", {}).get("id")
        user_id = message.get("from", {}).get("id")

        if not text or not chat_id:
            return

        # 1. 봇 멘션 확인
        if not self._is_bot_mentioned(text):
            return

        # 2. 멘션 제거
        clean_text = self._strip_bot_mention(text)
        if not clean_text:
            clean_text = "도움말"

        # 3. 컨텍스트 생성 (style_profile_id 포함)
        context = RequestContext(
            text=clean_text,
            chat_id=chat_id,
            user_id=str(user_id or 0),
            style_profile_id=self._get_style_profile(chat_id),
            available_actions=self._get_available_actions(chat_id),
        )

        # 4. GuestEngine의 decide_action 재사용 (순수 판단)
        decision = await self._guest.decide_action(context)

        # 5. sendMessage로 실행
        await self._execute_for_group(decision, chat_id)

        logger.info(
            "[ai_employee] group %s | user %s | action=%s",
            chat_id, user_id, decision.action,
        )

    # ── 봇 멘션 감지 / 제거 ─────────────────────────────────────────

    @staticmethod
    def _is_bot_mentioned(text: str) -> bool:
        """텍스트가 @TeleMonBot 멘션으로 시작하는지 확인."""
        for prefix in _BOT_MENTION_PREFIXES:
            if text.lower().startswith(prefix.lower()):
                return True
        return False

    @staticmethod
    def _strip_bot_mention(text: str) -> str:
        """텍스트에서 @TeleMonBot 멘션 접두사 제거."""
        for prefix in _BOT_MENTION_PREFIXES:
            if text.lower().startswith(prefix.lower()):
                return text[len(prefix):].strip()
        return text

    # ── 그룹 설정 조회 (확장 포인트) ────────────────────────────────

    def _get_style_profile(self, chat_id: int) -> str | None:
        """그룹의 활성 StyleProfile을 조회.

        TODO: DB에서 해당 그룹의 style_profile_id 조회 구현.
        현재는 None을 반환 (Guest 모드와 동일).
        """
        return None

    def _get_available_actions(self, chat_id: int) -> list[str]:
        """그룹에서 사용 가능한 액션 목록 반환.

        TODO: 그룹별 설정/권한에 따라 필터링 구현.
        """
        return [
            "번역", "translate",
            "요약", "summarize",
            "날씨", "weather",
            "뉴스", "news",
            "도움말", "help",
        ]

    # ── 그룹 메시지 전송 ────────────────────────────────────────────

    async def _execute_for_group(self, decision: Decision, chat_id: int) -> None:
        """Decision을 sendMessage로 실행.

        GuestEngine의 answerGuestQuery와 달리 일반 메시지로 발송합니다.
        rate_limited 결정은 그룹에서 무시됩니다 (그룹 사용자는
        게스트 일일 한도의 영향을 받지 않음).
        """
        if decision.action in ("noop", "rate_limited"):
            logger.debug(
                "[ai_employee] skipping action=%s for chat %s",
                decision.action, chat_id,
            )
            return

        await self._client.send_message(
            chat_id,
            decision.text,
            parse_mode=decision.parse_mode,
            # 그룹 메시지에서는 프로모션 키보드 제거
            reply_markup=None,
        )
