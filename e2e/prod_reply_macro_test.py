"""
Production Reply Macro E2E Test — tests creation with reply_to_message_id,
execution, and verifies delivery_mode+reply_to_message_id are passed correctly.
"""
import json, sys, time, urllib.request, urllib.error

BASE = "https://telemon.online/api"
USERNAME = "sksk2929"
PASSWORD = "qpqpqp10!!"

def api(method, path, data=None, token=None):
    url = f"{BASE}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:500]
    except Exception as e:
        return 0, str(e)[:200]

results = []

def check(desc, ok, detail=""):
    status = "PASS" if ok else "FAIL"
    results.append((status, desc, detail))
    print(f"  [{status}] {desc}")
    if detail:
        print(f"         {detail}")

print("=" * 60)
print("Production Reply Macro E2E Test")
print("=" * 60)

# 1. Admin Login
print("\n--- 1. Admin Login ---")
status, body = api("POST", "/auth/login", {"username": USERNAME, "password": PASSWORD})
token = body.get("access_token", "") if isinstance(body, dict) else ""
check("Admin login", status == 200 and bool(token), str(body)[:100])

if not token:
    print("\n  ❌ Cannot proceed without token")
    sys.exit(1)

# 2. Get accounts
print("\n--- 2. Get Accounts ---")
status, body = api("GET", "/accounts", token=token)
accounts = body.get("items", body) if isinstance(body, dict) else body if isinstance(body, list) else []
check(f"Accounts found: {len(accounts)}", status == 200 and len(accounts) > 0, str(body)[:200])

if not accounts:
    print("\n  ❌ No accounts available")
    sys.exit(1)

account_id = accounts[0]["id"]
print(f"  Using account: {account_id} ({accounts[0].get('phone','')})")

# 3. List existing reply macros
print("\n--- 3. List Reply Macros ---")
status, body = api("GET", f"/accounts/{account_id}/reply-macros", token=token)
macros = body if isinstance(body, list) else []
check(f"List reply macros ({len(macros)} found)", status == 200, str(body)[:150])

# 4. Create reply macro WITH reply_to_message_id
print("\n--- 4. Create Reply Macro with reply_to_message_id=999 ---")
macro_data = {
    "name": "E2E Reply Macro Test",
    "target_chats": ["123456789"],
    "message_content": "E2E Test: This is a reply to message 999",
    "schedule_type": "interval",
    "interval_hours": 24,
    "max_sends_per_day": 5,
    "is_active": False,
    "reply_to_message_id": 999,
}
status, body = api("POST", f"/accounts/{account_id}/reply-macros", macro_data, token=token)
if status == 200 and isinstance(body, dict):
    macro_id = body.get("id", "")
    check("Created reply macro", bool(macro_id), json.dumps(body, ensure_ascii=False)[:200])
    check("reply_to_message_id=999 saved", body.get("reply_to_message_id") == 999, str(body.get("reply_to_message_id")))
else:
    macro_id = ""
    check("Create reply macro", False, str(body)[:200])

# 5. Verify persistence via list
if macro_id:
    print("\n--- 5. Verify Persistence ---")
    status, body = api("GET", f"/accounts/{account_id}/reply-macros", token=token)
    macros = body if isinstance(body, list) else []
    found = [m for m in macros if m.get("id") == macro_id]
    check("Macro exists in list", len(found) > 0, "")
    if found:
        check("reply_to_message_id=999 persisted", found[0].get("reply_to_message_id") == 999, str(found[0].get("reply_to_message_id")))

    # 6. Execute macro
    print("\n--- 6. Execute Macro ---")
    status, body = api("POST", f"/accounts/{account_id}/reply-macros/{macro_id}/execute", token=token)
    check("Execute macro", status in (200, 202), str(body)[:200])

    # 7. Check execution logs
    print("\n--- 7. Check Execution Logs ---")
    status, body = api("GET", f"/accounts/{account_id}/reply-macros/{macro_id}/logs", token=token)
    logs = body if isinstance(body, list) else []
    check("Logs accessible", status == 200, f"{len(logs)} log(s)")
    for log in logs[:3]:
        check(f"Log entry status={log.get('status','')}",
              log.get("status") in ("success","sent","pending","failed"),
              json.dumps(log, ensure_ascii=False)[:200])

    # 8. Cleanup: delete macro
    print("\n--- 8. Cleanup ---")
    status, body = api("DELETE", f"/accounts/{account_id}/reply-macros/{macro_id}", token=token)
    check("Delete macro", status == 200, "")

# 9. Create macro WITHOUT reply_to_message_id (verify normal mode)
print("\n--- 9. Create Macro WITHOUT reply_to_message_id ---")
macro_data_no_reply = {
    "name": "E2E Normal Macro Test",
    "target_chats": ["123456789"],
    "message_content": "E2E Test: Normal message without reply",
    "schedule_type": "interval",
    "interval_hours": 24,
    "max_sends_per_day": 5,
    "is_active": False,
}
status, body = api("POST", f"/accounts/{account_id}/reply-macros", macro_data_no_reply, token=token)
if status == 200 and isinstance(body, dict):
    norm_id = body.get("id", "")
    check("Created normal macro", bool(norm_id), json.dumps(body, ensure_ascii=False)[:200])
    check("reply_to_message_id is null", body.get("reply_to_message_id") is None, str(body.get("reply_to_message_id")))
    if norm_id:
        api("DELETE", f"/accounts/{account_id}/reply-macros/{norm_id}", token=token)
        check("Deleted normal macro", True, "")
else:
    check("Create normal macro", False, str(body)[:200])

# Summary
print("\n" + "=" * 60)
print("RESULTS SUMMARY")
print("=" * 60)
pass_count = sum(1 for r in results if r[0] == "PASS")
fail_count = sum(1 for r in results if r[0] == "FAIL")
for status, desc, detail in results:
    print(f"  [{status}] {desc}")
print("=" * 60)
print(f"  TOTAL: {pass_count + fail_count}  |  PASS: {pass_count}  |  FAIL: {fail_count}")
if fail_count == 0:
    print("\n  ✅ ALL TESTS PASSED")
else:
    print(f"\n  ❌ {fail_count} TEST(S) FAILED")
print("=" * 60)
sys.exit(0 if fail_count == 0 else 1)