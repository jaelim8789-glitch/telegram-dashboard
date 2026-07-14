"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Activity, AlertTriangle, BarChart3, CheckCircle2, Clock, MessageSquare,
  RefreshCw, SendHorizonal, Users, XCircle, Zap,
  ArrowRight, Ban, Copy, Plus, UserPlus, ShieldAlert, ShieldOff, PauseCircle,
  Bug,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { cn } from "@/lib/cn";
import { useDashboardStore } from "@/store/useDashboardStore";
import * as api from "@/lib/api";
import type { AccountHealthItem, Broadcast, BroadcastStatus, DeliveryOverview, TabId } from "@/types";
import { isRecurringActive, isRecurringBroadcast, getRecurringState } from "@/types";
import { useCountdown, intervalLabel } from "@/lib/useRecurringCountdown";

const STATUS_TONE: Record<BroadcastStatus, { tone: "neutral" | "success" | "warning" | "danger" | "info"; label: string }> = {
  pending: { tone: "neutral", label: "대기 중" },
  sending: { tone: "info", label: "발송 중" },
  sent: { tone: "success", label: "완료" },
  failed: { tone: "danger", label: "실패" },
  cancelled: { tone: "warning", label: "취소됨" },
};

import { formatRelativeTime, formatCompact } from "@/lib/formatTime";

function failureInfoSummary(info: Broadcast["failureInfo"] | null | undefined): { summary: string; action: string | null; retryable: string | null } {
  if (!info || !info.category) return { summary: "", action: null, retryable: null };
  const summary = String(info.summary ?? info.category ?? "");
  const recovery = String(info.recovery_action ?? "");
  let action: string | null = null;
  if (recovery === "reauthenticate_account" || recovery === "account_is_banned" || recovery === "check_configuration") action = "register";
  if (recovery === "wait_and_retry" || recovery === "check_recipient" || recovery === "check_media" || recovery === "retry_broadcast" || recovery === "contact_support") action = "log";
  return { summary, action, retryable: info.retryable ?? null };
}

function successTone(rate: number): "success" | "warning" | "danger" {
  if (rate >= 90) return "success";
  if (rate >= 70) return "warning";
  return "danger";
}

function RecurringCard({ b, accounts }: { b: Broadcast; accounts: { id: string; name: string | null; phone: string }[] }) {
  const countdown = useCountdown(b.nextScheduledAt);
  const account = accounts.find((a) => a.id === b.accountId);
  const accLabel = account
    ? account.name?.trim() || account.phone
    : b.accountId.slice(0, 8);
  const state = getRecurringState(b);
  return (
    <div className={cn(
      "flex items-center justify-between rounded-xl border px-3 py-2.5 transition-all hover:shadow-sm",
      state === "error" ? "border-app-danger/20 bg-app-danger-muted/10" :
      state === "paused" ? "border-app-warning/20 bg-app-warning-muted/10" :
      "border-app-border bg-gradient-to-r from-app-bg to-app-card hover:border-app-border-strong",
    )}>
      <div className="min-w-0 flex-1 pr-2">
        <p className="truncate text-xs font-medium text-app-text">{b.message}</p>
        <p className="mt-0.5 flex flex-wrap gap-x-1.5 text-[11px] text-app-text-subtle">
          <span className="inline-flex items-center gap-1">
            <RefreshCw className="h-3 w-3 text-app-info" />
            {intervalLabel(b.recurringIntervalMinutes)}
          </span>
          <span>·</span>
          <span>{accLabel}</span>
          <span>·</span>
          <span>{b.recipients.length}명</span>
          {countdown && (
            <span className="font-mono text-app-info flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {countdown}
            </span>
          )}
        </p>
      </div>
      <Badge tone={state === "error" ? "danger" : state === "paused" ? "warning" : state === "cancelled" ? "neutral" : "info"} className="shrink-0">
        {state === "active" ? "반복 중" : state === "paused" ? "일시 정지" : state === "cancelled" ? "취소됨" : "오류"}
      </Badge>
    </div>
  );
}

function AttentionItem({
  icon, label, detail, actionLabel, action, tone,
}: {
  icon: React.ReactNode; label: string; detail: string; actionLabel: string; action: () => void; tone: "danger" | "warning" | "muted";
}) {
  return (
    <div className={cn(
      "flex items-start justify-between gap-2 px-4 py-2.5",
      tone === "danger" ? "bg-app-danger-muted/5" : tone === "warning" ? "bg-app-warning-muted/5" : "",
    )}>
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        <div className={cn(
          "flex h-7 w-7 shrink-0 mt-0.5 items-center justify-center rounded-lg",
          tone === "danger" ? "bg-app-danger-muted" : tone === "warning" ? "bg-app-warning-muted" : "bg-app-card-hover",
        )}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn(
            "text-xs font-medium truncate",
            tone === "danger" ? "text-app-danger" : tone === "warning" ? "text-app-warning" : "text-app-text",
          )}>{label}</p>
          <p className="text-[11px] text-app-text-muted truncate">{detail}</p>
        </div>
      </div>
      <button onClick={action}
        className={cn(
          "shrink-0 flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors",
          tone === "danger" ? "text-app-danger hover:bg-app-danger-muted/30" :
          tone === "warning" ? "text-app-warning hover:bg-app-warning-muted/30" :
          "text-app-text-muted hover:bg-app-card-hover",
        )}>
        {actionLabel} <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────

export function DashboardTab() {
  const accounts = useDashboardStore((s) => s.accounts);
  const accountsLoading = useDashboardStore((s) => s.accountsLoading);
  const accountsError = useDashboardStore((s) => s.accountsError);
  const fetchAccounts = useDashboardStore((s) => s.fetchAccounts);

  const [logs, setLogs] = useState<Broadcast[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState(false);
  const [upcoming, setUpcoming] = useState<Broadcast[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState(false);
  const [upcomingError, setUpcomingError] = useState(false);

  const [recurring, setRecurring] = useState<Broadcast[]>([]);
  const [recurringLoading, setRecurringLoading] = useState(false);
  const [recurringError, setRecurringError] = useState(false);
  const recurringPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [overview, setOverview] = useState<DeliveryOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState(false);

  const [healthItems, setHealthItems] = useState<AccountHealthItem[]>([]);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const loadLogs = async () => {
    setLogsLoading(true); setLogsError(false);
    try { setLogs(await api.fetchLogs()); } catch { setLogs([]); setLogsError(true); }
    finally { setLogsLoading(false); }
  };

  const loadUpcoming = async () => {
    setUpcomingLoading(true); setUpcomingError(false);
    try { setUpcoming(await api.fetchUpcomingBroadcasts()); } catch { setUpcoming([]); setUpcomingError(true); }
    finally { setUpcomingLoading(false); }
  };

  const loadRecurring = async () => {
    setRecurringLoading(true); setRecurringError(false);
    try { setRecurring(await api.fetchRecurringBroadcasts()); } catch { setRecurring([]); setRecurringError(true); }
    finally { setRecurringLoading(false); }
  };

  const loadOverview = async () => {
    setOverviewLoading(true); setOverviewError(false);
    try { setOverview(await api.fetchDeliveryOverview(undefined, 30)); } catch { setOverview(null); setOverviewError(true); }
    finally { setOverviewLoading(false); }
  };

  const loadHealth = async () => {
    setHealthLoading(true); setHealthError(false);
    try { setHealthItems(await api.fetchAccountHealth()); }
    catch { setHealthItems([]); setHealthError(true); }
    finally { setHealthLoading(false); }
  };

  const loadAll = async () => {
    setRefreshing(true);
    await Promise.all([fetchAccounts(), loadLogs(), loadUpcoming(), loadRecurring(), loadOverview(), loadHealth()]);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchAccounts();
    loadLogs();
    loadUpcoming();
    loadRecurring();
    loadOverview();
    loadHealth();
  }, [fetchAccounts]);

  useEffect(() => {
    if (recurringPollRef.current) clearTimeout(recurringPollRef.current);
    if (recurring.length === 0) return;
    recurringPollRef.current = setTimeout(loadRecurring, 30000);
    return () => { if (recurringPollRef.current) clearTimeout(recurringPollRef.current); };
  }, [recurring]);

  const activeAccounts = useMemo(() => accounts.filter((a) => a.status === "active"), [accounts]);
  const inactiveAccounts = useMemo(() => accounts.filter((a) => a.status === "inactive"), [accounts]);
  const bannedAccounts = useMemo(() => accounts.filter((a) => a.status === "banned"), [accounts]);
  const totalSentToday = useMemo(() => accounts.reduce((sum, a) => sum + a.todaySent, 0), [accounts]);

  const sentCount = useMemo(() => logs.filter((l) => l.status === "sent").length, [logs]);
  const failedCount = useMemo(() => logs.filter((l) => l.status === "failed").length, [logs]);
  const sendingCount = useMemo(() => logs.filter((l) => l.status === "sending").length, [logs]);

  const recentLogs = useMemo(
    () => [...logs].sort((a, b) => new Date(`${b.createdAt}Z`).getTime() - new Date(`${a.createdAt}Z`).getTime()).slice(0, 8),
    [logs]
  );

  const failureTypes = useMemo(() => {
    return (overview?.failure_breakdown ?? []).slice(0, 5);
  }, [overview]);

  const erroredRecurring = useMemo(() => {
    return recurring.filter(b => getRecurringState(b) === "error");
  }, [recurring]);

  const pausedRecurring = useMemo(() => {
    return recurring.filter(b => getRecurringState(b) === "paused");
  }, [recurring]);

  const healthCritical = useMemo(() => {
    return healthItems.filter(h => h.status === "unauthorized" || h.status === "banned" || h.status === "not_configured");
  }, [healthItems]);

  const healthWarning = useMemo(() => {
    return healthItems.filter(h => h.status === "rate_limited" || h.status === "error");
  }, [healthItems]);

  const healthyCount = useMemo(() => {
    return healthItems.filter(h => h.status === "healthy").length;
  }, [healthItems]);

  const recentFailures = useMemo(() => {
    return [...logs].filter(l => l.status === "failed").sort((a, b) => new Date(`${b.createdAt}Z`).getTime() - new Date(`${a.createdAt}Z`).getTime()).slice(0, 4);
  }, [logs]);

  const retryableFailures = useMemo(() => {
    return recentFailures.filter(f => f.failureInfo?.retryable === "retryable" || f.failureInfo?.retryable === "conditional");
  }, [recentFailures]);

  const nonRetryableFailures = useMemo(() => {
    return recentFailures.filter(f => f.failureInfo?.retryable === "not_retryable");
  }, [recentFailures]);

  const summary = overview?.summary;

  const totalAttention = healthCritical.length + healthWarning.length + erroredRecurring.length + pausedRecurring.length + nonRetryableFailures.length;

  const hasAnyAttention = totalAttention > 0 || failedCount > 0 || bannedAccounts.length > 0;

  const setTab = useDashboardStore.getState().setActiveTab;

  // Skeleton loading state
  if (accountsLoading && accounts.length === 0) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="대시보드 로딩 중">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  // Error state only when accounts API fails with no cached data
  if (accountsError && accounts.length === 0) {
    return (
      <Panel title="시스템 상태">
        <div className="flex flex-col items-center justify-center py-12 text-center" role="alert">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-app-danger-muted">
            <XCircle className="h-8 w-8 text-app-danger" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-app-danger">서버에 연결할 수 없습니다</p>
          <p className="mt-1 text-xs text-app-text-muted max-w-xs">{accountsError}</p>
          <button onClick={loadAll}
            className="mt-4 flex items-center gap-1.5 rounded-xl bg-app-primary px-4 py-2 text-xs font-medium text-white hover:bg-app-primary-hover transition-colors focus-ring">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> 다시 시도
          </button>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* ── Header Section ───────────────────────────────────── */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-app-text">운영 대시보드</h1>
            {hasAnyAttention && (
              <span className="inline-flex items-center justify-center rounded-full bg-app-danger-muted px-2 py-0.5 text-[10px] font-bold text-app-danger tabular-nums">
                {totalAttention}
              </span>
            )}
          </div>
          <p className="text-xs text-app-text-muted">실시간 운영 현황</p>
        </div>
        <div className="flex items-center gap-2">
          {accounts.length === 0 && (
            <button onClick={() => setTab("register")}
              className="flex items-center gap-1.5 rounded-xl bg-app-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-app-primary-hover transition-colors focus-ring">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> 계정 추가
            </button>
          )}
          <button onClick={loadAll} aria-label="새로고침"
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors focus-ring">
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* ── Operational Summary Hierarchy ───────── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-app-border bg-app-card p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-text-muted">
            <CheckCircle2 className="h-3.5 w-3.5 text-app-success" aria-hidden="true" />
            정상 계정
          </div>
          <div className="mt-1 text-lg font-bold tabular-nums text-app-success">
            {healthyCount}
            <span className="text-xs font-normal text-app-text-muted">/{accounts.length}</span>
          </div>
          {inactiveAccounts.length > 0 && (
            <div className="text-[10px] text-app-text-subtle">{inactiveAccounts.length}개 비활성</div>
          )}
        </div>
        <div className="rounded-xl border border-app-border bg-app-card p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-text-muted">
            <AlertTriangle className={cn("h-3.5 w-3.5", totalAttention > 0 ? "text-app-danger" : "text-app-text-subtle")} aria-hidden="true" />
            주의 필요
          </div>
          <div className={cn("mt-1 text-lg font-bold tabular-nums", totalAttention > 0 ? "text-app-danger" : "text-app-text")}>
            {totalAttention}
          </div>
          {healthCritical.length > 0 && <div className="text-[10px] text-app-danger">{healthCritical.length}개 인증/차단</div>}
        </div>
        <div className="rounded-xl border border-app-border bg-app-card p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-text-muted">
            <SendHorizonal className="h-3.5 w-3.5 text-app-text-muted" aria-hidden="true" />
            발송
          </div>
          <div className="mt-1 text-lg font-bold tabular-nums text-app-text">{formatCompact(sentCount)}</div>
          <div className="text-[10px] text-app-text-subtle">{failedCount > 0 ? `${formatCompact(failedCount)}건 실패` : "실패 없음"}</div>
        </div>
        <div className="rounded-xl border border-app-border bg-app-card p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-text-muted">
            <RefreshCw className="h-3.5 w-3.5 text-app-info" aria-hidden="true" />
            반복
          </div>
          <div className="mt-1 text-lg font-bold tabular-nums text-app-text">{recurring.length}</div>
          <div className="text-[10px] text-app-text-subtle">
            {erroredRecurring.length > 0 ? `${erroredRecurring.length}개 오류` :
             pausedRecurring.length > 0 ? `${pausedRecurring.length}개 일시 정지` :
             "정상"}
          </div>
        </div>
      </div>

      {/* ── Operational Attention Queue ─────────── */}
      {hasAnyAttention && (
        <div className="rounded-2xl border border-app-border overflow-hidden">
          <div className="flex items-center gap-2 border-b border-app-border bg-app-card px-4 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-app-danger" aria-hidden="true" />
            <span className="text-xs font-semibold text-app-text">운영 주의 사항</span>
            <span className="ml-auto text-[11px] text-app-text-muted">{totalAttention}건</span>
          </div>
          <div className="divide-y divide-app-border">
            {healthCritical.filter(h => h.status === "unauthorized").map(h => {
              const acct = accounts.find(a => a.id === h.accountId);
              return (
                <AttentionItem key={"unauth-" + h.accountId}
                  icon={<ShieldAlert className="h-3.5 w-3.5 text-app-warning" />}
                  label={acct?.name?.trim() || h.phone}
                  detail="인증 필요 — 세션이 만료되었거나 인증되지 않았습니다"
                  actionLabel="재인증"
                  tone="warning"
                  action={() => setTab("register")}
                />
              );
            })}
            {healthCritical.filter(h => h.status === "banned").map(h => {
              const acct = accounts.find(a => a.id === h.accountId);
              return (
                <AttentionItem key={"banned-" + h.accountId}
                  icon={<Ban className="h-3.5 w-3.5 text-app-danger" />}
                  label={acct?.name?.trim() || h.phone}
                  detail="Telegram 계정이 차단되었습니다"
                  actionLabel="계정 관리"
                  tone="danger"
                  action={() => setTab("register")}
                />
              );
            })}
            {healthCritical.filter(h => h.status === "not_configured").map(h => {
              const acct = accounts.find(a => a.id === h.accountId);
              return (
                <AttentionItem key={"noconfig-" + h.accountId}
                  icon={<ShieldOff className="h-3.5 w-3.5 text-app-text-muted" />}
                  label={acct?.name?.trim() || h.phone}
                  detail="세션이 구성되지 않았습니다"
                  actionLabel="설정하기"
                  tone="muted"
                  action={() => setTab("register")}
                />
              );
            })}
            {healthWarning.filter(h => h.status === "rate_limited").map(h => {
              const acct = accounts.find(a => a.id === h.accountId);
              return (
                <AttentionItem key={"ratelimit-" + h.accountId}
                  icon={<Clock className="h-3.5 w-3.5 text-app-warning" />}
                  label={acct?.name?.trim() || h.phone}
                  detail="속도 제한 — 너무 많은 요청으로 일시 제한됨"
                  actionLabel="로그 보기"
                  tone="warning"
                  action={() => setTab("log")}
                />
              );
            })}
            {healthWarning.filter(h => h.status === "error").map(h => {
              const acct = accounts.find(a => a.id === h.accountId);
              return (
                <AttentionItem key={"error-" + h.accountId}
                  icon={<AlertTriangle className="h-3.5 w-3.5 text-app-danger" />}
                  label={acct?.name?.trim() || h.phone}
                  detail={h.lastError ?? "알 수 없는 오류"}
                  actionLabel="계정 관리"
                  tone="danger"
                  action={() => setTab("register")}
                />
              );
            })}
            {healthError && bannedAccounts.length > 0 && (
              <AttentionItem key="banned-fallback"
                icon={<Ban className="h-3.5 w-3.5 text-app-danger" />}
                label={`차단된 계정 ${bannedAccounts.length}개`}
                detail={bannedAccounts.map(a => a.name?.trim() || a.phone).join(", ")}
                actionLabel="계정 관리"
                tone="danger"
                action={() => setTab("register")}
              />
            )}
            {erroredRecurring.length > 0 && (
              <AttentionItem key="recurring-error"
                icon={<AlertTriangle className="h-3.5 w-3.5 text-app-danger" />}
                label={`반복 스케줄 오류 ${erroredRecurring.length}개`}
                detail={erroredRecurring.map(b => b.message).join(", ")}
                actionLabel="스케줄러"
                tone="danger"
                action={() => setTab("scheduler")}
              />
            )}
            {pausedRecurring.length > 0 && (
              <AttentionItem key="recurring-paused"
                icon={<PauseCircle className="h-3.5 w-3.5 text-app-warning" />}
                label={`일시 정지된 반복 ${pausedRecurring.length}개`}
                detail={pausedRecurring.map(b => b.message).join(", ")}
                actionLabel="스케줄러"
                tone="warning"
                action={() => setTab("scheduler")}
              />
            )}
            {nonRetryableFailures.length > 0 && (
              <AttentionItem key="nonretryable-failures"
                icon={<Bug className="h-3.5 w-3.5 text-app-danger" />}
                label={`재시도 불가 실패 ${nonRetryableFailures.length}건`}
                detail={nonRetryableFailures.map(f => f.message).join(", ")}
                actionLabel="로그 보기"
                tone="danger"
                action={() => setTab("log")}
              />
            )}
          </div>
        </div>
      )}

      {/* All-clear state */}
      {!hasAnyAttention && accounts.length > 0 && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-app-success/20 bg-app-success-muted/20 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 text-app-success shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-app-success">모든 시스템 정상</p>
            <p className="text-[11px] text-app-text-muted">{activeAccounts.length}개 계정 활성 · {recurring.length}개 반복 스케줄</p>
          </div>
        </div>
      )}

      {/* ── Recent Failures with retryable classification ── */}
      {recentFailures.length > 0 && (
        <div className="rounded-2xl border border-app-border overflow-hidden">
          <div className="flex items-center gap-2 border-b border-app-border bg-app-card px-4 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-app-danger" aria-hidden="true" />
            <span className="text-xs font-medium text-app-text">최근 발송 실패</span>
            <span className="ml-auto text-[11px] text-app-text-muted">{recentFailures.length}건</span>
          </div>
          <div className="divide-y divide-app-border">
            {recentFailures.map(f => {
              const acct = accounts.find(a => a.id === f.accountId);
              const acctLabel = acct ? (acct.name?.trim() || acct.phone) : f.accountId.slice(0, 8);
              const fi = f.failureInfo;
              const { summary: failureSummary, action: recoveryTarget, retryable } = failureInfoSummary(fi);
              const displayError = failureSummary || f.errorMessage || "알 수 없는 오류";
              const recoveryTab: TabId = (recoveryTarget === "register" ? "register" : "log") as TabId;
              return (
                <div key={f.id} className="flex items-center justify-between px-4 py-2">
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-xs text-app-text">{f.message}</p>
                      {retryable === "retryable" && <Badge tone="warning" className="shrink-0 text-[9px] px-1 py-0">재시도 가능</Badge>}
                      {retryable === "not_retryable" && <Badge tone="danger" className="shrink-0 text-[9px] px-1 py-0">재시도 불가</Badge>}
                      {retryable === "conditional" && <Badge tone="info" className="shrink-0 text-[9px] px-1 py-0">조건부</Badge>}
                    </div>
                    <p className="flex flex-wrap gap-x-1.5 text-[11px] text-app-text-muted">
                      <span>{acctLabel}</span>
                      <span>·</span>
                      <span>{formatRelativeTime(f.createdAt)}</span>
                      <span>·</span>
                      <span className="text-app-danger truncate max-w-[120px] sm:max-w-[200px]">{displayError}</span>
                    </p>
                  </div>
                  <button onClick={() => setTab(recoveryTab)}
                    className="shrink-0 flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-app-text-muted hover:bg-app-card-hover transition-colors focus-ring">
                    {recoveryTab === "register" ? "계정 관리" : "로그 보기"} <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
          <button onClick={() => setTab("log")}
            className="flex w-full items-center justify-center gap-1 border-t border-app-border py-2 text-[11px] font-medium text-app-text-muted hover:bg-app-card-hover transition-colors focus-ring">
            전체 로그 보기 <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* ── Quick Actions ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setTab("send")}
          className="flex items-center gap-1.5 rounded-xl bg-app-primary px-3.5 py-2 text-xs font-medium text-white shadow-sm shadow-app-primary/20 hover:bg-app-primary-hover transition-colors focus-ring" aria-label="새 발송">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> 새 발송
        </button>
        <button onClick={() => setTab("groupsearch")}
          className="flex items-center gap-1.5 rounded-xl border border-app-border bg-app-card px-3.5 py-2 text-xs font-medium text-app-text hover:border-app-border-strong hover:shadow-sm transition-colors focus-ring">
          <Users className="h-3.5 w-3.5" aria-hidden="true" /> 그룹 찾기
        </button>
        <button onClick={() => setTab("scheduler")}
          className="flex items-center gap-1.5 rounded-xl border border-app-border bg-app-card px-3.5 py-2 text-xs font-medium text-app-text hover:border-app-border-strong hover:shadow-sm transition-colors focus-ring">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" /> 반복 스케줄러
        </button>
        <button onClick={() => setTab("deliveryanalytics")}
          className="flex items-center gap-1.5 rounded-xl border border-app-border bg-app-card px-3.5 py-2 text-xs font-medium text-app-text hover:border-app-border-strong hover:shadow-sm transition-colors focus-ring">
          <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" /> 전달 분석
        </button>
        <button onClick={() => setTab("log")}
          className="flex items-center gap-1.5 rounded-xl border border-app-border bg-app-card px-3.5 py-2 text-xs font-medium text-app-text hover:border-app-border-strong hover:shadow-sm transition-colors focus-ring">
          <Activity className="h-3.5 w-3.5" aria-hidden="true" /> 발송 로그
        </button>
        <button onClick={() => setTab("register")}
          className="flex items-center gap-1.5 rounded-xl border border-app-primary/30 bg-app-primary-muted/20 px-3.5 py-2 text-xs font-medium text-app-primary hover:bg-app-primary-muted/30 transition-colors focus-ring">
          <UserPlus className="h-3.5 w-3.5" aria-hidden="true" /> 계정 관리
        </button>
      </div>

      {/* ── Middle Section: 3 columns ────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel
          title={<div className="flex items-center gap-2"><Clock className="h-4 w-4 text-app-info" aria-hidden="true" /> 예약된 발송</div>}
          className="lg:col-span-1"
        >
          {upcomingLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Clock className="mb-2 h-6 w-6 text-app-text-subtle" aria-hidden="true" />
              <p className="text-xs text-app-text-muted">예약된 발송이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {upcoming.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-xl border border-app-border bg-app-bg px-3 py-2 transition-colors hover:border-app-border-strong">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="truncate text-xs font-medium text-app-text">{b.message}</p>
                    <p className="text-[11px] text-app-text-subtle">
                      {new Date(`${b.scheduledAt}Z`).toLocaleString("ko-KR", { hour12: false })}
                      {" · "}{b.recipients.length}개 대상
                    </p>
                  </div>
                  <Badge tone="info">예약</Badge>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title={<div className="flex items-center gap-2"><RefreshCw className="h-4 w-4 text-app-primary" aria-hidden="true" /> 반복 발송</div>}
          className="lg:col-span-1"
        >
          {recurringLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          ) : recurring.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <RefreshCw className="mb-2 h-6 w-6 text-app-text-subtle" aria-hidden="true" />
              <p className="text-xs text-app-text-muted">반복 발송 일정이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {recurring.slice(0, 5).map((b) => (
                <RecurringCard key={b.id} b={b} accounts={accounts} />
              ))}
              {recurring.length > 5 && (
                <button onClick={() => setTab("scheduler")}
                  className="w-full rounded-xl border border-app-border py-1.5 text-[11px] font-medium text-app-text-muted hover:bg-app-card-hover transition-colors focus-ring">
                  전체 {recurring.length}개 보기
                </button>
              )}
            </div>
          )}
        </Panel>

        <Panel
          title={<div className="flex items-center gap-2"><Activity className="h-4 w-4 text-app-success" aria-hidden="true" /> 전달 건강</div>}
          className="lg:col-span-1"
        >
          {overviewLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full rounded-xl" />
              <Skeleton className="h-8 w-full rounded-xl" />
              <Skeleton className="h-8 w-full rounded-xl" />
            </div>
          ) : !summary ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Activity className="mb-2 h-6 w-6 text-app-text-subtle" aria-hidden="true" />
              <p className="text-xs text-app-text-muted">전달 데이터가 아직 없습니다</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="relative h-16 w-16 shrink-0">
                  <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90" role="img" aria-label={`성공률 ${summary.success_rate.toFixed(0)}%`}>
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3" className="text-app-border" />
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3"
                      strokeDasharray={`${summary.success_rate * 0.97} 100`}
                      className={cn("transition-all duration-1000",
                        summary.success_rate >= 90 ? "text-app-success" : summary.success_rate >= 70 ? "text-app-warning" : "text-app-danger")}
                      strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={cn("text-sm font-bold",
                      summary.success_rate >= 90 ? "text-app-success" : summary.success_rate >= 70 ? "text-app-warning" : "text-app-danger")}>
                      {summary.success_rate.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-app-text-muted">총 시도</span>
                    <span className="font-medium tabular-nums text-app-text">{summary.total_attempted}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-app-success">성공</span>
                    <span className="font-medium tabular-nums text-app-success">{summary.successful}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-app-danger">실패</span>
                    <span className="font-medium tabular-nums text-app-danger">{summary.failed}</span>
                  </div>
                </div>
              </div>

              {(overview?.by_source?.length ?? 0) > 0 && (
                <div className="border-t border-app-border pt-2.5">
                  <p className="mb-1.5 text-[11px] font-medium text-app-text-muted">소스별</p>
                  <div className="space-y-1">
                    {(overview?.by_source ?? []).map((s) => (
                      <div key={s.source} className="flex items-center justify-between text-xs">
                        <span className="text-app-text capitalize">{s.source === "broadcast" ? "발송" : s.source}</span>
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums text-app-text-muted">{s.total}건</span>
                          <span className={cn("tabular-nums font-medium",
                            s.success_rate >= 90 ? "text-app-success" : s.success_rate >= 70 ? "text-app-warning" : "text-app-danger")}>{s.success_rate.toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={() => setTab("deliveryanalytics")}
                className="w-full rounded-xl border border-app-border py-1.5 text-[11px] font-medium text-app-text-muted hover:bg-app-card-hover transition-colors focus-ring">
                전체 분석 보기 <ArrowRight className="inline h-3 w-3" />
              </button>
            </div>
          )}
        </Panel>
      </div>

      {/* ── Recent Activity ──────────────────── */}
      <Panel
        title={<div className="flex items-center gap-2"><Activity className="h-4 w-4 text-app-primary" aria-hidden="true" /> 최근 활동</div>}
        className="w-full"
      >
        {logsLoading && recentLogs.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="mb-2 h-6 w-6 text-app-text-subtle" aria-hidden="true" />
            <p className="text-sm font-medium text-app-text">연결된 계정이 없습니다</p>
            <p className="mt-1 text-xs text-app-text-muted">계정 등록 탭에서 새 계정을 추가하세요</p>
          </div>
        ) : recentLogs.length === 0 && !logsLoading ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="mb-2 h-6 w-6 text-app-text-subtle" aria-hidden="true" />
            <p className="text-sm font-medium text-app-text">아직 활동 기록이 없습니다</p>
            <p className="mt-1 text-xs text-app-text-muted">계정을 연결하고 메시지를 발송하면 여기에 표시됩니다</p>
          </div>
        ) : (
          <div className="divide-y divide-app-border">
            {recentLogs.map((b) => {
              const meta = STATUS_TONE[b.status];
              const fi = b.failureInfo;
              const { retryable } = failureInfoSummary(fi);
              const isRecur = isRecurringActive(b);
              const isFailed = b.status === "failed";
              return (
                <div key={b.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-app-text">{b.message}</p>
                      {retryable === "retryable" && <Badge tone="warning" className="shrink-0 text-[9px] px-1 py-0">재시도 가능</Badge>}
                      {retryable === "not_retryable" && <Badge tone="danger" className="shrink-0 text-[9px] px-1 py-0">재시도 불가</Badge>}
                      {isRecur && <Badge tone="info" className="shrink-0 text-[9px] px-1 py-0">반복</Badge>}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-1 text-xs text-app-text-muted">
                      <span>{formatRelativeTime(b.createdAt)}</span>
                      {b.errorMessage && <><span>·</span><span className="text-app-danger truncate max-w-[120px]">{b.errorMessage}</span></>}
                    </div>
                  </div>
                  <button onClick={() => setTab(isFailed ? "log" : isRecur ? "scheduler" : "send")}
                    className="shrink-0 flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-app-text-muted hover:bg-app-card-hover transition-colors focus-ring"
                    aria-label={isFailed ? "로그 보기" : isRecur ? "스케줄러 보기" : "발송 보기"}>
                    {isFailed ? "로그 보기" : isRecur ? "스케줄러" : "발송 보기"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {logsError && logs.length > 0 && (
          <p className="mt-2 text-[11px] text-app-warning">로그 데이터를 불러오는 중 일부 오류가 발생했습니다</p>
        )}
      </Panel>

      {/* ── Account Overview Table ──────────────────────────── */}
      <Panel
        title={<div className="flex items-center gap-2"><Users className="h-4 w-4 text-app-primary" aria-hidden="true" /> 계정 현황</div>}
        description="연결된 모든 Telegram 계정의 상태와 주요 지표"
      >
        {accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="mb-2 h-8 w-8 text-app-text-subtle" aria-hidden="true" />
            <p className="text-sm font-medium text-app-text">연결된 계정이 없습니다</p>
            <p className="mt-1 text-xs text-app-text-muted">계정 등록 탭에서 새 계정을 추가하세요</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>계정</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="hidden sm:table-cell">자동 응답</TableHead>
                  <TableHead className="text-right">오늘</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">그룹</TableHead>
                  <TableHead className="hidden md:table-cell">최근 활동</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((a) => {
                  const healthItem = healthItems.find(h => h.accountId === a.id);
                  const healthStatus = healthItem?.status;
                  const hasHealthIssue = healthStatus && healthStatus !== "healthy";
                  return (
                    <TableRow key={a.id} className={hasHealthIssue ? "bg-app-danger-muted/5" : undefined}>
                      <TableCell className="max-w-[120px] sm:max-w-[180px]">
                        <div className="truncate text-sm font-medium text-app-text" title={a.name || a.phone}>{a.name || a.phone}</div>
                        {a.name && <div className="truncate text-xs text-app-text-muted">{a.phone}</div>}
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                          a.status === "active" && !hasHealthIssue && "bg-app-success-muted text-app-success",
                          a.status === "active" && hasHealthIssue && "bg-app-warning-muted text-app-warning",
                          a.status === "inactive" && "bg-app-card-hover text-app-text-muted",
                          a.status === "banned" && "bg-app-danger-muted text-app-danger",
                        )}>
                          <span className={cn("h-1.5 w-1.5 rounded-full",
                            a.status === "active" && !hasHealthIssue && "bg-app-success",
                            a.status === "active" && hasHealthIssue && "bg-app-warning",
                            a.status === "inactive" && "bg-app-text-subtle",
                            a.status === "banned" && "bg-app-danger")} />
                          {a.status === "active" ? (hasHealthIssue ? "주의" : "활성") : a.status === "inactive" ? "비활성" : "차단"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {a.autoReplyEnabled
                          ? <span className="text-app-success text-xs font-medium">켜짐</span>
                          : <span className="text-app-text-subtle text-xs">꺼짐</span>}
                      </TableCell>
                      <TableCell className="font-medium tabular-nums text-right">{a.todaySent}</TableCell>
                      <TableCell className="tabular-nums text-app-text-muted text-right hidden sm:table-cell">{a.groupCount}</TableCell>
                      <TableCell className="text-xs text-app-text-muted hidden md:table-cell">
                        {a.lastActivity ? formatRelativeTime(a.lastActivity) : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>

      {/* ── Failure Intelligence ─────────────────────────────── */}
      {failureTypes.length > 0 && (
        <Panel
          title={<div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-app-danger" aria-hidden="true" /> 실패 분석</div>}
          description="주요 실패 유형 및 영향"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {failureTypes.map((f) => (
              <div key={f.status} className="rounded-xl border border-app-border bg-app-card p-3 transition-colors hover:border-app-border-strong">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-app-text">{f.status}</span>
                  <span className={cn("text-xs font-bold tabular-nums", f.percentage > 30 ? "text-app-danger" : f.percentage > 10 ? "text-app-warning" : "text-app-text-muted")}>
                    {f.percentage.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-app-border overflow-hidden" role="progressbar" aria-valuenow={Math.round(f.percentage)} aria-valuemin={0} aria-valuemax={100} aria-label={`${f.status}: ${f.percentage.toFixed(0)}%`}>
                  <div className={cn("h-full rounded-full transition-all", f.percentage > 30 ? "bg-app-danger" : f.percentage > 10 ? "bg-app-warning" : "bg-app-text-subtle")}
                    style={{ width: `${Math.min(f.percentage, 100)}%` }} />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-app-text-muted">
                  <span>{f.count}건</span>
                  <span>{f.affected_accounts}개 계정</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* ── API errors banner — non-blocking ── */}
      {(logsError || upcomingError || recurringError || overviewError) && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-app-warning/20 bg-app-warning-muted/20 px-3 py-2 text-[11px] text-app-warning">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>일부 데이터를 불러오지 못했습니다.</span>
          <button onClick={loadAll} className="ml-auto underline hover:no-underline focus-ring">다시 시도</button>
        </div>
      )}

      {healthError && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-app-warning/20 bg-app-warning-muted/20 px-3 py-2 text-[11px] text-app-warning">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>계정 상태 정보를 불러올 수 없습니다.</span>
          <button onClick={loadHealth} className="ml-auto underline hover:no-underline focus-ring">다시 시도</button>
        </div>
      )}
    </div>
  );
}