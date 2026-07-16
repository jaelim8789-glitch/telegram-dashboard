#!/usr/bin/env python3
"""Regression test runner that executes inside the Docker backend container."""

import json
import sys
import time
import urllib.request
import urllib.error

BASE = "http://localhost:8000"
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
    RESULTS.append((status, description))
    print(f"  [{status}] {description}")
    if detail:
        for line in str(detail)[:300].split("\n"):
            print(f"         {line}")


def api(method: str, path: str, data: dict | None = None) -> tuple[int, dict]:
    url = f"{BASE}{path}"
    headers = {"Content-Type": "application/json"}
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        b = e.read().decode()
        try:
            return e.code, json.loads(b)
        except json.JSONDecodeError:
            return e.code, {"detail": b}
    except Exception as e:
        return 0, {"detail": str(e)}


def main():
    global PASS, FAIL, RESULTS

    print("=" * 60)
    print("TeleMon Docker Regression Test Suite")
    print("=" * 60)

    # ── 1. Health ──────────────────────────────────────────────────
    print("\n--- 1. Health Check ---")
    status, body = api("GET", "/health")
    check("Health endpoint returns 200", status == 200)
    check("Health status is ok", body.get("status") == "ok", str(body))

    # ── 2. Auth ────────────────────────────────────────────────────
    print("\n--- 2. Admin Auth ---")
    status, body = api("POST", "/api/auth/login", {"username": "123123", "password": "123456"})
    check("Admin login status", status == 200, str(body)[:200])
    admin_token = body.get("access_token", "")
    check("Admin token received", bool(admin_token))

    if not admin_token:
        status, body = api("POST", "/api/auth/login", {"username": "sksk2929", "password": "qpqpqp10!!"})
        check("Admin login (alt) status", status == 200, str(body)[:200])
        admin_token = body.get("access_token", "")
        check("Admin token received (alt)", bool(admin_token))

    if not admin_token:
        log("  SKIP: No admin token")
        finish()
        return

    # ── 3. Auth'd GET /api/broadcast ───────────────────────────────
    print("\n--- 3. Broadcast API ---")
    headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}

    # List all broadcasts
    req = urllib.request.Request(f"{BASE}/api/broadcast", headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            status = resp.status
            body = json.loads(resp.read().decode())
            check("List broadcasts", status == 200)
            if isinstance(body, list):
                log(f"  Broadcasts count: {len(body)}")
    except urllib.error.HTTPError as e:
        check("List broadcasts", False, str(e))

    # Create broadcast (normal mode)
    create_data = json.dumps({
        "account_id": "test-account",
        "message": f"E2E Test {time.time()}",
        "recipients": ["@test"],
        "delivery_mode": "normal"
    }).encode()
    req = urllib.request.Request(f"{BASE}/api/broadcast", data=create_data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            b = json.loads(resp.read().decode())
            check("Create broadcast (normal)", True)
    except urllib.error.HTTPError as e:
        b = e.read().decode()
        check("Create broadcast (normal)", False, b)

    # Create broadcast (reply mode)
    reply_data = json.dumps({
        "account_id": "test-account",
        "message": f"E2E Reply {time.time()}",
        "recipients": ["@test"],
        "delivery_mode": "reply",
        "reply_to_message_id": 12345
    }).encode()
    req = urllib.request.Request(f"{BASE}/api/broadcast", data=reply_data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            b = json.loads(resp.read().decode())
            dm = b.get("delivery_mode", "?")
            check(f"Create broadcast (reply), delivery_mode={dm}", b.get("delivery_mode") == "reply")
    except urllib.error.HTTPError as e:
        b = e.read().decode()
        check("Create broadcast (reply)", False, b)

    # Create scheduled broadcast
    sched_data = json.dumps({
        "account_id": "test-account",
        "message": f"E2E Sched {time.time()}",
        "recipients": ["@test"],
        "scheduled_at": "2026-12-31T23:59:59Z"
    }).encode()
    req = urllib.request.Request(f"{BASE}/api/broadcast", data=sched_data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            check("Create broadcast (scheduled)", True)
    except urllib.error.HTTPError as e:
        check("Create broadcast (scheduled)", False, e.read().decode())

    # Create recurring broadcast
    rec_data = json.dumps({
        "account_id": "test-account",
        "message": f"E2E Rec {time.time()}",
        "recipients": ["@test"],
        "recurring_interval_minutes": 60
    }).encode()
    req = urllib.request.Request(f"{BASE}/api/broadcast", data=rec_data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            rec_id = json.loads(resp.read().decode()).get("id", "")
            check("Create broadcast (recurring)", True)

            # Cancel
            req2 = urllib.request.Request(f"{BASE}/api/broadcast/{rec_id}/cancel", headers=headers, method="POST")
            try:
                with urllib.request.urlopen(req2, timeout=10) as resp2:
                    check("Cancel recurring broadcast", True)
            except urllib.error.HTTPError as e2:
                check("Cancel recurring broadcast", False, e2.read().decode())
    except urllib.error.HTTPError as e:
        check("Create broadcast (recurring)", False, e.read().decode())

    # ── 4. Reply Macros ────────────────────────────────────────────
    print("\n--- 4. Reply Macros API ---")
    macro_data = json.dumps({
        "account_id": "test-account",
        "name": f"E2E Macro {time.time()}",
        "target_chats": ["@test"],
        "message_content": "Auto reply content",
        "schedule_type": "interval",
        "interval_hours": 24,
        "max_sends_per_day": 10,
        "is_active": True,
        "reply_to_message_id": 12345
    }).encode()
    req = urllib.request.Request(f"{BASE}/api/reply-macros", data=macro_data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            b = json.loads(resp.read().decode())
            macro_id = b.get("id", "")
            check("Create reply macro", bool(macro_id))
            if macro_id:
                # GET macro
                req2 = urllib.request.Request(f"{BASE}/api/reply-macros/{macro_id}", headers=headers)
                with urllib.request.urlopen(req2, timeout=10) as resp2:
                    check("Get reply macro by ID", True)

                # GET all
                req3 = urllib.request.Request(f"{BASE}/api/reply-macros", headers=headers)
                with urllib.request.urlopen(req3, timeout=10) as resp3:
                    b3 = json.loads(resp3.read().decode())
                    check("List reply macros", True, f"count={len(b3) if isinstance(b3, list) else '?'}")

                # DELETE
                req4 = urllib.request.Request(f"{BASE}/api/reply-macros/{macro_id}", headers=headers, method="DELETE")
                with urllib.request.urlopen(req4, timeout=10) as resp4:
                    check("Delete reply macro", True)
    except urllib.error.HTTPError as e:
        check("Create reply macro", False, e.read().decode())

    # ── 5. Auto Reply ────────────────────────────────────────────────
    print("\n--- 5. Auto Reply API ---")
    req = urllib.request.Request(f"{BASE}/api/auto-reply/test-account", headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            check("Get auto reply settings", True)
    except urllib.error.HTTPError as e:
        check("Get auto reply settings", False, e.read().decode())

    # ── 6. Health/Accounts ──────────────────────────────────────────
    print("\n--- 6. Account Health ---")
    req = urllib.request.Request(f"{BASE}/api/health/accounts", headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            b = json.loads(resp.read().decode())
            check("Get account health", True, f"count={len(b) if isinstance(b, list) else '?'}")
    except urllib.error.HTTPError as e:
        check("Get account health", False, e.read().decode())

    # ── Summary ────────────────────────────────────────────────────
    finish()


def finish():
    global PASS, FAIL, RESULTS
    print("\n" + "=" * 60)
    print("REGRESSION TEST RESULTS")
    print("=" * 60)
    for s, d in RESULTS:
        print(f"  [{s}] {d}")
    print("=" * 60)
    total = PASS + FAIL
    print(f"  TOTAL: {total}  |  PASS: {PASS}  |  FAIL: {FAIL}")
    if total > 0:
        print(f"  RATE:  {PASS / total * 100:.1f}%")
    print("=" * 60)
    verdict = "PASS" if FAIL == 0 else "FAIL"
    print(f"\n  VERDICT: {verdict}")
    sys.exit(0 if FAIL == 0 else 1)


if __name__ == "__main__":
    main()