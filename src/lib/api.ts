import type {
  Account,
  AccountStatus,
  AutoReplyLog,
  AutoReplyLogStatus,
  AutoReplyMatchType,
  AutoReplyRule,
  AutoReplySettings,
  Broadcast,
  BroadcastStatus,
  Group,
  ReplyMacro,
  ReplyMacroLog,
} from "@/types";
import { getToken } from "@/lib/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

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
    throw new Error(extractDetailMessage(body) ?? `?붿껌???ㅽ뙣?덉뒿?덈떎 (${res.status})`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function fetchAccounts(): Promise<Account[]> {
  const accounts = await request<ApiAccount[]>("/api/accounts");
  return accounts.map(toAccount);
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
  const groups = await request<ApiGroup[]>(`/api/accounts/${accountId}/groups`);
  return groups.map(toGroup);
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
  };
}

export interface CreateBroadcastInput {
  accountId: string;
  message: string;
  recipients: string[];
  image?: File;
  /** ISO 8601 datetime. Omit to send as soon as the queue/rate-limit allow it. */
  scheduledAt?: string;
}

export async function createBroadcast(input: CreateBroadcastInput): Promise<Broadcast> {
  const form = new FormData();
  form.append("account_id", input.accountId);
  form.append("message", input.message);
  form.append("recipients", JSON.stringify(input.recipients));
  if (input.image) form.append("image", input.image);
  if (input.scheduledAt) form.append("scheduled_at", input.scheduledAt);

  const res = await fetch(`${API_BASE_URL}/api/broadcast`, { method: "POST", body: form, headers: authHeaders() });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(extractDetailMessage(body) ?? `?붿껌???ㅽ뙣?덉뒿?덈떎 (${res.status})`);
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
 * Retry a failed broadcast using the existing POST /api/broadcast.
 * Copies the original message and recipients — no dedicated retry endpoint needed.
 */
export async function retryBroadcast(failed: Broadcast): Promise<Broadcast> {
  return createBroadcast({
    accountId: failed.accountId,
    message: failed.message,
    recipients: failed.recipients,
  });
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
  createdAt: string;
  lastUsed: string | null;
}

interface ApiApiKey {
  id: string;
  masked_key: string;
  name: string;
  is_active: boolean;
  created_at: string;
  last_used: string | null;
}

function toApiKey(api: ApiApiKey): ApiKey {
  return {
    id: api.id,
    maskedKey: api.masked_key,
    name: api.name,
    isActive: api.is_active,
    createdAt: api.created_at,
    lastUsed: api.last_used,
  };
}

export async function fetchApiKeys(): Promise<ApiKey[]> {
  const keys = await request<ApiApiKey[]>("/api/admin/api-keys");
  return keys.map(toApiKey);
}

export async function createApiKey(name: string): Promise<ApiKeyCreated> {
  const result = await request<{ id: string; key: string; name: string; created_at: string }>(
    "/api/admin/api-keys",
    { method: "POST", body: JSON.stringify({ name }) }
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

// === ?쇰컲 ?ъ슜??濡쒓렇??(?꾪솕踰덊샇 ?몄쬆 + API ?? ===

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
}

export async function fetchAuthMe(): Promise<AuthMe> {
  return request("/api/auth/me");
}

// === ?ъ슜??愿由?(愿由ъ옄 ?꾩슜) ===

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

// ─── Reply Macro (답장매크로) ──────────────────────────────────────

interface ApiReplyMacro {
  id: string;
  account_id: string;
  name: string;
  is_active: boolean;
  target_chats: string;
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
}

export async function fetchReplyMacros(accountId: string): Promise<ReplyMacro[]> {
  const macros = await request<ApiReplyMacro[]>(`/api/accounts/${accountId}/reply-macros`);
  return macros.map(toReplyMacro);
}

export async function createReplyMacro(accountId: string, input: ReplyMacroInput): Promise<ReplyMacro> {
  const macro = await request<ApiReplyMacro>(`/api/accounts/${accountId}/reply-macros`, {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      target_chats: input.targetChats,
      message_content: input.messageContent,
      schedule_type: input.scheduleType ?? "interval",
      interval_hours: input.intervalHours ?? 24,
      fixed_time: input.fixedTime ?? null,
      max_sends_per_day: input.maxSendsPerDay ?? 10,
      is_active: input.isActive ?? true,
    }),
  });
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


