"use client";

import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDashboardStore } from "@/store/useDashboardStore";
import * as api from "@/lib/api";
import { getAccountDisplayName, isBroadcastInFlight, type Broadcast, type BroadcastStatus } from "@/types";

const STATUS_TONE: Record<BroadcastStatus, { tone: "neutral" | "success" | "warning" | "danger" | "info"; label: string }> = {
  pending: { tone: "neutral", label: "대기 중" },
  sending: { tone: "info", label: "발송 중" },
  sent: { tone: "success", label: "완료" },
  failed: { tone: "danger", label: "실패" },
};

const POLL_INTERVAL_MS = 5000;

function formatTimestamp(iso: string): string {
  return new Date(`${iso}Z`).toLocaleString("ko-KR", { hour12: false });
}

export function LogTab() {
  const accounts = useDashboardStore((s) => s.accounts);
  const [logs, setLogs] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountFilter, setAccountFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<BroadcastStatus | "">("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setLogs(
        await api.fetchLogs({
          accountId: accountFilter || undefined,
          status: statusFilter || undefined,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountFilter, statusFilter]);

  useEffect(() => {
    if (!logs.some(isBroadcastInFlight)) return;
    const timer = setTimeout(load, POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs]);

  function accountLabel(accountId: string): string {
    const account = accounts.find((a) => a.id === accountId);
    return account ? getAccountDisplayName(account) : accountId;
  }

  return (
    <Panel
      title="발송 로그"
      description="계정별 발송 작업 기록입니다. 진행 중인 작업은 자동으로 갱신됩니다."
      action={
        <Button variant="ghost" onClick={load} disabled={loading}>
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
        <label className="flex items-center gap-2 text-xs text-app-text-muted">
          상태 필터
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as BroadcastStatus | "")} className="w-32">
            <option value="">전체</option>
            <option value="pending">대기 중</option>
            <option value="sending">발송 중</option>
            <option value="sent">완료</option>
            <option value="failed">실패</option>
          </Select>
        </label>
      </div>

      {loading && (
        <div className="space-y-1.5">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      )}
      {error && <p className="text-xs text-app-danger">{error}</p>}
      {!loading && !error && logs.length === 0 && (
        <EmptyState icon={ScrollText} title="조건에 맞는 발송 로그가 없습니다" />
      )}
      <div className="space-y-1.5 font-mono text-xs">
        {logs.map((log) => {
          const meta = STATUS_TONE[log.status];
          const isFutureSchedule =
            log.status === "pending" && log.scheduledAt && new Date(`${log.scheduledAt}Z`) > new Date();
          return (
            <div
              key={log.id}
              className="flex items-center gap-3 rounded-xl border border-app-border bg-app-bg/60 px-3 py-2"
            >
              <span className="shrink-0 text-app-text-subtle">{formatTimestamp(log.createdAt)}</span>
              <Badge tone={isFutureSchedule ? "info" : meta.tone}>{isFutureSchedule ? "예약됨" : meta.label}</Badge>
              <span className="shrink-0 text-app-text-muted">{accountLabel(log.accountId)}</span>
              <span className="min-w-0 flex-1 truncate text-app-text">{log.message}</span>
              {isFutureSchedule && log.scheduledAt && (
                <span className="shrink-0 text-app-primary-hover">{formatTimestamp(log.scheduledAt)} 예정</span>
              )}
              <span className="shrink-0 text-app-text-subtle">수신 {log.recipients.length}명</span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
