"""
Runtime Inspector API — provides deep introspection into each AccountRuntime.

Endpoints:
  GET  /api/runtime/inspector/{account_id}  — Full runtime snapshot
  GET  /api/runtime/inspector/summary        — Summary of all runtimes
  POST /api/runtime/inspector/{account_id}/recover — Trigger session recovery
  POST /api/runtime/inspector/{account_id}/restart  — Restart a runtime
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException

from ..runtime_manager import RuntimeManager
from ..auth_middleware import get_current_user, require_admin_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/runtime/inspector/{account_id}")
async def get_runtime_inspector(
    account_id: str,
    current_user: dict = Depends(require_admin_user),
):
    manager = RuntimeManager.get_instance()
    runtime = manager.get_runtime(account_id)
    if not runtime:
        raise HTTPException(status_code=404, detail="Runtime not found")
    return runtime.get_runtime_inspector_data()


@router.get("/runtime/inspector")
async def get_runtime_inspector_summary(
    current_user: dict = Depends(require_admin_user),
):
    manager = RuntimeManager.get_instance()
    runtimes = manager.get_all_runtimes()
    return {
        "total": len(runtimes),
        "active": sum(1 for r in runtimes if r.is_running()),
        "healthy": sum(1 for r in runtimes if r.health_monitor._state.status == "healthy"),
        "unauthorized": sum(1 for r in runtimes if r.health_monitor._state.status == "unauthorized"),
        "rate_limited": sum(1 for r in runtimes if r.health_monitor._state.status == "rate_limited"),
        "banned": sum(1 for r in runtimes if r.health_monitor._state.status == "banned"),
        "error": sum(1 for r in runtimes if r.health_monitor._state.status == "error"),
        "runtimes": [
            {
                "account_id": r.account_id,
                "phone": r.phone,
                "name": r._name,
                "status": r._status,
                "running": r.is_running(),
                "health_status": r.health_monitor._state.status,
                "has_session": r.health_monitor._state.has_session,
                "uptime_seconds": r.get_runtime_inspector_data()["uptime_seconds"],
                "today_sent": r._today_sent,
                "group_count": r.group_cache.count(),
                "active_broadcasts": len(r.broadcast_queue.get_active()),
                "queue_size": r.broadcast_queue._queue.qsize(),
                "consecutive_failures": r.health_monitor._state.consecutive_failures,
                "recovery_attempts": r.health_monitor._state.recovery_attempts,
                "last_recovery_result": r.health_monitor._state.last_recovery_result,
            }
            for r in runtimes
        ],
    }


@router.post("/runtime/inspector/{account_id}/recover")
async def trigger_session_recovery(
    account_id: str,
    current_user: dict = Depends(require_admin_user),
):
    manager = RuntimeManager.get_instance()
    runtime = manager.get_runtime(account_id)
    if not runtime:
        raise HTTPException(status_code=404, detail="Runtime not found")
    recovered = await runtime.session_auto_recovery.attempt_recovery()
    return {
        "account_id": account_id,
        "recovered": recovered,
        "health_status": runtime.health_monitor._state.status,
    }


@router.post("/runtime/inspector/{account_id}/restart")
async def restart_runtime(
    account_id: str,
    current_user: dict = Depends(require_admin_user),
):
    manager = RuntimeManager.get_instance()
    runtime = manager.get_runtime(account_id)
    if not runtime:
        raise HTTPException(status_code=404, detail="Runtime not found")
    await runtime.stop()
    started = await runtime.start()
    if not started:
        runtime._running = True
        runtime._status = "inactive"
        runtime.health_monitor.set_session_status(False)
        runtime.scheduler.start()
        runtime.broadcast_queue.start()
    return {
        "account_id": account_id,
        "restarted": True,
        "authenticated": started,
    }