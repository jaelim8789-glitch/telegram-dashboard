from app.api.deps import Identity, get_current_identity
from app.core.logging import get_logger
from app.crud import campaign as campaign_crud
from app.crud import schedule as schedule_crud
from app.database import get_db
from app.schemas.campaign import CampaignCreate, CampaignListRead, CampaignRead, CampaignUpdate
from app.schemas.schedule import CalendarQuery, ScheduleEntryRead
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

logger = get_logger(__name__)

router = APIRouter(tags=["campaigns"])


# ── Campaigns ──────────────────────────────────────────────────────

@router.post("/api/campaigns", response_model=CampaignRead, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    data: CampaignCreate,
    db: AsyncSession = Depends(get_db),
    identity: Identity = Depends(get_current_identity),
):
    tenant_id = identity.tenant_id or "default"
    campaign = await campaign_crud.create_campaign(db, tenant_id, data)
    logger.info("campaign_created", campaign_id=campaign.id, name=campaign.name)
    return campaign


@router.get("/api/campaigns", response_model=list[CampaignListRead])
async def list_campaigns(
    status_filter: str | None = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    identity: Identity = Depends(get_current_identity),
):
    campaigns = await campaign_crud.list_campaigns(db, identity=identity, status=status_filter)
    result = []
    for c in campaigns:
        pct = 0.0
        if c.total_recipients > 0:
            pct = round((c.success_count / c.total_recipients) * 100, 1)
        result.append(CampaignListRead(
            id=c.id, tenant_id=c.tenant_id, name=c.name, description=c.description,
            status=c.status, account_ids=c.account_ids, recipient_groups=c.recipient_groups,
            message_template_id=c.message_template_id, scheduled_start=c.scheduled_start,
            scheduled_end=c.scheduled_end, delivery_mode=c.delivery_mode,
            total_recipients=c.total_recipients, sent_count=c.sent_count,
            success_count=c.success_count, created_at=c.created_at, updated_at=c.updated_at,
            progress_pct=pct,
        ))
    return result


@router.get("/api/campaigns/{campaign_id}", response_model=CampaignRead)
async def read_campaign(
    campaign_id: str,
    db: AsyncSession = Depends(get_db),
    identity: Identity = Depends(get_current_identity),
):
    campaign = await campaign_crud.get_campaign(db, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return campaign


@router.patch("/api/campaigns/{campaign_id}", response_model=CampaignRead)
async def update_campaign_endpoint(
    campaign_id: str,
    data: CampaignUpdate,
    db: AsyncSession = Depends(get_db),
    identity: Identity = Depends(get_current_identity),
):
    campaign = await campaign_crud.get_campaign(db, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    updated = await campaign_crud.update_campaign(db, campaign, data)
    logger.info("campaign_updated", campaign_id=campaign_id)
    return updated


@router.delete("/api/campaigns/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(
    campaign_id: str,
    db: AsyncSession = Depends(get_db),
    identity: Identity = Depends(get_current_identity),
):
    deleted = await campaign_crud.delete_campaign(db, campaign_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    logger.info("campaign_deleted", campaign_id=campaign_id)


# ── Schedule Calendar ──────────────────────────────────────────────

@router.get("/api/schedule/calendar", response_model=list[ScheduleEntryRead])
async def get_calendar(
    start: str = Query(..., description="ISO 8601 start date"),
    end: str = Query(..., description="ISO 8601 end date"),
    db: AsyncSession = Depends(get_db),
    identity: Identity = Depends(get_current_identity),
):
    from datetime import datetime as dt
    try:
        start_dt = dt.fromisoformat(start)
        end_dt = dt.fromisoformat(end)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid date format")
    if identity.kind == "admin" and not identity.tenant_id:
        entries = await schedule_crud.get_all_schedule_entries(db, start_dt, end_dt)
    else:
        entries = await schedule_crud.get_schedule_entries(db, identity.tenant_id or "", start_dt, end_dt)
    return entries


@router.post("/api/schedule/sync", status_code=status.HTTP_200_OK)
async def sync_schedule(
    db: AsyncSession = Depends(get_db),
    identity: Identity = Depends(get_current_identity),
):
    from app.crud import broadcast as broadcast_crud
    broadcasts = await broadcast_crud.list_upcoming_scheduled_broadcasts(db, identity=identity)
    count = 0
    for b in broadcasts:
        tenant_id = identity.tenant_id or "default"
        if b.scheduled_at:
            await schedule_crud.sync_broadcast_to_schedule(db, b, tenant_id)
            count += 1
    return {"synced": count}
