"""
Telegram Stars Payment Router — 텔레그램 네이티브 결제 시스템.

Bot API의 sendInvoice + pre_checkout_query + successful_payment 를 사용하여
Telegram Stars (currency XTR) 로 프리미엄 기능을 결제받습니다.

사용 플로우:
1. 프론트: 사용자가 요금제 선택 → POST /api/stars/create-invoice
2. 백엔드: sendInvoice(currency="XTR") 호출 → Telegram이 결제 UI 표시
3. 텔레그램: pre_checkout_query → 백엔드 검증 → answerPreCheckoutQuery
4. 텔레그램: successful_payment → 백엔드에서 사용자 플랜 업그레이드
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request

from ..admin_platform import AdminPlatform, Plan, AuditAction
from ..auth_middleware import get_current_user, require_admin_user
from ..bot.telegram_api import TelegramBotClient
from ..production_config import get_config

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/stars", tags=["stars-payments"])

# ── Stars 가격표 ───────────────────────────────────────────────────
# 1 Star ≈ ₩100~₩150 (텔레그램 Stars 구매 가격 기준)

STAR_PRODUCTS: dict[str, dict[str, Any]] = {
    "pro_monthly": {
        "title": "Pro 월간 구독",
        "description": "• 10개 계정\n• 일 5,000회 발송\n• AI 분석\n• 우선 지원",
        "star_amount": 1500,        # ≈ ₩15,000
        "plan": Plan.PRO,
        "period_days": 30,
        "label": "Pro",
    },
    "pro_yearly": {
        "title": "Pro 연간 구독 (20% 할인)",
        "description": "• 10개 계정\n• 일 5,000회 발송\n• AI 분석\n• 우선 지원\n• 월 ₩12,000 상당 (20% 할인)",
        "star_amount": 12000,       # ≈ ₩120,000 (월 ₩10,000)
        "plan": Plan.PRO,
        "period_days": 365,
        "label": "Pro 연간",
    },
    "team_monthly": {
        "title": "Team 월간 구독",
        "description": "• 50개 계정\n• 일 50,000회 발송\n• 모든 AI 기능\n• 팀 협업\n• 우선 지원",
        "star_amount": 4500,        # ≈ ₩45,000
        "plan": Plan.TEAM,
        "period_days": 30,
        "label": "Team",
    },
    "ai_boost_1000": {
        "title": "AI Boost — 1,000회 추가",
        "description": "AI 추가 호출 1,000회 (기간 제한 없음)",
        "star_amount": 300,         # ≈ ₩3,000
        "plan": None,               # 플랜 변경 없음
        "period_days": None,
        "ai_calls": 1000,
        "label": "AI Boost",
    },
    "ai_boost_5000": {
        "title": "AI Boost — 5,000회 추가 (20% 할인)",
        "description": "AI 추가 호출 5,000회 (기간 제한 없음, 20% 할인)",
        "star_amount": 1200,        # ≈ ₩12,000
        "plan": None,
        "period_days": None,
        "ai_calls": 5000,
        "label": "AI Boost+",
    },
}


def _get_bot_client() -> TelegramBotClient | None:
    """Get Bot API client for sendInvoice calls."""
    cfg = get_config().telegram_bot
    if not cfg.bot_token:
        return None
    return TelegramBotClient(cfg.bot_token)


@router.get("/products")
async def list_products():
    """Stars 결제 가능한 상품 목록 반환 (인증 불필요)."""
    products = []
    for pid, p in STAR_PRODUCTS.items():
        products.append({
            "id": pid,
            "title": p["title"],
            "description": p["description"],
            "star_amount": p["star_amount"],
            "plan": p.get("plan"),
            "period_days": p.get("period_days"),
            "ai_calls": p.get("ai_calls"),
            "label": p.get("label", ""),
        })
    return {"products": products}


@router.post("/create-invoice")
async def create_invoice(
    product_id: str,
    user: dict = Depends(get_current_user),
):
    """사용자의 Telegram 계정으로 Stars Invoice 전송.

    프론트에서 호출 → 텔레그램 Bot API sendInvoice 실행
    → 사용자에게 Telegram 결제 UI 표시
    """
    product = STAR_PRODUCTS.get(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    client = _get_bot_client()
    if not client:
        raise HTTPException(status_code=503, detail="Telegram bot not configured")

    # 사용자의 Telegram Chat ID가 필요 — Free API Key 세션에서 조회
    telegram_chat_id = await _resolve_telegram_chat(user)
    if not telegram_chat_id:
        raise HTTPException(
            status_code=400,
            detail="Telegram chat ID not found. Connect your Telegram account first.",
        )

    # 고유 invoice payload 생성 (결제 완료 시 이 payload로 상품 식별)
    payload_id = str(uuid.uuid4())
    invoice_payload = json.dumps({
        "pid": product_id,
        "uid": user["id"],
        "iid": payload_id,
    })

    try:
        result = await client._call("sendInvoice", {
            "chat_id": telegram_chat_id,
            "title": product["title"],
            "description": product["description"],
            "payload": invoice_payload,
            "provider_token": "",  # 빈 문자열 = Telegram Stars
            "currency": "XTR",     # Telegram Stars
            "prices": [{
                "label": product.get("label", product_id),
                "amount": product["star_amount"],
            }],
            # 구독형 상품은 max_tip_amount 없이 일반 결제
        })

        logger.info(
            "[stars] invoice sent: user=%s product=%s stars=%d",
            user["id"], product_id, product["star_amount"],
        )

        return {
            "ok": True,
            "invoice_id": result.get("id"),
            "product_id": product_id,
            "star_amount": product["star_amount"],
        }

    except Exception as e:
        logger.error("[stars] sendInvoice failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to create invoice: {e}")


@router.post("/webhook")
async def stars_webhook(request: Request):
    """Telegram Bot API Webhook — pre_checkout_query + successful_payment 처리.

    Bot API가 결제 관련 업데이트를 이 엔드포인트로 전송합니다.
    (기존 webhook과 동일한 경로로 들어오지만, 여기서는 결제만 처리)
    """
    update = await request.json()
    logger.debug("[stars] webhook update: %s", list(update.keys()))

    # ── pre_checkout_query 처리 ─────────────────────────────────────
    if "pre_checkout_query" in update:
        query = update["pre_checkout_query"]
        query_id = query.get("id")
        payload_str = query.get("invoice_payload", "{}")

        try:
            payload = json.loads(payload_str)
            product_id = payload.get("pid")
            user_id = payload.get("uid")

            # 상품 유효성 검증
            if product_id not in STAR_PRODUCTS:
                logger.warning("[stars] invalid product in payload: %s", product_id)
                client = _get_bot_client()
                if client:
                    await client._call("answerPreCheckoutQuery", {
                        "pre_checkout_query_id": query_id,
                        "ok": False,
                        "error_message": "Invalid product. Please try again.",
                    })
                return {"ok": False}

            # 승인
            client = _get_bot_client()
            if client:
                await client._call("answerPreCheckoutQuery", {
                    "pre_checkout_query_id": query_id,
                    "ok": True,
                })

            logger.info("[stars] pre_checkout_query approved: user=%s product=%s", user_id, product_id)

        except Exception as e:
            logger.error("[stars] pre_checkout_query error: %s", e)

    # ── successful_payment 처리 ─────────────────────────────────────
    if "message" in update and "successful_payment" in update.get("message", {}):
        msg = update["message"]
        payment = msg["successful_payment"]
        payload_str = payment.get("invoice_payload", "{}")
        telegram_charge_id = payment.get("telegram_payment_charge_id", "")
        stars_amount = payment.get("total_amount", 0)

        try:
            payload = json.loads(payload_str)
            product_id = payload.get("pid")
            user_id = payload.get("uid")
            invoice_id = payload.get("iid")

            if not product_id or not user_id:
                logger.warning("[stars] incomplete payment payload: %s", payload_str)
                return {"ok": False}

            product = STAR_PRODUCTS.get(product_id)
            if not product:
                logger.warning("[stars] unknown product in payment: %s", product_id)
                return {"ok": False}

            # 사용자 플랜 업그레이드
            admin = AdminPlatform.get_instance()

            if product.get("plan") and product.get("period_days"):
                # 구독형 상품 — 플랜 변경
                admin.change_plan(user_id, product["plan"])
                admin.create_subscription(
                    user_id=user_id,
                    plan=product["plan"],
                )
                admin._audit(
                    user_id, "stars_payment",
                    AuditAction.PAYMENT_SUCCEEDED,
                    "subscription", user_id,
                    {
                        "product": product_id,
                        "plan": product["plan"],
                        "stars": stars_amount,
                        "charge_id": telegram_charge_id,
                    },
                )
                logger.info(
                    "[stars] payment completed: user=%s → %s (%d Stars)",
                    user_id, product["plan"], stars_amount,
                )

            elif product.get("ai_calls"):
                # AI Boost — 사용량 크레딧 추가
                admin.record_usage(
                    user_id=user_id,
                    api_calls=0,  # 별도 크레딧 테이블 필요시 기록
                )
                admin._audit(
                    user_id, "stars_payment",
                    AuditAction.PAYMENT_SUCCEEDED,
                    "ai_boost", user_id,
                    {
                        "product": product_id,
                        "ai_calls": product["ai_calls"],
                        "stars": stars_amount,
                    },
                )
                logger.info(
                    "[stars] ai_boost: user=%s +%d calls (%d Stars)",
                    user_id, product["ai_calls"], stars_amount,
                )

            # 인보이스 기록
            admin.create_invoice(
                user_id=user_id,
                amount_cents=stars_amount * 100,  # Stars → cent 변환 (근사치)
                stripe_invoice_id=telegram_charge_id,
            )

        except Exception as e:
            logger.error("[stars] successful_payment error: %s", e)

    return {"ok": True}


# ── Helpers ─────────────────────────────────────────────────────────


async def _resolve_telegram_chat(user: dict) -> int | None:
    """사용자의 Telegram Chat ID를 Bot 세션에서 조회."""
    from ..bot import db as bot_db
    bot_db.init_bot_tables()
    # 사용자 ID로 Telegram 세션 찾기
    conn = None
    try:
        import sqlite3
        import os
        db_path = os.environ.get("ADMIN_DB_PATH", "data/admin.db")
        conn = sqlite3.connect(db_path, timeout=10)
        conn.row_factory = sqlite3.Row
        cursor = conn.execute(
            "SELECT chat_id FROM bot_sessions ORDER BY updated_at DESC LIMIT 1"
        )
        row = cursor.fetchone()
        if row:
            return int(row["chat_id"])
        return None
    except Exception:
        return None
    finally:
        if conn:
            conn.close()
