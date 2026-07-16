"""Health monitoring API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..models import AccountHealthItem
from ..runtime_manager import RuntimeManager
from ..auth_middleware import get_current_user, check_account_ownership, get_owned_account_ids

router = APIRouter()


@router.get("/account-health", response_model=list[AccountHealthItem])
async def get_account_health(current_user: dict = Depends(get_current_user)):
    manager = RuntimeManager.get_instance()
    items = await manager.get_health()
    owned_ids = await get_owned_account_ids(current_user)
    if owned_ids is not None:
        owned_set = set(owned_ids)
        items = [item for item in items if item.account_id in owned_set]
    return items


@router.get("/accounts/{account_id}/health", response_model=AccountHealthItem)
async def get_single_account_health(account_id: str, current_user: dict = Depends(get_current_user)):
    manager = RuntimeManager.get_instance()
    await check_account_ownership(account_id, current_user)
    item = await manager.get_account_health(account_id)
    if item is None:
        return AccountHealthItem(account_id=account_id, phone="", status="not_found")
    return item
