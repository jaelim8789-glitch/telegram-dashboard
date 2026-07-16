"""Group/dialog cache API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..runtime_manager import RuntimeManager
from ..auth_middleware import verify_account_ownership

router = APIRouter()


@router.get("/accounts/{account_id}/groups")
async def get_groups(account_id: str, page_size: int = 200, current_user: dict = Depends(verify_account_ownership)):
    manager = RuntimeManager.get_instance()
    groups = await manager.get_groups(account_id)
    return {"items": groups[:page_size]}


@router.get("/accounts/{account_id}/groups/folders")
async def get_group_folders(account_id: str, current_user: dict = Depends(verify_account_ownership)):
    manager = RuntimeManager.get_instance()
    folders = await manager.get_group_folders(account_id)
    return folders