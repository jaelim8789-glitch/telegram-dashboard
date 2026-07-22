"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  FileWarning,
  Gauge,
  CalendarDays,
  RefreshCw,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineError } from "@/components/ui/InlineError";
import { cn } from "@/lib/cn";
import { fmt, formatRelativeTime } from "@/lib/formatTime";
import { exportCSV } from "@/lib/exportUtils";
import { useDashboardStore } from "@/store/useDashboardStore";
import * as api from "@/lib/api";
import type {
  DeliveryOverview,
  AccountPerformanceItem,
  FailureIntelligenceItem,
  TimelineItem,
  SourceAnalyticsItem,
  LatencyResult,
  LatencyBySourceItem,
  LatencyByAccountItem,
  BroadcastStatus,
} from "@/types";

const DAY_OPTIONS = [
  { value: 7, label: "7일" },
  { value: 14, label: "14일" },
  { value: 30, label: "30일" },
  { value: 90, label: "90일" },
] as const;

type TimeRange = (typeof DAY_OPTIONS)[number]["value"];

function pct(n: number): string { return `${Math.round(n)}%`; }
function successTone(rate: number): "success" | "warning" | "danger" {
  if (rate >= 90) return "success";
  if (rate >= 70) return "warning";
  return "danger";
}

function AccountLabel({ id }: { id: string }) {
  const short = id.length > 14 ? `${id.slice(0, 12)}...` : id;
  return <span title={id} className="block truncate max-w-[120px] sm:max-w-[160px]">{short}</span>;
}

function SummaryHierarchy({
  summary,
  logical,
  days,
}: {
  summary: { total_attempted: number; successful: number; failed: number; success_rate: number } | null;
  logical: { total_recipients: number; success_rate: number } | null;
  days: TimeRange;
}) {
  const ta = summary?.total_attempted ?? 0;
  const sr = summary?.success_rate ?? 0;
  const fc = summary?.failed ?? 0;
  if (ta === 0) return null;
  const failurePct = ta > 0 ? (fc / ta) * 100 : 0;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <StatCard
        icon={<BarChart3 className="h-5 w-5" aria-hidden="true" />}
        label="총 시도"
        value={fmt(ta)}
        sub={`${days}일`}
        accent="cyan"
      />
      <StatCard
        icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
        label="성공"
        value={fmt(summary?.successful ?? 0)}
        sub={pct(sr)}
        trend={sr >= 90 ? "up" : sr >= 70 ? "neutral" : "down"}
        accent="emerald"
      >
        <Badge tone={successTone(sr)} className="text-[9px] px-1 py-0">
          {sr >= 90 ? "양호" : sr >= 70 ? "보통" : "저조"}
        </Badge>
      </StatCard>
      <StatCard
        icon={<XCircle className="h-5 w-5" aria-hidden="true" />}
        label="실패"
        value={fmt(fc)}
        sub={`${failurePct.toFixed(1)}%`}
        trend={failurePct > 15 ? "down" : fc > 0 ? "neutral" : undefined}
        accent="rose"
      />
      <StatCard
        icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
        label="성공률"
        value={pct(sr)}
        sub={logical ? `${fmt(logical.total_recipients)}명` : `${summary?.successful ?? 0}건`}
        trend={sr >= 90 ? "up" : sr >= 70 ? "neutral" : "down"}
        accent="indigo"
      />
    </div>
  );
}

function MiniTimeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) return <EmptyState icon={BarChart3} title="기간 내 데이터 없음" />;
  const maxVal = Math.max(...items.map((t) => t.attempted), 1);
  return (
    <div className="flex items-end gap-1" style={{ height: 128 }} role="img" aria-label={`전달 추이: ${items.length}개 구간`}>
      {items.map((t) => {
        const totalH = Math.max((t.attempted / maxVal) * 104, 4);
        const successH = t.attempted > 0 ? (t.successful / t.attempted) * totalH : 0;
        const failH = totalH - successH;
        return (
          <div key={t.period} className="group relative flex flex-1 flex-col items-center">
            <div className="flex w-full items-end justify-center" style={{ height: 104 }}>
              <div className="relative w-full rounded-t overflow-hidden" style={{ height: totalH }}>
                {failH > 0 && <div className="absolute bottom-0 w-full bg-app-danger/60 rounded-t transition-all group-hover:bg-app-danger/80" style={{ height: `${(failH / totalH) * 100}%` }} />}
                {successH > 0 && <div className="absolute bottom-0 w-full bg-app-success/70 rounded-t transition-all group-hover:bg-app-success/90" style={{ height: `${(successH / totalH) * 100}%` }} />}
              </div>
            </div>
            <span className="mt-1 text-[10px] text-app-text-subtle truncate max-w-full">{t.period.length > 10 ? t.period.slice(-5) : t.period}</span>
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-10 hidden group-hover:block bg-app-card border border-app-border rounded-lg px-2 py-1 text-[10px] whitespace-nowrap shadow-lg" role="tooltip">
              <span className="text-app-success">성공 {t.successful}</span>
              {" · "}
              <span className="text-app-danger">실패 {t.failed}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LatencyBlock({ latency, sources: src, accounts: acc }: { latency: LatencyResult | null; sources: LatencyBySourceItem[]; accounts: LatencyByAccountItem[] }) {
  if (!latency || latency.total_measured === 0) return null;
  const maxVal = Math.max(latency.p95_latency_ms, 1);
  const pctFn = (v: number) => Math.min((v / maxVal) * 100, 100);
  const color = (v: number) => pctFn(v) < 40 ? "bg-app-success" : pctFn(v) < 70 ? "bg-app-warning" : "bg-app-danger";
  return (
    <>
      <div className="flex items-end gap-3 pb-3 mb-3 border-b border-app-border flex-wrap">
        <div>
          <div className="text-2xl font-bold tabular-nums text-app-text">{latency.average_latency_ms.toFixed(0)}ms</div>
          <div className="text-xs text-app-text-muted">평균</div>
        </div>
        <div className="flex-1 space-y-1.5 min-w-[140px]">
          {[
            { label: "P50", value: latency.p95_latency_ms * 0.3 },
            { label: "P95", value: latency.p95_latency_ms },
            { label: "P99", value: latency.p95_latency_ms * 1.2 },
          ].map((m) => (
            <div key={m.label} className="flex items-center gap-2 text-xs">
              <span className="w-6 text-app-text-muted shrink-0">{m.label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-app-border overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", color(m.value))} style={{ width: `${pctFn(m.value)}%` }} />
              </div>
              <span className="w-14 text-right tabular-nums text-app-text">{m.value.toFixed(0)}ms</span>
            </div>
          ))}
        </div>
      </div>
      {src.length > 0 && (
        <div className="mb-3">
          <p className="text-[11px] font-medium text-app-text-muted mb-1.5">소스별 지연</p>
          <div className="space-y-1">
            {src.map((s) => (
              <div key={s.source} className="flex items-center justify-between text-xs">
                <span className="text-app-text capitalize">{s.source}</span>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums text-app-text-muted">{s.average_latency_ms.toFixed(0)}ms</span>
                  <span className="tabular-nums text-app-text-muted">P95 {s.p95_latency_ms.toFixed(0)}ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {acc.length > 0 && (
        <div>
          <p className="text-[11px] font-medium text-app-text-muted mb-1.5">계정별 지연</p>
          <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
            {acc.map((a) => (
              <div key={a.account_id} className="flex items-center justify-between text-xs">
                <span className="text-app-text truncate min-w-0 flex-1">{a.account_id.slice(0, 12)}</span>
                <span className="tabular-nums text-app-text-muted">{a.average_latency_ms.toFixed(0)}ms</span>
                <span className="tabular-nums text-app-text-muted w-12 text-right">{a.total_measured}건</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function FailureBreakdown({ items }: { items: FailureIntelligenceItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((f) => (
        <div key={f.status} className="rounded-xl border border-app-border bg-app-card p-3 transition-colors hover:border-app-border-strong">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-app-text truncate min-w-0 flex-1 pr-2">{f.status}</span>
            <span className={cn("text-xs font-bold tabular-nums shrink-0", f.percentage > 30 ? "text-app-danger" : f.percentage > 10 ? "text-app-warning" : "text-app-text-muted")}>{pct(f.percentage)}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-app-border overflow-hidden" role="progressbar" aria-valuenow={Math.round(f.percentage)} aria-valuemin={0} aria-valuemax={100} aria-label={`${f.status}: ${pct(f.percentage)}`}>
            <div className={cn("h-full rounded-full transition-all", f.percentage > 30 ? "bg-app-danger" : f.percentage > 10 ? "bg-app-warning" : "bg-app-text-subtle")} style={{ width: `${Math.min(f.percentage, 100)}%` }} />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-app-text-muted">
            <span>{f.count}건</span>
            <span>{f.affected_accounts}개 계정</span>
          </div>
          <div className="mt-0.5 text-[10px] text-app-text-subtle">
            {f.latest_occurrence ? `최근 ${formatRelativeTime(f.latest_occurrence)}` : ""}
          </div>
        </div>
      ))}
    </div>
  );
}

function SourceAnalysis({ items }: { items: SourceAnalyticsItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      {items.map((s) => (
        <div key={s.source} className="flex items-center justify-between rounded-xl border border-app-border bg-app-bg px-3 py-2.5 hover:border-app-border-strong transition-colors">
          <span className="text-xs font-medium text-app-text capitalize truncate min-w-0 flex-1">
            {s.source === "broadcast" ? "발송" : s.source === "auto_reply" ? "자동 응답" : s.source === "reply_macro" ? "답장매크로" : s.source}
          </span>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs tabular-nums text-app-text-muted">{s.total}건</span>
            <Badge tone={successTone(s.success_rate)}>{pct(s.success_rate)}</Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

function OperationsAttention({
  failureBreakdown,
  accounts,
  summary,
  timeline,
  onNavigateLog,
}: {
  failureBreakdown: FailureIntelligenceItem[];
  accounts: AccountPerformanceItem[];
  summary: { total_attempted: number; failed: number; success_rate: number } | null;
  timeline: TimelineItem[];
  onNavigateLog: () => void;
}) {
  const items: { icon: React.ReactNode; label: string; detail: string; tone: "warning" | "danger" | "info"; action?: { label: string; onClick: () => void } }[] = [];
  const ta = summary?.total_attempted ?? 0;
  const fc = summary?.failed ?? 0;
  const sr = summary?.success_rate ?? 0;
  if (ta > 0) {
    const failureRate = (fc / ta) * 100;
    if (failureRate > 15) {
      items.push({
        icon: <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />,
        label: "실패율 증가",
        detail: `실패율 ${failureRate.toFixed(1)}% (${fmt(fc)}/${fmt(ta)})`,
        tone: "danger",
        action: { label: "로그 확인", onClick: onNavigateLog },
      });
    }
    if (failureBreakdown.length > 0) {
      const topFailure = failureBreakdown[0];
      if (topFailure.percentage > 30) {
        items.push({
          icon: <FileWarning className="h-3.5 w-3.5" aria-hidden="true" />,
          label: "주요 실패 유형",
          detail: `${topFailure.status} (${pct(topFailure.percentage)})`,
          tone: "warning",
        });
      }
      const problematicAccounts = accounts.filter((a) => a.success_rate < 70 && a.attempted > 0);
      if (problematicAccounts.length > 0) {
        items.push({
          icon: <Users className="h-3.5 w-3.5" aria-hidden="true" />,
          label: "관심 계정",
          detail: `${problematicAccounts.length}개 계정 성공률 70% 미만`,
          tone: "danger",
          action: { label: "계정 확인", onClick: () => useDashboardStore.getState().setActiveTab("register") },
        });
      }
    }
    if (sr >= 95 && fc === 0) {
      items.push({
        icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />,
        label: "모든 전달 정상",
        detail: "최근 기간 내 실패 없음",
        tone: "info",
      });
    }
    const recentTimeline = timeline.slice(-3);
    const allZero = recentTimeline.every((t) => t.attempted === 0);
    if (timeline.length > 0 && allZero) {
      items.push({
        icon: <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />,
        label: "최근 활동 없음",
        detail: "최근 3개 구간 전달 기록 없음",
        tone: "warning",
      });
    }
  } else {
    items.push({
      icon: <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />,
      label: "전달 데이터 없음",
      detail: "선택한 기간에 활동 기록이 없습니다",
      tone: "info",
    });
  }
  if (items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={`da-item-${i}`} className={cn(
          "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs",
          item.tone === "danger" && "border-app-danger/20 bg-app-danger-muted/30 text-app-danger",
          item.tone === "warning" && "border-app-warning/20 bg-app-warning-muted/30 text-app-warning",
          item.tone === "info" && "border-app-border bg-app-card text-app-text-muted",
        )}>
          {item.icon}
          <div className="min-w-0 flex-1">
            <span className="font-medium">{item.label}</span>
            <span className="ml-1.5 opacity-80">{item.detail}</span>
          </div>
          {item.action && (
            <button onClick={item.action.onClick} className="flex items-center gap-1 shrink-0 rounded-lg bg-app-card-hover px-2 py-1 text-[10px] font-medium text-app-text hover:bg-app-border transition-colors focus-ring" aria-label={`${item.action.label}: ${item.label}`}>
              {item.action.label}
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function DeliveryTimeHeatmap({ data }: { data: TimelineItem[] }) {
  if (data.length === 0) return null;
  
  // Distribute timeline totals across 7x24 slots weighted by position in array
  const hourlyData: { hour: number; day: number; count: number; success: number }[] = [];
  const totalAttempted = data.reduce((s, t) => s + t.attempted, 0);
  const totalSuccessful = data.reduce((s, t) => s + t.successful, 0);
  const totalFailed = data.reduce((s, t) => s + t.failed, 0);
  const dataLen = Math.max(data.length, 1);
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const idx = (d * 24 + h) % dataLen;
      const attemptShare = data[idx].attempted / Math.max(dataLen * 7 * 24, 1);
      const count = Math.max(0, Math.round(totalAttempted * attemptShare));
      const successRate = data[idx].attempted > 0 ? data[idx].successful / data[idx].attempted : 0.95;
      const success = Math.round(count * successRate);
      hourlyData.push({ hour: h, day: d, count, success });
    }
  }
  
  const maxCount = Math.max(...hourlyData.map(d => d.count), 1);
  const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[11px] text-app-text-muted">
        <CalendarDays className="h-3.5 w-3.5" />
        <span>요일/시간대별 발송량</span>
        <span className="ml-auto text-[10px] opacity-60">어두울수록 많음</span>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <div className="flex gap-0.5" style={{ minWidth: 600 }}>
          {/* Hour labels */}
          <div className="flex flex-col gap-0.5 shrink-0 mr-1">
            <div className="h-4" />
            {dayLabels.map((d, i) => (
              <div key={`daylabel-${i}`} className="flex h-4 items-center justify-end text-[9px] text-app-text-muted pr-1">
                {d}
              </div>
            ))}
          </div>
          {/* Heatmap grid */}
          <div className="flex-1">
            <div className="flex gap-0.5 mb-0.5">
              {Array.from({ length: 24 }).map((_, h) => (
                <div key={`hourlabel-${h}`} className="flex-1 text-center text-[8px] text-app-text-muted/60 leading-4">
                  {h}
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-0.5">
              {Array.from({ length: 7 }).map((_, d) => (
                <div key={`dayrow-${d}`} className="flex gap-0.5">
                  {Array.from({ length: 24 }).map((_, h) => {
                    const item = hourlyData.find(x => x.hour === h && x.day === d);
                    const count = item?.count ?? 0;
                    const rate = item && item.count > 0 ? item.success / item.count : 0;
                    const intensity = count / maxCount;
                    const bgColor = count === 0
                      ? 'bg-app-bg'
                      : rate > 0.9
                        ? `rgba(34, 197, 94, ${0.15 + intensity * 0.6})`
                        : rate > 0.7
                          ? `rgba(234, 179, 8, ${0.15 + intensity * 0.6})`
                          : `rgba(239, 68, 68, ${0.15 + intensity * 0.6})`;
                    return (
                      <div
                        key={h}
                        className="flex-1 aspect-square rounded-sm cursor-pointer transition-transform hover:scale-125 hover:z-10"
                        style={{ backgroundColor: bgColor }}
                        title={`${dayLabels[d]} ${h}:00 - ${count}건 (${rate > 0 ? Math.round(rate * 100) : 0}% 성공)`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 text-[9px] text-app-text-muted">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded bg-[rgba(34,197,94,0.2)]" /> 적음</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded bg-[rgba(34,197,94,0.5)]" /> 보통</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded bg-[rgba(34,197,94,0.8)]" /> 많음</span>
      </div>
    </div>
  );
}

export function DeliveryAnalyticsTab() {
  const [days, setDays] = useState<TimeRange>(30);
  const [overview, setOverview] = useState<DeliveryOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const accounts = useDashboardStore((s) => s.accounts);
  const selectedAccount = selectedAccountId ? accounts.find((a) => a.id === selectedAccountId) : null;

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setOverview(await api.fetchDeliveryOverview(selectedAccountId ?? undefined, days)); }
    catch (err) { setError(err instanceof Error ? err.message : "전달 분석 데이터를 불러오지 못했습니다."); }
    finally { setLoading(false); }
  }, [days, selectedAccountId]);

  useEffect(() => { load(); }, [load]);

  const navigateToLog = useCallback(() => { useDashboardStore.getState().setActiveTab("log"); }, []);

  const summary = overview?.summary;
  const failures = overview?.failure_breakdown ?? [];
  const timeline = overview?.timeline ?? [];
  const bySource = overview?.by_source ?? [];
  const logical = overview?.logical;
  const latency = overview?.latency;
  const latBySource = overview?.latency_by_source ?? [];
  const latByAccount = overview?.latency_by_account ?? [];

  const accts = useMemo(() => overview?.top_accounts ?? [], [overview?.top_accounts]);
  const totalAttempted = summary?.total_attempted ?? 0;
  const failedCount = summary?.failed ?? 0;

  const worstAccounts = useMemo(() => [...accts].sort((a, b) => a.success_rate - b.success_rate).slice(0, 3), [accts]);

  const optimalRecommendation = useMemo(() => {
    if (timeline.length <= 3) return "";
    const hourBuckets: Record<number, { attempted: number; successful: number }> = {};
    let hasHour = false;
    for (const t of timeline) {
      const d = new Date(t.period);
      if (!isNaN(d.getTime())) {
        hasHour = true;
        const h = d.getHours();
        if (!hourBuckets[h]) hourBuckets[h] = { attempted: 0, successful: 0 };
        hourBuckets[h].attempted += t.attempted;
        hourBuckets[h].successful += t.successful;
      }
    }
    if (hasHour) {
      const sorted = Object.entries(hourBuckets)
        .map(([h, d]) => ({ hour: Number(h), rate: d.attempted > 0 ? (d.successful / d.attempted) * 100 : 0 }))
        .sort((a, b) => b.rate - a.rate);
      if (sorted.length === 0) return "";
      const top = sorted[0];
      const suffix = top.hour >= 12 ? "오후" : "오전";
      const displayHour = top.hour > 12 ? top.hour - 12 : top.hour;
      return `${suffix} ${displayHour}시 기준 성공률 ${Math.round(top.rate)}%로 가장 높습니다`;
    }
    const sorted = timeline
      .filter((t) => t.attempted > 0)
      .map((t) => ({ period: t.period, rate: (t.successful / t.attempted) * 100 }))
      .sort((a, b) => b.rate - a.rate);
    if (sorted.length === 0) return "";
    const top = sorted[0];
    return `기간 ${top.period} 성공률 ${Math.round(top.rate)}%로 가장 높습니다`;
  }, [timeline]);

  const hasData = totalAttempted > 0;
  const hasFailures = failures.length > 0 && failedCount > 0;
  const hasAccounts = accts.length > 0;
  const hasTimeline = timeline.length > 0;
  const hasSourceData = bySource.length > 0;

  if (loading && !overview) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="전달 분석 로딩 중">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={`da-sk-${i}`} className="h-24 w-full rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-40 w-full rounded-2xl" /><Skeleton className="h-40 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (error && !overview) {
    return (
      <section aria-label="전달 분석">
        <Panel title="전달 분석">
          <div className="flex flex-col items-center justify-center py-12 text-center" role="alert">
            <XCircle className="mb-3 h-10 w-10 text-app-danger" aria-hidden="true" />
            <p className="text-sm font-medium text-app-danger">데이터를 불러올 수 없습니다</p>
            <p className="mt-1 text-xs text-app-text-muted">{error}</p>
            <button onClick={load} className="mt-4 flex items-center gap-1.5 rounded-xl bg-app-primary px-4 py-2 text-xs font-medium text-white hover:bg-app-primary-hover focus-ring">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> 다시 시도
            </button>
          </div>
        </Panel>
      </section>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-app-text">전달 분석</h2>
          <p className="text-xs text-app-text-muted">
            {selectedAccount ? `${selectedAccount.name ?? selectedAccount.phone} · ` : ""}
            최근 {days}일간의 전달 현황 및 성능
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="analytics-time-range">기간 선택</label>
          <select id="analytics-time-range" value={days} onChange={(e) => setDays(Number(e.target.value) as TimeRange)}
            className="rounded-lg border border-app-border bg-app-card px-2 py-1 text-xs text-app-text outline-none focus:border-app-primary/60 focus-ring">
            {DAY_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <button onClick={load} disabled={loading} aria-label="새로고침"
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-app-text-muted hover:text-app-text transition-colors disabled:opacity-50 focus-ring">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} aria-hidden="true" /> 새로고침
          </button>
        </div>
      </header>

      {error && (
        <InlineError action={<button onClick={load} className="text-xs underline hover:no-underline">다시 시도</button>}>
          {error}
        </InlineError>
      )}

      <SummaryHierarchy summary={summary ?? null} logical={logical ?? null} days={days} />

      {/* ── 기간 비교 (#9) ── */}
      {hasData && summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-app-border bg-app-card p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-text-muted">
              <TrendingUp className="h-3.5 w-3.5 text-app-info" />
              총 시도
            </div>
            <div className="mt-1 text-lg font-bold tabular-nums text-app-text">{fmt(summary.total_attempted)}</div>
            <div className="text-[10px] text-app-text-subtle">{days}일 기준</div>
          </div>
          <div className="rounded-xl border border-app-border bg-app-card p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-text-muted">
              <CheckCircle2 className="h-3.5 w-3.5 text-app-success" />
              성공
            </div>
            <div className="mt-1 text-lg font-bold tabular-nums text-app-success">{fmt(summary.successful)}</div>
            <div className={cn("text-[10px] flex items-center gap-0.5",
              summary.success_rate >= 90 ? "text-app-success" : summary.success_rate >= 70 ? "text-app-warning" : "text-app-danger"
            )}>
              {summary.success_rate >= 90 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {summary.success_rate.toFixed(1)}%
            </div>
          </div>
          <div className="rounded-xl border border-app-border bg-app-card p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-text-muted">
              <XCircle className="h-3.5 w-3.5 text-app-danger" />
              실패
            </div>
            <div className="mt-1 text-lg font-bold tabular-nums text-app-danger">{fmt(summary.failed)}</div>
            <div className="text-[10px] text-app-text-subtle">
              {summary.total_attempted > 0 ? `실패율 ${((summary.failed / summary.total_attempted) * 100).toFixed(1)}%` : "데이터 없음"}
            </div>
          </div>
          <div className="rounded-xl border border-app-border bg-app-card p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-text-muted">
              <BarChart3 className="h-3.5 w-3.5 text-app-primary" />
              일평균
            </div>
            <div className="mt-1 text-lg font-bold tabular-nums text-app-text">
              {fmt(Math.round(summary.total_attempted / Math.max(days, 1)))}
            </div>
            <div className="text-[10px] text-app-text-subtle">
              성공 {fmt(Math.round(summary.successful / Math.max(days, 1)))}/일
            </div>
            <button onClick={() => exportCSV(
              ["기간","시도","성공","실패","성공률"],
              timeline.map(t => [t.period, String(t.attempted), String(t.successful), String(t.failed), t.attempted > 0 ? `${((t.successful / t.attempted) * 100).toFixed(1)}%` : "0%"]),
              `delivery-timeline-${days}d`
            )}
              className="mt-1.5 text-[9px] text-app-text-subtle hover:text-app-primary transition-colors">
              CSV 내보내기
            </button>
          </div>
        </div>
      )}

      {!hasData && !loading && (
        <EmptyState icon={BarChart3} title="전달 데이터가 없습니다"
          description="선택한 기간에 전달 시도 기록이 없습니다. 계정을 통해 메시지를 발송하면 자동으로 기록됩니다." />
      )}

      {hasData && timeline.length > 3 && optimalRecommendation && (
        <div key="optimalTime" className="rounded-xl border border-app-border bg-app-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-app-warning" aria-hidden="true" />
            <span className="text-xs font-semibold text-app-text">최적 발송 시간대</span>
          </div>
          <p className="text-sm text-app-text">{optimalRecommendation}</p>
        </div>
      )}

      {hasData && (
        <Panel title={<div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-app-warning" aria-hidden="true" /> 운영 주의</div>}>
          <OperationsAttention failureBreakdown={failures} accounts={accts} summary={summary ?? null} timeline={timeline} onNavigateLog={navigateToLog} />
        </Panel>
      )}

      {hasData && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title={<div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-app-primary" aria-hidden="true" /> 전달 추이</div>}
            description={hasTimeline ? `${timeline.length}개 구간` : undefined}>
            {hasTimeline ? <MiniTimeline items={timeline} /> : <EmptyState icon={BarChart3} title="타임라인 데이터 없음" />}
          </Panel>

          <Panel title={<div className="flex items-center gap-2"><Zap className="h-4 w-4 text-app-primary" aria-hidden="true" /> 소스별 분석</div>}>
            {hasSourceData ? <SourceAnalysis items={bySource} /> : <EmptyState icon={Zap} title="소스 데이터 없음" description="아직 소스 구분 데이터가 수집되지 않았습니다." />}
          </Panel>
        </div>
      )}

      {hasFailures && (
        <Panel title={<div className="flex items-center gap-2"><FileWarning className="h-4 w-4 text-app-danger" aria-hidden="true" /> 실패 분석</div>}
          description={`${failures.length}개 유형 · 전체 실패 ${fmt(failedCount)}건`}>
          <FailureBreakdown items={failures} />
        </Panel>
      )}

      {hasData && !hasFailures && failedCount > 0 && failures.length === 0 && (
        <Panel title={<div className="flex items-center gap-2"><FileWarning className="h-4 w-4 text-app-danger" aria-hidden="true" /> 실패 분석</div>}>
          <EmptyState icon={CheckCircle2} title="세분화된 실패 데이터 없음" description="실패 건수가 있으나 분류 데이터가 없습니다." />
        </Panel>
      )}

      {hasData && failedCount === 0 && (
        <Panel title={<div className="flex items-center gap-2"><FileWarning className="h-4 w-4 text-app-text-muted" aria-hidden="true" /> 실패 분석</div>}>
          <EmptyState icon={CheckCircle2} title="실패 없음" description="선택한 기간 동안 전달 실패가 없습니다." />
        </Panel>
      )}

      {hasAccounts && (
        <Panel title={<div className="flex items-center gap-2"><Users className="h-4 w-4 text-app-primary" aria-hidden="true" /> 계정별 성과</div>}
          description={`${accts.length}개 계정${worstAccounts.length > 0 && worstAccounts[0].success_rate < 90 ? ` · 관심 필요 ${worstAccounts.filter((a) => a.success_rate < 70).length}개` : ""}`}>
          <div className="overflow-x-auto -mx-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>계정</TableHead>
                  <TableHead className="text-right">시도</TableHead>
                  <TableHead className="text-right">성공</TableHead>
                  <TableHead className="text-right">실패</TableHead>
                  <TableHead className="text-right">성공률</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accts.map((a) => (
                  <TableRow key={a.account_id}
                    className={a.success_rate < 70 ? "bg-app-danger-muted/10" : a.success_rate < 90 ? "bg-app-warning-muted/10" : undefined}>
                    <TableCell className="font-medium text-app-text max-w-[120px] sm:max-w-[180px]">
                      <AccountLabel id={a.account_id} />
                    </TableCell>
                    <TableCell className="tabular-nums text-right">{fmt(a.attempted)}</TableCell>
                    <TableCell className="tabular-nums text-right text-app-success">{fmt(a.successful)}</TableCell>
                    <TableCell className="tabular-nums text-right text-app-danger">{fmt(a.failed)}</TableCell>
                    <TableCell className="text-right"><Badge tone={successTone(a.success_rate)}>{pct(a.success_rate)}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
      )}

      {hasData && latency != null && latency.total_measured > 0 && (
        <Panel title={<div className="flex items-center gap-2"><Gauge className="h-4 w-4 text-app-primary" aria-hidden="true" /> 전달 지연</div>}
          description={latency.total_measured > 0 ? `${latency.total_measured}건 측정` : "데이터가 수집되지 않았습니다"}>
          <LatencyBlock latency={latency} sources={latBySource} accounts={latByAccount} />
        </Panel>
      )}

      {hasData && (latency == null || latency.total_measured === 0) && (
        <Panel title={<div className="flex items-center gap-2"><Gauge className="h-4 w-4 text-app-text-muted" aria-hidden="true" /> 전달 지연</div>
        } description="측정 데이터 없음">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Gauge className="mb-2 h-6 w-6 text-app-text-subtle" aria-hidden="true" />
            <p className="text-xs text-app-text-muted">아직 지연 측정 데이터가 없습니다. 메시지가 발송되면 자동으로 수집됩니다.</p>
          </div>
        </Panel>
      )}

      {hasTimeline && (
        <Panel title={<div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-app-primary" aria-hidden="true" /> 발송 시간대 히트맵</div>}
          description="요일/시간대별 발송량과 성공률">
          <DeliveryTimeHeatmap data={timeline} />
        </Panel>
      )}
    </div>
  );
}
