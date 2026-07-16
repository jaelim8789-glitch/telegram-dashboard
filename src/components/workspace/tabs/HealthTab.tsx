"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HeartPulse, AlertTriangle, CheckCircle2, XCircle, Clock, ShieldAlert,
  ShieldOff, Ban, TrendingUp, TrendingDown, Activity, RefreshCw,
  Users, Search, X, AlertCircle, Gauge, Zap,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import * as api from "@/lib/api";
import type { HealthSummary, HealthTrendPoint } from "@/lib/api";
import type { AccountHealthItem } from "@/types";
import { useDashboardStore } from "@/store/useDashboardStore";
import { formatRelativeTime } from "@/lib/formatTime";

const HEALTH_LABELS: Record<string, { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral"; icon: typeof Activity }> = {
  healthy: { label: "정상", tone: "success", icon: CheckCircle2 },
  unauthorized: { label: "인증 필요", tone: "warning", icon: ShieldAlert },
  banned: { label: "차단", tone: "danger", icon: Ban },
  rate_limited: { label: "제한", tone: "warning", icon: Clock },
  error: { label: "오류", tone: "danger", icon: AlertTriangle },
  not_configured: { label: "미설정", tone: "neutral", icon: ShieldOff },
  unknown: { label: "알 수 없음", tone: "neutral", icon: Activity },
};

function MiniTrendChart({ trend }: { trend: HealthTrendPoint[] }) {
  if (trend.length === 0) return null;
  const maxVal = Math.max(...trend.map((t) => t.total), 1);
  return (
    <div className="flex items-end gap-0.5 h-20" role="img" aria-label="건강 트렌드 차트">
      {trend.map((t, i) => {
        const h = Math.max((t.total / maxVal) * 64, 2);
        const color = t.success_rate >= 90 ? "bg-app-success" : t.success_rate >= 70 ? "bg-app-warning" : "bg-app-danger";
        return (
          <div key={i} className="group relative flex-1 flex flex-col items-center">
            <div className="w-full rounded-t" style={{ height: h, backgroundColor: t.total > 0 ? undefined : undefined }}>
              <div className={cn("w-full rounded-t transition-all", color)} style={{ height: `${Math.max(t.success_rate, 2)}%` }} />
            </div>
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-app-card border border-app-border rounded-lg px-2 py-1 text-[9px] whitespace-nowrap shadow-lg z-10">
              {t.date.slice(5)}: {t.successful}/{t.total} ({t.success_rate}%)
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HealthScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? "text-app-success" : score >= 50 ? "text-app-warning" : "text-app-danger";
  const strokeColor = score >= 80 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444";
  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3" className="text-app-border" />
        <circle cx="18" cy="18" r="15.5" fill="none" stroke={strokeColor} strokeWidth="3"
          strokeDasharray={`${score * 0.97} 100`} strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn("text-lg font-bold", color)}>{score}</span>
      </div>
    </div>
  );
}

export function HealthTab() {
  const accounts = useDashboardStore((s) => s.accounts);
  const { toast } = useToast();

  const [healthItems, setHealthItems] = useState<AccountHealthItem[]>([]);
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [trend, setTrend] = useState<HealthTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [trendDays, setTrendDays] = useState(14);

  const loadAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [items, sum, tr] = await Promise.all([
        api.fetchAccountHealth(),
        api.fetchHealthSummary(),
        api.fetchHealthTrend(trendDays),
      ]);
      setHealthItems(items);
      setSummary(sum);
      setTrend(tr.trend);
    } catch (err) {
      setError(err instanceof Error ? err.message : "건강 데이터를 불러오지 못했습니다.");
    } finally { setLoading(false); }
  }, [trendDays]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const filteredItems = useMemo(() => {
    return healthItems.filter((h) => {
      if (search && !h.phone.includes(search) && !(h.name ?? "").includes(search)) return false;
      if (statusFilter && h.status !== statusFilter) return false;
      return true;
    });
  }, [healthItems, search, statusFilter]);

  const problemItems = useMemo(() => {
    return healthItems.filter((h) => h.status !== "healthy" && h.status !== "unknown");
  }, [healthItems]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    healthItems.forEach((h) => { counts[h.status] = (counts[h.status] || 0) + 1; });
    return counts;
  }, [healthItems]);

  if (loading && healthItems.length === 0) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-app-text">계정 건강</h1>
          <p className="text-xs text-app-text-muted">계정 상태 모니터링 및 건강 점수</p>
        </div>
        <button onClick={loadAll} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors">
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> 새로고침
        </button>
      </header>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-app-border bg-gradient-to-br from-app-card to-app-bg p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-text-muted">
              <HeartPulse className="h-3.5 w-3.5 text-app-success" /> 건강 점수
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-lg font-bold tabular-nums text-app-text">{summary.average_health_score}</span>
              <span className="text-[10px] text-app-text-muted">/ 100</span>
            </div>
            <div className="text-[10px] text-app-text-subtle">
              {summary.healthy_count}/{summary.total} 정상
            </div>
          </div>
          <div className="rounded-xl border border-app-border bg-gradient-to-br from-app-card to-app-bg p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-text-muted">
              <Activity className="h-3.5 w-3.5 text-app-info" /> 성공률
            </div>
            <div className={cn("mt-1 text-lg font-bold tabular-nums",
              summary.overall_success_rate >= 90 ? "text-app-success" : summary.overall_success_rate >= 70 ? "text-app-warning" : "text-app-danger")}>
              {summary.overall_success_rate}%
            </div>
            <div className="text-[10px] text-app-text-subtle">{summary.total_success}/{summary.total_success + summary.total_failure}건</div>
          </div>
          <div className="rounded-xl border border-app-border bg-gradient-to-br from-app-card to-app-bg p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-text-muted">
              <CheckCircle2 className="h-3.5 w-3.5 text-app-success" /> 정상
            </div>
            <div className="mt-1 text-lg font-bold tabular-nums text-app-success">{summary.healthy_count}</div>
            <div className="text-[10px] text-app-text-subtle">전체 {summary.total}개 중</div>
          </div>
          <div className="rounded-xl border border-app-border bg-gradient-to-br from-app-card to-app-bg p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-text-muted">
              <AlertTriangle className="h-3.5 w-3.5 text-app-danger" /> 문제
            </div>
            <div className="mt-1 text-lg font-bold tabular-nums text-app-danger">{summary.unhealthy_count}</div>
            <div className="text-[10px] text-app-text-subtle">
              {statusCounts["banned"] ? `${statusCounts["banned"]}개 차단` : ""}
              {statusCounts["unauthorized"] ? ` ${statusCounts["unauthorized"]}개 인증필요` : ""}
            </div>
          </div>
        </div>
      )}

      {/* Health Trend Chart */}
      {trend.length > 0 && (
        <Panel title={<div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-app-primary" /> 건강 트렌드</div>}
          description={`최근 ${trendDays}일`}
          className="w-full">
          <div className="flex items-end justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px]"><span className="h-2 w-2 rounded-full bg-app-success" /> 성공</span>
              <span className="flex items-center gap-1 text-[10px]"><span className="h-2 w-2 rounded-full bg-app-danger" /> 실패</span>
            </div>
            <select value={trendDays} onChange={(e) => setTrendDays(Number(e.target.value))}
              className="rounded-lg border border-app-border bg-app-card px-2 py-1 text-[10px] text-app-text focus-ring">
              <option value={7}>7일</option>
              <option value={14}>14일</option>
              <option value={30}>30일</option>
            </select>
          </div>
          <MiniTrendChart trend={trend} />
          <div className="mt-2 flex items-center justify-between text-[10px] text-app-text-muted">
            <span>{trend[0]?.date ?? ""}</span>
            <span>{trend[trend.length - 1]?.date ?? ""}</span>
          </div>
        </Panel>
      )}

      {/* Problem accounts */}
      {problemItems.length > 0 && (
        <Panel title={<div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-app-danger" /> 문제 계정</div>}
          description={`${problemItems.length}개 계정 주의 필요`}>
          <div className="space-y-1.5">
            {problemItems.map((h) => {
              const cfg = HEALTH_LABELS[h.status] ?? HEALTH_LABELS.unknown;
              const Icon = cfg.icon;
              const acct = accounts.find((a) => a.id === h.accountId);
              const totalAttempts = h.recentSuccessCount + h.recentFailureCount;
              const successRate = totalAttempts > 0 ? (h.recentSuccessCount / totalAttempts) * 100 : 0;
              return (
                <div key={h.accountId} className="flex items-center gap-3 rounded-xl border border-app-border px-3 py-2.5 hover:border-app-border-strong transition-colors">
                  <Icon className={cn("h-4 w-4 shrink-0", cfg.tone === "danger" ? "text-app-danger" : cfg.tone === "warning" ? "text-app-warning" : "text-app-text-muted")} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-medium text-app-text">{acct?.name?.trim() || h.phone}</span>
                      <Badge tone={cfg.tone} className="shrink-0 text-[9px] px-1 py-0">{cfg.label}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-app-text-muted mt-0.5">
                      {h.lastError && <span className="truncate max-w-[120px]">{h.lastError}</span>}
                      {h.lastActivity && <span>{formatRelativeTime(h.lastActivity)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {totalAttempts > 0 && (
                      <span className={cn("text-[10px] font-medium tabular-nums", successRate >= 90 ? "text-app-success" : successRate >= 70 ? "text-app-warning" : "text-app-danger")}>
                        {successRate.toFixed(0)}%
                      </span>
                    )}
                    <div className="flex h-1.5 w-12 rounded-full bg-app-border overflow-hidden">
                      <div className={cn("h-full rounded-full", successRate >= 90 ? "bg-app-success" : successRate >= 70 ? "bg-app-warning" : "bg-app-danger")}
                        style={{ width: `${Math.max(successRate, 4)}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* Health Scores */}
      {summary && summary.health_scores.length > 0 && (
        <Panel title={<div className="flex items-center gap-2"><Gauge className="h-4 w-4 text-app-primary" /> 계정 건강 점수</div>}
          description="각 계정의 종합 건강 점수 (0-100)">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {summary.health_scores.map((hs) => {
              const h = healthItems.find((hi) => hi.accountId === hs.account_id);
              const acct = accounts.find((a) => a.id === hs.account_id);
              if (!h) return null;
              const cfg = HEALTH_LABELS[h.status] ?? HEALTH_LABELS.unknown;
              return (
                <div key={hs.account_id} className="flex items-center gap-3 rounded-xl border border-app-border bg-app-card p-3 hover:border-app-border-strong transition-colors">
                  <HealthScoreGauge score={hs.score} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-app-text">{acct?.name?.trim() || h.phone}</p>
                    <Badge tone={cfg.tone} className="mt-1 text-[9px] px-1.5 py-0">{cfg.label}</Badge>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-app-text-muted">
                      <span className="flex items-center gap-0.5"><TrendingUp className="h-3 w-3 text-app-success" />{h.recentSuccessCount}</span>
                      <span className="flex items-center gap-0.5"><TrendingDown className="h-3 w-3 text-app-danger" />{h.recentFailureCount}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* All accounts health table */}
      <Panel title={<div className="flex items-center gap-2"><Users className="h-4 w-4 text-app-primary" /> 전체 계정 상태</div>}
        description={`${healthItems.length}개 계정`}>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-app-text-subtle" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="계정 검색..." className="w-full rounded-lg border border-app-border bg-app-bg py-1.5 pl-8 pr-2 text-xs text-app-text placeholder:text-app-text-subtle focus-ring" />
            {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-app-text-subtle"><X className="h-3 w-3" /></button>}
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-app-border bg-app-bg px-2 py-1.5 text-xs text-app-text focus-ring">
            <option value="">전체</option>
            <option value="healthy">정상</option>
            <option value="unauthorized">인증 필요</option>
            <option value="banned">차단</option>
            <option value="rate_limited">제한</option>
            <option value="error">오류</option>
            <option value="not_configured">미설정</option>
          </select>
        </div>

        {filteredItems.length === 0 ? (
          <EmptyState icon={Users} title="표시할 계정이 없습니다" compact />
        ) : (
          <div className="space-y-1">
            {filteredItems.map((h) => {
              const cfg = HEALTH_LABELS[h.status] ?? HEALTH_LABELS.unknown;
              const Icon = cfg.icon;
              const acct = accounts.find((a) => a.id === h.accountId);
              const totalAttempts = h.recentSuccessCount + h.recentFailureCount;
              const successRate = totalAttempts > 0 ? (h.recentSuccessCount / totalAttempts) * 100 : 0;
              const hs = summary?.health_scores.find((s) => s.account_id === h.accountId);
              return (
                <div key={h.accountId} className="flex items-center gap-3 rounded-lg border border-app-border px-3 py-2 hover:border-app-border-strong transition-colors">
                  <Icon className={cn("h-3.5 w-3.5 shrink-0", cfg.tone === "danger" ? "text-app-danger" : cfg.tone === "warning" ? "text-app-warning" : "text-app-text-muted")} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-medium text-app-text">{acct?.name?.trim() || h.phone}</span>
                      <Badge tone={cfg.tone} className="shrink-0 text-[8px] px-1 py-0">{cfg.label}</Badge>
                    </div>
                    <div className="text-[9px] text-app-text-muted mt-0.5">
                      {h.hasSession ? "세션 있음" : "세션 없음"}
                      {h.lastActivity && ` · ${formatRelativeTime(h.lastActivity)}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {hs && <span className={cn("text-[10px] font-bold tabular-nums", hs.score >= 80 ? "text-app-success" : hs.score >= 50 ? "text-app-warning" : "text-app-danger")}>{hs.score}</span>}
                    {totalAttempts > 0 && (
                      <div className="flex h-1 w-10 rounded-full bg-app-border overflow-hidden">
                        <div className={cn("h-full rounded-full", successRate >= 90 ? "bg-app-success" : successRate >= 70 ? "bg-app-warning" : "bg-app-danger")}
                          style={{ width: `${Math.max(successRate, 4)}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-app-danger/20 bg-app-danger-muted/20 px-3 py-2 text-[11px] text-app-danger">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
          <button onClick={loadAll} className="ml-auto underline hover:no-underline">다시 시도</button>
        </div>
      )}
    </div>
  );
}