"""
E2E Verification - Pre-release final check
Covers: Reply Mode, Reply Macro, Broadcast, Scheduler, API Key tiers, Bot Conflict
"""
import asyncio, json, uuid, sys, time
from datetime import datetime, timezone
import httpx

API_BASE = "http://localhost/api"
LOG_PREFIX = "telegram-dashboard-backend-backend-1"

results = []
def rpt(name, status, detail=""):
    results.append({"name": name, "status": status, "detail": detail})
    print(f"  [{status}] {name}" + (f" - {detail}" if detail else ""))

async def main():
    print("=" * 70)
    print(f"TeleMon E2E Pre-release Verification")
    print(f"Time: {datetime.now(timezone.utc).isoformat()}")
    print("=" * 70)

    client = httpx.AsyncClient(base_url=API_BASE, timeout=30)
    
    # ─── Auth setup ──────────────────────────────────────────────────
    r = await client.post("/admin/login", json={
        "username": "sksk2929", "password": "qpqpqp10!!"
    })
    if r.status_code != 200:
        print("FATAL: Admin login failed")
        return
    tokens = r.json().get("access_token")
    headers = {"Authorization": f"Bearer {tokens}"}
    
    # ─── Check DB for accounts with sessions ────────────────────────
    print("\n--- DB State ---")
    await check_db_state()

    # ─── List accounts & health ─────────────────────────────────────
    print("\n--- Accounts ---")
    r = await client.get("/accounts", headers=headers)
    accounts = []
    if r.status_code == 200:
        d = r.json()
        accounts = d.get("items", []) if isinstance(d, dict) else (d if isinstance(d, list) else [])
        rpt(f"Accounts: {len(accounts)} found", "PASS" if accounts else "WARN")
        for a in accounts:
            aid = a.get("id","?")[:12]
            phone = a.get("phone","?")
            status = a.get("status","?")
            print(f"  {aid} {phone} status={status}")
    
    # ─── 1. Reply Mode Test ─────────────────────────────────────────
    print("\n--- 1. Reply Mode ---")
    authenticated = False
    if accounts:
        for acct in accounts[:2]:
            aid = acct["id"]
            # Try sending a test message to check if account is authenticated
            r = await client.get(f"/accounts/{aid}/status", headers=headers)
            if r.status_code == 200:
                st = r.json()
                print(f"  Account {aid[:8]} status detail: {json.dumps(st)[:200]}")
            
            # Check if auto-reply is accessible
            r = await client.get(f"/accounts/{aid}/auto-reply", headers=headers)
            if r.status_code == 200:
                d = r.json()
                enabled = d.get("auto_reply_enabled", d.get("is_active", False))
                rules = d.get("rules", [])
                print(f"  Auto-Reply: enabled={enabled} rules={len(rules)}")
                authenticated = True
                
                # Test CRUD
                # CREATE
                r2 = await client.post(f"/accounts/{aid}/auto-reply", headers=headers, json={
                    "name": f"E2ETest {uuid.uuid4().hex[:4]}",
                    "match_type": "keyword",
                    "match_value": "e2e_test",
                    "reply_content": "E2E auto-reply message",
                    "cooldown_hours": 1,
                    "max_replies_per_day": 10,
                    "is_active": True,
                })
                if r2.status_code in (200, 201):
                    rule_id = r2.json().get("id","")
                    rpt("Auto-Reply CREATE", "PASS", f"rule={rule_id[:8]}")
                    # DELETE
                    r3 = await client.delete(f"/accounts/{aid}/auto-reply/{rule_id}", headers=headers)
                    rpt("Auto-Reply DELETE", "PASS" if r3.status_code in (200,204) else "FAIL")
                else:
                    rpt("Auto-Reply CREATE", "WARN" if r2.status_code == 400 else "FAIL",
                        f"HTTP {r2.status_code}: needs Telegram auth" if r2.status_code == 400 else str(r2.status_code))
                    authenticated = False
                break
            else:
                print(f"  Account {aid[:8]}: auto-reply not accessible ({r.status_code})")
    
    if not authenticated:
        rpt("Reply Mode CRUD", "WARN", "No Telegram-authenticated account available - manual test needed")
    
    # ─── 2. Reply Macro ─────────────────────────────────────────────
    print("\n--- 2. Reply Macro ---")
    if accounts:
        aid = accounts[0]["id"]
        r = await client.get(f"/accounts/{aid}/reply-macros", headers=headers)
        rpt("Reply Macro LIST", "PASS" if r.status_code == 200 else "FAIL")
        
        # CREATE (Form)
        boundary = f"boundary_{uuid.uuid4().hex}"
        macro_name = f"E2EMacro {uuid.uuid4().hex[:4]}"
        body = (
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"name\"\r\n\r\n{macro_name}\r\n"
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"target_chats\"\r\n\r\n[\"@test_1\",\"@test_2\"]\r\n"
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"message_content\"\r\n\r\nE2E test message\r\n"
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"schedule_type\"\r\n\r\ninterval\r\n"
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"interval_hours\"\r\n\r\n24\r\n"
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"max_sends_per_day\"\r\n\r\n100\r\n"
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"is_active\"\r\n\r\ntrue\r\n--{boundary}--\r\n"
        )
        r = await client.post(f"/accounts/{aid}/reply-macros",
            headers={**headers, "Content-Type": f"multipart/form-data; boundary={boundary}"}, content=body)
        if r.status_code in (200, 201):
            mid = r.json().get("id","")
            rpt("Reply Macro CREATE", "PASS", f"id={mid[:8]}")
            
            # GET
            r2 = await client.get(f"/accounts/{aid}/reply-macros/{mid}", headers=headers)
            rpt("Reply Macro GET", "PASS" if r2.status_code == 200 else "FAIL")
            
            # UPDATE (JSON)
            r3 = await client.put(f"/accounts/{aid}/reply-macros/{mid}", headers=headers,
                json={"name": "E2E Updated", "max_sends_per_day": 200})
            rpt("Reply Macro UPDATE", "PASS" if r3.status_code in (200,201) else "FAIL",
                f"HTTP {r3.status_code}")
            
            # EXECUTE
            r4 = await client.post(f"/accounts/{aid}/reply-macros/{mid}/execute", headers=headers)
            rpt("Reply Macro EXECUTE", "PASS" if r4.status_code in (200,201,202) else "FAIL",
                f"HTTP {r4.status_code}")
            
            # LOGS
            r5 = await client.get(f"/accounts/{aid}/reply-macros/{mid}/logs", headers=headers)
            rpt("Reply Macro LOGS", "PASS" if r5.status_code == 200 else "FAIL")
            
            # DELETE
            r6 = await client.delete(f"/accounts/{aid}/reply-macros/{mid}", headers=headers)
            rpt("Reply Macro DELETE", "PASS" if r6.status_code in (200,204) else "FAIL")
        else:
            rpt("Reply Macro CREATE", "FAIL", f"HTTP {r.status_code}: {r.text[:100]}")
    
    # ─── 3. Broadcast ───────────────────────────────────────────────
    print("\n--- 3. Broadcast ---")
    if accounts:
        aid = accounts[0]["id"]
        boundary = f"boundary_{uuid.uuid4().hex}"
        body = (
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"account_id\"\r\n\r\n{aid}\r\n"
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"message\"\r\n\r\nE2E Test Broadcast {uuid.uuid4().hex[:4]}\r\n"
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"recipients\"\r\n\r\n[\"@test_recipient\"]\r\n"
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"delivery_mode\"\r\n\r\nnormal\r\n"
            f"--{boundary}--\r\n"
        )
        r = await client.post("/broadcast",
            headers={**headers, "Content-Type": f"multipart/form-data; boundary={boundary}"}, content=body)
        if r.status_code in (200, 201, 202):
            bid = r.json().get("id","")
            rpt("Broadcast CREATE", "PASS", f"id={bid[:8]} HTTP {r.status_code}")
            
            # GET
            r2 = await client.get(f"/broadcast/{bid}", headers=headers)
            rpt("Broadcast GET", "PASS" if r2.status_code == 200 else "FAIL")
            
            # RETRY
            r3 = await client.post(f"/broadcast/{bid}/retry", headers=headers)
            rpt("Broadcast RETRY", "PASS" if r3.status_code in (200,201) else "WARN",
                f"HTTP {r3.status_code}")
        else:
            rpt("Broadcast CREATE", "FAIL", f"HTTP {r.status_code}: {r.text[:100]}")
        
        # RECURRING
        r = await client.get("/broadcast/recurring", headers=headers)
        rpt("Broadcast RECURRING", "PASS" if r.status_code == 200 else "FAIL")
    
    # ─── 4. Scheduler ───────────────────────────────────────────────
    print("\n--- 4. Scheduler ---")
    r = await client.get("/scheduler/upcoming", headers=headers)
    if r.status_code == 200:
        d = r.json()
        rpt("Scheduler UPCOMING API", "PASS", f"{len(d)} items")
    else:
        rpt("Scheduler UPCOMING API", "FAIL", f"HTTP {r.status_code}")
    
    # Check scheduler background jobs
    print("\n--- Scheduler Background Check ---")
    r = await client.get("/logs?limit=5", headers=headers)
    if r.status_code == 200:
        d = r.json()
        rpt("Broadcast Logs API", "PASS", f"{len(d)} entries")
    else:
        rpt("Broadcast Logs API", "FAIL", f"HTTP {r.status_code}")
    
    # Check docker logs for scheduler
    print("\n--- Docker Scheduler Logs ---")
    import subprocess
    try:
        out = subprocess.check_output(
            ["docker", "logs", LOG_PREFIX, "--tail", "30"],
            stderr=subprocess.STDOUT, timeout=10
        ).decode("utf-8", errors="replace")
        # Check for scheduler activity
        scheduled_count = out.count("dispatch_due_broadcasts")
        macro_count = out.count("dispatch_due_reply_macros")
        process_count = out.count("process_all_accounts")
        error_count = out.count("ERROR")
        conflict_count = out.count("Conflict")
        
        rpt("Scheduler Jobs Active", "PASS" if process_count > 0 else "FAIL",
            f"scheduler_wake={process_count} broadcast_dispatch={scheduled_count} macro_dispatch={macro_count}")
        rpt("Bot 409 Conflict", "PASS" if conflict_count == 0 else "WARN",
            f"conflict_count={conflict_count}" if conflict_count > 0 else "No conflicts")
        rpt("Backend Errors", "WARN" if error_count > 0 else "PASS",
            f"errors={error_count}" if error_count > 0 else "Clean logs")
    except Exception as e:
        rpt("Docker Log Check", "WARN", f"Could not read logs: {e}")
    
    # ─── 5. API Key Tier Authorization ──────────────────────────────
    print("\n--- 5. API Key Tiers ---")
    
    # Get a free API key first
    r = await client.post("/free-api-key/start", json={"phone": "+821000000000"})
    if r.status_code in (200, 201):
        rpt("Free API Key Start", "PASS")
    else:
        rpt("Free API Key Start", "WARN", f"HTTP {r.status_code}: {r.text[:100]}")
    
    # Check admin API keys
    r = await client.get("/admin/api-keys", headers=headers)
    if r.status_code == 200:
        d = r.json()
        api_keys = d.get("items", []) if isinstance(d, dict) else (d if isinstance(d, list) else [])
        rpt("Admin API Keys List", "PASS", f"{len(api_keys)} keys")
        for ak in api_keys[:5]:
            print(f"  {ak.get('id','?')[:16]} tier={ak.get('tier','?')} active={ak.get('is_active','?')}")
    else:
        rpt("Admin API Keys List", "FAIL", f"HTTP {r.status_code}")
    
    # Test API key authorization by creating a user-level API key
    r = await client.post("/admin/manual-issue-key", headers=headers, json={
        "phone": "+821000000001",
        "tier": "FREE",
        "max_accounts": 1,
        "expire_days": 30
    })
    if r.status_code in (200, 201):
        d = r.json()
        key = d.get("api_key", d.get("key", ""))
        rpt("Manual Issue FREE Key", "PASS", f"key={key[:16] if key else '?'}...")
        
        # Test with this key
        if key:
            kh = {"Authorization": f"Bearer {key}"}
            r2 = await client.get("/accounts", headers=kh)
            rpt("FREE Key - List Accounts", "PASS" if r2.status_code == 200 else "WARN",
                f"HTTP {r2.status_code}" if r2.status_code != 200 else "")
    else:
        rpt("Manual Issue FREE Key", "WARN", f"HTTP {r.status_code}: {r.text[:100]}")
    
    # Issue PRO, TEAM, LIFETIME keys
    for tier in ["PRO", "TEAM", "LIFETIME"]:
        r = await client.post("/admin/manual-issue-key", headers=headers, json={
            "phone": f"+8210000000{tier[0]}",
            "tier": tier,
            "max_accounts": 5,
            "expire_days": 365
        })
        if r.status_code in (200, 201):
            d = r.json()
            key = d.get("api_key", d.get("key", ""))
            rpt(f"Manual Issue {tier} Key", "PASS", f"created")
            
            # Test accounts endpoint
            if key:
                kh = {"Authorization": f"Bearer {key}"}
                r2 = await client.get("/accounts", headers=kh)
                code = r2.status_code
                warn = ""
                if code == 200:
                    pass  # All good
                elif code == 403:
                    warn = " - 403 Forbidden (tier restriction)"
                rpt(f"{tier} Key - Authorized", "PASS" if code == 200 else ("WARN" if code in (401,403) else "FAIL"),
                    f"HTTP {code}{warn}")
        else:
            rpt(f"Manual Issue {tier} Key", "FAIL" if r.status_code >= 500 else "WARN",
                f"HTTP {r.status_code}: {r.text[:100]}")
    
    # ─── 6. Bulk Send Test (simulate 100+ recipients) ───────────────
    print("\n--- 6. Bulk Send Test ---")
    if accounts:
        aid = accounts[0]["id"]
        recipients_100 = [f"@test_user_{i:04d}" for i in range(100)]
        boundary = f"boundary_{uuid.uuid4().hex}"
        body = (
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"account_id\"\r\n\r\n{aid}\r\n"
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"message\"\r\n\r\nBulk Test {uuid.uuid4().hex[:4]}\r\n"
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"recipients\"\r\n\r\n{json.dumps(recipients_100)}\r\n"
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"delivery_mode\"\r\n\r\nnormal\r\n"
            f"--{boundary}--\r\n"
        )
        r = await client.post("/broadcast",
            headers={**headers, "Content-Type": f"multipart/form-data; boundary={boundary}"}, content=body)
        if r.status_code in (200, 201, 202):
            d = r.json()
            bid = d.get("id","")
            recipients = d.get("recipients", [])
            rpt("Bulk Broadcast 100 recipients", "PASS", f"id={bid[:8]} HTTP {r.status_code} recipients={len(recipients)}")
            # Check logs show this broadcast
            r2 = await client.get(f"/broadcast/{bid}/children?limit=5", headers=headers)
            if r2.status_code == 200:
                rpt("Broadcast Children API", "PASS")
            else:
                rpt("Broadcast Children API", "WARN", f"HTTP {r2.status_code}")
        else:
            rpt("Bulk Broadcast 100 recipients", "FAIL", f"HTTP {r.status_code}: {r.text[:100]}")
    
    # ─── 7. Final Health Check ──────────────────────────────────────
    print("\n--- 7. Final Checks ---")
    r = await client.get("http://localhost/health")
    rpt("Health Endpoint", "PASS" if r.status_code == 200 else "FAIL")
    
    r = await client.get("/account-health", headers=headers)
    if r.status_code == 200:
        d = r.json()
        healthy = sum(1 for h in d if h.get("status") in ("healthy", "active")) if isinstance(d, list) else 0
        rpt("Account Health", "PASS", f"{len(d) if isinstance(d, list) else 0} accounts, {healthy} healthy")
    
    # ─── Summary ────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("E2E Verification Summary")
    print("=" * 70)
    pass_c = sum(1 for r in results if r["status"] == "PASS")
    warn_c = sum(1 for r in results if r["status"] == "WARN")
    fail_c = sum(1 for r in results if r["status"] == "FAIL")
    print(f"\nPASS: {pass_c}")
    print(f"WARN: {warn_c}")
    print(f"FAIL: {fail_c}")
    print(f"Total: {len(results)}")
    
    if fail_c > 0:
        print("\n--- Failures ---")
        for r in results:
            if r["status"] == "FAIL":
                print(f"  FAIL  {r['name']}: {r['detail']}")
    
    if warn_c > 0:
        print("\n--- Warnings ---")
        for r in results:
            if r["status"] == "WARN":
                print(f"  WARN  {r['name']}: {r['detail']}")
    
    print("\n--- All Results ---")
    for r in results:
        print(f"  [{r['status']}] {r['name']}")
    
    # Save report
    with open("e2e_report.json", "w", encoding="utf-8") as f:
        json.dump({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "summary": {"PASS": pass_c, "WARN": warn_c, "FAIL": fail_c, "TOTAL": len(results)},
            "results": results,
        }, f, ensure_ascii=False, indent=2)
    print(f"\nReport saved to e2e_report.json")

async def check_db_state():
    """Check database state for accounts and sessions"""
    import subprocess
    script = '''
import asyncio, sys; sys.path.insert(0, '/app')
from app.database import async_session_maker
from sqlalchemy import text
async def go():
    async with async_session_maker() as s:
        r = await s.execute(text("SELECT id, phone, status FROM accounts"))
        for row in r.all():
            print(f"ACCOUNT: {row[0][:12]} {row[1]} {row[2]}")
        
        tables = await s.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"))
        print(f"TABLES: {[t[0] for t in tables.all()]}")
        
        # Check api_keys
        try:
            r = await s.execute(text("SELECT id, tenant_id, tier, is_active FROM api_keys LIMIT 20"))
            for row in r.all():
                print(f"APIKEY: {str(row[0])[:16]} tier={row[2]} tenant={str(row[1])[:12]} active={row[3]}")
        except Exception as ex:
            print(f"APIKEYS_TABLE: {ex}")
        
        # Check tenants
        try:
            r = await s.execute(text("SELECT id, name, tier, is_active FROM tenants LIMIT 10"))
            for row in r.all():
                print(f"TENANT: {str(row[0])[:16]} name={row[1]} tier={row[2]} active={row[3]}")
        except Exception as ex:
            print(f"TENANTS_TABLE: {ex}")
        
        # Check sessions
        try:
            r = await s.execute(text("SELECT account_id, phone_code_hash, is_authenticated FROM telegram_sessions LIMIT 10"))
            for row in r.all():
                print(f"SESSION: {str(row[0])[:12]} auth={row[2]}")
        except Exception as ex:
            print(f"SESSIONS_TABLE: {ex}")
        
        # Check broadcasts
        try:
            r = await s.execute(text("SELECT id, account_id, status, message FROM broadcasts ORDER BY created_at DESC LIMIT 10"))
            for row in r.all():
                print(f"BROADCAST: {str(row[0])[:12]} acct={str(row[1])[:8]} status={row[2]}")
        except Exception as ex:
            print(f"BROADCASTS_TABLE: {ex}")
asyncio.run(go())
'''
    # Write to temp file and exec
    with open("_db_check.py", "w") as f:
        f.write(script)
    
    import subprocess
    r = subprocess.run(
        ["docker", "cp", "_db_check.py", f"{LOG_PREFIX}:/app/_db_check.py"],
        capture_output=True, text=True
    )
    if r.returncode == 0:
        r2 = subprocess.run(
            ["docker", "exec", LOG_PREFIX, "python", "/app/_db_check.py"],
            capture_output=True, text=True, timeout=15
        )
        print(r2.stdout[:1000])
        if r2.stderr:
            print(f"STDERR: {r2.stderr[:500]}")
    else:
        print(f"DB Check failed: {r.stderr}")

if __name__ == "__main__":
    asyncio.run(main())