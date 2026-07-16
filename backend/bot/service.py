"""
Update-handling logic for the Telegram bot.

Bridges Telegram Bot API updates into the existing free-API-key
verification flow (backend/routers/free_api_key.py) *without modifying
that module* — its request DB helpers are imported and reused as-is,
so the request/response contract the frontend already depends on
(src/lib/api_free_api_key.ts) is untouched.
"""

from __future__ import annotations

import logging
from typing import Any

from ..production_config import get_config
from ..routers import free_api_key as fak
from . import db as bot_db
from .telegram_api import TelegramAPIError, TelegramBotClient, is_channel_member_status

logger = logging.getLogger(__name__)

_WELCOME_TEXT = (
    "안녕하세요! TeleMon 봇입니다.\n\n"
    "무료 체험 API 키를 받으려면 채널에 가입한 뒤 아래 버튼을 눌러 인증을 완료해주세요."
)
_VERIFY_BUTTON_TEXT = "채널 가입 확인"


def _client() -> TelegramBotClient | None:
    cfg = get_config().telegram_bot
    if not cfg.bot_token:
        return None
    return TelegramBotClient(cfg.bot_token)


async def notify_admins(text: str, event_type: str = "info") -> None:
    """Best-effort admin notification. Never raises — a failed notify must
    not break the user-facing verification flow."""
    cfg = get_config().telegram_bot
    client = _client()
    if not client or not cfg.admin_chat_ids:
        bot_db.log_admin_notify(event_type, text, delivered=False)
        return

    delivered = False
    for chat_id in cfg.admin_chat_ids:
        try:
            await client.send_message(chat_id, text)
            delivered = True
        except Exception as e:
            logger.warning("Admin notify failed for chat_id=%s: %s", chat_id, e)
    bot_db.log_admin_notify(event_type, text, delivered=delivered)


def _verify_keyboard(token: str) -> dict[str, Any]:
    return {"inline_keyboard": [[{"text": _VERIFY_BUTTON_TEXT, "callback_data": f"verify:{token}"}]]}


async def _handle_start(client: TelegramBotClient, chat_id: int, message: dict[str, Any]) -> None:
    text = message.get("text", "")
    parts = text.split(maxsplit=1)
    token = parts[1].strip() if len(parts) > 1 else ""

    if not token:
        await client.send_message(chat_id, "잘못된 접근입니다. 웹사이트에서 다시 시도해주세요.")
        return

    req = fak._get_request(token)
    if not req:
        await client.send_message(chat_id, "인증 토큰을 찾을 수 없습니다. 웹사이트에서 다시 시도해주세요.")
        return

    from_user = message.get("from", {})
    bot_db.upsert_session(
        chat_id=str(chat_id),
        token=token,
        telegram_user_id=from_user.get("id"),
        telegram_username=from_user.get("username"),
    )

    cfg = get_config().telegram_bot
    channel_note = f"\n\n채널: {cfg.channel_id}" if cfg.channel_id else ""
    await client.send_message(chat_id, _WELCOME_TEXT + channel_note, reply_markup=_verify_keyboard(token))


async def _handle_verify_callback(client: TelegramBotClient, callback_query: dict[str, Any]) -> None:
    callback_id = callback_query["id"]
    data = callback_query.get("data", "")
    chat_id = callback_query.get("message", {}).get("chat", {}).get("id")
    from_user = callback_query.get("from", {})
    user_id = from_user.get("id")

    token = data.split(":", 1)[1] if ":" in data else ""
    cfg = get_config().telegram_bot

    if not token or not cfg.channel_id or not user_id:
        await client.answer_callback_query(callback_id, "설정 오류입니다. 관리자에게 문의해주세요.", show_alert=True)
        return

    try:
        member = await client.get_chat_member(cfg.channel_id, user_id)
        status = member.get("status", "")
    except TelegramAPIError as e:
        logger.warning("getChatMember failed: %s", e)
        await client.answer_callback_query(
            callback_id,
            "채널 상태를 확인할 수 없습니다. 봇이 채널 관리자로 등록되어 있는지 확인해주세요.",
            show_alert=True,
        )
        return

    if not is_channel_member_status(status):
        fak._upsert_request(token, status="unverified", reason="not_channel_member")
        await client.answer_callback_query(callback_id, "아직 채널에 가입하지 않은 것 같습니다.", show_alert=True)
        return

    fak._upsert_request(token, status="verified", reason=None)
    await client.answer_callback_query(callback_id, "인증 완료!")
    if chat_id is not None:
        await client.send_message(chat_id, "채널 가입이 확인되었습니다. 웹사이트로 돌아가 API 키를 발급받으세요.")

    username = from_user.get("username") or str(user_id)
    await notify_admins(f"[TeleMon] 신규 채널 인증 완료: @{username} (token={token[:8]}...)", event_type="verified")


async def handle_update(update: dict[str, Any]) -> None:
    """Entry point called by the webhook route for every incoming Update."""
    client = _client()
    if not client:
        logger.warning("Telegram bot update received but TELEGRAM_BOT_TOKEN is not configured")
        return

    try:
        if "message" in update:
            message = update["message"]
            chat_id = message.get("chat", {}).get("id")
            text = message.get("text", "")
            if chat_id is None:
                return
            if text.startswith("/start"):
                await _handle_start(client, chat_id, message)
            else:
                await client.send_message(chat_id, "웹사이트의 '무료 체험' 버튼을 통해 다시 시작해주세요.")
        elif "callback_query" in update:
            callback_query = update["callback_query"]
            if callback_query.get("data", "").startswith("verify:"):
                await _handle_verify_callback(client, callback_query)
    except Exception:
        logger.exception("Error while handling Telegram update")
