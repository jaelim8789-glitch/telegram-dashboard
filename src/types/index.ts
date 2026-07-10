export type TabId = "dashboard" | "register" | "send" | "group" | "groupsearch" | "profile" | "log" | "autoreply" | "replymacro";

export interface TabDef {
  id: TabId;
  label: string;
}

export const TABS: TabDef[] = [
  { id: "dashboard", label: "대시보드" },
  { id: "register", label: "계정 등록" },
  { id: "send", label: "발송" },
  { id: "group", label: "그룹" },
  { id: "groupsearch", label: "그룹 검색" },
  { id: "autoreply", label: "자동 응답" },
  { id: "replymacro", label: "답장매크로" },
  { id: "profile", label: "프로필" },
  { id: "log", label: "로그" },
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

export type BroadcastStatus = "pending" | "sending" | "sent" | "failed";

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
}

/** Broadcasts not yet finished -- poll these until they reach a terminal status. */
export function isBroadcastInFlight(broadcast: Broadcast): boolean {
  return broadcast.status === "pending" || broadcast.status === "sending";
}

export const MAX_BROADCAST_RECIPIENTS = 10;

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
  targetChats: string;  // JSON string or comma-separated
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
