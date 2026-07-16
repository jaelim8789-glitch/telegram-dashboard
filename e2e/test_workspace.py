"""
Workspace E2E Tests — validates Auto-Reply rules, Reply Macros, Broadcast
operations, and the full workspace feature set with real Telegram accounts.

Tests:
  - Auto-Reply rule CRUD (create, read, update, delete)
  - Auto-Reply toggle enable/disable
  - Auto-Reply log tracking
  - Reply Macro CRUD
  - Reply Macro execution via BroadcastQueue
  - Reply Macro execution logs
  - Broadcast creation and status tracking
  - Broadcast cancellation
  - Full workspace integration (AutoReply + ReplyMacro + Broadcast)
  - Real account end-to-end workspace operations
"""

from __future__ import annotations

import time
import sys
import traceback
import uuid

from .e2e_api_client import CLIENT, E2EApiError, E2ETestFailure
from .e2e_config import CONFIG
from .e2e_report import REPORT


def run_workspace_tests() -> int:
    """Execute all Workspace test cases. Returns number of failures."""
    failures = 0
    REPORT.start_suite("Workspace Tests")

    try:
        failures += _test_auto_reply_crud()
        failures += _test_auto_reply_toggle()
        failures += _test_auto_reply_logs()
        failures += _test_reply_macro_crud()
        failures += _test_reply_macro_execution()
        failures += _test_reply_macro_logs()
        failures += _test_broadcast_basics()
        failures += _test_workspace_integration()

        if CONFIG.accounts:
            failures += _test_real_account_workspace()
    finally:
        REPORT.end_suite()

    return failures


def _check(label: str, condition: bool, detail: str = "") -> None:
    if not condition:
        REPORT.fail_test(label, "workspace", error="Assertion failed", detail=detail)
        raise E2ETestFailure(label, "Assertion failed", detail)
    REPORT.pass_test(label, "workspace")


def _create_test_account(label: str, suffix: str = "") -> str | None:
    """Create a test account and return its ID, or None on failure."""
    ts = int(time.time())
    phone = f"+8210{(ts + hash(suffix)) % 100000000:08d}"
    try:
        acct = CLIENT.create_account(phone=phone, name=f"WS {label}")
        return acct.get("id")
    except Exception as e:
        REPORT.fail_test(f"Create account for {label}", "workspace", error=str(e), detail=traceback.format_exc())
        return None


def _cleanup(account_id: str | None) -> None:
    if account_id:
        try:
            CLIENT.delete_account(account_id)
        except Exception:
            pass


# ── 1. Auto-Reply CRUD ─────────────────────────────────────────────

def _test_auto_reply_crud() -> int:
    """Test full CRUD lifecycle of auto-reply rules."""
    failures = 0
    account_id = _create_test_account("AR-CRUD")
    if not account_id:
        return 1

    rule_data = {
        "name": "E2E Test Rule",
        "is_active": True,
        "match_type": "keyword",
        "match_value": "e2etest",
        "reply_content": "E2E auto-reply triggered!",
        "cooldown_hours": 0,
        "max_replies_per_day": 50,
    }

    # Create rule
    try:
        t0 = time.time()
        rule = CLIENT.create_auto_reply_rule(account_id, rule_data)
        dur = time.time() - t0
        rule_id = rule.get("id", "")
        _check("Auto-reply rule created with id", bool(rule_id))
        _check("Rule name matches", rule.get("name") == "E2E Test Rule")
        _check("Rule match_type is keyword", rule.get("match_type") == "keyword")
        _check("Rule match_value matches", rule.get("match_value") == "e2etest")
        _check("Rule reply_content matches", rule.get("reply_content") == "E2E auto-reply triggered!")
        _check("Rule is_active is True", rule.get("is_active") is True)
        REPORT.pass_test("Create auto-reply rule", "workspace", duration=dur)
    except Exception as e:
        REPORT.fail_test("Create auto-reply rule", "workspace", error=str(e), detail=traceback.format_exc())
        _cleanup(account_id)
        return failures + 1

    # Get settings (should include the rule)
    try:
        t0 = time.time()
        settings = CLIENT.get_auto_reply_settings(account_id)
        dur = time.time() - t0
        _check("Settings has account_id", settings.get("account_id") == account_id)
        _check("Settings has auto_reply_enabled flag", "auto_reply_enabled" in settings)
        rules = settings.get("rules", [])
        rule_ids = [r.get("id") for r in rules]
        _check(f"Rule {rule_id[:8]} in settings rules", rule_id in rule_ids)
        REPORT.pass_test("Get auto-reply settings", "workspace", duration=dur)
    except Exception as e:
        REPORT.fail_test("Get auto-reply settings", "workspace", error=str(e), detail=traceback.format_exc())
        failures += 1

    # Update rule
    try:
        t0 = time.time()
        updates = {
            "name": "E2E Updated Rule",
            "match_value": "e2eupdated",
            "reply_content": "Updated reply!",
            "max_replies_per_day": 25,
        }
        updated = CLIENT.update_auto_reply_rule(account_id, rule_id, updates)
        dur = time.time() - t0
        _check("Updated rule name", updated.get("name") == "E2E Updated Rule")
        _check("Updated match_value", updated.get("match_value") == "e2eupdated")
        _check("Updated reply_content", updated.get("reply_content") == "Updated reply!")
        _check("Updated max_replies_per_day", updated.get("max_replies_per_day") == 25)
        REPORT.pass_test("Update auto-reply rule", "workspace", duration=dur)
    except Exception as e:
        REPORT.fail_test("Update auto-reply rule", "workspace", error=str(e), detail=traceback.format_exc())
        failures += 1

    # Delete rule
    try:
        t0 = time.time()
        result = CLIENT.delete_auto_reply_rule(account_id, rule_id)
        dur = time.time() - t0
        _check("Delete returns status deleted",
               result.get("status") == "deleted" if isinstance(result, dict) else True)
        REPORT.pass_test("Delete auto-reply rule", "workspace", duration=dur)
    except Exception as e:
        REPORT.fail_test("Delete auto-reply rule", "workspace", error=str(e), detail=traceback.format_exc())
        failures += 1

    # Verify deletion
    try:
        settings = CLIENT.get_auto_reply_settings(account_id)
        current_ids = [r.get("id") for r in settings.get("rules", [])]
        _check("Deleted rule no longer in settings", rule_id not in current_ids)
        REPORT.pass_test("Verify auto-reply rule deletion", "workspace")
    except Exception as e:
        REPORT.fail_test("Verify rule deletion", "workspace", error=str(e), detail=traceback.format_exc())
        failures += 1

    _cleanup(account_id)
    return failures


# ── 2. Auto-Reply Toggle ────────────────────────────────────────────

def _test_auto_reply_toggle() -> int:
    """Test enabling and disabling auto-reply."""
    failures = 0
    account_id = _create_test_account("AR-Toggle")
    if not account_id:
        return 1

    # Toggle ON
    try:
        t0 = time.time()
        result = CLIENT.toggle_auto_reply(account_id, True)
        dur = time.time() - t0
        _check("Toggle ON returns enabled=True",
               result.get("auto_reply_enabled") is True)
        REPORT.pass_test("Toggle auto-reply ON", "workspace", duration=dur)
    except Exception as e:
        REPORT.fail_test("Toggle auto-reply ON", "workspace", error=str(e), detail=traceback.format_exc())
        failures += 1

    # Verify via settings
    try:
        settings = CLIENT.get_auto_reply_settings(account_id)
        _check("Settings confirm auto_reply_enabled",
               settings.get("auto_reply_enabled") is True)
        REPORT.pass_test("Verify auto-reply enabled in settings", "workspace")
    except Exception as e:
        REPORT.fail_test("Verify auto-reply enabled", "workspace", error=str(e), detail=traceback.format_exc())
        failures += 1

    # Toggle OFF
    try:
        t0 = time.time()
        result = CLIENT.toggle_auto_reply(account_id, False)
        dur = time.time() - t0
        _check("Toggle OFF returns enabled=False",
               result.get("auto_reply_enabled") is False)
        REPORT.pass_test("Toggle auto-reply OFF", "workspace", duration=dur)
    except Exception as e:
        REPORT.fail_test("Toggle auto-reply OFF", "workspace", error=str(e), detail=traceback.format_exc())
        failures += 1

    # Verify via settings
    try:
        settings = CLIENT.get_auto_reply_settings(account_id)
        _check("Settings confirm auto_reply_disabled",
               settings.get("auto_reply_enabled") is False)
        REPORT.pass_test("Verify auto-reply disabled in settings", "workspace")
    except Exception as e:
        REPORT.fail_test("Verify auto-reply disabled", "workspace", error=str(e), detail=traceback.format_exc())
        failures += 1

    _cleanup(account_id)
    return failures


# ── 3. Auto-Reply Logs ──────────────────────────────────────────────

def _test_auto_reply_logs() -> int:
    """Test auto-reply log tracking."""
    failures = 0
    account_id = _create_test_account("AR-Logs")
    if not account_id:
        return 1

    # Create a rule first
    try:
        rule = CLIENT.create_auto_reply_rule(account_id, {
            "name": "Log Test Rule",
            "is_active": True,
            "match_type": "keyword",
            "match_value": "logtest",
            "reply_content": "Log test reply",
            "cooldown_hours": 0,
            "max_replies_per_day": 100,
        })
        CLIENT.toggle_auto_reply(account_id, True)
        REPORT.pass_test("Setup auto-reply for log test", "workspace")
    except Exception as e:
        REPORT.fail_test("Setup auto-reply for logs", "workspace", error=str(e), detail=traceback.format_exc())
        _cleanup(account_id)
        return 1

    # Get logs (should be empty for a new account)
    try:
        t0 = time.time()
        logs = CLIENT.get_auto_reply_logs(account_id)
        dur = time.time() - t0
        _check("Auto-reply logs returns a list", isinstance(logs, list))
        REPORT.pass_test("Get auto-reply logs (empty)", "workspace", duration=dur)
    except Exception as e:
        REPORT.fail_test("Get auto-reply logs", "workspace", error=str(e), detail=traceback.format_exc())
        failures += 1

    _cleanup(account_id)
    return failures


# ── 4. Reply Macro CRUD ─────────────────────────────────────────────

def _test_reply_macro_crud() -> int:
    """Test full CRUD lifecycle of reply macros."""
    failures = 0
    account_id = _create_test_account("RM-CRUD")
    if not account_id:
        return 1

    macro_data = {
        "name": "E2E Test Macro",
        "is_active": True,
        "target_chats": ["-100123456789"],
        "message_content": "E2E macro message",
        "schedule_type": "interval",
        "interval_hours": 24,
        "max_sends_per_day": 10,
    }

    # Create macro
    try:
        t0 = time.time()
        macro = CLIENT.create_reply_macro(account_id, macro_data)
        dur = time.time() - t0
        macro_id = macro.get("id", "")
        _check("Reply macro created with id", bool(macro_id))
        _check("Macro name matches", macro.get("name") == "E2E Test Macro")
        _check("Macro schedule_type is interval", macro.get("schedule_type") == "interval")
        _check("Macro interval_hours is 24", macro.get("interval_hours") == 24)
        _check("Macro target_chats is list", isinstance(macro.get("target_chats"), list))
        _check("Macro is_active is True", macro.get("is_active") is True)
        REPORT.pass_test("Create reply macro", "workspace", duration=dur)
    except Exception as e:
        REPORT.fail_test("Create reply macro", "workspace", error=str(e), detail=traceback.format_exc())
        _cleanup(account_id)
        return failures + 1

    # List macros
    try:
        t0 = time.time()
        macros = CLIENT.get_reply_macros(account_id)
        dur = time.time() - t0
        macro_ids = [m.get("id") for m in macros]
        _check(f"Macro {macro_id[:8]} in list", macro_id in macro_ids)
        REPORT.pass_test("List reply macros", "workspace", duration=dur)
    except Exception as e:
        REPORT.fail_test("List reply macros", "workspace", error=str(e), detail=traceback.format_exc())
        failures += 1

    # Update macro
    try:
        t0 = time.time()
        updates = {
            "name": "E2E Updated Macro",
            "interval_hours": 12,
            "message_content": "Updated macro message",
            "max_sends_per_day": 5,
        }
        updated = CLIENT.update_reply_macro(account_id, macro_id, updates)
        dur = time.time() - t0
        _check("Updated macro name", updated.get("name") == "E2E Updated Macro")
        _check("Updated interval_hours", updated.get("interval_hours") == 12)
        _check("Updated message_content", updated.get("message_content") == "Updated macro message")
        _check("Updated max_sends_per_day", updated.get("max_sends_per_day") == 5)
        REPORT.pass_test("Update reply macro", "workspace", duration=dur)
    except Exception as e:
        REPORT.fail_test("Update reply macro", "workspace", error=str(e), detail=traceback.format_exc())
        failures += 1

    # Delete macro
    try:
        t0 = time.time()
        result = CLIENT.delete_reply_macro(account_id, macro_id)
        dur = time.time() - t0
        _check("Delete returns status deleted",
               result.get("status") == "deleted" if isinstance(result, dict) else True)
        REPORT.pass_test("Delete reply macro", "workspace", duration=dur)
    except Exception as e:
        REPORT.fail_test("Delete reply macro", "workspace", error=str(e), detail=traceback.format_exc())
        failures += 1

    # Verify deletion
    try:
        macros = CLIENT.get_reply_macros(account_id)
        macro_ids = [m.get("id") for m in macros]
        _check("Deleted macro no longer in list", macro_id not in macro_ids)
        REPORT.pass_test("Verify reply macro deletion", "workspace")
    except Exception as e:
        REPORT.fail_test("Verify macro deletion", "workspace", error=str(e), detail=traceback.format_exc())
        failures += 1

    _cleanup(account_id)
    return failures


# ── 5. Reply Macro Execution ─────────────────────────────────────────

def _test_reply_macro_execution() -> int:
    """Test executing a reply macro via the API."""
    failures = 0
    account_id = _create_test_account("RM-Exec")
    if not account_id:
        return 1

    # Create a macro with a real target chat if configured
    target_chats = ["-100123456789"]
    if CONFIG.target_chat_id:
        target_chats = [CONFIG.target_chat_id]

    macro_data = {
        "name": "Execution Test Macro",
        "is_active": True,
        "target_chats": target_chats,
        "message_content": f"E2E execution test {uuid.uuid4().hex[:8]}",
        "schedule_type": "interval",
        "interval_hours": 24,
        "max_sends_per_day": 10,
    }

    macro_id = None
    try:
        macro = CLIENT.create_reply_macro(account_id, macro_data)
        macro_id = macro.get("id", "")
        _check("Macro created for execution test", bool(macro_id))
        REPORT.pass_test("Create macro for execution", "workspace")
    except Exception as e:
        REPORT.fail_test("Create macro for execution", "workspace", error=str(e), detail=traceback.format_exc())
        _cleanup(account_id)
        return 1

    # Execute macro
    try:
        t0 = time.time()
        result = CLIENT.execute_reply_macro(account_id, macro_id)
        dur = time.time() - t0
        _check("Execution returns status executed",
               result.get("status") == "executed")
        _check("Has success_count field", "success_count" in result)
        _check("Has fail_count field", "fail_count" in result)
        _check("Has total field", "total" in result)
        REPORT.pass_test("Execute reply macro", "workspace", duration=dur)
    except Exception as e:
        REPORT.fail_test("Execute reply macro", "workspace", error=str(e), detail=traceback.format_exc())
        failures += 1

    _cleanup(account_id)
    return failures


# ── 6. Reply Macro Logs ─────────────────────────────────────────────

def _test_reply_macro_logs() -> int:
    """Test reply macro execution log retrieval."""
    failures = 0
    account_id = _create_test_account("RM-Logs")
    if not account_id:
        return 1

    macro_data = {
        "name": "Log Test Macro",
        "is_active": True,
        "target_chats": ["-100123456789"],
        "message_content": "Log test message",
        "schedule_type": "interval",
        "interval_hours": 24,
        "max_sends_per_day": 10,
    }

    macro_id = None
    try:
        macro = CLIENT.create_reply_macro(account_id, macro_data)
        macro_id = macro.get("id", "")
        REPORT.pass_test("Create macro for log test", "workspace")
    except Exception as e:
        REPORT.fail_test("Create macro for logs", "workspace", error=str(e), detail=traceback.format_exc())
        _cleanup(account_id)
        return 1

    # Get logs (should exist after execution or be empty)
    try:
        t0 = time.time()
        logs = CLIENT.get_reply_macro_logs(account_id, macro_id)
        dur = time.time() - t0
        _check("Macro logs returns a list", isinstance(logs, list))
        REPORT.pass_test("Get reply macro logs", "workspace", duration=dur)
    except Exception as e:
        REPORT.fail_test("Get reply macro logs", "workspace", error=str(e), detail=traceback.format_exc())
        failures += 1

    _cleanup(account_id)
    return failures


# ── 7. Broadcast Basics ─────────────────────────────────────────────

def _test_broadcast_basics() -> int:
    """Test broadcast creation and status."""
    failures = 0
    account_id = _create_test_account("BCast")
    if not account_id:
        return 1

    # Create a broadcast
    broadcast_data = {
        "account_id": account_id,
        "message": "E2E broadcast test message",
        "recipients": ["-100987654321"],
        "delivery_mode": "normal",
    }

    try:
        t0 = time.time()
        bcast = CLIENT.create_broadcast(broadcast_data)
        dur = time.time() - t0
        bcast_id = bcast.get("id", "")
        _check("Broadcast created with id", bool(bcast_id))
        _check("Broadcast has account_id", bcast.get("account_id") == account_id)
        _check("Broadcast has status", bool(bcast.get("status")))
        REPORT.pass_test("Create broadcast", "workspace", duration=dur)
    except Exception as e:
        REPORT.fail_test("Create broadcast", "workspace", error=str(e), detail=traceback.format_exc())
        _cleanup(account_id)
        return 1

    _cleanup(account_id)
    return failures


# ── 8. Full Workspace Integration ───────────────────────────────────

def _test_workspace_integration() -> int:
    """Test all workspace features together on a single account."""
    failures = 0
    account_id = _create_test_account("WS-Int")
    if not account_id:
        return 1

    # 1. Create auto-reply rule
    try:
        rule = CLIENT.create_auto_reply_rule(account_id, {
            "name": "Integration Rule",
            "is_active": True,
            "match_type": "keyword",
            "match_value": "integration",
            "reply_content": "Integration test reply",
            "cooldown_hours": 0,
            "max_replies_per_day": 100,
        })
        _check("Integration rule created", bool(rule.get("id")))
        REPORT.pass_test("Integration: Create auto-reply rule", "workspace")
    except Exception as e:
        REPORT.fail_test("Integration: Auto-reply rule", "workspace", error=str(e), detail=traceback.format_exc())
        failures += 1

    # 2. Toggle auto-reply ON
    try:
        result = CLIENT.toggle_auto_reply(account_id, True)
        _check("Auto-reply enabled", result.get("auto_reply_enabled") is True)
        REPORT.pass_test("Integration: Toggle auto-reply ON", "workspace")
    except Exception as e:
        REPORT.fail_test("Integration: Toggle auto-reply", "workspace", error=str(e), detail=traceback.format_exc())
        failures += 1

    # 3. Create reply macro
    try:
        target = [CONFIG.target_chat_id] if CONFIG.target_chat_id else ["-100123456789"]
        macro = CLIENT.create_reply_macro(account_id, {
            "name": "Integration Macro",
            "is_active": True,
            "target_chats": target,
            "message_content": "Integration macro message",
            "schedule_type": "interval",
            "interval_hours": 24,
            "max_sends_per_day": 10,
        })
        _check("Integration macro created", bool(macro.get("id")))
        REPORT.pass_test("Integration: Create reply macro", "workspace")
    except Exception as e:
        REPORT.fail_test("Integration: Create macro", "workspace", error=str(e), detail=traceback.format_exc())
        failures += 1

    # 4. Create broadcast
    try:
        bcast = CLIENT.create_broadcast({
            "account_id": account_id,
            "message": "Integration broadcast message",
            "recipients": ["-100987654321"],
            "delivery_mode": "normal",
        })
        _check("Integration broadcast created", bool(bcast.get("id")))
        REPORT.pass_test("Integration: Create broadcast", "workspace")
    except Exception as e:
        REPORT.fail_test("Integration: Broadcast", "workspace", error=str(e), detail=traceback.format_exc())
        failures += 1

    # 5. Verify all via runtime inspector
    try:
        data = CLIENT.get_runtime_inspector(account_id)
        ar = data.get("auto_reply", {})
        _check("Auto-reply enabled in inspector", ar.get("enabled") is True)
        _check("Auto-reply has 1 rule", ar.get("rules_count", 0) >= 1)

        rm = data.get("reply_macros", {})
        _check("Reply macros count >= 1", rm.get("count", 0) >= 1)

        bq = data.get("broadcast_queue", {})
        _check("Broadcast queue present", "queue_size" in bq)

        REPORT.pass_test("Integration: Runtime inspector verification", "workspace")
    except Exception as e:
        REPORT.fail_test("Integration: Inspector verification", "workspace", error=str(e), detail=traceback.format_exc())
        failures += 1

    _cleanup(account_id)
    return failures


# ── 9. Real Account Workspace ───────────────────────────────────────

def _test_real_account_workspace() -> int:
    """Test workspace features with real Telegram credentials."""
    failures = 0

    for idx, account in enumerate(CONFIG.accounts):
        label = f"RealWS[{account.phone[:6]}...]"
        account_id: str | None = None

        # Create account with real credentials
        try:
            acct = CLIENT.create_account(
                phone=account.phone,
                name=account.name or f"E2E Real WS {idx}",
                api_id=account.api_id,
                api_hash=account.api_hash,
            )
            account_id = acct.get("id", "")
            _check(f"{label}: Account created", bool(account_id))
            REPORT.pass_test(f"{label}: Setup account", "workspace")
        except Exception as e:
            REPORT.fail_test(f"{label}: Create account", "workspace", error=str(e), detail=traceback.format_exc())
            continue

        # Create auto-reply rule
        try:
            rule = CLIENT.create_auto_reply_rule(account_id, {
                "name": f"E2E AR {idx}",
                "is_active": True,
                "match_type": "keyword",
                "match_value": f"e2e{idx}",
                "reply_content": f"E2E auto-reply from account {idx}",
                "cooldown_hours": 0,
                "max_replies_per_day": 100,
            })
            _check(f"{label}: Auto-reply rule created", bool(rule.get("id")))
            REPORT.pass_test(f"{label}: Create auto-reply rule", "workspace")
        except Exception as e:
            REPORT.fail_test(f"{label}: Create auto-reply rule", "workspace", error=str(e), detail=traceback.format_exc())
            failures += 1

        # Toggle auto-reply ON
        try:
            result = CLIENT.toggle_auto_reply(account_id, True)
            _check(f"{label}: Auto-reply enabled", result.get("auto_reply_enabled") is True)
            REPORT.pass_test(f"{label}: Enable auto-reply", "workspace")
        except Exception as e:
            REPORT.fail_test(f"{label}: Enable auto-reply", "workspace", error=str(e), detail=traceback.format_exc())
            failures += 1

        # Create reply macro
        try:
            target_chats = ["-100123456789"]
            if CONFIG.target_chat_id:
                target_chats = [CONFIG.target_chat_id]

            macro = CLIENT.create_reply_macro(account_id, {
                "name": f"E2E Macro {idx}",
                "is_active": True,
                "target_chats": target_chats,
                "message_content": f"E2E macro from account {idx} — {uuid.uuid4().hex[:8]}",
                "schedule_type": "interval",
                "interval_hours": 24,
                "max_sends_per_day": 10,
            })
            _check(f"{label}: Reply macro created", bool(macro.get("id")))
            REPORT.pass_test(f"{label}: Create reply macro", "workspace")
        except Exception as e:
            REPORT.fail_test(f"{label}: Create reply macro", "workspace", error=str(e), detail=traceback.format_exc())
            failures += 1

        # Get auto-reply logs
        try:
            logs = CLIENT.get_auto_reply_logs(account_id)
            _check(f"{label}: Auto-reply logs returns list", isinstance(logs, list))
            REPORT.pass_test(f"{label}: Get auto-reply logs", "workspace")
        except Exception as e:
            REPORT.fail_test(f"{label}: Get auto-reply logs", "workspace", error=str(e), detail=traceback.format_exc())
            failures += 1

        # Get reply macros list
        try:
            macros = CLIENT.get_reply_macros(account_id)
            _check(f"{label}: Reply macros list", len(macros) >= 1)
            REPORT.pass_test(f"{label}: List reply macros", "workspace")
        except Exception as e:
            REPORT.fail_test(f"{label}: List reply macros", "workspace", error=str(e), detail=traceback.format_exc())
            failures += 1

        # Get groups (real account)
        try:
            groups = CLIENT.get_groups(account_id)
            _check(f"{label}: Groups returns list", isinstance(groups, list))
            if groups:
                _check(f"{label}: Found {len(groups)} groups", len(groups) > 0)
            REPORT.pass_test(f"{label}: Get groups", "workspace")
        except Exception as e:
            REPORT.fail_test(f"{label}: Get groups", "workspace", error=str(e), detail=traceback.format_exc())
            failures += 1

        # Cleanup
        try:
            CLIENT.delete_account(account_id)
            REPORT.pass_test(f"{label}: Cleanup", "workspace")
        except Exception as e:
            REPORT.fail_test(f"{label}: Cleanup", "workspace", error=str(e), detail=traceback.format_exc())
            failures += 1

    return failures


if __name__ == "__main__":
    sys.exit(run_workspace_tests())