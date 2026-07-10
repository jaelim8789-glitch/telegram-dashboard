"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, BarChart3, CheckCircle2, Clock,
  RefreshCw, TrendingUp, Users, XCircle,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineError } from "@/components/ui/InlineError";
import { cn } from "@/lib/cn";
import { useDashboardStore } from "@/store/useDashboardStore";
import * as api from "@/lib/api";
import type {
  DeliveryOverview, AccountPerformanceItem,
  FailureIntelligenceItem, TimelineItem,
} from "@/types";

function formatPct(value: number): string {
  return `${Math.round(value)}%`;
}

function successTone(rate: number): "success" | "warning" | "danger" {
  if (rate >= 90) return "success";
  if (rate >= 70) return "warning";
  return "danger";
}

function StatCard({
  icon, label, value, sub, accent = "from-indigo-500 to-purple-500",
}: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; accent?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-app-border bg-app-card p-4 transition-all duration-200 hover:border-app-border-strong hover:bg-app-card-hover">
      <div className="flex items-start justify-between">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm", `bg-gradient-to-br ${accent}`)}>
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold tracking-tight text-app-text">{value}</div>
        <div className="mt-0.5 text-xs text-app-text-muted">{label}</div>
        {sub && <div className="mt-0.5 text-[11px] text-app-text-subtle">{sub}</div>}
      </div>
    </div>
  );
}

function MiniTimeline({ items, loading, error }: { items: TimelineItem[]; loading: boolean; error: string | null }) {
  if (loading) return <Skeleton className="h-32 w-full" />;
  if (error) return <InlineError>{error}</InlineError>;
  if (items.length === 0) return <EmptyState icon={BarChart3} title="타임라인 데이터 없음" />;

  const maxVal = Math.max(...items.map((t) => t.attempted), 1);
  return (
    <div className="flex items-end gap-1">
      {items.map((t) => {
        const h = Math.max((t.attempted / maxVal) * 80, 4);
        const successPct = t.attempted > 0 ? (t.successful / t.attempted) * 100 : 0;
        return (
          <div key={t.period} className="group relative flex flex-1 flex-col items-center">
            <div className="flex w-full items-end justify-center" style={{ height: 80 }}>
              <div
                className={cn(
                  "w-full rounded-t transition-colors",
                  successPct >= 90 ? "bg-app-success" : successPct >= 70 ? "bg-app-warning" : "bg-app-danger"
                )}
                style={{ height: h }}
              />
            </div>
            <span className="mt-1 text-[10px] text-app-text-subtle">{t.period.slice(5)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function DeliveryAnalyticsTab() {
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);

  const [overview, setOverview] = useState<DeliveryOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.fetchDeliveryOverview(selectedAccountId ?? undefined, days);
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "전달 분석 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId, days]);

  useEffect(() => { load(); }, [load]);

  const summary = overview?.summary;
  const accounts = overview?.top_accounts ?? [];
  const failures = overview?.failure_breakdown ?? [];
  const timeline = overview?.timeline ?? [];
  const bySource = overview?.by_source ?? [];
  const logical = overview?.logical;
  const latency = overview?.latency;

  if (loading && !overview) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
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
          <button
            onClick={load}
            className="mt-4 flex items-center gap-1.5 rounded-xl bg-app-primary px-4 py-2 text-xs font-medium text-white hover:bg-app-primary-hover"
          >
            <RefreshCw className="h-3.5 w-3.5" /> 다시 시도
          </button>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-app-text">메시지 전달 분석</h2>
          <p className="text-xs text-app-text-muted">최근 {days}일간의 전달 현황</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-app-border bg-app-card px-2 py-1 text-xs text-app-text"
          >
            <option value={7}>7일</option>
            <option value={14}>14일</option>
            <option value={30}>30일</option>
            <option value={90}>90일</option>
          </select>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-app-text-muted hover:text-app-text transition-colors"
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} /> 새로고침
          </button>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          icon={<BarChart3 className="h-5 w-5" />}
          label="총 전달 시도"
          value={summary?.total_attempted ?? 0}
          accent="from-indigo-500 to-purple-500"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="성공"
          value={summary?.successful ?? 0}
          sub={summary ? formatPct(summary.success_rate) : undefined}
          accent="from-emerald-500 to-teal-500"
        />
        <StatCard
          icon={<XCircle className="h-5 w-5" />}
          label="실패"
          value={summary?.failed ?? 0}
          sub={summary && summary.failed > 0 ? `${Math.round((summary.failed / summary.total_attempted) * 100)}%` : undefined}
          accent="from-rose-500 to-pink-500"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="성공률"
          value={summary ? formatPct(summary.success_rate) : "-"}
          accent="from-orange-500 to-amber-500"
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="고유 수신자"
          value={logical?.total_recipients ?? "-"}
          sub={logical ? formatPct(logical.success_rate) : undefined}
          accent="from-cyan-500 to-blue-500"
        />
      </div>

      {/* Two-column: Timeline + Source breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title={<div className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> 전달 타임라인</div>}>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : timeline.length === 0 ? (
            <EmptyState icon={BarChart3} title="타임라인 데이터 없음" description="선택한 기간에 전달 기록이 없습니다" />
          ) : (
            <MiniTimeline items={timeline} loading={false} error={null} />
          )}
        </Panel>

        <Panel title={<div className="flex items-center gap-2"><TrendingUp className="h-4 w-4" /> 소스별 분석</div>}>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : bySource.length === 0 ? (
            <EmptyState icon={TrendingUp} title="소스 데이터 없음" />
          ) : (
            <div className="space-y-2">
              {bySource.map((s) => (
                <div key={s.source} className="flex items-center justify-between rounded-xl border border-app-border bg-app-bg px-3 py-2">
                  <span className="text-xs font-medium text-app-text capitalize">{s.source}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs tabular-nums text-app-text-muted">{s.total}건</span>
                    <Badge tone={successTone(s.success_rate)}>{formatPct(s.success_rate)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Account performance */}
      <Panel
        title={<div className="flex items-center gap-2"><Users className="h-4 w-4" /> 계정별 전달 성과</div>}
        description="각 계정의 전달 시도 및 성공률"
      >
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : accounts.length === 0 ? (
          <EmptyState icon={Users} title="계정 데이터 없음" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>계정 ID</TableHead>
                <TableHead>시도</TableHead>
                <TableHead>성공</TableHead>
                <TableHead>실패</TableHead>
                <TableHead>성공률</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((a: AccountPerformanceItem) => (
                <TableRow key={a.account_id}>
                  <TableCell className="font-medium">{a.account_id.slice(0, 8)}...</TableCell>
                  <TableCell className="tabular-nums">{a.attempted}</TableCell>
                  <TableCell className="tabular-nums text-app-success">{a.successful}</TableCell>
                  <TableCell className="tabular-nums text-app-danger">{a.failed}</TableCell>
                  <TableCell>
                    <Badge tone={successTone(a.success_rate)}>{formatPct(a.success_rate)}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      {/* Failure intelligence */}
      <Panel
        title={<div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> 실패 분석</div>}
        description="실패 유형별 분포"
      >
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : failures.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="실패 없음" description="선택한 기간에 전달 실패가 없습니다" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>실패 유형</TableHead>
                <TableHead>건수</TableHead>
                <TableHead>비율</TableHead>
                <TableHead>영향받은 계정</TableHead>
                <TableHead>최근 발생</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {failures.map((f: FailureIntelligenceItem) => (
                <TableRow key={f.status}>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-app-danger" />
                      {f.status}
                    </span>
                  </TableCell>
                  <TableCell className="tabular-nums">{f.count}</TableCell>
                  <TableCell className="tabular-nums">{formatPct(f.percentage)}</TableCell>
                  <TableCell className="tabular-nums">{f.affected_accounts}</TableCell>
                  <TableCell className="text-xs text-app-text-muted">
                    {f.latest_occurrence ? new Date(f.latest_occurrence).toLocaleString("ko-KR") : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      {/* Latency (if available) */}
      {latency && latency.total_measured > 0 && (
        <Panel title={<div className="flex items-center gap-2"><Clock className="h-4 w-4" /> 전달 지연</div>}>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold tabular-nums text-app-text">{latency.average_latency_ms.toFixed(0)}ms</div>
              <div className="text-xs text-app-text-muted">평균 지연</div>
            </div>
            <div>
              <div className="text-2xl font-bold tabular-nums text-app-text">{latency.p95_latency_ms.toFixed(0)}ms</div>
              <div className="text-xs text-app-text-muted">P95 지연</div>
            </div>
            <div>
              <div className="text-2xl font-bold tabular-nums text-app-text">{latency.total_measured}</div>
              <div className="text-xs text-app-text-muted">측정된 전달</div>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
