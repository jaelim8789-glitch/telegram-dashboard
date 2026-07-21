"""Health monitoring API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..auth_middleware import get_current_user, check_account_ownership
from ..models import AccountHealthItem
from ..runtime_manager import RuntimeManager

router = APIRouter()


@router.get("/account-health", response_model=list[AccountHealthItem])
async def get_account_health(current_user: dict = Depends(get_current_user)):
    manager = RuntimeManager.get_instance()
    all_items = await manager.get_health()
    if current_user.get("role") in ("admin", "super_admin"):
        return all_items
    owned_ids = await asyncio.to_thread(manager.get_account_ids_by_user, current_user.get("id", ""))
    if owned_ids is None:
        return all_items
    owned_set = set(owned_ids)
    return [item for item in all_items if item.account_id in owned_set]


@router.get("/accounts/{account_id}/health", response_model=AccountHealthItem)
async def get_single_account_health(account_id: str, current_user: dict = Depends(get_current_user)):
    await check_account_ownership(account_id, current_user)
    manager = RuntimeManager.get_instance()
    item = await manager.get_account_health(account_id)
    if item is None:
        return AccountHealthItem(account_id=account_id, phone="", status="not_found")
    return item
