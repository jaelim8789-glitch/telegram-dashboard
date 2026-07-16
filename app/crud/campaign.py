from datetime import datetime

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import Identity
from app.models.account import Account
from app.models.broadcast_campaign import BroadcastCampaign
from app.schemas.campaign import CampaignCreate, CampaignUpdate


def utcnow_naive() -> datetime:
    return datetime.utcnow()


async def create_campaign(db: AsyncSession, tenant_id: str, data: CampaignCreate) -> BroadcastCampaign:
    campaign = BroadcastCampaign(
        tenant_id=tenant_id,
        name=data.name,
        description=data.description,
        account_ids=data.account_ids or [],
        recipient_groups=data.recipient_groups or [],
        message_template_id=data.message_template_id,
        scheduled_start=data.scheduled_start,
        scheduled_end=data.scheduled_end,
        delivery_mode=data.delivery_mode or "normal",
        total_recipients=0,
        sent_count=0,
        success_count=0,
    )
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)
    return campaign


async def get_campaign(db: AsyncSession, campaign_id: str) -> BroadcastCampaign | None:
    return await db.get(BroadcastCampaign, campaign_id)


async def update_campaign(
    db: AsyncSession, campaign: BroadcastCampaign, data: CampaignUpdate
) -> BroadcastCampaign | None:
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(campaign, field, value)
    campaign.updated_at = utcnow_naive()
    await db.commit()
    await db.refresh(campaign)
    return campaign


async def list_campaigns(
    db: AsyncSession, identity: Identity | None = None, status: str | None = None
) -> list[BroadcastCampaign]:
    query = select(BroadcastCampaign)

    if identity is not None and identity.kind != "admin" and identity.tenant_id:
        query = query.where(BroadcastCampaign.tenant_id == identity.tenant_id)

    if status:
        query = query.where(BroadcastCampaign.status == status)

    query = query.order_by(BroadcastCampaign.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


async def delete_campaign(db: AsyncSession, campaign_id: str) -> bool:
    campaign = await db.get(BroadcastCampaign, campaign_id)
    if campaign is None:
        return False
    await db.delete(campaign)
    await db.commit()
    return True
