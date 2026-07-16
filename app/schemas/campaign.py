from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

CampaignStatus = Literal["draft", "active", "paused", "completed", "cancelled"]


class CampaignCreate(BaseModel):
    name: str = Field(..., max_length=200)
    description: str | None = None
    account_ids: list[str] = Field(default_factory=list)
    recipient_groups: list[str] = Field(default_factory=list)
    message_template_id: str | None = None
    scheduled_start: datetime | None = None
    scheduled_end: datetime | None = None
    delivery_mode: str = "normal"


class CampaignUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    account_ids: list[str] | None = None
    recipient_groups: list[str] | None = None
    message_template_id: str | None = None
    scheduled_start: datetime | None = None
    scheduled_end: datetime | None = None
    delivery_mode: str | None = None
    status: str | None = None


class CampaignRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    tenant_id: str
    name: str
    description: str | None = None
    status: CampaignStatus = "draft"
    account_ids: list[str] = []
    recipient_groups: list[str] = []
    message_template_id: str | None = None
    scheduled_start: datetime | None = None
    scheduled_end: datetime | None = None
    delivery_mode: str = "normal"
    total_recipients: int = 0
    sent_count: int = 0
    success_count: int = 0
    created_at: datetime
    updated_at: datetime


class CampaignListRead(CampaignRead):
    progress_pct: float = 0.0
