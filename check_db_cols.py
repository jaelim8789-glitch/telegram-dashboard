import asyncio
from app.database import get_db
from sqlalchemy import text

async def check():
    async for db in get_db():
        r = await db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='broadcasts'"))
        cols = [row[0] for row in r.all()]
        print("Columns:", sorted(cols))
        
        r2 = await db.execute(text("SELECT version_num FROM alembic_version"))
        ver = r2.scalar()
        print("Alembic version:", ver)

asyncio.run(check())