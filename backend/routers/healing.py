"""
HealingEngine API — Zero-Downtime Self-Healing 시스템 상태 및 제어 엔드포인트.

Endpoints:
  GET  /api/healing/status          — 전체 Healing Engine 상태 요약
  GET  /api/healing/history         — 최근 복구 이력
  GET  /api/healing/accounts/{id}   — 특정 계정 상세 건강 정보
  POST /api/healing/accounts/{id}/recover  — 수동 복구 트리거
  POST /api/healing/accounts/{id}/quarantine — 계정 강제 격리
  POST /api/healing/accounts/{id}/reset     — 서킷 브레이커 리셋
  POST /api/healing/recover-all     — 모든 문제 계정 일괄 복구

v3 — Zero-Downtime Self-Healing.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from ..runtime_manager import RuntimeManager
from ..healing_engine import CircuitState

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/healing/status")
async def get_healing_status():
    """Get comprehensive healing status for all accounts."""
    manager = RuntimeManager.get_instance()
    return manager.healing_engine.get_healing_status()


@router.get("/healing/history")
async def get_healing_history(limit: int = 100):
    """Get recent recovery events."""
    manager = RuntimeManager.get_instance()
    return {
        "total_events": len(manager.healing_engine._recovery_history),
        "events": manager.healing_engine.get_recovery_history(limit=limit),
    }


@router.get("/healing/accounts/{account_id}")
async def get_account_healing_detail(account_id: str):
    """Get detailed healing info for a single account."""
    manager = RuntimeManager.get_instance()
    detail = manager.healing_engine.get_account_health_detail(account_id)
    if not detail.get("circuit_breaker") and not detail.get("heartbeat"):
        raise HTTPException(status_code=404, detail="Account not tracked by HealingEngine")
    return detail


@router.post("/healing/accounts/{account_id}/recover")
async def trigger_healing_recovery(account_id: str):
    """Manually trigger healing recovery for an account."""
    manager = RuntimeManager.get_instance()
    runtime = manager.get_runtime(account_id)
    if not runtime:
        raise HTTPException(status_code=404, detail="Runtime not found")

    cb = manager.healing_engine._circuit_breakers.get(account_id)
    if cb:
        cb.state = CircuitState.HALF_OPEN
        cb.consecutive_failures = 0

    await manager.healing_engine._queue_recovery(account_id, "manual_trigger")

    return {
        "account_id": account_id,
        "message": "Recovery queued",
        "current_state": cb.state.value if cb else "unknown",
    }


@router.post("/healing/accounts/{account_id}/quarantine")
async def quarantine_account(account_id: str):
    """Force quarantine an account."""
    manager = RuntimeManager.get_instance()
    cb = manager.healing_engine._circuit_breakers.get(account_id)
    if not cb:
        raise HTTPException(status_code=404, detail="Account not tracked by HealingEngine")

    cb.quarantine()
    return {
        "account_id": account_id,
        "state": cb.state.value,
        "quarantine_until": cb.quarantine_until,
    }


@router.post("/healing/accounts/{account_id}/reset")
async def reset_circuit_breaker(account_id: str):
    """Reset circuit breaker for an account (force CLOSED)."""
    manager = RuntimeManager.get_instance()
    cb = manager.healing_engine._circuit_breakers.get(account_id)
    if not cb:
        raise HTTPException(status_code=404, detail="Account not tracked by HealingEngine")

    cb.state = CircuitState.CLOSED
    cb.consecutive_failures = 0
    cb.failure_count = 0
    cb.success_count = 0

    return {
        "account_id": account_id,
        "state": "closed",
        "message": "Circuit breaker reset",
    }


@router.post("/healing/recover-all")
async def recover_all_accounts():
    """Queue recovery for all degraded/quarantined accounts."""
    manager = RuntimeManager.get_instance()
    status = manager.healing_engine.get_healing_status()
    queued = 0

    for acct in status.get("accounts", []):
        if acct["circuit_state"] in ("open", "quarantined") or not acct["heartbeat_alive"]:
            await manager.healing_engine._queue_recovery(acct["account_id"], "recover_all")
            queued += 1

    return {
        "message": f"Queued recovery for {queued} accounts",
        "queued": queued,
        "total_accounts": status.get("total_accounts", 0),
    }