"use client";

import { useEffect, useState, memo, useCallback, useMemo, useRef } from "react";
import { Send, CheckCircle2, Coins, Clock, Users, Loader2, TrendingUp, Plug, Plus, RefreshCw, CircleAlert, WifiOff, ArrowRight, Sparkles, Bot, ChevronRight } from "lucide-react";
import * as api from "@/lib/api";
import { fetchTokenBalance, fetchRecentBroadcasts } from "@/lib/api-miniapp";
import type { BroadcastStatus } from "@/types";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { AccountStatusDot } from "@/components/ui/AccountStatusIndicator";
import { useDataCache, withCache } from "@/store/useDataCache";
import { WeeklySummaryCard } from "@/components/ui/WeeklySummaryCard";
import { ThemeQuickToggle } from "@/components/ui/ThemeQuickToggle";
import { GlobalToast } from "@/components/ui/GlobalToast";
import { useOnlineStatus } from "@/lib/offlineDetector";

interface AccountItem { id: string; phone: string; status: string; todaySent: number; healthScore: number; }
interface BroadcastItem { id: string; message: string; status: BroadcastStatus; sentAt: string; recipients: number; }

const StatCard = memo(function StatCard({ type, value, onClick }: { type: string; value: string; onClick?: () => void }) {
  const configs: Record<string, { icon: typeof Send; label: string; bg: string; iconBg: string }> = {
    activeAccounts: { icon: Users, label: "활성 계정", bg: "from-emerald-600/20 to-emerald-800/10", iconBg: "bg-emerald-500" },
    queueCount: { icon: Clock, label: "발송 대기", bg: "from-blue-600/20 to-blue-800/10", iconBg: "bg-blue-500" },
    tokenBalance: { icon: Coins, label: "토큰 잔액", bg: "from-amber-600/20 to-amber-800/10", iconBg: "bg-amber-500" },
    recentBroadcasts: { icon: TrendingUp, label: "최근 발송", bg: "from-purple-600/20 to-purple-800/10", iconBg: "bg-purple-500" },
  };
  const s = configs[type] || configs.activeAccounts;
  const Icon = s.icon;
  return (
    <button onClick={onClick} className={`rounded-2xl p-4 flex flex-col gap-2 bg-gradient-to-br ${s.bg} text-left active:scale-[0.97] transition-transform`}>
      <div className="flex items-center gap-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${s.iconBg}`}><Icon className="h-4 w-4 text-white" /></div>
        <span className="text-[11px] font-medium opacity-70" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>{s.label}</span>
      </div>
      <span className="text-2xl font-bold tabular-nums"><AnimatedCounter value={parseInt(value.replace(/[^0-9]/g, "")) || 0} />{value.includes("개") ? "개" : value.includes("건") ? "건" : ""}</span>
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

function EmptyAccountState({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full mb-3" style={{ backgroundColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }}>
        <Plug className="h-6 w-6 opacity-60" style={{ color: "var(--tg-theme-hint-color, #708499)" }} />
      </div>
      <p className="text-sm font-semibold mb-1">연결된 계정이 없습니다</p>
      <p className="text-[11px] mb-3 max-w-[220px]" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>첫 Telegram 계정을 연결하고 자동화를 시작하세요</p>
      <button onClick={onConnect} className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white active:scale-95"
        style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)" }}>
        <Plus className="h-4 w-4" /> 계정 연결하기
      </button>
    </div>
  );
}

export const MiniAppDashboard = memo(function MiniAppDashboard({ onRefreshKey }: { onRefreshKey?: number }) {
  const [state, setState] = useState({ tokenBalance: 0, activeAccounts: 0, queueCount: 0, todayTotal: 0, stale: false,
    accounts: [] as AccountItem[], recentBroadcasts: [] as BroadcastItem[], pixelOffices: [] as { id: string; name: string; status: string }[],
    lastUpdated: null as Date | null, error: false, online: true });
  const [loading, setLoading] = useState(true);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const tabClicks = useRef(0);
  const tabTimer = useRef<ReturnType<typeof setTimeout>>();

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [accountsList, scheduler, tokenBalance, broadcasts, pixelData] = await Promise.all([
        withCache("miniapp-accounts", () => api.fetchAccounts().catch(() => []), 60000),
        api.fetchSchedulerStatus().catch(() => null),
        fetchTokenBalance(),
        fetchRecentBroadcasts(),
        api.fetchPixelOffices ? api.fetchPixelOffices().catch(() => []) : Promise.resolve([]),
      ]);
      const active = (accountsList as any[]).filter((a: any) => a.status === "active");
      const todayTotal = active.reduce((s: number, a: any) => s + (a.todaySent || 0), 0);
      setState({
        tokenBalance, activeAccounts: active.length, queueCount: scheduler?.due_broadcasts_count ?? 0, todayTotal, stale: false,
        accounts: active.slice(0, 5).map((a: any) => ({ id: a.id, phone: a.phone, status: a.status, todaySent: a.todaySent || 0, healthScore: a.healthScore || 85 })),
        recentBroadcasts: broadcasts,
        pixelOffices: (pixelData || []).slice(0, 3),
        lastUpdated: new Date(), error: false, online: true,
      });
    } catch { setState(prev => ({ ...prev, error: true })); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); const interval = setInterval(fetchData, 30000); return () => clearInterval(interval); }, [fetchData]);

  useEffect(() => {
    setState(prev => ({ ...prev, online: navigator.onLine }));
    const onLine = () => setState(prev => ({ ...prev, online: true }));
    const offLine = () => setState(prev => ({ ...prev, online: false }));
    window.addEventListener("online", onLine); window.addEventListener("offline", offLine);
    return () => { window.removeEventListener("online", onLine); window.removeEventListener("offline", offLine); };
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      if (state.lastUpdated && Date.now() - state.lastUpdated.getTime() > 300000) setState(prev => ({ ...prev, stale: true }));
    }, 30000);
    return () => clearInterval(t);
  }, [state.lastUpdated]);

  const handleTabChange = useCallback((tab: string) => {
    window.dispatchEvent(new CustomEvent("telemon-miniapp-tab-change", { detail: { tab } }));
  }, []);

  function onTouchStart(e: React.TouchEvent) { touchStartY.current = e.touches[0].clientY; }
  function onTouchMove(e: React.TouchEvent) { const dy = e.touches[0].clientY - touchStartY.current; if (dy > 0) setPullDistance(Math.min(dy * 0.3, 80)); }
  function onTouchEnd() { if (pullDistance > 50) fetchData(true); setPullDistance(0); }

  function handleDoubleTap() {
    tabClicks.current++;
    if (tabClicks.current === 2) { fetchData(true); tabClicks.current = 0; clearTimeout(tabTimer.current); return; }
    clearTimeout(tabTimer.current);
    tabTimer.current = setTimeout(() => { tabClicks.current = 0; }, 300);
  }

  const allZero = useMemo(() => state.activeAccounts === 0 && state.queueCount === 0 && state.tokenBalance === 0 && state.recentBroadcasts.length === 0, [state]);

  const relativeTime = useMemo(() => {
    if (!state.lastUpdated) return "";
    const diff = Date.now() - state.lastUpdated.getTime();
    const min = Math.floor(diff / 60000);
    return min < 1 ? "방금 전" : min < 60 ? `${min}분 전` : `${Math.floor(min / 60)}시간 전`;
  }, [state.lastUpdated]);

  if (loading) return <div className="p-4 space-y-4"><SkeletonGrid /></div>;

  return (
    <div className="p-4 pb-8 space-y-4 max-w-2xl mx-auto" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <GlobalToast />
      {refreshing && <div className="flex justify-center"><Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--tg-theme-button-color, #5288c1)" }} /></div>}
      {!state.online && (
        <div className="flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium" style={{ backgroundColor: "var(--tg-theme-destructive-text-color, #ec3942)" }}>
          <WifiOff className="h-3.5 w-3.5 text-white" /><span className="text-white">오프라인 상태입니다</span>
        </div>
      )}
      {state.stale && (
        <div className="flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium" style={{ backgroundColor: "#f59e0b" }}>
          <CircleAlert className="h-3.5 w-3.5 text-white" /><span className="text-white">데이터가 최신이 아닙니다</span>
          <button onClick={() => fetchData(true)} className="ml-1 underline">새로고침</button>
        </div>
      )}

      <WeeklySummaryCard />

      <div className="grid grid-cols-2 gap-3">
        <StatCard type="activeAccounts" value={`${state.activeAccounts}`} onClick={() => handleTabChange("profile")} />
        <StatCard type="queueCount" value={`${state.queueCount}`} />
        <StatCard type="tokenBalance" value={String(state.tokenBalance)} />
        <StatCard type="recentBroadcasts" value={`${state.recentBroadcasts.length}`} />
      </div>

      {state.todayTotal > 0 && (
        <div className="flex items-center justify-center gap-2 text-xs" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>
          <TrendingUp className="h-3.5 w-3.5" /> 오늘 총 <span className="font-semibold text-emerald-400">{state.todayTotal}건</span> 발송 완료
        </div>
      )}

      {state.pixelOffices.length > 0 && (
        <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4" style={{ color: "var(--tg-theme-button-color, #5288c1)" }} />PixelOffice</h3>
            <button onClick={() => handleTabChange("profile")} className="flex items-center gap-0.5 text-[11px] font-medium" style={{ color: "var(--tg-theme-button-color, #5288c1)" }}>관리 <ChevronRight className="h-3 w-3" /></button>
          </div>
          <div className="space-y-2">
            {state.pixelOffices.map(po => (
              <div key={po.id} className="flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-[var(--tg-theme-section-separator-color,#3a4a5a)] transition-colors">
                <Bot className="h-5 w-5" style={{ color: po.status === "active" ? "#22c55e" : "var(--tg-theme-hint-color, #708499)" }} />
                <div className="flex-1 min-w-0"><span className="text-sm font-medium block">{po.name}</span><span className="text-[10px]" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>{po.status === "active" ? "운영 중" : "대기"}</span></div>
                <ChevronRight className="h-4 w-4" style={{ color: "var(--tg-theme-hint-color, #708499)" }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {state.error && (
        <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
          <CircleAlert className="h-8 w-8 mx-auto mb-2" style={{ color: "var(--tg-theme-destructive-text-color, #ec3942)" }} />
          <p className="text-sm font-medium mb-2">데이터를 불러오지 못했습니다</p>
          <button onClick={() => fetchData()} className="rounded-xl px-5 py-2 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)" }}>다시 시도</button>
        </div>
      )}

      <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Users className="h-4 w-4" style={{ color: "var(--tg-theme-button-color, #5288c1)" }} />
          활성 계정
          {state.accounts.length > 0 && <span className="ml-auto text-[10px] font-normal" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>{state.accounts.length}개</span>}
        </h3>
        {state.accounts.length === 0 ? <EmptyAccountState onConnect={() => handleTabChange("profile")} /> : (
          <div className="space-y-1">
            {state.accounts.map((acc, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-[var(--tg-theme-section-separator-color,#3a4a5a)] active:scale-[0.98] transition-all cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
                    <AccountStatusDot status={acc.status} size="md" />
                  </div>
                  <div><span className="text-sm font-mono truncate max-w-[120px] block">{acc.phone}</span><span className="text-[10px]" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>오늘 {acc.todaySent}회 발송 · <AccountStatusDot status={acc.status} /> {acc.status}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {state.recentBroadcasts.length > 0 && (
        <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4" style={{ color: "var(--tg-theme-button-color, #5288c1)" }} />최근 발송</h3>
            <button onClick={() => handleTabChange("send")} className="flex items-center gap-0.5 text-[11px] font-medium" style={{ color: "var(--tg-theme-button-color, #5288c1)" }}>더보기 <ArrowRight className="h-3 w-3" /></button>
          </div>
          <div className="space-y-1">
            {state.recentBroadcasts.slice(0, 5).map(b => (
              <div key={b.id} className="flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-[var(--tg-theme-section-separator-color,#3a4a5a)] transition-colors">
                <span className={`flex h-2.5 w-2.5 shrink-0 rounded-full ${b.status === "sent" ? "bg-emerald-500" : "bg-amber-500"}`} />
                <span className="text-xs truncate flex-1">{b.message}</span>
                <span className={`text-[10px] font-medium ${b.status === "sent" ? "text-emerald-400" : "text-amber-400"}`}>{b.recipients}개</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {allZero && !state.error && (
        <div className="flex flex-col items-center py-8 text-center">
          <p className="text-xs" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>AI 채팅탭에서 메시지를 보내보세요.</p>
        </div>
      )}

      <button onClick={handleDoubleTap} className="flex items-center justify-center gap-1.5 w-full py-2">
        <RefreshCw className="h-3 w-3 opacity-40" style={{ color: "var(--tg-theme-hint-color, #708499)" }} />
        <p className="text-[10px]" style={{ color: state.stale ? "#f59e0b" : "var(--tg-theme-hint-color, #708499)" }}>{relativeTime} 갱신</p>
      </button>
    </div>
  );
});
