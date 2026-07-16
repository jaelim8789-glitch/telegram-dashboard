"""Auth-related API endpoints (send code, verify code, 2FA)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..models import AuthMe
from ..runtime_manager import RuntimeManager

router = APIRouter()


@router.post("/accounts/{account_id}/send-code")
async def send_code(account_id: str):
    manager = RuntimeManager.get_instance()
    try:
        result = await manager.send_code(account_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/accounts/{account_id}/verify-code")
async def verify_code(account_id: str, body: dict):
    code = body.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Code is required")
    manager = RuntimeManager.get_instance()
    try:
        result = await manager.verify_code(account_id, code)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/accounts/{account_id}/verify-2fa")
async def verify_2fa(account_id: str, body: dict):
    password = body.get("password")
    if not password:
        raise HTTPException(status_code=400, detail="Password is required")
    manager = RuntimeManager.get_instance()
    try:
        result = await manager.verify_2fa(account_id, password)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/accounts/{account_id}/status")
async def get_auth_status(account_id: str):
    manager = RuntimeManager.get_instance()
    try:
        result = await manager.get_auth_status(account_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/accounts/{account_id}/re-auth")
async def re_auth(account_id: str):
    manager = RuntimeManager.get_instance()
    try:
        result = await manager.re_auth(account_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/auth/send-code")
async def auth_send_code(body: dict):
    # Free tier auth — handled by existing auth system
    return {"sent": True}


@router.post("/auth/verify-code")
async def auth_verify_code(body: dict):
    phone = body.get("phone")
    code = body.get("code")
    if not phone or not code:
        raise HTTPException(status_code=400, detail="Phone and code required")
    return {"api_key": "placeholder_api_key"}


@router.post("/auth/login-with-api-key")
async def login_with_api_key(body: dict):
    api_key = body.get("api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="API key required")
    return {
        "access_token": "placeholder_token",
        "session_token": None,
        "token_type": "bearer",
    }


@router.get("/auth/me", response_model=AuthMe)
async def auth_me():
    return AuthMe(
        role="user",
        phone=None,
        subscription_status="active",
        plan="premium",
        trial_expires_at=None,
    )
