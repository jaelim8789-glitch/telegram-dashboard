"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDown, ArrowUp, BarChart3, CheckCircle2,
  FileWarning, Gauge, RefreshCw, TrendingUp, Users, XCircle, Zap,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineError } from "@/components/ui/InlineError";
import { cn } from "@/lib/cn";
import * as api from "@/lib/api";
import type {
  DeliveryOverview, AccountPerformanceItem,
  FailureIntelligenceItem, TimelineItem,
  SourceAnalyticsItem, LatencyResult, LatencyBySourceItem, LatencyByAccountItem,
} from "@/types";

const DAY_OPTIONS = [
  { value: 7, label: "7일" },
  { value: 14, label: "14일" },
  { value: 30, label: "30일" },
  { value: 90, label: "90일" },
] as const;

function pct(n: number): string { return `${Math.round(n)}%`; }
function fmt(n: number): string { return n.toLocaleString("ko-KR"); }

function successTone(rate: number): "success" | "warning" | "danger" {
  if (rate >= 90) return "success";
  if (rate >= 70) return "warning";
  return "danger";
}

function relativeTime(iso: string | null): string {
  if (!iso) return "-";
  const diffMs = Date.now() - new Date(`${iso}Z`).getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

function StatCard({
  icon, label, value, sub, accent, trend,
}: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; accent?: string; trend?: { dir: "up" | "down" | "neutral"; text: string };
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-app-border bg-app-card p-4 transition-all hover:border-app-border-strong hover:shadow-sm">
      <div className={cn("absolute inset-0 opacity-[0.03]", accent && `bg-gradient-to-br ${accent}`)} />
      <div className="relative flex items-start justify-between">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm", accent)}>{icon}</div>
        {trend && (
          <div className={cn(
            "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
            trend.dir === "up" && "bg-app-success-muted text-app-success",
            trend.dir === "down" && "bg-app-danger-muted text-app-danger",
            trend.dir === "neutral" && "bg-app-card-hover text-app-text-muted",
          )}>
            {trend.dir === "up" ? <ArrowUp className="h-2.5 w-2.5" /> : trend.dir === "down" ? <ArrowDown className="h-2.5 w-2.5" /> : null}{trend.text}
          </div>
        )}
      </div>
      <div className="relative mt-3">
        <div className="text-2xl font-bold tracking-tight text-app-text">{value}</div>
        <div className="mt-0.5 text-xs text-app-text-muted">{label}</div>
        {sub && <div className="mt-0.5 text-[11px] text-app-text-subtle">{sub}</div>}
      </div>
    </div>
  );
}

function MiniTimeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) return <EmptyState icon={BarChart3} title="기간 내 데이터 없음" />;
  const maxVal = Math.max(...items.map((t) => t.attempted), 1);
  return (
    <div className="flex items-end gap-1 h-24">
      {items.map((t) => {
        const totalH = Math.max((t.attempted / maxVal) * 80, 4);
        const successH = t.attempted > 0 ? (t.successful / t.attempted) * totalH : 0;
        const failH = totalH - successH;
        return (
          <div key={t.period} className="group relative flex flex-1 flex-col items-center">
            <div className="flex w-full items-end justify-center" style={{ height: 80 }}>
              <div className="relative w-full rounded-t overflow-hidden" style={{ height: totalH }}>
                {failH > 0 && <div className="absolute bottom-0 w-full bg-app-danger/60 rounded-t transition-all group-hover:bg-app-danger/80" style={{ height: `${(failH / totalH) * 100}%` }} />}
                {successH > 0 && <div className="absolute bottom-0 w-full bg-app-success/70 rounded-t transition-all group-hover:bg-app-success/90" style={{ height: `${(successH / totalH) * 100}%` }} />}
              </div>
            </div>
            <span className="mt-1 text-[10px] text-app-text-subtle">{t.period.slice(5)}</span>
            <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-10 hidden group-hover:block bg-app-card border border-app-border rounded-lg px-2 py-1 text-[10px] whitespace-nowrap shadow-lg">
              성공 {t.successful} · 실패 {t.failed}
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
      <div className="flex items-end gap-3 pb-3 mb-3 border-b border-app-border">
        <div>
          <div className="text-2xl font-bold tabular-nums text-app-text">{latency.average_latency_ms.toFixed(0)}ms</div>
          <div className="text-xs text-app-text-muted">평균</div>
        </div>
        <div className="flex-1 space-y-1.5">
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

export function DeliveryAnalyticsTab() {
  const [days, setDays] = useState(30);
  const [overview, setOverview] = useState<DeliveryOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setOverview(await api.fetchDeliveryOverview(undefined, days)); }
    catch (err) { setError(err instanceof Error ? err.message : "전달 분석 데이터를 불러오지 못했습니다."); }
    finally { setLoading(false); }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const summary = overview?.summary;
  const accts = overview?.top_accounts ?? [];
  const failures = overview?.failure_breakdown ?? [];
  const timeline = overview?.timeline ?? [];
  const bySource = overview?.by_source ?? [];
  const logical = overview?.logical;
  const latency = overview?.latency;
  const latBySource = overview?.latency_by_source ?? [];
  const latByAccount = overview?.latency_by_account ?? [];

  const totalAttempted = summary?.total_attempted ?? 0;
  const successRate = summary?.success_rate ?? 0;
  const failedCount = summary?.failed ?? 0;

  const worstAccounts = [...accts].sort((a, b) => a.success_rate - b.success_rate).slice(0, 3);

  if (loading && !overview) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-40 w-full rounded-2xl" /><Skeleton className="h-40 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (error && !overview) {
    return (
      <Panel title="전달 분석">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <XCircle className="mb-3 h-10 w-10 text-app-danger" />
          <p className="text-sm font-medium text-app-danger">데이터를 불러올 수 없습니다</p>
          <p className="mt-1 text-xs text-app-text-muted">{error}</p>
          <button onClick={load} className="mt-4 flex items-center gap-1.5 rounded-xl bg-app-primary px-4 py-2 text-xs font-medium text-white hover:bg-app-primary-hover">
            <RefreshCw className="h-3.5 w-3.5" /> 다시 시도
          </button>
        </div>
      </Panel>
    );
  }

  const hasData = totalAttempted > 0;

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-app-text">전달 분석</h2>
          <p className="text-xs text-app-text-muted">최근 {days}일간의 전달 현황 및 성능</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-app-border bg-app-card px-2 py-1 text-xs text-app-text outline-none focus:border-app-primary/60">
            {DAY_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-app-text-muted hover:text-app-text transition-colors disabled:opacity-50">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> 새로고침
          </button>
        </div>
      </div>

      {error && <InlineError>{error}</InlineError>}

      {/* Summary KPIs */}
      {hasData && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard icon={<BarChart3 className="h-5 w-5" />} label="총 시도" value={fmt(totalAttempted)}
            sub={`기간 ${days}일`} accent="from-indigo-500 to-purple-600" />
          <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="성공" value={fmt(summary!.successful)}
            sub={pct(successRate)} accent="from-emerald-500 to-teal-600"
            trend={successRate >= 90 ? { dir: "up", text: "양호" } : successRate >= 70 ? { dir: "neutral", text: "보통" } : { dir: "down", text: "저조" }} />
          <StatCard icon={<XCircle className="h-5 w-5" />} label="실패" value={fmt(failedCount)}
            sub={failedCount > 0 ? `${((failedCount / totalAttempted) * 100).toFixed(1)}%` : "-"} accent="from-rose-500 to-pink-600" />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} label="성공률" value={pct(successRate)}
            sub={`${fmt(summary!.successful)}건 성공`} accent="from-orange-500 to-amber-600" />
          <StatCard icon={<Users className="h-5 w-5" />} label="고유 수신자" value={logical?.total_recipients != null ? fmt(logical.total_recipients) : "-"}
            sub={logical ? `성공률 ${pct(logical.success_rate)}` : undefined} accent="from-cyan-500 to-blue-600" />
        </div>
      )}

      {/* No-data state */}
      {!hasData && !loading && (
        <EmptyState icon={BarChart3} title="전달 데이터가 없습니다"
          description="선택한 기간에 전달 시도 기록이 없습니다. 계정을 통해 메시지를 발송하면 자동으로 기록됩니다." />
      )}

      {/* Two-column: Timeline + Source */}
      {hasData && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title={<div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-app-primary" /> 전달 추이</div>}
            description={timeline.length > 0 ? `${timeline.length}개 구간` : undefined}>
            {timeline.length > 0 ? <MiniTimeline items={timeline} /> : (
              <EmptyState icon={BarChart3} title="타임라인 데이터 없음" />
            )}
          </Panel>

          <Panel title={<div className="flex items-center gap-2"><Zap className="h-4 w-4 text-app-primary" /> 소스별 분석</div>}>
            {bySource.length === 0 ? (
              <EmptyState icon={Zap} title="소스 데이터 없음" />
            ) : (
              <div className="space-y-2">
                {bySource.map((s: SourceAnalyticsItem) => (
                  <div key={s.source} className="flex items-center justify-between rounded-xl border border-app-border bg-app-bg px-3 py-2 hover:border-app-border-strong transition-colors">
                    <span className="text-xs font-medium text-app-text capitalize">{s.source === "broadcast" ? "발송" : s.source === "auto_reply" ? "자동 응답" : s.source === "reply_macro" ? "답장매크로" : s.source}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs tabular-nums text-app-text-muted">{s.total}건</span>
                      <Badge tone={successTone(s.success_rate)}>{pct(s.success_rate)}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* Latency panel */}
      {hasData && latency != null && latency.total_measured > 0 && (
        <Panel title={<div className="flex items-center gap-2"><Gauge className="h-4 w-4 text-app-primary" /> 전달 지연</div>}
          description={`${latency.total_measured}건 측정`}>
          <LatencyBlock latency={latency} sources={latBySource} accounts={latByAccount} />
        </Panel>
      )}

      {/* Account performance */}
      {accts.length > 0 && (
        <Panel title={<div className="flex items-center gap-2"><Users className="h-4 w-4 text-app-primary" /> 계정별 성과</div>}
          description={`${accts.length}개 계정${worstAccounts.length > 0 && worstAccounts[0].success_rate < 90 ? ` · 관심 필요 ${worstAccounts.filter((a) => a.success_rate < 70).length}개` : ""}`}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>계정</TableHead>
                <TableHead>시도</TableHead>
                <TableHead>성공</TableHead>
                <TableHead>실패</TableHead>
                <TableHead>성공률</TableHead>
                <TableHead>최근 활동</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accts.map((a: AccountPerformanceItem) => (
                <TableRow key={a.account_id} className={a.success_rate < 70 ? "bg-app-danger-muted/10" : a.success_rate < 90 ? "bg-app-warning-muted/10" : undefined}>
                  <TableCell className="font-medium text-app-text">{a.account_id.slice(0, 8)}...</TableCell>
                  <TableCell className="tabular-nums">{a.attempted}</TableCell>
                  <TableCell className="tabular-nums text-app-success">{a.successful}</TableCell>
                  <TableCell className="tabular-nums text-app-danger">{a.failed}</TableCell>
                  <TableCell><Badge tone={successTone(a.success_rate)}>{pct(a.success_rate)}</Badge></TableCell>
                  <TableCell className="text-xs text-app-text-muted tabular-nums">-</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      )}

      {/* Failure intelligence */}
      {failures.length > 0 && (
        <Panel title={<div className="flex items-center gap-2"><FileWarning className="h-4 w-4 text-app-danger" /> 실패 분석</div>}
          description={`${failures.length}개 유형 · 전체 실패 ${fmt(failedCount)}건`}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {failures.map((f: FailureIntelligenceItem) => (
              <div key={f.status} className="rounded-xl border border-app-border bg-app-card p-3 transition-colors hover:border-app-border-strong">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-app-text truncate min-w-0 flex-1 pr-2">{f.status}</span>
                  <span className={cn("text-xs font-bold tabular-nums shrink-0", f.percentage > 30 ? "text-app-danger" : f.percentage > 10 ? "text-app-warning" : "text-app-text-muted")}>{pct(f.percentage)}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-app-border overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", f.percentage > 30 ? "bg-app-danger" : f.percentage > 10 ? "bg-app-warning" : "bg-app-text-subtle")} style={{ width: `${Math.min(f.percentage, 100)}%` }} />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-app-text-muted">
                  <span>{f.count}건</span>
                  <span>{f.affected_accounts}개 계정</span>
                </div>
                <div className="mt-0.5 text-[10px] text-app-text-subtle">
                  {f.latest_occurrence ? `최근 ${relativeTime(f.latest_occurrence)}` : ""}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
