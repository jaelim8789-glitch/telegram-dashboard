"""
Telegram Bot Module — webhook endpoint for the Bot API integration.

Endpoints:
  POST /api/bot/webhook       — Telegram sends updates here (secret-token verified)
  GET  /api/bot/status        — admin-only: bot configuration + webhook health
  POST /api/bot/notify-test   — admin-only: send a test message to configured admin chats

This router is intentionally isolated from accounts/broadcast/auto_reply/
reply_macro — it only talks to the Bot API and the free_api_key request table.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Header, HTTPException, Request

from ..auth_middleware import require_admin_user
from ..production_config import get_config
from ..bot import db as bot_db
from ..bot import service as bot_service
from ..bot.telegram_api import TelegramBotClient
from ..routers import free_api_key as fak

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/bot", tags=["telegram-bot"])


@router.post("/webhook")
async def telegram_webhook(
    request: Request,
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
):
    cfg = get_config().telegram_bot

    if not cfg.webhook_secret:
        raise HTTPException(status_code=503, detail="Webhook secret not configured")

    if x_telegram_bot_api_secret_token != cfg.webhook_secret:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")

    fak._init_db()
    bot_db.init_bot_tables()

    update = await request.json()
    await bot_service.handle_update(update)
    return {"ok": True}


@router.get("/status")
async def bot_status(_user: dict = Depends(require_admin_user)):
    cfg = get_config().telegram_bot
    result = {
        "configured": cfg.is_configured(),
        "channel_id": cfg.channel_id or None,
        "admin_chat_ids_count": len(cfg.admin_chat_ids),
        "webhook_secret_set": bool(cfg.webhook_secret),
    }
    if cfg.bot_token:
        try:
            client = TelegramBotClient(cfg.bot_token)
            info = await client.get_webhook_info()
            result["webhook_info"] = info
        except Exception as e:
            result["webhook_info_error"] = str(e)
    return result


@router.post("/notify-test")
async def notify_test(_user: dict = Depends(require_admin_user)):
    bot_db.init_bot_tables()
    cfg = get_config().telegram_bot
    if not cfg.is_configured():
        raise HTTPException(status_code=400, detail="TELEGRAM_BOT_TOKEN / TELEGRAM_CHANNEL_ID not configured")
    if not cfg.admin_chat_ids:
        raise HTTPException(status_code=400, detail="TELEGRAM_ADMIN_CHAT_IDS not configured")

    await bot_service.notify_admins("[TeleMon] 관리자 알림 테스트 메시지입니다.", event_type="test")
    return {"sent": True, "admin_chat_ids_count": len(cfg.admin_chat_ids)}
