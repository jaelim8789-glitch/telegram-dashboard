"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, FileWarning, Hourglass, RefreshCw, RotateCcw, ScrollText, XCircle } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineError } from "@/components/ui/InlineError";
import { useDashboardStore } from "@/store/useDashboardStore";
import * as api from "@/lib/api";
import { cn } from "@/lib/cn";
import { getAccountDisplayName, isBroadcastInFlight, isRecurringActive, isRecurringBroadcast, type Broadcast, type BroadcastStatus } from "@/types";
import { useCountdown, intervalLabel } from "@/lib/useRecurringCountdown";

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

function formatTimestamp(iso: string): string {
  return new Date(`${iso}Z`).toLocaleString("ko-KR", { hour12: false });
}

function formatDuration(start: string | null, end: string | null): string | null {
  if (!start) return null;
  const diffMs = (end ? new Date(`${end}Z`).getTime() : Date.now()) - new Date(`${start}Z`).getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 5) return null;
  return sec < 60 ? `${sec}초` : `${Math.floor(sec / 60)}분 ${sec % 60}초`;
}

function LogRow({
  log, retrying, accountLabel, onRetry,
}: {
  log: Broadcast;
  retrying: string | null;
  accountLabel: (id: string) => string;
  onRetry: (b: Broadcast) => void;
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

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all",
        isFailed && "border-app-danger/20 bg-app-danger-muted/20",
        recurringCancelled && "border-app-warning/20 bg-app-warning-muted/20",
        isSending && "border-app-info/20 bg-app-info-muted/10",
        !isFailed && !recurringCancelled && !isSending && "border-app-border bg-app-bg/60 hover:border-app-border-strong",
      )}
    >
      {/* Icon column */}
      <Icon className={cn(
        "h-4 w-4 shrink-0",
        isSending && "animate-spin text-app-info",
        isFailed && "text-app-danger",
        isSent && "text-app-success",
        isCancelled && "text-app-warning",
        !isFailed && !isSending && !isSent && !isCancelled && "text-app-text-subtle",
      )} />

      {/* Timestamp */}
      <span className="shrink-0 font-mono text-[11px] text-app-text-subtle tabular-nums">
        {formatTimestamp(log.createdAt)}
      </span>

      {/* Status badge */}
      <Badge tone={
        recurring ? "info" : isFutureSchedule ? "info" : isFailed ? "danger" : isCancelled ? "warning" : meta.tone
      }>
        {recurring ? "반복 중" : isFutureSchedule ? "예약됨" : (
          <span className="flex items-center gap-1">
            <Icon className={`h-3 w-3 ${log.status === "sending" ? "animate-spin" : ""}`} />
            {meta.label}
          </span>
        )}
      </Badge>

      {/* Account */}
      <span className="hidden shrink-0 text-app-text-muted sm:inline">
        {accountLabel(log.accountId)}
      </span>

      {/* Message */}
      <span className="min-w-0 flex-1 truncate text-app-text">{log.message}</span>

      {/* Recipients */}
      <span className="shrink-0 text-[11px] text-app-text-subtle tabular-nums">{log.recipients.length}명</span>

      {/* Timing */}
      {hasTiming && (
        <span className="shrink-0 rounded-md bg-app-card-hover px-1.5 py-0.5 text-[10px] font-mono text-app-text-muted">
          {duration}
        </span>
      )}

      {/* Future schedule time */}
      {isFutureSchedule && log.scheduledAt && (
        <span className="shrink-0 text-xs text-app-primary-hover tabular-nums">
          {formatTimestamp(log.scheduledAt)}
        </span>
      )}

      {/* Recurring next countdown */}
      {recurring && log.nextScheduledAt && (
        <span className="shrink-0 text-xs text-app-info tabular-nums">
          {countdown ? `다음: ${countdown}` : `다음: ${formatTimestamp(log.nextScheduledAt)}`}
        </span>
      )}

      {/* Recurring interval label */}
      {recurring && (
        <span className="hidden shrink-0 text-app-text-subtle lg:inline">
          {intervalLabel(log.recurringIntervalMinutes)}
        </span>
      )}

      {/* Error */}
      {log.errorMessage && (
        <span className="hidden shrink-0 text-app-danger md:inline" title={log.errorMessage}>
          <FileWarning className="h-3.5 w-3.5" />
        </span>
      )}

      {/* Retry button */}
      {isFailed && (
        <button type="button" onClick={() => onRetry(log)} disabled={retrying === log.id}
          title="재발송"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-app-danger transition-colors hover:bg-app-danger-muted disabled:opacity-40"
        >
          <RotateCcw className={`h-3.5 w-3.5 ${retrying === log.id ? "animate-spin" : ""}`} />
        </button>
      )}
    </div>
  );
}

export function LogTab() {
  const accounts = useDashboardStore((s) => s.accounts);
  const [logs, setLogs] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [accountFilter, setAccountFilter] = useState("");
  const [statusPillFilter, setStatusPillFilter] = useState<HistoryFilter>("all");
  const bgPollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pollTick, setPollTick] = useState(0);

  async function load(silent = false) {
    if (silent) {
      try { setLogs(await api.fetchLogs({ accountId: accountFilter || undefined })); }
      catch { /* silent */ }
      return;
    }
    setLoading(true);
    setError(null);
    try { setLogs(await api.fetchLogs({ accountId: accountFilter || undefined })); }
    catch (err) { setError(err instanceof Error ? err.message : "로그를 불러오지 못했습니다."); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); setStatusPillFilter("all"); }, [accountFilter]);

  useEffect(() => {
    if (!logs.some(isBroadcastInFlight)) return;
    const timer = setTimeout(() => load(true), POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [logs]);

  // 30s background polling
  useEffect(() => {
    if (bgPollTimer.current) clearTimeout(bgPollTimer.current);
    bgPollTimer.current = setTimeout(() => { load(true); setPollTick((t) => t + 1); }, BACKGROUND_POLL_INTERVAL_MS);
    return () => { if (bgPollTimer.current) clearTimeout(bgPollTimer.current); };
  }, [pollTick, accountFilter]);

  async function handleRetry(failed: Broadcast) {
    if (retrying) return;
    setRetrying(failed.id);
    setRetryError(null);
    try { await api.retryBroadcast(failed.id); await load(); }
    catch (err) { setRetryError(err instanceof Error ? err.message : "재발송 요청에 실패했습니다."); }
    finally { setRetrying(null); }
  }

  function accountLabel(accountId: string): string {
    const a = accounts.find((a) => a.id === accountId);
    return a ? getAccountDisplayName(a) : accountId;
  }

  const filteredLogs = useMemo(() => {
    if (statusPillFilter === "all") return logs;
    return logs.filter((l) => l.status === statusPillFilter);
  }, [logs, statusPillFilter]);

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
        <Button variant="ghost" onClick={() => load()} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      }
    >
      {/* Account filter + summary */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-app-text-muted">
          계정
          <Select value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)} className="w-44">
            <option value="">전체</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{getAccountDisplayName(a)}</option>
            ))}
          </Select>
        </label>

        {/* Mini stats */}
        {summaryStats.total > 0 && (
          <div className="flex items-center gap-2 text-[11px] text-app-text-muted">
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

      {/* Status filter pills */}
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
              accountLabel={accountLabel}
              onRetry={handleRetry}
            />
          ))}
        </div>
      )}

      {filteredLogs.length === 0 && logs.length > 0 && (
        <p className="py-4 text-center text-xs text-app-text-subtle">선택한 상태의 로그가 없습니다.</p>
      )}
    </Panel>
  );
}
