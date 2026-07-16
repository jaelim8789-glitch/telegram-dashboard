import asyncio
import uuid
from datetime import datetime
from app.database import get_db
from app.models.api_key import APIKey
from sqlalchemy import select

async def create():
    async for db in get_db():
        r = await db.execute(select(APIKey).where(APIKey.tenant_id == None))
        existing = r.scalars().all()
        print(f"Existing keys: {len(existing)}")

        key = str(uuid.uuid4())
        now = datetime.utcnow()
        new_key = APIKey(
            id=str(uuid.uuid4()),
            key=key,
            name="E2E Test Key - No billing",
            is_active=True,
            tenant_id=None,
            created_at=now,
            last_used=None,
        )
        db.add(new_key)
        await db.commit()
        print(f"Created API key: {key}")
        print(f"Use admin@localhost with api_key {key} to login")

asyncio.run(create())