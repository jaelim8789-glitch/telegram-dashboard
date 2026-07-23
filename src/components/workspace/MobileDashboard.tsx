"use client";

import { useEffect, useState } from "react";
import { Send, CheckCircle2, Clock, RefreshCw, Loader2, Users, AlertCircle, Activity, BarChart3 } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import * as api from "@/lib/api";
import { useApiKeyGuard } from "@/lib/useApiKeyGuard";
import ApiKeyGuard from "@/components/ApiKeyGuard";

interface MobileStats {
  todaySent: number;
  successRate: number;
  tokenBalance: number;
  queueCount: number;
  activeAccounts: number;
  errorCount: number;
}

export function MobileDashboard() {
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);
  const [stats, setStats] = useState<MobileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { hasApiKey } = useApiKeyGuard();

  async function fetchStats() {
    setLoading(true);
    try {
      const [summary, scheduler] = await Promise.all([
        api.fetchRuntimeInspectorSummary().catch(() => null),
        api.fetchSchedulerStatus().catch(() => null),
      ]);
      const total = summary?.total ?? 0;
      const healthy = summary?.healthy ?? 0;
      const rate = total > 0 ? Math.round((healthy / total) * 100) : 0;
      setStats({
        todaySent: summary?.runtimes.reduce((sum, r) => sum + r.today_sent, 0) ?? 0,
        successRate: rate,
        tokenBalance: 1000,
        queueCount: scheduler?.due_broadcasts_count ?? 0,
        activeAccounts: summary?.active ?? 0,
        errorCount: summary?.error ?? 0,
      });
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-5 pb-4">
      {/* Header with gold accent */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
            대시보드
          </h2>
          <p className="text-xs text-app-text-muted mt-0.5">오늘의 운영 현황</p>
        </div>
        <button
          type="button"
          onClick={fetchStats}
          className="flex items-center gap-1.5 rounded-full border border-app-border/60 bg-app-card px-3 py-1.5 text-[11px] font-medium text-app-text-muted hover:text-app-accent hover:border-app-primary/30 transition-all"
        >
          <RefreshCw className="h-3 w-3" />
          새로고침
        </button>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-accent-border)] to-transparent opacity-30" />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="relative">
            <Loader2 className="h-8 w-8 animate-spin text-app-primary" />
            <div className="absolute inset-0 h-8 w-8 animate-ping rounded-full bg-app-primary/10" />
          </div>
          <span className="text-xs text-app-text-muted">데이터를 불러오는 중...</span>
        </div>
      ) : stats ? (
        <>
          {/* Stat cards with gold accents */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<Send className="h-5 w-5" />}
              label="오늘 발송"
              value={String(stats.todaySent)}
              accent
              onClick={() => setActiveTab("send")}
            />
            <StatCard
              icon={<Activity className="h-5 w-5" />}
              label="성공률"
              value={`${stats.successRate}%`}
              color="#4caf50"
            />
            <StatCard
              icon={<Users className="h-5 w-5" />}
              label="활성 계정"
              value={String(stats.activeAccounts)}
              color="#bfa260"
              onClick={() => setActiveTab("health")}
            />
            <StatCard
              icon={<Clock className="h-5 w-5" />}
              label="예약 대기"
              value={String(stats.queueCount)}
              color="#8b6fc0"
              onClick={() => setActiveTab("log")}
            />
          </div>

          {/* Quick actions — luxury card */}
          <div className="relative rounded-2xl border border-[var(--color-accent-border)] bg-app-card p-5 space-y-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent opacity-40" />
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-app-primary" />
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-app-text-muted">
                빠른 액션
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <ApiKeyGuard
                description="발송 기능을 사용하려면 API 키가 필요합니다."
                hasApiKey={hasApiKey}
              >
                <ActionButton
                  icon={<Send className="h-5 w-5" />}
                  label="새 발송"
                  onClick={() => setActiveTab("send")}
                  color="var(--color-accent)"
                />
              </ApiKeyGuard>
              <ActionButton
                icon={<Users className="h-5 w-5" />}
                label="그룹 보기"
                onClick={() => setActiveTab("group")}
                color="var(--color-accent)"
              />
              <ActionButton
                icon={<CheckCircle2 className="h-5 w-5" />}
                label="발송 기록"
                onClick={() => setActiveTab("log")}
                color="var(--color-accent)"
              />
              <ActionButton
                icon={<RefreshCw className="h-5 w-5" />}
                label="새로고침"
                onClick={fetchStats}
                color="var(--color-accent)"
              />
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-accent-border)] to-transparent opacity-20" />
            <p className="text-[10px] text-app-text-muted text-center">
              TM — TeleMon Dashboard v2.0
            </p>
          </div>
        </>
      ) : (
        <div className="text-center py-16 text-sm text-app-text-muted space-y-3">
          <AlertCircle className="h-10 w-10 mx-auto opacity-50" />
          <p>데이터를 불러올 수 없습니다</p>
          <button
            onClick={fetchStats}
            className="inline-flex items-center gap-1.5 rounded-full border border-app-primary/30 px-4 py-2 text-xs font-medium text-app-primary hover:bg-app-primary/10 transition-all"
          >
            <RefreshCw className="h-3 w-3" />
            다시 시도
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon, label, value, color, onClick, accent,
}: {
  icon: React.ReactNode; label: string; value: string; color?: string; onClick?: () => void; accent?: boolean;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      {...(onClick ? { onClick, type: "button" as const } : {})}
      className="group relative rounded-2xl border border-app-border/60 bg-app-card p-4 flex flex-col gap-2 text-left transition-all duration-300 hover:border-[var(--color-accent-border)] hover:shadow-md overflow-hidden"
    >
      {/* Top gold line on hover */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent transition-all duration-300 group-hover:w-full opacity-0 group-hover:opacity-100" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2" style={{ color: accent ? "var(--color-accent)" : color }}>
          {icon}
        </div>
        <span className="text-[10px] uppercase tracking-wider text-app-text-muted">{label}</span>
      </div>
      <span className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}>
        {value}
      </span>
    </Comp>
  );
}

function ActionButton({
  icon, label, onClick, color,
}: {
  icon: React.ReactNode; label: string; onClick: () => void; color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col items-center gap-2 rounded-xl border border-app-border/60 bg-app-bg/50 py-4 transition-all duration-300 hover:border-[var(--color-accent-border)] hover:bg-[var(--color-accent-light)] overflow-hidden"
    >
      <div className="transition-transform duration-300 group-hover:scale-110" style={{ color }}>{icon}</div>
      <span className="text-xs font-medium text-app-text group-hover:text-app-text transition-colors">{label}</span>
    </button>
  );
}