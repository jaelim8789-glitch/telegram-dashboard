from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.broadcast import Broadcast
from app.models.broadcast_schedule import BroadcastScheduleEntry


async def create_schedule_entry(
    db: AsyncSession,
    tenant_id: str,
    title: str,
    scheduled_at: datetime,
    status: str = "pending",
    broadcast_id: str | None = None,
    campaign_id: str | None = None,
) -> BroadcastScheduleEntry:
    entry = BroadcastScheduleEntry(
        tenant_id=tenant_id,
        broadcast_id=broadcast_id,
        campaign_id=campaign_id,
        title=title,
        scheduled_at=scheduled_at,
        status=status,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


async def get_schedule_entries(
    db: AsyncSession, tenant_id: str, start: datetime, end: datetime
) -> list[BroadcastScheduleEntry]:
    result = await db.execute(
        select(BroadcastScheduleEntry).where(
            BroadcastScheduleEntry.tenant_id == tenant_id,
            BroadcastScheduleEntry.scheduled_at >= start,
            BroadcastScheduleEntry.scheduled_at <= end,
        ).order_by(BroadcastScheduleEntry.scheduled_at.asc())
    )
    return list(result.scalars().all())


async def get_all_schedule_entries(
    db: AsyncSession, start: datetime, end: datetime
) -> list[BroadcastScheduleEntry]:
    result = await db.execute(
        select(BroadcastScheduleEntry).where(
            BroadcastScheduleEntry.scheduled_at >= start,
            BroadcastScheduleEntry.scheduled_at <= end,
        ).order_by(BroadcastScheduleEntry.scheduled_at.asc())
    )
    return list(result.scalars().all())


async def sync_broadcast_to_schedule(db: AsyncSession, broadcast: Broadcast, tenant_id: str) -> None:
    if broadcast.scheduled_at is None:
        return
    existing = await db.execute(
        select(BroadcastScheduleEntry).where(
            BroadcastScheduleEntry.broadcast_id == broadcast.id
        ).limit(1)
    )
    if existing.scalar_one_or_none() is not None:
        return
    entry = BroadcastScheduleEntry(
        tenant_id=tenant_id,
        broadcast_id=broadcast.id,
        title=f"Broadcast: {broadcast.message[:80]}",
        scheduled_at=broadcast.scheduled_at,
        status=broadcast.status,
    )
    db.add(entry)
    await db.commit()
