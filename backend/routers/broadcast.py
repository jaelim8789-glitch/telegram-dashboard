"""Broadcast API endpoints — create, retry, cancel, fetch."""

from __future__ import annotations

import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from ..models import Broadcast, BroadcastChild, CreateBroadcastInput
from ..runtime_manager import RuntimeManager
from ..auth_middleware import (
    get_current_user,
    check_daily_send_limit,
    check_account_ownership,
    get_owned_account_ids,
)
from ..admin_platform import AdminPlatform

router = APIRouter()

_idempotency_store: dict[str, tuple[str, float]] = {}
_IDEMPOTENCY_TTL = 86400


@router.post("/broadcast", response_model=Broadcast)
async def create_broadcast(
    input_data: CreateBroadcastInput,
    request: Request,
    current_user: dict = Depends(get_current_user),
    _: bool = Depends(check_daily_send_limit),
):
    manager = RuntimeManager.get_instance()
    await check_account_ownership(input_data.account_id, current_user)

    idempotency_key = request.headers.get("Idempotency-Key")
    if idempotency_key:
        now = time.time()
        stale = [k for k, v in list(_idempotency_store.items()) if v[1] < now]
        for k in stale:
            del _idempotency_store[k]

        if idempotency_key in _idempotency_store:
            existing_id = _idempotency_store[idempotency_key][0]
            all_broadcasts = await manager.get_broadcasts(limit=500)
            for b in all_broadcasts:
                if b.id == existing_id:
                    return b
            del _idempotency_store[idempotency_key]

    try:
        broadcast = await manager.create_broadcast(input_data)
        if idempotency_key:
            _idempotency_store[idempotency_key] = (broadcast.id, time.time() + _IDEMPOTENCY_TTL)
        admin = AdminPlatform.get_instance()
        admin.record_usage(user_id=current_user["id"], messages_sent=len(input_data.recipients))
        return broadcast
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        if idempotency_key:
            _idempotency_store.pop(idempotency_key, None)
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/broadcast/recurring", response_model=list[Broadcast])
async def get_recurring_broadcasts(current_user: dict = Depends(get_current_user)):
    manager = RuntimeManager.get_instance()
    broadcasts = await manager.get_broadcasts(limit=200)
    owned_ids = await get_owned_account_ids(current_user)
    if owned_ids is not None:
        owned_set = set(owned_ids)
        broadcasts = [b for b in broadcasts if b.account_id in owned_set]
    recurring = [b for b in broadcasts if b.recurring_interval_minutes is not None]
    return recurring


@router.get("/broadcast/{broadcast_id}", response_model=Broadcast)
async def get_broadcast(broadcast_id: str, current_user: dict = Depends(get_current_user)):
    manager = RuntimeManager.get_instance()
    try:
        broadcasts = await manager.get_broadcasts(limit=500)
        for b in broadcasts:
            if b.id == broadcast_id:
                await check_account_ownership(b.account_id, current_user)
                return b
        raise HTTPException(status_code=404, detail="Broadcast not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/logs", response_model=list[Broadcast])
async def get_logs(
    account_id: str | None = Query(None),
    status: str | None = Query(None),
    date: str | None = Query(None),
    limit: int = Query(50),
    current_user: dict = Depends(get_current_user),
):
    manager = RuntimeManager.get_instance()
    try:
        if account_id:
            await check_account_ownership(account_id, current_user)
            broadcasts = await manager.get_broadcasts(account_id=account_id, limit=limit)
        else:
            broadcasts = await manager.get_broadcasts(limit=limit)
            owned_ids = await get_owned_account_ids(current_user)
            if owned_ids is not None:
                owned_set = set(owned_ids)
                broadcasts = [b for b in broadcasts if b.account_id in owned_set]
        if status:
            broadcasts = [b for b in broadcasts if b.status == status]
        return broadcasts
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/broadcast/{broadcast_id}/retry", response_model=Broadcast)
async def retry_broadcast(
    broadcast_id: str,
    current_user: dict = Depends(get_current_user),
    _: bool = Depends(check_daily_send_limit),
):
    manager = RuntimeManager.get_instance()
    try:
        all_broadcasts = await manager.get_broadcasts(limit=500)
        for b in all_broadcasts:
            if b.id == broadcast_id:
                await check_account_ownership(b.account_id, current_user)
                runtime = manager.get_runtime(b.account_id)
                if not runtime:
                    raise HTTPException(status_code=404, detail="Account runtime not found")
                b.status = "pending"
                b.error_message = None
                b.failure_info = None
                b.sent_at = None
                await runtime.broadcast_queue.enqueue(b)
                return b
        raise HTTPException(status_code=404, detail="Broadcast not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/broadcast/{broadcast_id}/cancel", response_model=Broadcast)
async def cancel_broadcast(broadcast_id: str, current_user: dict = Depends(get_current_user)):
    manager = RuntimeManager.get_instance()
    try:
        all_broadcasts = await manager.get_broadcasts(limit=500)
        for b in all_broadcasts:
            if b.id == broadcast_id:
                await check_account_ownership(b.account_id, current_user)
                runtime = manager.get_runtime(b.account_id)
                if not runtime:
                    raise HTTPException(status_code=404, detail="Account runtime not found")
                cancelled = runtime.broadcast_queue.cancel_broadcast(broadcast_id)
                if b.status == "pending":
                    b.status = "cancelled"
                    b.cancelled_at = datetime.now(timezone.utc).isoformat()
                if not cancelled and b.status != "cancelled":
                    raise HTTPException(status_code=404, detail="Broadcast not found in queue")
                return b
        raise HTTPException(status_code=404, detail="Broadcast not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/broadcast/dispatch/{broadcast_id}", response_model=Broadcast)
async def send_now(
    broadcast_id: str,
    current_user: dict = Depends(get_current_user),
    _: bool = Depends(check_daily_send_limit),
):
    manager = RuntimeManager.get_instance()
    try:
        all_broadcasts = await manager.get_broadcasts(limit=500)
        for b in all_broadcasts:
            if b.id == broadcast_id:
                await check_account_ownership(b.account_id, current_user)
                runtime = manager.get_runtime(b.account_id)
                if not runtime:
                    raise HTTPException(status_code=404, detail="Account runtime not found")
                b.scheduled_at = None
                b.status = "pending"
                b.error_message = None
                await runtime.broadcast_queue.enqueue(b)
                return b
        raise HTTPException(status_code=404, detail="Broadcast not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/broadcast/{broadcast_id}/pause", response_model=Broadcast)
async def pause_broadcast(broadcast_id: str, current_user: dict = Depends(get_current_user)):
    manager = RuntimeManager.get_instance()
    try:
        all_broadcasts = await manager.get_broadcasts(limit=500)
        for b in all_broadcasts:
            if b.id == broadcast_id:
                await check_account_ownership(b.account_id, current_user)
                runtime = manager.get_runtime(b.account_id)
                if not runtime:
                    raise HTTPException(status_code=404, detail="Account runtime not found")
                b.is_recurring_paused = True
                return b
        raise HTTPException(status_code=404, detail="Broadcast not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/broadcast/{broadcast_id}/unpause", response_model=Broadcast)
async def unpause_broadcast(broadcast_id: str, current_user: dict = Depends(get_current_user)):
    manager = RuntimeManager.get_instance()
    try:
        all_broadcasts = await manager.get_broadcasts(limit=500)
        for b in all_broadcasts:
            if b.id == broadcast_id:
                await check_account_ownership(b.account_id, current_user)
                runtime = manager.get_runtime(b.account_id)
                if not runtime:
                    raise HTTPException(status_code=404, detail="Account runtime not found")
                b.is_recurring_paused = False
                return b
        raise HTTPException(status_code=404, detail="Broadcast not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/broadcast/{broadcast_id}/children", response_model=list[BroadcastChild])
async def get_broadcast_children(
    broadcast_id: str,
    limit: int = Query(50),
    offset: int = Query(0),
    current_user: dict = Depends(get_current_user),
):
    manager = RuntimeManager.get_instance()
    try:
        all_broadcasts = await manager.get_broadcasts(limit=500)
        parent = None
        for b in all_broadcasts:
            if b.id == broadcast_id:
                parent = b
                break
        if not parent:
            raise HTTPException(status_code=404, detail="Broadcast not found")
        await check_account_ownership(parent.account_id, current_user)
        children = [b for b in all_broadcasts if b.recurring_interval_minutes is not None and b.id != broadcast_id]
        children = children[offset:offset + limit]
        return children
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/scheduler/upcoming", response_model=list[Broadcast])
async def get_upcoming_broadcasts(current_user: dict = Depends(get_current_user)):
    manager = RuntimeManager.get_instance()
    broadcasts = await manager.get_broadcasts(limit=200)
    owned_ids = await get_owned_account_ids(current_user)
    if owned_ids is not None:
        owned_set = set(owned_ids)
        broadcasts = [b for b in broadcasts if b.account_id in owned_set]
    upcoming = [b for b in broadcasts if b.status == "pending"]
    return upcoming