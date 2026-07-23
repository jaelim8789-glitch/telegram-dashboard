"""
Reply Mode, Reply Macro, Broadcast, Scheduler 전 기능 통합 테스트.

실행: docker compose up 상태에서 python e2e/regression_test.py
"""

import json
import sys
import time
import traceback
import urllib.request
import urllib.error

BASE = "http://localhost/api"
PASS = 0
FAIL = 0
RESULTS = []


def log(msg: str):
    print(f"  {msg}")


def check(description: str, ok: bool, detail: str = ""):
    global PASS, FAIL
    status = "PASS" if ok else "FAIL"
    if ok:
        PASS += 1
    else:
        FAIL += 1
    RESULTS.append((status, description, detail))
    print(f"  [{status}] {description}")
    if detail:
        print(f"         {detail}")


def api(method: str, path: str, data: dict | None = None, token: str | None = None) -> tuple[int, dict]:
    url = f"{BASE}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            return e.code, json.loads(body)
        except json.JSONDecodeError:
            return e.code, {"detail": body}
    except Exception as e:
        return 0, {"detail": str(e)}


def main():
    global PASS, FAIL, RESULTS

    print("=" * 60)
    print("TeleMon Regression Test Suite")
    print("=" * 60)

    # ── 1. Health Check ──────────────────────────────────────────────
    print("\n--- 1. Health Check ---")
    status, body = api("GET", "/health")
    check("Health endpoint", status == 200)

    # ── 2. Admin Auth ──────────────────────────────────────────────
    print("\n--- 2. Admin Auth ---")
    status, body = api("POST", "/auth/login", {"username": "123123", "password": "123456"})
    check("Admin login", status == 200 and "access_token" in body, str(body))
    admin_token = body.get("access_token", "")

    if not admin_token:
        # Try alternate credentials
        status, body = api("POST", "/auth/login", {"username": "sksk2929", "password": "qpqpqp10!!"})
        check("Admin login (alt)", status == 200 and "access_token" in body, str(body))
        admin_token = body.get("access_token", "")

    if not admin_token:
        print("\n  ⚠  Cannot proceed without admin token. Skipping authenticated tests.")
        # Still test health
        print_summary()
        return

    # ── 3. Accounts ─────────────────────────────────────────────────
    print("\n--- 3. Accounts ---")
    status, body = api("GET", "/accounts", token=admin_token)
    check("List accounts", status == 200, str(body))
    accounts = body if isinstance(body, list) else []
    log(f"  Accounts found: {len(accounts)}")

    # ── 4. Broadcast API ────────────────────────────────────────────
    print("\n--- 4. Broadcast ---")
    account_id = accounts[0]["id"] if accounts else None
    if account_id:
        # Create broadcast (normal)
        broadcast_data = {
            "account_id": account_id,
            "message": f"E2E Test Broadcast {time.time()}",
            "recipients": ["@test_channel"],
            "delivery_mode": "normal",
        }
        status, body = api("POST", "/broadcast", broadcast_data, token=admin_token)
        check("Create broadcast (normal)", status == 200, str(body)[:100])
        broadcast_id = body.get("id", "")

        if broadcast_id:
            # Create broadcast (reply mode)
            reply_data = {
                "account_id": account_id,
                "message": f"E2E Reply Broadcast {time.time()}",
                "recipients": ["@test_channel"],
                "delivery_mode": "reply",
                "reply_to_message_id": 12345,
            }
            status, body = api("POST", "/broadcast", reply_data, token=admin_token)
            check("Create broadcast (reply mode)", status == 200 and body.get("delivery_mode") == "reply", str(body)[:100])

            # Scheduled broadcast
            scheduled_data = {
                "account_id": account_id,
                "message": f"E2E Scheduled {time.time()}",
                "recipients": ["@test_channel"],
                "scheduled_at": "2026-12-31T23:59:59Z",
            }
            status, body = api("POST", "/broadcast", scheduled_data, token=admin_token)
            check("Create broadcast (scheduled)", status == 200, str(body)[:100])

            # Recurring broadcast
            recurring_data = {
                "account_id": account_id,
                "message": f"E2E Recurring {time.time()}",
                "recipients": ["@test_channel"],
                "recurring_interval_minutes": 60,
            }
            status, body = api("POST", "/broadcast", recurring_data, token=admin_token)
            check("Create broadcast (recurring)", status == 200, str(body)[:100])
            recurring_id = body.get("id", "")

            # Get recurring broadcasts
            status, body = api("GET", "/broadcast/recurring", token=admin_token)
            check("Get recurring broadcasts", status == 200, f"count={len(body) if isinstance(body, list) else '?'}")

            # Cancel recurring
            if recurring_id:
                status, body = api("POST", f"/broadcast/{recurring_id}/cancel", token=admin_token)
                check("Cancel recurring broadcast", status == 200, str(body)[:100])

            # Pause/Unpause
            status, body = api("POST", f"/broadcast/{recurring_id}/pause", token=admin_token)
            check("Pause recurring broadcast", status == 200, str(body)[:100])

            status, body = api("POST", f"/broadcast/{recurring_id}/unpause", token=admin_token)
            check("Unpause recurring broadcast", status == 200, str(body)[:100])

            # Scheduled/upcoming
            status, body = api("GET", "/scheduler/upcoming", token=admin_token)
            check("Get upcoming scheduled broadcasts", status == 200, f"count={len(body) if isinstance(body, list) else '?'}")

            # Get all logs
            status, body = api("GET", "/logs?limit=50", token=admin_token)
            check("Get broadcast logs", status == 200, f"count={len(body) if isinstance(body, list) else '?'}")
    else:
        log("  ⚠  No accounts available, skipping broadcast tests")

    # ── 5. Reply Macro API ──────────────────────────────────────────
    print("\n--- 5. Reply Macro ---")
    if account_id:
        # Create reply macro
        macro_data = {
            "account_id": account_id,
            "name": f"E2E Test Macro {time.time()}",
            "target_chats": ["@test_chat"],
            "message_content": "E2E Auto Reply Message",
            "schedule_type": "interval",
            "interval_hours": 24,
            "max_sends_per_day": 10,
            "is_active": True,
            "reply_to_message_id": 12345,
        }
        status, body = api("POST", "/reply-macros", macro_data, token=admin_token)
        check("Create reply macro", status == 200, str(body)[:100])
        macro_id = body.get("id", "")

        if macro_id:
            # Update macro
            update_data = {"name": "E2E Updated Macro", "is_active": False}
            status, body = api("PUT", f"/reply-macros/{macro_id}", update_data, token=admin_token)
            check("Update reply macro", status == 200, str(body)[:100])

            # Get macro
            status, body = api("GET", f"/reply-macros/{macro_id}", token=admin_token)
            check("Get reply macro by ID", status == 200, str(body)[:100])

            # Get all macros
            status, body = api("GET", "/reply-macros", token=admin_token)
            check("List reply macros", status == 200, f"count={len(body) if isinstance(body, list) else '?'}")

            # Delete macro
            status, body = api("DELETE", f"/reply-macros/{macro_id}", token=admin_token)
            check("Delete reply macro", status == 200, str(body)[:100])
    else:
        log("  ⚠  No accounts available, skipping reply macro tests")

    # ── 6. Auto Reply ──────────────────────────────────────────────
    print("\n--- 6. Auto Reply ---")
    if account_id:
        # Get auto reply settings
        status, body = api("GET", f"/auto-reply/{account_id}", token=admin_token)
        check("Get auto reply settings", status == 200, str(body)[:100])

        # Toggle auto reply ON
        status, body = api("POST", f"/auto-reply/{account_id}/toggle", {"enabled": True}, token=admin_token)
        check("Toggle auto reply ON", status == 200, str(body)[:100])

        # Create auto reply rule
        rule_data = {
            "name": "E2E Test Rule",
            "match_type": "keyword",
            "match_value": "test",
            "reply_content": "E2E Auto Reply",
            "is_active": True,
        }
        status, body = api("POST", f"/auto-reply/{account_id}/rules", rule_data, token=admin_token)
        check("Create auto reply rule", status == 200, str(body)[:100])

        # Toggle auto reply OFF
        status, body = api("POST", f"/auto-reply/{account_id}/toggle", {"enabled": False}, token=admin_token)
        check("Toggle auto reply OFF", status == 200, str(body)[:100])
    else:
        log("  ⚠  No accounts available, skipping auto reply tests")

    # ── 7. Group Cache ──────────────────────────────────────────────
    print("\n--- 7. Groups ---")
    if account_id:
        status, body = api("GET", f"/accounts/{account_id}/groups", token=admin_token)
        check("Get account groups", status == 200, str(body)[:100])

        status, body = api("GET", f"/accounts/{account_id}/folders", token=admin_token)
        check("Get account folders", status == 200, str(body)[:100])
    else:
        log("  ⚠  No accounts available, skipping group tests")

    # ── 8. Account Health ──────────────────────────────────────────
    print("\n--- 8. Account Health ---")
    status, body = api("GET", "/health/accounts", token=admin_token)
    check("Get account health", status == 200, f"count={len(body) if isinstance(body, list) else '?'}")

    # ── Print Summary ──────────────────────────────────────────────
    print_summary()


def print_summary():
    global PASS, FAIL, RESULTS
    print("\n" + "=" * 60)
    print("REGRESSION TEST RESULTS")
    print("=" * 60)
    for status, desc, detail in RESULTS:
        print(f"  [{status}] {desc}")
    print("=" * 60)
    total = PASS + FAIL
    print(f"  TOTAL: {total}  |  PASS: {PASS}  |  FAIL: {FAIL}")
    if total > 0:
        print(f"  RATE:  {PASS / total * 100:.1f}%")
    print("=" * 60)

    if FAIL > 0:
        print("\n  ❌ REGRESSION: FAIL")
    else:
        print("\n  ✅ REGRESSION: PASS")
    print("=" * 60)


if __name__ == "__main__":
    main()
    sys.exit(0 if FAIL == 0 else 1)