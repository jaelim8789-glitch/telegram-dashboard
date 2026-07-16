import asyncio
import uuid
from datetime import datetime, timedelta
from app.database import get_db
from app.models.tenant import Tenant
from app.models.api_key import APIKey
from sqlalchemy import select

async def create():
    async for db in get_db():
        # Create a tenant with active subscription
        tenant_id = str(uuid.uuid4())
        now = datetime.utcnow()
        tenant = Tenant(
            id=tenant_id,
            name="E2E Test Tenant",
            subscription_status="active",
            trial_expires_at=now + timedelta(days=30),
            billing_period_end=now + timedelta(days=30),
            created_at=now,
            updated_at=now,
        )
        db.add(tenant)
        
        # Create API key linked to this tenant
        key = str(uuid.uuid4())
        api_key = APIKey(
            id=str(uuid.uuid4()),
            key=key,
            name="E2E Test Key - Active",
            is_active=True,
            tenant_id=tenant_id,
            created_at=now,
            last_used=None,
        )
        db.add(api_key)
        await db.commit()
        print(f"Created tenant: {tenant_id}")
        print(f"Created API key: {key}")
        print(f"Use admin@localhost with api_key {key} to login")

asyncio.run(create())