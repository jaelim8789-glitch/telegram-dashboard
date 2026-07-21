"use client";

import { useEffect, useState } from "react";
import { Send, CheckCircle2, Coins, Clock, Users, Loader2, TrendingUp } from "lucide-react";
import * as api from "@/lib/api";
import { fetchTokenBalance, fetchRecentBroadcasts } from "@/lib/api-miniapp";
import type { BroadcastStatus } from "@/types";

interface AccountItem {
  id: string;
  phone: string;
  status: string;
  todaySent: number;
  healthScore: number;
}

interface BroadcastItem {
  id: string;
  message: string;
  status: BroadcastStatus;
  sentAt: string;
  recipients: number;
}

interface DashboardState {
  tokenBalance: number;
  activeAccounts: number;
  queueCount: number;
  accounts: AccountItem[];
  recentBroadcasts: BroadcastItem[];
  lastUpdated: Date | null;
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-2" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
      <div className="flex items-center gap-2" style={{ color }}>
        {icon}
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  );
}

export function MiniAppDashboard() {
  const [state, setState] = useState<DashboardState>({
    tokenBalance: 0,
    activeAccounts: 0,
    queueCount: 0,
    accounts: [],
    recentBroadcasts: [],
    lastUpdated: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        setLoading(true);
        const [accountsList, scheduler, tokenBalance, broadcasts] = await Promise.all([
          api.fetchAccounts().catch(() => []),
          api.fetchSchedulerStatus().catch(() => null),
          fetchTokenBalance(),
          fetchRecentBroadcasts(),
        ]);

        if (cancelled) return;

        const activeAccounts = accountsList.filter((a) => a.status === "active");

        setState({
          tokenBalance,
          activeAccounts: activeAccounts.length,
          queueCount: scheduler?.due_broadcasts_count ?? 0,
          accounts: activeAccounts.slice(0, 5).map((a) => ({
            id: a.id,
            phone: a.phone,
            status: a.status,
            todaySent: a.todaySent,
            healthScore: 85,
          })),
          recentBroadcasts: broadcasts,
          lastUpdated: new Date(),
        });
      } catch {
        // Silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--tg-theme-button-color, #5288c1)" }} />
      </div>
    );
  }

  return (
    <div className="p-4 pb-8 space-y-4">
      {state.lastUpdated && (
        <p className="text-[10px] text-center" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>
          {state.lastUpdated.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 업데이트
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Send className="h-4 w-4" />} label="활성 계정" value={`${state.activeAccounts}개`} color="#5288c1" />
        <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="발송 대기" value={`${state.queueCount}건`} color="#4caf50" />
        <StatCard icon={<Coins className="h-4 w-4" />} label="토큰 잔액" value={String(state.tokenBalance)} color="#ff9800" />
        <StatCard icon={<Clock className="h-4 w-4" />} label="최근 발송" value={`${state.recentBroadcasts.length}건`} color="#ab47bc" />
      </div>

      <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Users className="h-4 w-4" />
          활성 계정
        </h3>
        {state.accounts.length === 0 ? (
          <p className="text-xs opacity-60">연결된 계정이 없습니다</p>
        ) : (
          <div className="space-y-2">
            {state.accounts.map((acc, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b last:border-0"
                style={{ borderColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span className="text-sm font-mono">{acc.phone}</span>
                </div>
                <span className="text-xs opacity-60">{acc.todaySent}회</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {state.recentBroadcasts.length > 0 && (
        <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            최근 발송
          </h3>
          <div className="space-y-3">
            {state.recentBroadcasts.map((b) => (
              <div key={b.id} className="flex items-center gap-2">
                <span className={`inline-flex h-2 w-2 rounded-full ${b.status === "sent" ? "bg-green-500" : b.status === "pending" ? "bg-yellow-500" : "bg-red-500"}`} />
                <span className="text-xs truncate flex-1">{b.message}</span>
                <span className="text-[10px] opacity-60 shrink-0">{b.recipients}개</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
