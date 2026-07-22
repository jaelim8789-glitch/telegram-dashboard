"use client";

import { useEffect, useState, memo, useCallback, useMemo, useRef } from "react";
import { Send, CheckCircle2, Coins, Clock, Users, Loader2, TrendingUp, Plug, Plus, RefreshCw, CircleAlert, WifiOff } from "lucide-react";
import * as api from "@/lib/api";
import { fetchTokenBalance, fetchRecentBroadcasts } from "@/lib/api-miniapp";
import type { BroadcastStatus } from "@/types";

interface AccountItem { id: string; phone: string; status: string; todaySent: number; healthScore: number; }
interface BroadcastItem { id: string; message: string; status: BroadcastStatus; sentAt: string; recipients: number; }

const StatCard = memo(function StatCard({ type, value, prevValue }: { type: string; value: string; prevValue?: string }) {
  const configs: Record<string, { icon: typeof Send; label: string; bg: string; iconBg: string }> = {
    activeAccounts: { icon: Users, label: "활성 계정", bg: "from-emerald-600/20 to-emerald-800/10", iconBg: "bg-emerald-500" },
    queueCount: { icon: Clock, label: "발송 대기", bg: "from-blue-600/20 to-blue-800/10", iconBg: "bg-blue-500" },
    tokenBalance: { icon: Coins, label: "토큰 잔액", bg: "from-amber-600/20 to-amber-800/10", iconBg: "bg-amber-500" },
    recentBroadcasts: { icon: TrendingUp, label: "최근 발송", bg: "from-purple-600/20 to-purple-800/10", iconBg: "bg-purple-500" },
  };
  const s = configs[type] || configs.activeAccounts;
  const Icon = s.icon;
  return (
    <div className={`rounded-2xl p-4 flex flex-col gap-2 bg-gradient-to-br ${s.bg}`}>
      <div className="flex items-center gap-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${s.iconBg}`}><Icon className="h-4 w-4 text-white" /></div>
        <span className="text-[11px] font-medium opacity-70" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>{s.label}</span>
      </div>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
    </div>
  );
});

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
          <div className="h-4 w-16 rounded bg-gray-700" />
          <div className="h-8 w-20 rounded bg-gray-700" />
        </div>
      ))}
    </div>
  );
}

function EmptyAccountState({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full mb-4" style={{ backgroundColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }}>
        <Plug className="h-7 w-7 opacity-60" style={{ color: "var(--tg-theme-hint-color, #708499)" }} />
      </div>
      <p className="text-sm font-semibold mb-1">연결된 계정이 없습니다</p>
      <p className="text-[11px] mb-4 max-w-[240px]" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>첫 Telegram 계정을 연결하고 자동화를 시작해보세요</p>
      <button onClick={onConnect} className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-95" style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)" }}>
        <Plus className="h-4 w-4" /> 계정 연결하기
      </button>
    </div>
  );
}

export const MiniAppDashboard = memo(function MiniAppDashboard() {
  const [state, setState] = useState({ tokenBalance: 0, activeAccounts: 0, queueCount: 0, accounts: [] as AccountItem[], recentBroadcasts: [] as BroadcastItem[], lastUpdated: null as Date | null, error: false, online: true });
  const [loading, setLoading] = useState(true);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [accountsList, scheduler, tokenBalance, broadcasts] = await Promise.all([
        api.fetchAccounts().catch(() => [] as any[]),
        api.fetchSchedulerStatus().catch(() => null),
        fetchTokenBalance(),
        fetchRecentBroadcasts(),
      ]);
      const activeAccounts = accountsList.filter((a: any) => a.status === "active");
      setState({
        tokenBalance, activeAccounts: activeAccounts.length, queueCount: scheduler?.due_broadcasts_count ?? 0,
        accounts: activeAccounts.slice(0, 5).map((a: any) => ({ id: a.id, phone: a.phone, status: a.status, todaySent: a.todaySent, healthScore: 85 })),
        recentBroadcasts: broadcasts, lastUpdated: new Date(), error: false, online: true,
      });
    } catch {
      setState(prev => ({ ...prev, error: true }));
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); const interval = setInterval(fetchData, 30000); return () => clearInterval(interval); }, [fetchData]);

  useEffect(() => {
    const onLine = () => setState(prev => ({ ...prev, online: true }));
    const offLine = () => setState(prev => ({ ...prev, online: false }));
    window.addEventListener("online", onLine); window.addEventListener("offline", offLine);
    return () => { window.removeEventListener("online", onLine); window.removeEventListener("offline", offLine); };
  }, []);

  const handleConnectAccount = useCallback(() => { try { const { hapticFeedback } = require("@tma.js/sdk-react"); hapticFeedback.impactOccurred("light"); } catch {} }, []);
  const handleRetry = useCallback(() => { fetchData(); try { const { hapticFeedback } = require("@tma.js/sdk-react"); hapticFeedback.impactOccurred("medium"); } catch {} }, [fetchData]);

  function onTouchStart(e: React.TouchEvent) { touchStartY.current = e.touches[0].clientY; }
  function onTouchMove(e: React.TouchEvent) { const dy = e.touches[0].clientY - touchStartY.current; if (dy > 0) setPullDistance(Math.min(dy * 0.3, 80)); }
  function onTouchEnd() { if (pullDistance > 50) fetchData(true); setPullDistance(0); }

  const allZero = useMemo(() => state.activeAccounts === 0 && state.queueCount === 0 && state.tokenBalance === 0 && state.recentBroadcasts.length === 0, [state]);

  if (loading) return <div className="p-4 space-y-4"><SkeletonGrid /><SkeletonGrid /></div>;

  return (
    <div className="p-4 pb-8 space-y-4 max-w-2xl mx-auto" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {refreshing && <div className="flex justify-center"><Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--tg-theme-button-color, #5288c1)" }} /></div>}
      {!state.online && (
        <div className="flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium" style={{ backgroundColor: "var(--tg-theme-destructive-text-color, #ec3942)" }}>
          <WifiOff className="h-3.5 w-3.5 text-white" /><span className="text-white">오프라인 상태입니다</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatCard type="activeAccounts" value={`${state.activeAccounts}개`} />
        <StatCard type="queueCount" value={`${state.queueCount}건`} />
        <StatCard type="tokenBalance" value={String(state.tokenBalance)} />
        <StatCard type="recentBroadcasts" value={`${state.recentBroadcasts.length}건`} />
      </div>

      {state.error && (
        <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
          <CircleAlert className="h-8 w-8 mx-auto mb-2" style={{ color: "var(--tg-theme-destructive-text-color, #ec3942)" }} />
          <p className="text-sm font-medium mb-2">데이터를 불러오지 못했습니다</p>
          <button onClick={handleRetry} className="rounded-xl px-5 py-2 text-sm font-semibold text-white active:scale-95" style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)" }}>다시 시도</button>
        </div>
      )}

      <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Users className="h-4 w-4" style={{ color: "var(--tg-theme-button-color, #5288c1)" }} />
          활성 계정
          {state.accounts.length > 0 && <span className="ml-auto text-[10px] font-normal" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>{state.accounts.length}개</span>}
        </h3>
        {state.accounts.length === 0 ? <EmptyAccountState onConnect={handleConnectAccount} /> : (
          <div className="space-y-1">
            {state.accounts.map((acc, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-[var(--tg-theme-section-separator-color,#3a4a5a)] active:scale-[0.98] transition-all cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20"><CheckCircle2 className="h-4 w-4 text-emerald-400" /></div>
                  <div><span className="text-sm font-mono truncate max-w-[120px] block">{acc.phone}</span><span className="text-[10px]" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>오늘 {acc.todaySent}회 발송</span></div>
                </div>
              </div>
            ))}
            <button onClick={handleConnectAccount} className="flex w-full items-center justify-center gap-1.5 mt-2 py-2.5 rounded-xl text-xs font-medium transition-colors active:scale-[0.98]" style={{ color: "var(--tg-theme-button-color, #5288c1)", backgroundColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }}>
              <Plus className="h-3.5 w-3.5" /> 계정 더 연결하기
            </button>
          </div>
        )}
      </div>

      {state.recentBroadcasts.length > 0 && (
        <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" style={{ color: "var(--tg-theme-button-color, #5288c1)" }} />
            최근 발송
          </h3>
          <div className="space-y-2">
            {state.recentBroadcasts.slice(0, 10).map(b => (
              <div key={b.id} className="flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-[var(--tg-theme-section-separator-color,#3a4a5a)] transition-colors">
                <span className={`flex h-2.5 w-2.5 shrink-0 rounded-full ${b.status === "sent" ? "bg-emerald-500" : b.status === "pending" ? "bg-amber-500" : "bg-red-500"}`} />
                <div className="flex-1 min-w-0"><span className="text-xs truncate block">{b.message}</span><span className="text-[10px]" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>{b.recipients}개 그룹</span></div>
                <span className={`text-[10px] font-medium ${b.status === "sent" ? "text-emerald-400" : b.status === "pending" ? "text-amber-400" : "text-red-400"}`}>{b.status === "sent" ? "완료" : b.status === "pending" ? "대기" : "실패"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {allZero && !state.error && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <CircleAlert className="h-12 w-12 mb-3 opacity-30" style={{ color: "var(--tg-theme-hint-color, #708499)" }} />
          <p className="text-xs" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>첫 발송을 시작해보세요! AI 채팅탭에서 메시지를 보내보세요.</p>
        </div>
      )}

      {state.lastUpdated && (
        <div className="flex items-center justify-center gap-1.5">
          <RefreshCw className="h-3 w-3 opacity-40" style={{ color: "var(--tg-theme-hint-color, #708499)" }} />
          <p className="text-[10px]" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>
            {(() => { const diff = Date.now() - state.lastUpdated!.getTime(); const min = Math.floor(diff / 60000); return min < 1 ? "방금 전" : min < 60 ? `${min}분 전` : `${Math.floor(min / 60)}시간 전`; })()} 갱신
          </p>
        </div>
      )}
    </div>
  );
});
