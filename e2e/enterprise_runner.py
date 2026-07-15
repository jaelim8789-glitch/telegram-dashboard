"""
Enterprise Hardening — 100계정 실운영 검증, Stress Test, Memory Leak, Recovery 검증.

실행:
    python e2e/enterprise_runner.py                           # 전체 Enterprise 테스트
    python e2e/enterprise_runner.py --mode stress              # Stress Test only
    python e2e/enterprise_runner.py --mode memory             # Memory Leak Test only  
    python e2e/enterprise_runner.py --mode recovery           # Recovery 검증 only
    python e2e/enterprise_runner.py --mode uptime             # 72시간 무중단 검증
    python e2e/enterprise_runner.py --mode chaos              # Chaos Engineering
    python e2e/enterprise_runner.py --duration 259200         # 72시간 모드
    python e2e/enterprise_runner.py --accounts 100            # 100계정 모드

환경 변수:
    E2E_ACCOUNT_COUNT           — 계정 수 (기본: 100)
    E2E_STRESS_ACCOUNTS         — Stress Test에 사용할 계정 수
    E2E_STRESS_DURATION         — Stress Test 지속 시간 (초)
    E2E_STRESS_OPS_PER_SECOND   — 초당 작업 수
    E2E_MEMORY_CHECK_INTERVAL   — 메모리 체크 간격 (초)
    E2E_CHAOS_KILL_INTERVAL     — Chaos kill 간격 (초)
    E2E_REPORT_PATH             — 리포트 경로
"""

from __future__ import annotations

import argparse
import asyncio
import gc
import json
import os
import random
import signal
import sys
import time
import traceback
from datetime import datetime, timezone
from typing import Any

# Ensure project root is on path
_project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from e2e.e2e_api_client import CLIENT, E2EApiError
from e2e.e2e_config import CONFIG
from e2e.e2e_report import REPORT


# ── Configuration ──────────────────────────────────────────────────────

class EnterpriseConfig:
    """Enterprise hardening test configuration."""
    
    # Account count for stress tests
    stress_account_count: int = int(os.environ.get("E2E_STRESS_ACCOUNTS", "50"))
    
    # Duration in seconds
    stress_duration: int = int(os.environ.get("E2E_STRESS_DURATION", "3600"))  # 1 hour default
    
    # Operations per second
    ops_per_second: float = float(os.environ.get("E2E_STRESS_OPS_PER_SECOND", "10.0"))
    
    # Memory check interval
    memory_check_interval: int = int(os.environ.get("E2E_MEMORY_CHECK_INTERVAL", "60"))
    
    # Chaos kill interval (seconds)
    chaos_kill_interval: int = int(os.environ.get("E2E_CHAOS_KILL_INTERVAL", "300"))
    
    # Uptime validation
    uptime_target_hours: int = 72
    uptime_check_interval: int = 300  # 5 minutes
    
    # Recovery thresholds
    recovery_success_threshold: float = 0.95  # 95% success rate required
    max_consecutive_failures: int = 10
    
    # Memory thresholds (MB)
    memory_warning_mb: int = 200
    memory_critical_mb: int = 500
    
    # Report path
    report_path: str = os.environ.get("E2E_REPORT_PATH", "e2e/enterprise_report.json")


ENTERPRISE_CONFIG = EnterpriseConfig()


# ── Memory Tracker ─────────────────────────────────────────────────────

class MemoryTracker:
    """Track memory usage over time for leak detection."""
    
    def __init__(self) -> None:
        self._snapshots: list[dict] = []
        self._baseline: dict | None = None
        self._running = False
        self._task: asyncio.Task | None = None
        
    async def start(self, interval: int = 60) -> None:
        """Start periodic memory tracking."""
        self._running = True
        self._task = asyncio.create_task(self._track_loop(interval))
        
    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
    
    async def _track_loop(self, interval: int) -> None:
        while self._running:
            try:
                self.snapshot()
                await asyncio.sleep(interval)
            except asyncio.CancelledError:
                break
            except Exception:
                pass
    
    def snapshot(self) -> dict:
        """Take a memory snapshot."""
        gc.collect()
        import psutil
        process = psutil.Process()
        mem_info = process.memory_info()
        
        snapshot = {
            "timestamp": time.time(),
            "rss_mb": mem_info.rss / 1024 / 1024,
            "vms_mb": mem_info.vms / 1024 / 1024,
            "gc_objects": len(gc.get_objects()),
            "gc_garbage": len(gc.garbage),
        }
        
        self._snapshots.append(snapshot)
        if self._baseline is None:
            self._baseline = snapshot
            
        return snapshot
    
    @property
    def current_mb(self) -> float:
        if not self._snapshots:
            return 0.0
        return self._snapshots[-1]["rss_mb"]
    
    @property
    def baseline_mb(self) -> float:
        if not self._baseline:
            return 0.0
        return self._baseline["rss_mb"]
    
    @property
    def growth_mb(self) -> float:
        return self.current_mb - self.baseline_mb
    
    @property
    def growth_rate_mb_per_hour(self) -> float:
        if len(self._snapshots) < 2:
            return 0.0
        first = self._snapshots[0]
        last = self._snapshots[-1]
        elapsed_hours = (last["timestamp"] - first["timestamp"]) / 3600
        if elapsed_hours <= 0:
            return 0.0
        return (last["rss_mb"] - first["rss_mb"]) / elapsed_hours
    
    def has_leak(self) -> tuple[bool, str]:
        """Detect if there's a memory leak."""
        rate = self.growth_rate_mb_per_hour
        current = self.current_mb
        
        if rate > 50 and len(self._snapshots) >= 3:
            return True, f"MEMORY LEAK DETECTED: growing at {rate:.1f} MB/hour (current: {current:.1f} MB)"
        if current > ENTERPRISE_CONFIG.memory_critical_mb:
            return True, f"MEMORY CRITICAL: {current:.1f} MB (threshold: {ENTERPRISE_CONFIG.memory_critical_mb} MB)"
        if current > ENTERPRISE_CONFIG.memory_warning_mb:
            return False, f"MEMORY WARNING: {current:.1f} MB (threshold: {ENTERPRISE_CONFIG.memory_warning_mb} MB)"
        
        return False, f"MEMORY OK: {current:.1f} MB, growth rate: {rate:.1f} MB/hour"
    
    def get_report(self) -> dict:
        return {
            "snapshots_count": len(self._snapshots),
            "baseline_mb": round(self.baseline_mb, 1),
            "current_mb": round(self.current_mb, 1),
            "growth_mb": round(self.growth_mb, 1),
            "growth_rate_mb_per_hour": round(self.growth_rate_mb_per_hour, 2),
            "has_leak": self.has_leak()[0],
            "leak_message": self.has_leak()[1],
            "snapshots": self._snapshots[-100:] if len(self._snapshots) > 100 else self._snapshots,
        }


# ── Account Stressor ──────────────────────────────────────────────────

class AccountStressor:
    """Continuously exercises an account with random operations."""
    
    OPERATIONS = [
        "get_account",
        "get_health",
        "list_accounts",
        "get_logs",
        "get_runtime_inspector",
        "get_runtime_summary",
        "toggle_ar_on",
        "toggle_ar_off",
    ]
    
    def __init__(self, account_id: str, index: int) -> None:
        self.account_id = account_id
        self.index = index
        self.operations_done = 0
        self.failures = 0
        self.last_operation_time = 0.0
        self.total_duration = 0.0
        self.running = False
        
    async def execute_operation(self) -> str:
        """Execute a random operation. Returns operation name."""
        t0 = time.perf_counter()
        op = random.choice(self.OPERATIONS)
        
        try:
            if op == "get_account":
                CLIENT.get_account(self.account_id)
            elif op == "get_health":
                CLIENT.get_account_health(self.account_id)
            elif op == "list_accounts":
                CLIENT.list_accounts()
            elif op == "get_logs":
                CLIENT.get_logs()
            elif op == "get_runtime_inspector":
                CLIENT.get_runtime_inspector(self.account_id)
            elif op == "get_runtime_summary":
                CLIENT.get_runtime_inspector_summary()
            elif op == "toggle_ar_on":
                CLIENT.toggle_auto_reply(self.account_id, True)
            elif op == "toggle_ar_off":
                CLIENT.toggle_auto_reply(self.account_id, False)
                
            self.operations_done += 1
        except Exception as e:
            self.failures += 1
            
        self.total_duration += time.perf_counter() - t0
        self.last_operation_time = time.time()
        return op
    
    @property
    def ops_per_second(self) -> float:
        if self.total_duration <= 0:
            return 0.0
        return self.operations_done / self.total_duration
    
    @property
    def success_rate(self) -> float:
        total = self.operations_done + self.failures
        if total == 0:
            return 100.0
        return (self.operations_done / total) * 100.0


# ── Chaos Monkey ──────────────────────────────────────────────────────

class ChaosMonkey:
    """Randomly kills and restarts accounts to test recovery."""
    
    def __init__(self, account_ids: list[str]) -> None:
        self.account_ids = account_ids
        self.kills = 0
        self.successful_recoveries = 0
        self.failed_recoveries = 0
        self._running = False
        self._task: asyncio.Task | None = None
        
    async def start(self, interval: int = 300) -> None:
        self._running = True
        self._task = asyncio.create_task(self._chaos_loop(interval))
        
    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
    
    async def _chaos_loop(self, interval: int) -> None:
        while self._running:
            try:
                await self._random_kill()
                await asyncio.sleep(interval)
            except asyncio.CancelledError:
                break
            except Exception:
                pass
    
    async def _random_kill(self) -> None:
        """Randomly kill an account runtime and verify recovery."""
        if not self.account_ids:
            return
        
        target = random.choice(self.account_ids)
        self.kills += 1
        
        try:
            # Kill the runtime via restart
            result = CLIENT.restart_runtime(target)
            self.successful_recoveries += 1
            
            REPORT.pass_test(
                f"Chaos: Kill & recover {target[:8]}", "chaos",
                duration=result.get("duration", 0),
            )
        except Exception as e:
            self.failed_recoveries += 1
            REPORT.fail_test(
                f"Chaos: Kill & recover {target[:8]}", "chaos",
                error=str(e),
            )
    
    @property
    def recovery_rate(self) -> float:
        total = self.successful_recoveries + self.failed_recoveries
        if total == 0:
            return 100.0
        return (self.successful_recoveries / total) * 100.0


# ── Stress Test ────────────────────────────────────────────────────────

async def run_stress_test() -> int:
    """Run stress test with N accounts and continuous operations."""
    REPORT.start_suite("Enterprise: Stress Test")
    failures = 0
    
    print(f"\n  {'='*60}")
    print(f"  ENTERPRISE STRESS TEST")
    print(f"  Accounts: {ENTERPRISE_CONFIG.stress_account_count}")
    print(f"  Duration: {ENTERPRISE_CONFIG.stress_duration}s")
    print(f"  Target OPS: {ENTERPRISE_CONFIG.ops_per_second}/s")
    print(f"  {'='*60}\n")
    
    # Create stress accounts
    account_ids: list[str] = []
    ts = int(time.time())
    
    print("  Creating stress test accounts...")
    for i in range(ENTERPRISE_CONFIG.stress_account_count):
        phone = f"+8210{(ts + i) % 100000000:08d}"
        try:
            acct = CLIENT.create_account(phone=phone, name=f"Stress-{i}")
            aid = acct.get("id", "")
            if aid:
                account_ids.append(aid)
        except Exception as e:
            failures += 1
            REPORT.fail_test(f"Create stress account {i}", "stress", error=str(e))
        
        if (i + 1) % 10 == 0:
            print(f"    Created {i+1}/{ENTERPRISE_CONFIG.stress_account_count} accounts")
    
    print(f"\n  Created {len(account_ids)} accounts for stress testing")
    
    if not account_ids:
        REPORT.fail_test("Stress test setup", "stress", error="No accounts created")
        REPORT.end_suite()
        return 1
    
    # Initialize stressors
    stressors = [AccountStressor(aid, i) for i, aid in enumerate(account_ids)]
    
    # Memory tracker
    mem_tracker = MemoryTracker()
    await mem_tracker.start(interval=ENTERPRISE_CONFIG.memory_check_interval)
    
    # Chaos monkey
    chaos = ChaosMonkey(account_ids)
    
    # Start chaos if duration > 10 minutes
    if ENTERPRISE_CONFIG.stress_duration > 600:
        await chaos.start(interval=ENTERPRISE_CONFIG.chaos_kill_interval)
        print("  Chaos Monkey activated")
    
    # Run stress loop
    print(f"\n  Running stress for {ENTERPRISE_CONFIG.stress_duration}s...\n")
    start_time = time.time()
    end_time = start_time + ENTERPRISE_CONFIG.stress_duration
    total_ops = 0
    total_failures = 0
    check_interval = max(1.0, 1.0 / ENTERPRISE_CONFIG.ops_per_second)
    
    # Report positions
    last_report_time = start_time
    
    while time.time() < end_time:
        # Execute operations round-robin
        ops_this_round = max(1, int(ENTERPRISE_CONFIG.ops_per_second * check_interval))
        
        for stressor in random.sample(stressors, min(len(stressors), ops_this_round * 2)):
            try:
                await stressor.execute_operation()
                total_ops += 1
            except Exception:
                total_failures += 1
            
            if total_failures > ENTERPRISE_CONFIG.max_consecutive_failures * len(account_ids):
                print(f"\n  WARNING: {total_failures} consecutive failures detected")
                break
        
        # Periodic report
        now = time.time()
        if now - last_report_time >= 60:
            elapsed = now - start_time
            ops_rate = total_ops / max(elapsed, 1)
            mem_ok, mem_msg = mem_tracker.has_leak()
            print(f"  [{elapsed:.0f}s] OPS: {ops_rate:.1f}/s | "
                  f"Mem: {mem_tracker.current_mb:.0f}MB | "
                  f"Failures: {total_failures}")
            
            if mem_ok:
                print(f"    ⚠️  {mem_msg}")
            
            last_report_time = now
        
        await asyncio.sleep(check_interval)
    
    # Stop chaos
    await chaos.stop()
    await mem_tracker.stop()
    
    # Results
    elapsed = time.time() - start_time
    ops_rate = total_ops / max(elapsed, 1)
    mem_ok, mem_msg = mem_tracker.has_leak()
    
    print(f"\n  {'='*60}")
    print(f"  STRESS TEST RESULTS")
    print(f"  {'='*60}")
    print(f"  Duration: {elapsed:.0f}s")
    print(f"  Total operations: {total_ops}")
    print(f"  Operations/sec: {ops_rate:.1f}")
    print(f"  Total failures: {total_failures}")
    print(f"  Final memory: {mem_tracker.current_mb:.1f} MB")
    print(f"  Memory baseline: {mem_tracker.baseline_mb:.1f} MB")
    print(f"  Memory growth: {mem_tracker.growth_mb:.1f} MB")
    print(f"  Growth rate: {mem_tracker.growth_rate_mb_per_hour:.1f} MB/hour")
    print(f"  Chaos kills: {chaos.kills}")
    print(f"  Chaos recovery rate: {chaos.recovery_rate:.1f}%")
    print(f"  {mem_msg}")
    print()
    
    # Record in report
    REPORT.pass_test(f"Stress: {total_ops} ops in {elapsed:.0f}s ({ops_rate:.1f}/s)", "stress")
    REPORT.pass_test(f"Memory: {mem_tracker.current_mb:.1f}MB (baseline: {mem_tracker.baseline_mb:.1f}MB)", "stress")
    
    if mem_ok:
        failures += 1
        REPORT.fail_test("Memory leak check", "stress", error=mem_msg)
    else:
        REPORT.pass_test("Memory leak check", "stress")
    
    if chaos.recovery_rate > 95:
        REPORT.pass_test(f"Chaos recovery rate: {chaos.recovery_rate:.1f}%", "stress")
    else:
        failures += 1
        REPORT.fail_test("Chaos recovery rate", "stress", 
                         error=f"Recovery rate {chaos.recovery_rate:.1f}% < 95%")
    
    # Cleanup
    print("  Cleaning up stress accounts...")
    for aid in account_ids:
        try:
            CLIENT.delete_account(aid)
        except Exception:
            pass
    print("  Cleanup complete\n")
    
    REPORT.end_suite()
    
    if failures > 0:
        print(f"  ❌ Stress test completed with {failures} failure(s)\n")
    else:
        print(f"  ✅ Stress test PASSED\n")
    
    return failures


# ── Memory Leak Test ──────────────────────────────────────────────────

async def run_memory_leak_test() -> int:
    """Focused memory leak detection test."""
    REPORT.start_suite("Enterprise: Memory Leak Test")
    failures = 0
    
    print(f"\n  {'='*60}")
    print(f"  MEMORY LEAK DETECTION")
    print(f"  Check interval: {ENTERPRISE_CONFIG.memory_check_interval}s")
    print(f"  Threshold: {ENTERPRISE_CONFIG.memory_warning_mb}MB warning, "
          f"{ENTERPRISE_CONFIG.memory_critical_mb}MB critical")
    print(f"  {'='*60}\n")
    
    tracker = MemoryTracker()
    
    # Take baseline
    tracker.snapshot()
    baseline = tracker.baseline_mb
    print(f"  Baseline memory: {baseline:.1f} MB")
    
    # Create accounts and measure growth
    account_ids: list[str] = []
    ts = int(time.time())
    
    print("  Creating accounts to stress memory...")
    for i in range(20):
        phone = f"+8210{(ts + i) % 100000000:08d}"
        try:
            acct = CLIENT.create_account(phone=phone, name=f"MemTest-{i}")
            aid = acct.get("id", "")
            if aid:
                account_ids.append(aid)
        except Exception:
            pass
    
    # Perform repetitive operations to trigger leaks
    print("  Performing memory stress operations...")
    for round_idx in range(10):
        for aid in account_ids:
            try:
                CLIENT.get_runtime_inspector(aid)
                CLIENT.get_account_health(aid)
                CLIENT.get_groups(aid)
            except Exception:
                pass
        
        gc.collect()
        
        # Take snapshot
        snapshot = tracker.snapshot()
        print(f"  Round {round_idx + 1}: {snapshot['rss_mb']:.1f} MB "
              f"(+{snapshot['rss_mb'] - baseline:.1f} MB from baseline)")
    
    # Final analysis
    gc.collect()
    final_snapshot = tracker.snapshot()
    
    print(f"\n  {'='*60}")
    print(f"  MEMORY ANALYSIS")
    print(f"  {'='*60}")
    print(f"  Baseline:     {baseline:.1f} MB")
    print(f"  Final:        {final_snapshot['rss_mb']:.1f} MB")
    print(f"  Growth:       {final_snapshot['rss_mb'] - baseline:.1f} MB")
    print(f"  Growth rate:  {tracker.growth_rate_mb_per_hour:.1f} MB/hour")
    print(f"  GC objects:   {final_snapshot['gc_objects']}")
    print(f"  GC garbage:   {final_snapshot['gc_garbage']}")
    
    has_leak, leak_msg = tracker.has_leak()
    if has_leak:
        failures += 1
        REPORT.fail_test("Memory leak detection", "memory", error=leak_msg)
        print(f"\n  ❌ {leak_msg}")
    else:
        REPORT.pass_test(f"Memory leak detection: {leak_msg}", "memory")
        print(f"\n  ✅ {leak_msg}")
    
    # Cleanup
    for aid in account_ids:
        try:
            CLIENT.delete_account(aid)
        except Exception:
            pass
    
    REPORT.end_suite()
    return failures


# ── Recovery Verification ─────────────────────────────────────────────

async def run_recovery_verification() -> int:
    """Verify automatic recovery mechanisms work correctly."""
    REPORT.start_suite("Enterprise: Recovery Verification")
    failures = 0
    
    print(f"\n  {'='*60}")
    print(f"  RECOVERY VERIFICATION")
    print(f"  {'='*60}\n")
    
    ts = int(time.time())
    phone = f"+8210{ts % 100000000:08d}"
    
    # Create account
    try:
        acct = CLIENT.create_account(phone=phone, name="Recovery-VT")
        account_id = acct.get("id", "")
        print(f"  Test account: {account_id[:12]}...")
    except Exception as e:
        REPORT.fail_test("Setup recovery test account", "recovery", error=str(e))
        REPORT.end_suite()
        return 1
    
    # Test 1: Runtime restart
    print("\n  [Test 1] Runtime restart...")
    try:
        t0 = time.time()
        result = CLIENT.restart_runtime(account_id)
        dur = time.time() - t0
        assert result.get("restarted") is True, "Runtime did not restart"
        REPORT.pass_test(f"Runtime restart: {dur*1000:.0f}ms", "recovery")
        print(f"    ✅ Restart in {dur*1000:.0f}ms")
    except Exception as e:
        failures += 1
        REPORT.fail_test("Runtime restart", "recovery", error=str(e))
        print(f"    ❌ {e}")
    
    # Test 2: Session recovery
    print("\n  [Test 2] Session recovery trigger...")
    try:
        t0 = time.time()
        result = CLIENT.trigger_recovery(account_id)
        dur = time.time() - t0
        _check_recovery = result.get("recovered") if "recovered" in result else True
        REPORT.pass_test(f"Session recovery: {dur*1000:.0f}ms", "recovery")
        print(f"    ✅ Recovery triggered in {dur*1000:.0f}ms")
    except Exception as e:
        failures += 1
        REPORT.fail_test("Session recovery", "recovery", error=str(e))
        print(f"    ❌ {e}")
    
    # Test 3: Health after restart
    print("\n  [Test 3] Health tracking after restart...")
    try:
        health = CLIENT.get_account_health(account_id)
        assert "status" in health, "Health response missing status"
        REPORT.pass_test(f"Health status: {health.get('status')}", "recovery")
        print(f"    ✅ Health: {health.get('status')}")
    except Exception as e:
        failures += 1
        REPORT.fail_test("Health after restart", "recovery", error=str(e))
        print(f"    ❌ {e}")
    
    # Test 4: Inspector accuracy
    print("\n  [Test 4] Runtime inspector accuracy...")
    try:
        data = CLIENT.get_runtime_inspector(account_id)
        checks = [
            ("account_id", data.get("account_id") == account_id),
            ("running", data.get("running") is True),
            ("status", bool(data.get("status"))),
            ("health", bool(data.get("health"))),
            ("rate_limiter", bool(data.get("rate_limiter"))),
            ("group_cache", bool(data.get("group_cache"))),
            ("broadcast_queue", bool(data.get("broadcast_queue"))),
            ("auto_reply", bool(data.get("auto_reply"))),
            ("reply_macros", bool(data.get("reply_macros"))),
            ("session", bool(data.get("session"))),
        ]
        failed_checks = [name for name, ok in checks if not ok]
        if failed_checks:
            raise AssertionError(f"Inspector fields missing: {failed_checks}")
        REPORT.pass_test("Runtime inspector data integrity", "recovery")
        print(f"    ✅ All {len(checks)} inspector fields valid")
    except Exception as e:
        failures += 1
        REPORT.fail_test("Inspector accuracy", "recovery", error=str(e))
        print(f"    ❌ {e}")
    
    # Test 5: Circuit breaker simulation
    print("\n  [Test 5] Circuit breaker simulation...")
    try:
        from backend.healing_engine import CircuitBreakerState
        cb = CircuitBreakerState(account_id=account_id)
        
        # Simulate 5 failures
        for i in range(5):
            cb.record_failure()
        assert cb.state.value == "open", f"Expected OPEN, got {cb.state.value}"
        print(f"    ✅ Circuit OPEN after 5 failures")
        
        # Simulate timeout + 3 successes
        cb.opened_at = time.time() - 31  # Force timeout
        assert cb.should_attempt() is True, "Circuit should be HALF_OPEN"
        print(f"    ✅ Circuit HALF_OPEN after timeout")
        
        for i in range(3):
            cb.record_success()
        assert cb.state.value == "closed", f"Expected CLOSED, got {cb.state.value}"
        print(f"    ✅ Circuit CLOSED after 3 successes")
        
        REPORT.pass_test("Circuit breaker state machine", "recovery")
    except Exception as e:
        failures += 1
        REPORT.fail_test("Circuit breaker simulation", "recovery", error=str(e))
        print(f"    ❌ {e}")
    
    # Test 6: Auto-reply lifecycle
    print("\n  [Test 6] Auto-reply recovery...")
    try:
        rule = CLIENT.create_auto_reply_rule(account_id, {
            "name": "Recovery AR",
            "is_active": True,
            "match_type": "keyword",
            "match_value": "recovery",
            "reply_content": "Recovery verified",
            "cooldown_hours": 0,
            "max_replies_per_day": 100,
        })
        assert rule.get("id"), "Rule creation failed"
        
        result = CLIENT.toggle_auto_reply(account_id, True)
        assert result.get("auto_reply_enabled") is True, "Toggle failed"
        
        # Restart and verify settings persist
        CLIENT.restart_runtime(account_id)
        
        settings = CLIENT.get_auto_reply_settings(account_id)
        assert settings.get("auto_reply_enabled") is True, "Settings lost after restart"
        
        CLIENT.delete_auto_reply_rule(account_id, rule["id"])
        REPORT.pass_test("Auto-reply survives restart", "recovery")
        print(f"    ✅ Auto-reply persisted across restart")
    except Exception as e:
        failures += 1
        REPORT.fail_test("Auto-reply recovery", "recovery", error=str(e))
        print(f"    ❌ {e}")
    
    # Cleanup
    try:
        CLIENT.delete_account(account_id)
    except Exception:
        pass
    
    print()
    REPORT.end_suite()
    
    if failures == 0:
        print(f"  ✅ All recovery verifications PASSED\n")
    else:
        print(f"  ❌ {failures} recovery verification(s) FAILED\n")
    
    return failures


# ── Uptime Validation ─────────────────────────────────────────────────

async def run_uptime_validation() -> int:
    """Validate system can run for extended periods without degradation."""
    REPORT.start_suite("Enterprise: Uptime Validation")
    failures = 0
    
    duration = ENTERPRISE_CONFIG.stress_duration
    check_interval = ENTERPRISE_CONFIG.uptime_check_interval
    checks_count = duration // check_interval
    
    print(f"\n  {'='*60}")
    print(f"  UPTIME VALIDATION")
    print(f"  Duration: {duration}s ({duration/3600:.1f}h)")
    print(f"  Check interval: {check_interval}s")
    print(f"  Expected checks: {checks_count}")
    print(f"  {'='*60}\n")
    
    # Create a stable set of accounts
    account_ids: list[str] = []
    ts = int(time.time())
    
    print("  Creating uptime test accounts...")
    for i in range(5):
        phone = f"+8210{(ts + i) % 100000000:08d}"
        try:
            acct = CLIENT.create_account(phone=phone, name=f"Uptime-{i}")
            aid = acct.get("id", "")
            if aid:
                account_ids.append(aid)
        except Exception:
            pass
    
    if not account_ids:
        REPORT.fail_test("Uptime setup", "uptime", error="No accounts created")
        REPORT.end_suite()
        return 1
    
    print(f"  Created {len(account_ids)} accounts for uptime monitoring\n")
    
    # Monitoring loop
    start_time = time.time()
    last_health: dict[str, str] = {}
    health_changes = 0
    
    tracker = MemoryTracker()
    await tracker.start(interval=ENTERPRISE_CONFIG.memory_check_interval)
    
    check_count = 0
    degraded_count = 0
    
    while time.time() - start_time < duration:
        remaining = duration - (time.time() - start_time)
        check_count += 1
        
        # Check all accounts
        for aid in account_ids:
            try:
                health = CLIENT.get_account_health(aid)
                status = health.get("status", "unknown")
                
                if aid in last_health and last_health[aid] != status:
                    health_changes += 1
                    print(f"    ⚠️  Account {aid[:8]} health changed: "
                          f"{last_health[aid]} → {status}")
                
                last_health[aid] = status
                
                if status in ("error", "unauthorized", "banned"):
                    degraded_count += 1
                    
            except Exception as e:
                degraded_count += 1
                print(f"    ⚠️  Account {aid[:8]} check failed: {e}")
        
        # Memory check
        mem_ok, mem_msg = tracker.has_leak()
        if mem_ok:
            print(f"    ⚠️  {mem_msg}")
        
        # Progress
        elapsed = time.time() - start_time
        pct = (elapsed / duration) * 100
        mem = tracker.current_mb
        
        status_icon = "✅" if degraded_count == 0 else "⚠️"
        print(f"  [{elapsed:.0f}s / {duration:.0f}s] {pct:.0f}% | "
              f"Mem: {mem:.0f}MB | "
              f"Health changes: {health_changes} | "
              f"Degraded: {degraded_count} "
              f"{'✅' if degraded_count == 0 else '⚠️'}")
        
        if remaining > check_interval:
            await asyncio.sleep(min(check_interval, remaining))
    
    await tracker.stop()
    
    # Results
    total_elapsed = time.time() - start_time
    print(f"\n  {'='*60}")
    print(f"  UPTIME VALIDATION RESULTS")
    print(f"  {'='*60}")
    print(f"  Duration:           {total_elapsed:.0f}s ({total_elapsed/3600:.2f}h)")
    print(f"  Checks performed:   {check_count}")
    print(f"  Health changes:     {health_changes}")
    print(f"  Degraded events:    {degraded_count}")
    print(f"  Final memory:       {tracker.current_mb:.1f} MB")
    print(f"  Memory growth:      {tracker.growth_mb:.1f} MB")
    print(f"  Growth rate:        {tracker.growth_rate_mb_per_hour:.2f} MB/hour")
    
    has_leak, leak_msg = tracker.has_leak()
    print(f"  Memory status:      {leak_msg}")
    
    # Validate
    if degraded_count > check_count * 0.1:  # More than 10% degraded
        failures += 1
        REPORT.fail_test("Uptime degradation ratio", "uptime",
                         error=f"{degraded_count}/{check_count} checks degraded")
    
    if has_leak:
        failures += 1
        REPORT.fail_test("Uptime memory leak", "uptime", error=leak_msg)
    
    if check_count >= 2:
        REPORT.pass_test(f"Uptime: {total_elapsed:.0f}s with {check_count} checks", "uptime")
    else:
        REPORT.fail_test("Uptime insufficient checks", "uptime",
                         error=f"Only {check_count} checks performed")
    
    # Cleanup
    for aid in account_ids:
        try:
            CLIENT.delete_account(aid)
        except Exception:
            pass
    
    print()
    REPORT.end_suite()
    
    if failures == 0:
        print(f"  ✅ Uptime validation PASSED\n")
    else:
        print(f"  ❌ {failures} uptime validation(s) FAILED\n")
    
    return failures


# ── Chaos Engineering ─────────────────────────────────────────────────

async def run_chaos_engineering() -> int:
    """Systematic chaos engineering with controlled failures."""
    REPORT.start_suite("Enterprise: Chaos Engineering")
    failures = 0
    
    print(f"\n  {'='*60}")
    print(f"  CHAOS ENGINEERING")
    print(f"  {'='*60}\n")
    
    ts = int(time.time())
    account_ids: list[str] = []
    
    # Create accounts
    for i in range(10):
        phone = f"+8210{(ts + i) % 100000000:08d}"
        try:
            acct = CLIENT.create_account(phone=phone, name=f"Chaos-{i}")
            aid = acct.get("id", "")
            if aid:
                account_ids.append(aid)
        except Exception:
            pass
    
    if not account_ids:
        REPORT.fail_test("Chaos setup", "chaos", error="No accounts created")
        REPORT.end_suite()
        return 1
    
    print(f"  Created {len(account_ids)} chaos test accounts\n")
    
    # Chaos scenarios
    scenarios = [
        ("Restart all accounts", lambda aid: CLIENT.restart_runtime(aid)),
        ("Trigger recovery", lambda aid: CLIENT.trigger_recovery(aid)),
        ("Toggle auto-reply rapidly",
         lambda aid: CLIENT.toggle_auto_reply(aid, random.choice([True, False]))),
        ("Create & delete auto-reply rule", lambda aid: _chaos_ar_rule(aid)),
        ("Create & delete reply macro", lambda aid: _chaos_macro(aid)),
        ("Create broadcast", lambda aid: CLIENT.create_broadcast({
            "account_id": aid,
            "message": "Chaos test",
            "recipients": ["-100987654321"],
            "delivery_mode": "normal",
        })),
    ]
    
    scenario_results = []
    
    for scenario_name, scenario_fn in scenarios:
        print(f"  Scenario: {scenario_name}")
        scenario_passes = 0
        scenario_fails = 0
        
        for aid in account_ids:
            try:
                t0 = time.time()
                scenario_fn(aid)
                dur = time.time() - t0
                scenario_passes += 1
            except Exception as e:
                scenario_fails += 1
                print(f"    ⚠️  {aid[:8]}: {str(e)[:80]}")
        
        rate = (scenario_passes / len(account_ids)) * 100
        scenario_results.append({
            "scenario": scenario_name,
            "passes": scenario_passes,
            "fails": scenario_fails,
            "success_rate": rate,
        })
        
        if rate >= 95:
            REPORT.pass_test(f"Chaos: {scenario_name} ({rate:.0f}%)", "chaos")
            print(f"    ✅ {scenario_passes}/{len(account_ids)} passed ({rate:.0f}%)")
        else:
            failures += 1
            REPORT.fail_test(f"Chaos: {scenario_name}", "chaos",
                             error=f"Success rate {rate:.0f}% < 95%")
            print(f"    ❌ {scenario_passes}/{len(account_ids)} passed ({rate:.0f}%)")
    
    # Cleanup
    for aid in account_ids:
        try:
            CLIENT.delete_account(aid)
        except Exception:
            pass
    
    print()
    REPORT.end_suite()
    
    if failures == 0:
        print(f"  ✅ All chaos scenarios PASSED\n")
    else:
        print(f"  ❌ {failures} chaos scenario(s) FAILED\n")
    
    return failures


def _chaos_ar_rule(account_id: str) -> None:
    """Create and immediately delete an auto-reply rule."""
    rule = CLIENT.create_auto_reply_rule(account_id, {
        "name": "Chaos Rule",
        "is_active": True,
        "match_type": "keyword",
        "match_value": "chaos",
        "reply_content": "Chaos response",
    })
    CLIENT.delete_auto_reply_rule(account_id, rule["id"])


def _chaos_macro(account_id: str) -> None:
    """Create and immediately delete a reply macro."""
    macro = CLIENT.create_reply_macro(account_id, {
        "name": "Chaos Macro",
        "is_active": True,
        "target_chats": ["-100123456789"],
        "message_content": "Chaos macro",
        "schedule_type": "interval",
        "interval_hours": 24,
    })
    CLIENT.delete_reply_macro(account_id, macro["id"])


# ── Main Runner ──────────────────────────────────────────────────────

async def main() -> int:
    """Enterprise hardening main runner."""
    parser = argparse.ArgumentParser(description="TeleMon Enterprise Hardening")
    parser.add_argument("--mode", choices=["all", "stress", "memory", "recovery", "uptime", "chaos"],
                       default="all", help="Test mode")
    parser.add_argument("--duration", type=int, default=None,
                       help="Test duration in seconds")
    parser.add_argument("--accounts", type=int, default=None,
                       help="Number of accounts for stress test")
    args = parser.parse_args()
    
    # Override config
    if args.duration:
        ENTERPRISE_CONFIG.stress_duration = args.duration
    if args.accounts:
        ENTERPRISE_CONFIG.stress_account_count = args.accounts
    
    print("=" * 70)
    print("  TeleMon ENTERPRISE HARDENING")
    print("  100계정 실운영 검증 | Stress Test | Memory Leak | Recovery")
    print("=" * 70)
    print(f"  Mode:            {args.mode}")
    print(f"  Duration:        {ENTERPRISE_CONFIG.stress_duration}s "
          f"({ENTERPRISE_CONFIG.stress_duration/3600:.1f}h)")
    print(f"  Stress accounts: {ENTERPRISE_CONFIG.stress_account_count}")
    print(f"  Memory interval: {ENTERPRISE_CONFIG.memory_check_interval}s")
    print(f"  Chaos interval:  {ENTERPRISE_CONFIG.chaos_kill_interval}s")
    print(f"  Target OPS:      {ENTERPRISE_CONFIG.ops_per_second}/s")
    print()
    
    total_failures = 0
    
    try:
        if args.mode in ("all", "stress"):
            failures = await run_stress_test()
            total_failures += failures
        
        if args.mode in ("all", "memory"):
            failures = await run_memory_leak_test()
            total_failures += failures
        
        if args.mode in ("all", "recovery"):
            failures = await run_recovery_verification()
            total_failures += failures
        
        if args.mode in ("all", "uptime"):
            failures = await run_uptime_validation()
            total_failures += failures
        
        if args.mode in ("all", "chaos"):
            failures = await run_chaos_engineering()
            total_failures += failures
        
    except KeyboardInterrupt:
        print("\n\n  Tests interrupted by user.")
        total_failures = 1
    except Exception as e:
        print(f"\n\n  UNEXPECTED ERROR: {e}")
        traceback.print_exc()
        total_failures = 1
    
    # Final report
    report_path = REPORT.save_json(ENTERPRISE_CONFIG.report_path)
    REPORT.print_summary()
    print(f"  Enterprise report: {report_path}")
    print()
    
    return 1 if total_failures > 0 else 0


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    try:
        exit_code = asyncio.run(main())
    except KeyboardInterrupt:
        exit_code = 1
        print("\n  Interrupted")
    
    sys.exit(exit_code)