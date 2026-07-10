export type TabId = "dashboard" | "register" | "send" | "group" | "groupsearch" | "profile" | "log" | "autoreply" | "replymacro" | "deliveryanalytics" | "scheduler";

export interface TabDef {
  id: TabId;
  label: string;
}

export const TABS: TabDef[] = [
  { id: "dashboard", label: "대시보드" },
  { id: "register", label: "계정 등록" },
  { id: "send", label: "발송" },
  { id: "scheduler", label: "스케줄러" },
  { id: "group", label: "그룹" },
  { id: "groupsearch", label: "그룹 검색" },
  { id: "autoreply", label: "자동 응답" },
  { id: "replymacro", label: "답장매크로" },
  { id: "profile", label: "프로필" },
  { id: "log", label: "로그" },
  { id: "deliveryanalytics", label: "전달 분석" },
];

export type AccountStatus = "active" | "inactive" | "banned";

export type AccountHealthState =
  | "healthy"
  | "unauthorized"
  | "banned"
  | "rate_limited"
  | "error"
  | "unknown"
  | "not_configured";

export interface AccountHealthItem {
  accountId: string;
  phone: string;
  name: string | null;
  status: AccountHealthState;
  hasSession: boolean;
  lastActivity: string | null;
  lastError: string | null;
  lastErrorStatus: string | null;
  recentSuccessCount: number;
  recentFailureCount: number;
  totalDeliveryAttempts: number;
}

export interface Account {
  id: string;
  phone: string;
  name: string | null;
  status: AccountStatus;
  todaySent: number;
  groupCount: number;
  lastActivity: string | null;
  autoReplyEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export function getAccountDisplayName(account: Account): string {
  return account.name?.trim() || account.phone;
}

export function getAccountInitials(account: Account): string {
  const source = account.name?.trim() || account.phone.replace(/[^0-9A-Za-z가-힣]/g, "");
  return source.slice(0, 2).toUpperCase();
}

export type GroupType = "group" | "megagroup" | "channel";

export interface Group {
  id: string;
  title: string;
  type: GroupType;
  participantsCount: number | null;
}

export type BroadcastStatus = "pending" | "sending" | "sent" | "failed" | "cancelled";

export interface Broadcast {
  id: string;
  accountId: string;
  message: string;
  mediaPath: string | null;
  recipients: string[];
  status: BroadcastStatus;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  errorMessage: string | null;
  /** Minutes between recurring sends. Null = one-time broadcast. */
  recurringIntervalMinutes: number | null;
  /** When a recurring broadcast was last cancelled (null = still active or never cancelled). */
  cancelledAt: string | null;
  /** ISO 8601 of the next scheduled occurrence for recurring broadcasts. */
  nextScheduledAt: string | null;
  /** Whether this recurring broadcast is paused (keeps schedule but doesn't execute). */
  isRecurringPaused: boolean;
}

/** Broadcasts not yet finished -- poll these until they reach a terminal status. */
export function isBroadcastInFlight(broadcast: Broadcast): boolean {
  return broadcast.status === "pending" || broadcast.status === "sending";
}

export function isRecurringBroadcast(broadcast: Broadcast): boolean {
  return broadcast.recurringIntervalMinutes != null && broadcast.recurringIntervalMinutes > 0;
}

export function isRecurringActive(broadcast: Broadcast): boolean {
  return isRecurringBroadcast(broadcast) && broadcast.status !== "cancelled" && broadcast.status !== "failed";
}

export function isRecurringPaused(broadcast: Broadcast): boolean {
  return isRecurringActive(broadcast) && broadcast.isRecurringPaused === true;
}

export type RecurringState = "active" | "paused" | "cancelled" | "error";

export function getRecurringState(broadcast: Broadcast): RecurringState {
  if (broadcast.status === "cancelled") return "cancelled";
  if (broadcast.isRecurringPaused) return "paused";
  if (broadcast.status === "failed") return "error";
  return "active";
}

export interface BroadcastChild {
  id: string;
  accountId: string;
  message: string;
  status: BroadcastStatus;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  errorMessage: string | null;
}

export const MAX_BROADCAST_RECIPIENTS = 10;

export const RECURRING_INTERVALS = [
  { value: 30, label: "30분" },
  { value: 60, label: "1시간" },
  { value: 120, label: "2시간" },
  { value: 180, label: "3시간" },
  { value: 360, label: "6시간" },
  { value: 720, label: "12시간" },
  { value: 1440, label: "24시간" },
] as const;

export type AutoReplyMatchType = "keyword" | "exact";
export type AutoReplyLogStatus = "success" | "failed" | "rate_limited";

export interface AutoReplyRule {
  id: string;
  accountId: string;
  name: string;
  isActive: boolean;
  matchType: AutoReplyMatchType;
  matchValue: string;
  replyContent: string;
  cooldownHours: number;
  maxRepliesPerDay: number;
  createdAt: string;
  updatedAt: string;
}

export interface AutoReplySettings {
  accountId: string;
  autoReplyEnabled: boolean;
  rules: AutoReplyRule[];
}

export interface AutoReplyLog {
  id: string;
  ruleId: string;
  accountId: string;
  chatId: string;
  userId: string;
  userName: string | null;
  triggerMessage: string;
  replySent: string;
  status: AutoReplyLogStatus;
  createdAt: string;
}

// ─── Reply Macro (답장매크로) ──────────────────────────────────────

export type ReplyMacroScheduleType = "interval" | "fixed";

export interface ReplyMacro {
  id: string;
  accountId: string;
  name: string;
  isActive: boolean;
  targetChats: string[];
  messageContent: string;
  mediaPath: string | null;
  scheduleType: ReplyMacroScheduleType;
  intervalHours: number;
  fixedTime: string | null;
  maxSendsPerDay: number;
  lastSentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReplyMacroLog {
  id: string;
  macroId: string;
  accountId: string;
  targetChatId: string;
  messageSent: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

// ─── Delivery Analytics ─────────────────────────────────────────────

export interface DeliverySummary {
  total_attempted: number;
  successful: number;
  failed: number;
  success_rate: number;
}

export interface AccountPerformanceItem {
  account_id: string;
  attempted: number;
  successful: number;
  failed: number;
  success_rate: number;
}

export interface TimelineItem {
  period: string;
  attempted: number;
  successful: number;
  failed: number;
}

export interface FailureIntelligenceItem {
  status: string;
  count: number;
  percentage: number;
  affected_accounts: number;
  latest_occurrence: string | null;
}

export interface SourceAnalyticsItem {
  source: string;
  total: number;
  successful: number;
  failed: number;
  success_rate: number;
}

export interface DeliveryOverview {
  summary: DeliverySummary | null;
  by_source: SourceAnalyticsItem[] | null;
  top_accounts: AccountPerformanceItem[] | null;
  failure_breakdown: FailureIntelligenceItem[] | null;
  timeline: TimelineItem[] | null;
  logical: LogicalSummaryResult | null;
  latency: LatencyResult | null;
  latency_by_source: LatencyBySourceItem[] | null;
  latency_by_account: LatencyByAccountItem[] | null;
}

export interface LogicalSummaryResult {
  total_recipients: number;
  successful: number;
  failed: number;
  success_rate: number;
}

export interface LatencyResult {
  average_latency_ms: number;
  p95_latency_ms: number;
  total_measured: number;
  rows_without_timing: number;
}

export interface LatencyBySourceItem {
  source: string;
  average_latency_ms: number;
  p95_latency_ms: number;
  total_measured: number;
}

export interface LatencyByAccountItem {
  account_id: string;
  average_latency_ms: number;
  p95_latency_ms: number;
  total_measured: number;
}

// ─── Per-endpoint Delivery Analytics types (DeliveryAnalyticsTab) ─────────

export interface AnalyticsSummary {
  total_attempts: number;
  success_count: number;
  failure_count: number;
  success_rate: number;
  period_days: number;
  unique_accounts: number;
  by_source: Record<string, { success: number; failure: number; total: number }>;
  by_status: Record<string, number>;
}

export interface AnalyticsFailureBreakdown {
  failure_reasons: Record<string, number>;
  by_account: Record<string, Record<string, number>>;
  period_days: number;
}

export interface AnalyticsAccountPerformance {
  account_id: string;
  phone: string;
  name: string | null;
  success_count: number;
  failure_count: number;
  total_attempts: number;
  success_rate: number;
  last_activity: string | null;
}

export interface AnalyticsTimelinePoint {
  date: string;
  success_count: number;
  failure_count: number;
  total_attempts: number;
}

export interface AnalyticsRecentActivity {
  id: string;
  account_id: string;
  source: string;
  recipient: string;
  status: string;
  error_message: string | null;
  created_at: string;
  duration_seconds: number | null;
}

export interface AnalyticsSource {
  source: string;
  success_count: number;
  failure_count: number;
  total_attempts: number;
  success_rate: number;
}

export interface AnalyticsBroadcast {
  broadcast_id: string;
  account_id: string;
  message_preview: string;
  recipient_count: number;
  status: string;
  success_count: number;
  failure_count: number;
  total_count: number;
  created_at: string;
}

export interface AnalyticsFailureIntelligence {
  top_failures: { error_message: string; count: number; accounts: string[]; suggestion: string }[];
  systemic_issues: { pattern: string; affected_accounts: number; total_occurrences: number; severity: "high" | "medium" | "low" }[];
}

export interface AnalyticsOverview {
  total_attempts: number;
  success_count: number;
  failure_count: number;
  success_rate: number;
  avg_latency_ms: number;
  active_accounts: number;
  period_hours: number;
}

export interface AnalyticsLatency {
  avg_ms: number;
  p50_ms: number;
  p90_ms: number;
  p99_ms: number;
  by_source: Record<string, { avg_ms: number; p50_ms: number; p90_ms: number; count: number }>;
  by_account: Record<string, { avg_ms: number; count: number }>;
  period_days: number;
}
