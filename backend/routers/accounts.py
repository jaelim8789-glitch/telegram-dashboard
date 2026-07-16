"""Account management API endpoints."""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, HTTPException

from ..models import Account, BatchStatusUpdate, CreateAccountInput
from ..runtime_manager import RuntimeManager
from ..auth_middleware import (
    get_current_user,
    check_account_limit,
    verify_account_ownership,
    get_owned_account_ids,
    user_owns_account,
)

router = APIRouter()


@router.get("/accounts", response_model=dict[str, list[Account]])
async def list_accounts(current_user: dict = Depends(get_current_user)):
    manager = RuntimeManager.get_instance()
    accounts = await manager.get_accounts()
    owned_ids = await get_owned_account_ids(current_user)
    if owned_ids is not None:
        owned_set = set(owned_ids)
        accounts = [a for a in accounts if a.id in owned_set]
    return {"items": accounts}


@router.post("/accounts", response_model=Account)
async def create_account(
    input_data: CreateAccountInput,
    current_user: dict = Depends(get_current_user),
    _: bool = Depends(check_account_limit),
):
    manager = RuntimeManager.get_instance()
    try:
        if input_data.api_id and input_data.api_hash:
            account = await manager.add_account(
                input_data.phone, input_data.api_id, input_data.api_hash, input_data.name,
                user_id=current_user["id"],
            )
        else:
            account = await manager.add_account_legacy(
                input_data.phone, input_data.name, user_id=current_user["id"],
            )
        return account
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/accounts/{account_id}")
async def delete_account(
    account_id: str,
    current_user: dict = Depends(verify_account_ownership),
):
    manager = RuntimeManager.get_instance()
    await manager.remove_account(account_id)
    return {"status": "deleted"}


@router.get("/accounts/{account_id}", response_model=Account)
async def get_account(
    account_id: str,
    current_user: dict = Depends(verify_account_ownership),
):
    manager = RuntimeManager.get_instance()
    account = await manager.get_account(account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@router.patch("/accounts/{account_id}/status")
async def update_account_status(
    account_id: str,
    body: dict,
    current_user: dict = Depends(verify_account_ownership),
):
    status = body.get("status")
    if status not in ("active", "inactive", "banned"):
        raise HTTPException(status_code=400, detail="Invalid status")
    manager = RuntimeManager.get_instance()
    runtime = manager.get_runtime(account_id)
    if not runtime:
        raise HTTPException(status_code=404, detail="Account not found")
    if status == "active":
        runtime._status = "active"
        runtime.health_monitor.set_session_status(True)
        runtime.health_monitor._state.status = "healthy"
    elif status == "inactive":
        runtime._status = "inactive"
        runtime.health_monitor.set_session_status(False)
        runtime.health_monitor._state.status = "unauthorized"
    elif status == "banned":
        runtime._status = "banned"
        runtime.health_monitor._state.status = "banned"
    return {"status": "updated"}


@router.patch("/accounts/batch/status")
async def batch_update_status(
    body: BatchStatusUpdate,
    current_user: dict = Depends(get_current_user),
):
    manager = RuntimeManager.get_instance()
    updated = 0
    for aid in body.account_ids:
        owner = await asyncio.to_thread(manager.get_account_owner, aid)
        if owner is None or not user_owns_account(owner.get("user_id"), current_user):
            continue
        runtime = manager.get_runtime(aid)
        if runtime:
            if body.status == "active":
                runtime._status = "active"
                runtime.health_monitor.set_session_status(True)
                runtime.health_monitor._state.status = "healthy"
            elif body.status == "inactive":
                runtime._status = "inactive"
                runtime.health_monitor.set_session_status(False)
                runtime.health_monitor._state.status = "unauthorized"
            elif body.status == "banned":
                runtime._status = "banned"
                runtime.health_monitor._state.status = "banned"
            updated += 1
    return {"status": "updated", "count": updated}