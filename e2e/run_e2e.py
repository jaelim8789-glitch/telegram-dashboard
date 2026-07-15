"""
TeleMon E2E Test Runner — main orchestrator for all test suites.

Usage:
    python -m e2e.run_e2e                           # Run all tests (recommended)
    python e2e/run_e2e.py                           # Run all tests (direct)
    python e2e/run_e2e.py --suite runtime            # Runtime tests only
    python e2e/run_e2e.py --suite workspace          # Workspace tests only
    python e2e/run_e2e.py --suite performance        # Performance tests only
    python e2e/run_e2e.py --suite regression         # Legacy regression tests
    python e2e/run_e2e.py --skip-real                # Skip real account tests
    python e2e/run_e2e.py --report report.json       # Custom report path
    python e2e/run_e2e.py --no-cleanup               # Don't cleanup test accounts

Environment variables:
    E2E_BASE_URL              — Backend URL (default: http://localhost:8000)
    E2E_ACCOUNT_1_PHONE       — Telegram account phone (for real tests)
    E2E_ACCOUNT_1_API_ID      — Telegram API ID
    E2E_ACCOUNT_1_API_HASH    — Telegram API hash
    E2E_TARGET_CHAT_ID        — Test chat ID for message delivery
"""

from __future__ import annotations

import argparse
import os
import sys
import time
import traceback

# Ensure the project root is on sys.path for direct execution
_project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from e2e import test_runtime, test_workspace, test_performance
from e2e import regression_backend
from e2e.e2e_api_client import CLIENT, E2EApiError
from e2e.e2e_config import CONFIG
from e2e.e2e_report import REPORT


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="TeleMon E2E Test Runner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python e2e/run_e2e.py                          # Run all tests
  python e2e/run_e2e.py --suite runtime           # Runtime tests only
  python e2e/run_e2e.py --suite performance       # Performance tests only
  python e2e/run_e2e.py --skip-real               # Skip real account tests
  E2E_BASE_URL=http://localhost:8000 python e2e/run_e2e.py
        """,
    )

    parser.add_argument(
        "--suite",
        choices=["all", "runtime", "workspace", "performance", "regression"],
        default="all",
        help="Test suite to run (default: all)",
    )
    parser.add_argument(
        "--skip-real",
        action="store_true",
        help="Skip tests that use real Telegram accounts",
    )
    parser.add_argument(
        "--report",
        default=None,
        help="Path for output report JSON (default: e2e/report.json)",
    )
    parser.add_argument(
        "--no-cleanup",
        action="store_true",
        help="Do not remove test accounts after tests",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print detailed test output",
    )

    return parser.parse_args()


def check_backend_health() -> bool:
    """Verify the backend is reachable before running tests."""
    print("  Checking backend health...", end=" ", flush=True)
    try:
        health = CLIENT.health_check()
        status = health.get("status", "unknown")
        if status == "ok":
            print(f"OK (status={status})")
            return True
        else:
            print(f"UNEXPECTED STATUS: {status}")
            print(f"  Response: {health}")
            return False
    except E2EApiError as e:
        print(f"FAILED: {e}")
        return False
    except Exception as e:
        print(f"FAILED: {e}")
        return False


def print_config_summary() -> None:
    """Print a summary of the test configuration."""
    print()
    print(f"  Backend URL:     {CONFIG.base_url}")
    print(f"  API URL:         {CONFIG.api_url}")
    print(f"  Test timeout:    {CONFIG.test_timeout}s")
    print(f"  Target chat:     {CONFIG.target_chat_id or '(not set)'}")
    print(f"  Real accounts:   {len(CONFIG.accounts)}")
    for i, acct in enumerate(CONFIG.accounts):
        print(f"    Account {i+1}:    {acct.phone[:8]}... ({acct.name})")
    print(f"  Perf msg count:  {CONFIG.perf_message_count}")
    print()


def run_all() -> int:
    """Run all configured test suites and return exit code."""
    args = parse_args()

    # Override config from args
    if args.report:
        CONFIG.report_path = args.report

    print("=" * 70)
    print("  TeleMon E2E Test Runner")
    print("  Production Hardening — Automated E2E Tests")
    print("=" * 70)
    print()
    print_config_summary()

    if not check_backend_health():
        print()
        print("  ERROR: Backend is not healthy. Aborting.")
        print(f"  Make sure the backend is running at {CONFIG.base_url}")
        print()
        return 1

    print()
    print("  Starting test execution...")
    print()

    total_failures = 0

    try:
        if args.suite in ("all", "runtime"):
            print(f"{'─'*60}")
            print("  [Runtime Suite]")
            print(f"{'─'*60}")
            t0 = time.time()
            fails = test_runtime.run_runtime_tests()
            dur = time.time() - t0
            print(f"  Runtime suite completed in {dur:.1f}s ({fails} failures)")
            print()
            total_failures += fails

        if args.suite in ("all", "workspace"):
            print(f"{'─'*60}")
            print("  [Workspace Suite]")
            print(f"{'─'*60}")
            t0 = time.time()
            fails = test_workspace.run_workspace_tests()
            dur = time.time() - t0
            print(f"  Workspace suite completed in {dur:.1f}s ({fails} failures)")
            print()
            total_failures += fails

        if args.suite in ("all", "performance"):
            print(f"{'─'*60}")
            print("  [Performance Suite]")
            print(f"{'─'*60}")
            t0 = time.time()
            fails = test_performance.run_performance_tests()
            dur = time.time() - t0
            print(f"  Performance suite completed in {dur:.1f}s ({fails} failures)")
            print()
            total_failures += fails

        if args.suite in ("all", "regression"):
            print(f"{'─'*60}")
            print("  [Regression Suite]")
            print(f"{'─'*60}")
            t0 = time.time()
            REPORT.start_suite("Regression Tests")
            try:
                reg_fails = regression_backend.main()
                if reg_fails:
                    REPORT.fail_test("Regression suite failed", "regression",
                                     error=f"Exit code: {reg_fails}")
                else:
                    REPORT.pass_test("Regression suite passed", "regression")
            except Exception as e:
                REPORT.fail_test("Regression suite error", "regression",
                                 error=str(e), detail=traceback.format_exc())
                reg_fails = 1
            finally:
                REPORT.end_suite()
            dur = time.time() - t0
            print(f"  Regression suite completed in {dur:.1f}s ({reg_fails} failures)")
            print()
            total_failures += reg_fails

    except KeyboardInterrupt:
        print()
        print("  Tests interrupted by user.")
        REPORT.add_result("Test execution interrupted", "system", "ERROR",
                          error_message="KeyboardInterrupt")
        total_failures = 1
    except Exception as e:
        print()
        print(f"  UNEXPECTED ERROR: {e}")
        traceback.print_exc()
        REPORT.add_result("Test execution error", "system", "ERROR",
                          error_message=str(e), error_detail=traceback.format_exc())
        total_failures = 1

    # Generate and save report
    report_path = REPORT.save_json(CONFIG.report_path)
    REPORT.print_summary()
    print(f"  Report saved to: {report_path}")
    print()

    # Exit code
    return 1 if total_failures > 0 else 0


if __name__ == "__main__":
    sys.exit(run_all())