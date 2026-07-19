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
//
// request() itself is unchanged (blocks for retries).
// requestFast() fails fast on the first network error so the UI can
// show a fallback immediately, while silently retrying in the
// background.  Callers that want the fast-fail UX should use
// requestFast() and catch the initial error.
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

/**
 * Like request(), but fails fast on the first network error so the UI can
 * show a fallback immediately.  Retries are performed silently in the
 * background; if a retry eventually succeeds the resolved value is returned
 * via the returned promise (the caller can ignore it since the UI already
 * showed a fallback).  If all retries fail, the final error is thrown.
 *
 * Use this for non-critical or speculative fetches where the UI should
 * never block for 60+ seconds.
 */
export async function requestFast<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
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
      throw new ApiError(detail, res.status, false);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  } catch (err) {
    // HTTP errors (4xx/5xx) — surface immediately, do NOT retry
    if (err instanceof ApiError && !err.isNetworkError) {
      throw err;
    }

    // First attempt failed — surface the error to the UI immediately
    const firstError = err instanceof DOMException && err.name === "AbortError"
      ? new ApiError("서버 응답이 지연되고 있습니다. 네트워크 상태를 확인하고 다시 시도해주세요.", undefined, true)
      : new ApiError("서버에 연결할 수 없습니다. 인터넷 연결을 확인하고 다시 시도해주세요.", undefined, true);

    // Fire-and-forget background retry with exponential backoff
    (async () => {
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        try {
          const bgController = new AbortController();
          const bgTimeout = setTimeout(() => bgController.abort(), REQUEST_TIMEOUT_MS);
          const hasJsonBody = typeof init?.body === "string";
          const defaultHeaders: Record<string, string> = {
            ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
            ...authHeaders(),
          };
          const res = await fetch(`${API_BASE_URL}${path}`, {
            ...init,
            signal: bgController.signal,
            headers: { ...defaultHeaders, ...init?.headers },
          });
          clearTimeout(bgTimeout);

          if (!res.ok) {
            const body = await readErrorBody(res);
            const detail = extractDetailMessage(body) ?? `요청에 실패했습니다 (${res.status})`;
            throw new ApiError(detail, res.status, false);
          }

          if (res.status === 204) return undefined as T;
          return res.json() as Promise<T>;
        } catch {
          // Background retry failed — try again or give up silently
        }
      }
    })();

    throw firstError;
  } finally {
    clearTimeout(timeoutId);
  }
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

export async function clearAccountError(id: string): Promise<Account> {
  return request<Account>(`/api/accounts/${id}/clear-error`, { method: "POST" });
}

/**
 * Update an account's status (active/inactive/banned).
 * PUT /api/accounts/{accountId}
 */
export async function updateAccountStatus(
  accountId: string,
  status: Account["status"]
): Promise<void> {
  await request<void>(`/api/accounts/${accountId}`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

/**
 * Batch enable or disable multiple accounts.
 * POST /api/accounts/bulk
 */
export async function batchUpdateAccountStatus(
  accountIds: string[],
  status: Account["status"]
): Promise<void> {
  const action = status === "active" ? "activate" : "deactivate";
  await request<void>("/api/accounts/bulk", {
    method: "POST",
    body: JSON.stringify({ action, account_ids: accountIds }),
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
    `/api/accounts/${accountId}/send-code`, { method: "POST" }
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
  groupIds?: string[];
  campaignId?: string;
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

  try {
    const result = await request<ApiBroadcast>("/api/broadcast", {
      method: "POST",
      body: form,
      headers: { "Idempotency-Key": createIdempotencyKey() },
    });
    clearIdempotencyKey();
    return toBroadcast(result);
  } catch (err) {
    clearIdempotencyKey();
    throw err;
  }
}

export async function fetchBroadcast(id: string): Promise<Broadcast> {
  return toBroadcast(await request<ApiBroadcast>(`/api/broadcast/${id}`));
}

export interface LogFilters {
  accountId?: string;
  status?: BroadcastStatus;
  date?: string;
  /** Number of recent days to fetch. When set, overrides backend default (all). */
  days?: number;
}

export async function fetchLogs(filters: LogFilters = {}): Promise<Broadcast[]> {
  const params = new URLSearchParams();
  if (filters.accountId) params.set("account_id", filters.accountId);
  if (filters.status) params.set("status", filters.status);
  if (filters.date) params.set("date", filters.date);
  if (filters.days != null) params.set("days", String(filters.days));
  const qs = params.toString();
  const logs = await request<ApiBroadcast[]>(`/api/logs${qs ? `?${qs}` : ""}`);
  return logs.map(toBroadcast);
}

export async function fetchUpcomingBroadcasts(): Promise<Broadcast[]> {
  const logs = await request<ApiBroadcast[]>("/api/scheduler/upcoming");
  return logs.map(toBroadcast);
}

export async function sendToGroup(input: {
  accountId: string;
  message: string;
  groupIds: string[];
  scheduledAt?: string;
  deliveryMode?: "normal" | "cycle" | "bulk" | "reply";
  delaySeconds?: number;
  inlineButtons?: { label: string; url: string }[];
  campaignId?: string;
}): Promise<Broadcast> {
  return toBroadcast(await request<ApiBroadcast>("/api/broadcast/send-group", {
    method: "POST",
    body: JSON.stringify({
      account_id: input.accountId,
      message: input.message,
      group_ids: input.groupIds,
      scheduled_at: input.scheduledAt ?? null,
      delivery_mode: input.deliveryMode ?? "normal",
      delay_seconds: input.delaySeconds ?? null,
      inline_buttons: input.inlineButtons ?? null,
      campaign_id: input.campaignId ?? null,
    }),
  }));
}

export async function batchRetryBroadcasts(broadcastIds: string[]): Promise<{ results: { id: string; status: string; error?: string }[] }> {
  return request("/api/broadcast/batch-retry", {
    method: "POST",
    body: JSON.stringify({ broadcast_ids: broadcastIds }),
  });
}

export async function fetchSchedulerStatus(): Promise<{
  tick_interval_seconds: number;
  next_tick_at: string | null;
  due_broadcasts_count: number;
  running_broadcasts_count: number;
  running_recurring_count: number;
  running_reply_macros_count: number;
  scheduler_running: boolean;
}> {
  return request("/api/scheduler/status");
}

export async function fetchBroadcastEstimate(input: {
  accountId: string;
  recipientCount: number;
  deliveryMode: "normal" | "cycle" | "bulk" | "reply";
  delaySeconds?: number;
}): Promise<{ estimated_seconds: number; estimated_minutes: number; readable: string }> {
  return request("/api/broadcast/estimate", {
    method: "POST",
    body: JSON.stringify({
      account_id: input.accountId,
      recipient_count: input.recipientCount,
      delivery_mode: input.deliveryMode,
      delay_seconds: input.delaySeconds ?? null,
    }),
  });
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
    delivery_mode: "normal" | "cycle" | "bulk" | "reply";
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
    deliveryMode: api.delivery_mode,
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

// === Telegram Login Widget ===

export interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export interface TelegramLoginResult {
  access_token: string;
  session_token: string;
  is_new_user: boolean;
}

export async function telegramLogin(authData: TelegramAuthData): Promise<TelegramLoginResult> {
  const result = await request<TelegramLoginResult>("/api/auth/telegram-login", {
    method: "POST",
    body: JSON.stringify(authData),
  });
  return result;
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
  telegram_username?: string | null;
  telegram_photo_url?: string | null;
  stars_balance?: number;
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

// === Admin Dashboard Status ===

export interface AdminDashboardUserStats {
  total: number;
  active: number;
  inactive: number;
}

export interface AdminDashboardAccountStats {
  total: number;
  healthy: number;
  unhealthy: number;
  not_configured: number;
  banned: number;
  rate_limited: number;
  unauthorized: number;
  error_count: number;
  unknown: number;
  has_session: number;
  has_errors: number;
  total_today_sent: number;
  total_groups: number;
}

export interface AdminDashboardBroadcastStats {
  recent_total: number;
  recent_failed: number;
  failure_rate: number;
  recent_window_hours: number;
}

export interface AdminDashboardStatus {
  users: AdminDashboardUserStats;
  accounts: AdminDashboardAccountStats;
  broadcasts: AdminDashboardBroadcastStats;
}

export async function fetchAdminDashboardStatus(): Promise<AdminDashboardStatus> {
  return request<AdminDashboardStatus>("/api/admin/dashboard/status");
}

// === Account Health ===

export interface HealthSummary {
  total: number;
  counts: Record<string, number>;
  healthy_count: number;
  unhealthy_count: number;
  overall_success_rate: number;
  total_success: number;
  total_failure: number;
  average_health_score: number;
  health_scores: { account_id: string; score: number }[];
}

export interface HealthTrendPoint {
  date: string;
  total: number;
  successful: number;
  failed: number;
  success_rate: number;
  active_accounts: number;
}

export interface HealthTrend {
  trend: HealthTrendPoint[];
}

export async function fetchHealthSummary(): Promise<HealthSummary> {
  return request<HealthSummary>("/api/account-health/summary");
}

export async function fetchHealthTrend(days?: number): Promise<HealthTrend> {
  const qs = days && days !== 14 ? `?days=${days}` : "";
  return request<HealthTrend>(`/api/account-health/trend${qs}`);
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
  // undefined = leave untouched (update) / use default (create); null = explicitly clear
  // (update only) so the macro reverts to auto-replying to each target's latest message.
  replyToMessageId?: number | null;
  isActive?: boolean;
  file?: File;
}

export async function fetchReplyMacros(accountId: string): Promise<ReplyMacro[]> {
  const macros = await request<ApiReplyMacro[]>(`/api/accounts/${accountId}/reply-macros`);
  return macros.map(toReplyMacro);
}

export async function createReplyMacro(accountId: string, input: ReplyMacroInput): Promise<ReplyMacro> {
  // The backend endpoint takes UploadFile/File() for the optional attachment, which forces
  // the whole request into multipart/form-data — FastAPI cannot deserialize a Pydantic body
  // model from form fields, so every field is submitted as its own Form field instead of a
  // single JSON body. Do not switch this back to `body: JSON.stringify(...)`; see
  // telegram-dashboard-backend/app/api/reply_macro.py::create_macro and
  // tests/test_reply_macro_api.py for the regression this guards against.
  const form = new FormData();
  form.append("name", input.name);
  form.append("target_chats", JSON.stringify(input.targetChats));
  form.append("message_content", input.messageContent);
  form.append("schedule_type", input.scheduleType ?? "interval");
  form.append("interval_hours", String(input.intervalHours ?? 24));
  form.append("fixed_time", input.fixedTime ?? "");
  form.append("max_sends_per_day", String(input.maxSendsPerDay ?? 10));
  form.append("is_active", String(input.isActive ?? true));
  if (input.replyToMessageId != null) form.append("reply_to_message_id", String(input.replyToMessageId));
  if (input.file) form.append("file", input.file);

  return toReplyMacro(await request<ApiReplyMacro>(`/api/accounts/${accountId}/reply-macros`, {
    method: "POST",
    body: form,
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

// ─── Team Management ──────────────────────────────────────────────────

export interface TeamMemberData {
  id: string;
  tenant_id: string;
  username: string;
  display_name: string | null;
  phone: string | null;
  role: "owner" | "admin" | "member";
  is_active: boolean;
  invited_by: string | null;
  invite_token: string | null;
  invited_at: string | null;
  joined_at: string | null;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamMemberListData {
  items: TeamMemberData[];
  total: number;
}

export interface TeamInviteInput {
  username: string;
  role?: "admin" | "member";
}

export interface TeamUpdateInput {
  role?: "admin" | "member";
  is_active?: boolean;
  display_name?: string;
}

export async function fetchTeamMembers(
  tenantId: string,
  params?: { search?: string; skip?: number; limit?: number }
): Promise<TeamMemberListData> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.skip != null) qs.set("skip", String(params.skip));
  if (params?.limit != null) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return request<TeamMemberListData>(`/api/tenants/${tenantId}/team/members${query ? `?${query}` : ""}`);
}

export async function inviteTeamMember(tenantId: string, input: TeamInviteInput): Promise<TeamMemberData> {
  return request<TeamMemberData>(`/api/tenants/${tenantId}/team/invite`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ─── AI Reply 2.0 ─────────────────────────────────────────────────

import type {
  AiReplyRequest, AiReplyResponse, AiStreamChunk,
  AiComparisonRequest, AiComparisonResponse,
  AiPromptTemplate, AiTemplateCreateInput,
  AiMemorySearchResult,
  AiSession, AiUsageSummary, AiPlanLimits, AiSearchFilters,
} from "@/types";

export async function requestAiReply(input: AiReplyRequest): Promise<AiReplyResponse> {
  return request<AiReplyResponse>("/api/ai/reply-assistant", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function requestAiReplyStream(
  input: AiReplyRequest,
  onChunk: (chunk: AiStreamChunk) => void,
  signal?: AbortSignal,
): Promise<void> {
  const token = getToken();
  const url = `${API_BASE_URL}/api/ai/reply-assistant/stream`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
    signal,
  });

  if (!res.ok) {
    const err = await readErrorBody(res).catch(() => null);
    onChunk({ type: "error", error: extractDetailMessage(err) || "스트리밍 요청 실패" });
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    onChunk({ type: "error", error: "응답 스트림을 읽을 수 없습니다" });
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      try {
        const data = JSON.parse(trimmed.slice(6)) as AiStreamChunk;
        onChunk(data);
      } catch { /* skip malformed chunk */ }
    }
  }

  if (buffer.trim().startsWith("data: ")) {
    try {
      const data = JSON.parse(buffer.trim().slice(6)) as AiStreamChunk;
      onChunk(data);
    } catch { /* skip */ }
  }
}

export async function requestAiComparison(input: AiComparisonRequest): Promise<AiComparisonResponse> {
  return request<AiComparisonResponse>("/api/ai/reply-assistant/compare", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function requestAiChat(
  message: string,
  sessionId?: string | null,
): Promise<{ reply: string; session_id: string }> {
  return request<{ reply: string; session_id: string }>("/api/ai/chat", {
    method: "POST",
    body: JSON.stringify({ message, session_id: sessionId, use_memory: true }),
  });
}

export async function listAiSessions(): Promise<{ session_id: string; first_message: string; last_message: string; message_count: number }[]> {
  return request("/api/ai/chat/sessions");
}

export async function getAiSessionHistory(sessionId: string): Promise<{ messages: { role: "user" | "assistant"; content: string }[] }> {
  return request(`/api/ai/chat/history/${sessionId}`);
}

// ─── AI Reply 2.0 — Session Management ────────────────────────────

export async function fetchAiSessions(search?: string): Promise<AiSession[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  return request<AiSession[]>(`/api/ai/sessions${qs}`);
}

export async function deleteAiSession(sessionId: string): Promise<void> {
  await request<void>(`/api/ai/sessions/${sessionId}`, { method: "DELETE" });
}

export async function starAiSession(sessionId: string, starred: boolean): Promise<void> {
  await request<void>(`/api/ai/sessions/${sessionId}`, {
    method: "PATCH",
    body: JSON.stringify({ isStarred: starred }),
  });
}

// ─── AI Reply 2.0 — Prompt Templates ──────────────────────────────

export async function fetchAiTemplates(category?: string): Promise<AiPromptTemplate[]> {
  const qs = category ? `?category=${encodeURIComponent(category)}` : "";
  return request<AiPromptTemplate[]>(`/api/ai/templates${qs}`);
}

export async function createAiTemplate(input: AiTemplateCreateInput): Promise<AiPromptTemplate> {
  return request<AiPromptTemplate>("/api/ai/templates", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateAiTemplate(id: string, input: Partial<AiTemplateCreateInput>): Promise<AiPromptTemplate> {
  return request<AiPromptTemplate>(`/api/ai/templates/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteAiTemplate(id: string): Promise<void> {
  await request<void>(`/api/ai/templates/${id}`, { method: "DELETE" });
}

// ─── AI Reply 2.0 — Memory Viewer ─────────────────────────────────

export async function searchAiMemory(query: string): Promise<AiMemorySearchResult> {
  return request<AiMemorySearchResult>(`/api/ai/memory/search?q=${encodeURIComponent(query)}`);
}

export async function deleteAiMemoryEntry(entryId: string): Promise<void> {
  await request<void>(`/api/ai/memory/${entryId}`, { method: "DELETE" });
}

export async function clearAiMemory(): Promise<void> {
  await request<void>("/api/ai/memory", { method: "DELETE" });
}

// ─── AI Reply 2.0 — Usage / Analytics ─────────────────────────────

export async function fetchAiUsage(days: number = 30): Promise<AiUsageSummary> {
  return request<AiUsageSummary>(`/api/ai/usage?days=${days}`);
}

export async function fetchAiPlanLimits(): Promise<AiPlanLimits> {
  return request<AiPlanLimits>("/api/ai/plan-limits");
}

// ─── AI Reply 2.0 — Search ────────────────────────────────────────

export async function searchAiHistory(filters: AiSearchFilters): Promise<{ results: AiSession[]; total: number }> {
  return request<{ results: AiSession[]; total: number }>("/api/ai/history/search", {
    method: "POST",
    body: JSON.stringify(filters),
  });
}

// ─── Team Invites ───────────────────────────────────────────────

export async function acceptTeamInvite(token: string): Promise<TeamMemberData> {
  return request<TeamMemberData>("/api/tenants/_/team/accept-invite", {
    method: "POST",
    body: JSON.stringify({ invite_token: token }),
  });
}

export async function updateTeamMember(
  tenantId: string,
  memberId: string,
  input: TeamUpdateInput
): Promise<TeamMemberData> {
  return request<TeamMemberData>(`/api/tenants/${tenantId}/team/members/${memberId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function removeTeamMember(tenantId: string, memberId: string): Promise<void> {
  await request<void>(`/api/tenants/${tenantId}/team/members/${memberId}`, { method: "DELETE" });
}

// ─── Phase 2: AI Platform APIs ─────────────────────────────────────

export async function fetchLangGraphWorkflows(): Promise<import("@/types").LangGraphWorkflow[]> {
  return request<import("@/types").LangGraphWorkflow[]>("/api/ai/langgraph/workflows");
}

export async function fetchLangGraphWorkflow(id: string): Promise<import("@/types").LangGraphWorkflow> {
  return request<import("@/types").LangGraphWorkflow>(`/api/ai/langgraph/workflows/${id}`);
}

export async function executeLangGraphWorkflow(id: string): Promise<import("@/types").LangGraphExecution> {
  return request<import("@/types").LangGraphExecution>(`/api/ai/langgraph/workflows/${id}/execute`, { method: "POST" });
}

export async function stopLangGraphWorkflow(id: string): Promise<void> {
  await request<void>(`/api/ai/langgraph/workflows/${id}/stop`, { method: "POST" });
}

export async function fetchLangGraphExecutions(workflowId: string): Promise<import("@/types").LangGraphExecution[]> {
  return request<import("@/types").LangGraphExecution[]>(`/api/ai/langgraph/workflows/${workflowId}/executions`);
}

export async function fetchAIAgents(): Promise<import("@/types").AIAgent[]> {
  return request<import("@/types").AIAgent[]>("/api/ai/agents");
}

export async function fetchAIAgent(id: string): Promise<import("@/types").AIAgent> {
  return request<import("@/types").AIAgent>(`/api/ai/agents/${id}`);
}

export async function updateAgentStatus(id: string, status: import("@/types").AgentStatus): Promise<import("@/types").AIAgent> {
  return request<import("@/types").AIAgent>(`/api/ai/agents/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function fetchAgentTasks(agentId: string, pageSize?: number): Promise<import("@/types").AgentTask[]> {
  const qs = pageSize ? `?page_size=${pageSize}` : "";
  return request<import("@/types").AgentTask[]>(`/api/ai/agents/${agentId}/tasks${qs}`);
}

export async function fetchMCPTools(): Promise<import("@/types").MCPTool[]> {
  return request<import("@/types").MCPTool[]>("/api/ai/mcp/tools");
}

export async function fetchMCPCategories(): Promise<import("@/types").MCPCategoryInfo[]> {
  return request<import("@/types").MCPCategoryInfo[]>("/api/ai/mcp/categories");
}

export async function executeMCPTool(toolId: string, input: Record<string, unknown>): Promise<import("@/types").MCPExecution> {
  return request<import("@/types").MCPExecution>(`/api/ai/mcp/tools/${toolId}/execute`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchMCPExecutions(toolId?: string): Promise<import("@/types").MCPExecution[]> {
  const qs = toolId ? `?tool_id=${toolId}` : "";
  return request<import("@/types").MCPExecution[]>(`/api/ai/mcp/executions${qs}`);
}

export async function fetchWorkflowDefinitions(): Promise<import("@/types").WorkflowDefinition[]> {
  return request<import("@/types").WorkflowDefinition[]>("/api/ai/workflows");
}

export async function fetchWorkflowDefinition(id: string): Promise<import("@/types").WorkflowDefinition> {
  return request<import("@/types").WorkflowDefinition>(`/api/ai/workflows/${id}`);
}

export async function createWorkflowDefinition(data: Partial<import("@/types").WorkflowDefinition>): Promise<import("@/types").WorkflowDefinition> {
  return request<import("@/types").WorkflowDefinition>("/api/ai/workflows", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateWorkflowDefinition(id: string, data: Partial<import("@/types").WorkflowDefinition>): Promise<import("@/types").WorkflowDefinition> {
  return request<import("@/types").WorkflowDefinition>(`/api/ai/workflows/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteWorkflowDefinition(id: string): Promise<void> {
  await request<void>(`/api/ai/workflows/${id}`, { method: "DELETE" });
}

export async function executeWorkflowDefinition(id: string): Promise<import("@/types").WorkflowExecution> {
  return request<import("@/types").WorkflowExecution>(`/api/ai/workflows/${id}/execute`, { method: "POST" });
}

export async function fetchWorkflowExecutions(workflowId: string): Promise<import("@/types").WorkflowExecution[]> {
  return request<import("@/types").WorkflowExecution[]>(`/api/ai/workflows/${workflowId}/executions`);
}

export async function fetchTimelineEvents(limit?: number): Promise<import("@/types").TimelineEvent[]> {
  const qs = limit ? `?limit=${limit}` : "";
  return request<import("@/types").TimelineEvent[]>(`/api/ai/timeline${qs}`);
}

export async function fetchTimelineGrouped(days?: number): Promise<import("@/types").TimelineGroup[]> {
  const qs = days ? `?days=${days}` : "";
  return request<import("@/types").TimelineGroup[]>(`/api/ai/timeline/grouped${qs}`);
}

export async function fetchActivityEvents(limit?: number): Promise<import("@/types").ActivityEvent[]> {
  const qs = limit ? `?limit=${limit}` : "";
  return request<import("@/types").ActivityEvent[]>(`/api/ai/activity${qs}`);
}

export async function fetchActivitySessions(): Promise<import("@/types").ActivitySession[]> {
  return request<import("@/types").ActivitySession[]>("/api/ai/activity/sessions");
}

export async function fetchMemoryGraph(): Promise<import("@/types").MemoryGraph> {
  return request<import("@/types").MemoryGraph>("/api/ai/memory/graph");
}

export async function fetchMemoryEntities(params?: { type?: string; search?: string }): Promise<import("@/types").MemoryEntity[]> {
  const qs = new URLSearchParams();
  if (params?.type) qs.set("type", params.type);
  if (params?.search) qs.set("search", params.search);
  const query = qs.toString();
  return request<import("@/types").MemoryEntity[]>(`/api/ai/memory/entities${query ? `?${query}` : ""}`);
}

export async function searchMemory(query: string): Promise<import("@/types").MemorySearchResult[]> {
  return request<import("@/types").MemorySearchResult[]>(`/api/ai/memory/search?q=${encodeURIComponent(query)}`);
}

export async function fetchMemoryRelations(entityId?: string): Promise<import("@/types").MemoryRelation[]> {
  const qs = entityId ? `?entity_id=${entityId}` : "";
  return request<import("@/types").MemoryRelation[]>(`/api/ai/memory/relations${qs}`);
}

export async function fetchAIAnalyticsOverview(days?: number): Promise<import("@/types").AIAnalyticsOverview> {
  const qs = days ? `?days=${days}` : "";
  return request<import("@/types").AIAnalyticsOverview>(`/api/ai/analytics/overview${qs}`);
}

export async function fetchAIAnalyticsDaily(days?: number): Promise<import("@/types").AIAnalyticsDaily[]> {
  const qs = days ? `?days=${days}` : "";
  return request<import("@/types").AIAnalyticsDaily[]>(`/api/ai/analytics/daily${qs}`);
}

export async function fetchAIAnalyticsAgentBreakdown(): Promise<import("@/types").AIAnalyticsAgentBreakdown[]> {
  return request<import("@/types").AIAnalyticsAgentBreakdown[]>("/api/ai/analytics/agents");
}

export async function fetchAIAnalyticsToolUsage(): Promise<import("@/types").AIAnalyticsToolUsage[]> {
  return request<import("@/types").AIAnalyticsToolUsage[]>("/api/ai/analytics/tools");
}

export async function fetchAIAnalyticsErrors(): Promise<import("@/types").AIAnalyticsErrorSummary[]> {
  return request<import("@/types").AIAnalyticsErrorSummary[]>("/api/ai/analytics/errors");
}

export async function fetchAIAnalyticsRealtime(): Promise<{ activeAgents: number; pendingTasks: number; runningWorkflows: number; recentErrors: number }> {
  return request("/api/ai/analytics/realtime");
}
