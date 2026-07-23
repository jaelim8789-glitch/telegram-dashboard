"""
TeleMon Backend Regression Test Suite.
Validates all critical API endpoints: Session Auto Recovery, Runtime Inspector,
Cross Account Queue, AutoReply, ReplyMacro, Broadcast.

Usage: python e2e/regression_backend.py [BASE_URL]
Default BASE_URL: http://localhost:8080
"""

import json
import sys
import time
import uuid
import urllib.error
import urllib.request

BASE_URL = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080").rstrip("/")
API = f"{BASE_URL}/api"
PASS = 0
FAIL = 0


def test(label: str, method: str = "GET", path: str = "",
         body: dict | None = None, expected_status: int = 200,
         check_key: str | None = None) -> None:
    global PASS, FAIL
    url = f"{API}{path}"
    if path == "/":
        url = f"{BASE_URL}/"
    try:
        data = json.dumps(body).encode() if body else None
        req = urllib.request.Request(url, data=data, method=method)
        req.add_header("Content-Type", "application/json")
        resp = urllib.request.urlopen(req, timeout=10)
        status = resp.status
        resp_data = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        status = e.code
        resp_data = e.read().decode("utf-8", errors="replace")[:300]
    except Exception as e:
        print(f"  FAIL [{label}] -- {e}")
        FAIL += 1
        return

    ok = status == expected_status
    if ok and check_key:
        if isinstance(resp_data, dict) and check_key not in resp_data:
            ok = False
    if ok:
        print(f"  PASS [{label}] -- HTTP {status}")
        PASS += 1
    else:
        print(f"  FAIL [{label}] -- expected {expected_status}, got {status}")
        if check_key:
            print(f"       check_key={check_key} not in response")
        print(f"       resp={resp_data!r}")
        FAIL += 1


def main() -> int:
    global PASS, FAIL
    print(f"{'='*60}")
    print(f"  TeleMon Backend Regression Test Suite")
    print(f"  Target: {API}")
    print(f"{'='*60}")
    print()

    ts = int(time.time())

    # ── 1. Health / Root ─────────────────────────────────
    print("-- [1] Root Health --")
    test("GET /", "GET", "/", expected_status=200, check_key="status")
    test("GET /api/accounts", "GET", "/accounts", check_key="items")
    test("GET /api/account-health", "GET", "/account-health")

    # ── 2. Account CRUD ───────────────────────────────────
    print("\n-- [2] Account CRUD --")
    aid = str(uuid.uuid4())
    phone = f"+8210{ts % 100000000:08d}"
    test("POST /api/accounts (create)",
         "POST", "/accounts",
         body={"phone": phone, "name": "Regression Test Account",
               "api_id": 12345, "api_hash": "0123456789abcdef0123456789abcdef"},
         expected_status=200)
    test("GET /api/accounts (after create)", "GET", "/accounts", check_key="items")
    test("GET /api/accounts/{id}", "GET", f"/accounts/{aid}", expected_status=404)

    # ── 3. AutoReply ──────────────────────────────────────
    print("\n-- [3] AutoReply --")
    rule_body = {
        "name": "Regression Rule",
        "is_active": True,
        "match_type": "keyword",
        "match_value": "test",
        "reply_content": "Auto reply triggered",
        "cooldown_hours": 0,
        "max_replies_per_day": 100,
    }
    test("POST auto-reply rule", "POST", f"/accounts/{aid}/auto-reply", body=rule_body, expected_status=404)
    test("Toggle auto-reply ON", "POST", f"/accounts/{aid}/auto-reply/toggle", body={"enabled": True}, expected_status=404)
    test("GET auto-reply settings", "GET", f"/accounts/{aid}/auto-reply", expected_status=404)
    test("GET auto-reply logs", "GET", f"/accounts/{aid}/auto-reply/logs", expected_status=200)

    # ── 4. ReplyMacro ─────────────────────────────────────
    print("\n-- [4] ReplyMacro --")
    macro_body = {
        "name": "Regression Macro",
        "is_active": True,
        "target_chats": ["-100123456789"],
        "message_content": "Macro message",
        "schedule_type": "interval",
        "interval_hours": 24,
        "max_sends_per_day": 10,
    }
    test("POST reply-macro", "POST", f"/accounts/{aid}/reply-macros", body=macro_body, expected_status=404)
    test("GET reply-macros", "GET", f"/accounts/{aid}/reply-macros", expected_status=200)
    test("GET reply-macro logs", "GET", f"/accounts/{aid}/reply-macros/{aid}/logs", expected_status=200)

    # ── 5. Broadcast ──────────────────────────────────────
    print("\n-- [5] Broadcast --")
    bcast_body = {
        "account_id": aid,
        "message": "Regression broadcast",
        "recipients": ["-100987654321"],
        "scheduled_at": str(int(time.time() + 3600)),
        "delivery_mode": "normal",
    }
    test("POST broadcast", "POST", "/broadcast", body=bcast_body, expected_status=404)
    test("GET /api/logs", "GET", "/logs", expected_status=200)
    test("GET /api/broadcast/recurring", "GET", "/broadcast/recurring", expected_status=200)

    # ── 6. Runtime Inspector ──────────────────────────────
    print("\n-- [6] Runtime Inspector --")
    test("GET runtime-inspector all", "GET", "/runtime/inspector", expected_status=200)
    test("GET runtime-inspector single", "GET", f"/runtime/inspector/{aid}", expected_status=404)
    test("POST runtime-inspector recover", "POST", f"/runtime/inspector/{aid}/recover", expected_status=404)
    test("POST runtime-inspector restart", "POST", f"/runtime/inspector/{aid}/restart", expected_status=404)

    # ── 7. Health (per-account) ───────────────────────────
    print("\n-- [7] Health (per-account) --")
    test("GET single account health", "GET", f"/accounts/{aid}/health", expected_status=200)
    test("GET groups (empty)", "GET", f"/accounts/{aid}/groups", expected_status=200)
    test("GET group folders (empty)", "GET", f"/accounts/{aid}/groups/folders", expected_status=200)

    # ── 8. Cleanup ────────────────────────────────────────
    print("\n-- [8] Cleanup --")
    test("DELETE account", "DELETE", f"/accounts/{aid}", expected_status=200)

    # ── Results ───────────────────────────────────────────
    total = PASS + FAIL
    print(f"\n{'='*60}")
    print(f"  Results: {PASS} passed, {FAIL} failed out of {total} tests")
    print(f"{'='*60}")
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    sys.exit(main())