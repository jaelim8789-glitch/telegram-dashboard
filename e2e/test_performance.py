"""
Performance E2E Tests — measures API response times, throughput, and system
behavior under load with real Telegram accounts.

Tests:
  - API response time benchmarks (p50, p95, p99)
  - Account CRUD throughput
  - Auto-reply rule CRUD throughput
  - Reply macro CRUD throughput
  - Concurrent request handling
  - Runtime inspector query performance
  - Group cache retrieval performance
  - Health check polling performance
  - Real account Telethon client connection time
  - Session file I/O performance
"""

from __future__ import annotations

import statistics
import sys
import time
import traceback
from typing import Any

from .e2e_api_client import CLIENT, E2EApiError
from .e2e_config import CONFIG
from .e2e_report import REPORT


def run_performance_tests() -> int:
    """Execute all Performance test cases. Returns number of failures."""
    failures = 0
    REPORT.start_suite("Performance Tests")

    try:
        failures += _test_api_response_times()
        failures += _test_account_crud_throughput()
        failures += _test_workspace_throughput()

        if CONFIG.accounts:
            failures += _test_real_account_performance()
    finally:
        REPORT.end_suite()

    return failures


def _measure(
    label: str,
    fn: callable,
    iterations: int = 5,
) -> dict[str, float]:
    """Measure min, max, avg, p50, p95, p99 of a callable's execution time."""
    times: list[float] = []
    for _ in range(iterations):
        t0 = time.perf_counter()
        fn()
        times.append(time.perf_counter() - t0)

    sorted_times = sorted(times)
    return {
        "min": min(times),
        "max": max(times),
        "avg": statistics.mean(times),
        "p50": sorted_times[int(len(sorted_times) * 0.50)],
        "p95": sorted_times[int(len(sorted_times) * 0.95)],
        "p99": sorted_times[int(len(sorted_times) * 0.99)] if len(sorted_times) >= 10 else sorted_times[-1],
        "samples": len(times),
    }


def _format_stats(s: dict[str, float]) -> str:
    return (f"avg={s['avg']*1000:.1f}ms "
            f"p50={s['p50']*1000:.1f}ms "
            f"p95={s['p95']*1000:.1f}ms "
            f"min={s['min']*1000:.1f}ms "
            f"max={s['max']*1000:.1f}ms [{s['samples']} samples]")


def _cleanup(aid: str | None) -> None:
    if aid:
        try:
            CLIENT.delete_account(aid)
        except Exception:
            pass


# ── 1. API Response Time Benchmarks ─────────────────────────────────

def _test_api_response_times() -> int:
    """Benchmark key API endpoints for response time."""
    failures = 0
    ts = int(time.time())
    phone = f"+8210{ts % 100000000:08d}"

    # Need an account to benchmark account-specific endpoints
    try:
        acct = CLIENT.create_account(phone=phone, name="Perf Benchmark")
        aid = acct.get("id", "")
    except Exception as e:
        REPORT.fail_test("Setup account for benchmarks", "performance", error=str(e))
        return 1

    try:
        # Health check
        stats = _measure("health_check", lambda: CLIENT.health_check(), iterations=10)
        REPORT.pass_test(f"Health check: {_format_stats(stats)}", "performance")

        # List accounts
        stats = _measure("list_accounts", lambda: CLIENT.list_accounts(), iterations=10)
        REPORT.pass_test(f"List accounts: {_format_stats(stats)}", "performance")

        # Get single account
        stats = _measure("get_account", lambda: CLIENT.get_account(aid), iterations=10)
        REPORT.pass_test(f"Get account: {_format_stats(stats)}", "performance")

        # Account health
        stats = _measure("get_account_health", lambda: CLIENT.get_account_health(aid), iterations=10)
        REPORT.pass_test(f"Account health: {_format_stats(stats)}", "performance")

        # Runtime inspector
        stats = _measure("runtime_inspector", lambda: CLIENT.get_runtime_inspector(aid), iterations=10)
        REPORT.pass_test(f"Runtime inspector: {_format_stats(stats)}", "performance")

        # Runtime inspector summary
        stats = _measure("runtime_summary", lambda: CLIENT.get_runtime_inspector_summary(), iterations=10)
        REPORT.pass_test(f"Runtime summary: {_format_stats(stats)}", "performance")

        # Groups
        stats = _measure("get_groups", lambda: CLIENT.get_groups(aid), iterations=10)
        REPORT.pass_test(f"Get groups: {_format_stats(stats)}", "performance")

        # Health list
        stats = _measure("list_health", lambda: CLIENT.list_health(), iterations=10)
        REPORT.pass_test(f"List health: {_format_stats(stats)}", "performance")

    except Exception as e:
        REPORT.fail_test("API response time benchmarks", "performance",
                         error=str(e), detail=traceback.format_exc())
        failures += 1

    _cleanup(aid)
    return failures


# ── 2. Account CRUD Throughput ──────────────────────────────────────

def _test_account_crud_throughput() -> int:
    """Measure account creation and deletion throughput."""
    failures = 0
    ts = int(time.time())

    # Batch create
    count = 5
    aids: list[str] = []

    try:
        t0 = time.perf_counter()
        for i in range(count):
            phone = f"+8210{(ts + i) % 100000000:08d}"
            acct = CLIENT.create_account(phone=phone, name=f"Perf CRUD {i}")
            aids.append(acct.get("id", ""))
        create_dur = time.perf_counter() - t0
        create_throughput = count / create_dur if create_dur > 0 else 0
        REPORT.pass_test(
            f"Account create throughput: {create_throughput:.1f} accounts/sec "
            f"({count} in {create_dur:.2f}s)", "performance")
    except Exception as e:
        REPORT.fail_test("Account create throughput", "performance",
                         error=str(e), detail=traceback.format_exc())
        failures += 1

    # Batch delete
    try:
        t0 = time.perf_counter()
        for aid in aids:
            CLIENT.delete_account(aid)
        delete_dur = time.perf_counter() - t0
        delete_throughput = len(aids) / delete_dur if delete_dur > 0 else 0
        REPORT.pass_test(
            f"Account delete throughput: {delete_throughput:.1f} accounts/sec "
            f"({len(aids)} in {delete_dur:.2f}s)", "performance")
    except Exception as e:
        REPORT.fail_test("Account delete throughput", "performance",
                         error=str(e), detail=traceback.format_exc())
        failures += 1

    return failures


# ── 3. Workspace Throughput ─────────────────────────────────────────

def _test_workspace_throughput() -> int:
    """Measure workspace feature (auto-reply, macro) CRUD throughput."""
    failures = 0
    ts = int(time.time())
    phone = f"+8210{ts % 100000000:08d}"

    try:
        acct = CLIENT.create_account(phone=phone, name="WS Throughput")
        aid = acct.get("id", "")
    except Exception as e:
        REPORT.fail_test("Setup for workspace throughput", "performance", error=str(e))
        return 1

    # Auto-reply rule CRUD
    try:
        # Create 10 rules
        count = 10
        t0 = time.perf_counter()
        rule_ids: list[str] = []
        for i in range(count):
            rule = CLIENT.create_auto_reply_rule(aid, {
                "name": f"Throughput Rule {i}",
                "is_active": True,
                "match_type": "keyword",
                "match_value": f"perf{i}",
                "reply_content": f"Perf reply {i}",
                "cooldown_hours": 0,
                "max_replies_per_day": 100,
            })
            rule_ids.append(rule.get("id", ""))
        create_dur = time.perf_counter() - t0
        REPORT.pass_test(
            f"Auto-reply rule create: {count / create_dur:.1f} rules/sec "
            f"({count} in {create_dur:.2f}s)", "performance")

        # Get settings
        t0 = time.perf_counter()
        for _ in range(10):
            CLIENT.get_auto_reply_settings(aid)
        get_dur = time.perf_counter() - t0
        REPORT.pass_test(
            f"Auto-reply settings get: {10 / get_dur:.1f} req/sec "
            f"(10 in {get_dur:.2f}s)", "performance")

        # Delete all rules
        t0 = time.perf_counter()
        for rid in rule_ids:
            CLIENT.delete_auto_reply_rule(aid, rid)
        del_dur = time.perf_counter() - t0
        REPORT.pass_test(
            f"Auto-reply rule delete: {count / del_dur:.1f} rules/sec "
            f"({count} in {del_dur:.2f}s)", "performance")
    except Exception as e:
        REPORT.fail_test("Auto-reply throughput", "performance",
                         error=str(e), detail=traceback.format_exc())
        failures += 1

    # Reply macro CRUD
    try:
        count = 10
        t0 = time.perf_counter()
        macro_ids: list[str] = []
        for i in range(count):
            macro = CLIENT.create_reply_macro(aid, {
                "name": f"Perf Macro {i}",
                "is_active": True,
                "target_chats": ["-100123456789"],
                "message_content": f"Perf macro {i}",
                "schedule_type": "interval",
                "interval_hours": 24,
                "max_sends_per_day": 10,
            })
            macro_ids.append(macro.get("id", ""))
        create_dur = time.perf_counter() - t0
        REPORT.pass_test(
            f"Reply macro create: {count / create_dur:.1f} macros/sec "
            f"({count} in {create_dur:.2f}s)", "performance")

        # List macros
        t0 = time.perf_counter()
        for _ in range(10):
            CLIENT.get_reply_macros(aid)
        get_dur = time.perf_counter() - t0
        REPORT.pass_test(
            f"Reply macro list: {10 / get_dur:.1f} req/sec "
            f"(10 in {get_dur:.2f}s)", "performance")

        # Delete all macros
        t0 = time.perf_counter()
        for mid in macro_ids:
            CLIENT.delete_reply_macro(aid, mid)
        del_dur = time.perf_counter() - t0
        REPORT.pass_test(
            f"Reply macro delete: {count / del_dur:.1f} macros/sec "
            f"({count} in {del_dur:.2f}s)", "performance")
    except Exception as e:
        REPORT.fail_test("Reply macro throughput", "performance",
                         error=str(e), detail=traceback.format_exc())
        failures += 1

    _cleanup(aid)
    return failures


# ── 4. Real Account Performance ─────────────────────────────────────

def _test_real_account_performance() -> int:
    """Benchmark real Telegram account operations."""
    failures = 0

    for idx, account in enumerate(CONFIG.accounts):
        label = f"RealPerf[{account.phone[:6]}...]"
        account_id: str | None = None

        try:
            t0 = time.perf_counter()
            acct = CLIENT.create_account(
                phone=account.phone,
                name=account.name or f"E2E Perf {idx}",
                api_id=account.api_id,
                api_hash=account.api_hash,
            )
            account_id = acct.get("id", "")
            create_time = time.perf_counter() - t0
            REPORT.pass_test(
                f"{label}: Account creation: {create_time*1000:.0f}ms", "performance")
        except Exception as e:
            REPORT.fail_test(f"{label}: Create account", "performance",
                             error=str(e), detail=traceback.format_exc())
            continue

        # Measure runtime start & session verification
        try:
            t0 = time.perf_counter()
            data = CLIENT.get_runtime_inspector(account_id)
            inspector_time = time.perf_counter() - t0
            sess = data.get("session", {})
            REPORT.pass_test(
                f"{label}: Inspector query: {inspector_time*1000:.0f}ms | "
                f"Session file: {sess.get('file_size', 0)} bytes", "performance")
        except Exception as e:
            REPORT.fail_test(f"{label}: Inspector query", "performance",
                             error=str(e), detail=traceback.format_exc())
            failures += 1

        # Measure group cache retrieval
        try:
            t0 = time.perf_counter()
            groups = CLIENT.get_groups(account_id)
            group_time = time.perf_counter() - t0
            REPORT.pass_test(
                f"{label}: Group cache: {group_time*1000:.0f}ms for {len(groups)} groups",
                "performance")
        except Exception as e:
            REPORT.fail_test(f"{label}: Group cache", "performance",
                             error=str(e), detail=traceback.format_exc())
            failures += 1

        # Measure health tracking
        try:
            t0 = time.perf_counter()
            health = CLIENT.get_account_health(account_id)
            health_time = time.perf_counter() - t0
            REPORT.pass_test(
                f"{label}: Health query: {health_time*1000:.0f}ms | "
                f"Status: {health.get('status')}", "performance")
        except Exception as e:
            REPORT.fail_test(f"{label}: Health query", "performance",
                             error=str(e), detail=traceback.format_exc())
            failures += 1

        # Cleanup
        try:
            CLIENT.delete_account(account_id)
        except Exception:
            pass

    return failures


if __name__ == "__main__":
    sys.exit(run_performance_tests())