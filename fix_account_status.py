import asyncio
from app.database import AsyncSession, get_db
from app.models.account import Account
from sqlalchemy import select

async def fix():
    async for db in get_db():
        result = await db.execute(select(Account).where(Account.status == 'connected'))
        rows = result.scalars().all()
        print(f"Found {len(rows)} accounts with status=connected")
        for a in rows:
            print(f"  {a.id}: {a.phone} -> status=active")
            a.status = 'active'
        await db.commit()
        r2 = await db.execute(select(Account.status).distinct())
        vals = r2.scalars().all()
        print(f"Distinct status values after fix: {vals}")

asyncio.run(fix())