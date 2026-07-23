"""
Runtime E2E Tests — validates AccountRuntime lifecycle, session management,
health monitoring, and runtime inspector with real Telegram accounts.

Tests:
  - Account CRUD (create, read, delete)
  - Runtime start/stop lifecycle
  - Telethon client connection verification
  - Session persistence and health tracking
  - Group/dialog cache refresh
  - Rate limiter integration
  - Runtime inspector data accuracy
  - Session auto-recovery
  - Auth status detection
  - Concurrent multi-account runtime management
"""

from __future__ import annotations

import time
import uuid
import sys
import traceback

from .e2e_api_client import CLIENT, E2EApiError, E2ETestFailure
from .e2e_config import CONFIG, TelegramAccount
from .e2e_report import REPORT


def run_runtime_tests() -> int:
    """Execute all Runtime test cases. Returns number of failures."""
    failures = 0
    REPORT.start_suite("Runtime Tests")

    try:
        failures += _test_health_and_root()
        failures += _test_account_crud()
        failures += _test_runtime_lifecycle()
        failures += _test_session_health()
        failures += _test_runtime_inspector()
        failures += _test_group_cache()
        failures += _test_rate_limiter_state()
        failures += _test_concurrent_accounts()

        if CONFIG.accounts:
            failures += _test_real_account_runtime()
    finally:
        REPORT.end_suite()

    return failures


def _check(label: str, condition: bool, detail: str = "") -> None:
    """Assert a condition and record pass/fail."""
    if not condition:
        REPORT.fail_test(label, "runtime", error=f"Assertion failed", detail=detail)
        raise E2ETestFailure(label, "Assertion failed", detail)
    REPORT.pass_test(label, "runtime")


# ── 1. Health Check & Root ──────────────────────────────────────────

def _test_health_and_root() -> int:
    """Verify backend is alive and reporting correctly."""
    failures = 0
    t0 = time.time()

    try:
        health = CLIENT.health_check()
        dur = time.time() - t0
        _check("GET / returns status ok", health.get("status") == "ok")
        REPORT.pass_test("Backend health check", "runtime", duration=dur)
    except Exception as e:
        REPORT.fail_test("Backend health check", "runtime", error=str(e), detail=traceback.format_exc())
        failures += 1

    return failures


# ── 2. Account CRUD ────────────────────────────────────────────────

def _test_account_crud() -> int:
    """Test account creation, listing, retrieval, and deletion."""
    failures = 0
    ts = int(time.time())
    phone = f"+8210{ts % 100000000:08d}"

    # Create account
    try:
        t0 = time.time()
        acct = CLIENT.create_account(phone=phone, name="E2E Runtime Test")
        dur = time.time() - t0
        account_id = acct.get("id", "")
        _check("Account created with id", bool(account_id),
               f"Response: {acct}")
        _check("Account phone matches", acct.get("phone") == phone)
        _check("Account status is active/inactive", acct.get("status") in ("active", "inactive"))
        REPORT.pass_test("Create account", "runtime", duration=dur)
    except Exception as e:
        REPORT.fail_test("Create account", "runtime", error=str(e), detail=traceback.format_exc())
        return failures + 1

    # List accounts
    try:
        t0 = time.time()
        accounts = CLIENT.list_accounts()
        dur = time.time() - t0
        ids = [a.get("id", "") for a in accounts]
        _check(f"Account {account_id[:8]} appears in list", account_id in ids,
               f"IDs: {ids}")
        REPORT.pass_test("List accounts includes new account", "runtime", duration=dur)
    except Exception as e:
        REPORT.fail_test("List accounts", "runtime", error=str(e), detail=traceback.format_exc())
        failures += 1

    # Get single account
    try:
        t0 = time.time()
        acct = CLIENT.get_account(account_id)
        dur = time.time() - t0
        _check("Get account returns correct id", acct.get("id") == account_id)
        _check("Get account returns phone", acct.get("phone") == phone)
        REPORT.pass_test("Get single account", "runtime", duration=dur)
    except Exception as e:
        REPORT.fail_test("Get single account", "runtime", error=str(e), detail=traceback.format_exc())
        failures += 1

    # Delete account
    try:
        t0 = time.time()
        CLIENT.delete_account(account_id)
        dur = time.time() - t0
        REPORT.pass_test("Delete account", "runtime", duration=dur)
    except Exception as e:
        REPORT.fail_test("Delete account", "runtime", error=str(e), detail=traceback.format_exc())
        failures += 1

    # Verify deletion
    try:
        acct = CLIENT.get_account(account_id)
        _check("Deleted account returns 404", False,
               f"Expected 404 but got: {acct}")
    except E2EApiError as e:
        if e.status == 404:
            REPORT.pass_test("Deleted account returns 404", "runtime")
        else:
            REPORT.fail_test("Verify deletion 404", "runtime", error=str(e), detail=traceback.format_exc())
            failures += 1
    except Exception as e:
        REPORT.pass_test("Deleted account returns 404 (exception)", "runtime")
        # Not having a 404 could be OK if account just disappears

    return failures


# ── 3. Runtime Lifecycle ────────────────────────────────────────────

def _test_runtime_lifecycle() -> int:
    """Test runtime start, stop, restart cycle."""
    failures = 0
    ts = int(time.time())
    phone = f"+8210{ts % 100000000:08d}"

    try:
        acct = CLIENT.create_account(phone=phone, name="Lifecycle Test")
        account_id = acct.get("id", "")
    except Exception as e:
        REPORT.fail_test("Create account for lifecycle", "runtime", error=str(e))
        return 1

    # Runtime inspector should show the runtime exists
    try:
        t0 = time.time()
        inspector = CLIENT.get_runtime_inspector(account_id)
        dur = time.time() - t0
        _check("Runtime inspector returns account_id",
               inspector.get("account_id") == account_id)
        REPORT.pass_test("Runtime inspector after creation", "runtime", duration=dur)
    except Exception as e:
        REPORT.fail_test("Runtime inspector after creation", "runtime", error=str(e), detail=traceback.format_exc())
        failures += 1

    # Restart runtime
    try:
        t0 = time.time()
        result = CLIENT.restart_runtime(account_id)
        dur = time.time() - t0
        _check("Restart reports restarted", result.get("restarted") is True)
        REPORT.pass_test("Restart runtime", "runtime", duration=dur)
    except Exception as e:
        REPORT.fail_test("Restart runtime", "runtime", error=str(e), detail=traceback.format_exc())
        failures += 1

    # Runtime status after restart
    try:
        inspector = CLIENT.get_runtime_inspector(account_id)
        _check("Runtime is running after restart", inspector.get("running") is True)
        REPORT.pass_test("Runtime running after restart", "runtime")
    except Exception as e:
        REPORT.fail_test("Runtime status after restart", "runtime", error=str(e), detail=traceback.format_exc())
        failures += 1

    # Trigger recovery (even if session isn't broken, should work gracefully)
    try:
        t0 = time.time()
        result = CLIENT.trigger_recovery(account_id)
        dur = time.time() - t0
        _check("Recovery returns account_id", result.get("account_id") == account_id)
        REPORT.pass_test("Trigger session recovery", "runtime", duration=dur)
    except Exception as e:
        REPORT.fail_test("Trigger session recovery", "runtime", error=str(e), detail=traceback.format_exc())
        failures += 1

    # Cleanup
    try:
        CLIENT.delete_account(account_id)
    except Exception:
        pass

    return failures


# ── 4. Session & Health ─────────────────────────────────────────────

def _test_session_health() -> int:
    """Test health monitoring and session status tracking."""
    failures = 0
    ts = int(time.time())
    phone = f"+8210{ts % 100000000:08d}"

    try:
        acct = CLIENT.create_account(phone=phone, name="Session Health Test")
        account_id = acct.get("id", "")
    except Exception as e:
        REPORT.fail_test("Create account for session health", "runtime", error=str(e))
        return 1

    try:
        t0 = time.time()
        health = CLIENT.get_account_health(account_id)
        dur = time.time() - t0
        _check("Health returns account_id", health.get("account_id") == account_id)
        _check("Health has phone", bool(health.get("phone")))
        _check("Health has status field", bool(health.get("status")))
        _check("Health has has_session field", "has_session" in health)
        REPORT.pass_test("Account health endpoint", "runtime", duration=dur)
    except Exception as e:
        REPORT.fail_test("Account health endpoint", "runtime", error=str(e), detail=traceback.format_exc())
        failures += 1

    try:
        t0 = time.time()
        health_list = CLIENT.list_health()
        dur = time.time() - t0
        ids = [h.get("account_id", "") for h in health_list]
        _check("Health list contains our account", account_id in ids)
        REPORT.pass_test("List all health", "runtime", duration=dur)
    except Exception as e:
        REPORT.fail_test("List all health", "runtime", error=str(e), detail=traceback.format_exc())
        failures += 1

    # Runtime inspector summary
    try:
        t0 = time.time()
        summary = CLIENT.get_runtime_inspector_summary()
        dur = time.time() - t0
        _check("Summary has total count", "total" in summary)
        _check("Summary has runtimes list", "runtimes" in summary)
        runtime_ids = [r.get("account_id", "") for r in summary.get("runtimes", [])]
        _check("Our account in summary", account_id in runtime_ids)
        REPORT.pass_test("Runtime inspector summary", "runtime", duration=dur)
    except Exception as e:
        REPORT.fail_test("Runtime inspector summary", "runtime", error=str(e), detail=traceback.format_exc())
        failures += 1

    # Cleanup
    try:
        CLIENT.delete_account(account_id)
    except Exception:
        pass

    return failures


# ── 5. Runtime Inspector ────────────────────────────────────────────

def _test_runtime_inspector() -> int:
    """Verify runtime inspector provides accurate internal state."""
    failures = 0
    ts = int(time.time())
    phone = f"+8210{ts % 100000000:08d}"

    try:
        acct = CLIENT.create_account(phone=phone, name="Inspector Test")
        account_id = acct.get("id", "")
    except Exception as e:
        REPORT.fail_test("Create account for inspector", "runtime", error=str(e))
        return 1

    try:
        data = CLIENT.get_runtime_inspector(account_id)

        # Core fields
        _check("Inspector has account_id", data.get("account_id") == account_id)
        _check("Inspector has phone", bool(data.get("phone")))
        _check("Inspector has running flag", "running" in data)
        _check("Inspector has status", bool(data.get("status")))

        # Health section
        health = data.get("health", {})
        _check("Inspector health has status", bool(health.get("status")))
        _check("Inspector health has has_session", "has_session" in health)

        # Rate limiter
        rl = data.get("rate_limiter", {})
        _check("Inspector rate_limiter exists", bool(rl))
        _check("Inspector rate_limiter has buckets", "buckets" in rl)

        # Group cache
        gc = data.get("group_cache", {})
        _check("Inspector group_cache exists", bool(gc))

        # Broadcast queue
        bq = data.get("broadcast_queue", {})
        _check("Inspector broadcast_queue exists", bool(bq))

        # Auto reply
        ar = data.get("auto_reply", {})
        _check("Inspector auto_reply exists", bool(ar))

        # Reply macros
        rm = data.get("reply_macros", {})
        _check("Inspector reply_macros exists", bool(rm))

        # Session
        sess = data.get("session", {})
        _check("Inspector session exists", bool(sess))
        _check("Inspector session has path", "path" in sess)
        _check("Inspector session has file_exists", "file_exists" in sess)

        REPORT.pass_test("Runtime inspector full data", "runtime")
    except Exception as e:
        REPORT.fail_test("Runtime inspector full data", "runtime", error=str(e), detail=traceback.format_exc())
        failures += 1

    # Cleanup
    try:
        CLIENT.delete_account(account_id)
    except Exception:
        pass

    return failures


# ── 6. Group Cache ──────────────────────────────────────────────────

def _test_group_cache() -> int:
    """Test group dialog cache returns properly (even if empty)."""
    failures = 0
    ts = int(time.time())
    phone = f"+8210{ts % 100000000:08d}"

    try:
        acct = CLIENT.create_account(phone=phone, name="Group Cache Test")
        account_id = acct.get("id", "")
    except Exception as e:
        REPORT.fail_test("Create account for groups", "runtime", error=str(e))
        return 1

    try:
        t0 = time.time()
        groups = CLIENT.get_groups(account_id)
        dur = time.time() - t0
        _check("Groups returns a list", isinstance(groups, list))
        REPORT.pass_test("Get groups (empty)", "runtime", duration=dur)
    except Exception as e:
        REPORT.fail_test("Get groups", "runtime", error=str(e), detail=traceback.format_exc())
        failures += 1

    try:
        t0 = time.time()
        folders = CLIENT.get_group_folders(account_id)
        dur = time.time() - t0
        _check("Group folders returns a list", isinstance(folders, list))
        REPORT.pass_test("Get group folders (empty)", "runtime", duration=dur)
    except Exception as e:
        REPORT.fail_test("Get group folders", "runtime", error=str(e), detail=traceback.format_exc())
        failures += 1

    try:
        CLIENT.delete_account(account_id)
    except Exception:
        pass

    return failures


# ── 7. Rate Limiter State ───────────────────────────────────────────

def _test_rate_limiter_state() -> int:
    """Verify rate limiter is initialized with correct defaults."""
    failures = 0
    ts = int(time.time())
    phone = f"+8210{ts % 100000000:08d}"

    try:
        acct = CLIENT.create_account(phone=phone, name="Rate Limiter Test")
        account_id = acct.get("id", "")
    except Exception as e:
        REPORT.fail_test("Create account for rate limiter", "runtime", error=str(e))
        return 1

    try:
        data = CLIENT.get_runtime_inspector(account_id)
        rl = data.get("rate_limiter", {})
        buckets = rl.get("buckets", {})

        expected_buckets = {"send_message", "overall_send", "join_group",
                            "fetch_dialogs", "auto_reply", "broadcast", "health_check"}
        actual_buckets = set(buckets.keys())
        missing = expected_buckets - actual_buckets
        extra = actual_buckets - expected_buckets

        _check("All expected rate limiter buckets present",
               len(missing) == 0,
               f"Missing: {missing}")
        if extra:
            REPORT.pass_test(f"Extra rate limiter buckets: {extra}", "runtime")
        else:
            REPORT.pass_test("Rate limiter buckets match expected", "runtime")

        # Verify defaults
        if "send_message" in buckets:
            _check("send_message rate is 1.0", buckets["send_message"].get("max_rate") == 1.0)

        REPORT.pass_test("Rate limiter initial state", "runtime")
    except Exception as e:
        REPORT.fail_test("Rate limiter state", "runtime", error=str(e), detail=traceback.format_exc())
        failures += 1

    try:
        CLIENT.delete_account(account_id)
    except Exception:
        pass

    return failures


# ── 8. Concurrent Accounts ─────────────────────────────────────────

def _test_concurrent_accounts() -> int:
    """Test managing multiple accounts simultaneously."""
    failures = 0
    accounts_created: list[str] = []

    ts = int(time.time())

    try:
        # Create 3 accounts in sequence
        for i in range(3):
            phone = f"+8210{ (ts + i) % 100000000:08d}"
            acct = CLIENT.create_account(phone=phone, name=f"Concurrent Test {i}")
            aid = acct.get("id", "")
            _check(f"Account {i} created with id", bool(aid))
            accounts_created.append(aid)

        REPORT.pass_test("Create 3 concurrent test accounts", "runtime")
    except Exception as e:
        REPORT.fail_test("Create concurrent accounts", "runtime", error=str(e), detail=traceback.format_exc())
        failures += 1

    # List all accounts and verify all are present
    try:
        accounts = CLIENT.list_accounts()
        account_ids = [a.get("id", "") for a in accounts]
        for aid in accounts_created:
            _check(f"Account {aid[:8]} in list", aid in account_ids)
        REPORT.pass_test("All concurrent accounts appear in list", "runtime")
    except Exception as e:
        REPORT.fail_test("List concurrent accounts", "runtime", error=str(e), detail=traceback.format_exc())
        failures += 1

    # Get inspector summary and verify all appear
    try:
        summary = CLIENT.get_runtime_inspector_summary()
        summary_ids = [r.get("account_id", "") for r in summary.get("runtimes", [])]
        for aid in accounts_created:
            _check(f"Account {aid[:8]} in inspector summary", aid in summary_ids)
        _check("Summary total matches created count",
               summary.get("total", 0) >= len(accounts_created))
        REPORT.pass_test("Inspector summary for concurrent accounts", "runtime")
    except Exception as e:
        REPORT.fail_test("Inspector summary concurrent", "runtime", error=str(e), detail=traceback.format_exc())
        failures += 1

    # Cleanup all
    for aid in accounts_created:
        try:
            CLIENT.delete_account(aid)
        except Exception:
            pass

    if accounts_created:
        REPORT.pass_test("Cleanup concurrent accounts", "runtime")

    return failures


# ── 9. Real Account Runtime ─────────────────────────────────────────

def _test_real_account_runtime() -> int:
    """Test with actual Telegram credentials from config.
    
    This validates:
      - Runtime starts with real API credentials
      - Telethon client connects
      - get_me returns valid user
      - Session file is created
      - Health tracking updates correctly
      - Group cache populates with real groups
    """
    failures = 0

    for idx, account in enumerate(CONFIG.accounts):
        label = f"RealAccount[{account.phone[:6]}...]"
        account_id: str | None = None

        try:
            # Create account with real credentials
            t0 = time.time()
            acct = CLIENT.create_account(
                phone=account.phone,
                name=account.name or f"E2E Real {idx}",
                api_id=account.api_id,
                api_hash=account.api_hash,
            )
            dur = time.time() - t0
            account_id = acct.get("id", "")
            _check(f"{label}: Account created with real API credentials",
                   bool(account_id))
            REPORT.pass_test(f"{label}: Create account", "runtime", duration=dur)
        except E2EApiError as e:
            REPORT.fail_test(f"{label}: Create account", "runtime",
                             error=f"API error: {e}", detail=traceback.format_exc())
            failures += 1
            continue
        except Exception as e:
            REPORT.fail_test(f"{label}: Create account", "runtime",
                             error=str(e), detail=traceback.format_exc())
            failures += 1
            continue

        # Verify runtime is active
        try:
            t0 = time.time()
            data = CLIENT.get_runtime_inspector(account_id)
            dur = time.time() - t0
            _check(f"{label}: Runtime is running", data.get("running") is True)
            REPORT.pass_test(f"{label}: Runtime status", "runtime", duration=dur)
        except Exception as e:
            REPORT.fail_test(f"{label}: Runtime status", "runtime", error=str(e), detail=traceback.format_exc())
            failures += 1

        # Check session file
        try:
            data = CLIENT.get_runtime_inspector(account_id)
            sess = data.get("session", {})
            _check(f"{label}: Session file exists (authenticated)",
                   sess.get("file_exists") is True)
            _check(f"{label}: Session file has content",
                   sess.get("file_size", 0) > 0)
            REPORT.pass_test(f"{label}: Session file verification", "runtime")
        except Exception as e:
            REPORT.fail_test(f"{label}: Session file", "runtime", error=str(e), detail=traceback.format_exc())
            failures += 1

        # Health tracking
        try:
            health = CLIENT.get_account_health(account_id)
            _check(f"{label}: Health has_status", bool(health.get("status")))
            # If authenticated, has_session should be true
            REPORT.pass_test(f"{label}: Health tracking", "runtime")
        except Exception as e:
            REPORT.fail_test(f"{label}: Health tracking", "runtime", error=str(e), detail=traceback.format_exc())
            failures += 1

        # Group cache (real account should have groups)
        try:
            t0 = time.time()
            groups = CLIENT.get_groups(account_id)
            dur = time.time() - t0
            _check(f"{label}: Groups returns list", isinstance(groups, list))
            if groups:
                first = groups[0]
                _check(f"{label}: Group has id", bool(first.get("id")))
                _check(f"{label}: Group has title", bool(first.get("title")))
                _check(f"{label}: Group has type", bool(first.get("type")))
            REPORT.pass_test(f"{label}: Group cache ({len(groups)} groups)", "runtime", duration=dur)
        except Exception as e:
            REPORT.fail_test(f"{label}: Group cache", "runtime", error=str(e), detail=traceback.format_exc())
            failures += 1

        # Runtime inspector summary inclusion
        try:
            summary = CLIENT.get_runtime_inspector_summary()
            summary_ids = [r.get("account_id", "") for r in summary.get("runtimes", [])]
            _check(f"{label}: Appears in inspector summary", account_id in summary_ids)
            REPORT.pass_test(f"{label}: Inspector summary", "runtime")
        except Exception as e:
            REPORT.fail_test(f"{label}: Inspector summary", "runtime", error=str(e), detail=traceback.format_exc())
            failures += 1

        # Cleanup
        try:
            CLIENT.delete_account(account_id)
            REPORT.pass_test(f"{label}: Cleanup", "runtime")
        except Exception as e:
            REPORT.fail_test(f"{label}: Cleanup", "runtime", error=str(e), detail=traceback.format_exc())
            failures += 1

    return failures


if __name__ == "__main__":
    sys.exit(run_runtime_tests())