from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ScheduleEntryCreate(BaseModel):
    title: str
    broadcast_id: str | None = None
    campaign_id: str | None = None
    scheduled_at: datetime
    status: str = "pending"


class ScheduleEntryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    tenant_id: str
    broadcast_id: str | None = None
    campaign_id: str | None = None
    title: str
    scheduled_at: datetime
    status: str
    created_at: datetime


class CalendarQuery(BaseModel):
    start: datetime
    end: datetime
