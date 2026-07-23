"""Health monitoring API endpoints."""

from __future__ import annotations

import time

from fastapi import APIRouter, Depends

from ..auth_middleware import get_current_user, check_account_ownership
from ..models import AccountHealthItem
from ..runtime_manager import RuntimeManager

router = APIRouter()
_cache: dict[str, tuple[float, object]] = {}
_CACHE_TTL = 3.0


def _cached(key: str) -> object | None:
    entry = _cache.get(key)
    if entry and time.time() - entry[0] < _CACHE_TTL:
        return entry[1]
    return None


def _set_cache(key: str, value: object) -> None:
    _cache[key] = (time.time(), value)


@router.get("/account-health", response_model=list[AccountHealthItem])
async def get_account_health(current_user: dict = Depends(get_current_user)):
    manager = RuntimeManager.get_instance()
    cache_key = f"health_{current_user.get('id', '')}"
    cached = _cached(cache_key)
    if cached:
        return cached  # type: ignore
    all_items = await manager.get_health()
    if current_user.get("role") in ("admin", "super_admin"):
        _set_cache(cache_key, all_items)
        return all_items
    owned_ids = manager.get_account_ids_by_user(current_user.get("id", ""))
    if owned_ids is None:
        _set_cache(cache_key, all_items)
        return all_items
    owned_set = set(owned_ids)
    result = [item for item in all_items if item.account_id in owned_set]
    _set_cache(cache_key, result)
    return result


@router.get("/accounts/{account_id}/health", response_model=AccountHealthItem)
async def get_single_account_health(account_id: str, current_user: dict = Depends(get_current_user)):
    await check_account_ownership(account_id, current_user)
    manager = RuntimeManager.get_instance()
    item = await manager.get_account_health(account_id)
    if item is None:
        return AccountHealthItem(account_id=account_id, phone="", status="not_found")
    return item
