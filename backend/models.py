"""
Pydantic models for the Account Runtime API.

These mirror the TypeScript types from the frontend (src/types/index.ts)
so the API contract is consistent.

v2 — Enterprise SaaS: Organization, Team, Workspace, Activity, Webhook, Import/Export.
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
    api_id: int | None = None
    api_hash: str | None = None


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
    api_key_info: dict[str, Any] | None = None


# ── API Key ────────────────────────────────────────────────────────────

class APIKeyValidation(BaseModel):
    valid: bool = False
    plan: str = "free"
    permissions: str = "read"
    feature_flags: dict[str, bool] = {}
    max_accounts: int = 0
    daily_limit: int = 0
    usage_count: int = 0
    user_id: str = ""
    key_id: str = ""


class APIKeyCreate(BaseModel):
    name: str = ""
    permissions: str = "read"
    expires_in_days: int | None = None
    plan: str | None = None
    feature_flags: dict[str, bool] | None = None
    max_accounts: int | None = None
    daily_limit: int | None = None


class APIKeyUpdate(BaseModel):
    name: str | None = None
    permissions: str | None = None
    plan: str | None = None
    feature_flags: dict[str, bool] | None = None
    max_accounts: int | None = None
    daily_limit: int | None = None
    is_active: bool | None = None
    expires_in_days: int | None = None


class APIKeyResponse(BaseModel):
    id: str
    key_prefix: str
    name: str = ""
    permissions: str = "read"
    plan: str = "free"
    feature_flags: dict[str, bool] = {}
    max_accounts: int = 0
    daily_limit: int = 0
    is_active: bool = True
    last_used_at: str | None = None
    expires_at: str | None = None
    created_at: str = ""
    usage_count: int = 0
    usage_reset_at: str | None = None


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
    image: str | None = None  # file path after upload


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
    reply_to_message_id: int | None = None
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


# ═════════════════════════════════════════════════════════════════════
# Enterprise SaaS Models (v2)
# ═════════════════════════════════════════════════════════════════════

# ── 1. Multi-Tenant Organization ────────────────────────────────────

class Organization(BaseModel):
    id: str
    name: str
    slug: str
    owner_user_id: str
    plan: str = "free"
    is_active: bool = True
    max_members: int = 5
    max_accounts: int = 25
    created_at: str = ""
    updated_at: str = ""


class OrganizationCreateInput(BaseModel):
    name: str
    slug: str


class OrganizationUpdateInput(BaseModel):
    name: str | None = None
    plan: str | None = None
    max_members: int | None = None
    max_accounts: int | None = None


# ── 2. Team / Member ────────────────────────────────────────────────

class TeamMember(BaseModel):
    id: str
    organization_id: str
    user_id: str
    username: str
    email: str | None = None
    role: str = "member"  # "owner" | "admin" | "member" | "viewer"
    status: str = "active"  # "active" | "invited" | "declined" | "removed"
    invited_by: str | None = None
    invited_at: str = ""
    joined_at: str | None = None
    created_at: str = ""


class InviteMemberInput(BaseModel):
    email: str
    role: str = "member"


class UpdateMemberRoleInput(BaseModel):
    role: str


# ── 3. Workspace ────────────────────────────────────────────────────

class Workspace(BaseModel):
    id: str
    organization_id: str
    name: str
    description: str = ""
    owner_user_id: str
    is_shared: bool = False
    shared_with: list[str] = []  # user_ids
    account_ids: list[str] = []
    created_at: str = ""
    updated_at: str = ""


class WorkspaceCreateInput(BaseModel):
    organization_id: str
    name: str
    description: str = ""


class WorkspaceUpdateInput(BaseModel):
    name: str | None = None
    description: str | None = None
    is_shared: bool | None = None
    account_ids: list[str] | None = None


class WorkspaceShareInput(BaseModel):
    user_ids: list[str]


# ── 4. Activity Feed ────────────────────────────────────────────────

class ActivityEvent(BaseModel):
    id: str
    organization_id: str
    user_id: str
    username: str
    event_type: str  # "broadcast.sent" | "account.added" | "member.invited" | ...
    resource_type: str  # "account" | "broadcast" | "member" | "workspace" | ...
    resource_id: str | None = None
    description: str = ""
    metadata: dict[str, Any] = {}
    severity: str = "info"  # "info" | "warning" | "error" | "critical"
    created_at: str = ""


class ActivityFeedQuery(BaseModel):
    organization_id: str
    limit: int = 50
    offset: int = 0
    event_type: str | None = None
    severity: str | None = None
    since: str | None = None


# ── 5. Advanced Analytics ───────────────────────────────────────────

class AnalyticsQuery(BaseModel):
    organization_id: str
    start_date: str
    end_date: str
    granularity: str = "day"  # "hour" | "day" | "week" | "month"
    metric: str = "messages_sent"  # "messages_sent" | "delivery_rate" | "accounts_active" | ...


class AnalyticsDataPoint(BaseModel):
    period: str
    value: float


class AnalyticsReport(BaseModel):
    organization_id: str
    metric: str
    granularity: str
    start_date: str
    end_date: str
    data: list[AnalyticsDataPoint] = []
    summary: dict[str, Any] = {}


class AnalyticsDashboard(BaseModel):
    organization_id: str
    total_messages_sent: int = 0
    total_broadcasts: int = 0
    delivery_success_rate: float = 0.0
    active_accounts: int = 0
    total_accounts: int = 0
    active_members: int = 0
    total_members: int = 0
    messages_today: int = 0
    messages_this_week: int = 0
    messages_this_month: int = 0
    top_performing_accounts: list[dict[str, Any]] = []
    recent_activity: list[ActivityEvent] = []
    failure_breakdown: list[dict[str, Any]] = []
    timeline: list[AnalyticsDataPoint] = []


# ── 6. Bulk Operations ──────────────────────────────────────────────

class BulkOperation(BaseModel):
    id: str
    organization_id: str
    operation_type: str  # "status_update" | "delete_accounts" | "assign_workspace" | "send_broadcast" | ...
    target_ids: list[str] = []
    params: dict[str, Any] = {}
    status: str = "pending"  # "pending" | "running" | "completed" | "failed" | "partial"
    progress: int = 0  # 0-100
    total: int = 0
    succeeded: int = 0
    failed: int = 0
    errors: list[dict[str, Any]] = []
    created_by: str = ""
    created_at: str = ""
    completed_at: str | None = None


class BulkOperationInput(BaseModel):
    operation_type: str
    target_ids: list[str]
    params: dict[str, Any] = {}


# ── 7. Import / Export ──────────────────────────────────────────────

class ImportJob(BaseModel):
    id: str
    organization_id: str
    user_id: str
    import_type: str  # "accounts" | "broadcasts" | "groups" | "auto_reply_rules"
    file_name: str = ""
    file_size: int = 0
    status: str = "pending"  # "pending" | "processing" | "completed" | "failed"
    total_rows: int = 0
    processed_rows: int = 0
    failed_rows: int = 0
    errors: list[dict[str, Any]] = []
    created_at: str = ""
    completed_at: str | None = None


class ExportJob(BaseModel):
    id: str
    organization_id: str
    user_id: str
    export_type: str  # "accounts" | "broadcasts" | "groups" | "auto_reply_rules" | "analytics"
    status: str = "pending"  # "pending" | "processing" | "completed" | "failed"
    file_format: str = "csv"  # "csv" | "json"
    filters: dict[str, Any] = {}
    file_url: str | None = None
    total_rows: int = 0
    created_at: str = ""
    completed_at: str | None = None


class ExportInput(BaseModel):
    export_type: str
    file_format: str = "csv"
    filters: dict[str, Any] = {}


# ── 8. Webhook ──────────────────────────────────────────────────────

class Webhook(BaseModel):
    id: str
    organization_id: str
    user_id: str
    name: str
    url: str
    events: list[str] = []  # e.g. ["broadcast.sent", "account.added", "member.joined"]
    is_active: bool = True
    secret: str = ""
    last_triggered_at: str | None = None
    last_response_code: int | None = None
    failure_count: int = 0
    created_at: str = ""
    updated_at: str = ""


class WebhookCreateInput(BaseModel):
    name: str
    url: str
    events: list[str] = []
    is_active: bool = True


class WebhookUpdateInput(BaseModel):
    name: str | None = None
    url: str | None = None
    events: list[str] | None = None
    is_active: bool | None = None


class WebhookDelivery(BaseModel):
    id: str
    webhook_id: str
    event_type: str
    payload: dict[str, Any] = {}
    status: str = "pending"  # "pending" | "delivered" | "failed"
    response_code: int | None = None
    response_body: str | None = None
    duration_ms: int = 0
    created_at: str = ""


# ── Public API v2 ───────────────────────────────────────────────────

class APIResponse(BaseModel):
    success: bool = True
    data: Any = None
    error: str | None = None
    pagination: dict[str, Any] | None = None


class PaginationParams(BaseModel):
    page: int = 1
    per_page: int = 20
    sort_by: str = "created_at"
    sort_order: str = "desc"