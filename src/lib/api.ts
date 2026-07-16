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
import { getToken, getSessionToken, setSessionToken } from "@/lib/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

// ── Network resilience ─────────────────────────────────────────────
// Retry with exponential backoff so Render free-tier cold starts
// (5-30 seconds) don't surface a "서버에 연결할 수 없습니다" error.
// Only network errors (connection refused, DNS failure) are retried;
// HTTP 4xx/5xx responses are returned immediately.
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 2;
const BASE_RETRY_DELAY_MS = 2_000;

function authHeaders(): Record<string, string> {
  const token = getToken();
  const sessionToken = getSessionToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (sessionToken) headers["X-Session-Token"] = sessionToken;
  return headers;
}

function extractDetailMessage(body: unknown): string | null {
  if (typeof body === "string") return body.trim() || null;
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

async function readErrorBody(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
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

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly isNetworkError?: boolean,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      // Only set Content-Type for JSON-string bodies — GET, HEAD, and bodyless DELETE
      // calls should not force application/json, which can confuse some backends and
      // is semantically incorrect.  Non-string bodies (FormData, Blob) also skip the
      // hardcoded Content-Type so the browser can set the correct multipart boundary.
      const hasJsonBody = typeof init?.body === "string";
      const defaultHeaders: Record<string, string> = {
        ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
        ...authHeaders(),
      };
      const res = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        signal: controller.signal,
        headers: { ...defaultHeaders, ...init?.headers },
      });

      if (!res.ok) {
        const body = await readErrorBody(res);
        const detail = extractDetailMessage(body) ?? `요청에 실패했습니다 (${res.status})`;
        // HTTP error — surface immediately, do NOT retry
        throw new ApiError(detail, res.status, false);
      }

      if (res.status === 204) return undefined as T;
      return res.json() as Promise<T>;
    } catch (err) {
      // HTTP errors (4xx/5xx) — surface immediately, do NOT retry
      if (err instanceof ApiError && !err.isNetworkError) {
        throw err;
      }

      // Network/Abort error — retry with exponential backoff up to MAX_RETRIES
      if (attempt < MAX_RETRIES) {
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Last attempt failed — surface the final network error
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new ApiError(
          "서버 응답이 지연되고 있습니다. 네트워크 상태를 확인하고 다시 시도해주세요.",
          undefined,
          true,
        );
      }
      throw new ApiError(
        "서버에 연결할 수 없습니다. 인터넷 연결을 확인하고 다시 시도해주세요.",
        undefined,
        true,
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Unreachable — the loop always throws on the last failed attempt
  throw new ApiError(
    "서버에 연결할 수 없습니다. 인터넷 연결을 확인하고 다시 시도해주세요.",
    undefined,
    true,
  );
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

/**
 * Update an account's status (active/inactive/banned).
 * PATCH /api/accounts/{accountId}/status
 */
export async function updateAccountStatus(
  accountId: string,
  status: Account["status"]
): Promise<void> {
  await request<void>(`/api/accounts/${accountId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

/**
 * Batch enable or disable multiple accounts.
 * PATCH /api/accounts/batch/status
 */
export async function batchUpdateAccountStatus(
  accountIds: string[],
  status: Account["status"]
): Promise<void> {
  await request<void>("/api/accounts/batch/status", {
    method: "PATCH",
    body: JSON.stringify({ account_ids: accountIds, status }),
  });
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

// ── Runtime Inspector API ─────────────────────────────────────────────

export interface RuntimeInspectorSummary {
  total: number;
  active: number;
  healthy: number;
  unauthorized: number;
  rate_limited: number;
  banned: number;
  error: number;
  runtimes: RuntimeSummaryItem[];
}

export interface RuntimeSummaryItem {
  account_id: string;
  phone: string;
  name: string | null;
  status: string;
  running: boolean;
  health_status: string;
  has_session: boolean;
  uptime_seconds: number;
  today_sent: number;
  group_count: number;
  active_broadcasts: number;
  queue_size: number;
  consecutive_failures: number;
  recovery_attempts: number;
  last_recovery_result: string;
}

export interface RuntimeInspectorDetail {
  account_id: string;
  phone: string;
  name: string | null;
  status: string;
  running: boolean;
  started_at: string | null;
  uptime_seconds: number;
  health: Record<string, unknown>;
  rate_limiter: Record<string, unknown>;
  group_cache: Record<string, unknown>;
  broadcast_queue: Record<string, unknown>;
  auto_reply: Record<string, unknown>;
  reply_macros: Record<string, unknown>;
  session: Record<string, unknown>;
  today_sent: number;
}

export async function fetchRuntimeInspectorSummary(): Promise<RuntimeInspectorSummary> {
  return request<RuntimeInspectorSummary>("/api/runtime/inspector");
}

export async function fetchRuntimeInspectorDetail(accountId: string): Promise<RuntimeInspectorDetail> {
  return request<RuntimeInspectorDetail>(`/api/runtime/inspector/${accountId}`);
}

export async function triggerSessionRecovery(accountId: string): Promise<{ account_id: string; recovered: boolean; health_status: string }> {
  return request(`/api/runtime/inspector/${accountId}/recover`, { method: "POST" });
}

export async function restartRuntime(accountId: string): Promise<{ account_id: string; restarted: boolean; authenticated: boolean }> {
  return request(`/api/runtime/inspector/${accountId}/restart`, { method: "POST" });
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

export async function reAuthAccount(accountId: string): Promise<AuthStepResult> {
  return toAuthStepResult(await request<ApiAuthStepResult>(
    `/api/accounts/${accountId}/re-auth`, { method: "POST" }
  ));
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

export interface GroupFolder {
  id: string;
  title: string;
  groupIds: string[];
}

/** Best-effort — the backend returns [] if Telegram folders can't be read, so
 * callers should treat this as purely additive and never block on it. */
export async function fetchGroupFolders(accountId: string): Promise<GroupFolder[]> {
  try {
    const body = await request<{ id: string; title: string; group_ids: string[] }[]>(
      `/api/accounts/${accountId}/groups/folders`
    );
    return body.map((f) => ({ id: f.id, title: f.title, groupIds: f.group_ids }));
  } catch {
    return [];
  }
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
  scheduledAt?: string;
  recurringIntervalMinutes?: number;
  deliveryMode?: "normal" | "cycle" | "bulk" | "reply";
  delaySeconds?: number;
  replyToMessageId?: number;
  inlineButtons?: { label: string; url: string }[];
}

export async function createBroadcast(input: CreateBroadcastInput): Promise<Broadcast> {
  // MUST be multipart/form-data — verified directly against the deployed backend source
  // (telegram-dashboard-backend/app/api/broadcast.py, POST /api/broadcast): every parameter
  // is declared `Annotated[str, Form()]` / `Annotated[UploadFile | None, File()]`, there is no
  // pydantic JSON-body parameter on that route at all. A JSON body makes every Form field
  // report "field required" (422). If you're reading this because it got reverted to JSON
  // again: re-check that file's actual signature before changing it, don't go by a schema
  // name (e.g. "CreateBroadcastInput") that only exists in the unrelated, never-deployed
  // prototype at c:\Dev\TeleMon\backend — this file talks to the real backend, not that one.
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

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/broadcast`, {
      method: "POST",
      body: form,
      headers: { ...authHeaders(), "Idempotency-Key": createIdempotencyKey() },
    });
  } catch {
    clearIdempotencyKey();
    throw new ApiError(
      "서버 응답을 확인할 수 없습니다. 중복 발송 방지를 위해 확인 후 다시 시도해주세요.",
      undefined,
      true,
    );
  }
  if (!res.ok) {
    clearIdempotencyKey();
    const body = await res.json().catch(() => null);
    throw new ApiError(extractDetailMessage(body) ?? `요청에 실패했습니다 (${res.status})`, res.status, false);
  }
  clearIdempotencyKey();
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

let _idempotencyKey: string | null = null;

export function createIdempotencyKey(): string {
  if (!_idempotencyKey) _idempotencyKey = crypto.randomUUID();
  return _idempotencyKey;
}

export function clearIdempotencyKey(): void {
  _idempotencyKey = null;
}

export async function retryBroadcast(broadcastId: string): Promise<Broadcast> {
  return toBroadcast(await request<ApiBroadcast>(`/api/broadcast/${broadcastId}/retry`, { method: "POST" }));
}

export async function sendNowBroadcast(broadcastId: string): Promise<Broadcast> {
  return toBroadcast(await request<ApiBroadcast>(`/api/broadcast/dispatch/${broadcastId}`, { method: "POST" }));
}

export async function cancelRecurringBroadcast(broadcastId: string): Promise<Broadcast> {
  return toBroadcast(await request<ApiBroadcast>(`/api/broadcast/${broadcastId}/cancel`, { method: "POST" }));
}

export const stopBroadcast = cancelRecurringBroadcast;

export async function fetchRecurringBroadcasts(): Promise<Broadcast[]> {
  const logs = await request<ApiBroadcast[]>("/api/broadcast/recurring");
  return logs.map(toBroadcast);
}

export async function pauseRecurringBroadcast(broadcastId: string): Promise<Broadcast> {
  return toBroadcast(await request<ApiBroadcast>(`/api/broadcast/${broadcastId}/pause`, { method: "POST" }));
}

export async function unpauseRecurringBroadcast(broadcastId: string): Promise<Broadcast> {
  return toBroadcast(await request<ApiBroadcast>(`/api/broadcast/${broadcastId}/unpause`, { method: "POST" }));
}

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
  return request("/api/admin/auth/me");
}

// === API keys (admin only) — enhanced with plan schema ===

export interface ApiKeyCreated {
  id: string;
  key: string;
  name: string;
  plan: string;
  maxAccounts: number;
  dailyLimit: number;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  maskedKey: string;
  name: string;
  isActive: boolean;
  plan: string;
  maxAccounts: number;
  dailyLimit: number;
  tenantId: string | null;
  createdAt: string;
  lastUsed: string | null;
}

interface ApiApiKey {
  id: string;
  masked_key: string;
  name: string;
  is_active: boolean;
  plan: string;
  max_accounts: number;
  daily_limit: number;
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
    plan: api.plan ?? "free",
    maxAccounts: api.max_accounts ?? 0,
    dailyLimit: api.daily_limit ?? 0,
    tenantId: api.tenant_id,
    createdAt: api.created_at,
    lastUsed: api.last_used,
  };
}

export async function fetchApiKeys(): Promise<ApiKey[]> {
  const keys = await request<ApiApiKey[]>("/api/admin/api-keys");
  return keys.map(toApiKey);
}

export interface CreateApiKeyInput {
  name: string;
  plan?: "free" | "pro" | "team";
  maxAccounts?: number;
  dailyLimit?: number;
  tenantId?: string;
}

export async function createApiKey(input: CreateApiKeyInput): Promise<ApiKeyCreated> {
  const body: Record<string, unknown> = { name: input.name };
  if (input.plan) body.plan = input.plan;
  if (input.maxAccounts != null) body.max_accounts = input.maxAccounts;
  if (input.dailyLimit != null) body.daily_limit = input.dailyLimit;
  if (input.tenantId) body.tenant_id = input.tenantId;
  const result = await request<{ id: string; key: string; name: string; plan: string; max_accounts: number; daily_limit: number; created_at: string }>(
    "/api/admin/api-keys",
    { method: "POST", body: JSON.stringify(body) }
  );
  return { 
    id: result.id, 
    key: result.key, 
    name: result.name, 
    plan: result.plan ?? "free", 
    maxAccounts: result.max_accounts ?? 0, 
    dailyLimit: result.daily_limit ?? 0, 
    createdAt: result.created_at 
  };
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
  const result = await request<{ access_token: string; session_token: string | null; token_type: string }>("/api/auth/login-with-api-key", {
    method: "POST",
    body: JSON.stringify({ api_key: apiKey }),
  });
  if (result.session_token) {
    setSessionToken(result.session_token);
  }
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

export async function reissueUserApiKey(id: string, memo?: string): Promise<string> {
  const body: Record<string, unknown> = {};
  if (memo) body.memo = memo;
  const result = await request<{ id: string; api_key: string }>(`/api/admin/users/${id}/reissue-key`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return result.api_key;
}

// === Campaigns ===

export interface Campaign {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  status: string;
  goal: string | null;
  total_broadcasts: number;
  total_sent: number;
  total_failed: number;
  total_recipients: number;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface CampaignList {
  items: Campaign[];
  total: number;
}

export interface CreateCampaignInput {
  name: string;
  description?: string;
  goal?: string;
}

export interface UpdateCampaignInput {
  name?: string;
  description?: string;
  status?: string;
  goal?: string;
}

export async function fetchCampaigns(
  tenantId: string,
  params?: { status?: string; search?: string; skip?: number; limit?: number }
): Promise<CampaignList> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.search) qs.set("search", params.search);
  if (params?.skip != null) qs.set("skip", String(params.skip));
  if (params?.limit != null) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return request<CampaignList>(`/api/tenants/${tenantId}/campaigns${query ? `?${query}` : ""}`);
}

export async function createCampaign(tenantId: string, input: CreateCampaignInput): Promise<Campaign> {
  return request<Campaign>(`/api/tenants/${tenantId}/campaigns`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateCampaign(tenantId: string, campaignId: string, input: UpdateCampaignInput): Promise<Campaign> {
  return request<Campaign>(`/api/tenants/${tenantId}/campaigns/${campaignId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteCampaign(tenantId: string, campaignId: string): Promise<void> {
  await request<void>(`/api/tenants/${tenantId}/campaigns/${campaignId}`, { method: "DELETE" });
}

export async function recalcCampaignStats(tenantId: string, campaignId: string): Promise<Campaign> {
  return request<Campaign>(`/api/tenants/${tenantId}/campaigns/${campaignId}/recalc`, { method: "POST" });
}

// === Message Templates ===

export interface MessageTemplate {
  id: string;
  tenant_id: string;
  name: string;
  category: string;
  content: string;
  variables: string;
  is_favorite: boolean;
  use_count: number;
  created_at: string;
  updated_at: string;
}

export interface MessageTemplateList {
  items: MessageTemplate[];
  total: number;
}

export interface CreateTemplateInput {
  name: string;
  category?: string;
  content: string;
  variables?: string[];
}

export interface UpdateTemplateInput {
  name?: string;
  category?: string;
  content?: string;
  variables?: string[];
  is_favorite?: boolean;
}

export async function fetchTemplates(
  tenantId: string,
  params?: { category?: string; search?: string; favorite_only?: boolean; skip?: number; limit?: number }
): Promise<MessageTemplateList> {
  const qs = new URLSearchParams();
  if (params?.category) qs.set("category", params.category);
  if (params?.search) qs.set("search", params.search);
  if (params?.favorite_only) qs.set("favorite_only", "true");
  if (params?.skip != null) qs.set("skip", String(params.skip));
  if (params?.limit != null) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return request<MessageTemplateList>(`/api/tenants/${tenantId}/templates${query ? `?${query}` : ""}`);
}

export async function createTemplate(tenantId: string, input: CreateTemplateInput): Promise<MessageTemplate> {
  return request<MessageTemplate>(`/api/tenants/${tenantId}/templates`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateTemplate(tenantId: string, templateId: string, input: UpdateTemplateInput): Promise<MessageTemplate> {
  return request<MessageTemplate>(`/api/tenants/${tenantId}/templates/${templateId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteTemplate(tenantId: string, templateId: string): Promise<void> {
  await request<void>(`/api/tenants/${tenantId}/templates/${templateId}`, { method: "DELETE" });
}

export async function useTemplate(tenantId: string, templateId: string): Promise<MessageTemplate> {
  return request<MessageTemplate>(`/api/tenants/${tenantId}/templates/${templateId}/use`, { method: "POST" });
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

export async function manualIssueApiKey(
  userIdentifier: string,
  memo?: string,
  plan?: "free" | "pro" | "team",
): Promise<ManualIssueResult> {
  const result = await request<ApiManualIssueResult>("/api/admin/manual-issue-key", {
    method: "POST",
    body: JSON.stringify({ user_identifier: userIdentifier, memo: memo ?? null, plan: plan ?? null }),
  });
  return { userId: result.user_id, phone: result.phone, apiKey: result.api_key, alreadyIssued: result.already_issued };
}

// ─── Channel Hub ────────────────────────────────────────────────────

export interface ChannelHubPublishInput {
  accountId: string;
  channelId: string;
  title: string;
  body?: string;
  buttons?: { label: string; url: string }[];
  pinMessage?: boolean;
}

export interface ChannelHubPublishResult {
  id: string;
  messageId: number;
  publishedAt: string;
}

interface ApiChannelHubPublishResult {
  id: string;
  message_id: number;
  published_at: string;
}

/**
 * Publish a message to a Telegram channel via the Channel Hub.
 * POST /api/channel-hub/publish
 */
export async function publishChannelPost(input: ChannelHubPublishInput): Promise<ChannelHubPublishResult> {
  const result = await request<ApiChannelHubPublishResult>("/api/channel-hub/publish", {
    method: "POST",
    body: JSON.stringify({
      account_id: input.accountId,
      channel_id: input.channelId,
      title: input.title,
      body: input.body ?? "",
      buttons: input.buttons ?? [],
      pin_message: input.pinMessage ?? false,
    }),
  });
  return {
    id: result.id,
    messageId: result.message_id,
    publishedAt: result.published_at,
  };
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

// ─── AI Assist ────────────────────────────────────────────────────

export async function generateAiMessage(prompt: string): Promise<string> {
  const result = await request<{ content: string }>("/api/ai/generate-message", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
  return result.content;
}

export interface AiAnalysisInput {
  summary: string;
  failures: string;
  accounts: string;
  days: number;
}

export interface AiAnalysisResult {
  report: string;
  anomalies: string[];
}

export async function fetchAiDeliveryAnalysis(input: AiAnalysisInput): Promise<AiAnalysisResult> {
  return request<AiAnalysisResult>("/api/ai/analyze-delivery", {
    method: "POST",
    body: JSON.stringify(input),
  });
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
  reply_to_message_id: number | null;
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
    replyToMessageId: api.reply_to_message_id ?? null,
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
  replyToMessageId?: number;
  isActive?: boolean;
  file?: File;
}

export async function fetchReplyMacros(accountId: string): Promise<ReplyMacro[]> {
  const macros = await request<ApiReplyMacro[]>(`/api/accounts/${accountId}/reply-macros`);
  return macros.map(toReplyMacro);
}

export async function createReplyMacro(accountId: string, input: ReplyMacroInput): Promise<ReplyMacro> {
  // The backend expects JSON (MacroCreate Pydantic model), NOT multipart/form-data.
  // Sending FormData causes a 422 because FastAPI cannot deserialize list[str] target_chats
  // from a form field.
  // For file uploads, a separate multipart endpoint should be used.
  return toReplyMacro(await request<ApiReplyMacro>(`/api/accounts/${accountId}/reply-macros`, {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      target_chats: input.targetChats,
      message_content: input.messageContent,
      schedule_type: input.scheduleType ?? "interval",
      interval_hours: input.intervalHours ?? 24,
      fixed_time: input.fixedTime ?? "",
      max_sends_per_day: input.maxSendsPerDay ?? 10,
      is_active: input.isActive ?? true,
      reply_to_message_id: input.replyToMessageId ?? null,
    }),
  }));
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
  if (input.replyToMessageId !== undefined) body.reply_to_message_id = input.replyToMessageId;

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