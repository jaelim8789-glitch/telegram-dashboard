"""Broadcast API endpoints — create, retry, cancel, fetch."""

from __future__ import annotations

import json
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request, UploadFile, Form, File
from starlette.responses import JSONResponse

from ..media import safe_filename
from ..models import Broadcast, BroadcastChild, CreateBroadcastInput
from ..runtime_manager import RuntimeManager

router = APIRouter()

# ── Media upload directory ────────────────────────────────────────────

_MEDIA_DIR = os.environ.get("TELEMON_MEDIA_DIR", "data/media")


def _ensure_media_dir() -> None:
    os.makedirs(_MEDIA_DIR, exist_ok=True)


async def _save_upload(file: UploadFile) -> str:
    """Save an uploaded file to the media directory and return its path."""
    _ensure_media_dir()
    ext = safe_filename(file.filename, file.content_type)
    # Use file extension from safe_filename
    if "." in (ext or ""):
        _, ext_part = ext.rsplit(".", 1)
        ext = f".{ext_part}"
    else:
        ext = ""
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = os.path.join(_MEDIA_DIR, filename)
    content = await file.read()
    with open(dest, "wb") as f:
        f.write(content)
    return dest


# In-memory idempotency store: idempotency_key -> broadcast_id
# Expires after 24 hours to prevent memory leak.
_idempotency_store: dict[str, tuple[str, float]] = {}  # key -> (broadcast_id, expires_at)
_IDEMPOTENCY_TTL = 86400  # 24 hours


def _parse_bool(value: str | None) -> bool:
    """Parse a string as bool for form fields."""
    if value is None:
        return False
    return value.lower() in ("true", "1", "yes")


@router.post("/broadcast", response_model=Broadcast)
async def create_broadcast(
    request: Request,
    # Form fields (for multipart upload with image)
    account_id: str | None = Form(None),
    message: str | None = Form(None),
    recipients: str | None = Form(None),  # JSON string
    scheduled_at: str | None = Form(None),
    recurring_interval_minutes: int | None = Form(None),
    delivery_mode: str | None = Form(None),
    delay_seconds: int | None = Form(None),
    reply_to_message_id: int | None = Form(None),
    inline_buttons: str | None = Form(None),  # JSON string
    image: UploadFile | None = File(None),
):
    """Create a new broadcast, optionally with an image/video attachment.

    Accepts both:
    - JSON body (standard CreateBroadcastInput) for broadcasts without media
    - multipart/form-data for broadcasts with image/video upload
    """
    manager = RuntimeManager.get_instance()

    # ── Parse input ───────────────────────────────────────────────
    # Detect if the request is JSON or multipart by checking content-type
    content_type = request.headers.get("content-type", "").lower()

    if "multipart/form-data" in content_type:
        # Form data with optional file
        if account_id is None:
            raise HTTPException(status_code=400, detail="account_id is required")
        parsed_recipients: list[str] = json.loads(recipients) if recipients else []
        parsed_inline_buttons: list[dict[str, str]] = json.loads(inline_buttons) if inline_buttons else []

        media_path = None
        if image and image.filename:
            media_path = await _save_upload(image)

        input_data = CreateBroadcastInput(
            account_id=account_id,
            message=message or "",
            recipients=parsed_recipients,
            scheduled_at=scheduled_at,
            recurring_interval_minutes=recurring_interval_minutes,
            delivery_mode=delivery_mode,
            delay_seconds=delay_seconds,
            reply_to_message_id=reply_to_message_id,
            image=media_path,
        )
        if parsed_inline_buttons:
            from ..models import InlineButton
            input_data.inline_buttons = [
                InlineButton(label=b.get("label", ""), url=b.get("url", ""))
                for b in parsed_inline_buttons
            ]
    else:
        # JSON body
        body = await request.json()
        input_data = CreateBroadcastInput(**body)

    # Idempotency-Key check — prevents duplicate broadcasts on network retry
    idempotency_key = request.headers.get("Idempotency-Key")
    if idempotency_key:
        now = time.time()
        # Prune expired keys
        stale = [k for k, v in list(_idempotency_store.items()) if v[1] < now]
        for k in stale:
            del _idempotency_store[k]

        if idempotency_key in _idempotency_store:
            existing_id = _idempotency_store[idempotency_key][0]
            # Return the already-created broadcast
            all_broadcasts = await manager.get_broadcasts(limit=500)
            for b in all_broadcasts:
                if b.id == existing_id:
                    return b
            # Stale entry — remove and proceed normally
            del _idempotency_store[idempotency_key]

    try:
        broadcast = await manager.create_broadcast(input_data)
        # Record the idempotency key for 24h
        if idempotency_key:
            _idempotency_store[idempotency_key] = (broadcast.id, time.time() + _IDEMPOTENCY_TTL)
        return broadcast
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        # On error, clear idempotency key so the frontend can retry
        if idempotency_key:
            _idempotency_store.pop(idempotency_key, None)
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
                # After cancel_broadcast() — even if it was queued via _cancelled_set —
                # update the broadcast object's status so the response is consistent.
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
