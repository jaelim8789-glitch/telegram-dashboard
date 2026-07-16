
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
