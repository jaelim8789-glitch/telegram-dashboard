"use client";

import { useEffect, useState } from "react";
import { initData, useSignal, backButton } from "@tma.js/sdk-react";
import { Send, BarChart3, Coins, RefreshCw, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import * as api from "@/lib/api";

// ── 타입 ──────────────────────────────────────────────────────

interface MiniAppState {
  tokenBalance: number;
  todaySent: number;
  successRate: number;
  queueCount: number;
  accounts: { phone: string; status: string; todaySent: number }[];
  error: string | null;
}

// ── 컴포넌트 ──────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-2"
      style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}
    >
      <div className="flex items-center gap-2" style={{ color: color }}>
        {icon}
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  );
}

function QuickSendForm() {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleQuickSend() {
    if (!message.trim() || sending) return;
    setSending(true);
    setResult(null);
    try {
      // 가장 첫 번째 활성 계정 찾기
      const accounts = await api.fetchAccounts();
      const active = accounts.find((a) => a.status === "active");
      if (!active) {
        setResult("⚠️ 사용 가능한 계정이 없습니다.");
        return;
      }
      const groups = await api.fetchGroups(active.id);
      if (groups.length === 0) {
        setResult("⚠️ 발송 가능한 그룹이 없습니다.");
        return;
      }
      // 첫 5개 그룹에 발송
      await api.sendToGroup({
        accountId: active.id,
        message: message.trim(),
        groupIds: groups.slice(0, 5).map((g) => g.id),
      });
      setResult("✅ 발송 완료! (5개 그룹)");
      setMessage("");
    } catch (err) {
      setResult(`❌ ${err instanceof Error ? err.message : "발송 실패"}`);
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

// ── 메인 페이지 ──────────────────────────────────────────────

export default function MiniAppPage() {
  const [state, setState] = useState<MiniAppState>({
    tokenBalance: 0,
    todaySent: 0,
    successRate: 0,
    queueCount: 0,
    accounts: [],
    error: null,
  });
  const [loading, setLoading] = useState(true);
  const initDataState = useSignal(initData.state);

  async function fetchData() {
    try {
      setLoading(true);
      const [accounts, summary, scheduler] = await Promise.all([
        api.fetchAccounts().catch(() => []),
        api.fetchRuntimeInspectorSummary().catch(() => null),
        api.fetchSchedulerStatus().catch(() => null),
      ]);

      const activeAccounts = accounts.filter((a) => a.status === "active");
      const todaySent = activeAccounts.reduce((sum, a) => sum + a.todaySent, 0);
      const totalAttempts = summary?.total ?? 0;
      const healthy = summary?.healthy ?? 0;
      const successRate = totalAttempts > 0 ? Math.round((healthy / totalAttempts) * 100) : 0;

      setState({
        tokenBalance: 1000, // TODO: 실제 토큰 API 연동
        todaySent,
        successRate,
        queueCount: scheduler?.due_broadcasts_count ?? 0,
        accounts: activeAccounts.map((a) => ({
          phone: a.phone,
          status: a.status,
          todaySent: a.todaySent,
        })),
        error: null,
      });
    } catch (err) {
      setState((prev) => ({ ...prev, error: "데이터를 불러올 수 없습니다." }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    backButton.mount();
    return () => {
      backButton.unmount();
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
            />
            <StatCard
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="성공률"
              value={`${state.successRate}%`}
              color="#4caf50"
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
                    <span className="text-xs opacity-60">{acc.todaySent}회</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 빠른 발송 */}
          <QuickSendForm />

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