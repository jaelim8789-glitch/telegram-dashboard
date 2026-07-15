"""
Pydantic models for the Account Runtime API.

These mirror the TypeScript types from the frontend (src/types/index.ts)
so the API contract is consistent.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ── Account ─────────────────────────────────────────────────────────

class AccountStatus(str):
    ACTIVE = "active"
    INACTIVE = "inactive"
    BANNED = "banned"


class Account(BaseModel):
    id: str
    phone: str
    name: str | None = None
    status: str = "active"  # AccountStatus
    today_sent: int = 0
    group_count: int = 0
    last_activity: str | None = None
    auto_reply_enabled: bool = False
    created_at: str = ""
    updated_at: str = ""


class CreateAccountInput(BaseModel):
    phone: str
    name: str | None = None


class AccountHealthItem(BaseModel):
    account_id: str
    phone: str
    name: str | None = None
    status: str = "unknown"  # AccountHealthState
    has_session: bool = False
    last_activity: str | None = None
    last_error: str | None = None
    last_error_status: str | None = None
    recent_success_count: int = 0
    recent_failure_count: int = 0
    total_delivery_attempts: int = 0


# ── Auth ────────────────────────────────────────────────────────────

class AuthStepResult(BaseModel):
    status: str = "inactive"
    requires_2fa: bool = False
    detail: str | None = None


class AuthMe(BaseModel):
    role: str = "user"  # "admin" | "user" | "api_key"
    phone: str | None = None
    subscription_status: str | None = None
    plan: str | None = None
    trial_expires_at: str | None = None


# ── Group ───────────────────────────────────────────────────────────

class Group(BaseModel):
    id: str
    title: str
    type: str = "group"  # "group" | "megagroup" | "channel"
    participants_count: int | None = None


class GroupFolder(BaseModel):
    id: str
    title: str
    group_ids: list[str] = []


# ── Broadcast ───────────────────────────────────────────────────────

class InlineButton(BaseModel):
    label: str
    url: str


class FailureInfo(BaseModel):
    category: str = "unknown"
    retryable: str = "retryable"  # "retryable" | "not_retryable" | "conditional"
    recovery_action: str = "none"
    summary: str = ""


class Broadcast(BaseModel):
    id: str
    account_id: str
    message: str
    media_path: str | None = None
    recipients: list[str] = []
    status: str = "pending"  # BroadcastStatus
    scheduled_at: str | None = None
    sent_at: str | None = None
    created_at: str = ""
    error_message: str | None = None
    recurring_interval_minutes: int | None = None
    cancelled_at: str | None = None
    next_scheduled_at: str | None = None
    is_recurring_paused: bool = False
    failure_info: FailureInfo | None = None
    delivery_mode: str | None = None
    reply_to_message_id: int | None = None
    inline_buttons: list[InlineButton] | None = None


class BroadcastChild(BaseModel):
    id: str
    account_id: str
    message: str
    status: str = "pending"
    scheduled_at: str | None = None
    sent_at: str | None = None
    created_at: str = ""
    error_message: str | None = None
    failure_info: FailureInfo | None = None
    delivery_mode: str | None = None
    inline_buttons: list[InlineButton] | None = None


class CreateBroadcastInput(BaseModel):
    account_id: str
    message: str
    recipients: list[str] = []
    scheduled_at: str | None = None
    recurring_interval_minutes: int | None = None
    delivery_mode: str | None = None
    delay_seconds: int | None = None
    reply_to_message_id: int | None = None
    inline_buttons: list[InlineButton] | None = None


# ── Auto Reply ──────────────────────────────────────────────────────

class AutoReplyRule(BaseModel):
    id: str
    account_id: str
    name: str
    is_active: bool = True
    match_type: str = "keyword"  # "keyword" | "exact"
    match_value: str = ""
    reply_content: str = ""
    cooldown_hours: float = 0
    max_replies_per_day: int = 100
    created_at: str = ""
    updated_at: str = ""


class AutoReplySettings(BaseModel):
    account_id: str
    auto_reply_enabled: bool = False
    rules: list[AutoReplyRule] = []


class AutoReplyRuleInput(BaseModel):
    name: str
    match_type: str = "keyword"
    match_value: str = ""
    reply_content: str = ""
    is_active: bool = True
    cooldown_hours: float = 0
    max_replies_per_day: int = 100


class AutoReplyLog(BaseModel):
    id: str
    rule_id: str
    account_id: str
    chat_id: str
    user_id: str
    user_name: str | None = None
    trigger_message: str = ""
    reply_sent: str = ""
    status: str = "success"  # "success" | "failed" | "rate_limited"
    created_at: str = ""


# ── Reply Macro ─────────────────────────────────────────────────────

class ReplyMacro(BaseModel):
    id: str
    account_id: str
    name: str
    is_active: bool = True
    target_chats: list[str] = []
    message_content: str = ""
    media_path: str | None = None
    schedule_type: str = "interval"  # "interval" | "fixed"
    interval_hours: int = 24
    fixed_time: str | None = None
    max_sends_per_day: int = 10
    last_sent_at: str | None = None
    created_at: str = ""
    updated_at: str = ""


class ReplyMacroInput(BaseModel):
    name: str
    target_chats: list[str] = []
    message_content: str = ""
    schedule_type: str = "interval"
    interval_hours: int = 24
    fixed_time: str | None = None
    max_sends_per_day: int = 10
    is_active: bool = True


class ReplyMacroLog(BaseModel):
    id: str
    macro_id: str
    account_id: str
    target_chat_id: str
    message_sent: str = ""
    status: str = ""
    error_message: str | None = None
    created_at: str = ""


# ── Channel Hub ─────────────────────────────────────────────────────

class ChannelHubPublishInput(BaseModel):
    account_id: str
    channel_id: str
    title: str
    body: str = ""
    buttons: list[InlineButton] = []
    pin_message: bool = False


class ChannelHubPublishResult(BaseModel):
    id: str
    message_id: int
    published_at: str = ""


# ── Delivery Analytics ──────────────────────────────────────────────

class DeliverySummary(BaseModel):
    total_attempted: int = 0
    successful: int = 0
    failed: int = 0
    success_rate: float = 0.0


class AccountPerformanceItem(BaseModel):
    account_id: str = ""
    attempted: int = 0
    successful: int = 0
    failed: int = 0
    success_rate: float = 0.0


class TimelineItem(BaseModel):
    period: str = ""
    attempted: int = 0
    successful: int = 0
    failed: int = 0


class FailureIntelligenceItem(BaseModel):
    status: str = ""
    count: int = 0
    percentage: float = 0.0
    affected_accounts: int = 0
    latest_occurrence: str | None = None


class DeliveryOverview(BaseModel):
    summary: DeliverySummary | None = None
    by_source: list[dict[str, Any]] | None = None
    top_accounts: list[AccountPerformanceItem] | None = None
    failure_breakdown: list[FailureIntelligenceItem] | None = None
    timeline: list[TimelineItem] | None = None


# ── Batch operations ────────────────────────────────────────────────

class BatchStatusUpdate(BaseModel):
    account_ids: list[str]
    status: str
