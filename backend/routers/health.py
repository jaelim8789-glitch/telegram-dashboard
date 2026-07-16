"""Health monitoring API endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from ..models import AccountHealthItem
from ..runtime_manager import RuntimeManager

router = APIRouter()


@router.get("/account-health", response_model=list[AccountHealthItem])
async def get_account_health():
    manager = RuntimeManager.get_instance()
    return await manager.get_health()


@router.get("/accounts/{account_id}/health", response_model=AccountHealthItem)
async def get_single_account_health(account_id: str):
    manager = RuntimeManager.get_instance()
    item = await manager.get_account_health(account_id)
    if item is None:
        return AccountHealthItem(account_id=account_id, phone="", status="not_found")
    return item
