"""Account management API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..models import Account, BatchStatusUpdate, CreateAccountInput
from ..runtime_manager import RuntimeManager

router = APIRouter()


@router.get("/accounts", response_model=dict[str, list[Account]])
async def list_accounts():
    manager = RuntimeManager.get_instance()
    accounts = await manager.get_accounts()
    return {"items": accounts}


@router.post("/accounts", response_model=Account)
async def create_account(input_data: CreateAccountInput):
    manager = RuntimeManager.get_instance()
    try:
        if input_data.api_id and input_data.api_hash:
            account = await manager.add_account(
                input_data.phone, input_data.api_id, input_data.api_hash, input_data.name
            )
        else:
            account = await manager.add_account_legacy(input_data.phone, input_data.name)
        return account
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/accounts/{account_id}")
async def delete_account(account_id: str):
    manager = RuntimeManager.get_instance()
    await manager.remove_account(account_id)
    return {"status": "deleted"}


@router.get("/accounts/{account_id}", response_model=Account)
async def get_account(account_id: str):
    manager = RuntimeManager.get_instance()
    account = await manager.get_account(account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@router.patch("/accounts/{account_id}/status")
async def update_account_status(account_id: str, body: dict):
    status = body.get("status")
    if status not in ("active", "inactive", "banned"):
        raise HTTPException(status_code=400, detail="Invalid status")
    manager = RuntimeManager.get_instance()
    runtime = manager.get_runtime(account_id)
    if not runtime:
        raise HTTPException(status_code=404, detail="Account not found")
    # Update the runtime's status and health monitor state
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
async def batch_update_status(body: BatchStatusUpdate):
    manager = RuntimeManager.get_instance()
    updated = 0
    for aid in body.account_ids:
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
