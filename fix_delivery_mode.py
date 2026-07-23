import asyncio
from app.database import get_db
from sqlalchemy import text

async def fix():
    async for db in get_db():
        await db.execute(text("ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS delivery_mode VARCHAR(20)"))
        await db.execute(text("UPDATE broadcasts SET delivery_mode = broadcast_mode WHERE delivery_mode IS NULL AND broadcast_mode IS NOT NULL"))
        await db.commit()
        print("OK: delivery_mode column added and data synced")

asyncio.run(fix())