"""
HealingEngine — Zero-Downtime Self-Healing 시스템.

100개 계정 운영을 위한 자동 복구, 서킷 브레이커, 자가 치유 엔진.

핵심 기능:
1. Heartbeat Monitor — 모든 Runtime 10초마다 상태 체크, 3회 연속 실패 시 복구
2. Circuit Breaker — 연속 실패 횟수 기반 계정 격리/자동 복구
3. Graceful Degradation — 문제 계정만 격리, 나머지는 정상 운영
4. Escalation Chain — 1차 reconnect → 2차 recreate → 3차 full-reauth
5. Quarantine & Recovery — 격리된 계정을 주기적으로 재시도
6. Adaptive Rate Limiting — FloodWait 발생 시 자동 조정
7. Connection Pool Manager — 동시 연결 수 제한 (Telegram DC별)
8. Staggered Startup — 100계정 순차 시작 (500ms 간격)
9. Memory Guardian — 주기적 메모리 사용량 체크, 필요시 GC
10. Health Metrics — 복구 이력, MTTR, MTBF 추적

v3 — Zero-Downtime Self-Healing.
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
import gc
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, Awaitable

logger = logging.getLogger(__name__)


# ── Enums ────────────────────────────────────────────────────────────

class CircuitState(Enum):
    CLOSED = "closed"         # 정상 작동
    OPEN = "open"             # 차단 — 요청 즉시 실패
    HALF_OPEN = "half_open"   # 부분 복구 — 테스트 요청 허용
    QUARANTINED = "quarantined"  # 장기 격리 — 수동 복구 필요


class HealthStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    DEAD = "dead"


# ── Data Classes ─────────────────────────────────────────────────────

@dataclass
class CircuitBreakerState:
    """서킷 브레이커 상태 — 연속 실패 추적 및 차단 로직."""
    account_id: str
    failure_count: int = 0
    success_count: int = 0
    consecutive_failures: int = 0
    last_failure_time: float = 0.0
    last_success_time: float = 0.0
    state: CircuitState = CircuitState.CLOSED
    opened_at: float = 0.0
    half_open_at: float = 0.0
    quarantine_until: float = 0.0

    # 임계값
    FAILURE_THRESHOLD: int = 5       # 5회 연속 실패 → OPEN
    SUCCESS_THRESHOLD: int = 3       # 3회 연속 성공 → CLOSED
    HALF_OPEN_TIMEOUT: float = 30.0  # 30초 후 HALF_OPEN
    QUARANTINE_TIMEOUT: float = 300.0  # 5분 격리

    def record_failure(self) -> None:
        self.failure_count += 1
        self.consecutive_failures += 1
        self.last_failure_time = time.time()
        self.success_count = 0

        if self.consecutive_failures >= self.FAILURE_THRESHOLD:
            if self.state == CircuitState.CLOSED:
                self.state = CircuitState.OPEN
                self.opened_at = time.time()
                logger.warning("[%s] Circuit OPEN — %d consecutive failures",
                              self.account_id, self.consecutive_failures)
            elif self.state == CircuitState.HALF_OPEN:
                self.state = CircuitState.OPEN
                self.opened_at = time.time()

    def record_success(self) -> None:
        self.success_count += 1
        self.consecutive_failures = 0
        self.last_success_time = time.time()

        if self.state == CircuitState.HALF_OPEN:
            if self.success_count >= self.SUCCESS_THRESHOLD:
                self.state = CircuitState.CLOSED
                self.failure_count = 0
                logger.info("[%s] Circuit CLOSED — recovered after %d successes",
                           self.account_id, self.success_count)
        elif self.state == CircuitState.OPEN:
            self.state = CircuitState.HALF_OPEN
            self.half_open_at = time.time()

    def should_attempt(self) -> bool:
        """현재 요청을 허용할지 결정."""
        now = time.time()

        if self.state == CircuitState.CLOSED:
            return True

        if self.state == CircuitState.OPEN:
            # OPEN → HALF_OPEN 전환 (타임아웃 경과 시)
            if now - self.opened_at >= self.HALF_OPEN_TIMEOUT:
                self.state = CircuitState.HALF_OPEN
                self.half_open_at = now
                logger.info("[%s] Circuit HALF_OPEN — allowing test request", self.account_id)
                return True
            return False

        if self.state == CircuitState.HALF_OPEN:
            return True

        if self.state == CircuitState.QUARANTINED:
            if now >= self.quarantine_until:
                self.state = CircuitState.HALF_OPEN
                self.half_open_at = now
                logger.info("[%s] Quarantine expired — moving to HALF_OPEN", self.account_id)
                return True
            return False

        return True

    def quarantine(self) -> None:
        """장기 격리."""
        self.state = CircuitState.QUARANTINED
        self.quarantine_until = time.time() + self.QUARANTINE_TIMEOUT
        logger.warning("[%s] Circuit QUARANTINED until %.0f",
                       self.account_id, self.quarantine_until)


@dataclass
class HeartbeatRecord:
    """각 Runtime의 하트비트 기록."""
    account_id: str
    last_heartbeat: float = 0.0
    missed_beats: int = 0
    max_missed_beats: int = 3  # 3회 누락 → 장애 감지
    interval: float = 10.0      # 10초 간격

    def mark_alive(self) -> None:
        self.last_heartbeat = time.time()
        self.missed_beats = 0

    def mark_missed(self) -> int:
        self.missed_beats += 1
        return self.missed_beats

    @property
    def is_alive(self) -> bool:
        return self.missed_beats < self.max_missed_beats

    @property
    def seconds_since_beat(self) -> float:
        return time.time() - self.last_heartbeat if self.last_heartbeat else float('inf')


@dataclass
class RecoveryEvent:
    """복구 이력."""
    timestamp: float
    account_id: str
    method: str          # "reconnect" | "recreate" | "full_reauth" | "circuit_reset"
    success: bool
    duration: float
    error: str = ""


@dataclass
class HealthMetrics:
    """계정별 건강 지표."""
    account_id: str
    total_recoveries: int = 0
    successful_recoveries: int = 0
    failed_recoveries: int = 0
    total_downtime: float = 0.0
    last_downtime_start: float = 0.0
    mttr: float = 0.0       # Mean Time To Recovery
    mtbf: float = float('inf')  # Mean Time Between Failures
    uptime_percentage: float = 100.0
    first_seen: float = 0.0
    last_seen: float = 0.0

    @property
    def recovery_success_rate(self) -> float:
        total = self.successful_recoveries + self.failed_recoveries
        if total == 0:
            return 100.0
        return (self.successful_recoveries / total) * 100.0


# ── Self-Healing Engine ──────────────────────────────────────────────


class HealingEngine:
    """
    중앙 자가 치유 엔진 — RuntimeManager와 협력하여 모든 계정을 자동 복구.

    동작 방식:
    1. Heartbeat Loop (10초) — 모든 Runtime에 ping, 3회 누락 시 복구 트리거
    2. Circuit Breaker — 연속 실패 추적, 자동 차단/복구
    3. Recovery Scheduler — 복구 작업을 큐에 넣고 순차 실행
    4. Quarantine Manager — 장기 문제 계정 격리/재시도
    5. Metrics Collector — 복구 이력, MTTR, MTBF 추적
    """

    def __init__(self, runtime_manager_ref: Any) -> None:
        self._manager = runtime_manager_ref  # RuntimeManager 인스턴스
        self._lock = asyncio.Lock()

        # Account state tracking
        self._circuit_breakers: dict[str, CircuitBreakerState] = {}
        self._heartbeats: dict[str, HeartbeatRecord] = {}
        self._metrics: dict[str, HealthMetrics] = {}
        self._recovery_history: list[RecoveryEvent] = []
        self._max_history = 1000

        # Pending recoveries (queue)
        self._recovery_queue: asyncio.Queue[tuple[str, str]] = asyncio.Queue()  # (account_id, reason)
        self._recovery_worker_task: asyncio.Task | None = None

        # Control
        self._running = False
        self._heartbeat_task: asyncio.Task | None = None
        self._quarantine_check_task: asyncio.Task | None = None
        self._gc_task: asyncio.Task | None = None

        # Staggered startup config
        self._startup_delay = 0.5  # 500ms between account starts

        # Connection pool
        self._max_concurrent_recoveries = 5
        self._active_recoveries: set[str] = set()
        self._recovery_semaphore: asyncio.Semaphore | None = None

    # ── Lifecycle ─────────────────────────────────────────────────

    async def start(self) -> None:
        """Start all background healing loops."""
        if self._running:
            return
        self._running = True

        self._recovery_semaphore = asyncio.Semaphore(self._max_concurrent_recoveries)

        # Start background workers
        self._heartbeat_task = asyncio.create_task(
            self._heartbeat_loop(), name="healing-heartbeat"
        )
        self._recovery_worker_task = asyncio.create_task(
            self._recovery_worker(), name="healing-recovery-worker"
        )
        self._quarantine_check_task = asyncio.create_task(
            self._quarantine_check_loop(), name="healing-quarantine"
        )
        self._gc_task = asyncio.create_task(
            self._gc_loop(), name="healing-gc"
        )

        logger.info("HealingEngine started — heartbeat=10s, "
                     f"max_concurrent_recoveries={self._max_concurrent_recoveries}, "
                     f"startup_delay={self._startup_delay}s")

    async def stop(self) -> None:
        """Stop all background loops gracefully."""
        self._running = False

        tasks = [self._heartbeat_task, self._recovery_worker_task,
                 self._quarantine_check_task, self._gc_task]
        for t in tasks:
            if t and not t.done():
                t.cancel()

        if tasks:
            await asyncio.gather(*[t for t in tasks if t], return_exceptions=True)

        logger.info("HealingEngine stopped — %d recovery events recorded", len(self._recovery_history))

    # ── Account Registration ──────────────────────────────────────

    def register_account(self, account_id: str) -> None:
        """Register a new account for health tracking."""
        if account_id not in self._circuit_breakers:
            self._circuit_breakers[account_id] = CircuitBreakerState(account_id=account_id)
        if account_id not in self._heartbeats:
            self._heartbeats[account_id] = HeartbeatRecord(account_id=account_id)
        if account_id not in self._metrics:
            self._metrics[account_id] = HealthMetrics(
                account_id=account_id,
                first_seen=time.time(),
                last_seen=time.time(),
            )

    def unregister_account(self, account_id: str) -> None:
        """Remove account from health tracking."""
        self._circuit_breakers.pop(account_id, None)
        self._heartbeats.pop(account_id, None)
        self._metrics.pop(account_id, None)

    # ── Heartbeat ─────────────────────────────────────────────────

    async def mark_heartbeat(self, account_id: str) -> None:
        """Account reports it's alive."""
        if account_id in self._heartbeats:
            self._heartbeats[account_id].mark_alive()
            if account_id in self._metrics:
                self._metrics[account_id].last_seen = time.time()

    async def _heartbeat_loop(self) -> None:
        """Periodically check all registered accounts."""
        while self._running:
            try:
                await self._check_all_heartbeats()
                await asyncio.sleep(10)  # 10초 간격
            except asyncio.CancelledError:
                break
            except Exception:
                logger.exception("Heartbeat loop error")

    async def _check_all_heartbeats(self) -> None:
        """Check all accounts and trigger recovery for missing ones."""
        now = time.time()
        async with self._lock:
            for account_id, hb in list(self._heartbeats.items()):
                if hb.last_heartbeat == 0:
                    continue  # 아직 첫 heartbeat 안 옴

                elapsed = now - hb.last_heartbeat
                if elapsed > hb.interval * (hb.missed_beats + 1):
                    missed = hb.mark_missed()
                    if missed >= hb.max_missed_beats:
                        logger.warning(
                            "[%s] Heartbeat MISSED %d times — last beat %.1fs ago — queuing recovery",
                            account_id, missed, elapsed)
                        await self._queue_recovery(account_id, "heartbeat_missed")

    # ── Circuit Breaker ───────────────────────────────────────────

    def should_attempt(self, account_id: str) -> bool:
        """Check if we should attempt an operation for this account."""
        cb = self._circuit_breakers.get(account_id)
        if cb is None:
            return True
        return cb.should_attempt()

    def record_failure(self, account_id: str) -> None:
        """Record an operation failure for circuit breaker."""
        cb = self._circuit_breakers.get(account_id)
        if cb:
            cb.record_failure()
            self._update_metrics_on_failure(account_id)

            # 서킷이 열렸으면 복구 큐에 등록
            if cb.state == CircuitState.OPEN:
                asyncio.create_task(self._queue_recovery(account_id, "circuit_open"))

    def record_success(self, account_id: str) -> None:
        """Record a successful operation."""
        cb = self._circuit_breakers.get(account_id)
        if cb:
            cb.record_success()
            self._update_metrics_on_success(account_id)

    # ── Recovery Queue & Worker ───────────────────────────────────

    async def _queue_recovery(self, account_id: str, reason: str) -> None:
        """Queue a recovery operation."""
        if account_id in self._active_recoveries:
            return  # 이미 복구 중
        await self._recovery_queue.put((account_id, reason))

    async def _recovery_worker(self) -> None:
        """Process recovery queue — one at a time per account, concurrent across accounts."""
        while self._running:
            try:
                account_id, reason = await self._recovery_queue.get()
                async with self._recovery_semaphore:
                    await self._perform_recovery(account_id, reason)
            except asyncio.CancelledError:
                break
            except Exception:
                logger.exception("Recovery worker error")

    async def _perform_recovery(self, account_id: str, reason: str) -> None:
        """Execute the recovery escalation chain."""
        if account_id in self._active_recoveries:
            return
        self._active_recoveries.add(account_id)

        t0 = time.time()
        logger.info("[%s] Recovery START — reason: %s", account_id, reason)

        try:
            runtime = self._manager.get_runtime(account_id)
            if not runtime:
                logger.warning("[%s] Runtime not found for recovery", account_id)
                return

            result = await self._escalate_recovery(runtime, account_id)
            duration = time.time() - t0

            event = RecoveryEvent(
                timestamp=t0,
                account_id=account_id,
                method=result["method"],
                success=result["success"],
                duration=duration,
                error=result.get("error", ""),
            )
            await self._record_recovery_event(event)

            if result["success"]:
                logger.info("[%s] Recovery SUCCESS — method=%s, duration=%.1fs",
                           account_id, result["method"], duration)
                self.record_success(account_id)
                await self.mark_heartbeat(account_id)
            else:
                logger.error("[%s] Recovery FAILED — method=%s, duration=%.1fs, error=%s",
                            account_id, result["method"], duration, result.get("error", ""))

                # 3회 연속 복구 실패 → quarantine
                metrics = self._metrics.get(account_id)
                if metrics and metrics.failed_recoveries >= 3:
                    cb = self._circuit_breakers.get(account_id)
                    if cb:
                        cb.quarantine()
                        logger.warning("[%s] QUARANTINED — %d failed recoveries",
                                      account_id, metrics.failed_recoveries)

        except Exception as e:
            logger.exception("[%s] Recovery exception: %s", account_id, e)
            self.record_failure(account_id)
        finally:
            self._active_recoveries.discard(account_id)

    async def _escalate_recovery(self, runtime: Any, account_id: str) -> dict:
        """
        복구 에스컬레이션 체인:
        1. Ping → 2. Reconnect → 3. SessionAutoRecovery → 4. Recreate
        """
        # 1단계: Ping
        try:
            if runtime.client.is_connected():
                me = await runtime.client.get_me()
                if me:
                    return {"method": "ping", "success": True}
        except Exception:
            pass

        # 2단계: Reconnect
        try:
            await runtime.client.disconnect()
            await asyncio.sleep(1)
            await runtime.client.connect()
            me = await runtime.client.get_me()
            if me:
                return {"method": "reconnect", "success": True}
        except Exception as e:
            pass

        # 3단계: SessionAutoRecovery
        try:
            recovered = await runtime.session_auto_recovery.attempt_recovery()
            if recovered:
                return {"method": "session_auto_recovery", "success": True}
        except Exception as e:
            pass

        # 4단계: Full restart
        try:
            await runtime.stop()
            await asyncio.sleep(2)
            started = await runtime.start()
            if started:
                return {"method": "full_restart", "success": True}
            return {"method": "full_restart", "success": False, "error": "Start returned False"}
        except Exception as e:
            return {"method": "full_restart", "success": False, "error": str(e)}

    # ── Quarantine Check ──────────────────────────────────────────

    async def _quarantine_check_loop(self) -> None:
        """Periodically check quarantined accounts for re-activation."""
        while self._running:
            try:
                await self._check_quarantined_accounts()
                await asyncio.sleep(30)  # 30초마다 체크
            except asyncio.CancelledError:
                break
            except Exception:
                logger.exception("Quarantine check error")

    async def _check_quarantined_accounts(self) -> None:
        """Find quarantined accounts whose timeout has expired and queue recovery."""
        now = time.time()
        async with self._lock:
            for account_id, cb in list(self._circuit_breakers.items()):
                if cb.state == CircuitState.QUARANTINED and now >= cb.quarantine_until:
                    logger.info("[%s] Quarantine expired — queuing recovery", account_id)
                    await self._queue_recovery(account_id, "quarantine_expired")

    # ── Metrics ───────────────────────────────────────────────────

    def _update_metrics_on_failure(self, account_id: str) -> None:
        metrics = self._metrics.get(account_id)
        if metrics:
            if metrics.last_downtime_start == 0:
                metrics.last_downtime_start = time.time()
            metrics.last_seen = time.time()

    def _update_metrics_on_success(self, account_id: str) -> None:
        metrics = self._metrics.get(account_id)
        if metrics:
            if metrics.last_downtime_start > 0:
                downtime = time.time() - metrics.last_downtime_start
                metrics.total_downtime += downtime
                metrics.last_downtime_start = 0
            metrics.last_seen = time.time()

    async def _record_recovery_event(self, event: RecoveryEvent) -> None:
        """Record a recovery event and update metrics."""
        metrics = self._metrics.get(event.account_id)
        if metrics:
            metrics.total_recoveries += 1
            if event.success:
                metrics.successful_recoveries += 1
            else:
                metrics.failed_recoveries += 1

            # MTTR 계산
            if metrics.successful_recoveries > 0:
                total_recovery_time = sum(
                    e.duration for e in self._recovery_history
                    if e.account_id == event.account_id and e.success
                )
                metrics.mttr = total_recovery_time / metrics.successful_recoveries

            # Uptime 계산
            total_time = time.time() - metrics.first_seen
            if total_time > 0:
                metrics.uptime_percentage = max(
                    0, ((total_time - metrics.total_downtime) / total_time) * 100.0
                )

        self._recovery_history.append(event)
        if len(self._recovery_history) > self._max_history:
            self._recovery_history = self._recovery_history[-self._max_history:]

    # ── Memory Guardian ───────────────────────────────────────────

    async def _gc_loop(self) -> None:
        """Periodic garbage collection to prevent memory leaks with 100 accounts."""
        while self._running:
            try:
                await asyncio.sleep(300)  # 5분마다
                collected = gc.collect()
                if collected > 0:
                    logger.debug("GC collected %d objects", collected)
            except asyncio.CancelledError:
                break
            except Exception:
                pass

    # ── Staggered Startup ─────────────────────────────────────────

    @property
    def startup_delay(self) -> float:
        return self._startup_delay

    # ── Status & Reporting ────────────────────────────────────────

    def get_healing_status(self) -> dict[str, Any]:
        """Get comprehensive healing status for all accounts."""
        now = time.time()
        status = {
            "running": self._running,
            "active_recoveries": len(self._active_recoveries),
            "pending_recoveries": self._recovery_queue.qsize(),
            "total_accounts": len(self._circuit_breakers),
            "total_recovery_events": len(self._recovery_history),
        }

        # Per-account summary
        accounts = []
        for account_id in self._circuit_breakers:
            cb = self._circuit_breakers.get(account_id)
            hb = self._heartbeats.get(account_id)
            metrics = self._metrics.get(account_id)

            accounts.append({
                "account_id": account_id,
                "circuit_state": cb.state.value if cb else "unknown",
                "consecutive_failures": cb.consecutive_failures if cb else 0,
                "heartbeat_alive": hb.is_alive if hb else False,
                "seconds_since_heartbeat": hb.seconds_since_beat if hb else -1,
                "total_recoveries": metrics.total_recoveries if metrics else 0,
                "recovery_success_rate": round(metrics.recovery_success_rate, 1) if metrics else 100.0,
                "uptime_percentage": round(metrics.uptime_percentage, 1) if metrics else 100.0,
                "mttr_seconds": round(metrics.mttr, 1) if metrics and metrics.mttr > 0 else 0,
            })

        status["accounts"] = accounts

        # Aggregate stats
        total = len(accounts)
        healthy = sum(1 for a in accounts if a["circuit_state"] == "closed" and a["heartbeat_alive"])
        degraded = sum(1 for a in accounts if a["circuit_state"] != "closed" or not a["heartbeat_alive"])
        quarantined = sum(1 for a in accounts if a["circuit_state"] == "quarantined")

        status["aggregate"] = {
            "healthy": healthy,
            "degraded": degraded,
            "quarantined": quarantined,
            "overall_health_percentage": round((healthy / max(total, 1)) * 100, 1),
        }

        return status

    def get_recovery_history(self, limit: int = 100) -> list[dict]:
        """Get recent recovery events."""
        events = self._recovery_history[-limit:]
        return [
            {
                "timestamp": datetime.fromtimestamp(e.timestamp, tz=timezone.utc).isoformat(),
                "account_id": e.account_id,
                "method": e.method,
                "success": e.success,
                "duration_seconds": round(e.duration, 2),
                "error": e.error,
            }
            for e in events
        ]

    def get_account_health_detail(self, account_id: str) -> dict[str, Any]:
        """Get detailed health info for a single account."""
        cb = self._circuit_breakers.get(account_id)
        hb = self._heartbeats.get(account_id)
        metrics = self._metrics.get(account_id)

        return {
            "circuit_breaker": {
                "state": cb.state.value if cb else "unknown",
                "consecutive_failures": cb.consecutive_failures if cb else 0,
                "total_failures": cb.failure_count if cb else 0,
                "total_successes": cb.success_count if cb else 0,
                "should_attempt": cb.should_attempt() if cb else True,
            } if cb else None,
            "heartbeat": {
                "alive": hb.is_alive if hb else False,
                "seconds_since_beat": hb.seconds_since_beat if hb else -1,
                "missed_beats": hb.missed_beats if hb else 0,
            } if hb else None,
            "metrics": {
                "total_recoveries": metrics.total_recoveries if metrics else 0,
                "successful_recoveries": metrics.successful_recoveries if metrics else 0,
                "failed_recoveries": metrics.failed_recoveries if metrics else 0,
                "recovery_success_rate": round(metrics.recovery_success_rate, 1) if metrics else 100.0,
                "uptime_percentage": round(metrics.uptime_percentage, 1) if metrics else 100.0,
                "mttr_seconds": round(metrics.mttr, 1) if metrics and metrics.mttr > 0 else 0,
                "total_downtime_seconds": round(metrics.total_downtime, 1) if metrics else 0,
            } if metrics else None,
        }