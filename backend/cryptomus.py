"""
Cryptomus crypto payment integration — invoice creation, webhook processing,
and payment tracking.

Isolated from the existing USDT/TronGrid monitoring path.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx

CRYPTOMUS_DB_PATH = os.environ.get("CRYPTOMUS_DB_PATH", "data/cryptomus.db")
CRYPTOMUS_API_BASE = "https://api.cryptomus.com/v1"


def get_cryptomus_config() -> dict[str, str]:
    return {
        "api_key": os.environ.get("CRYPTOMUS_API_KEY", ""),
        "merchant_id": os.environ.get("CRYPTOMUS_MERCHANT_ID", ""),
        "webhook_secret": os.environ.get("CRYPTOMUS_WEBHOOK_SECRET", ""),
    }


PLAN_CRYPTO_PRICES: dict[str, dict[str, Any]] = {
    "free": {"usd": 0.0, "currency": "USDT"},
    "pro": {"usd": 99.99, "currency": "USDT"},
    "team": {"usd": 299.99, "currency": "USDT"},
    "lifetime": {"usd": 1999.99, "currency": "USDT"},
}


def init_cryptomus_db() -> None:
    os.makedirs(os.path.dirname(CRYPTOMUS_DB_PATH) or ".", exist_ok=True)
    conn = sqlite3.connect(CRYPTOMUS_DB_PATH, timeout=30)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS cryptomus_payments (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            invoice_id TEXT UNIQUE NOT NULL,
            order_id TEXT NOT NULL,
            plan TEXT NOT NULL,
            network TEXT NOT NULL,
            amount_usd REAL NOT NULL,
            currency TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            payment_address TEXT,
            qr_code_url TEXT,
            expires_at TEXT,
            paid_amount TEXT,
            paid_currency TEXT,
            issued_api_key TEXT,
            webhook_received_at TEXT,
            created_at TEXT DEFAULT '',
            processed_at TEXT
        )
        """
    )
    conn.commit()
    conn.close()


def get_payment(invoice_id: str) -> dict[str, Any] | None:
    conn = sqlite3.connect(CRYPTOMUS_DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    row = conn.execute(
        "SELECT * FROM cryptomus_payments WHERE invoice_id = ?",
        (invoice_id,),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def create_payment_record(
    user_id: str,
    invoice_id: str,
    order_id: str,
    plan: str,
    network: str,
    amount_usd: float,
    currency: str,
    payment_address: str | None,
    qr_code_url: str | None,
    expires_at: str | None,
) -> dict[str, Any]:
    pid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    conn = sqlite3.connect(CRYPTOMUS_DB_PATH, timeout=30)
    conn.execute(
        """
        INSERT INTO cryptomus_payments
        (id, user_id, invoice_id, order_id, plan, network, amount_usd, currency,
         status, payment_address, qr_code_url, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
        """,
        (
            pid,
            user_id,
            invoice_id,
            order_id,
            plan,
            network,
            amount_usd,
            currency,
            payment_address,
            qr_code_url,
            expires_at,
            now,
        ),
    )
    conn.commit()
    conn.close()
    return {
        "id": pid,
        "invoice_id": invoice_id,
        "order_id": order_id,
        "status": "pending",
    }


def mark_payment_paid(
    invoice_id: str,
    paid_amount: str,
    paid_currency: str,
    api_key: str | None = None,
) -> None:
    now = datetime.now(timezone.utc).isoformat()
    conn = sqlite3.connect(CRYPTOMUS_DB_PATH, timeout=30)
    conn.execute(
        """
        UPDATE cryptomus_payments
        SET status = 'paid',
            paid_amount = ?,
            paid_currency = ?,
            issued_api_key = COALESCE(?, issued_api_key),
            processed_at = ?,
            webhook_received_at = ?
        WHERE invoice_id = ?
        """,
        (paid_amount, paid_currency, api_key, now, now, invoice_id),
    )
    conn.commit()
    conn.close()


def verify_webhook_signature(secret: str, body: bytes, sign: str) -> bool:
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, sign)


async def create_cryptomus_invoice(
    amount: str,
    currency: str,
    network: str,
    order_id: str,
    lifetime: int = 1800,
) -> dict[str, Any]:
    cfg = get_cryptomus_config()
    if not cfg["api_key"] or not cfg["merchant_id"]:
        raise RuntimeError("Cryptomus credentials not configured")

    payload = {
        "amount": amount,
        "currency": currency,
        "network": network,
        "order_id": order_id,
        "lifetime": lifetime,
        "is_amount_editable": False,
    }
    body_str = json.dumps(payload, separators=(",", ":"))
    sign = hmac.new(
        cfg["api_key"].encode(), body_str.encode(), hashlib.sha256
    ).hexdigest()

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{CRYPTOMUS_API_BASE}/payments",
            content=body_str,
            headers={
                "merchant": cfg["merchant_id"],
                "sign": sign,
                "Content-Type": "application/json",
            },
        )
        resp.raise_for_status()
        data = resp.json()
        result = data.get("result") or {}
        if not result.get("uuid"):
            raise RuntimeError(f"Invalid Cryptomus response: {data}")
        return result
