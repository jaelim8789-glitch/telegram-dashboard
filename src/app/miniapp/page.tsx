"use client";

import { useEffect, useState } from "react";
import { initData, useSignal, backButton, MainButton, HapticFeedback } from "@tma.js/sdk-react";
import { Send, BarChart3, Coins, RefreshCw, CheckCircle2, XCircle, Clock, Loader2, AlertCircle, TrendingUp, Users } from "lucide-react";
import * as api from "@/lib/api";
import { 
  fetchRecentBroadcasts, 
  fetchTokenBalance, 
  fetchAccountHealthScore, 
  fetchAccountDetails, 
  quickSendToTopGroups 
} from "@/lib/api-miniapp";

// ── 타입 ──────────────────────────────────────────────────────

interface Account {
  id: string;
  phone: string;
  status: string;
  todaySent: number;
  healthScore: number;
  lastActive: string;
}

interface BroadcastItem {
  id: string;
  message: string;
  status: 'pending' | 'sent' | 'failed';
  sentAt: string;
  recipients: number;
}

interface MiniAppState {
  tokenBalance: number;
  todaySent: number;
  successRate: number;
  queueCount: number;
  accounts: Account[];
  recentBroadcasts: BroadcastItem[];
  error: string | null;
}

// ── 컴포넌트 ──────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  color,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  trend?: {
    value: number;
    positive: boolean;
  };
}) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-2"
      style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2" style={{ color: color }}>
          {icon}
          <span className="text-xs font-medium opacity-80">{label}</span>
        </div>
        {trend && (
          <div className={`flex items-center text-xs ${trend.positive ? 'text-green-500' : 'text-red-500'}`}>
            {trend.positive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingUp className="h-3 w-3 mr-1 rotate-180" />}
            {trend.value > 0 ? '+' : ''}{trend.value}%
          </div>
        )}
      </div>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  );
}

function QuickSendForm({ onSend }: { onSend: (message: string) => void }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const haptic = HapticFeedback.use();

  async function handleQuickSend() {
    if (!message.trim() || sending) return;
    
    haptic.notificationOccurred('success');
    setSending(true);
    setResult(null);
    
    try {
      // 가장 첫 번째 활성 계정 찾기
      const accounts = await api.fetchAccounts();
      const active = accounts.find((a: Account) => a.status === "active");
      if (!active) {
        setResult("⚠️ 사용 가능한 계정이 없습니다.");
        haptic.notificationOccurred('error');
        return;
      }
      const groups = await api.fetchGroups(active.id);
      if (groups.length === 0) {
        setResult("⚠️ 발송 가능한 그룹이 없습니다.");
        haptic.notificationOccurred('error');
        return;
      }
      // 첫 5개 그룹에 발송
      await api.sendToGroup({
        accountId: active.id,
        message: message.trim(),
        groupIds: groups.slice(0, 5).map((g: any) => g.id),
      });
      setResult("✅ 발송 완료! (5개 그룹)");
      setMessage("");
      onSend(message); // 부모 컴포넌트에 발송 알림
    } catch (err) {
      setResult(`❌ ${err instanceof Error ? err.message : "발송 실패"}`);
      haptic.notificationOccurred('error');
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}
    >
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Send className="h-4 w-4" style={{ color: "var(--tg-theme-button-color, #5288c1)" }} />
        빠른 발송
      </h3>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="보낼 메시지를 입력하세요..."
        rows={3}
        className="w-full rounded-xl p-3 text-sm resize-none outline-none"
        style={{
          backgroundColor: "var(--tg-theme-bg-color, #17212b)",
          color: "var(--tg-theme-text-color, #f5f5f5)",
          border: "1px solid var(--tg-theme-hint-color, #708499)",
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleQuickSend();
          }
        }}
      />
      <button
        onClick={handleQuickSend}
        disabled={sending || !message.trim()}
        className="w-full rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2"
        style={{
          backgroundColor: "var(--tg-theme-button-color, #5288c1)",
          color: "var(--tg-theme-button-text-color, #ffffff)",
          opacity: sending || !message.trim() ? 0.6 : 1,
        }}
      >
        {sending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {sending ? "발송 중..." : "지금 발송하기 (처음 5개 그룹)"}
      </button>
      {result && (
        <p className="text-xs text-center" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>
          {result}
        </p>
      )}
    </div>
  );
}

function RecentBroadcasts({ broadcasts }: { broadcasts: BroadcastItem[] }) {
  if (broadcasts.length === 0) {
    return (
      <div
        className="rounded-2xl p-4 text-center"
        style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}
      >
        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" style={{ color: "var(--tg-theme-hint-color, #708499)" }} />
        <p className="text-xs opacity-60">최근 발송 내역이 없습니다</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-4"
      style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}
    >
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Send className="h-4 w-4" />
        최근 발송
      </h3>
      <div className="space-y-3">
        {broadcasts.slice(0, 5).map((broadcast) => (
          <div key={broadcast.id} className="flex items-start justify-between py-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex h-2 w-2 rounded-full ${
                  broadcast.status === 'sent' ? 'bg-green-500' : 
                  broadcast.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="text-xs truncate">{broadcast.message.substring(0, 30)}{broadcast.message.length > 30 ? '...' : ''}</span>
              </div>
              <div className="flex items-center gap-2 text-xs opacity-60">
                <Users className="h-3 w-3" />
                <span>{broadcast.recipients} 그룹</span>
                <span>·</span>
                <span>{new Date(broadcast.sentAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────

export default function MiniAppPage() {
  const [state, setState] = useState<MiniAppState>({
    tokenBalance: 0,
    todaySent: 0,
    successRate: 0,
    queueCount: 0,
    accounts: [],
    recentBroadcasts: [],
    error: null,
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const initDataState = useSignal(initData.state);
  const haptic = HapticFeedback.use();
  
  // Telegram MainButton 설정
  useEffect(() => {
    MainButton.setText("새로고침");
    MainButton.enable();
    MainButton.show();
    
    const handleMainButtonClick = () => {
      fetchData();
      haptic.impactOccurred('light');
    };
    
    MainButton.on('click', handleMainButtonClick);
    
    return () => {
      MainButton.off('click', handleMainButtonClick);
      MainButton.hide();
    };
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      haptic.impactOccurred('medium');
      
      const [accounts, summary, scheduler] = await Promise.all([
        api.fetchAccounts().catch(() => []),
        api.fetchRuntimeInspectorSummary().catch(() => null),
        api.fetchSchedulerStatus().catch(() => null),
      ]);

      // 토큰 잔액 가져오기
      const tokenBalance = await fetchTokenBalance();
      
      // 최근 발송 내역 가져오기
      const recentBroadcasts = await fetchRecentBroadcasts();
      
      // 계정별 상세 정보 가져오기
      const accountsWithDetails = await Promise.all(
        accounts.map(async (acc: any) => {
          const details = await fetchAccountDetails(acc.id);
          return {
            ...acc,
            healthScore: details.healthScore,
            lastActive: details.lastActive,
          };
        })
      );

      const activeAccounts = accountsWithDetails.filter((a: Account) => a.status === "active");
      const todaySent = activeAccounts.reduce((sum: number, a: Account) => sum + a.todaySent, 0);
      const totalAttempts = summary?.total ?? 0;
      const healthy = summary?.healthy ?? 0;
      const successRate = totalAttempts > 0 ? Math.round((healthy / totalAttempts) * 100) : 0;

      setState({
        tokenBalance,
        todaySent,
        successRate,
        queueCount: scheduler?.due_broadcasts_count ?? 0,
        accounts: activeAccounts,
        recentBroadcasts,
        error: null,
      });
      setLastUpdated(new Date());
    } catch (err) {
      setState((prev) => ({ ...prev, error: "데이터를 불러올 수 없습니다." }));
      haptic.notificationOccurred('error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    backButton.mount();
    
    // 30초마다 자동 새로고침 (배터리 절약을 위해)
    const interval = setInterval(fetchData, 30000);
    
    return () => {
      backButton.unmount();
      clearInterval(interval);
    };
  }, []);

  const user = initDataState?.user;

  return (
    <div className="p-4 pb-8 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">
            {user ? `${user.first_name}님` : "TeleMon"}
          </h1>
          <p
            className="text-xs mt-0.5"
            style={{ color: "var(--tg-theme-hint-color, #708499)" }}
          >
            {state.accounts.length}개 계정 활성 · {state.todaySent}회 발송
          </p>
          {lastUpdated && (
            <p
              className="text-xs"
              style={{ color: "var(--tg-theme-hint-color, #708499)" }}
            >
              {lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 업데이트
            </p>
          )}
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 rounded-xl"
          style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}
        >
          <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* 통계 카드 */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--tg-theme-button-color, #5288c1)" }} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<Send className="h-4 w-4" />}
              label="오늘 발송"
              value={String(state.todaySent)}
              color="#5288c1"
              trend={{ value: 12, positive: true }}
            />
            <StatCard
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="성공률"
              value={`${state.successRate}%`}
              color="#4caf50"
              trend={{ value: 5, positive: true }}
            />
            <StatCard
              icon={<Coins className="h-4 w-4" />}
              label="토큰 잔액"
              value={String(state.tokenBalance)}
              color="#ff9800"
            />
            <StatCard
              icon={<Clock className="h-4 w-4" />}
              label="대기열"
              value={String(state.queueCount)}
              color="#ab47bc"
              trend={{ value: -2, positive: false }}
            />
          </div>

          {/* 계정 상태 */}
          <div
            className="rounded-2xl p-4"
            style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}
          >
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              계정 현황
            </h3>
            <div className="space-y-2">
              {state.accounts.length === 0 ? (
                <p className="text-xs opacity-60">활성 계정이 없습니다</p>
              ) : (
                state.accounts.slice(0, 5).map((acc, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                    style={{ borderColor: "var(--tg-theme-hint-color, #708499)" }}
                  >
                    <div className="flex items-center gap-2">
                      {acc.status === "active" ? (
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-500" />
                      )}
                      <span className="text-sm font-mono">{acc.phone}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs opacity-60">{acc.todaySent}회</span>
                      <div className="w-16 bg-gray-700 rounded-full h-1.5">
                        <div 
                          className="bg-green-500 h-1.5 rounded-full" 
                          style={{ width: `${Math.min(acc.healthScore || 95, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 최근 발송 내역 */}
          <RecentBroadcasts broadcasts={state.recentBroadcasts} />

          {/* 빠른 발송 */}
          <QuickSendForm onSend={fetchData} />

          {/* 에러 */}
          {state.error && (
            <p
              className="text-xs text-center"
              style={{ color: "var(--tg-theme-destructive-text-color, #ec3942)" }}
            >
              {state.error}
            </p>
          )}
        </>
      )}
    </div>
  );
}