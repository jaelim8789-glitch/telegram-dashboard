"use client";

import { useEffect, useState, useMemo, memo, useCallback, useRef } from "react";
import { Send, CheckCircle2, Coins, Clock, Users, Loader2, TrendingUp, Plug, Plus, RefreshCw, CircleAlert, Wifi, WifiOff, SendHorizonal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as api from "@/lib/api";
import { fetchTokenBalance, fetchRecentBroadcasts } from "@/lib/api-miniapp";
import type { BroadcastStatus } from "@/types";

interface AccountItem {
  id: string; phone: string; status: string; todaySent: number; healthScore: number;
}

interface BroadcastItem {
  id: string; message: string; status: BroadcastStatus; sentAt: string; recipients: number;
}

interface DashboardState {
  tokenBalance: number; activeAccounts: number; queueCount: number;
  accounts: AccountItem[]; recentBroadcasts: BroadcastItem[]; lastUpdated: Date | null;
}

const STAT_CARD_STYLES: Record<string, { icon: typeof Send; label: string; bg: string; iconBg: string }> = {
  activeAccounts: { icon: Users, label: "활성 계정", bg: "from-emerald-600/20 to-emerald-800/10", iconBg: "bg-emerald-500" },
  queueCount: { icon: Clock, label: "발송 대기", bg: "from-blue-600/20 to-blue-800/10", iconBg: "bg-blue-500" },
  tokenBalance: { icon: Coins, label: "토큰 잔액", bg: "from-amber-600/20 to-amber-800/10", iconBg: "bg-amber-500" },
  recentBroadcasts: { icon: TrendingUp, label: "최근 발송", bg: "from-purple-600/20 to-purple-800/10", iconBg: "bg-purple-500" },
};

interface StatCardProps { type: string; value: string; }
const StatCard = memo(function StatCard({ type, value }: StatCardProps) {
  const s = STAT_CARD_STYLES[type] || STAT_CARD_STYLES.activeAccounts;
  const Icon = s.icon;
  const numericValue = parseFloat(value.replace(/[^0-9.]/g, ""));
  const displayValue = isNaN(numericValue) ? value : value;
  return (
    <div className={`rounded-2xl p-4 flex flex-col gap-2 bg-gradient-to-br ${s.bg}`} style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
      <div className="flex items-center gap-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${s.iconBg}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <span className="text-[11px] font-medium opacity-70" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>{s.label}</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.span
          key={displayValue}
          className="text-2xl font-bold"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {displayValue}
        </motion.span>
      </AnimatePresence>
    </div>
  );
});

function SkeletonCards() {
  return (
    <div className="grid grid-cols-2 gap-3 animate-pulse">
      {[0, 1, 2, 3].map((i) => (
        <div key={`sk-card-${i}`} className="rounded-2xl p-4 flex flex-col gap-2" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg" style={{ backgroundColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }} />
            <div className="h-3 w-14 rounded" style={{ backgroundColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }} />
          </div>
          <div className="h-7 w-20 rounded" style={{ backgroundColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }} />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <CircleAlert className="h-12 w-12 mb-3" style={{ color: "var(--tg-theme-destructive-text-color, #ec3942)" }} />
      <p className="text-sm font-semibold mb-1">데이터를 불러오지 못했습니다</p>
      <p className="text-xs mb-4" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>네트워크 연결을 확인하고 다시 시도해주세요</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-95"
        style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)" }}
        aria-label="다시 시도"
      >
        <RefreshCw className="h-4 w-4" /> 다시 시도
      </button>
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
      <button
        onClick={onConnect}
        className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-95"
        style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)" }}
        aria-label="계정 연결하기"
      >
        <Plus className="h-4 w-4" /> 계정 연결하기
      </button>
    </div>
  );
}

function EmptyBroadcastsState({ onGoSend }: { onGoSend: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full mb-4" style={{ backgroundColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }}>
        <SendHorizonal className="h-7 w-7 opacity-60" style={{ color: "var(--tg-theme-hint-color, #708499)" }} />
      </div>
      <p className="text-sm font-semibold mb-1">첫 발송을 시작해보세요</p>
      <p className="text-[11px] mb-4 max-w-[240px]" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>아직 발송 내역이 없습니다. 지금 첫 메시지를 보내보세요</p>
      <button
        onClick={onGoSend}
        className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-95"
        style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)" }}
        aria-label="발송하러 가기"
      >
        <Send className="h-4 w-4" /> 발송하러 가기
      </button>
    </div>
  );
}

function ConnectionIndicator({ online }: { online: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-2 w-2 rounded-full ${online ? "bg-emerald-500" : "bg-red-500"}`} />
      <span className="text-[10px]" style={{ color: online ? "var(--tg-theme-hint-color, #708499)" : "var(--tg-theme-destructive-text-color, #ec3942)" }}>
        {online ? "온라인" : "오프라인"}
      </span>
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

interface MiniAppDashboardProps {
  onTabChange?: (tab: string) => void;
}

export const MiniAppDashboard = memo(function MiniAppDashboard({ onTabChange }: MiniAppDashboardProps) {
  const [state, setState] = useState<DashboardState>({
    tokenBalance: 0, activeAccounts: 0, queueCount: 0, accounts: [], recentBroadcasts: [], lastUpdated: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [online, setOnline] = useState(true);
  const [pulling, setPulling] = useState(false);
  const [relativeTime, setRelativeTime] = useState("방금 전");
  const containerRef = useRef<HTMLDivElement>(null);
  const pullStartRef = useRef(0);

  const fetchData = useCallback(async () => {
    try {
      setError(false);
      const [accountsList, scheduler, tokenBalance, broadcasts] = await Promise.all([
        api.fetchAccounts().catch(() => []),
        api.fetchSchedulerStatus().catch(() => null),
        fetchTokenBalance(),
        fetchRecentBroadcasts(),
      ]);
      const activeAccounts = accountsList.filter((a) => a.status === "active");
      setState({
        tokenBalance, activeAccounts: activeAccounts.length,
        queueCount: scheduler?.due_broadcasts_count ?? 0,
        accounts: activeAccounts.slice(0, 5).map((a) => ({ id: a.id, phone: a.phone, status: a.status, todaySent: a.todaySent, healthScore: 85 })),
        recentBroadcasts: broadcasts, lastUpdated: new Date(),
      });
      setOnline(true);
    } catch {
      setError(true);
      setOnline(navigator.onLine);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    const onVisible = () => { if (document.visibilityState === "visible") fetchData(); };
    document.addEventListener("visibilitychange", onVisible);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [fetchData]);

  useEffect(() => {
    if (!state.lastUpdated) return;
    setRelativeTime(formatRelativeTime(state.lastUpdated));
    const timer = setInterval(() => {
      setRelativeTime(formatRelativeTime(state.lastUpdated!));
    }, 30000);
    return () => clearInterval(timer);
  }, [state.lastUpdated]);

  function hapticFeedback(type: "light" | "medium" | "heavy") {
    try { require("@tma.js/sdk-react").hapticFeedback.impactOccurred(type); } catch {}
  }

  function handleConnectAccount() {
    try { require("@tma.js/sdk-react").hapticFeedback.impactOccurred("light"); } catch {}
  }

  function handleRetry() {
    hapticFeedback("medium");
    setLoading(true);
    fetchData();
  }

  function handleGoSend() {
    hapticFeedback("light");
    if (onTabChange) onTabChange("send");
  }

  function handlePullStart(e: React.TouchEvent) {
    if (containerRef.current && containerRef.current.scrollTop <= 0) {
      pullStartRef.current = e.touches[0].clientY;
    }
  }

  function handlePullMove(e: React.TouchEvent) {
    if (pullStartRef.current === 0) return;
    const diff = e.touches[0].clientY - pullStartRef.current;
    if (diff > 120) {
      pullStartRef.current = 0;
      setPulling(true);
      fetchData().then(() => {
        setTimeout(() => setPulling(false), 300);
      });
    }
  }

  function handlePullEnd() {
    pullStartRef.current = 0;
  }

  const statCards = useMemo(() => {
    const cards = [
      { type: "activeAccounts" as const, value: `${state.activeAccounts}개` },
      { type: "queueCount" as const, value: `${state.queueCount}건` },
      { type: "tokenBalance" as const, value: String(state.tokenBalance) },
      { type: "recentBroadcasts" as const, value: `${state.recentBroadcasts.length}건` },
    ];
    return cards.map((c) => <StatCard key={c.type} type={c.type} value={c.value} />);
  }, [state.activeAccounts, state.queueCount, state.tokenBalance, state.recentBroadcasts.length]);

  const accountList = useMemo(() => state.accounts, [state.accounts]);

  if (loading) {
    return (
      <div className="p-4 pb-8 space-y-4 max-w-2xl mx-auto">
        <SkeletonCards />
      </div>
    );
  }

  if (error && state.accounts.length === 0) {
    return (
      <div className="p-4 pb-8 max-w-2xl mx-auto">
        <ErrorState onRetry={handleRetry} />
      </div>
    );
  }

  const allZero = state.activeAccounts === 0 && state.queueCount === 0 && state.tokenBalance === 0 && state.recentBroadcasts.length === 0;

  return (
    <div
      ref={containerRef}
      className="p-4 pb-8 space-y-4 max-w-2xl mx-auto"
      onTouchStart={handlePullStart}
      onTouchMove={handlePullMove}
      onTouchEnd={handlePullEnd}
    >
      {pulling && (
        <div className="flex justify-center py-2">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--tg-theme-button-color, #5288c1)" }} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {statCards}
      </div>

      <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" id="active-accounts-heading">
          <Users className="h-4 w-4" style={{ color: "var(--tg-theme-button-color, #5288c1)" }} />
          활성 계정
          {accountList.length > 0 && (
            <span className="ml-auto text-[10px] font-normal" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>
              {accountList.length}개
            </span>
          )}
        </h3>
        {accountList.length === 0 ? (
          <EmptyAccountState onConnect={handleConnectAccount} />
        ) : (
          <div className="space-y-1">
            {accountList.map((acc, i) => (
              <div key={acc.id} className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-[var(--tg-theme-section-separator-color,#3a4a5a)] active:scale-[0.98] transition-all cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-sm font-mono truncate max-w-[120px] block">{acc.phone}</span>
                    <span className="text-[10px]" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>오늘 {acc.todaySent}회 발송</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-12 rounded-full overflow-hidden bg-gray-700">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${acc.healthScore}%` }} />
                  </div>
                  <span className="text-[10px] font-medium text-emerald-400 w-6 text-right">{acc.healthScore}</span>
                </div>
              </div>
            ))}
            <button
              onClick={handleConnectAccount}
              className="flex w-full items-center justify-center gap-1.5 mt-2 py-2.5 rounded-xl text-xs font-medium transition-colors active:scale-[0.98]"
              style={{ color: "var(--tg-theme-button-color, #5288c1)", backgroundColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }}
              aria-label="계정 더 연결하기"
            >
              <Plus className="h-3.5 w-3.5" /> 계정 더 연결하기
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" id="recent-broadcasts-heading">
          <TrendingUp className="h-4 w-4" style={{ color: "var(--tg-theme-button-color, #5288c1)" }} />
          최근 발송
        </h3>
        {state.recentBroadcasts.length === 0 ? (
          <EmptyBroadcastsState onGoSend={handleGoSend} />
        ) : (
          <div className="space-y-2">
            {state.recentBroadcasts.slice(0, 10).map((b) => (
              <div key={b.id} className="flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-[var(--tg-theme-section-separator-color,#3a4a5a)] transition-colors">
                <span className={`flex h-2.5 w-2.5 shrink-0 rounded-full ${b.status === "sent" ? "bg-emerald-500" : b.status === "pending" ? "bg-amber-500" : "bg-red-500"}`} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs truncate block">{b.message}</span>
                  <span className="text-[10px]" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>
                    {b.recipients}개 그룹 · {new Date(b.sentAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <span className={`text-[10px] font-medium ${b.status === "sent" ? "text-emerald-400" : b.status === "pending" ? "text-amber-400" : "text-red-400"}`}>
                  {b.status === "sent" ? "완료" : b.status === "pending" ? "대기" : "실패"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {allZero && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <CircleAlert className="h-12 w-12 mb-3 opacity-30" style={{ color: "var(--tg-theme-hint-color, #708499)" }} />
          <p className="text-xs" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>
            첫 발송을 시작해보세요! AI 채팅탭에서 메시지를 보내보세요.
          </p>
        </div>
      )}

      {state.lastUpdated && (
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-1.5">
            <RefreshCw className="h-3 w-3 opacity-40" style={{ color: "var(--tg-theme-hint-color, #708499)" }} />
            <p className="text-[10px]" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>
              {relativeTime} 자동 갱신
            </p>
          </div>
          <ConnectionIndicator online={online} />
        </div>
      )}
    </div>
  );
});
