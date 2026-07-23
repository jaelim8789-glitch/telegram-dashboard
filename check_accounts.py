import asyncio
import sys
sys.path.insert(0, '/app')

from app.database import async_session_maker
from sqlalchemy import text

async def go():
    async with async_session_maker() as s:
        r = await s.execute(text("SELECT id, phone, status FROM accounts"))
        rows = r.all()
        print(f"Found {len(rows)} accounts")
        for row in rows[:10]:
            print(f"  {row[0][:12]} {row[1]} {row[2]}")
        if len(rows) == 0:
            print("No accounts in database!")

asyncio.run(go())