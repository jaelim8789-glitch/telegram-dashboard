"""
Unified Authentication & Authorization Middleware for all non-admin routes.

Bridges the gap between AdminPlatform (auth/RBAC/plans) and RuntimeManager
(accounts, broadcasts, auto-reply, etc.) by providing FastAPI dependencies
that enforce plan limits, feature flags, and daily usage caps.

Usage:
    from ..auth_middleware import (
        get_authenticated_user,
        require_feature,
        check_account_limit,
        check_daily_limit,
    )
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import Depends, Header, HTTPException

from .admin_platform import (
    AdminPlatform,
    Feature,
    Plan,
    PLANS,
    resolve_plan,
)
from .runtime_manager import RuntimeManager

logger = logging.getLogger(__name__)


async def get_current_user(
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict[str, Any]:
    """
    Authenticate via session token or API key.

    Session tokens are validated against the sessions DB (admin.py's logic).
    API keys are validated against AdminPlatform with full plan/limit data.

    Returns a user dict with:
      - id, username, role, plan, is_active, is_suspended
      - from_api_key (bool)
      - api_key_id, api_key_name (if API key)
      - feature_flags, max_accounts, daily_limit, usage_count
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    token = authorization
    if token.startswith("Bearer "):
        token = token[7:]

    # Session token check (reuses admin.py session DB)
    import sqlite3
    import time as _time

    SESSION_DB_PATH = "data/sessions.db"
    conn = sqlite3.connect(SESSION_DB_PATH, timeout=10)
    try:
        conn.row_factory = sqlite3.Row
        cursor = conn.execute(
            "SELECT * FROM sessions WHERE token = ? AND expires_at > ?",
            (token, _time.time()),
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

        # Period-based access gate (the primary limit lever -- see PLANS in
        # admin_platform.py, message/send counts are intentionally generous).
        # Auto-downgrades to free when a trial or paid subscription's period
        # has lapsed without renewal.
        admin.check_trial_status(user["id"])
        admin.check_subscription_status(user["id"])
        user = admin.get_user(user["id"]) or user  # re-fetch in case plan just changed

        return {
            **user,
            "from_api_key": False,
            "api_key_id": None,
            "feature_flags": {},
            "max_accounts": PLANS.get(resolve_plan(user.get("plan")), PLANS[Plan.FREE]).max_accounts,
            "daily_limit": PLANS.get(resolve_plan(user.get("plan")), PLANS[Plan.FREE]).daily_limit,
        }

    # API key check
    if token.startswith("tm_"):
        admin = AdminPlatform.get_instance()
        key_data = admin.validate_api_key(token)
        if key_data:
            return {
                "id": key_data.get("user_id", ""),
                "username": "api_key_user",
                # API keys are never allowed to impersonate admin roles.
                "role": "api_key",
                "plan": key_data.get("plan", Plan.FREE),
                "is_active": True,
                "is_suspended": 0,
                "from_api_key": True,
                "api_key_id": key_data.get("id", ""),
                "api_key_name": key_data.get("name", ""),
                "api_key_permissions": key_data.get("permissions", "read"),
                "feature_flags": key_data.get("feature_flags", {}),
                "max_accounts": key_data.get("max_accounts", 0),
                "daily_limit": key_data.get("daily_limit", 0),
                "usage_count": key_data.get("usage_count", 0),
            }

    raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin_user(user: dict = Depends(get_current_user)) -> dict:
    """Require admin role (for sensitive operations)."""
    role = user.get("role", "")
    admin_roles = {"super_admin", "admin"}
    if role in admin_roles:
        return user
    if user.get("from_api_key"):
        raise HTTPException(status_code=403, detail="Admin access required (API key not authorized)")
    raise HTTPException(status_code=403, detail="Admin access required")


async def check_plan_feature(
    feature: str,
    user: dict = Depends(get_current_user),
) -> bool:
    """Check if the user's plan includes a specific feature."""
    plan_name = resolve_plan(user.get("plan", Plan.FREE))
    plan_def = PLANS.get(plan_name)
    if not plan_def:
        raise HTTPException(status_code=403, detail=f"Unknown plan: {plan_name}")

    feature_enum = next((f for f in Feature if f.value == feature), None)
    if feature_enum and feature_enum not in plan_def.features:
        raise HTTPException(
            status_code=403,
            detail=f"Plan '{plan_name}' does not include feature '{feature}'",
        )
    return True


async def check_account_limit(user: dict = Depends(get_current_user)) -> bool:
    """Check if user can add more accounts based on plan's max_accounts.

    For API key users, uses the key-level max_accounts override.
    For session users, uses the plan-level max_accounts.
    """
    max_accounts = user.get("max_accounts", 0)
    if max_accounts > 0:
        current_count = len(RuntimeManager.get_instance()._runtimes)
        if current_count >= max_accounts:
            raise HTTPException(
                status_code=403,
                detail=f"Account limit ({max_accounts}) reached",
            )
        return True

    # Fall back to plan-level check
    admin = AdminPlatform.get_instance()
    plan_name = resolve_plan(user.get("plan", Plan.FREE))
    plan_def = PLANS.get(plan_name)
    if plan_def and plan_def.max_accounts > 0:
        current_count = len(RuntimeManager.get_instance()._runtimes)
        if current_count >= plan_def.max_accounts:
            raise HTTPException(
                status_code=403,
                detail=f"Account limit ({plan_def.max_accounts}) reached for plan '{plan_name}'",
            )
    return True


async def check_daily_send_limit(user: dict = Depends(get_current_user)) -> bool:
    """Check if user has remaining daily sends based on plan limits."""
    plan_name = resolve_plan(user.get("plan", Plan.FREE))
    plan_def = PLANS.get(plan_name)
    if not plan_def:
        raise HTTPException(status_code=403, detail=f"Unknown plan: {plan_name}")

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    from .admin_platform import AdminPlatform
    admin = AdminPlatform.get_instance()
    usage = admin.get_today_usage(user["id"])
    messages_sent = usage.get("messages_sent", 0)
    daily_limit = plan_def.daily_send_limit

    if daily_limit > 0 and messages_sent >= daily_limit:
        raise HTTPException(
            status_code=429,
            detail=f"Daily send limit ({daily_limit}) reached for plan '{plan_name}'",
        )
    return True


async def record_usage_api_call(user: dict = Depends(get_current_user)) -> None:
    """Record an API call usage for the authenticated user."""
    admin = AdminPlatform.get_instance()
    admin.record_usage(user_id=user["id"], api_calls=1)


# ── Tenant isolation (account ownership) ──────────────────────────────
#
# accounts.user_id was added after accounts/broadcasts/groups/etc. already
# existed in production, so pre-existing rows have user_id = NULL. Those
# "legacy/unclaimed" accounts are allowed through single-resource ownership
# checks (logged, pending an explicit backfill decision) but are excluded
# from any "list my accounts" style filtering — a regular user's owned-set
# is always an exact user_id match, never a NULL guess.

_ADMIN_ROLES = {"admin", "super_admin"}


def user_owns_account(owner_user_id: str | None, current_user: dict) -> bool:
    """True if current_user may act on an account with this recorded owner."""
    if current_user.get("role") in _ADMIN_ROLES:
        return True
    if owner_user_id is None:
        return True  # legacy/unclaimed — caller is responsible for logging
    return owner_user_id == current_user.get("id")


async def check_account_ownership(account_id: str, current_user: dict) -> None:
    """Raises 404/403 if account_id doesn't exist or isn't owned by current_user.

    Plain async function (not a FastAPI dependency) so it can also be called
    for account_ids that arrive via request body or a broadcast/macro lookup,
    not just a path parameter.
    """
    manager = RuntimeManager.get_instance()
    account = await asyncio.to_thread(manager.get_account_owner, account_id)
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")

    owner_user_id = account.get("user_id")
    if not user_owns_account(owner_user_id, current_user):
        raise HTTPException(status_code=403, detail="You do not own this account")

    if owner_user_id is None and current_user.get("role") not in _ADMIN_ROLES:
        logger.warning(
            "Account %s has no recorded owner (legacy); allowing access for user %s pending ownership backfill",
            account_id, current_user.get("id"),
        )


async def verify_account_ownership(
    account_id: str, current_user: dict = Depends(get_current_user)
) -> dict:
    """FastAPI dependency for routes where account_id is a path parameter."""
    await check_account_ownership(account_id, current_user)
    return current_user


async def get_owned_account_ids(current_user: dict) -> list[str] | None:
    """Returns the account_ids current_user may list, or None for admins
    (meaning: no filter, see everything including legacy/unclaimed accounts)."""
    if current_user.get("role") in _ADMIN_ROLES:
        return None
    manager = RuntimeManager.get_instance()
    return await asyncio.to_thread(manager.get_account_ids_by_user, current_user.get("id", ""))


def require_feature(feature: str):
    """Dependency factory — use as Depends(require_feature("auto_reply")).

    (check_plan_feature takes a `feature` argument that plain Depends() can't
    bind, so it needs a small async wrapper per call site.)
    """
    async def _dep(user: dict = Depends(get_current_user)) -> dict:
        await check_plan_feature(feature, user)
        return user
    return _dep
