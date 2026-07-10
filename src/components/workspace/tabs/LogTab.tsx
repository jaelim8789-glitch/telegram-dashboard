"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock, RefreshCw, ScrollText, XCircle } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDashboardStore } from "@/store/useDashboardStore";
import * as api from "@/lib/api";
import { cn } from "@/lib/cn";
import { getAccountDisplayName, isBroadcastInFlight, isRecurringActive, type Broadcast, type BroadcastStatus } from "@/types";

const STATUS_TONE: Record<BroadcastStatus, { tone: "neutral" | "success" | "warning" | "danger" | "info"; label: string; icon: typeof Clock }> = {
  pending: { tone: "neutral", label: "대기 중", icon: Clock },
  sending: { tone: "info", label: "발송 중", icon: RefreshCw },
  sent: { tone: "success", label: "완료", icon: CheckCircle2 },
  failed: { tone: "danger", label: "실패", icon: XCircle },
  cancelled: { tone: "warning", label: "취소됨", icon: XCircle },
};

const POLL_INTERVAL_MS = 5000;
const BACKGROUND_POLL_INTERVAL_MS = 30000;
type HistoryFilter = BroadcastStatus | "all";

const FILTER_ORDER: HistoryFilter[] = ["all", "pending", "sending", "sent", "failed", "cancelled"];

const FILTER_LABEL: Record<HistoryFilter, string> = {
  all: "전체",
  pending: "대기",
  sending: "발송 중",
  sent: "완료",
  failed: "실패",
  cancelled: "취소",
};

function formatTimestamp(iso: string): string {
  return new Date(`${iso}Z`).toLocaleString("ko-KR", { hour12: false });
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
      try {
        setLogs(
          await api.fetchLogs({
            accountId: accountFilter || undefined,
          })
        );
      } catch {
        // silent refresh — ignore transient errors
      }
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setLogs(
        await api.fetchLogs({
          accountId: accountFilter || undefined,
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    setStatusPillFilter("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountFilter]);

  // Real-time poll while in-flight, background poll otherwise.
  useEffect(() => {
    if (!logs.some(isBroadcastInFlight)) return;
    const timer = setTimeout(() => load(true), POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs]);

  // 30s background polling independent of in-flight status.
  useEffect(() => {
    if (bgPollTimer.current) clearTimeout(bgPollTimer.current);
    bgPollTimer.current = setTimeout(() => { load(true); setPollTick((t) => t + 1); }, BACKGROUND_POLL_INTERVAL_MS);
    return () => {
      if (bgPollTimer.current) clearTimeout(bgPollTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollTick, accountFilter]);

  async function handleRetry(failed: Broadcast) {
    if (retrying) return;
    setRetrying(failed.id);
    setRetryError(null);
    try {
      await api.retryBroadcast(failed.id);
      await load();
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : "재발송 요청에 실패했습니다.");
    } finally {
      setRetrying(null);
    }
  }

  function accountLabel(accountId: string): string {
    const account = accounts.find((a) => a.id === accountId);
    return account ? getAccountDisplayName(account) : accountId;
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

  return (
    <Panel
      title="발송 로그"
      description="계정별 발송 작업 기록입니다."
      action={
        <Button variant="ghost" onClick={() => load()} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-app-text-muted">
          계정 필터
          <Select value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)} className="w-48">
            <option value="">전체</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {getAccountDisplayName(a)}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {!loading && logs.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {FILTER_ORDER.map((f) => {
            const count = statusCounts[f] ?? 0;
            if (f !== "all" && count === 0) return null;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setStatusPillFilter(f)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  statusPillFilter === f
                    ? "bg-app-primary text-white"
                    : "bg-app-card-hover text-app-text-muted hover:text-app-text"
                )}
              >
                {FILTER_LABEL[f]}
                {f !== "all" && <span className="ml-1 opacity-70">{count}</span>}
              </button>
            );
          })}
        </div>
      )}

      {loading && filteredLogs.length === 0 && (
        <div className="space-y-1.5">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      )}
      {error && <p className="text-xs text-app-danger">{error}</p>}
      {retryError && (
        <div className="mb-2 rounded-xl border border-app-danger/20 bg-app-danger-muted px-3 py-2 text-xs text-app-danger">
          {retryError}
        </div>
      )}
      {!loading && !error && logs.length === 0 && (
        <EmptyState icon={ScrollText} title="조건에 맞는 발송 로그가 없습니다." />
      )}
      {filteredLogs.length > 0 && (
        <div className="space-y-1.5 text-xs">
          {filteredLogs.map((log) => {
            const meta = STATUS_TONE[log.status];
            const isFailed = log.status === "failed";
            const isCancelled = log.status === "cancelled";
            const isFutureSchedule =
              log.status === "pending" && log.scheduledAt && new Date(`${log.scheduledAt}Z`) > new Date();
            const recurring = isRecurringActive(log);
            const StatusIcon = meta.icon;
            return (
              <div
                key={log.id}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                  isFailed
                    ? "border-app-danger/20 bg-app-danger-muted/20"
                    : isCancelled
                      ? "border-app-warning/20 bg-app-warning-muted/20"
                      : "border-app-border bg-app-bg/60"
                }`}
              >
                <span className="shrink-0 font-mono text-app-text-subtle">{formatTimestamp(log.createdAt)}</span>
                <Badge tone={isFutureSchedule ? "info" : recurring ? "info" : meta.tone}>
                  {isFutureSchedule ? "예약됨" : recurring ? "반복 중" : (
                    <span className="flex items-center gap-1">
                      <StatusIcon className={`h-3 w-3 ${log.status === "sending" ? "animate-spin" : ""}`} />
                      {meta.label}
                    </span>
                  )}
                </Badge>
                <span className="shrink-0 text-app-text-muted">{accountLabel(log.accountId)}</span>
                <span className="min-w-0 flex-1 truncate text-app-text">{log.message}</span>
                {isFutureSchedule && log.scheduledAt && (
                  <span className="shrink-0 text-app-primary-hover">{formatTimestamp(log.scheduledAt)} 예정</span>
                )}
                {recurring && log.nextScheduledAt && (
                  <span className="shrink-0 text-app-primary-hover">다음: {formatTimestamp(log.nextScheduledAt)}</span>
                )}
                <span className="shrink-0 text-app-text-subtle">{log.recipients.length}명</span>
                {isFailed && (
                  <button
                    type="button"
                    onClick={() => handleRetry(log)}
                    disabled={retrying === log.id}
                    title="재발송"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-app-danger transition-colors hover:bg-app-danger-muted disabled:opacity-40"
                  >
                    <RefreshCw className={`h-3 w-3 ${retrying === log.id ? "animate-spin" : ""}`} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {filteredLogs.length === 0 && logs.length > 0 && (
        <p className="py-4 text-center text-xs text-app-text-subtle">선택한 상태의 로그가 없습니다.</p>
      )}
    </Panel>
  );
}
