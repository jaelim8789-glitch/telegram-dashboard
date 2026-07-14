import type {
  Account,
  AccountHealthItem,
  AccountHealthState,
  AccountStatus,
  AutoReplyLog,
  AutoReplyLogStatus,
  AutoReplyMatchType,
  AutoReplyRule,
  AutoReplySettings,
  Broadcast,
  BroadcastChild,
  BroadcastStatus,
  Group,
  ReplyMacro,
  ReplyMacroLog,
} from "@/types";
import { getToken } from "@/lib/auth";

// NEXT_PUBLIC_API_BASE_URL is inlined at build time.  When empty (the Dockerfile
// default), the frontend uses relative URLs through the nginx reverse proxy
// (/api/* → backend).  When set (e.g. "https://api.telemon.online"), the
// frontend calls the API directly at that origin.
// The fallback "http://localhost:8000" is for local dev without nginx.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/** Every /api/* route requires either this (an admin session) or an X-API-Key ??see
 * app/api/deps.py. The dashboard itself authenticates with the admin session token. */
function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function extractDetailMessage(body: unknown): string | null {
  if (!body || typeof body !== "object" || !("detail" in body)) return null;
  const detail = (body as { detail: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) =>
        typeof item === "object" && item && "msg" in item
          ? String((item as { msg: unknown }).msg)
          : JSON.stringify(item)
      )
      .join(", ");
  }
  return null;
}

interface ApiAccount {
  id: string;
  phone: string;
  name: string | null;
  status: AccountStatus;
  today_sent: number;
  group_count: number;
  last_activity: string | null;
  auto_reply_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAccountInput {
  phone: string;
  name?: string;
}

function toAccount(api: ApiAccount): Account {
  return {
    id: api.id,
    phone: api.phone,
    name: api.name,
    status: api.status,
    todaySent: api.today_sent,
    groupCount: api.group_count,
    lastActivity: api.last_activity,
    autoReplyEnabled: api.auto_reply_enabled,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...init?.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(extractDetailMessage(body) ?? `요청에 실패했습니다 (${res.status})`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function fetchAccounts(): Promise<Account[]> {
  const body = await request<{ items: ApiAccount[] }>("/api/accounts");
  return (body.items ?? body).map(toAccount);
}

export async function createAccount(input: CreateAccountInput): Promise<Account> {
  const account = await request<ApiAccount>("/api/accounts", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return toAccount(account);
}

export async function deleteAccount(id: string): Promise<void> {
  await request<void>(`/api/accounts/${id}`, { method: "DELETE" });
}

interface ApiAccountHealthItem {
  account_id: string;
  phone: string;
  name: string | null;
  status: AccountHealthState;
  has_session: boolean;
  last_activity: string | null;
  last_error: string | null;
  last_error_status: string | null;
  recent_success_count: number;
  recent_failure_count: number;
  total_delivery_attempts: number;
}

function toAccountHealthItem(api: ApiAccountHealthItem): AccountHealthItem {
  return {
    accountId: api.account_id,
    phone: api.phone,
    name: api.name,
    status: api.status,
    hasSession: api.has_session,
    lastActivity: api.last_activity,
    lastError: api.last_error,
    lastErrorStatus: api.last_error_status,
    recentSuccessCount: api.recent_success_count,
    recentFailureCount: api.recent_failure_count,
    totalDeliveryAttempts: api.total_delivery_attempts,
  };
}

export async function fetchAccountHealth(): Promise<AccountHealthItem[]> {
  const items = await request<ApiAccountHealthItem[]>("/api/account-health");
  return items.map(toAccountHealthItem);
}

interface ApiAuthStepResult {
  status: AccountStatus;
  requires_2fa: boolean;
  detail: string | null;
}

export interface AuthStepResult {
  status: AccountStatus;
  requiresTwoFactor: boolean;
  detail: string | null;
}

function toAuthStepResult(api: ApiAuthStepResult): AuthStepResult {
  return { status: api.status, requiresTwoFactor: api.requires_2fa, detail: api.detail };
}

export async function sendCode(accountId: string): Promise<{ sent: boolean }> {
  return request(`/api/accounts/${accountId}/send-code`, { method: "POST" });
}

export async function verifyCode(accountId: string, code: string): Promise<AuthStepResult> {
  const result = await request<ApiAuthStepResult>(`/api/accounts/${accountId}/verify-code`, {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  return toAuthStepResult(result);
}

export async function verifyTwoFactor(accountId: string, password: string): Promise<AuthStepResult> {
  const result = await request<ApiAuthStepResult>(`/api/accounts/${accountId}/verify-2fa`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
  return toAuthStepResult(result);
}

export async function getAuthStatus(accountId: string): Promise<AuthStepResult> {
  const result = await request<ApiAuthStepResult>(`/api/accounts/${accountId}/status`);
  return toAuthStepResult(result);
}

interface ApiGroup {
  id: string;
  title: string;
  type: Group["type"];
  participants_count: number | null;
}

function toGroup(api: ApiGroup): Group {
  return { id: api.id, title: api.title, type: api.type, participantsCount: api.participants_count };
}

export async function fetchGroups(accountId: string): Promise<Group[]> {
  const body = await request<{ items: ApiGroup[] }>(`/api/accounts/${accountId}/groups?page_size=200`);
  return (body.items ?? body).map(toGroup);
}

interface ApiBroadcast {
  id: string;
  account_id: string;
  message: string;
  media_path: string | null;
  recipients: string[];
  status: BroadcastStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  error_message: string | null;
  recurring_interval_minutes: number | null;
  cancelled_at: string | null;
  next_scheduled_at: string | null;
  is_recurring_paused: boolean;
  failure_info: { category: string; retryable: string; recovery_action: string; summary: string } | null;
  reply_to_message_id: number | null;
  inline_buttons: { label: string; url: string }[] | null;
}

function toBroadcast(api: ApiBroadcast): Broadcast {
  return {
    id: api.id,
    accountId: api.account_id,
    message: api.message,
    mediaPath: api.media_path,
    recipients: api.recipients,
    status: api.status,
    scheduledAt: api.scheduled_at,
    sentAt: api.sent_at,
    createdAt: api.created_at,
    errorMessage: api.error_message,
    recurringIntervalMinutes: api.recurring_interval_minutes ?? null,
    cancelledAt: api.cancelled_at ?? null,
    nextScheduledAt: api.next_scheduled_at ?? null,
    isRecurringPaused: api.is_recurring_paused,
    failureInfo: api.failure_info as Broadcast["failureInfo"] | null ?? null,
    replyToMessageId: api.reply_to_message_id ?? null,
    inlineButtons: api.inline_buttons as Broadcast["inlineButtons"] | null ?? null,
  };
}

export interface CreateBroadcastInput {
  accountId: string;
  message: string;
  recipients: string[];
  image?: File;
  /** ISO 8601 datetime. Omit to send as soon as the queue/rate-limit allow it. */
  scheduledAt?: string;
  /** Minutes between recurring sends. Null = one-time broadcast. */
  recurringIntervalMinutes?: number;
  deliveryMode?: "normal" | "cycle" | "bulk" | "reply";
  /** Per-group delay in seconds for normal mode (default 60) */
  delaySeconds?: number;
  /** Reply to a specific Telegram message ID. Only honored by the backend when
   * deliveryMode is "reply" — otherwise the message sends as a new message. */
  replyToMessageId?: number;
  /** Inline keyboard buttons (label + URL pairs). */
  inlineButtons?: { label: string; url: string }[];
}

export async function createBroadcast(input: CreateBroadcastInput): Promise<Broadcast> {
  const form = new FormData();
  form.append("account_id", input.accountId);
  form.append("message", input.message);
  form.append("recipients", JSON.stringify(input.recipients));
  if (input.image) form.append("image", input.image);
  if (input.scheduledAt) form.append("scheduled_at", input.scheduledAt);
  if (input.recurringIntervalMinutes != null) form.append("recurring_interval_minutes", String(input.recurringIntervalMinutes));
  if (input.deliveryMode) form.append("delivery_mode", input.deliveryMode);
  if (input.delaySeconds != null) form.append("delay_seconds", String(input.delaySeconds));
  if (input.replyToMessageId != null) form.append("reply_to_message_id", String(input.replyToMessageId));
  if (input.inlineButtons && input.inlineButtons.length > 0) {
    form.append("inline_buttons", JSON.stringify(input.inlineButtons));
  }

  const res = await fetch(`${API_BASE_URL}/api/broadcast`, { method: "POST", body: form, headers: authHeaders() });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(extractDetailMessage(body) ?? `요청에 실패했습니다 (${res.status})`);
  }
  return toBroadcast(await res.json());
}

export async function fetchBroadcast(id: string): Promise<Broadcast> {
  return toBroadcast(await request<ApiBroadcast>(`/api/broadcast/${id}`));
}

export interface LogFilters {
  accountId?: string;
  status?: BroadcastStatus;
  date?: string;
}

export async function fetchLogs(filters: LogFilters = {}): Promise<Broadcast[]> {
  const params = new URLSearchParams();
  if (filters.accountId) params.set("account_id", filters.accountId);
  if (filters.status) params.set("status", filters.status);
  if (filters.date) params.set("date", filters.date);
  const qs = params.toString();
  const logs = await request<ApiBroadcast[]>(`/api/logs${qs ? `?${qs}` : ""}`);
  return logs.map(toBroadcast);
}

export async function fetchUpcomingBroadcasts(): Promise<Broadcast[]> {
  const logs = await request<ApiBroadcast[]>("/api/scheduler/upcoming");
  return logs.map(toBroadcast);
}

/**
 * Retry a failed broadcast via the Sprint 24 retry API.
 * POST /api/broadcast/{broadcast_id}/retry resets status to "pending"
 * and clears the error message so the scheduler re-dispatches it.
 */
export async function retryBroadcast(broadcastId: string): Promise<Broadcast> {
  return toBroadcast(await request<ApiBroadcast>(`/api/broadcast/${broadcastId}/retry`, { method: "POST" }));
}

/**
 * Send a broadcast immediately as a one-time send. 
 * POST /api/broadcast/{broadcastId}/send
 */
export async function sendNowBroadcast(broadcastId: string): Promise<Broadcast> {
  return toBroadcast(await request<ApiBroadcast>(`/api/broadcast/dispatch/${broadcastId}`, { method: "POST" }));
}

/**
 * Cancel a recurring broadcast. POST /api/broadcast/{broadcast_id}/cancel
 * sets status to "cancelled" so the scheduler stops dispatching it.
 */
export async function cancelRecurringBroadcast(broadcastId: string): Promise<Broadcast> {
  return toBroadcast(await request<ApiBroadcast>(`/api/broadcast/${broadcastId}/cancel`, { method: "POST" }));
}

/**
 * Stop a broadcast (alias for cancel). POST /api/broadcast/{broadcast_id}/cancel
 * sets status to "cancelled" for both one-time and recurring broadcasts.
 */
export const stopBroadcast = cancelRecurringBroadcast;

/**
 * Fetch active recurring broadcasts. GET /api/broadcast/recurring
 * Returns all broadcasts with non-null recurring_interval_minutes that
 * are still active (not cancelled/failed).
 */
export async function fetchRecurringBroadcasts(): Promise<Broadcast[]> {
  const logs = await request<ApiBroadcast[]>("/api/broadcast/recurring");
  return logs.map(toBroadcast);
}

/**
 * Pause a recurring broadcast. POST /api/broadcast/{broadcastId}/pause
 */
export async function pauseRecurringBroadcast(broadcastId: string): Promise<Broadcast> {
  return toBroadcast(await request<ApiBroadcast>(`/api/broadcast/${broadcastId}/pause`, { method: "POST" }));
}

/**
 * Unpause a recurring broadcast. POST /api/broadcast/{broadcastId}/unpause
 */
export async function unpauseRecurringBroadcast(broadcastId: string): Promise<Broadcast> {
  return toBroadcast(await request<ApiBroadcast>(`/api/broadcast/${broadcastId}/unpause`, { method: "POST" }));
}

/**
 * Fetch execution history for a recurring broadcast. GET /api/broadcast/{broadcastId}/children
 */
export async function fetchRecurringChildren(
  broadcastId: string,
  limit?: number,
  offset?: number,
): Promise<BroadcastChild[]> {
  const params = new URLSearchParams();
  if (limit != null) params.set("limit", String(limit));
  if (offset != null) params.set("offset", String(offset));
  const qs = params.toString();
  const items = await request<{
    id: string; account_id: string; message: string; status: BroadcastStatus;
    scheduled_at: string | null; sent_at: string | null; created_at: string; error_message: string | null;
    failure_info: { category: string; retryable: string; recovery_action: string; summary: string } | null;
    inline_buttons: { label: string; url: string }[] | null;
  }[]>(`/api/broadcast/${broadcastId}/children${qs ? `?${qs}` : ""}`);
  return items.map((api) => ({
    id: api.id,
    accountId: api.account_id,
    message: api.message,
    status: api.status,
    scheduledAt: api.scheduled_at,
    sentAt: api.sent_at,
    createdAt: api.created_at,
    errorMessage: api.error_message,
    failureInfo: api.failure_info as BroadcastChild["failureInfo"] | null ?? null,
    inlineButtons: api.inline_buttons as BroadcastChild["inlineButtons"] | null ?? null,
  }));
}

// === Admin auth ===

export async function adminLogin(username: string, password: string): Promise<string> {
  const result = await request<{ access_token: string; token_type: string }>("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  return result.access_token;
}

export async function fetchAdminMe(): Promise<{ username: string }> {
  return request("/api/admin/me");
}

// === API keys (admin only) ===

export interface ApiKeyCreated {
  id: string;
  key: string;
  name: string;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  maskedKey: string;
  name: string;
  isActive: boolean;
  tenantId: string | null;
  createdAt: string;
  lastUsed: string | null;
}

interface ApiApiKey {
  id: string;
  masked_key: string;
  name: string;
  is_active: boolean;
  tenant_id: string | null;
  created_at: string;
  last_used: string | null;
}

function toApiKey(api: ApiApiKey): ApiKey {
  return {
    id: api.id,
    maskedKey: api.masked_key,
    name: api.name,
    isActive: api.is_active,
    tenantId: api.tenant_id,
    createdAt: api.created_at,
    lastUsed: api.last_used,
  };
}

export async function fetchApiKeys(): Promise<ApiKey[]> {
  const keys = await request<ApiApiKey[]>("/api/admin/api-keys");
  return keys.map(toApiKey);
}

export async function createApiKey(name: string, tenantId?: string): Promise<ApiKeyCreated> {
  const result = await request<{ id: string; key: string; name: string; created_at: string }>(
    "/api/admin/api-keys",
    { method: "POST", body: JSON.stringify(tenantId ? { name, tenant_id: tenantId } : { name }) }
  );
  return { id: result.id, key: result.key, name: result.name, createdAt: result.created_at };
}

export async function deleteApiKey(id: string): Promise<void> {
  await request<void>(`/api/admin/api-keys/${id}`, { method: "DELETE" });
}

// === Auto-reply ===

interface ApiAutoReplyRule {
  id: string;
  account_id: string;
  name: string;
  is_active: boolean;
  match_type: AutoReplyMatchType;
  match_value: string;
  reply_content: string;
  cooldown_hours: number;
  max_replies_per_day: number;
  created_at: string;
  updated_at: string;
}

function toAutoReplyRule(api: ApiAutoReplyRule): AutoReplyRule {
  return {
    id: api.id,
    accountId: api.account_id,
    name: api.name,
    isActive: api.is_active,
    matchType: api.match_type,
    matchValue: api.match_value,
    replyContent: api.reply_content,
    cooldownHours: api.cooldown_hours,
    maxRepliesPerDay: api.max_replies_per_day,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

interface ApiAutoReplySettings {
  account_id: string;
  auto_reply_enabled: boolean;
  rules: ApiAutoReplyRule[];
}

export async function fetchAutoReplySettings(accountId: string): Promise<AutoReplySettings> {
  const result = await request<ApiAutoReplySettings>(`/api/accounts/${accountId}/auto-reply`);
  return {
    accountId: result.account_id,
    autoReplyEnabled: result.auto_reply_enabled,
    rules: result.rules.map(toAutoReplyRule),
  };
}

export interface AutoReplyRuleInput {
  name: string;
  matchType: AutoReplyMatchType;
  matchValue: string;
  replyContent: string;
  isActive?: boolean;
  cooldownHours?: number;
  maxRepliesPerDay?: number;
}

function autoReplyRuleInputBody(input: Partial<AutoReplyRuleInput>) {
  return {
    ...(input.name !== undefined && { name: input.name }),
    ...(input.matchType !== undefined && { match_type: input.matchType }),
    ...(input.matchValue !== undefined && { match_value: input.matchValue }),
    ...(input.replyContent !== undefined && { reply_content: input.replyContent }),
    ...(input.isActive !== undefined && { is_active: input.isActive }),
    ...(input.cooldownHours !== undefined && { cooldown_hours: input.cooldownHours }),
    ...(input.maxRepliesPerDay !== undefined && { max_replies_per_day: input.maxRepliesPerDay }),
  };
}

export async function createAutoReplyRule(accountId: string, input: AutoReplyRuleInput): Promise<AutoReplyRule> {
  const rule = await request<ApiAutoReplyRule>(`/api/accounts/${accountId}/auto-reply`, {
    method: "POST",
    body: JSON.stringify(autoReplyRuleInputBody(input)),
  });
  return toAutoReplyRule(rule);
}

export async function updateAutoReplyRule(
  accountId: string,
  ruleId: string,
  input: Partial<AutoReplyRuleInput>
): Promise<AutoReplyRule> {
  const rule = await request<ApiAutoReplyRule>(`/api/accounts/${accountId}/auto-reply/${ruleId}`, {
    method: "PUT",
    body: JSON.stringify(autoReplyRuleInputBody(input)),
  });
  return toAutoReplyRule(rule);
}

export async function deleteAutoReplyRule(accountId: string, ruleId: string): Promise<void> {
  await request<void>(`/api/accounts/${accountId}/auto-reply/${ruleId}`, { method: "DELETE" });
}

export async function toggleAutoReply(accountId: string, enabled: boolean): Promise<boolean> {
  const result = await request<{ account_id: string; auto_reply_enabled: boolean }>(
    `/api/accounts/${accountId}/auto-reply/toggle`,
    { method: "POST", body: JSON.stringify({ enabled }) }
  );
  return result.auto_reply_enabled;
}

interface ApiAutoReplyLog {
  id: string;
  rule_id: string;
  account_id: string;
  chat_id: string;
  user_id: string;
  user_name: string | null;
  trigger_message: string;
  reply_sent: string;
  status: AutoReplyLogStatus;
  created_at: string;
}

function toAutoReplyLog(api: ApiAutoReplyLog): AutoReplyLog {
  return {
    id: api.id,
    ruleId: api.rule_id,
    accountId: api.account_id,
    chatId: api.chat_id,
    userId: api.user_id,
    userName: api.user_name,
    triggerMessage: api.trigger_message,
    replySent: api.reply_sent,
    status: api.status,
    createdAt: api.created_at,
  };
}

export async function fetchAutoReplyLogs(accountId: string): Promise<AutoReplyLog[]> {
  const logs = await request<ApiAutoReplyLog[]>(`/api/accounts/${accountId}/auto-reply/logs`);
  return logs.map(toAutoReplyLog);
}

// === Auth (send code / verify code / API key) ===

export async function sendVerificationCode(phone: string): Promise<void> {
  await request<{ sent: boolean }>("/api/auth/send-code", { method: "POST", body: JSON.stringify({ phone }) });
}

export async function verifyLoginCode(phone: string, code: string): Promise<string> {
  const result = await request<{ api_key: string }>("/api/auth/verify-code", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });
  return result.api_key;
}

export async function loginWithApiKey(apiKey: string): Promise<string> {
  const result = await request<{ access_token: string; token_type: string }>("/api/auth/login-with-api-key", {
    method: "POST",
    body: JSON.stringify({ api_key: apiKey }),
  });
  return result.access_token;
}

export interface AuthMe {
  role: "admin" | "user" | "api_key";
  phone: string | null;
  subscription_status: string | null;
  plan: string | null;
  trial_expires_at: string | null;
}

export async function fetchAuthMe(): Promise<AuthMe> {
  return request("/api/auth/me");
}

// === User management (admin only) ===

export interface DashboardUser {
  id: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
}

interface ApiUser {
  id: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

function toDashboardUser(api: ApiUser): DashboardUser {
  return {
    id: api.id,
    phone: api.phone,
    isActive: api.is_active,
    createdAt: api.created_at,
    lastLogin: api.last_login,
  };
}

export async function fetchUsers(): Promise<DashboardUser[]> {
  const users = await request<ApiUser[]>("/api/admin/users");
  return users.map(toDashboardUser);
}

export async function toggleUser(id: string, isActive: boolean): Promise<DashboardUser> {
  const user = await request<ApiUser>(`/api/admin/users/${id}/toggle`, {
    method: "POST",
    body: JSON.stringify({ is_active: isActive }),
  });
  return toDashboardUser(user);
}

export async function reissueUserApiKey(id: string): Promise<string> {
  const result = await request<{ id: string; api_key: string }>(`/api/admin/users/${id}/reissue-key`, {
    method: "POST",
  });
  return result.api_key;
}

// === Admin user lookup + manual API key issuance ===

export interface UserLookupResult {
  userId: string | null;
  phone: string | null;
  isActive: boolean | null;
  createdAt: string | null;
  lastLogin: string | null;
  hasApiKey: boolean;
  tenantId: string | null;
  tenantPlan: string | null;
  trialExpiresAt: string | null;
  subscriptionStatus: string | null;
  telegramVerificationStatus: string | null;
  telegramUserId: number | null;
  telegramVerifiedAt: string | null;
}

interface ApiUserLookupResult {
  user_id: string | null;
  phone: string | null;
  is_active: boolean | null;
  created_at: string | null;
  last_login: string | null;
  has_api_key: boolean;
  tenant_id: string | null;
  tenant_plan: string | null;
  trial_expires_at: string | null;
  subscription_status: string | null;
  telegram_verification_status: string | null;
  telegram_user_id: number | null;
  telegram_verified_at: string | null;
}

export async function adminUserLookup(q: string): Promise<UserLookupResult | null> {
  const result = await request<ApiUserLookupResult | null>(`/api/admin/user-lookup?q=${encodeURIComponent(q)}`);
  if (!result) return null;
  return {
    userId: result.user_id,
    phone: result.phone,
    isActive: result.is_active,
    createdAt: result.created_at,
    lastLogin: result.last_login,
    hasApiKey: result.has_api_key,
    tenantId: result.tenant_id,
    tenantPlan: result.tenant_plan,
    trialExpiresAt: result.trial_expires_at,
    subscriptionStatus: result.subscription_status,
    telegramVerificationStatus: result.telegram_verification_status,
    telegramUserId: result.telegram_user_id,
    telegramVerifiedAt: result.telegram_verified_at,
  };
}

export interface ManualIssueResult {
  userId: string;
  phone: string;
  apiKey: string;
  alreadyIssued: boolean;
}

interface ApiManualIssueResult {
  user_id: string;
  phone: string;
  api_key: string;
  already_issued: boolean;
}

export async function manualIssueApiKey(userIdentifier: string, memo?: string): Promise<ManualIssueResult> {
  const result = await request<ApiManualIssueResult>("/api/admin/manual-issue-key", {
    method: "POST",
    body: JSON.stringify({ user_identifier: userIdentifier, memo: memo ?? null }),
  });
  return { userId: result.user_id, phone: result.phone, apiKey: result.api_key, alreadyIssued: result.already_issued };
}

// ─── Delivery Analytics ──────────────────────────────────────────────

export async function fetchDeliveryOverview(
  accountId?: string,
  days?: number
): Promise<import("@/types").DeliveryOverview> {
  const params = new URLSearchParams();
  if (days && days !== 30) params.set("days", String(days));
  if (accountId) params.set("account_id", accountId);
  const qs = params.toString();
  return request<import("@/types").DeliveryOverview>(`/api/delivery-analytics/overview${qs ? `?${qs}` : ""}`);
}

export async function fetchDeliverySummary(
  accountId?: string,
  days?: number
): Promise<import("@/types").DeliverySummary> {
  const params = new URLSearchParams();
  if (days && days !== 30) params.set("days", String(days));
  if (accountId) params.set("account_id", accountId);
  const qs = params.toString();
  return request<import("@/types").DeliverySummary>(`/api/delivery-analytics/summary${qs ? `?${qs}` : ""}`);
}

export async function fetchDeliveryTimeline(
  accountId?: string,
  days?: number,
  interval?: "hour" | "day"
): Promise<import("@/types").TimelineItem[]> {
  const params = new URLSearchParams();
  if (days && days !== 30) params.set("days", String(days));
  if (accountId) params.set("account_id", accountId);
  if (interval && interval !== "day") params.set("interval", interval);
  const qs = params.toString();
  return request<import("@/types").TimelineItem[]>(`/api/delivery-analytics/timeline${qs ? `?${qs}` : ""}`);
}

export async function fetchDeliveryAccountPerformance(
  days?: number
): Promise<import("@/types").AccountPerformanceItem[]> {
  const params = new URLSearchParams();
  if (days && days !== 30) params.set("days", String(days));
  const qs = params.toString();
  return request<import("@/types").AccountPerformanceItem[]>(`/api/delivery-analytics/accounts${qs ? `?${qs}` : ""}`);
}

export async function fetchDeliveryFailureIntelligence(
  accountId?: string,
  days?: number
): Promise<import("@/types").FailureIntelligenceItem[]> {
  const params = new URLSearchParams();
  if (days && days !== 30) params.set("days", String(days));
  if (accountId) params.set("account_id", accountId);
  const qs = params.toString();
  return request<import("@/types").FailureIntelligenceItem[]>(`/api/delivery-analytics/failures/intelligence${qs ? `?${qs}` : ""}`);
}

// ─── Per-endpoint Delivery Analytics methods (DeliveryAnalyticsTab) ──────

export async function fetchAnalyticsSummary(params?: {
  account_id?: string; days?: number; source?: string; status?: string; start_time?: string; end_time?: string
}): Promise<import("@/types").AnalyticsSummary> {
  const p = new URLSearchParams();
  if (params) { Object.entries(params).forEach(([k, v]) => { if (v !== undefined) p.set(k, String(v)); }); }
  const qs = p.toString();
  return request<import("@/types").AnalyticsSummary>(`/api/delivery-analytics/summary${qs ? `?${qs}` : ""}`);
}

export async function fetchAnalyticsAccounts(params?: {
  days?: number; source?: string; status?: string; start_time?: string; end_time?: string
}): Promise<import("@/types").AnalyticsAccountPerformance[]> {
  const p = new URLSearchParams();
  if (params) { Object.entries(params).forEach(([k, v]) => { if (v !== undefined) p.set(k, String(v)); }); }
  return request<import("@/types").AnalyticsAccountPerformance[]>(`/api/delivery-analytics/accounts?${p.toString()}`);
}

export async function fetchAnalyticsTimeline(params?: {
  account_id?: string; days?: number; source?: string; status?: string; start_time?: string; end_time?: string; granularity?: string
}): Promise<import("@/types").AnalyticsTimelinePoint[]> {
  const p = new URLSearchParams();
  if (params) { Object.entries(params).forEach(([k, v]) => { if (v !== undefined) p.set(k, String(v)); }); }
  return request<import("@/types").AnalyticsTimelinePoint[]>(`/api/delivery-analytics/timeline?${p.toString()}`);
}

export async function fetchAnalyticsRecent(params?: {
  account_id?: string; limit?: number; source?: string
}): Promise<import("@/types").AnalyticsRecentActivity[]> {
  const p = new URLSearchParams();
  if (params) { Object.entries(params).forEach(([k, v]) => { if (v !== undefined) p.set(k, String(v)); }); }
  return request<import("@/types").AnalyticsRecentActivity[]>(`/api/delivery-analytics/recent?${p.toString()}`);
}

export async function fetchAnalyticsSource(params?: {
  account_id?: string; days?: number; start_time?: string; end_time?: string
}): Promise<import("@/types").AnalyticsSource[]> {
  const p = new URLSearchParams();
  if (params) { Object.entries(params).forEach(([k, v]) => { if (v !== undefined) p.set(k, String(v)); }); }
  return request<import("@/types").AnalyticsSource[]>(`/api/delivery-analytics/source?${p.toString()}`);
}

export async function fetchAnalyticsBroadcasts(params?: {
  account_id?: string; days?: number; status?: string; limit?: number; offset?: number
}): Promise<import("@/types").AnalyticsBroadcast[]> {
  const p = new URLSearchParams();
  if (params) { Object.entries(params).forEach(([k, v]) => { if (v !== undefined) p.set(k, String(v)); }); }
  return request<import("@/types").AnalyticsBroadcast[]>(`/api/delivery-analytics/broadcasts?${p.toString()}`);
}

export async function fetchAnalyticsFailureIntelligence(params?: {
  account_id?: string; days?: number; start_time?: string; end_time?: string
}): Promise<import("@/types").AnalyticsFailureIntelligence> {
  const p = new URLSearchParams();
  if (params) { Object.entries(params).forEach(([k, v]) => { if (v !== undefined) p.set(k, String(v)); }); }
  return request<import("@/types").AnalyticsFailureIntelligence>(`/api/delivery-analytics/failures/intelligence?${p.toString()}`);
}

export async function fetchAnalyticsOverview(params?: {
  account_id?: string; days?: number
}): Promise<import("@/types").AnalyticsOverview> {
  const p = new URLSearchParams();
  if (params) { Object.entries(params).forEach(([k, v]) => { if (v !== undefined) p.set(k, String(v)); }); }
  return request<import("@/types").AnalyticsOverview>(`/api/delivery-analytics/overview?${p.toString()}`);
}

export async function fetchAnalyticsLatency(params?: {
  account_id?: string; days?: number; source?: string; start_time?: string; end_time?: string
}): Promise<import("@/types").AnalyticsLatency> {
  const p = new URLSearchParams();
  if (params) { Object.entries(params).forEach(([k, v]) => { if (v !== undefined) p.set(k, String(v)); }); }
  return request<import("@/types").AnalyticsLatency>(`/api/delivery-analytics/latency?${p.toString()}`);
}

interface ApiReplyMacro {
  id: string;
  account_id: string;
  name: string;
  is_active: boolean;
  target_chats: string[];
  message_content: string;
  media_path: string | null;
  schedule_type: string;
  interval_hours: number;
  fixed_time: string | null;
  max_sends_per_day: number;
  last_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

function toReplyMacro(api: ApiReplyMacro): ReplyMacro {
  return {
    id: api.id,
    accountId: api.account_id,
    name: api.name,
    isActive: api.is_active,
    targetChats: api.target_chats,
    messageContent: api.message_content,
    mediaPath: api.media_path,
    scheduleType: api.schedule_type as ReplyMacro["scheduleType"],
    intervalHours: api.interval_hours,
    fixedTime: api.fixed_time,
    maxSendsPerDay: api.max_sends_per_day,
    lastSentAt: api.last_sent_at,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

export interface ReplyMacroInput {
  name: string;
  targetChats: string[];
  messageContent: string;
  scheduleType?: "interval" | "fixed";
  intervalHours?: number;
  fixedTime?: string;
  maxSendsPerDay?: number;
  isActive?: boolean;
  file?: File;
}

export async function fetchReplyMacros(accountId: string): Promise<ReplyMacro[]> {
  const macros = await request<ApiReplyMacro[]>(`/api/accounts/${accountId}/reply-macros`);
  return macros.map(toReplyMacro);
}

export async function createReplyMacro(accountId: string, input: ReplyMacroInput): Promise<ReplyMacro> {
  // Always multipart/form-data — the backend endpoint only accepts Form()
  // fields (matching createBroadcast's pattern) so a file can be attached in
  // the same request. Sending JSON here 422s.
  const form = new FormData();
  form.append("name", input.name);
  form.append("target_chats", JSON.stringify(input.targetChats));
  form.append("message_content", input.messageContent);
  form.append("schedule_type", input.scheduleType ?? "interval");
  form.append("interval_hours", String(input.intervalHours ?? 24));
  form.append("fixed_time", input.fixedTime ?? "");
  form.append("max_sends_per_day", String(input.maxSendsPerDay ?? 10));
  form.append("is_active", String(input.isActive ?? true));
  if (input.file) form.append("file", input.file);
  const res = await fetch(`${API_BASE_URL}/api/accounts/${accountId}/reply-macros`, { method: "POST", body: form, headers: authHeaders() });
  if (!res.ok) throw new Error(extractDetailMessage(await res.json().catch(() => null)) ?? "매크로 생성 실패");
  const macro: ApiReplyMacro = await res.json();
  return toReplyMacro(macro);
}

export async function updateReplyMacro(accountId: string, macroId: string, input: Partial<ReplyMacroInput>): Promise<ReplyMacro> {
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.name = input.name;
  if (input.targetChats !== undefined) body.target_chats = input.targetChats;
  if (input.messageContent !== undefined) body.message_content = input.messageContent;
  if (input.scheduleType !== undefined) body.schedule_type = input.scheduleType;
  if (input.intervalHours !== undefined) body.interval_hours = input.intervalHours;
  if (input.fixedTime !== undefined) body.fixed_time = input.fixedTime;
  if (input.maxSendsPerDay !== undefined) body.max_sends_per_day = input.maxSendsPerDay;
  if (input.isActive !== undefined) body.is_active = input.isActive;

  const macro = await request<ApiReplyMacro>(`/api/accounts/${accountId}/reply-macros/${macroId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return toReplyMacro(macro);
}

export async function deleteReplyMacro(accountId: string, macroId: string): Promise<void> {
  await request<void>(`/api/accounts/${accountId}/reply-macros/${macroId}`, { method: "DELETE" });
}

export async function executeReplyMacro(accountId: string, macroId: string): Promise<void> {
  await request<void>(`/api/accounts/${accountId}/reply-macros/${macroId}/execute`, { method: "POST" });
}

interface ApiReplyMacroLog {
  id: string;
  macro_id: string;
  account_id: string;
  target_chat_id: string;
  message_sent: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

function toReplyMacroLog(api: ApiReplyMacroLog): ReplyMacroLog {
  return {
    id: api.id,
    macroId: api.macro_id,
    accountId: api.account_id,
    targetChatId: api.target_chat_id,
    messageSent: api.message_sent,
    status: api.status,
    errorMessage: api.error_message,
    createdAt: api.created_at,
  };
}

export async function fetchReplyMacroLogs(accountId: string, macroId: string): Promise<ReplyMacroLog[]> {
  const logs = await request<ApiReplyMacroLog[]>(`/api/accounts/${accountId}/reply-macros/${macroId}/logs`);
  return logs.map(toReplyMacroLog);
}


