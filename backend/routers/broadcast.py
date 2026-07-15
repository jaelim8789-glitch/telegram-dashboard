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
    raise HTTPException(status_code=404, detail="Broadcast not found")


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
    raise HTTPException(status_code=400, detail="Retry not yet implemented")


@router.post("/broadcast/{broadcast_id}/cancel", response_model=Broadcast)
async def cancel_broadcast(broadcast_id: str):
    raise HTTPException(status_code=400, detail="Cancel not yet implemented")


@router.post("/broadcast/dispatch/{broadcast_id}", response_model=Broadcast)
async def send_now(broadcast_id: str):
    raise HTTPException(status_code=400, detail="Send-now not yet implemented")


@router.get("/scheduler/upcoming", response_model=list[Broadcast])
async def get_upcoming_broadcasts():
    manager = RuntimeManager.get_instance()
    broadcasts = await manager.get_broadcasts(limit=200)
    upcoming = [b for b in broadcasts if b.status in ("pending", "scheduled_at")]
    return upcoming