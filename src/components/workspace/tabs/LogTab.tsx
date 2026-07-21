"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Download, FileWarning, Hourglass, RefreshCw, RotateCcw, ScrollText, XCircle, SendHorizonal, ChevronUp, Play, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, Input, Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineError } from "@/components/ui/InlineError";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useAccountCache } from "@/lib/useAccountCache";
import { useToast } from "@/components/ui/Toast";
import * as api from "@/lib/api";
import { cn } from "@/lib/cn";
import { getAccountDisplayName, isBroadcastInFlight, isRecurringActive, isRecurringBroadcast, type Broadcast, type BroadcastStatus } from "@/types";
import { useCountdown, intervalLabel } from "@/lib/useRecurringCountdown";
import { FailureRecoveryPanel } from "@/components/workspace/tabs/log/FailureRecoveryPanel";
import { downloadLogsCsv } from "@/lib/exportCsv";

const STATUS_META: Record<BroadcastStatus, { tone: "neutral" | "success" | "warning" | "danger" | "info"; label: string; icon: typeof Clock }> = {
  pending: { tone: "neutral", label: "대기 중", icon: Hourglass },
  sending: { tone: "info", label: "발송 중", icon: RefreshCw },
  sent: { tone: "success", label: "완료", icon: CheckCircle2 },
  failed: { tone: "danger", label: "실패", icon: AlertTriangle },
  cancelled: { tone: "warning", label: "취소됨", icon: XCircle },
};

const POLL_INTERVAL_MS = 5000;
const BACKGROUND_POLL_INTERVAL_MS = 30000;
type HistoryFilter = BroadcastStatus | "all";

const FILTER_ORDER: HistoryFilter[] = ["all", "pending", "sending", "sent", "failed", "cancelled"];

const FILTER_LABEL: Record<HistoryFilter, string> = {
  all: "전체", pending: "대기", sending: "발송 중", sent: "완료", failed: "실패", cancelled: "취소",
};

import { formatTimestamp, formatDuration } from "@/lib/formatTime";

type BulkAction = "retry" | "send_now" | "cancel";

function canRetryFromFailureInfo(log: Broadcast): boolean {
  if (log.status !== "failed" || !log.failureInfo) return false;
  return (
    (log.failureInfo.retryable === "retryable" || log.failureInfo.retryable === "conditional") &&
    (log.failureInfo.recovery_action === "wait_and_retry" ||
      log.failureInfo.recovery_action === "retry_broadcast" ||
      log.failureInfo.recovery_action === "reauthenticate_account")
  );
}

function localDateKey(iso: string): string {
  const d = new Date(`${iso}Z`);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function matchesLogQuery(log: Broadcast, query: string, accountName: string): boolean {
  if (!query) return true;
  const haystack = [
    log.message,
    log.status,
    log.errorMessage ?? "",
    log.failureInfo?.summary ?? "",
    log.failureInfo?.category ?? "",
    accountName,
    log.accountId,
    log.recipients.join(" "),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function LogRow({
  log, retrying, sendingNow, accountLabel, accounts, selected, onToggleSelect, onRetry, onEditResend, onNavigate, onSendNow,
}: {
  log: Broadcast;
  retrying: string | null;
  sendingNow: string | null;
  accountLabel: (id: string) => string;
  accounts: { id: string; name: string | null; phone: string }[];
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onRetry: (b: Broadcast) => void;
  onEditResend: (b: Broadcast) => void;
  onNavigate: (tab: string) => void;
  onSendNow: (b: Broadcast) => void;
}) {
  const meta = STATUS_META[log.status];
  const Icon = meta.icon;
  const isFailed = log.status === "failed";
  const isSending = log.status === "sending";
  const isSent = log.status === "sent";
  const isCancelled = log.status === "cancelled";
  const isFutureSchedule = log.status === "pending" && log.scheduledAt && new Date(`${log.scheduledAt}Z`) > new Date();
  const recurring = isRecurringActive(log);
  const recurringCancelled = isCancelled && isRecurringBroadcast(log);
  const countdown = useCountdown(recurring ? log.nextScheduledAt : null);
  const duration = formatDuration(log.scheduledAt || log.createdAt, log.sentAt);
  const hasTiming = isSent && duration;
  const [expanded, setExpanded] = useState(false);
  const [retryConfirmOpen, setRetryConfirmOpen] = useState(false);

  const hasFailureInfo = isFailed && log.failureInfo != null;
  const accountExists = accounts.some((a) => a.id === log.accountId);
  const retryLocked = retrying === log.id;
  const sendNowLocked = sendingNow === log.id;
  const showRetryButton = accountExists && canRetryFromFailureInfo(log);

  return (
    <>
      {/* ── Collapsed row ── */}
      <div
        className={cn(
          "rounded-xl border transition-all",
          isFailed && !expanded && "border-app-danger/20 bg-app-danger-muted/20",
          isFailed && expanded && "border-app-danger/30 bg-app-danger-muted/10",
          recurringCancelled && "border-app-warning/20 bg-app-warning-muted/20",
          isSending && "border-app-info/20 bg-app-info-muted/10",
          !isFailed && !recurringCancelled && !isSending && "border-app-border bg-app-bg/60 hover:border-app-border-strong",
        )}
      >
        {/* ── Top info line ── */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button
            type="button"
            onClick={() => onToggleSelect(log.id)}
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors",
              selected ? "border-app-primary bg-app-primary text-white" : "border-app-border bg-app-card text-app-text-muted hover:border-app-border-strong hover:text-app-text",
            )}
            aria-label={selected ? "선택 해제" : "선택"}
            aria-pressed={selected}
          >
            {selected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="h-3 w-3 rounded-sm border border-current" />}
          </button>

          <Icon className={cn(
            "h-4 w-4 shrink-0",
            isSending && "animate-spin text-app-info",
            isFailed && "text-app-danger",
            isSent && "text-app-success",
            isCancelled && "text-app-warning",
            !isFailed && !isSending && !isSent && !isCancelled && "text-app-text-subtle",
          )} />

          <Badge tone={recurring ? "info" : isFutureSchedule ? "info" : isFailed ? "danger" : isCancelled ? "warning" : meta.tone} className="shrink-0 gap-1">
            {recurring ? "반복 중" : isFutureSchedule ? "예약됨" : (
              <span className="flex items-center gap-1">
                <Icon className={`h-3 w-3 ${log.status === "sending" ? "animate-spin" : ""}`} />
                {meta.label}
              </span>
            )}
          </Badge>

          <span className="min-w-0 flex-1 truncate text-sm text-app-text font-medium leading-snug">
            {log.message}
          </span>

          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => onSendNow(log)}
              disabled={sendNowLocked}
              aria-label="즉시 발송"
              title="즉시 발송"
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg transition-colors active:scale-95",
                "text-app-text-muted hover:bg-app-card-hover hover:text-app-text disabled:opacity-40",
              )}
            >
              <Play className={`h-4 w-4 ${sendNowLocked ? "animate-pulse" : ""}`} />
            </button>
            {isFailed && (<>
              {(log.errorMessage || log.failureInfo) && (
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  aria-label={expanded ? "세부 정보 접기" : "세부 정보 보기"}
                  aria-expanded={expanded}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg transition-colors active:scale-95",
                    expanded ? "text-app-text bg-app-card-hover" : "text-app-danger hover:bg-app-danger-muted/30",
                  )}
                >
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <FileWarning className="h-4 w-4" />}
                </button>
              )}
              {showRetryButton && (
                <button
                  type="button"
                  onClick={() => setRetryConfirmOpen(true)}
                  disabled={retryLocked}
                  aria-label="재발송"
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg text-app-danger transition-colors active:scale-95",
                    "hover:bg-app-danger-muted/30 disabled:opacity-40",
                  )}
                >
                  <RotateCcw className={`h-4 w-4 ${retryLocked ? "animate-spin" : ""}`} />
                </button>
              )}
              </>)}
              {!isFailed && !isSending && (
                <button
                  type="button"
                  onClick={() => onEditResend(log)}
                  aria-label="편집 후 재발송"
                  title="편집 후 재발송"
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg transition-colors active:scale-95",
                    "text-app-text-muted hover:bg-app-card-hover hover:text-app-primary",
                  )}
                >
                  <SendHorizonal className="h-4 w-4" />
                </button>
              )}
            </div>
        </div>

        {/* ── Meta line ── */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-3 pb-2.5 text-[11px] text-app-text-subtle">
          <span className="font-mono tabular-nums whitespace-nowrap">
            {new Date(`${log.createdAt}Z`).toLocaleString("ko-KR", { hour12: false, month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
          </span>
          <span className="text-app-text-muted truncate max-w-[120px] sm:max-w-none">
            {accountLabel(log.accountId)}
            {!accountExists && <span className="ml-1 text-app-danger">(삭제됨)</span>}
          </span>
          <span className="tabular-nums whitespace-nowrap">{log.recipients.length}명</span>
          {hasTiming && (
            <span className="rounded-md bg-app-card-hover px-1.5 py-0.5 font-mono whitespace-nowrap">{duration}</span>
          )}
          {isFutureSchedule && log.scheduledAt && (
            <span className="text-app-primary-hover tabular-nums">{formatTimestamp(log.scheduledAt)}</span>
          )}
          {recurring && log.nextScheduledAt && (
            <span className="text-app-info tabular-nums">
              {countdown ? `다음: ${countdown}` : `다음: ${new Date(`${log.nextScheduledAt}Z`).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}`}
            </span>
          )}
          {recurring && <span className="hidden lg:inline">{intervalLabel(log.recurringIntervalMinutes)}</span>}
        </div>
      </div>

      {/* Expanded failure detail */}
      {expanded && isFailed && hasFailureInfo && (
        <div className="mt-1">
          <FailureRecoveryPanel
            failureInfo={log.failureInfo!}
            errorMessage={log.errorMessage}
            accountDead={!accountExists}
            onRetry={() => { setExpanded(false); setRetryConfirmOpen(true); }}
            onEditResend={() => { setExpanded(false); onEditResend(log); }}
            onReauthenticate={() => { onNavigate("register"); }}
          />
        </div>
      )}

      {/* Expanded legacy error (no failureInfo) */}
      {expanded && isFailed && !hasFailureInfo && log.errorMessage && (
        <div className="mt-1 flex items-start gap-3 rounded-xl border border-app-danger/20 bg-app-danger-muted/10 px-4 py-3 text-xs">
          <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-app-danger" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-app-danger">발송 실패</p>
            <p className="mt-1 text-app-text-muted whitespace-pre-wrap break-words">{log.errorMessage}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {!accountExists && <Badge tone="danger">계정 삭제됨</Badge>}
              <Button variant="ghost" size="sm" onClick={() => { setExpanded(false); onEditResend(log); }}>
                <SendHorizonal className="h-3.5 w-3.5" /> 편집 후 재발송
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Retry confirmation */}
      <ConfirmDialog
        open={retryConfirmOpen}
        title="이 발송을 다시 시도할까요?"
        description={
          !accountExists
            ? "계정이 삭제되어 재발송할 수 없습니다."
            : `"${log.message}" — ${log.recipients.length}개 대상, ${accountLabel(log.accountId)} 계정으로 재발송합니다.`
        }
        variant="danger"
        confirmLabel={accountExists ? "재발송" : "확인"}
        cancelLabel="취소"
        onConfirm={async () => {
          setRetryConfirmOpen(false);
          if (canRetryFromFailureInfo(log)) onRetry(log);
        }}
        onCancel={() => setRetryConfirmOpen(false)}
      />
    </>
  );
}

export function LogTab() {
  const accounts = useDashboardStore((s) => s.accounts);
  const setTabBadge = useDashboardStore((s) => s.setTabBadge);
  const { toast } = useToast();
  const [logs, setLogs] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [sendNowId, setSendNowId] = useState<string | null>(null);
  const [sendNowConfirmId, setSendNowConfirmId] = useState<string | null>(null);
  const [accountFilter, setAccountFilter] = useState("");
  const [statusPillFilter, setStatusPillFilter] = useState<HistoryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedLogIds, setSelectedLogIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
  const bgPollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pollTick, setPollTick] = useState(0);

  // ── RuntimeManager 캐시에서 Broadcast 로그 즉시 로드 ──
  const { broadcasts: cachedBroadcasts } = useAccountCache(accountFilter || null);

  const load = useCallback(async (silent = false) => {
    if (silent && accountFilter) {
      try { setLogs(cachedBroadcasts); }
      catch { /* silent */ }
      return;
    }
    if (!accountFilter) {
      if (!silent) setLoading(true);
      setError(null);
      try { setLogs(await api.fetchLogs({ days: 30 })); }
      catch (err) { setError(err instanceof Error ? err.message : "로그를 불러오지 못했습니다."); }
      finally { if (!silent) setLoading(false); }
      return;
    }
    if (!silent) setLoading(true);
    setError(null);
    try {
      setLogs(cachedBroadcasts.length > 0 ? cachedBroadcasts : await api.fetchLogs({ accountId: accountFilter, days: 30 }));
    } catch (err) { setError(err instanceof Error ? err.message : "로그를 불러오지 못했습니다."); }
    finally { if (!silent) setLoading(false); }
  }, [accountFilter, cachedBroadcasts]);

  useEffect(() => {
    load();
    setStatusPillFilter("all");
    setSearchQuery("");
    setDateFilter("");
    setSelectedLogIds(new Set());
  }, [accountFilter, load]);

  // Update tab badge with failed log count
  useEffect(() => {
    const failedCount = logs.filter((l) => l.status === "failed").length;
    setTabBadge("log", failedCount);
  }, [logs, setTabBadge]);

  useEffect(() => {
    if (!logs.some(isBroadcastInFlight)) return;
    const timer = setTimeout(() => load(true), POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [logs, load]);

  useEffect(() => {
    if (bgPollTimer.current) clearTimeout(bgPollTimer.current);
    bgPollTimer.current = setTimeout(() => { load(true); setPollTick((t) => t + 1); }, BACKGROUND_POLL_INTERVAL_MS);
    return () => { if (bgPollTimer.current) clearTimeout(bgPollTimer.current); };
  }, [pollTick, accountFilter, load]);

  async function handleRetry(failed: Broadcast) {
    if (retrying) return;
    setRetrying(failed.id);
    setRetryError(null);
    try {
      await api.retryBroadcast(failed.id);
      await load();
      toast("success", "재발송이 예약되었습니다.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "재발송 요청에 실패했습니다.";
      setRetryError(msg);
      toast("error", msg);
    } finally {
      setRetrying(null);
    }
  }

  async function handleSendNow(broadcast: Broadcast) {
    setSendNowConfirmId(null);
    if (sendNowId) return;
    setSendNowId(broadcast.id);
    try {
      await api.sendNowBroadcast(broadcast.id);
      await load();
      toast("success", "즉시 발송이 접수되었습니다.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "즉시 발송 요청에 실패했습니다.";
      toast("error", msg);
    } finally {
      setSendNowId(null);
    }
  }

  function handleEditResend(failed: Broadcast) {
    const store = useDashboardStore.getState();
    if (store.clearSendDraft) store.clearSendDraft();
    if (store.setSendMessage) store.setSendMessage(failed.message);
    if (store.selectAccount) store.selectAccount(failed.accountId);
    const validRecipients = failed.recipients.filter((gid) =>
      store.sendGroups.some((g) => g.id === gid)
    );
    for (const gid of validRecipients) {
      if (!store.sendSelectedGroupIds.includes(gid)) {
        store.toggleSendGroupId(gid);
      }
    }
    store.setActiveTab("send");
    toast("info", "실패한 발송 내용을 불러왔습니다. 대상을 확인하고 다시 발송하세요.");
  }

  function handleNavigateTab(tab: string) {
    useDashboardStore.getState().setActiveTab(tab as import("@/types").TabId);
  }

  const accountLabel = useCallback((accountId: string): string => {
    const a = accounts.find((item) => item.id === accountId);
    return a ? getAccountDisplayName(a) : accountId;
  }, [accounts]);

  const visibleLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return logs.filter((log) => {
      if (statusPillFilter !== "all" && log.status !== statusPillFilter) return false;
      if (dateFilter && localDateKey(log.createdAt) !== dateFilter) return false;
      const accountName = accountLabel(log.accountId);
      return matchesLogQuery(log, query, accountName);
    });
  }, [accountLabel, dateFilter, logs, searchQuery, statusPillFilter]);

  const selectedLogs = useMemo(
    () => logs.filter((log) => selectedLogIds.has(log.id)),
    [logs, selectedLogIds],
  );

  const selectedVisibleLogs = useMemo(
    () => visibleLogs.filter((log) => selectedLogIds.has(log.id)),
    [selectedLogIds, visibleLogs],
  );

  const filteredLogs = visibleLogs;

  useEffect(() => {
    setSelectedLogIds((current) => {
      if (current.size === 0) return current;
      const valid = new Set(logs.map((log) => log.id));
      const next = new Set(Array.from(current).filter((id) => valid.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [logs]);

  const statusCounts = useMemo((): Record<HistoryFilter, number> => {
    const counts: Record<string, number> = { all: logs.length };
    for (const l of logs) counts[l.status] = (counts[l.status] ?? 0) + 1;
    return counts as Record<HistoryFilter, number>;
  }, [logs]);

  const summaryStats = useMemo(() => {
    const total = logs.length;
    const sent = logs.filter((l) => l.status === "sent").length;
    const failed = logs.filter((l) => l.status === "failed").length;
    const inFlight = logs.filter((l) => l.status === "sending" || l.status === "pending").length;
    return { total, sent, failed, inFlight };
  }, [logs]);

  const dailyChartData = useMemo(() => {
    const dayMap = new Map<string, { date: string; sent: number; failed: number; pending: number }>();
    for (const log of logs) {
      const key = localDateKey(log.createdAt);
      const entry = dayMap.get(key) ?? { date: key, sent: 0, failed: 0, pending: 0 };
      if (log.status === "sent") entry.sent++;
      else if (log.status === "failed") entry.failed++;
      else entry.pending++;
      dayMap.set(key, entry);
    }
    return Array.from(dayMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);
  }, [logs]);

  const bulkTargets = useMemo(() => {
    if (!bulkAction) return [];
    return selectedLogs.filter((log) => {
      if (bulkAction === "retry") return canRetryFromFailureInfo(log);
      if (bulkAction === "send_now") return log.status !== "sent" && log.status !== "cancelled";
      return isRecurringActive(log) && log.status !== "cancelled";
    });
  }, [bulkAction, selectedLogs]);

  const exportRows = selectedVisibleLogs.length > 0 ? selectedVisibleLogs : visibleLogs;

  async function handleBulkAction(action: BulkAction) {
    const targets = selectedLogs.filter((log) => {
      if (action === "retry") return canRetryFromFailureInfo(log);
      if (action === "send_now") return log.status !== "sent" && log.status !== "cancelled";
      return isRecurringActive(log) && log.status !== "cancelled";
    });

    if (targets.length === 0) {
      toast("info", "선택한 항목에 적용할 수 있는 작업이 없습니다.");
      setBulkAction(null);
      return;
    }

    setRetryError(null);
    let successCount = 0;
    const failures: string[] = [];

    for (const log of targets) {
      try {
        if (action === "retry") {
          await api.retryBroadcast(log.id);
        } else if (action === "send_now") {
          await api.sendNowBroadcast(log.id);
        } else {
          await api.cancelRecurringBroadcast(log.id);
        }
        successCount += 1;
      } catch (err) {
        failures.push(err instanceof Error ? err.message : log.id);
      }
    }

    await load();
    setSelectedLogIds(new Set());
    setBulkAction(null);

    if (failures.length === 0) {
      toast("success", `선택한 ${successCount}건을 처리했습니다.`);
    } else {
      toast("warning", `${successCount}건 성공, ${failures.length}건 실패`);
      if (failures[0]) setRetryError(failures[0]);
    }
  }

  return (
    <Panel
      title={
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-app-primary" />
          발송 로그
        </div>
      }
      description={`${summaryStats.total}건${summaryStats.sent > 0 ? ` · 완료 ${summaryStats.sent}` : ""}${summaryStats.failed > 0 ? ` · 실패 ${summaryStats.failed}` : ""}${summaryStats.inFlight > 0 ? ` · 진행 ${summaryStats.inFlight}` : ""}`}
      action={
        <div className="flex items-center gap-1">
          {logs.length > 0 && (
            <Button variant="ghost" onClick={() => downloadLogsCsv(exportRows, `telemon-logs${accountFilter ? `-${accountFilter.slice(0, 8)}` : ""}.csv`)} disabled={loading || exportRows.length === 0}>
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          )}
          <Button variant="ghost" onClick={() => load()} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            새로고침
          </Button>
        </div>
      }
    >
      {/* ── Daily trend chart ── */}
      {dailyChartData.length > 1 && (
        <div className="mb-4 rounded-xl border border-app-border bg-app-card p-3">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-medium text-app-text-muted">
            <BarChart3 className="h-3.5 w-3.5" />
            일별 발송 추이 (최근 {dailyChartData.length}일)
          </div>
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData} barGap={2}>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--color-text-muted)" }} tickFormatter={(v: string) => v.slice(5)} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-card)" }}
                  formatter={(value, name) => [
                    value, name === "sent" ? "완료" : name === "failed" ? "실패" : "대기"
                  ]}
                />
                <Bar dataKey="sent" fill="var(--color-success)" radius={[2, 2, 0, 0]} stackId="a" />
                <Bar dataKey="failed" fill="var(--color-danger)" radius={[2, 2, 0, 0]} stackId="a" />
                <Bar dataKey="pending" fill="var(--color-text-subtle)" radius={[2, 2, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Unified filter bar ── */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="메시지, 오류, 계정 등 검색"
            aria-label="로그 검색"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="sr-only" htmlFor="log-date-filter">날짜</label>
          <Input
            id="log-date-filter"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-36"
            aria-label="날짜 필터"
          />
          <label className="sr-only" htmlFor="log-account-filter">계정</label>
          <Select
            id="log-account-filter"
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="w-36"
            aria-label="계정 필터"
          >
            <option value="">전체 계정</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{getAccountDisplayName(a)}</option>
            ))}
          </Select>
        </div>
        {summaryStats.total > 0 && (
          <div className="flex items-center gap-1.5 ml-auto text-[11px] text-app-text-muted shrink-0">
            {summaryStats.sent > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-app-success-muted/40 px-2 py-0.5 text-app-success font-medium">
                <CheckCircle2 className="h-3 w-3" />{summaryStats.sent}
              </span>
            )}
            {summaryStats.failed > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-app-danger-muted/40 px-2 py-0.5 text-app-danger font-medium">
                <AlertTriangle className="h-3 w-3" />{summaryStats.failed}
              </span>
            )}
            {summaryStats.inFlight > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-app-info-muted/40 px-2 py-0.5 text-app-info font-medium">
                <RefreshCw className="h-3 w-3 animate-spin" />{summaryStats.inFlight}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mb-3 grid gap-3 xl:grid-cols-[1.2fr_0.8fr_auto]">
        <Field label="Search" hint="Search messages, errors, accounts, and recipients.">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search logs"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-app-text-muted">
            Date
            <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-app-text-muted">
            Account
            <Select value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}>
              <option value="">All</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{getAccountDisplayName(a)}</option>
              ))}
            </Select>
          </label>
        </div>
        {summaryStats.total > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-app-text-muted xl:justify-end">
            {summaryStats.sent > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-app-success-muted/40 px-1.5 py-0.5 text-app-success">
                <CheckCircle2 className="h-3 w-3" />{summaryStats.sent}
              </span>
            )}
            {summaryStats.failed > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-app-danger-muted/40 px-1.5 py-0.5 text-app-danger">
                <AlertTriangle className="h-3 w-3" />{summaryStats.failed}
              </span>
            )}
            {summaryStats.inFlight > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-app-info-muted/40 px-1.5 py-0.5 text-app-info">
                <RefreshCw className="h-3 w-3 animate-spin" />{summaryStats.inFlight}
              </span>
            )}
          </div>
        )}
      </div>

      {selectedLogIds.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-app-border bg-app-card px-3 py-2.5 text-xs">
          <span className="font-medium text-app-text">{selectedLogIds.size} selected</span>
          <Button variant="ghost" size="sm" onClick={() => setSelectedLogIds(new Set(visibleLogs.map((log) => log.id)))}>
            Select visible
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedLogIds(new Set())}>
            Clear
          </Button>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setBulkAction("retry")} disabled={selectedLogs.every((log) => !canRetryFromFailureInfo(log))}>
              Retry selected
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setBulkAction("send_now")} disabled={selectedLogs.every((log) => log.status === "sent" || log.status === "cancelled")}>
              Send now
            </Button>
            <Button variant="danger" size="sm" onClick={() => setBulkAction("cancel")} disabled={selectedLogs.every((log) => !isRecurringActive(log))}>
              Cancel recurring
            </Button>
          </div>
        </div>
      )}

      {/* Status filter pills + hide inactive toggle */}
      {!loading && logs.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {FILTER_ORDER.map((f) => {
            const count = statusCounts[f] ?? 0;
            if (f !== "all" && count === 0) return null;
            return (
              <button key={f} type="button" onClick={() => setStatusPillFilter(f)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  statusPillFilter === f
                    ? "bg-app-primary text-white"
                    : "bg-app-card-hover text-app-text-muted hover:text-app-text",
                )}>
                {FILTER_LABEL[f]}
                {f !== "all" && <span className="ml-1 opacity-70">{count}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Hide inactive toggle ── */}
      <div className="mb-3 flex items-center gap-2 pb-1 border-b border-app-border/50">
        <button
          type="button"
          onClick={() => setStatusPillFilter("all")}
          className={cn("text-xs font-medium transition-colors", statusPillFilter === "all" ? "text-app-primary" : "text-app-text-muted hover:text-app-text")}
        >
          전체 보기
        </button>
        <span className="text-app-text-subtle text-[10px]">|</span>
        <button
          type="button"
          onClick={() => setStatusPillFilter("failed")}
          className={cn("text-xs font-medium transition-colors", statusPillFilter === "failed" ? "text-app-danger" : "text-app-text-muted hover:text-app-danger")}
        >
          🔴 실패만
        </button>
        <span className="text-app-text-subtle text-[10px]">|</span>
        <button
          type="button"
          onClick={() => setStatusPillFilter("sent")}
          className={cn("text-xs font-medium transition-colors", statusPillFilter === "sent" ? "text-app-success" : "text-app-text-muted hover:text-app-success")}
        >
          ✅ 완료만
        </button>
        <span className="text-app-text-subtle text-[10px]">|</span>
        <button
          type="button"
          onClick={() => setStatusPillFilter("pending")}
          className={cn("text-xs font-medium transition-colors", statusPillFilter === "pending" ? "text-app-info" : "text-app-text-muted hover:text-app-info")}
        >
          ⏳ 대기/진행
        </button>
      </div>

      {/* Loading */}
      {loading && filteredLogs.length === 0 && (
        <div className="space-y-1.5">
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      )}

      {/* Error */}
      {error && <InlineError className="mb-2">{error}</InlineError>}
      {retryError && <InlineError className="mb-2">{retryError}</InlineError>}

      {/* Empty */}
      {!loading && !error && logs.length === 0 && (
        <EmptyState icon={ScrollText} title="조건에 맞는 발송 로그가 없습니다." />
      )}

      {/* Log rows */}
      {filteredLogs.length > 0 && (
        <div className="space-y-1.5 text-xs">
          {filteredLogs.map((log) => (
            <LogRow
              key={log.id}
              log={log}
              retrying={retrying}
              sendingNow={sendNowId}
              accountLabel={accountLabel}
              accounts={accounts}
              selected={selectedLogIds.has(log.id)}
              onToggleSelect={(id) => {
                setSelectedLogIds((current) => {
                  const next = new Set(current);
                  if (next.has(id)) next.delete(id); else next.add(id);
                  return next;
                });
              }}
              onRetry={handleRetry}
              onEditResend={handleEditResend}
              onNavigate={handleNavigateTab}
              onSendNow={(b) => setSendNowConfirmId(b.id)}
            />
          ))}
        </div>
      )}

      {filteredLogs.length === 0 && logs.length > 0 && (
        <p className="py-4 text-center text-xs text-app-text-subtle">선택한 상태의 로그가 없습니다.</p>
      )}

      <ConfirmDialog
        open={!!sendNowConfirmId}
        title="즉시 발송"
        description={
          sendNowConfirmId
            ? `"${logs.find((b) => b.id === sendNowConfirmId)?.message?.slice(0, 50)}" — 이 발송을 지금 즉시 1회 실행할까요? 원본 발송 상태는 변경되지 않습니다.`
            : ""
        }
        confirmLabel="즉시 발송"
        onConfirm={() => {
          const b = logs.find((l) => l.id === sendNowConfirmId);
          if (b) handleSendNow(b);
        }}
        onCancel={() => setSendNowConfirmId(null)}
      />

      <ConfirmDialog
        open={bulkAction !== null}
        title={bulkAction === "retry" ? "Retry selected" : bulkAction === "send_now" ? "Send now selected" : "Cancel recurring selected"}
        description={`${bulkTargets.length} item(s) will be processed.`}
        variant={bulkAction === "cancel" ? "danger" : "default"}
        confirmLabel={bulkAction === "cancel" ? "Cancel" : "Run"}
        onConfirm={async () => {
          if (bulkAction) await handleBulkAction(bulkAction);
        }}
        onCancel={() => setBulkAction(null)}
      />
    </Panel>
  );
}
