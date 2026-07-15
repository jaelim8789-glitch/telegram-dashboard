"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Cpu, Database, Play, RefreshCw, RotateCcw, Server, Shield, XCircle, Zap } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { InlineError } from "@/components/ui/InlineError";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import * as api from "@/lib/api";
import type { RuntimeInspectorSummary, RuntimeSummaryItem } from "@/lib/api";

const HEALTH_META: Record<string, { tone: "success" | "warning" | "danger" | "neutral" | "info"; label: string; icon: typeof Activity }> = {
  healthy: { tone: "success", label: "정상", icon: CheckCircle2 },
  unauthorized: { tone: "danger", label: "세션 만료", icon: XCircle },
  rate_limited: { tone: "warning", label: "제한됨", icon: AlertTriangle },
  banned: { tone: "danger", label: "차단", icon: Shield },
  error: { tone: "danger", label: "오류", icon: AlertTriangle },
  unknown: { tone: "neutral", label: "알 수 없음", icon: Activity },
};

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}초`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}시간 ${mins}분`;
}

function RuntimeRow({ item, onRecover, onRestart, onSelect, recovering, restarting }: {
  item: RuntimeSummaryItem;
  onRecover: (id: string) => void;
  onRestart: (id: string) => void;
  onSelect: (id: string) => void;
  recovering: string | null;
  restarting: string | null;
}) {
  const meta = HEALTH_META[item.health_status] ?? HEALTH_META.unknown;
  const Icon = meta.icon;
  const isRecovering = recovering === item.account_id;
  const isRestarting = restarting === item.account_id;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3 transition-all cursor-pointer hover:bg-app-card-hover",
        item.health_status === "healthy" && "border-app-success/20",
        item.health_status === "unauthorized" && "border-app-danger/20 bg-app-danger-muted/10",
        item.health_status === "rate_limited" && "border-app-warning/20 bg-app-warning-muted/10",
        item.health_status === "error" && "border-app-danger/20 bg-app-danger-muted/10",
        !["healthy", "unauthorized", "rate_limited", "error"].includes(item.health_status) && "border-app-border",
      )}
      onClick={() => onSelect(item.account_id)}
    >
      {/* Health icon */}
      <div className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
        item.health_status === "healthy" && "bg-app-success-muted/30 text-app-success",
        item.health_status === "unauthorized" && "bg-app-danger-muted/30 text-app-danger",
        item.health_status === "rate_limited" && "bg-app-warning-muted/30 text-app-warning",
        item.health_status === "banned" && "bg-app-danger-muted/30 text-app-danger",
        item.health_status === "error" && "bg-app-danger-muted/30 text-app-danger",
      )}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Account info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-app-text">
            {item.name || item.phone}
          </span>
          <Badge tone={meta.tone} className="shrink-0 text-[10px]">
            {meta.label}
          </Badge>
          {!item.running && (
            <Badge tone="warning">중지됨</Badge>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-app-text-subtle">
          <span className="font-mono">{item.phone}</span>
          <span>가동 {formatUptime(item.uptime_seconds)}</span>
          <span>오늘 {item.today_sent}건</span>
          <span>그룹 {item.group_count}개</span>
          {item.active_broadcasts > 0 && (
            <Badge tone="info">발송 중 {item.active_broadcasts}</Badge>
          )}
          {item.queue_size > 0 && (
            <span>대기 {item.queue_size}</span>
          )}
          {item.consecutive_failures >= 3 && (
            <span className="text-app-danger">연속 실패 {item.consecutive_failures}회</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRecover(item.account_id); }}
          disabled={isRecovering || !item.has_session}
          title="세션 복구"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors disabled:opacity-40"
        >
          <RotateCcw className={`h-4 w-4 ${isRecovering ? "animate-spin" : ""}`} />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRestart(item.account_id); }}
          disabled={isRestarting}
          title="Runtime 재시작"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors disabled:opacity-40"
        >
          <Play className={`h-4 w-4 ${isRestarting ? "animate-pulse" : ""}`} />
        </button>
      </div>
    </div>
  );
}

export function RuntimeInspectorTab() {
  const [summary, setSummary] = useState<RuntimeInspectorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recovering, setRecovering] = useState<string | null>(null);
  const [restarting, setRestarting] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<api.RuntimeInspectorDetail | null>(null);
  const { toast } = useToast();
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.fetchRuntimeInspectorSummary();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Runtime 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRecover = useCallback(async (accountId: string) => {
    setRecovering(accountId);
    try {
      const result = await api.triggerSessionRecovery(accountId);
      if (result.recovered) {
        toast("success", "세션이 자동 복구되었습니다.");
      } else {
        toast("error", "세션 복구에 실패했습니다. 재인증이 필요합니다.");
      }
      await load();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "복구 요청 실패");
    } finally {
      setRecovering(null);
    }
  }, [load, toast]);

  const handleRestart = useCallback(async (accountId: string) => {
    setRestarting(accountId);
    try {
      const result = await api.restartRuntime(accountId);
      if (result.authenticated) {
        toast("success", "Runtime이 재시작되었습니다.");
      } else {
        toast("warning", "Runtime이 재시작되었지만 인증이 필요합니다.");
      }
      await load();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "재시작 요청 실패");
    } finally {
      setRestarting(null);
    }
  }, [load, toast]);

  const handleSelect = useCallback(async (accountId: string) => {
    try {
      const detail = await api.fetchRuntimeInspectorDetail(accountId);
      setSelectedDetail(detail);
    } catch (err) {
      toast("error", "상세 정보를 불러오지 못했습니다.");
    }
  }, [toast]);

  const stats = [
    { label: "전체", value: summary?.total ?? 0, color: "text-app-text" },
    { label: "실행 중", value: summary?.active ?? 0, color: "text-app-success" },
    { label: "정상", value: summary?.healthy ?? 0, color: "text-app-success" },
    { label: "세션 만료", value: summary?.unauthorized ?? 0, color: "text-app-danger" },
    { label: "제한됨", value: summary?.rate_limited ?? 0, color: "text-app-warning" },
    { label: "오류", value: summary?.error ?? 0, color: "text-app-danger" },
  ];

  return (
    <Panel
      title={
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-app-primary" />
          Runtime 인스펙터
        </div>
      }
      description={summary ? `전체 ${summary.total}개 Runtime · 실행 ${summary.active}개` : "계정 Runtime 상태 실시간 모니터링"}
      action={
        <div className="flex items-center gap-1">
          <Button variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            새로고침
          </Button>
        </div>
      }
    >
      {/* Stats bar */}
      {!loading && summary && (
        <div className="mb-4 flex flex-wrap gap-3">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5 rounded-lg bg-app-card px-3 py-2">
              <span className="text-xs text-app-text-muted">{s.label}</span>
              <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && <InlineError className="mb-3">{error}</InlineError>}

      {/* Loading */}
      {loading && !summary && (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      )}

      {/* Runtime list */}
      {summary && summary.runtimes.length > 0 && (
        <div className="space-y-2">
          {summary.runtimes.map((item) => (
            <RuntimeRow
              key={item.account_id}
              item={item}
              onRecover={handleRecover}
              onRestart={handleRestart}
              onSelect={handleSelect}
              recovering={recovering}
              restarting={restarting}
            />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && summary && summary.runtimes.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-app-text-muted">
          <Cpu className="h-8 w-8" />
          <p className="text-sm">실행 중인 Runtime이 없습니다.</p>
          <p className="text-xs">계정을 등록하면 Runtime이 자동으로 생성됩니다.</p>
        </div>
      )}

      {/* Selected detail panel */}
      {selectedDetail && (
        <div className="mt-4 rounded-xl border border-app-border bg-app-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-app-text">
              <Database className="mr-1.5 inline h-4 w-4 text-app-primary" />
              Runtime 상세 — {selectedDetail.name || selectedDetail.phone}
            </h3>
            <button
              type="button"
              onClick={() => setSelectedDetail(null)}
              className="flex h-6 w-6 items-center justify-center rounded-lg text-app-text-muted hover:text-app-text"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DetailField label="계정 ID" value={selectedDetail.account_id} mono />
            <DetailField label="전화번호" value={selectedDetail.phone} />
            <DetailField label="상태" value={selectedDetail.status} />
            <DetailField label="실행 시간" value={formatUptime(selectedDetail.uptime_seconds)} />
            <DetailField label="시작 시간" value={selectedDetail.started_at ? new Date(selectedDetail.started_at).toLocaleString("ko-KR") : "N/A"} />
            <DetailField label="오늘 발송" value={String(selectedDetail.today_sent)} />
            <DetailField label="그룹 캐시" value={`${String(selectedDetail.group_cache?.count ?? "?")}개`} />
            <DetailField label="활성 발송" value={String(selectedDetail.broadcast_queue?.active_count ?? 0)} />
            <DetailField label="발송 대기열" value={String(selectedDetail.broadcast_queue?.queue_size ?? 0)} />
            <DetailField label="자동 응답" value={selectedDetail.auto_reply?.enabled ? "활성" : "비활성"} />
            <DetailField label="자동 응답 규칙" value={`${String(selectedDetail.auto_reply?.rules_count ?? 0)}개`} />
            <DetailField label="세션 파일" value={selectedDetail.session?.file_exists ? `✅ ${selectedDetail.session?.file_size ?? 0} bytes` : "❌ 없음"} />
          </div>
          {selectedDetail.health && (
            <div className="mt-3 border-t border-app-border pt-3">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-app-text-muted">건강 상세</h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <DetailField label="연속 실패" value={String(selectedDetail.health.consecutive_failures ?? 0)} />
                <DetailField label="복구 시도" value={String(selectedDetail.health.recovery_attempts ?? 0)} />
                <DetailField label="마지막 복구" value={String(selectedDetail.health.last_recovery_result ?? "N/A")} />
                <DetailField label="세션 검증" value={selectedDetail.health.session_last_verified_at ? new Date(selectedDetail.health.session_last_verified_at as string).toLocaleString("ko-KR") : "없음"} />
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg bg-app-bg/50 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-app-text-subtle">{label}</p>
      <p className={cn("mt-0.5 text-sm font-medium text-app-text", mono && "font-mono")}>{value || "—"}</p>
    </div>
  );
}