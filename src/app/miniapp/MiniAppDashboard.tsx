"use client";

import { useEffect, useState, memo, useCallback, useRef } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { Send, Coins, Clock, Users, TrendingUp, RefreshCw, CircleAlert, WifiOff, ChevronRight } from "lucide-react";
import * as api from "@/lib/api";
import { fetchTokenBalance, fetchRecentBroadcasts } from "@/lib/api-miniapp";
import type { BroadcastStatus } from "@/types";
import { AccountStatusDot } from "@/components/ui/AccountStatusIndicator";
import { useDataCache, withCache } from "@/store/useDataCache";
import { WeeklySummaryCard } from "@/components/ui/WeeklySummaryCard";
import { relativeTime } from "@/lib/relativeTime";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

interface AccountItem { id: string; phone: string; status: string; todaySent: number; healthScore: number; }
interface BroadcastItem { id: string; message: string; status: BroadcastStatus; sentAt: string; recipients: number; }

const StatCard = memo(function StatCard({ type, value, refreshKey, onClick }: { type: string; value: string; refreshKey?: number; onClick?: () => void }) {
  const configs: Record<string, { icon: typeof Send; label: string; bg: string; iconBg: string }> = {
    activeAccounts: { icon: Users, label: "활성 계정", bg: "from-emerald-600/20 to-emerald-800/10", iconBg: "bg-emerald-500" },
    queueCount: { icon: Clock, label: "대기", bg: "from-blue-600/20 to-blue-800/10", iconBg: "bg-blue-500" },
    tokenBalance: { icon: Coins, label: "토큰", bg: "from-amber-600/20 to-amber-800/10", iconBg: "bg-amber-500" },
    recentBroadcasts: { icon: TrendingUp, label: "발송", bg: "from-purple-600/20 to-purple-800/10", iconBg: "bg-purple-500" },
  };
  const s = configs[type] || configs.activeAccounts;
  const Icon = s.icon;
  const parsedValue = parseInt(value, 10) || 0;
  const spring = useSpring(0, { stiffness: 80, damping: 20 });
  const displayValue = useTransform(spring, (v) => String(Math.round(v)));
  const prevVal = useRef(0);
  useEffect(() => {
    spring.set(parsedValue);
    prevVal.current = parsedValue;
  }, [refreshKey, spring, parsedValue]);

  return (
    <button onClick={onClick} className={`rounded-2xl p-3 flex flex-col gap-1 bg-gradient-to-br ${s.bg} text-left active:scale-[0.97] transition-transform`}>
      <div className="flex items-center gap-1.5">
        <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${s.iconBg}`}><Icon className="h-3.5 w-3.5 text-white" /></div>
        <span className="text-[10px] font-medium opacity-70" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>{s.label}</span>
      </div>
      <motion.span className="text-xl font-bold tabular-nums">{displayValue}</motion.span>
    </button>
  );
});

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
          <div className="h-4 w-16 rounded" style={{ backgroundColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }} />
          <div className="h-8 w-20 rounded" style={{ backgroundColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }} />
        </div>
      ))}
    </div>
  );
}

export const MiniAppDashboard = memo(function MiniAppDashboard() {
  const { isOnline: online } = useNetworkStatus();
  const [state, setState] = useState({ tokenBalance: 0, activeAccounts: 0, queueCount: 0, todayTotal: 0,
    accounts: [] as AccountItem[], recentBroadcasts: [] as BroadcastItem[], lastUpdated: null as Date | null, error: false });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [accountsList, scheduler, tokenBalance, broadcasts] = await Promise.all([
        withCache("miniapp-accounts", () => api.fetchAccounts().catch(() => []), 60000),
        api.fetchSchedulerStatus().catch(() => null),
        fetchTokenBalance(),
        fetchRecentBroadcasts(),
      ]);
      const active = (accountsList as any[]).filter((a: any) => a.status === "active");
      const todayTotal = active.reduce((s: number, a: any) => s + (a.todaySent || 0), 0);
      setState({
        tokenBalance, activeAccounts: active.length, queueCount: scheduler?.due_broadcasts_count ?? 0, todayTotal,
        accounts: active.slice(0, 5).map((a: any) => ({ id: a.id, phone: a.phone, status: a.status, todaySent: a.todaySent || 0, healthScore: a.healthScore || 85 })),
        recentBroadcasts: broadcasts, lastUpdated: new Date(), error: false,
      });
    } catch { setState(prev => ({ ...prev, error: true })); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); const interval = setInterval(fetchData, 30000); return () => clearInterval(interval); }, [fetchData]);

  const handleTabChange = useCallback((tab: string) => window.dispatchEvent(new CustomEvent("telemon-miniapp-tab-change", { detail: { tab } })), []);

  if (loading) return <div className="p-4 space-y-4"><SkeletonGrid /></div>;

  return (
    <PullToRefresh onRefresh={fetchData}>
    <div className="p-4 pb-8 space-y-4 max-w-2xl mx-auto">
      {!online && (
        <div className="flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium" style={{ backgroundColor: "var(--tg-theme-destructive-text-color, #ec3942)" }}>
          <WifiOff className="h-3.5 w-3.5 text-white" /><span className="text-white">오프라인 상태입니다</span>
        </div>
      )}

      <WeeklySummaryCard />

      <div className="grid grid-cols-4 gap-2">
        <StatCard type="activeAccounts" value={`${state.activeAccounts}`} refreshKey={state.lastUpdated?.getTime()} onClick={() => handleTabChange("profile")} />
        <StatCard type="queueCount" value={`${state.queueCount}`} refreshKey={state.lastUpdated?.getTime()} />
        <StatCard type="tokenBalance" value={String(state.tokenBalance)} refreshKey={state.lastUpdated?.getTime()} />
        <StatCard type="recentBroadcasts" value={`${state.recentBroadcasts.length}`} refreshKey={state.lastUpdated?.getTime()} />
      </div>

      {state.todayTotal > 0 && (
        <div className="flex items-center justify-center gap-2 text-xs" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>
          <TrendingUp className="h-3.5 w-3.5" /> 오늘 <span className="font-semibold text-emerald-400">{state.todayTotal}건</span> 발송
        </div>
      )}

      {state.error && (
        <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
          <CircleAlert className="h-8 w-8 mx-auto mb-2" style={{ color: "var(--tg-theme-destructive-text-color, #ec3942)" }} />
          <button onClick={() => fetchData()} className="rounded-xl px-5 min-h-11 py-3 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)" }}>다시 시도</button>
        </div>
      )}

      {state.accounts.length > 0 && (
        <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" style={{ color: "var(--tg-theme-button-color, #5288c1)" }} />
            활성 계정 <span className="text-[10px] font-normal ml-auto" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>{state.accounts.length}개</span>
          </h3>
          <div className="space-y-1">
            {state.accounts.map((acc, i) => (
              <div key={i} className="flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-[var(--tg-theme-section-separator-color,#3a4a5a)] transition-colors">
                <AccountStatusDot status={acc.status} size="md" />
                <span className="text-sm font-mono truncate flex-1">{acc.phone}</span>
                <span className="text-[10px]" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>{acc.todaySent}회</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {state.recentBroadcasts.length > 0 && (
        <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4" style={{ color: "var(--tg-theme-button-color, #5288c1)" }} />최근 발송</h3>
            <button onClick={() => handleTabChange("send")} className="flex items-center gap-0.5 text-[11px] font-medium" style={{ color: "var(--tg-theme-button-color, #5288c1)" }}>더보기 <ChevronRight className="h-3 w-3" /></button>
          </div>
          <div className="space-y-1">
            {state.recentBroadcasts.slice(0, 5).map(b => (
              <div key={b.id} className="flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-[var(--tg-theme-section-separator-color,#3a4a5a)] transition-colors">
                <span className={`flex h-2.5 w-2.5 shrink-0 rounded-full ${b.status === "sent" ? "bg-emerald-500" : "bg-amber-500"}`} />
                <span className="text-xs truncate flex-1">{b.message}</span>
                <span className="text-[10px]" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>{relativeTime(b.sentAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-1.5 pt-2">
        <RefreshCw className={`h-3 w-3 opacity-40 ${online ? "" : "animate-pulse"}`} style={{ color: "var(--tg-theme-hint-color, #708499)" }} />
        <p className="text-[10px]" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>{state.lastUpdated ? relativeTime(state.lastUpdated.toISOString()) : ""} 갱신</p>
      </div>
    </div>
    </PullToRefresh>
  );
});
