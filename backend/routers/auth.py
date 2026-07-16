"""Auth-related API endpoints (send code, verify code, 2FA)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from ..models import AuthMe
from ..runtime_manager import RuntimeManager
from ..auth_middleware import get_current_user, verify_account_ownership
from ..admin_platform import AdminPlatform

router = APIRouter()


@router.post("/accounts/{account_id}/send-code")
async def send_code(account_id: str, current_user: dict = Depends(verify_account_ownership)):
    manager = RuntimeManager.get_instance()
    try:
        result = await manager.send_code(account_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/accounts/{account_id}/verify-code")
async def verify_code(account_id: str, body: dict, current_user: dict = Depends(verify_account_ownership)):
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
async def verify_2fa(account_id: str, body: dict, current_user: dict = Depends(verify_account_ownership)):
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
async def get_auth_status(account_id: str, current_user: dict = Depends(verify_account_ownership)):
    manager = RuntimeManager.get_instance()
    try:
        result = await manager.get_auth_status(account_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/accounts/{account_id}/re-auth")
async def re_auth(account_id: str, current_user: dict = Depends(verify_account_ownership)):
    manager = RuntimeManager.get_instance()
    try:
        result = await manager.re_auth(account_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/auth/login-with-api-key")
async def login_with_api_key(body: dict):
    api_key = body.get("api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="API key required")
    admin = AdminPlatform.get_instance()
    key_data = admin.validate_api_key(api_key)
    if not key_data:
        raise HTTPException(status_code=401, detail="Invalid or expired API key")
    return {
        "access_token": api_key,
        "session_token": None,
        "token_type": "bearer",
        "plan": key_data.get("plan", "free"),
        "key_prefix": key_data.get("key_prefix", ""),
    }


@router.get("/auth/me", response_model=AuthMe)
async def auth_me(current_user: dict = Depends(get_current_user)):
    return AuthMe(
        role=current_user.get("role", "api_key"),
        phone=current_user.get("phone"),
        subscription_status="active",
        plan=current_user.get("plan", "free"),
        trial_expires_at=None,
        api_key_info={
            "key_id": current_user.get("api_key_id"),
            "key_name": current_user.get("api_key_name"),
            "feature_flags": current_user.get("feature_flags", {}),
            "max_accounts": current_user.get("max_accounts", 0),
            "daily_limit": current_user.get("daily_limit", 0),
            "usage_count": current_user.get("usage_count", 0),
        } if current_user.get("from_api_key") else None,
    )