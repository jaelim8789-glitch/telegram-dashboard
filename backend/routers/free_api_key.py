"""
Free API Key endpoints — Telegram channel verification (no SMS OTP).

Endpoints:
  POST /api/free-api-key/start    — Start verification, return bot deep link + channel URL
  POST /api/telegram-verify/check — Check if user completed Telegram verification
  POST /api/free-api-key/issue    — Issue free API key after verification
"""

from __future__ import annotations

import json
import logging
import os
import secrets
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..admin_platform import AdminPlatform

logger = logging.getLogger(__name__)
router = APIRouter()

DB_PATH = os.environ.get("ADMIN_DB_PATH", "data/admin.db")


# ── Pydantic Models ───────────────────────────────────────────────────


class StartResponse(BaseModel):
    token: str
    bot_deep_link: str
    channel_url: str


class CheckRequest(BaseModel):
    token: str


class CheckResponse(BaseModel):
    status: str  # "pending_bot_start" | "unverified" | "verified"
    reason: str | None = None


class IssueRequest(BaseModel):
    token: str
    phone: str | None = None


class IssueResponse(BaseModel):
    api_key: str | None = None
    detail: str = ""
    already_issued: bool = False


# ── DB Init ───────────────────────────────────────────────────────────


def _init_db() -> None:
    os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS free_api_key_requests (
            token TEXT PRIMARY KEY,
            phone TEXT DEFAULT '',
            status TEXT DEFAULT 'pending_bot_start',
            reason TEXT,
            api_key TEXT,
            created_at TEXT DEFAULT '',
            updated_at TEXT DEFAULT ''
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS free_api_keys (
            id TEXT PRIMARY KEY,
            phone TEXT NOT NULL UNIQUE,
            api_key TEXT NOT NULL UNIQUE,
            created_at TEXT DEFAULT ''
        )
    """)
    conn.commit()
    conn.close()


# ── Helpers ───────────────────────────────────────────────────────────


def _generate_api_key() -> str:
    return "tm_free_" + secrets.token_hex(16)


def _get_request(token: str) -> dict[str, Any] | None:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.execute(
        "SELECT * FROM free_api_key_requests WHERE token = ?", (token,)
    )
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return dict(row)


def _upsert_request(token: str, **kwargs: Any) -> None:
    conn = sqlite3.connect(DB_PATH)
    now = datetime.now(timezone.utc).isoformat()
    existing = conn.execute(
        "SELECT token FROM free_api_key_requests WHERE token = ?", (token,)
    ).fetchone()
    if existing:
        sets = ", ".join(f"{k} = ?" for k in kwargs)
        params = list(kwargs.values()) + [token]
        conn.execute(f"UPDATE free_api_key_requests SET {sets}, updated_at = ? WHERE token = ?", params + [now, token])
    else:
        placeholders = ", ".join("?" for _ in kwargs)
        cols = ", ".join(kwargs.keys())
        conn.execute(
            f"INSERT INTO free_api_key_requests ({cols}, created_at, updated_at) VALUES ({placeholders}, ?, ?)",
            list(kwargs.values()) + [now, now],
        )
    conn.commit()
    conn.close()


# ── Endpoints ─────────────────────────────────────────────────────────


@router.post("/free-api-key/start", response_model=StartResponse)
async def start_free_api_key():
    """Start the free API key verification flow.

    Returns a unique token, a Telegram bot deep link, and a channel URL
    that the user must visit to complete verification.
    """
    _init_db()
    token = str(uuid.uuid4())
    bot_deep_link = f"https://t.me/telemon_verify_bot?start={token}"
    channel_url = "https://t.me/telemon_channel"

    _upsert_request(
        token=token,
        phone="",
        status="pending_bot_start",
        reason=None,
        api_key=None,
    )

    logger.info("Free API key verification started: token=%s", token)
    return StartResponse(
        token=token,
        bot_deep_link=bot_deep_link,
        channel_url=channel_url,
    )


@router.post("/telegram-verify/check", response_model=CheckResponse)
async def check_telegram_verification(body: CheckRequest):
    """Check the status of a Telegram verification request.

    The bot updates the status from 'pending_bot_start' → 'unverified'
    (user started bot but hasn't joined channel) → 'verified' (user joined channel).
    """
    _init_db()
    req = _get_request(body.token)
    if not req:
        raise HTTPException(status_code=404, detail="Verification token not found")

    return CheckResponse(
        status=req["status"],
        reason=req.get("reason"),
    )


@router.post("/free-api-key/issue", response_model=IssueResponse)
async def issue_free_api_key(body: IssueRequest):
    """Issue a free API key after successful Telegram verification.

    The token must be in 'verified' status. Each phone number can only
    receive one free API key.
    """
    _init_db()
    req = _get_request(body.token)
    if not req:
        raise HTTPException(status_code=404, detail="Verification token not found")

    if req["status"] != "verified":
        return IssueResponse(
            api_key=None,
            detail="인증이 완료되지 않았습니다. 텔레그램 봇과 채널 가입을 완료해주세요.",
            already_issued=False,
        )

    phone = body.phone or req.get("phone", "")
    if not phone:
        return IssueResponse(
            api_key=None,
            detail="전화번호가 필요합니다.",
            already_issued=False,
        )

    # Check if this phone already has a free key
    conn = sqlite3.connect(DB_PATH)
    existing = conn.execute(
        "SELECT api_key FROM free_api_keys WHERE phone = ?", (phone,)
    ).fetchone()
    if existing:
        conn.close()
        return IssueResponse(
            api_key=existing["api_key"],
            detail="이미 발급된 계정입니다.",
            already_issued=True,
        )

    # Generate and store the API key
    api_key = _generate_api_key()
    now = datetime.now(timezone.utc).isoformat()
    key_id = str(uuid.uuid4())
    conn.execute(
        "INSERT INTO free_api_keys (id, phone, api_key, created_at) VALUES (?, ?, ?, ?)",
        (key_id, phone, api_key, now),
    )
    conn.commit()
    conn.close()

    # Update the request record
    _upsert_request(body.token, api_key=api_key, status="issued")

    logger.info("Free API key issued: phone=%s, key_id=%s", phone, key_id)
    return IssueResponse(
        api_key=api_key,
        detail="API 키가 발급되었습니다.",
        already_issued=False,
    )