"""
TeleMon P0 QA Full Test -- End-to-End verification of all core features.
Covers: Health -> Auth -> Account CRUD -> Runtime -> Auto-Reply -> Reply Macro -> Broadcast -> Logs -> Cleanup
"""
from __future__ import annotations

import sys
import os
import json
import time
import urllib.request
import urllib.error

BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api"
TOKEN_HOLDER: list[str] = [""]

results = {"pass": 0, "fail": 0, "details": []}


def log(status: str, label: str, detail: str = "") -> None:
    results["details"].append({"status": status, "label": label, "detail": detail})
    if status == "PASS":
        results["pass"] += 1
    else:
        results["fail"] += 1
    sys.stdout.write(f"  [{status}] {label}" + (f" -- {detail}" if detail else "") + "\n")
    sys.stdout.flush()


def api(method: str, path: str, body: dict | None = None, timeout: int = 30):
    """Make an API call and return (status_code, parsed_body)."""
    url = API_URL + path
    data = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    token = TOKEN_HOLDER[0]
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        resp = urllib.request.urlopen(req, timeout=timeout)
        raw = resp.read()
        parsed = json.loads(raw) if raw else {}
        return resp.status, parsed
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        return e.code, raw
    except Exception as e:
        return 0, str(e)


def check(label: str, condition: bool, detail: str = "") -> None:
    if condition:
        log("PASS", label, detail)
    else:
        log("FAIL", label, detail)


# ==== Step 1: Health Check ====
print("=" * 60)
print("  [1] Health Check")
print("=" * 60)
try:
    resp = urllib.request.urlopen(f"{BASE_URL}/", timeout=10)
    health_data = json.loads(resp.read())
    check("GET / (health)", health_data.get("status") == "ok", str(health_data))
except Exception as e:
    check("GET / (health)", False, str(e))

# ==== Step 2: Admin Registration & Login ====
print()
print("=" * 60)
print("  [2] Admin Registration & Authentication")
print("=" * 60)

# First try to register a new admin user
try:
    req = urllib.request.Request(
        f"{API_URL}/admin/register",
        data=json.dumps({"username": "123123", "password": "123456", "email": "admin@telemon.io"}).encode("utf-8"),
        method="POST",
    )
    req.add_header("Content-Type", "application/json")
    resp = urllib.request.urlopen(req, timeout=10)
    reg_data = json.loads(resp.read())
    check("POST /api/admin/register", bool(reg_data.get("id")), f"user_id={reg_data.get('id','')[:12]}...")
except urllib.error.HTTPError as e:
    if e.code == 409:
        check("POST /api/admin/register (already exists)", True, "user already registered")
    else:
        check("POST /api/admin/register", False, f"HTTP {e.code}")
except Exception as e:
    check("POST /api/admin/register", False, str(e))

# Now login
try:
    req = urllib.request.Request(
        f"{API_URL}/admin/login",
        data=json.dumps({"username": "123123", "password": "123456"}).encode("utf-8"),
        method="POST",
    )
    req.add_header("Content-Type", "application/json")
    resp = urllib.request.urlopen(req, timeout=10)
    auth_data = json.loads(resp.read())
    token = auth_data.get("access_token", "")
    check("POST /api/admin/login", bool(token), f"token={token[:16]}...")
    TOKEN_HOLDER[0] = token
except Exception as e:
    check("POST /api/admin/login", False, str(e))

if not TOKEN_HOLDER[0]:
    print("\n  [ABORT] No auth token -- cannot continue")
    sys.exit(1)

# ==== Step 3: Account CRUD ====
print()
print("=" * 60)
print("  [3] Account Registration (CRUD)")
print("=" * 60)
ts = int(time.time())
phone = f"+8210{ts % 100000000:08d}"
aid = ""

status, data = api("GET", "/accounts")
check("GET /api/accounts (list)", status == 200)
if status == 200:
    items = data.get("items", []) if isinstance(data, dict) else []
    print(f"         Existing accounts: {len(items)}")

status, data = api("POST", "/accounts", {"phone": phone, "name": "QA Full Test"})
aid = data.get("id", "") if status == 200 else ""
check("POST /api/accounts (create)", status == 200 and bool(aid), str(data)[:100])

if aid:
    status, data = api("GET", f"/accounts/{aid}")
    check("GET /api/accounts/{id}", status == 200 and isinstance(data, dict) and data.get("phone") == phone)

# ==== Step 4: Runtime Lifecycle ====
print()
print("=" * 60)
print("  [4] Runtime Management")
print("=" * 60)
if aid:
    status, data = api("GET", f"/runtime/inspector/{aid}")
    check("Runtime inspector", status == 200 and isinstance(data, dict) and "account_id" in data)

    status, data = api("POST", f"/runtime/inspector/{aid}/restart")
    check("Restart runtime", status == 200)

    status, data = api("POST", f"/runtime/inspector/{aid}/recover")
    check("Trigger recovery", status == 200)

    status, data = api("GET", "/runtime/inspector")
    check("Runtime inspector summary", status == 200 and isinstance(data, dict) and "total" in data)

# ==== Step 5: Health Monitoring ====
print()
print("=" * 60)
print("  [5] Health Monitoring")
print("=" * 60)
if aid:
    status, data = api("GET", f"/accounts/{aid}/health")
    check("Account health endpoint", status == 200 and isinstance(data, dict) and "status" in data)

status, data = api("GET", "/account-health")
check("List all health", status == 200)

# ==== Step 6: Groups / Dialogs ====
print()
print("=" * 60)
print("  [6] Groups & Folders")
print("=" * 60)
if aid:
    status, data = api("GET", f"/accounts/{aid}/groups")
    check("Get groups", status == 200)

    status, data = api("GET", f"/accounts/{aid}/groups/folders")
    check("Get group folders", status == 200)

# ==== Step 7: Auto-Reply ====
print()
print("=" * 60)
print("  [7] Auto-Reply")
print("=" * 60)
rid = ""
if aid:
    status, data = api("GET", f"/accounts/{aid}/auto-reply")
    check("Auto-reply settings", status == 200 and isinstance(data, dict))

    status, data = api(
        "POST",
        f"/accounts/{aid}/auto-reply",
        {
            "name": "QA Test Rule",
            "is_active": True,
            "match_type": "keyword",
            "match_value": "qatest",
            "reply_content": "QA test auto-reply",
            "cooldown_hours": 0,
            "max_replies_per_day": 50,
        },
    )
    rid = data.get("id", "") if status == 200 else ""
    check("Create auto-reply rule", status == 200 and bool(rid))

    if rid:
        status, data = api(
            "PUT",
            f"/accounts/{aid}/auto-reply/{rid}",
            {"name": "QA Updated Rule", "match_value": "qaupdated"},
        )
        check("Update auto-reply rule", status == 200)

    status, data = api("POST", f"/accounts/{aid}/auto-reply/toggle", {"enabled": True})
    check("Toggle auto-reply ON", status == 200)

    status, data = api("GET", f"/accounts/{aid}/auto-reply/logs")
    check("Auto-reply logs", status == 200)

    if rid:
        status, data = api("DELETE", f"/accounts/{aid}/auto-reply/{rid}")
        check("Delete auto-reply rule", status == 200)

# ==== Step 8: Reply Macro ====
print()
print("=" * 60)
print("  [8] Reply Macro")
print("=" * 60)
mid = ""
if aid:
    status, data = api(
        "POST",
        f"/accounts/{aid}/reply-macros",
        {
            "name": "QA Test Macro",
            "is_active": True,
            "target_chats": ["-100123456789"],
            "message_content": "QA macro test message",
            "schedule_type": "interval",
            "interval_hours": 24,
            "max_sends_per_day": 10,
        },
    )
    mid = data.get("id", "") if status == 200 else ""
    check("Create reply macro", status == 200 and bool(mid))

    if mid:
        status, data = api(
            "PUT",
            f"/accounts/{aid}/reply-macros/{mid}",
            {"name": "QA Updated Macro", "interval_hours": 12},
        )
        check("Update reply macro", status == 200)

        status, data = api("POST", f"/accounts/{aid}/reply-macros/{mid}/execute")
        check("Execute reply macro", status == 200)

        status, data = api("GET", f"/accounts/{aid}/reply-macros/{mid}/logs")
        check("Reply macro logs", status == 200)

        status, data = api("DELETE", f"/accounts/{aid}/reply-macros/{mid}")
        check("Delete reply macro", status == 200)

# ==== Step 9: Broadcast ====
print()
print("=" * 60)
print("  [9] Broadcast (Send)")
print("=" * 60)
bid = ""
if aid:
    status, data = api(
        "POST",
        "/broadcast",
        {
            "account_id": aid,
            "message": "QA broadcast test message",
            "recipients": ["-100987654321"],
            "delivery_mode": "normal",
        },
    )
    bid = data.get("id", "") if status == 200 else ""
    check("Create broadcast", status == 200 and bool(bid))

    if bid:
        status, data = api("POST", f"/broadcast/{bid}/cancel")
        check("Cancel broadcast", status == 200)

# ==== Step 10: Logs ====
print()
print("=" * 60)
print("  [10] System Logs")
print("=" * 60)
status, data = api("GET", "/logs")
check("Get system logs", status == 200)

# ==== Step 11: Admin Platform ====
print()
print("=" * 60)
print("  [11] Admin Platform")
print("=" * 60)
admin_endpoints = [
    ("GET", "/admin/health"),
    ("GET", "/admin/users"),
    ("GET", "/admin/dashboard"),
    ("GET", "/admin/plans"),
]
for method, path in admin_endpoints:
    status, data = api(method, path)
    check(f"{method} {path}", status == 200,
          detail=f"status={status}")

# ==== Step 12: Cleanup ====
print()
print("=" * 60)
print("  [12] Cleanup (Account Deletion)")
print("=" * 60)
if aid:
    status, data = api("DELETE", f"/accounts/{aid}")
    check("Delete account", status == 200)

    status, data = api("GET", f"/accounts/{aid}")
    check("Verify deletion (404 expected)", status == 404)

# ==== Summary ====
print()
print("=" * 60)
print(f"  QA TEST SUMMARY")
print("=" * 60)
total = results["pass"] + results["fail"]
print(f"  Total:  {total}")
print(f"  Passed: {results['pass']}")
print(f"  Failed: {results['fail']}")
print(f"  Rate:   {results['pass'] / total * 100 if total else 0:.1f}%")
print()

if results["fail"] > 0:
    print("  FAILURES:")
    for d in results["details"]:
        if d["status"] == "FAIL":
            print(f"    - {d['label']}: {d['detail']}")
    print()

# Save report
report = {
    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "summary": {"total": total, "passed": results["pass"], "failed": results["fail"]},
    "results": results["details"],
}
os.makedirs("e2e", exist_ok=True)
with open("e2e/qa_report.json", "w", encoding="utf-8") as f:
    json.dump(report, f, indent=2, ensure_ascii=False)
print(f"  Report saved to: e2e/qa_report.json")
print()

sys.exit(1 if results["fail"] > 0 else 0)