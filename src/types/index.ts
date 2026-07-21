export type TabId = "dashboard" | "register" | "send" | "group" | "groupsearch" | "linkinspector" | "profile" | "log" | "autoreply" | "replymacro" | "deliveryanalytics" | "scheduler" | "channelhub" | "folders" | "templates" | "myai" | "health" | "team" | "campaigns" | "aireply" | "aibroadcast" | "aioperations" | "aiopscenter" | "aiusage" | "guestbot" | "drafts" | "triggers" | "stars" | "apikeys" | "audit";

// Navigation/IA grouping — 6 categories
export type TabGroup = "dashboard" | "send" | "ops" | "ai" | "settings" | "new";

export interface TabDef {
  id: TabId;
  label: string;
  /** Shorter label used on mobile when horizontal space is limited (≤ 640px viewport). Falls back to `label` when absent. */
  shortLabel?: string;
  group: TabGroup;
}

export const TABS: TabDef[] = [
  // ── 대시보드 (최상단 단독) ──
  { id: "dashboard", label: "대시보드", shortLabel: "대시", group: "dashboard" },

  // ── 발송 ──
  { id: "send", label: "발송", group: "send" },
  { id: "drafts", label: "Draft 검토", shortLabel: "초안", group: "send" },
  { id: "scheduler", label: "스케줄러", group: "send" },
  { id: "replymacro", label: "답장매크로", shortLabel: "매크로", group: "send" },
  { id: "templates", label: "템플릿", group: "send" },

  // ── 운영/모니터링 ──
  { id: "log", label: "로그", group: "ops" },
  { id: "deliveryanalytics", label: "전달 분석", shortLabel: "분석", group: "ops" },
  { id: "health", label: "계정 건강", shortLabel: "건강", group: "ops" },
  { id: "linkinspector", label: "링크 검사", shortLabel: "링크", group: "ops" },
  { id: "register", label: "계정 등록", shortLabel: "등록", group: "ops" },
  { id: "group", label: "그룹", group: "ops" },
  { id: "groupsearch", label: "그룹 검색", shortLabel: "검색", group: "ops" },
  { id: "autoreply", label: "자동 응답", shortLabel: "자동", group: "ops" },
  { id: "channelhub", label: "채널 허브", shortLabel: "허브", group: "ops" },

  // ── AI 도구 ──
  { id: "myai", label: "나만의 AI", shortLabel: "AI", group: "ai" },
  { id: "aireply", label: "AI 답장", shortLabel: "답장", group: "ai" },
  { id: "aibroadcast", label: "AI 발송", shortLabel: "AI발송", group: "ai" },
  { id: "aioperations", label: "AI 리포트", shortLabel: "리포트", group: "ai" },
  { id: "aiopscenter", label: "AI 운영센터", shortLabel: "운영", group: "ai" },
  { id: "aiusage", label: "AI 사용량", shortLabel: "사용량", group: "ai" },

  // ── 설정/기타 ──
  { id: "team", label: "팀 관리", shortLabel: "팀", group: "settings" },
  { id: "profile", label: "프로필", group: "settings" },
  { id: "guestbot", label: "Guest 봇", shortLabel: "봇", group: "settings" },
  { id: "stars", label: "Stars 결제", shortLabel: "결제", group: "settings" },
  { id: "folders", label: "폴더", group: "settings" },
  { id: "apikeys", label: "API 키", shortLabel: "API", group: "settings" },
  { id: "audit", label: "활동 로그", shortLabel: "활동", group: "settings" },
  { id: "triggers", label: "자동화 규칙", shortLabel: "규칙", group: "settings" },
];

export type AccountStatus = "active" | "inactive" | "banned" | "suspended";

export type AuthFlowMode = "register" | "re-auth";

export type AccountHealthState =
  | "healthy"
  | "unauthorized"
  | "banned"
  | "restricted"
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

export interface FailureInfo {
  category: "unauthorized" | "banned" | "rate_limited" | "invalid_recipient" | "media_error" | "temporary_network" | "configuration" | "timeout" | "unknown";
  retryable: "retryable" | "not_retryable" | "conditional";
  recovery_action: "reauthenticate_account" | "account_is_banned" | "wait_and_retry" | "check_recipient" | "check_media" | "check_configuration" | "retry_broadcast" | "contact_support" | "none";
  summary: string;
}

export interface InlineButton {
  label: string;
  url: string;
}

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
  failureInfo: FailureInfo | null;
  deliveryMode?: "normal" | "cycle" | "bulk";
  /** Reply to a specific Telegram message ID. When set, sends as a reply instead of a new message. */
  replyToMessageId: number | null;
  /** Inline keyboard buttons attached to this broadcast message. */
  inlineButtons: InlineButton[] | null;
  /** Set when this broadcast is one account's slice of a group list split across
   * the tenant's active accounts (see backend app/services/broadcast_distribution.py).
   * Null = sent from a single account as usual. */
  distributionBatchId: string | null;
}

/** One account's slice of a distributed broadcast, from GET /api/broadcast/distribution/{batchId}. */
export interface DistributionSibling {
  broadcast: Broadcast;
  accountId: string;
  accountPhone: string;
  accountName: string | null;
}

/** Broadcasts not yet finished -- poll these until they reach a terminal status. */
export function isBroadcastInFlight(broadcast: Broadcast): boolean {
  return broadcast.status === "pending" || broadcast.status === "sending";
}

/** Broadcasts that have reached a terminal status (won't change further). */
export function isBroadcastTerminal(broadcast: Broadcast): boolean {
  return broadcast.status === "sent" || broadcast.status === "failed" || broadcast.status === "cancelled";
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
  /** Normalized failure intelligence for failed child broadcasts. */
  failureInfo: FailureInfo | null;
  /** Delivery mode inherited from parent. */
  deliveryMode?: "normal" | "cycle" | "bulk" | "reply";
  /** Inline keyboard buttons. */
  inlineButtons: InlineButton[] | null;
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

export const NORMAL_DELAY_OPTIONS = [
  { value: 5, label: "5초" },
  { value: 10, label: "10초" },
  { value: 30, label: "30초" },
  { value: 60, label: "1분" },
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
  replyToMessageId: number | null;
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

// ─── Group Folders (per-account, backend-persisted) ─────────────────

export interface GroupFolder {
  id: string;
  account_id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  group_ids: string[];
  order: number;
  parent_id: string | null;
  is_collapsed: boolean;
  is_smart: boolean;
  smart_type: string | null;
  created_at: string;
  updated_at: string;
  children?: GroupFolder[];
}

export interface FolderCreateInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  group_ids?: string[];
  parent_id?: string | null;
}

export interface FolderUpdateInput {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  group_ids?: string[];
  order?: number;
  parent_id?: string | null;
  is_collapsed?: boolean;
}

export interface BatchMoveInput {
  source_folder_id?: string;
  target_folder_id?: string;
  group_ids: string[];
}

export interface FolderSendInput {
  folder_ids: string[];
  message: string;
  exclude_group_ids?: string[];
}

export interface FolderReorderInput {
  folder_id: string;
  order: number;
  parent_id: string | null;
}

export type SmartFolderType = "recent_activity" | "unsent" | "vip" | "auto_classify";

export interface SmartFolderConfig {
  name: string;
  smart_type: SmartFolderType;
  color?: string;
  icon?: string;
  description?: string;
  params?: Record<string, unknown>;
}

// ─── Account Groups (localStorage only) ──────────────────────────────

export interface AccountGroup {
  id: string;
  name: string;
  description: string;
  accountIds: string[];
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiReplyRequest {
  accountId: string;
  message: string;
  [key: string]: unknown;
}

export interface AiReplyResponse {
  reply: string;
  [key: string]: unknown;
}

export interface AiStreamChunk {
  type: string;
  text?: string;
  error?: string;
  [key: string]: unknown;
}

export interface AiComparisonRequest {
  accountId: string;
  message: string;
  variants: string[];
  [key: string]: unknown;
}

export interface AiComparisonResponse {
  results: Array<{
    variant: string;
    score: number;
    reason?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface AiPromptTemplate {
  id: string;
  name: string;
  prompt: string;
  [key: string]: unknown;
}

export interface AiTemplateCreateInput {
  name: string;
  prompt: string;
  [key: string]: unknown;
}

export interface AiMemorySearchResult {
  id: string;
  content: string;
  score: number;
  [key: string]: unknown;
}

export interface AiSession {
  id: string;
  accountId: string;
  messages: Array<{
    role: string;
    content: string;
    timestamp: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface AiUsageSummary {
  totalRequests: number;
  totalTokens: number;
  period: string;
  [key: string]: unknown;
}

export interface AiPlanLimits {
  plan: string;
  monthlyTokens: number;
  usedTokens: number;
  remainingTokens: number;
  [key: string]: unknown;
}

export interface AiSearchFilters {
  [key: string]: unknown;
}

export interface LangGraphWorkflow {
  id: string;
  name: string;
  status: string;
  [key: string]: unknown;
}

export interface LangGraphExecution {
  id: string;
  workflowId: string;
  status: string;
  [key: string]: unknown;
}

export interface AIAgent {
  id: string;
  name: string;
  status: string;
  [key: string]: unknown;
}

export type AgentStatus = "idle" | "running" | "error" | "stopped";

export interface AgentTask {
  id: string;
  agentId: string;
  status: string;
  [key: string]: unknown;
}

export interface MCPTool {
  id: string;
  name: string;
  description?: string;
  [key: string]: unknown;
}

export interface MCPCategoryInfo {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface MCPExecution {
  id: string;
  toolId: string;
  status: string;
  [key: string]: unknown;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: string;
  [key: string]: unknown;
}

export interface TimelineEvent {
  id: string;
  type: string;
  timestamp: string;
  [key: string]: unknown;
}

export interface TimelineGroup {
  label: string;
  events: TimelineEvent[];
  [key: string]: unknown;
}

export interface ActivityEvent {
  id: string;
  type: string;
  timestamp: string;
  [key: string]: unknown;
}

export interface ActivitySession {
  id: string;
  events: ActivityEvent[];
  [key: string]: unknown;
}

export interface MemoryGraph {
  nodes: MemoryEntity[];
  relations: MemoryRelation[];
  [key: string]: unknown;
}

export interface MemoryEntity {
  id: string;
  type: string;
  content: string;
  [key: string]: unknown;
}

export interface MemorySearchResult {
  id: string;
  content: string;
  score: number;
  [key: string]: unknown;
}

export interface MemoryRelation {
  id: string;
  source: string;
  target: string;
  type: string;
  [key: string]: unknown;
}

export interface AIAnalyticsOverview {
  [key: string]: unknown;
}

export interface AIAnalyticsDaily {
  date: string;
  [key: string]: unknown;
}

export interface AIAnalyticsAgentBreakdown {
  agentId: string;
  [key: string]: unknown;
}

export interface AIAnalyticsToolUsage {
  toolId: string;
  [key: string]: unknown;
}

export interface AIAnalyticsErrorSummary {
  count: number;
  [key: string]: unknown;
}