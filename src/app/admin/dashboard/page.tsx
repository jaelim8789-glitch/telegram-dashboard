"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  Activity, HeadphonesIcon, KeyRound, LogOut, RefreshCw,
  Shield, Users, XCircle, AlertTriangle, HeartPulse,
  Ban, Clock, WifiOff, Plug, HelpCircle, Layers,
  CheckCircle2, ChevronRight, Sparkles, Settings2, Download,
} from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Panel } from "@/components/ui/Panel";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { InlineError } from "@/components/ui/InlineError";
import { cn } from "@/lib/cn";
import { clearToken, clearSessionToken } from "@/lib/auth";
import { useDashboardStore } from "@/store/useDashboardStore";
import * as api from "@/lib/api";

export const dynamic = "force-dynamic";

const REFRESH_INTERVAL_MS = 30_000;
const TREND_WINDOW = 20;

// ─── Health breakdown config ──────────────────────────────────────

interface BreakdownItem {
  key: string;
  label: string;
  icon: typeof Activity;
  color: string;
  barColor: string;
}

const BREAKDOWN: BreakdownItem[] = [
  { key: "healthy", label: "정상", icon: CheckCircle2, color: "text-emerald-500", barColor: "bg-emerald-500" },
  { key: "unauthorized", label: "세션 만료", icon: Plug, color: "text-orange-500", barColor: "bg-orange-500" },
  { key: "rate_limited", label: "레이트리밋", icon: Clock, color: "text-amber-500", barColor: "bg-amber-500" },
  { key: "banned", label: "차단", icon: Ban, color: "text-rose-500", barColor: "bg-rose-500" },
  { key: "error_count", label: "오류", icon: XCircle, color: "text-red-500", barColor: "bg-red-500" },
  { key: "not_configured", label: "미설정", icon: WifiOff, color: "text-app-text-subtle", barColor: "bg-app-border" },
  { key: "unknown", label: "알 수 없음", icon: HelpCircle, color: "text-app-text-muted", barColor: "bg-app-border-strong" },
];

// ─── Helpers ──────────────────────────────────────────────────────

function getStatusColor(status: api.AdminDashboardStatus | null, hasError: boolean): { bg: string; text: string; label: string } {
  if (hasError || !status) return { bg: "bg-rose-500", text: "text-rose-500", label: "연결 오류" };
  const fr = status.broadcasts.failure_rate;
  const pb = status.accounts.banned + status.accounts.rate_limited + status.accounts.unauthorized + status.accounts.error_count;
  if (fr > 10 || pb > status.accounts.total * 0.3) return { bg: "bg-rose-500", text: "text-rose-500", label: "심각" };
  if (fr > 5 || pb > status.accounts.total * 0.1) return { bg: "bg-amber-500", text: "text-amber-500", label: "주의" };
  return { bg: "bg-emerald-500", text: "text-emerald-500", label: "정상" };
}

function CountUp({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-lg font-bold text-app-text tabular-nums">{value.toLocaleString()}</span>
      <span className="text-[10px] text-app-text-muted whitespace-nowrap">{label}</span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────

function AdminDashboardContent() {
  const router = useRouter();

  const [users, setUsers] = useState<api.DashboardUser[]>([]);
  const [keys, setKeys] = useState<api.ApiKey[]>([]);
  const [status, setStatus] = useState<api.AdminDashboardStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsToRefresh, setSecondsToRefresh] = useState(REFRESH_INTERVAL_MS / 1000);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [failureRateTrend, setFailureRateTrend] = useState<number[]>([]);
  const [healthyTrend, setHealthyTrend] = useState<number[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const [u, k] = await Promise.all([api.fetchUsers(), api.fetchApiKeys()]);
      setUsers(u);
      setKeys(k);
    } catch (err) {
      setError(err instanceof Error ? err.message : "데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const loadStatus = useCallback(async () => {
    setStatusError(null);
    setStatusLoading(true);
    try {
      const data = await api.fetchAdminDashboardStatus();
      setStatus(data);
      setFailureRateTrend((prev) => [...prev.slice(-(TREND_WINDOW - 1)), data.broadcasts.failure_rate]);
      setHealthyTrend((prev) => [...prev.slice(-(TREND_WINDOW - 1)), data.accounts.total > 0 ? Math.round((data.accounts.healthy / data.accounts.total) * 100) : 0]);
      setLastUpdated(new Date());
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "상태 데이터를 불러오지 못했습니다.");
    } finally {
      setStatusLoading(false);
      setSecondsToRefresh(REFRESH_INTERVAL_MS / 1000);
    }
  }, []);

  useEffect(() => { load(); }, []);
  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadStatus]);

  // Countdown tick
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setSecondsToRefresh((s) => Math.max(0, s - 1));
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  function handleLogout() {
    clearToken();
    clearSessionToken();
    useDashboardStore.getState().resetStore();
    router.replace("/admin/login");
  }

  const activeUsers = users.filter((u) => u.isActive);
  const activeKeys = keys.filter((k) => k.isActive ?? true);
  const paidUsers = users.filter((u) => (u.plan ?? "free") !== "free");
  const churnCandidates = users.filter((u) => !u.isActive || !!(u.subscriptionStatus && u.subscriptionStatus !== "active"));
  const noAccountUsers = users.filter((u) => u.accountCount === 0);
  const averageAccountsPerUser = users.length > 0 ? users.reduce((sum, u) => sum + u.accountCount, 0) / users.length : 0;
  const statusColor = getStatusColor(status, !!statusError);

  const conversionRate = users.length > 0 ? Math.round((paidUsers.length / users.length) * 100) : 0;
  const churnRiskRate = users.length > 0 ? Math.round((churnCandidates.length / users.length) * 100) : 0;

  function downloadKpiSnapshotCsv() {
    const rows = [
      ["metric", "value"],
      ["users_total", String(users.length)],
      ["users_paid", String(paidUsers.length)],
      ["conversion_rate_percent", String(conversionRate)],
      ["churn_candidates", String(churnCandidates.length)],
      ["churn_risk_rate_percent", String(churnRiskRate)],
      ["users_without_accounts", String(noAccountUsers.length)],
      ["avg_accounts_per_user", averageAccountsPerUser.toFixed(2)],
      ["api_keys_total", String(keys.length)],
      ["api_keys_active", String(activeKeys.length)],
      ["account_healthy", String(status?.accounts.healthy ?? 0)],
      ["account_unhealthy", String(status?.accounts.unhealthy ?? 0)],
      ["broadcast_failure_rate_24h", String(status?.broadcasts.failure_rate ?? 0)],
      ["updated_at", new Date().toISOString()],
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin-kpi-snapshot-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Account health breakdown values from status
  const breakdownValues: Record<string, number> = status ? {
    healthy: status.accounts.healthy,
    unauthorized: status.accounts.unauthorized,
    rate_limited: status.accounts.rate_limited,
    banned: status.accounts.banned,
    error_count: status.accounts.error_count,
    not_configured: status.accounts.not_configured,
    unknown: status.accounts.unknown,
  } : {};

  const totalAccounted = Object.values(breakdownValues).reduce((a, b) => a + b, 0);
  const totalAccounts = status?.accounts.total ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-app-text">관리자</h1>
          <p className="mt-0.5 text-sm text-app-text-muted">TeleMon 운영 콘솔</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/app" className="text-xs text-app-primary-hover hover:underline transition-colors">
            사용자 대시보드
          </Link>
          <button
            onClick={() => { load(); loadStatus(); }}
            disabled={loading || statusLoading}
            className="flex items-center gap-1.5 rounded-xl border border-app-border bg-app-card px-3 py-1.5 text-xs text-app-text-muted transition-all duration-150 hover:border-app-border-strong hover:text-app-text disabled:opacity-50"
          >
            <RefreshCw className={(loading || statusLoading) ? "h-3 w-3 animate-spin" : "h-3 w-3"} />
            새로고침
          </button>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-3.5 w-3.5" /> 로그아웃
          </Button>
        </div>
      </div>

      <Panel
        accent="cyan"
        title={<div className="flex items-center gap-2"><Layers className="h-4 w-4 text-teal-400" /> KPI 인사이트</div>}
        description="전환율, 이탈 리스크, 활동성 지표를 빠르게 확인합니다."
        action={<Button size="sm" onClick={downloadKpiSnapshotCsv}>KPI CSV 내보내기</Button>}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={<Sparkles className="h-4 w-4" />} label="유료 전환율" value={`${conversionRate}%`} sub={`${paidUsers.length}/${users.length}명`} accent={conversionRate >= 25 ? "emerald" : "amber"} />
          <StatCard icon={<AlertTriangle className="h-4 w-4" />} label="이탈 리스크" value={`${churnRiskRate}%`} sub={`${churnCandidates.length}명`} accent={churnRiskRate >= 35 ? "rose" : "amber"} />
          <StatCard icon={<Users className="h-4 w-4" />} label="무계정 사용자" value={noAccountUsers.length} sub={users.length > 0 ? `${Math.round((noAccountUsers.length / users.length) * 100)}%` : "0%"} accent="violet" />
          <StatCard icon={<Activity className="h-4 w-4" />} label="평균 계정 수" value={averageAccountsPerUser.toFixed(1)} sub="사용자당" accent="indigo" />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-app-border bg-app-bg p-3">
            <p className="text-xs font-medium text-app-text">실패율 트렌드</p>
            <div className="mt-2 flex h-14 items-end gap-1">
              {failureRateTrend.length === 0 ? (
                <p className="text-xs text-app-text-muted">데이터 수집 중...</p>
              ) : (
                failureRateTrend.map((v, i) => (
                  <div
                    key={`fr-${i}`}
                    className={cn("w-full rounded-t", v > 10 ? "bg-rose-500" : v > 5 ? "bg-amber-500" : "bg-emerald-500")}
                    style={{ height: `${Math.max(6, Math.min(56, v * 4 + 6))}px` }}
                    title={`${v}%`}
                  />
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-app-border bg-app-bg p-3">
            <p className="text-xs font-medium text-app-text">건강 계정 비율 트렌드</p>
            <div className="mt-2 flex h-14 items-end gap-1">
              {healthyTrend.length === 0 ? (
                <p className="text-xs text-app-text-muted">데이터 수집 중...</p>
              ) : (
                healthyTrend.map((v, i) => (
                  <div
                    key={`healthy-${i}`}
                    className={cn("w-full rounded-t", v >= 80 ? "bg-emerald-500" : v >= 60 ? "bg-amber-500" : "bg-rose-500")}
                    style={{ height: `${Math.max(6, Math.min(56, v * 0.5 + 6))}px` }}
                    title={`${v}%`}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </Panel>

      {(error || statusError) && (
        <InlineError title="데이터 로드 실패" action={
          <button onClick={() => { load(); loadStatus(); }} className="font-medium underline hover:no-underline text-xs">
            재시도
          </button>
        }>
          {error || statusError}
        </InlineError>
      )}

      {/* User stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={`ad-dash-${i}`} className="h-28 w-full rounded-2xl" />
          ))
        ) : (
          <>
            <StatCard icon={<Users className="h-5 w-5" />} label="전체 사용자" value={users.length} accent="indigo" />
            <StatCard icon={<Activity className="h-5 w-5" />} label="활성 사용자" value={activeUsers.length}
              sub={`${users.length > 0 ? Math.round((activeUsers.length / users.length) * 100) : 0}%`}
              trend={activeUsers.length > 0 ? "up" : "neutral"} accent="emerald" />
            <StatCard icon={<KeyRound className="h-5 w-5" />} label="API 키" value={keys.length} accent="violet" />
            <StatCard icon={<Shield className="h-5 w-5" />} label="비활성 사용자" value={users.length - activeUsers.length}
              accent="rose" />
          </>
        )}
      </div>

      {/* ─── Real-time status widget (enhanced) ─── */}
      <Panel
        accent="cyan"
        title={
          <div className="flex items-center gap-2 w-full">
            <HeartPulse className="h-4 w-4 text-cyan-400" />
            <span>실시간 운영 상태</span>
            <div className="ml-auto flex items-center gap-2 text-[10px] font-normal text-app-text-muted">
              {/* Status dot */}
              <span className="flex items-center gap-1">
                <span className={cn("inline-block h-1.5 w-1.5 rounded-full animate-pulse", statusColor.bg)} />
                <span className={statusColor.text}>{statusColor.label}</span>
              </span>
              {/* Countdown */}
              <span className="tabular-nums">{secondsToRefresh}s</span>
              {/* Spinner */}
              {statusLoading && <RefreshCw className="h-3 w-3 animate-spin" />}
            </div>
          </div>
        }
        description={
          <div className="flex items-center justify-between">
            <span>계정 건강도, 발송 실패율, 활성 계정 요약</span>
            {lastUpdated && (
              <span className="text-[10px] text-app-text-subtle">
                마지막 갱신: {lastUpdated.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
          </div>
        }
      >
        {statusLoading && !status ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={`ad-dash3-${i}`} className="h-20 w-full rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-4 w-full rounded-lg" />
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={`ad-dash4-${i}`} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ) : status ? (
          <div className="space-y-4">
            {/* Quick stat cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard icon={<Activity className="h-4 w-4" />} label="활성 계정"
                value={totalAccounts - status.accounts.not_configured - status.accounts.banned}
                sub={`${totalAccounts}개 전체`} accent="emerald" />
              <StatCard icon={<HeartPulse className="h-4 w-4" />} label="건강한 계정"
                value={status.accounts.healthy}
                sub={`${totalAccounts > 0 ? Math.round((status.accounts.healthy / totalAccounts) * 100) : 0}%`}
                accent={status.accounts.healthy > totalAccounts * 0.7 ? "emerald" : "amber"} />
              <StatCard icon={<AlertTriangle className="h-4 w-4" />} label="문제 계정"
                value={status.accounts.banned + status.accounts.rate_limited + status.accounts.unauthorized + status.accounts.error_count}
                sub={`차단 ${status.accounts.banned} · 제한 ${status.accounts.rate_limited}`}
                accent={(status.accounts.banned + status.accounts.rate_limited) > 0 ? "rose" : "amber"} />
              <StatCard
                icon={<Shield className="h-4 w-4" />}
                label="발송 실패율(24h)"
                value={`${status.broadcasts.failure_rate}%`}
                sub={`${status.broadcasts.recent_failed}/${status.broadcasts.recent_total}건`}
                accent={status.broadcasts.failure_rate > 10 ? "rose" : status.broadcasts.failure_rate > 5 ? "amber" : "emerald"}
              />
            </div>

            {/* Account health stacked bar */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-medium text-app-text">계정 건강 분포</span>
                <span className="text-app-text-muted">{totalAccounted}/{totalAccounts}개 집계</span>
              </div>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-app-card-hover">
                {BREAKDOWN.map((item) => {
                  const val = breakdownValues[item.key] ?? 0;
                  const pct = totalAccounts > 0 ? (val / totalAccounts) * 100 : 0;
                  if (pct < 0.5) return null;
                  return (
                    <div
                      key={item.key}
                      className={cn("h-full transition-all duration-700", item.barColor)}
                      style={{ width: `${pct}%` }}
                      title={`${item.label}: ${val}`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Category breakdown */}
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
              {BREAKDOWN.map((item) => {
                const val = breakdownValues[item.key] ?? 0;
                return (
                  <div
                    key={item.key}
                    className="flex items-center gap-1.5 rounded-lg border border-app-border bg-app-bg px-2 py-1.5 transition-colors hover:border-app-border-strong"
                  >
                    <item.icon className={cn("h-3 w-3 shrink-0", item.color)} />
                    <span className="text-[11px] text-app-text-muted truncate">{item.label}</span>
                    <span className={cn("ml-auto text-xs font-semibold tabular-nums", val > 0 ? "text-app-text" : "text-app-text-subtle")}>
                      {val}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Bottom row: today activity + groups */}
            <div className="flex items-center justify-between rounded-xl border border-app-border bg-app-bg px-4 py-2.5">
              <div className="flex items-center gap-4 sm:gap-8">
                <CountUp value={status.accounts.total_today_sent} label="오늘 발송" />
                <CountUp value={status.accounts.total_groups} label="그룹 수" />
                <CountUp value={status.accounts.has_session} label="세션 보유" />
                <CountUp value={status.accounts.has_errors} label="오류 보유" />
              </div>
              <ChevronRight className="h-4 w-4 text-app-text-subtle hidden sm:block" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 text-app-text-muted">
            <HeartPulse className="h-6 w-6 opacity-30" />
            <p className="text-xs">상태 정보를 불러올 수 없습니다.</p>
            <Button variant="secondary" size="sm" onClick={loadStatus}>
              다시 시도
            </Button>
          </div>
        )}
      </Panel>

      {/* Quick actions + system info */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Panel
          accent="indigo"
          title={<div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-indigo-400" />API 키 관리</div>}
          description="외부 연동용 키 발급·삭제"
          action={<span className="inline-flex items-center rounded-full bg-indigo-500/10 px-2 py-0.5 text-[11px] font-medium text-indigo-400">{activeKeys.length}개 활성</span>}
        >
          <div className="space-y-2 text-xs text-app-text-muted">
            <p>외부 프로그램 또는 스크립트에서 사용할 X-API-Key를 관리합니다.</p>
            <Link href="/admin/api-keys">
              <Button variant="primary" className="w-full">API 키 관리</Button>
            </Link>
          </div>
        </Panel>

        <Panel
          accent="cyan"
          title={<div className="flex items-center gap-2"><Users className="h-4 w-4 text-cyan-400" />사용자 관리</div>}
          description="전화번호 인증 사용자 관리"
          action={<span className="inline-flex items-center rounded-full bg-cyan-500/10 px-2 py-0.5 text-[11px] font-medium text-cyan-400">{users.length}명</span>}
        >
          <div className="space-y-2 text-xs text-app-text-muted">
            <p>전화번호 인증으로 가입한 일반 사용자의 활성화 상태를 관리합니다.</p>
            <Link href="/admin/users">
              <Button variant="primary" className="w-full">사용자 관리</Button>
            </Link>
          </div>
        </Panel>

        <Panel
          accent="purple"
          title={<div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-purple-400" />AI 말투 학습</div>}
          description="스타일 프로필 생성·관리"
          action={<span className="inline-flex items-center rounded-full bg-purple-500/10 px-2 py-0.5 text-[11px] font-medium text-purple-400">신규</span>}
        >
          <div className="space-y-2 text-xs text-app-text-muted">
            <p>채널 글/텍스트를 분석하여 AI 콘텐츠 생성에 활용할 말투 프로필을 만듭니다.</p>
            <Link href="/admin/style-profiles">
              <Button variant="primary" className="w-full">말투 학습 바로가기</Button>
            </Link>
          </div>
        </Panel>

        <Panel
          accent="amber"
          title={<div className="flex items-center gap-2"><HeadphonesIcon className="h-4 w-4 text-amber-400" />고객 지원</div>}
          description="사용자 상태·계정·전달 현황 진단"
          action={<span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">새 기능</span>}
        >
          <div className="space-y-2 text-xs text-app-text-muted">
            <p>사용자별 Telegram 계정 상태, 전달 분석, 계정 건강 상태를 진단합니다.</p>
            <Link href="/admin/support">
              <Button variant="primary" className="w-full">고객 지원 콘솔</Button>
            </Link>
          </div>
        </Panel>

        <Panel
          accent="emerald"
          title={<div className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-emerald-400" />시스템 설정</div>}
          description="워터마크 광고 문구 관리"
        >
          <div className="space-y-2 text-xs text-app-text-muted">
            <p>무료 요금제 발송 시 하단에 자동 추가되는 광고 문구를 설정합니다.</p>
            <Link href="/admin/settings">
              <Button variant="primary" className="w-full">시스템 설정 바로가기</Button>
            </Link>
          </div>
        </Panel>

        <Panel
          accent="purple"
          title={<div className="flex items-center gap-2"><Download className="h-4 w-4 text-purple-400" />데이터 관리</div>}
          description="CSV/JSON 내보내기 · 엑셀 가져오기 · 백업 · 복원 · 스냅샷">
          <div className="space-y-2 text-xs text-app-text-muted">
            <p>발송 내역, 그룹 멤버, 전체 설정을 내보내거나 가져옵니다. 스냅샷으로 상태를 저장하고 복원할 수 있습니다.</p>
            <Link href="/admin/data">
              <Button variant="primary" className="w-full">데이터 관리 바로가기</Button>
            </Link>
          </div>
        </Panel>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <AdminGuard requireAdmin>
      <AdminDashboardContent />
    </AdminGuard>
  );
}
