"use client";

import { useEffect, useState } from "react";
import { Send, CheckCircle2, Coins, Clock, RefreshCw, Loader2, Users, AlertCircle } from "lucide-react";
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
        tokenBalance: 1000, // TODO: 실제 토큰 API
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
    <div className="space-y-4 pb-4">
      {/* 빠른 통계 */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-app-primary" />
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<Send className="h-5 w-5" />}
              label="오늘 발송"
              value={String(stats.todaySent)}
              color="#5288c1"
              onClick={() => setActiveTab("send")}
            />
            <StatCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              label="성공률"
              value={`${stats.successRate}%`}
              color="#4caf50"
            />
            <StatCard
              icon={<Users className="h-5 w-5" />}
              label="계정"
              value={String(stats.activeAccounts)}
              color="#ff9800"
              onClick={() => setActiveTab("health")}
            />
            <StatCard
              icon={<Clock className="h-5 w-5" />}
              label="대기열"
              value={String(stats.queueCount)}
              color="#ab47bc"
              onClick={() => setActiveTab("log")}
            />
          </div>

          {/* 빠른 액션 */}
          <div className="rounded-2xl border border-app-border/60 bg-app-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-app-text">빠른 액션</h3>
            <div className="grid grid-cols-2 gap-2">
              <ApiKeyGuard
                description="발송 기능을 사용하려면 API 키가 필요합니다."
                hasApiKey={hasApiKey}
              >
                <ActionButton
                  icon={<Send className="h-5 w-5" />}
                  label="새 발송"
                  onClick={() => setActiveTab("send")}
                  color="#5288c1"
                />
              </ApiKeyGuard>
              <ActionButton
                icon={<Users className="h-5 w-5" />}
                label="그룹 보기"
                onClick={() => setActiveTab("group")}
                color="#7c4dff"
              />
              <ActionButton
                icon={<CheckCircle2 className="h-5 w-5" />}
                label="발송 기록"
                onClick={() => setActiveTab("log")}
                color="#4caf50"
              />
              <ActionButton
                icon={<RefreshCw className="h-5 w-5" />}
                label="새로고침"
                onClick={fetchStats}
                color="#ff9800"
              />
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-sm text-app-text-muted">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          데이터를 불러올 수 없습니다
          <button onClick={fetchStats} className="block mx-auto mt-2 text-app-primary underline">다시 시도</button>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon, label, value, color, onClick,
}: {
  icon: React.ReactNode; label: string; value: string; color: string; onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      {...(onClick ? { onClick, type: "button" as const } : {})}
      className="rounded-2xl border border-app-border/60 bg-app-card p-4 flex flex-col gap-2 text-left"
    >
      <div className="flex items-center gap-2" style={{ color }}>
        {icon}
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <span className="text-2xl font-bold text-app-text">{value}</span>
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
      className="flex flex-col items-center gap-1.5 rounded-xl border border-app-border/60 bg-app-bg/50 py-3 transition-colors hover:bg-app-card-hover"
    >
      <div style={{ color }}>{icon}</div>
      <span className="text-xs font-medium text-app-text">{label}</span>
    </button>
  );
}