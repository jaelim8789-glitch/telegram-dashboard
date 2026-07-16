"""
Admin Platform API — Enterprise TeleMon 운영 관리 엔드포인트.

Endpoints:
  POST /api/admin/register       — Create admin user
  POST /api/admin/login          — Admin login (JWT-based)
  GET  /api/admin/users          — List users (admin only)
  GET  /api/admin/users/{id}     — Get user details
  PUT  /api/admin/users/{id}/role    — Change user role
  POST /api/admin/users/{id}/suspend — Suspend user
  POST /api/admin/users/{id}/activate — Activate user
  PUT  /api/admin/users/{id}/plan    — Change user plan
  
  # API Keys
  POST /api/admin/api-keys       — Create API key
  GET  /api/admin/api-keys       — List API keys
  DELETE /api/admin/api-keys/{id} — Revoke API key
  
  # Plans
  GET  /api/admin/plans          — List all plans
  GET  /api/admin/plans/{name}   — Get plan details
  
  # Feature Flags
  POST /api/admin/features/override — Set feature override
  
  # Usage
  GET  /api/admin/usage/{user_id}   — Get user usage
  GET  /api/admin/usage/{user_id}/history — Get usage history
  
  # Dashboard
  GET  /api/admin/dashboard      — System-wide stats
  
  # Audit
  GET  /api/admin/audit-logs     — Get audit logs
  
  # Trial
  POST /api/admin/trial/{user_id}/start — Start trial
  GET  /api/admin/trial/{user_id}/status — Check trial status
  
  # Billing Ready
  POST /api/admin/subscriptions  — Create subscription
  POST /api/admin/subscriptions/{id}/cancel — Cancel subscription
  POST /api/admin/invoices       — Create invoice
  
  # Health (legacy admin)
  GET  /api/admin/health         — Admin health check

v3 — Enterprise Admin Platform.
"""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Header, Depends, Request
from fastapi.responses import JSONResponse

from ..admin_platform import AdminPlatform, Plan, Feature, Role, AuditAction
from ..models import AuthMe, APIKeyCreate, APIKeyUpdate

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Auth Dependencies ───────────────────────────────────────────────

# DB-backed session tokens (persist across restarts)
import sqlite3
import secrets as secrets_module
import threading
import hashlib

SESSION_DB_PATH = "data/sessions.db"
_token_cleanup_lock = threading.Lock()

# ── Login Rate Limiting ────────────────────────────────────────────
# Prevents brute-force attacks by tracking failed attempts per IP.
# Threshold: 10 failed attempts within 300 seconds → 15-minute block.
_LOGIN_ATTEMPT_LOCK = threading.Lock()
_LOGIN_ATTEMPTS: dict[str, list[float]] = {}  # ip -> list of timestamps
_LOGIN_BLOCKED: dict[str, float] = {}  # ip -> unblock timestamp

def _check_login_rate_limit(ip: str) -> None:
    """Check if IP has exceeded login attempt threshold. Raises 429 if blocked."""
    now = time.time()
    with _LOGIN_ATTEMPT_LOCK:
        # Check if currently blocked
        unblock_until = _LOGIN_BLOCKED.get(ip, 0)
        if now < unblock_until:
            raise HTTPException(
                status_code=429,
                detail="너무 많은 로그인 시도가 있었습니다. 15분 후에 다시 시도해주세요."
            )
        # Prune attempts older than 5 minutes
        cutoff = now - 300
        attempts = [t for t in _LOGIN_ATTEMPTS.get(ip, []) if t > cutoff]
        _LOGIN_ATTEMPTS[ip] = attempts

def _record_login_attempt(ip: str, success: bool) -> None:
    """Record login attempt. If threshold exceeded, block the IP."""
    now = time.time()
    with _LOGIN_ATTEMPT_LOCK:
        if success:
            # Clear failed attempts on success
            _LOGIN_ATTEMPTS.pop(ip, None)
            _LOGIN_BLOCKED.pop(ip, None)
            return
        attempts = _LOGIN_ATTEMPTS.get(ip, [])
        attempts.append(now)
        # Keep only last 5 minutes
        cutoff = now - 300
        attempts = [t for t in attempts if t > cutoff]
        _LOGIN_ATTEMPTS[ip] = attempts
        # Block after 10 failed attempts within 5 minutes
        if len(attempts) >= 10:
            _LOGIN_BLOCKED[ip] = now + 900  # 15 minute block
            logger.warning("IP %s blocked for 15 minutes due to excessive login failures", ip)

def _get_client_ip(request: Request) -> str:
    """Extract client IP from request, respecting proxies."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _init_session_db() -> None:
    """Initialize the session database table."""
    import os
    os.makedirs(os.path.dirname(SESSION_DB_PATH) or ".", exist_ok=True)
    conn = sqlite3.connect(SESSION_DB_PATH, timeout=10)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            created_at REAL NOT NULL,
            expires_at REAL NOT NULL
        )
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_sessions_expires 
        ON sessions(expires_at)
    """)
    conn.commit()
    conn.close()


def _cleanup_expired_sessions() -> None:
    """Remove expired sessions from the database."""
    with _token_cleanup_lock:
        try:
            conn = sqlite3.connect(SESSION_DB_PATH, timeout=10)
            conn.execute("DELETE FROM sessions WHERE expires_at < ?", (time.time(),))
            conn.commit()
            conn.close()
        except Exception:
            pass


# Initialize session DB on module load
_init_session_db()
_token_expiry = 86400  # 24 hours


def _generate_token(user_id: str) -> str:
    """Generate a DB-backed session token."""
    token = f"tm_admin_{secrets_module.token_urlsafe(32)}"
    now = time.time()
    expires_at = now + _token_expiry
    
    conn = sqlite3.connect(SESSION_DB_PATH, timeout=10)
    try:
        conn.execute(
            "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (token, user_id, now, expires_at),
        )
        conn.commit()
    finally:
        conn.close()
    
    return token


async def get_current_user(
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict[str, Any]:
    """Dependency: extract and validate current user from Authorization header."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    # Support both Bearer token and direct token
    token = authorization
    if token.startswith("Bearer "):
        token = token[7:]
    
    # Check session token (DB-backed)
    conn = sqlite3.connect(SESSION_DB_PATH, timeout=10)
    try:
        conn.row_factory = sqlite3.Row
        cursor = conn.execute(
            "SELECT * FROM sessions WHERE token = ? AND expires_at > ?",
            (token, time.time()),
        )
        session = cursor.fetchone()
    finally:
        conn.close()
    
    if session:
        session = dict(session)
        admin = AdminPlatform.get_instance()
        user = admin.get_user(session["user_id"])
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        if user.get("is_suspended"):
            raise HTTPException(status_code=403, detail="User is suspended")
        return user
    
    # Check API key
    if token.startswith("tm_"):
        admin = AdminPlatform.get_instance()
        key_data = admin.validate_api_key(token)
        if key_data:
            return {
                "id": key_data.get("user_id", ""),
                "username": "api_key_user",
                "role": key_data.get("permissions", "read"),
                "plan": key_data.get("plan", "free"),
                "is_active": True,
                "is_suspended": 0,
                "from_api_key": True,
                "api_key_id": key_data.get("id", ""),
                "api_key_name": key_data.get("name", ""),
                "feature_flags": key_data.get("feature_flags", {}),
                "max_accounts": key_data.get("max_accounts", 0),
                "daily_limit": key_data.get("daily_limit", 0),
                "usage_count": key_data.get("usage_count", 0),
            }
    
    raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """Require admin role."""
    admin = AdminPlatform.get_instance()
    if not admin.require_role(user["id"], Role.ADMIN):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def require_super_admin(user: dict = Depends(get_current_user)) -> dict:
    """Require super admin role."""
    admin = AdminPlatform.get_instance()
    if not admin.require_role(user["id"], Role.SUPER_ADMIN):
        raise HTTPException(status_code=403, detail="Super admin access required")
    return user


# ── Auth Endpoints ──────────────────────────────────────────────────

@router.post("/admin/register")
async def register_user(body: dict):
    """Register a new admin user."""
    username = body.get("username")
    password = body.get("password")
    email = body.get("email")
    phone = body.get("phone")
    
    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password required")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    admin = AdminPlatform.get_instance()
    try:
        user = admin.create_user(
            username=username,
            password=password,
            role=Role.USER,
            plan=Plan.FREE,
            email=email,
            phone=phone,
        )
        return user
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.post("/admin/login")
async def login(body: dict, request: Request):
    """Login and get session token."""
    ip = _get_client_ip(request)
    _check_login_rate_limit(ip)

    username = body.get("username")
    password = body.get("password")
    
    if not username or not password:
        _record_login_attempt(ip, False)
        raise HTTPException(status_code=400, detail="Username and password required")
    
    admin = AdminPlatform.get_instance()
    user = admin.authenticate(username, password)
    
    if not user:
        _record_login_attempt(ip, False)
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    _record_login_attempt(ip, True)
    token = _generate_token(user["id"])
    
    # Write audit
    admin._audit(user["id"], username, AuditAction.USER_LOGIN,
                "session", token[:12], {"login": "admin"})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "plan": user["plan"],
        },
    }


# ── Session Management ───────────────────────────────────────────────

def _revoke_all_user_sessions(user_id: str) -> None:
    """Revoke all sessions for a given user."""
    with _token_cleanup_lock:
        try:
            conn = sqlite3.connect(SESSION_DB_PATH, timeout=10)
            conn.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error("Failed to revoke sessions for user %s: %s", user_id, e)


@router.post("/admin/change-password")
async def change_password(
    body: dict,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Change the current user's password. Invalidates all existing sessions."""
    ip = _get_client_ip(request)
    _check_login_rate_limit(ip)

    old_password = body.get("old_password")
    new_password = body.get("new_password")
    
    if not old_password or not new_password:
        raise HTTPException(status_code=400, detail="old_password and new_password required")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    
    admin = AdminPlatform.get_instance()
    user = admin.authenticate(current_user["username"], old_password)
    if not user:
        _record_login_attempt(ip, False)
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    
    # Update password
    admin.update_password(current_user["id"], new_password)
    
    # Revoke all existing sessions (forces re-login with new password)
    _revoke_all_user_sessions(current_user["id"])
    
    # Generate new session token
    token = _generate_token(current_user["id"])
    
    logger.info("Password changed for user %s, all sessions revoked", current_user["id"])
    
    return {
        "status": "ok",
        "message": "비밀번호가 변경되었습니다. 모든 기기에서 로그아웃되었습니다.",
        "access_token": token,
    }


@router.post("/admin/logout-all")
async def logout_all(current_user: dict = Depends(get_current_user)):
    """Revoke all sessions for the current user."""
    _revoke_all_user_sessions(current_user["id"])
    logger.info("All sessions revoked for user %s", current_user["id"])
    return {
        "status": "ok",
        "message": "모든 기기에서 로그아웃되었습니다.",
    }


@router.get("/admin/auth/me")
async def admin_auth_me(current_user: dict = Depends(get_current_user)):
    """Get current admin user info."""
    admin = AdminPlatform.get_instance()
    full_user = admin.get_user(current_user["id"])

    if not full_user:
        # For API key users
        return AuthMe(
            role=current_user.get("role", "api_key"),
            phone=None,
            subscription_status="active",
            plan=current_user.get("plan", "free"),
            trial_expires_at=None,
            api_key_info={
                "key_id": current_user.get("api_key_id", ""),
                "key_name": current_user.get("api_key_name", ""),
                "feature_flags": current_user.get("feature_flags", {}),
                "max_accounts": current_user.get("max_accounts", 0),
                "daily_limit": current_user.get("daily_limit", 0),
                "usage_count": current_user.get("usage_count", 0),
            },
        )

    return AuthMe(
        role=full_user["role"],
        phone=full_user.get("phone"),
        subscription_status=full_user.get("subscription_status", "active"),
        plan=full_user["plan"],
        trial_expires_at=full_user.get("trial_ends_at"),
    )


# ── User Management (Admin) ────────────────────────────────────────

@router.get("/admin/users")
async def list_users(
    limit: int = 100,
    offset: int = 0,
    current_user: dict = Depends(require_admin),
):
    """List all users."""
    admin = AdminPlatform.get_instance()
    users = admin.list_users(limit=limit, offset=offset)
    return {"items": users, "total": len(users), "limit": limit, "offset": offset}


@router.get("/admin/users/{user_id}")
async def get_user(
    user_id: str,
    current_user: dict = Depends(require_admin),
):
    """Get user details."""
    admin = AdminPlatform.get_instance()
    user = admin.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Don't expose password hash
    user.pop("password_hash", None)
    return user


@router.put("/admin/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    body: dict,
    current_user: dict = Depends(require_admin),
):
    """Change user role."""
    new_role = body.get("role")
    if not new_role:
        raise HTTPException(status_code=400, detail="Role required")
    
    valid_roles = [r.value for r in Role]
    if new_role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role: {new_role}")
    
    admin = AdminPlatform.get_instance()
    try:
        user = admin.update_user_role(user_id, new_role)
        user.pop("password_hash", None)
        return user
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/admin/users/{user_id}/suspend")
async def suspend_user(
    user_id: str,
    current_user: dict = Depends(require_admin),
):
    """Suspend a user."""
    admin = AdminPlatform.get_instance()
    user = admin.suspend_user(user_id)
    user.pop("password_hash", None)
    return user


@router.post("/admin/users/{user_id}/activate")
async def activate_user(
    user_id: str,
    current_user: dict = Depends(require_admin),
):
    """Activate a suspended user."""
    admin = AdminPlatform.get_instance()
    user = admin.activate_user(user_id)
    user.pop("password_hash", None)
    return user


@router.put("/admin/users/{user_id}/plan")
async def change_user_plan(
    user_id: str,
    body: dict,
    current_user: dict = Depends(require_admin),
):
    """Change user's plan."""
    new_plan = body.get("plan")
    if not new_plan:
        raise HTTPException(status_code=400, detail="Plan required")
    
    valid_plans = [p.value for p in Plan]
    if new_plan not in valid_plans:
        raise HTTPException(status_code=400, detail=f"Invalid plan: {new_plan}")
    
    admin = AdminPlatform.get_instance()
    try:
        user = admin.change_plan(user_id, new_plan)
        user.pop("password_hash", None)
        return user
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── API Keys ────────────────────────────────────────────────────────

@router.post("/admin/api-keys")
async def create_api_key(
    body: APIKeyCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create a new API key. Admin can set plan/limits; regular users get plan defaults."""
    admin = AdminPlatform.get_instance()

    # Check plan limit for API access
    allowed, limit_info = admin.check_usage_limit(
        current_user["id"], Feature.API_ACCESS
    )
    if not allowed:
        raise HTTPException(status_code=403, detail=str(limit_info))

    # Only admins can set plan/limits on keys
    is_admin = current_user.get("role") in (Role.ADMIN, Role.SUPER_ADMIN)
    plan = body.plan if (is_admin and body.plan) else None
    feature_flags = body.feature_flags if (is_admin and body.feature_flags) else None
    max_accounts = body.max_accounts if (is_admin and body.max_accounts) else None
    daily_limit = body.daily_limit if (is_admin and body.daily_limit) else None

    key = admin.create_api_key(
        user_id=current_user["id"],
        name=body.name,
        permissions=body.permissions,
        expires_in_days=body.expires_in_days,
        plan=plan,
        feature_flags=feature_flags,
        max_accounts=max_accounts,
        daily_limit=daily_limit,
    )
    return key  # Contains raw key — only shown once!


@router.get("/admin/api-keys")
async def list_api_keys_route(
    current_user: dict = Depends(require_admin),
    all_keys: bool = False,
    user_id: str | None = None,
):
    """List API keys. Admin sees all keys; regular users see own."""
    admin = AdminPlatform.get_instance()

    if all_keys or current_user.get("role") in (Role.ADMIN, Role.SUPER_ADMIN):
        if user_id:
            keys = admin.list_api_keys(user_id)
        else:
            keys = admin.list_all_api_keys()
        return {"items": keys}

    keys = admin.list_api_keys(current_user["id"])
    return {"items": keys}


@router.get("/admin/api-keys/{key_id}")
async def get_api_key(
    key_id: str,
    current_user: dict = Depends(require_admin),
):
    """Get detailed info for a single API key."""
    admin = AdminPlatform.get_instance()
    key = admin.get_api_key(key_id)
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    return key


@router.put("/admin/api-keys/{key_id}")
async def update_api_key(
    key_id: str,
    body: APIKeyUpdate,
    current_user: dict = Depends(require_admin),
):
    """Update an API key's attributes."""
    admin = AdminPlatform.get_instance()
    key = admin.update_api_key(
        key_id=key_id,
        name=body.name,
        permissions=body.permissions,
        plan=body.plan,
        feature_flags=body.feature_flags,
        max_accounts=body.max_accounts,
        daily_limit=body.daily_limit,
        is_active=body.is_active,
        expires_in_days=body.expires_in_days,
    )
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    return key


@router.delete("/admin/api-keys/{key_id}")
async def revoke_api_key(
    key_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Revoke (deactivate) an API key. Users can revoke their own keys; admins can revoke any."""
    admin = AdminPlatform.get_instance()
    is_admin = current_user.get("role") in (Role.ADMIN, Role.SUPER_ADMIN)
    if not is_admin:
        key = admin.get_api_key(key_id)
        if not key or key.get("user_id") != current_user["id"]:
            raise HTTPException(status_code=404, detail="API key not found")
    admin.revoke_api_key(key_id)
    return {"status": "revoked", "key_id": key_id}


@router.post("/admin/api-keys/{key_id}/activate")
async def activate_api_key(
    key_id: str,
    current_user: dict = Depends(require_admin),
):
    """Reactivate a revoked API key."""
    admin = AdminPlatform.get_instance()
    key = admin.update_api_key(key_id=key_id, is_active=True)
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    return key


# ── API Key Usage Tracking ──────────────────────────────────────────

@router.get("/admin/api-keys/{key_id}/usage")
async def get_api_key_usage(
    key_id: str,
    current_user: dict = Depends(require_admin),
):
    """Get usage statistics for a specific API key."""
    admin = AdminPlatform.get_instance()
    usage = admin.get_api_key_usage(key_id)
    if not usage:
        raise HTTPException(status_code=404, detail="API key not found")
    return usage


@router.post("/admin/api-keys/{key_id}/reset-usage")
async def reset_api_key_usage(
    key_id: str,
    current_user: dict = Depends(require_admin),
):
    """Reset usage counter for an API key."""
    admin = AdminPlatform.get_instance()
    admin.reset_api_key_usage(key_id)
    return {"status": "reset", "key_id": key_id}


# ── Plans ───────────────────────────────────────────────────────────

@router.get("/admin/plans")
async def list_plans(current_user: dict = Depends(get_current_user)):
    """List all available plans with features and pricing."""
    admin = AdminPlatform.get_instance()
    return admin.list_plans()


@router.get("/admin/plans/{plan_name}")
async def get_plan(plan_name: str, current_user: dict = Depends(get_current_user)):
    """Get plan details."""
    admin = AdminPlatform.get_instance()
    plan = admin.get_plan(plan_name)
    if not plan:
        raise HTTPException(status_code=404, detail=f"Plan '{plan_name}' not found")
    return plan


# ── Feature Flags ───────────────────────────────────────────────────

@router.post("/admin/features/override")
async def set_feature_override(
    body: dict,
    current_user: dict = Depends(require_super_admin),
):
    """Override a feature flag for a user (super admin only)."""
    user_id = body.get("user_id")
    feature = body.get("feature")
    enabled = body.get("enabled", True)
    
    if not user_id or not feature:
        raise HTTPException(status_code=400, detail="user_id and feature required")
    
    admin = AdminPlatform.get_instance()
    admin.set_feature_override(user_id, feature, enabled)
    
    return {
        "status": "updated",
        "user_id": user_id,
        "feature": feature,
        "enabled": enabled,
    }


# ── Usage ───────────────────────────────────────────────────────────

@router.get("/admin/usage/{user_id}")
async def get_user_usage(
    user_id: str,
    current_user: dict = Depends(require_admin),
):
    """Get today's usage for a user."""
    admin = AdminPlatform.get_instance()
    return admin.get_today_usage(user_id)


@router.get("/admin/usage/{user_id}/history")
async def get_user_usage_history(
    user_id: str,
    days: int = 30,
    current_user: dict = Depends(require_admin),
):
    """Get usage history for a user."""
    admin = AdminPlatform.get_instance()
    return {"items": admin.get_usage_history(user_id, days=days)}


# ── Dashboard ───────────────────────────────────────────────────────

@router.get("/admin/dashboard")
async def get_dashboard(
    current_user: dict = Depends(require_admin),
):
    """Get system-wide dashboard statistics."""
    admin = AdminPlatform.get_instance()
    stats = admin.get_dashboard_stats()
    
    # Add runtime stats from RuntimeManager
    try:
        from ..runtime_manager import RuntimeManager
        manager = RuntimeManager.get_instance()
        stats["runtimes"] = {
            "total": manager.runtime_count,
            "active": sum(1 for r in manager.get_all_runtimes() if r.is_running()),
        }
    except Exception:
        stats["runtimes"] = {"total": 0, "active": 0}
    
    return stats


# ── Audit Logs ───────────────────────────────────────────────────────

@router.get("/admin/audit-logs")
async def get_audit_logs(
    limit: int = 100,
    offset: int = 0,
    user_id: str | None = None,
    action: str | None = None,
    current_user: dict = Depends(require_admin),
):
    """Get audit logs with optional filtering."""
    admin = AdminPlatform.get_instance()
    logs = admin.get_audit_logs(
        limit=limit,
        offset=offset,
        user_id=user_id,
        action=action,
    )
    return {
        "items": logs,
        "total": len(logs),
        "limit": limit,
        "offset": offset,
    }


# ── Trial ───────────────────────────────────────────────────────────

@router.post("/admin/trial/{user_id}/start")
async def start_trial(
    user_id: str,
    body: dict,
    current_user: dict = Depends(require_admin),
):
    """Start a trial for a user."""
    days = body.get("days", 14)
    admin = AdminPlatform.get_instance()
    result = admin.start_trial(user_id, days=days)
    return result


@router.get("/admin/trial/{user_id}/status")
async def check_trial_status(
    user_id: str,
    current_user: dict = Depends(require_admin),
):
    """Check trial status for a user."""
    admin = AdminPlatform.get_instance()
    return admin.check_trial_status(user_id)


# ── Billing ─────────────────────────────────────────────────────────

@router.post("/admin/subscriptions")
async def create_subscription(
    body: dict,
    current_user: dict = Depends(require_admin),
):
    """Create a subscription for a user."""
    user_id = body.get("user_id")
    plan = body.get("plan")
    stripe_subscription_id = body.get("stripe_subscription_id")
    stripe_price_id = body.get("stripe_price_id")
    
    if not user_id or not plan:
        raise HTTPException(status_code=400, detail="user_id and plan required")
    
    admin = AdminPlatform.get_instance()
    sub = admin.create_subscription(
        user_id=user_id,
        plan=plan,
        stripe_subscription_id=stripe_subscription_id,
        stripe_price_id=stripe_price_id,
    )
    return sub


@router.post("/admin/subscriptions/{subscription_id}/cancel")
async def cancel_subscription(
    subscription_id: str,
    current_user: dict = Depends(require_admin),
):
    """Cancel a subscription."""
    admin = AdminPlatform.get_instance()
    return admin.cancel_subscription(subscription_id)


@router.post("/admin/invoices")
async def create_invoice(
    body: dict,
    current_user: dict = Depends(require_admin),
):
    """Create an invoice (billing ready)."""
    user_id = body.get("user_id")
    amount_cents = body.get("amount_cents")
    subscription_id = body.get("subscription_id")
    stripe_invoice_id = body.get("stripe_invoice_id")
    
    if not user_id or not amount_cents:
        raise HTTPException(status_code=400, detail="user_id and amount_cents required")
    
    admin = AdminPlatform.get_instance()
    inv = admin.create_invoice(
        user_id=user_id,
        amount_cents=amount_cents,
        subscription_id=subscription_id,
        stripe_invoice_id=stripe_invoice_id,
    )
    return inv


# ── Admin Health ────────────────────────────────────────────────────

@router.get("/admin/health")
async def admin_health(current_user: dict = Depends(get_current_user)):
    """Admin health check endpoint."""
    admin = AdminPlatform.get_instance()
    return {
        "status": "ok",
        "platform": "enterprise",
        "users_count": admin.get_dashboard_stats().get("users", {}).get("total", 0),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ── Beta Key ────────────────────────────────────────────────────────

@router.post("/admin/beta-key")
async def create_beta_key(current_user: dict = Depends(require_admin)):
    """Generate an unlimited beta tester API key (admin only)."""
    admin = AdminPlatform.get_instance()
    key = admin.create_api_key(
        user_id=current_user["id"],
        name="Beta Tester Unlimited",
        permissions="write",
        plan="lifetime",
        feature_flags={
            "can_export": True,
            "can_webhook": True,
            "bulk_operations": True,
            "sso": True,
            "white_label": True,
        },
        max_accounts=9999,
        daily_limit=999999,
    )
    return key
