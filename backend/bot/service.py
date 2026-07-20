"""
Update-handling logic for the Telegram bot.

Bridges Telegram Bot API updates into the existing free-API-key
verification flow (backend/routers/free_api_key.py) *without modifying
that module* — its request DB helpers are imported and reused as-is,
so the request/response contract the frontend already depends on
(src/lib/api_free_api_key.ts) is untouched.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from ..admin_platform import AdminPlatform, AuditAction
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


# ── Stars Payment Helpers ────────────────────────────────────────────

_STAR_PRODUCTS: dict[str, dict[str, Any]] = {
    "pro_monthly": {"title": "Pro 월간 구독", "star_amount": 1500, "plan": "pro", "period_days": 30, "label": "Pro", "ai_calls": None},
    "pro_yearly": {"title": "Pro 연간 구독 (20% 할인)", "star_amount": 12000, "plan": "pro", "period_days": 365, "label": "Pro 연간", "ai_calls": None},
    "team_monthly": {"title": "Team 월간 구독", "star_amount": 4500, "plan": "team", "period_days": 30, "label": "Team", "ai_calls": None},
    "ai_boost_1000": {"title": "AI Boost — 1,000회", "star_amount": 300, "plan": None, "period_days": None, "label": "AI Boost", "ai_calls": 1000},
    "ai_boost_5000": {"title": "AI Boost — 5,000회 (20% 할인)", "star_amount": 1200, "plan": None, "period_days": None, "label": "AI Boost+", "ai_calls": 5000},
}


async def _handle_pre_checkout_query(client: TelegramBotClient, query: dict[str, Any]) -> None:
    """Handle pre_checkout_query from Telegram Stars payment."""
    query_id = query.get("id")
    payload_str = query.get("invoice_payload", "{}")
    try:
        payload = json.loads(payload_str)
        product_id = payload.get("pid")
        if product_id not in _STAR_PRODUCTS:
            logger.warning("[stars] invalid product in payload: %s", product_id)
            await client.answer_pre_checkout_query(query_id, ok=False, error_message="Invalid product.")
            return
        await client.answer_pre_checkout_query(query_id, ok=True)
        logger.info("[stars] pre_checkout_query approved: %s", product_id)
    except Exception as e:
        logger.error("[stars] pre_checkout_query error: %s", e)
        try:
            await client.answer_pre_checkout_query(query_id, ok=False, error_message="Processing error.")
        except Exception:
            pass


async def _handle_successful_payment(client: TelegramBotClient, message: dict[str, Any]) -> None:
    """Handle successful_payment from Telegram Stars."""
    payment = message.get("successful_payment", {})
    payload_str = payment.get("invoice_payload", "{}")
    telegram_charge_id = payment.get("telegram_payment_charge_id", "")
    stars_amount = payment.get("total_amount", 0)

    try:
        payload = json.loads(payload_str)
        product_id = payload.get("pid")
        user_id = payload.get("uid")
        if not product_id or not user_id:
            logger.warning("[stars] incomplete payment payload: %s", payload_str)
            return

        product = _STAR_PRODUCTS.get(product_id)
        if not product:
            logger.warning("[stars] unknown product: %s", product_id)
            return

        admin = AdminPlatform.get_instance()

        if product.get("plan") and product.get("period_days"):
            admin.change_plan(user_id, product["plan"])
            admin.create_subscription(user_id=user_id, plan=product["plan"])
            admin._audit(
                user_id, "stars_payment", AuditAction.PAYMENT_SUCCEEDED,
                "subscription", user_id,
                {"product": product_id, "plan": product["plan"], "stars": stars_amount, "charge_id": telegram_charge_id},
            )
            logger.info("[stars] payment: user=%s → %s (%d Stars)", user_id, product["plan"], stars_amount)
        elif product.get("ai_calls"):
            admin.record_usage(user_id=user_id, api_calls=0)
            admin._audit(
                user_id, "stars_payment", AuditAction.PAYMENT_SUCCEEDED,
                "ai_boost", user_id,
                {"product": product_id, "ai_calls": product["ai_calls"], "stars": stars_amount},
            )
            logger.info("[stars] ai_boost: user=%s +%d calls", user_id, product["ai_calls"])

        admin.create_invoice(user_id=user_id, amount_cents=stars_amount * 100, stripe_invoice_id=telegram_charge_id)
    except Exception as e:
        logger.error("[stars] successful_payment error: %s", e)


# ── Main Update Handler ───────────────────────────────────────────────


async def handle_update(update: dict[str, Any]) -> None:
    """Entry point called by the webhook route for every incoming Update.

    Handles:
    - /start command → free API key flow
    - callback_query (verify) → channel membership verification
    - pre_checkout_query → Stars payment pre-checkout
    - message.successful_payment → Stars payment completion
    """
    client = _client()
    if not client:
        logger.warning("Telegram bot update received but TELEGRAM_BOT_TOKEN is not configured")
        return

    try:
        if "message" in update:
            message = update["message"]
            chat_id = message.get("chat", {}).get("id")
            text = message.get("text", "")

            # successful_payment 처리 (message 객체 안에 있음)
            if "successful_payment" in message:
                await _handle_successful_payment(client, message)
                return

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
        elif "pre_checkout_query" in update:
            await _handle_pre_checkout_query(client, update["pre_checkout_query"])
    except Exception:
        logger.exception("Error while handling Telegram update")
