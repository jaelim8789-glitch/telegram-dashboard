import asyncio
import json
import httpx

API_BASE = "http://localhost/api"

async def test():
    client = httpx.AsyncClient(timeout=30)
    
    print("=" * 70)
    print("TeleMon 기능 검증 Report")
    print("=" * 70)
    
    # 1. Health check
    print("\n[1] Health Check")
    r = await client.get("http://localhost/health")
    print(f"  GET /health -> {r.status_code}")
    print(f"  Response: {r.json()}")
    health_pass = r.status_code == 200
    print(f"  >> {'PASS' if health_pass else 'FAIL'}")
    
    # 2. Account list (need auth?)
    print("\n[2] Accounts API")
    r = await client.get(f"{API_BASE}/accounts")
    print(f"  GET /api/accounts -> {r.status_code}")
    try:
        data = r.json()
        print(f"  Response: {json.dumps(data, indent=2, ensure_ascii=False)[:500]}")
    except:
        print(f"  Response: {r.text[:500]}")
    
    # 3. Account health
    print("\n[3] Account Health")
    r = await client.get(f"{API_BASE}/account-health")
    print(f"  GET /api/account-health -> {r.status_code}")
    try:
        data = r.json()
        print(f"  Response: {json.dumps(data, indent=2, ensure_ascii=False)[:500]}")
    except:
        print(f"  Response: {r.text[:500]}")
    
    # 4. Broadcast recurring
    print("\n[4] Broadcast / Recurring")
    r = await client.get(f"{API_BASE}/broadcast/recurring")
    print(f"  GET /api/broadcast/recurring -> {r.status_code}")
    try:
        data = r.json()
        print(f"  Response: {json.dumps(data, indent=2, ensure_ascii=False)[:500]}")
    except:
        print(f"  Response: {r.text[:500]}")
    
    # 5. Scheduler upcoming
    print("\n[5] Scheduler Upcoming")
    r = await client.get(f"{API_BASE}/scheduler/upcoming")
    print(f"  GET /api/scheduler/upcoming -> {r.status_code}")
    try:
        data = r.json()
        print(f"  Response: {json.dumps(data, indent=2, ensure_ascii=False)[:500]}")
    except:
        print(f"  Response: {r.text[:500]}")
    
    # 6. Logs
    print("\n[6] Broadcast Logs")
    r = await client.get(f"{API_BASE}/logs?limit=5")
    print(f"  GET /api/logs?limit=5 -> {r.status_code}")
    try:
        data = r.json()
        print(f"  Response: {json.dumps(data, indent=2, ensure_ascii=False)[:500]}")
    except:
        print(f"  Response: {r.text[:500]}")
    
    # Try login as admin
    print("\n[7] Admin Login")
    r = await client.post(
        f"{API_BASE}/admin/login",
        json={"username": "sksk2929", "password": "qpqpqp10!!"}
    )
    print(f"  POST /api/admin/login -> {r.status_code}")
    try:
        data = r.json()
        print(f"  Response: {json.dumps(data, indent=2, ensure_ascii=False)[:500]}")
        token = data.get("access_token", "")
        if token:
            headers = {"Authorization": f"Bearer {token}"}
            
            # Test with auth
            print("\n[8] Accounts (with admin auth)")
            r = await client.get(f"{API_BASE}/accounts", headers=headers)
            print(f"  GET /api/accounts -> {r.status_code}")
            try:
                data = r.json()
                print(f"  Response: {json.dumps(data, indent=2, ensure_ascii=False)[:1000]}")
            except:
                print(f"  Response: {r.text[:500]}")
            
            # Test account health with auth
            if r.status_code == 200:
                accounts = data.get("items", []) if isinstance(data, dict) else data
                if isinstance(accounts, list) and len(accounts) > 0:
                    aid = accounts[0].get("id", "")
                    print(f"\n  First account ID: {aid}")
                    
                    # Auto-reply settings
                    print(f"\n[9] Auto-Reply (Reply Mode) for {aid[:8]}...")
                    r = await client.get(f"{API_BASE}/accounts/{aid}/auto-reply", headers=headers)
                    print(f"  GET /api/accounts/{aid[:8]}/auto-reply -> {r.status_code}")
                    try:
                        data = r.json()
                        print(f"  Response: {json.dumps(data, indent=2, ensure_ascii=False)[:500]}")
                    except:
                        print(f"  Response: {r.text[:300]}")
                    
                    # Reply macros
                    print(f"\n[10] Reply Macros for {aid[:8]}...")
                    r = await client.get(f"{API_BASE}/accounts/{aid}/reply-macros", headers=headers)
                    print(f"  GET /api/accounts/{aid[:8]}/reply-macros -> {r.status_code}")
                    try:
                        data = r.json()
                        print(f"  Response: {json.dumps(data, indent=2, ensure_ascii=False)[:500]}")
                    except:
                        print(f"  Response: {r.text[:300]}")
    except:
        print(f"  Response: {r.text[:300]}")
    
    await client.aclose()

asyncio.run(test())