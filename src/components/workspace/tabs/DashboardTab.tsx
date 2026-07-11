"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Activity, AlertTriangle, BarChart3, CheckCircle2, Clock, MessageSquare,
  RefreshCw, SendHorizonal, Users, XCircle, Zap,
  ArrowRight, Ban, Copy, Plus, UserPlus, ShieldAlert, ShieldOff,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { cn } from "@/lib/cn";
import { useDashboardStore } from "@/store/useDashboardStore";
import * as api from "@/lib/api";
import type { AccountHealthItem, Broadcast, BroadcastStatus, DeliveryOverview } from "@/types";
import { isRecurringActive, isRecurringBroadcast, getRecurringState } from "@/types";
import { useCountdown, intervalLabel } from "@/lib/useRecurringCountdown";

const STATUS_TONE: Record<BroadcastStatus, { tone: "neutral" | "success" | "warning" | "danger" | "info"; label: string }> = {
  pending: { tone: "neutral", label: "대기 중" },
  sending: { tone: "info", label: "발송 중" },
  sent: { tone: "success", label: "완료" },
  failed: { tone: "danger", label: "실패" },
  cancelled: { tone: "warning", label: "취소됨" },
};

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(`${iso}Z`).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function formatCompact(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

/** Derive failure summary and recovery action from failure_info if available. */
function failureInfoSummary(info: Record<string, unknown> | null | undefined): { summary: string; action: string | null } {
  if (!info || !info.category) return { summary: "", action: null };
  const cat = String(info.category);
  const summary = String(info.summary ?? info.category ?? "");
  const recovery = String(info.recovery_action ?? "");
  let action: string | null = null;
  if (recovery === "reauthenticate_account" || recovery === "account_is_banned" || recovery === "check_configuration") action = "register";
  if (recovery === "wait_and_retry" || recovery === "check_recipient" || recovery === "check_media" || recovery === "retry_broadcast" || recovery === "contact_support") action = "log";
  return { summary, action };
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
  return (
    <div className="flex items-center justify-between rounded-xl border border-app-border bg-gradient-to-r from-app-bg to-app-card px-3 py-2.5 transition-all hover:border-app-border-strong hover:shadow-sm">
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
      <Badge tone="info" className="shrink-0">반복 중</Badge>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────

export function DashboardTab() {
  const accounts = useDashboardStore((s) => s.accounts);
  const accountsLoading = useDashboardStore((s) => s.accountsLoading);
  const accountsError = useDashboardStore((s) => s.accountsError);
  const fetchAccounts = useDashboardStore((s) => s.fetchAccounts);

  // Broadcast logs
  const [logs, setLogs] = useState<Broadcast[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [upcoming, setUpcoming] = useState<Broadcast[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState(false);

  // Recurring
  const [recurring, setRecurring] = useState<Broadcast[]>([]);
  const [recurringLoading, setRecurringLoading] = useState(false);
  const recurringPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Delivery analytics overview
  const [overview, setOverview] = useState<DeliveryOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  // Account health from real API
  const [healthItems, setHealthItems] = useState<AccountHealthItem[]>([]);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const loadLogs = async () => {
    setLogsLoading(true);
    try { setLogs(await api.fetchLogs()); } catch { setLogs([]); }
    finally { setLogsLoading(false); }
  };

  const loadUpcoming = async () => {
    setUpcomingLoading(true);
    try { setUpcoming(await api.fetchUpcomingBroadcasts()); } catch { setUpcoming([]); }
    finally { setUpcomingLoading(false); }
  };

  const loadRecurring = async () => {
    setRecurringLoading(true);
    try { setRecurring(await api.fetchRecurringBroadcasts()); } catch { setRecurring([]); }
    finally { setRecurringLoading(false); }
  };

  const loadOverview = async () => {
    setOverviewLoading(true);
    try { setOverview(await api.fetchDeliveryOverview(undefined, 30)); } catch { setOverview(null); }
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

  // Poll recurring every 30s
  useEffect(() => {
    if (recurringPollRef.current) clearTimeout(recurringPollRef.current);
    if (recurring.length === 0) return;
    recurringPollRef.current = setTimeout(loadRecurring, 30000);
    return () => { if (recurringPollRef.current) clearTimeout(recurringPollRef.current); };
  }, [recurring]);

  // Computed
  const activeAccounts = useMemo(() => accounts.filter((a) => a.status === "active"), [accounts]);
  const bannedAccounts = useMemo(() => accounts.filter((a) => a.status === "banned"), [accounts]);
  const totalSentToday = useMemo(() => accounts.reduce((sum, a) => sum + a.todaySent, 0), [accounts]);

  const sentCount = useMemo(() => logs.filter((l) => l.status === "sent").length, [logs]);
  const failedCount = useMemo(() => logs.filter((l) => l.status === "failed").length, [logs]);
  const totalBroadcasts = logs.length;

  const recentLogs = useMemo(
    () => [...logs].sort((a, b) => new Date(`${b.createdAt}Z`).getTime() - new Date(`${a.createdAt}Z`).getTime()).slice(0, 8),
    [logs]
  );

  // Failure types from overview
  const failureTypes = useMemo(() => {
    return (overview?.failure_breakdown ?? []).slice(0, 5);
  }, [overview]);

  const erroredRecurring = useMemo(() => {
    return recurring.filter(b => getRecurringState(b) === "error");
  }, [recurring]);

  // Health-derived attention groups using real API data
  const healthCritical = useMemo(() => {
    return healthItems.filter(h => h.status === "unauthorized" || h.status === "banned" || h.status === "not_configured");
  }, [healthItems]);

  const healthWarning = useMemo(() => {
    return healthItems.filter(h => h.status === "rate_limited" || h.status === "error");
  }, [healthItems]);

  const recentFailures = useMemo(() => {
    return [...logs].filter(l => l.status === "failed").sort((a, b) => new Date(`${b.createdAt}Z`).getTime() - new Date(`${a.createdAt}Z`).getTime()).slice(0, 4);
  }, [logs]);

  const summary = overview?.summary;

  // Build mini timeline from overview
  const timelineData = useMemo(() => {
    const items = overview?.timeline ?? [];
    return items.slice(-14).map((t) => ({
      label: t.period.slice(5),
      success: t.successful,
      fail: t.failed,
    }));
  }, [overview]);

  // Skeleton loading state
  if (accountsLoading && accounts.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    );
  }

  // Error state
  if (accountsError && accounts.length === 0) {
    return (
      <Panel title="시스템 상태">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-app-danger-muted">
            <XCircle className="h-8 w-8 text-app-danger" />
          </div>
          <p className="text-sm font-semibold text-app-danger">서버에 연결할 수 없습니다</p>
          <p className="mt-1 text-xs text-app-text-muted max-w-xs">{accountsError}</p>
          <button onClick={loadAll}
            className="mt-4 flex items-center gap-1.5 rounded-xl bg-app-primary px-4 py-2 text-xs font-medium text-white hover:bg-app-primary-hover transition-colors">
            <RefreshCw className="h-3.5 w-3.5" /> 다시 시도
          </button>
        </div>
      </Panel>
    );
  }

  const setTab = useDashboardStore.getState().setActiveTab;

  return (
    <div className="space-y-5 pb-8">
      {/* ── Header Section ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-app-text">운영 대시보드</h1>
          <p className="text-xs text-app-text-muted">실시간 운영 현황</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setTab("register")}
            className="flex items-center gap-1.5 rounded-xl bg-app-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-app-primary-hover transition-colors">
            <Plus className="h-3.5 w-3.5" /> 계정 추가
          </button>
          <button onClick={loadAll}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors">
            <RefreshCw className={cn("h-3.5 w-3.5", (refreshing || logsLoading) && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* ── Operational Attention Layer ───────────────────────── */}
      {(() => {
        const hasBlocking = healthCritical.length > 0 || bannedAccounts.length > 0 || erroredRecurring.length > 0;
        const hasWarning = healthWarning.length > 0 || failedCount > 0;
        if (!hasBlocking && !hasWarning) return null;
        return (
          <div className="rounded-2xl border border-app-border overflow-hidden">
            <div className="divide-y divide-app-border">
              {/* Real health: unauthorized */}
              {healthCritical.filter(h => h.status === "unauthorized").map(h => {
                const acct = accounts.find(a => a.id === h.accountId);
                return (
                  <div key={"unauth-" + h.accountId} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-app-warning-muted">
                        <ShieldAlert className="h-3.5 w-3.5 text-app-warning" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-app-text">{acct?.name?.trim() || h.phone} — 인증 필요</p>
                        <p className="text-[11px] text-app-text-muted">세션이 만료되었거나 인증되지 않았습니다</p>
                      </div>
                    </div>
                    <button onClick={() => setTab("register")}
                      className="shrink-0 flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-app-warning hover:bg-app-warning-muted/30 transition-colors">
                      재인증 <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
              {/* Real health: banned */}
              {healthCritical.filter(h => h.status === "banned").map(h => {
                const acct = accounts.find(a => a.id === h.accountId);
                return (
                  <div key={"banned-" + h.accountId} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-app-danger-muted">
                        <Ban className="h-3.5 w-3.5 text-app-danger" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-app-text">{acct?.name?.trim() || h.phone} — 차단됨</p>
                        <p className="text-[11px] text-app-text-muted">Telegram 계정이 차단되었습니다</p>
                      </div>
                    </div>
                    <button onClick={() => setTab("register")}
                      className="shrink-0 flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-app-danger hover:bg-app-danger-muted/30 transition-colors">
                      계정 관리 <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
              {/* Real health: not configured */}
              {healthCritical.filter(h => h.status === "not_configured").map(h => {
                const acct = accounts.find(a => a.id === h.accountId);
                return (
                  <div key={"noconfig-" + h.accountId} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-app-card-hover">
                        <ShieldOff className="h-3.5 w-3.5 text-app-text-muted" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-app-text">{acct?.name?.trim() || h.phone} — 설정 필요</p>
                        <p className="text-[11px] text-app-text-muted">세션이 구성되지 않았습니다. 계정을 인증하세요.</p>
                      </div>
                    </div>
                    <button onClick={() => setTab("register")}
                      className="shrink-0 flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-app-text-muted hover:bg-app-card-hover transition-colors">
                      설정하기 <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
              {/* Real health: rate limited */}
              {healthWarning.filter(h => h.status === "rate_limited").map(h => {
                const acct = accounts.find(a => a.id === h.accountId);
                return (
                  <div key={"ratelimit-" + h.accountId} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-app-warning-muted">
                        <Clock className="h-3.5 w-3.5 text-app-warning" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-app-text">{acct?.name?.trim() || h.phone} — 속도 제한</p>
                        <p className="text-[11px] text-app-text-muted">너무 많은 요청으로 일시 제한됨</p>
                      </div>
                    </div>
                    <button onClick={() => setTab("log")}
                      className="shrink-0 flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-app-warning hover:bg-app-warning-muted/30 transition-colors">
                      로그 보기 <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
              {/* Real health: error */}
              {healthWarning.filter(h => h.status === "error").map(h => {
                const acct = accounts.find(a => a.id === h.accountId);
                return (
                  <div key={"error-" + h.accountId} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-app-danger-muted">
                        <AlertTriangle className="h-3.5 w-3.5 text-app-danger" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-app-text">{acct?.name?.trim() || h.phone} — 오류 발생</p>
                        <p className="text-[11px] text-app-text-muted truncate">{h.lastError ?? "알 수 없는 오류"}</p>
                      </div>
                    </div>
                    <button onClick={() => setTab("register")}
                      className="shrink-0 flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-app-danger hover:bg-app-danger-muted/30 transition-colors">
                      계정 관리 <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
              {/* Fallback: banned from account status if health API failed */}
              {healthError && bannedAccounts.length > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-app-danger-muted">
                      <Ban className="h-3.5 w-3.5 text-app-danger" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-app-text">차단된 계정 {bannedAccounts.length}개</p>
                      <p className="text-[11px] text-app-text-muted truncate">{bannedAccounts.map(a => a.name?.trim() || a.phone).join(", ")}</p>
                    </div>
                  </div>
                  <button onClick={() => setTab("register")}
                    className="shrink-0 flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-app-danger hover:bg-app-danger-muted/30 transition-colors">
                    계정 관리 <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              )}
              {/* Errored recurring schedules */}
              {erroredRecurring.length > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-app-danger-muted">
                      <AlertTriangle className="h-3.5 w-3.5 text-app-danger" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-app-text">반복 스케줄 오류 {erroredRecurring.length}개</p>
                      <p className="text-[11px] text-app-text-muted truncate">{erroredRecurring.map(b => b.message).join(", ")}</p>
                    </div>
                  </div>
                  <button onClick={() => setTab("scheduler")}
                    className="shrink-0 flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-app-danger hover:bg-app-danger-muted/30 transition-colors">
                    스케줄러 <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Recent Failures Surface (compact, max 4 items) ──────────── */}
      {recentFailures.length > 0 && (
        <div className="rounded-2xl border border-app-border overflow-hidden">
          <div className="flex items-center gap-2 border-b border-app-border bg-app-card px-4 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-app-danger" />
            <span className="text-xs font-medium text-app-text">최근 발송 실패</span>
            <span className="ml-auto text-[11px] text-app-text-muted">{recentFailures.length}건</span>
          </div>
          <div className="divide-y divide-app-border">
            {recentFailures.map(f => {
              const acct = accounts.find(a => a.id === f.accountId);
              const acctLabel = acct ? (acct.name?.trim() || acct.phone) : f.accountId.slice(0, 8);
              const fi = f.failureInfo;
              const { summary: failureSummary, action: recoveryTarget } = failureInfoSummary(fi);
              const displayError = failureSummary || f.errorMessage || "알 수 없는 오류";
              const recoveryTab = recoveryTarget ?? "log";
              return (
                <div key={f.id} className="flex items-center justify-between px-4 py-2">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="truncate text-xs text-app-text">{f.message}</p>
                    <p className="flex flex-wrap gap-x-1.5 text-[11px] text-app-text-muted">
                      <span>{acctLabel}</span>
                      <span>·</span>
                      <span>{formatRelativeTime(f.createdAt)}</span>
                      <span>·</span>
                      <span className="text-app-danger truncate max-w-[160px]">{displayError}</span>
                    </p>
                  </div>
                  <button onClick={() => setTab(recoveryTab)}
                    className="shrink-0 flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-app-text-muted hover:bg-app-card-hover transition-colors">
                    {recoveryTab === "register" ? "계정 관리" : "로그 보기"} <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
          <button onClick={() => setTab("log")}
            className="flex w-full items-center justify-center gap-1 border-t border-app-border py-2 text-[11px] font-medium text-app-text-muted hover:bg-app-card-hover transition-colors">
            전체 로그 보기 <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* ── Quick Actions ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setTab("send")}
          className="flex items-center gap-1.5 rounded-xl bg-app-primary px-3.5 py-2 text-xs font-medium text-white shadow-sm shadow-app-primary/20 hover:bg-app-primary-hover transition-colors">
          <Plus className="h-3.5 w-3.5" /> 새 발송
        </button>
        <button onClick={() => setTab("groupsearch")}
          className="flex items-center gap-1.5 rounded-xl border border-app-border bg-app-card px-3.5 py-2 text-xs font-medium text-app-text hover:border-app-border-strong hover:shadow-sm transition-colors">
          <Users className="h-3.5 w-3.5" /> 그룹 찾기
        </button>
        <button onClick={() => setTab("scheduler")}
          className="flex items-center gap-1.5 rounded-xl border border-app-border bg-app-card px-3.5 py-2 text-xs font-medium text-app-text hover:border-app-border-strong hover:shadow-sm transition-colors">
          <Clock className="h-3.5 w-3.5" /> 반복 스케줄러
        </button>
        <button onClick={() => setTab("log")}
          className="flex items-center gap-1.5 rounded-xl border border-app-border bg-app-card px-3.5 py-2 text-xs font-medium text-app-text hover:border-app-border-strong hover:shadow-sm transition-colors">
          <Activity className="h-3.5 w-3.5" /> 발송 로그
        </button>
        {accounts.length === 0 && (
          <button onClick={() => setTab("register")}
            className="flex items-center gap-1.5 rounded-xl border border-app-primary/30 bg-app-primary-muted/20 px-3.5 py-2 text-xs font-medium text-app-primary hover:bg-app-primary-muted/30 transition-colors">
            <UserPlus className="h-3.5 w-3.5" /> 계정 추가
          </button>
        )}
      </div>

      {/* ── Stats Summary Row ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-app-border bg-app-card p-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-app-text-muted" />
            <span className="text-xs text-app-text-muted">계정</span>
          </div>
          <div className="mt-1 text-xl font-bold text-app-text tabular-nums">{activeAccounts.length}<span className="text-xs font-normal text-app-text-muted">/{accounts.length}</span></div>
        </div>
        <div className="rounded-2xl border border-app-border bg-app-card p-3">
          <div className="flex items-center gap-2">
            <SendHorizonal className="h-4 w-4 text-app-text-muted" />
            <span className="text-xs text-app-text-muted">오늘 발송</span>
          </div>
          <div className="mt-1 text-xl font-bold text-app-text tabular-nums">{totalSentToday}</div>
        </div>
        <div className="rounded-2xl border border-app-border bg-app-card p-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-app-text-muted" />
            <span className="text-xs text-app-text-muted">발송 완료</span>
          </div>
          <div className="mt-1 text-xl font-bold text-app-text tabular-nums">{sentCount}</div>
        </div>
        <div className={cn("rounded-2xl border p-3", failedCount > 0 ? "border-app-danger/20 bg-app-danger-muted/10" : "border-app-border bg-app-card")}>
          <div className="flex items-center gap-2">
            <AlertTriangle className={cn("h-4 w-4", failedCount > 0 ? "text-app-danger" : "text-app-text-muted")} />
            <span className="text-xs text-app-text-muted">실패</span>
          </div>
          <div className={cn("mt-1 text-xl font-bold tabular-nums", failedCount > 0 ? "text-app-danger" : "text-app-text")}>{failedCount}</div>
        </div>
      </div>

      {/* ── Middle Section: 3 columns ────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Upcoming scheduled */}
        <Panel
          title={<div className="flex items-center gap-2"><Clock className="h-4 w-4 text-app-info" /> 예약된 발송</div>}
          className="lg:col-span-1"
        >
          {upcomingLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Clock className="mb-2 h-6 w-6 text-app-text-subtle" />
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

        {/* Active recurring */}
        <Panel
          title={<div className="flex items-center gap-2"><RefreshCw className="h-4 w-4 text-app-primary" /> 반복 발송</div>}
          className="lg:col-span-1"
        >
          {recurringLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          ) : recurring.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <RefreshCw className="mb-2 h-6 w-6 text-app-text-subtle" />
              <p className="text-xs text-app-text-muted">반복 발송 일정이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {recurring.slice(0, 5).map((b) => (
                <RecurringCard key={b.id} b={b} accounts={accounts} />
              ))}
              {recurring.length > 5 && (
                <button onClick={() => setTab("scheduler")}
                  className="w-full rounded-xl border border-app-border py-1.5 text-[11px] font-medium text-app-text-muted hover:bg-app-card-hover transition-colors">
                  전체 {recurring.length}개 보기
                </button>
              )}
            </div>
          )}
        </Panel>

        {/* Delivery Health mini panel */}
        <Panel
          title={<div className="flex items-center gap-2"><Activity className="h-4 w-4 text-app-success" /> 전달 건강</div>}
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
              <Activity className="mb-2 h-6 w-6 text-app-text-subtle" />
              <p className="text-xs text-app-text-muted">전달 데이터가 아직 없습니다</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="relative h-16 w-16 shrink-0">
                  <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
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
            </div>
          )}
        </Panel>
      </div>

      {/* ── Recent Activity ───────────────────────── */}
      <Panel
        title={<div className="flex items-center gap-2"><Activity className="h-4 w-4 text-app-primary" /> 최근 활동</div>}
        className="w-full"
      >
        {logsLoading && recentLogs.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
          </div>
        ) : recentLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="mb-2 h-6 w-6 text-app-text-subtle" />
            <p className="text-sm font-medium text-app-text">아직 활동 기록이 없습니다</p>
            <p className="mt-1 text-xs text-app-text-muted">계정을 연결하고 메시지를 발송하면 여기에 표시됩니다</p>
          </div>
        ) : (
          <div className="divide-y divide-app-border">
            {recentLogs.map((b, i) => {
              const meta = STATUS_TONE[b.status];
              const recurringActive = isRecurringActive(b);
              return (
                <div key={b.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="truncate text-app-text">{b.message}</div>
                    <div className="flex flex-wrap items-center gap-x-1 text-xs text-app-text-muted">
                      <span>{formatRelativeTime(b.createdAt)}</span>
                      {b.errorMessage && <><span>·</span><span className="text-app-danger truncate max-w-[120px]">{b.errorMessage}</span></>}
                    </div>
                  </div>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* ── Account Overview Table ──────────────────────────── */}
      <Panel
        title={<div className="flex items-center gap-2"><Users className="h-4 w-4 text-app-primary" /> 계정 현황</div>}
        description="연결된 모든 Telegram 계정의 상태와 주요 지표"
      >
        {accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="mb-2 h-8 w-8 text-app-text-subtle" />
            <p className="text-sm font-medium text-app-text">연결된 계정이 없습니다</p>
            <p className="mt-1 text-xs text-app-text-muted">계정 등록 탭에서 새 계정을 추가하세요</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>계정</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>자동 응답</TableHead>
                <TableHead>오늘 발송</TableHead>
                <TableHead>그룹</TableHead>
                <TableHead>최근 활동</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="text-sm font-medium">{a.name || a.phone}</div>
                    {a.name && <div className="text-xs text-app-text-muted">{a.phone}</div>}
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                      a.status === "active" && "bg-app-success-muted text-app-success",
                      a.status === "inactive" && "bg-app-card-hover text-app-text-muted",
                      a.status === "banned" && "bg-app-danger-muted text-app-danger",
                    )}>
                      <span className={cn("h-1.5 w-1.5 rounded-full",
                        a.status === "active" && "bg-app-success",
                        a.status === "inactive" && "bg-app-text-subtle",
                        a.status === "banned" && "bg-app-danger")} />
                      {a.status === "active" ? "활성" : a.status === "inactive" ? "비활성" : "차단"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {a.autoReplyEnabled
                      ? <span className="text-app-success text-xs font-medium">켜짐</span>
                      : <span className="text-app-text-subtle text-xs">꺼짐</span>}
                  </TableCell>
                  <TableCell className="font-medium tabular-nums">{a.todaySent}</TableCell>
                  <TableCell className="tabular-nums text-app-text-muted">{a.groupCount}</TableCell>
                  <TableCell className="text-xs text-app-text-muted">
                    {a.lastActivity ? formatRelativeTime(a.lastActivity) : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      {/* ── Failure Intelligence ─────────────────────────────── */}
      {failureTypes.length > 0 && (
        <Panel
          title={<div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-app-danger" /> 실패 분석</div>}
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
                <div className="w-full h-1.5 rounded-full bg-app-border overflow-hidden">
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
    </div>
  );
}