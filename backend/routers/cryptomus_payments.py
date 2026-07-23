"""
Cryptomus crypto payment router — isolated from existing USDT monitoring.

Endpoints:
  POST /api/payments/crypto/create-invoice — create Cryptomus invoice
  POST /api/payments/crypto/webhook        — receive Cryptomus webhook
  GET  /api/payments/crypto/status/{invoice_id} — poll payment status
"""

from __future__ import annotations

import json
import logging
import os
import sqlite3
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse

from ..admin_platform import AdminPlatform, AuditAction, Plan, PLANS, resolve_plan
from ..auth_middleware import get_current_user
from ..cryptomus import (
    PLAN_CRYPTO_PRICES,
    create_cryptomus_invoice,
    create_payment_record,
    get_cryptomus_config,
    get_payment,
    init_cryptomus_db,
    mark_payment_paid,
    verify_webhook_signature,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/payments/crypto", tags=["crypto-payments"])

ALLOWED_NETWORKS = {"TRC20", "BEP20", "ERC20", "SOL"}


@router.on_event("startup")
def _init_db() -> None:
    init_cryptomus_db()


@router.post("/create-invoice")
async def create_invoice(
    body: dict[str, Any],
    current_user: dict = Depends(get_current_user),
):
    plan_raw = str(body.get("plan", "")).upper()
    network = str(body.get("network", "TRC20")).upper()

    plan_map = {
        "FREE": Plan.FREE,
        "PRO": Plan.PRO,
        "TEAM": Plan.TEAM,
        "ENTERPRISE": Plan.TEAM,
    }
    plan = plan_map.get(plan_raw)
    if not plan:
        raise HTTPException(
            status_code=400, detail="Invalid plan. Use FREE/PRO/TEAM/ENTERPRISE"
        )

    if plan == Plan.FREE:
        raise HTTPException(
            status_code=400, detail="FREE plan does not require payment"
        )

    if network not in ALLOWED_NETWORKS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid network. Allowed: {', '.join(sorted(ALLOWED_NETWORKS))}",
        )

    price_info = PLAN_CRYPTO_PRICES.get(plan)
    if not price_info:
        raise HTTPException(
            status_code=400, detail="Plan not available for crypto payment"
        )

    amount_usd = price_info["usd"]
    currency = price_info["currency"]

    order_id = str(uuid.uuid4())
    try:
        result = await create_cryptomus_invoice(
            amount=str(amount_usd),
            currency=currency,
            network=network,
            order_id=order_id,
        )
    except RuntimeError as exc:
        logger.error("[cryptomus] create invoice failed: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.error("[cryptomus] create invoice unexpected error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to create invoice")

    invoice_id = result.get("uuid", "")
    create_payment_record(
        user_id=current_user["id"],
        invoice_id=invoice_id,
        order_id=order_id,
        plan=plan,
        network=network,
        amount_usd=amount_usd,
        currency=currency,
        payment_address=result.get("address"),
        qr_code_url=result.get("qr_code"),
        expires_at=result.get("expired_at"),
    )

    logger.info(
        "[cryptomus] invoice created: user=%s plan=%s network=%s invoice=%s",
        current_user["id"],
        plan,
        network,
        invoice_id,
    )

    return {
        "ok": True,
        "invoice_id": invoice_id,
        "order_id": order_id,
        "plan": plan,
        "network": network,
        "amount_usd": amount_usd,
        "currency": currency,
        "payment_address": result.get("address"),
        "qr_code_url": result.get("qr_code"),
        "expires_at": result.get("expired_at"),
    }


@router.post("/webhook")
async def cryptomus_webhook(request: Request):
    raw_body = await request.body()
    sign = request.headers.get("sign", "")
    cfg = get_cryptomus_config()

    if not verify_webhook_signature(cfg["webhook_secret"], raw_body, sign):
        logger.warning("[cryptomus] invalid webhook signature")
        return JSONResponse(
            content={"ok": False, "error": "invalid signature"}, status_code=200
        )

    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError:
        logger.error("[cryptomus] invalid webhook JSON")
        return JSONResponse(
            content={"ok": False, "error": "invalid json"}, status_code=200
        )

    invoice_id = str(payload.get("uuid", ""))
    status = str(payload.get("status", "")).lower()
    payment_amount = payload.get("payment_amount", "")
    payment_currency = payload.get("payment_currency", "")

    if not invoice_id:
        return JSONResponse(content={"ok": False}, status_code=200)

    payment = get_payment(invoice_id)
    if not payment:
        logger.warning("[cryptomus] webhook for unknown invoice: %s", invoice_id)
        return JSONResponse(
            content={"ok": False, "error": "unknown invoice"}, status_code=200
        )

    if payment.get("status") != "pending":
        logger.info(
            "[cryptomus] duplicate webhook ignored: %s status=%s",
            invoice_id,
            payment.get("status"),
        )
        return JSONResponse(content={"ok": True, "duplicate": True}, status_code=200)

    expected_amount = payment.get("amount_usd")

    if status == "paid":
        try:
            expected = float(expected_amount) if expected_amount is not None else 0.0
            actual = float(payment_amount) if payment_amount else 0.0
            if abs(actual - expected) > 0.01:
                logger.error(
                    "[cryptomus] amount mismatch: invoice=%s expected=%s actual=%s",
                    invoice_id,
                    expected,
                    actual,
                )
                conn = sqlite3.connect(
                    os.environ.get("CRYPTOMUS_DB_PATH", "data/cryptomus.db"),
                    timeout=30,
                )
                conn.execute(
                    "UPDATE cryptomus_payments SET status = 'amount_mismatch' WHERE invoice_id = ?",
                    (invoice_id,),
                )
                conn.commit()
                conn.close()
                return JSONResponse(
                    content={"ok": True, "error": "amount_mismatch"}, status_code=200
                )
        except (ValueError, TypeError):
            pass

        admin = AdminPlatform.get_instance()
        user_id = payment["user_id"]
        plan = payment["plan"]

        api_key_raw = None
        try:
            key_result = admin.create_api_key(
                user_id=user_id,
                name="Cryptomus API Key",
                plan=plan,
                permissions="read",
            )
            api_key_raw = key_result.get("key")
        except Exception as exc:
            logger.error(
                "[cryptomus] api key creation failed: user=%s err=%s", user_id, exc
            )

        try:
            admin.create_subscription(user_id=user_id, plan=plan)
            admin._audit(
                user_id,
                "",
                AuditAction.PAYMENT_SUCCEEDED,
                "subscription",
                user_id,
                {"plan": plan, "invoice_id": invoice_id, "amount": payment_amount},
            )
        except Exception as exc:
            logger.error(
                "[cryptomus] subscription activation failed: user=%s err=%s",
                user_id,
                exc,
            )

        mark_payment_paid(
            invoice_id,
            str(payment_amount),
            payment_currency or "",
            api_key_raw,
        )
        logger.info(
            "[cryptomus] payment confirmed: user=%s plan=%s amount=%s invoice=%s",
            user_id,
            plan,
            payment_amount,
            invoice_id,
        )
    elif status in ("failed", "expired", "wrong_amount"):
        conn = sqlite3.connect(
            os.environ.get("CRYPTOMUS_DB_PATH", "data/cryptomus.db"), timeout=30
        )
        conn.execute(
            "UPDATE cryptomus_payments SET status = ? WHERE invoice_id = ?",
            (status, invoice_id),
        )
        conn.commit()
        conn.close()
        logger.info("[cryptomus] payment %s: invoice=%s", status, invoice_id)

    return JSONResponse(content={"ok": True}, status_code=200)


@router.get("/status/{invoice_id}")
async def payment_status(
    invoice_id: str,
    current_user: dict = Depends(get_current_user),
):
    payment = get_payment(invoice_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if payment["user_id"] != current_user["id"]:
        role = current_user.get("role", "")
        if role not in ("admin", "super_admin"):
            raise HTTPException(status_code=403, detail="Forbidden")

    return {
        "ok": True,
        "invoice_id": payment["invoice_id"],
        "order_id": payment["order_id"],
        "status": payment["status"],
        "plan": payment["plan"],
        "network": payment["network"],
        "amount_usd": payment["amount_usd"],
        "currency": payment["currency"],
        "payment_address": payment["payment_address"],
        "qr_code_url": payment["qr_code_url"],
        "expires_at": payment["expires_at"],
        "paid_amount": payment["paid_amount"],
        "paid_currency": payment["paid_currency"],
        "api_key": payment.get("issued_api_key"),
    }
