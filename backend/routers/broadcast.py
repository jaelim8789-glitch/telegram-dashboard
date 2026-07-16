"""Broadcast API endpoints — create, retry, cancel, fetch."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from ..models import Broadcast, CreateBroadcastInput
from ..runtime_manager import RuntimeManager

router = APIRouter()


@router.post("/broadcast", response_model=Broadcast)
async def create_broadcast(input_data: CreateBroadcastInput):
    manager = RuntimeManager.get_instance()
    try:
        broadcast = await manager.create_broadcast(input_data)
        return broadcast
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/broadcast/recurring", response_model=list[Broadcast])
async def get_recurring_broadcasts():
    manager = RuntimeManager.get_instance()
    broadcasts = await manager.get_broadcasts(limit=200)
    recurring = [b for b in broadcasts if b.recurring_interval_minutes is not None]
    return recurring


@router.get("/broadcast/{broadcast_id}", response_model=Broadcast)
async def get_broadcast(broadcast_id: str):
    manager = RuntimeManager.get_instance()
    try:
        broadcasts = await manager.get_broadcasts(limit=500)
        for b in broadcasts:
            if b.id == broadcast_id:
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
):
    manager = RuntimeManager.get_instance()
    try:
        broadcasts = await manager.get_broadcasts(account_id=account_id, limit=limit)
        if status:
            broadcasts = [b for b in broadcasts if b.status == status]
        return broadcasts
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/broadcast/{broadcast_id}/retry", response_model=Broadcast)
async def retry_broadcast(broadcast_id: str):
    manager = RuntimeManager.get_instance()
    try:
        all_broadcasts = await manager.get_broadcasts(limit=500)
        for b in all_broadcasts:
            if b.id == broadcast_id:
                runtime = manager.get_runtime(b.account_id)
                if not runtime:
                    raise HTTPException(status_code=404, detail="Account runtime not found")
                # Reset status to pending and clear error so the scheduler re-dispatches
                b.status = "pending"
                b.error_message = None
                b.failure_info = None
                b.sent_at = None
                # Re-enqueue via the runtime's broadcast queue
                await runtime.broadcast_queue.enqueue(b)
                return b
        raise HTTPException(status_code=404, detail="Broadcast not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/broadcast/{broadcast_id}/cancel", response_model=Broadcast)
async def cancel_broadcast(broadcast_id: str):
    manager = RuntimeManager.get_instance()
    try:
        all_broadcasts = await manager.get_broadcasts(limit=500)
        for b in all_broadcasts:
            if b.id == broadcast_id:
                # Actually cancel via the owning runtime's BroadcastQueue
                runtime = manager.get_runtime(b.account_id)
                if not runtime:
                    raise HTTPException(status_code=404, detail="Account runtime not found")
                cancelled = runtime.broadcast_queue.cancel_broadcast(broadcast_id)
                if not cancelled:
                    raise HTTPException(status_code=404, detail="Broadcast not found in queue")
                return b
        raise HTTPException(status_code=404, detail="Broadcast not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/broadcast/dispatch/{broadcast_id}", response_model=Broadcast)
async def send_now(broadcast_id: str):
    manager = RuntimeManager.get_instance()
    try:
        all_broadcasts = await manager.get_broadcasts(limit=500)
        for b in all_broadcasts:
            if b.id == broadcast_id:
                runtime = manager.get_runtime(b.account_id)
                if not runtime:
                    raise HTTPException(status_code=404, detail="Account runtime not found")
                # Clear scheduled_at so it sends immediately
                b.scheduled_at = None
                b.status = "pending"
                b.error_message = None
                # Enqueue for immediate dispatch
                await runtime.broadcast_queue.enqueue(b)
                return b
        raise HTTPException(status_code=404, detail="Broadcast not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/broadcast/{broadcast_id}/pause", response_model=Broadcast)
async def pause_broadcast(broadcast_id: str):
    manager = RuntimeManager.get_instance()
    try:
        all_broadcasts = await manager.get_broadcasts(limit=500)
        for b in all_broadcasts:
            if b.id == broadcast_id:
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
async def unpause_broadcast(broadcast_id: str):
    manager = RuntimeManager.get_instance()
    try:
        all_broadcasts = await manager.get_broadcasts(limit=500)
        for b in all_broadcasts:
            if b.id == broadcast_id:
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
async def get_broadcast_children(broadcast_id: str, limit: int = Query(50), offset: int = Query(0)):
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
        # Return all broadcasts with matching recurring_interval_minutes as children
        children = [b for b in all_broadcasts if b.recurring_interval_minutes is not None and b.id != broadcast_id]
        children = children[offset:offset + limit]
        return children
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/scheduler/upcoming", response_model=list[Broadcast])
async def get_upcoming_broadcasts():
    manager = RuntimeManager.get_instance()
    broadcasts = await manager.get_broadcasts(limit=200)
    upcoming = [b for b in broadcasts if b.status == "pending"]
    return upcoming
