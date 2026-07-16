"use client";

import { useMemo } from "react";
import {
  CheckCircle2, XCircle, AlertTriangle, Activity,
  UserPlus, Ban, RefreshCw, Clock, ArrowRight,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import { formatRelativeTime } from "@/lib/formatTime";
import type { Account, AccountHealthItem, Broadcast } from "@/types";

// ── Activity Event ───────────────────────────────────────────────

interface ActivityEvent {
  id: string;
  timestamp: string;
  type: "broadcast_sent" | "broadcast_failed" | "broadcast_cancelled"
      | "account_registered" | "account_banned" | "account_health_issue"
      | "recurring_created" | "recurring_error" | "recurring_paused";
  label: string;
  detail: string;
  accountLabel?: string;
  actionTab?: "send" | "log" | "register" | "scheduler";
}

const EVENT_META: Record<ActivityEvent["type"], {
  icon: React.ElementType; color: string; bg: string; dot: string;
}> = {
  broadcast_sent: {
    icon: CheckCircle2, color: "text-app-success", bg: "bg-app-success-muted/20", dot: "bg-app-success",
  },
  broadcast_failed: {
    icon: XCircle, color: "text-app-danger", bg: "bg-app-danger-muted/20", dot: "bg-app-danger",
  },
  broadcast_cancelled: {
    icon: Ban, color: "text-app-warning", bg: "bg-app-warning-muted/20", dot: "bg-app-warning",
  },
  account_registered: {
    icon: UserPlus, color: "text-app-info", bg: "bg-app-info-muted/20", dot: "bg-app-info",
  },
  account_banned: {
    icon: Ban, color: "text-app-danger", bg: "bg-app-danger-muted/20", dot: "bg-app-danger",
  },
  account_health_issue: {
    icon: AlertTriangle, color: "text-app-warning", bg: "bg-app-warning-muted/20", dot: "bg-app-warning",
  },
  recurring_created: {
    icon: RefreshCw, color: "text-app-primary", bg: "bg-app-primary-muted/20", dot: "bg-app-primary",
  },
  recurring_error: {
    icon: AlertTriangle, color: "text-app-danger", bg: "bg-app-danger-muted/20", dot: "bg-app-danger",
  },
  recurring_paused: {
    icon: Clock, color: "text-app-warning", bg: "bg-app-warning-muted/20", dot: "bg-app-warning",
  },
};

function buildEvents(
  logs: Broadcast[],
  accounts: Account[],
  healthItems: AccountHealthItem[],
  recurring: Broadcast[],
): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  // Broadcast events
  for (const log of logs) {
    const acct = accounts.find((a) => a.id === log.accountId);
    const accLabel = acct?.name?.trim() || acct?.phone || log.accountId.slice(0, 8);
    const msg = log.message.length > 40 ? log.message.slice(0, 40) + "..." : log.message;

    if (log.status === "sent") {
      events.push({
        id: `sent:${log.id}`,
        timestamp: log.sentAt || log.createdAt,
        type: "broadcast_sent",
        label: `발송 완료`,
        detail: `${msg} → ${log.recipients.length}명`,
        accountLabel: accLabel,
        actionTab: "log",
      });
    } else if (log.status === "failed") {
      events.push({
        id: `failed:${log.id}`,
        timestamp: log.createdAt,
        type: "broadcast_failed",
        label: `발송 실패`,
        detail: log.errorMessage || msg,
        accountLabel: accLabel,
        actionTab: "log",
      });
    } else if (log.status === "cancelled") {
      events.push({
        id: `cancelled:${log.id}`,
        timestamp: log.createdAt,
        type: "broadcast_cancelled",
        label: `발송 취소`,
        detail: msg,
        accountLabel: accLabel,
      });
    }
  }

  // Recurring events
  for (const r of recurring) {
    const acct = accounts.find((a) => a.id === r.accountId);
    const accLabel = acct?.name?.trim() || acct?.phone || r.accountId.slice(0, 8);
    const msg = r.message.length > 40 ? r.message.slice(0, 40) + "..." : r.message;
    const isPaused = r.isRecurringPaused;

    events.push({
      id: `recurring:${r.id}`,
      timestamp: r.createdAt,
      type: isPaused ? "recurring_paused" : "recurring_created",
      label: `반복 발송 ${isPaused ? "일시 정지" : r.status === "failed" ? "오류" : "시작"}`,
      detail: `${msg} (${r.recurringIntervalMinutes}분 간격)`,
      accountLabel: accLabel,
      actionTab: "scheduler",
    });
  }

  // Health events (only unhealthy accounts)
  for (const h of healthItems) {
    const acct = accounts.find((a) => a.id === h.accountId);
    const accLabel = acct?.name?.trim() || acct?.phone || h.accountId.slice(0, 8);

    if (h.status === "banned" && h.lastActivity) {
      events.push({
        id: `banned:${h.accountId}`,
        timestamp: h.lastActivity,
        type: "account_banned",
        label: `계정 차단`,
        detail: accLabel,
        accountLabel: accLabel,
        actionTab: "register",
      });
    } else if (h.status === "unauthorized" && h.lastActivity) {
      events.push({
        id: `unauth:${h.accountId}`,
        timestamp: h.lastActivity,
        type: "account_health_issue",
        label: `인증 만료`,
        detail: accLabel,
        accountLabel: accLabel,
        actionTab: "register",
      });
    } else if (h.status === "error" && h.lastActivity) {
      events.push({
        id: `health:${h.accountId}`,
        timestamp: h.lastActivity,
        type: "account_health_issue",
        label: `계정 오류`,
        detail: h.lastError || accLabel,
        accountLabel: accLabel,
        actionTab: "register",
      });
    }
  }

  // Sort by timestamp descending (newest first)
  events.sort((a, b) => {
    const ta = new Date(`${a.timestamp}Z`).getTime();
    const tb = new Date(`${b.timestamp}Z`).getTime();
    return tb - ta || a.id.localeCompare(b.id);
  });

  return events.slice(0, 20);
}

// ── Component ────────────────────────────────────────────────────

interface ActivityTimelineProps {
  logs: Broadcast[];
  accounts: Account[];
  healthItems: AccountHealthItem[];
  recurring: Broadcast[];
  loading?: boolean;
  onNavigate?: (tabId: "send" | "log" | "register" | "scheduler") => void;
}

export function ActivityTimeline({
  logs, accounts, healthItems, recurring, loading, onNavigate,
}: ActivityTimelineProps) {
  const events = useMemo(
    () => buildEvents(logs, accounts, healthItems, recurring),
    [logs, accounts, healthItems, recurring],
  );

  if (loading && events.length === 0) {
    return (
      <Panel
        title={<div className="flex items-center gap-2"><Activity className="h-4 w-4 text-app-primary" /> 운영 Timeline</div>}
        className="w-full"
      >
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="flex flex-col items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-app-card-hover" />
                <div className="flex-1 w-0.5 rounded-full bg-app-card-hover" />
              </div>
              <div className="flex-1 space-y-1 py-0.5">
                <div className="h-3 w-24 rounded bg-app-card-hover" />
                <div className="h-2 w-full rounded bg-app-card-hover" />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    );
  }

  if (events.length === 0) {
    return (
      <Panel
        title={<div className="flex items-center gap-2"><Activity className="h-4 w-4 text-app-primary" /> 운영 Timeline</div>}
        className="w-full"
      >
        <EmptyState
          icon={Activity}
          title="아직 활동 기록이 없습니다"
          description="계정을 연결하고 메시지를 발송하면 여기에 Timeline 형태로 표시됩니다."
        />
      </Panel>
    );
  }

  return (
    <Panel
      title={<div className="flex items-center gap-2"><Activity className="h-4 w-4 text-app-primary" /> 운영 Timeline</div>}
      description={`${events.length}개 이벤트 · 실시간`}
      className="w-full"
    >
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[11px] top-3 bottom-3 w-0.5 rounded-full bg-app-border" />

        <div className="space-y-0">
          {events.map((event, idx) => {
            const meta = EVENT_META[event.type];
            const Icon = meta.icon;
            const isLast = idx === events.length - 1;
            return (
              <div key={event.id} className="group relative flex gap-3 pb-3 last:pb-0">
                {/* Timeline dot */}
                <div className="relative z-10 flex shrink-0 flex-col items-center">
                  <div className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-app-bg transition-transform group-hover:scale-110",
                    meta.bg,
                  )}>
                    <Icon className={cn("h-3 w-3", meta.color)} />
                  </div>
                  {!isLast && <div className="mt-1 flex-1 w-0.5 rounded-full bg-app-border/50" style={{ minHeight: 8 }} />}
                </div>

                {/* Event content */}
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className={cn("font-medium", meta.color)}>{event.label}</span>
                    {event.accountLabel && (
                      <>
                        <span className="text-app-text-subtle">·</span>
                        <span className="text-app-text-muted truncate">{event.accountLabel}</span>
                      </>
                    )}
                    <span className="ml-auto text-[10px] text-app-text-subtle shrink-0">
                      {formatRelativeTime(event.timestamp)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-app-text-muted leading-relaxed line-clamp-2">
                    {event.detail}
                  </p>

                  {/* Quick action */}
                  {onNavigate && (() => {
                    const tab = event.actionTab;
                    if (!tab) return null;
                    return (
                      <button
                        onClick={() => onNavigate(tab)}
                        className="mt-1 inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-medium text-app-text-subtle opacity-0 group-hover:opacity-100 hover:text-app-primary hover:bg-app-card-hover transition-all"
                      >
                      {event.actionTab === "log" ? "로그 보기"
                        : event.actionTab === "register" ? "계정 관리"
                        : event.actionTab === "scheduler" ? "스케줄러"
                        : "발송"} <ArrowRight className="h-2.5 w-2.5" />
                      </button>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}
