"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bot,
  UserPlus,
  MessageCircle,
  BarChart3,
  Settings,
  Globe,
  TrendingUp,
  ExternalLink,
  RefreshCw,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import * as guestApi from "@/lib/guest-bot-api";
import { useToast } from "@/components/ui/Toast";  // ── Per-User Usage Table ────────────────────────────────────────

function UsageTable({
  dailyUsage,
  globalLimit,
}: {
  dailyUsage: Record<string, number>;
  globalLimit: number;
  onLimitChange?: (userId: string, limit: number) => void;
}) {
  const [userLimits, setUserLimits] = useState<Record<string, number>>({});
  const [savingUser, setSavingUser] = useState<string | null>(null);
  const { toast } = useToast();

  const entries = Object.entries(dailyUsage).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-app-border bg-app-card/50 p-4">
        <div className="flex items-center gap-2 text-sm text-app-text-muted">
          <BarChart3 className="h-4 w-4 opacity-50" />
          오늘 사용한 게스트 사용자가 없습니다.
        </div>
      </div>
    );
  }

  async function handleSetLimit(userId: string) {
    const limit = userLimits[userId];
    if (limit == null || limit < 1) return;
    setSavingUser(userId);
    try {
      await guestApi.setGuestUserLimit(userId, limit);
      toast("success", `${userId}님의 한도가 ${limit}회로 설정되었습니다.`);
    } catch {
      toast("error", "사용자별 한도 설정에 실패했습니다.");
    }
    setSavingUser(null);
  }

  return (
    <div className="rounded-xl border border-app-border bg-app-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-app-text flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-app-primary" />
          사용자별 사용량 (오늘)
        </h3>
        <span className="text-[10px] text-app-text-muted">글로벌 한도: {globalLimit}회</span>
      </div>
      <div className="max-h-64 overflow-y-auto space-y-1">
        {entries.map(([userId, count]) => (
          <div
            key={userId}
            className="flex items-center justify-between rounded-lg bg-app-bg px-3 py-2 text-xs gap-2"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="font-mono text-app-text truncate max-w-[120px]">{userId}</span>
              <div className="h-1.5 w-20 flex-1 max-w-[100px] rounded-full bg-app-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-app-primary transition-all"
                  style={{ width: `${Math.min(100, (count / (entries[0]?.[1] || 1)) * 100)}%` }}
                />
              </div>
              <span className="font-semibold text-app-text w-6 text-right">{count}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="number"
                value={userLimits[userId] ?? globalLimit}
                onChange={(e) => setUserLimits((prev) => ({ ...prev, [userId]: Math.max(1, Math.min(1000, Number(e.target.value))) }))}
                className="w-14 rounded-md border border-app-border bg-app-card px-1.5 py-1 text-[10px] text-center outline-none focus:border-app-primary"
                min={1}
                max={1000}
              />
              <button
                onClick={() => handleSetLimit(userId)}
                disabled={savingUser === userId}
                className="rounded-md bg-app-primary/10 px-1.5 py-1 text-[10px] font-medium text-app-primary hover:bg-app-primary/20 disabled:opacity-50 transition-colors"
              >
                {savingUser === userId ? <Loader2 className="h-3 w-3 animate-spin" /> : "설정"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

  const GUEST_COMMANDS = [
  { cmd: "@TeleMonBot 번역 [텍스트]", desc: "영어↔한국어 번역" },
  { cmd: "@TeleMonBot 요약 [텍스트]", desc: "긴 글 요약" },
  { cmd: "@TeleMonBot 날씨 [도시]", desc: "날씨 정보" },
  { cmd: "@TeleMonBot 뉴스 [주제]", desc: "최신 뉴스 요약" },
  { cmd: "@TeleMonBot 도움말", desc: "명령어 도움말 표시" },
];

export function GuestBotTab() {
  const [stats, setStats] = useState<guestApi.GuestStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dailyLimit, setDailyLimit] = useState(20);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await guestApi.fetchGuestStats();
      setStats(data);
      setDailyLimit(data.daily_limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : "통계를 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  async function handleSaveLimit() {
    setSaving(true);
    try {
      const result = await guestApi.setGuestDailyLimit(dailyLimit);
      toast("success", `일일 한도가 ${result.daily_limit}회로 설정되었습니다.`);
    } catch {
      toast("error", "한도 설정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRefreshWebhook() {
    setRefreshing(true);
    try {
      await guestApi.refreshGuestWebhook();
      toast("success", "Webhook이 갱신되었습니다. guest_message 업데이트가 활성화되었습니다.");
    } catch {
      toast("error", "Webhook 갱신에 실패했습니다. BotFather에서 Guest Mode를 활성화했는지 확인하세요.");
    } finally {
      setRefreshing(false);
    }
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-app-primary" />
          <p className="text-sm text-app-text-muted">Guest Mode 통계 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-8 w-8 text-app-danger" />
        <p className="text-sm text-app-text-muted">{error}</p>
        <button
          onClick={loadStats}
          className="inline-flex items-center gap-1.5 rounded-lg bg-app-primary px-4 py-2 text-xs font-medium text-white hover:opacity-90"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 shadow-sm">
          <Bot className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-app-text">TeleMon Bot 설정</h2>
          <p className="text-xs text-app-text-muted truncate">
            @TeleMonBot Guest Mode + Ephemeral Messages 관리
          </p>
        </div>
        <button
          onClick={loadStats}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-card-hover hover:text-app-text"
          title="새로고침"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* 사용 통계 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={UserPlus}
          label="오늘 신규 사용자"
          value={stats?.unique_users_today ?? 0}
          color="indigo"
        />
        <StatCard
          icon={MessageCircle}
          label="오늘 총 요청"
          value={stats?.total_requests_today ?? 0}
          color="emerald"
        />
        <StatCard
          icon={BarChart3}
          label="일일 한도"
          value={`${stats?.daily_limit ?? 20}회`}
          color="amber"
        />
        <StatCard
          icon={TrendingUp}
          label="가동 상태"
          value={stats?.enabled ? "✅ 활성" : "❌ 비활성"}
          color="rose"
        />
      </div>

      {/* 설정 섹션 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 일일 한도 설정 */}
        <div className="rounded-xl border border-app-border bg-app-card p-4">
          <h3 className="text-sm font-semibold text-app-text flex items-center gap-2 mb-3">
            <Settings className="h-4 w-4 text-app-primary" />
            일일 사용 한도
          </h3>
          <p className="text-xs text-app-text-muted mb-3">
            사용자별 @멘션 가능한 최대 무료 요청 수
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(Math.max(1, Math.min(1000, Number(e.target.value))))}
              className="w-24 rounded-lg border border-app-border bg-app-bg px-3 py-2 text-sm text-center outline-none focus:border-app-primary transition-colors"
              min={1}
              max={1000}
            />
            <span className="text-xs text-app-text-muted">회/사용자/일</span>
            <button
              onClick={handleSaveLimit}
              disabled={saving || dailyLimit === stats?.daily_limit}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-app-primary px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              저장
            </button>
          </div>
        </div>

        {/* Webhook 설정 */}
        <div className="rounded-xl border border-app-border bg-app-card p-4">
          <h3 className="text-sm font-semibold text-app-text flex items-center gap-2 mb-3">
            <Globe className="h-4 w-4 text-app-primary" />
            Webhook 설정
          </h3>
          <p className="text-xs text-app-text-muted mb-3">
            Guest Mode(@멘션) 업데이트를 받으려면 Webhook 갱신이 필요합니다.<br />
            <strong>선행 조건:</strong> @BotFather에서 Guest Mode 활성화
          </p>
          <button
            onClick={handleRefreshWebhook}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-app-border bg-app-bg px-3 py-2 text-xs font-medium text-app-text hover:bg-app-card-hover disabled:opacity-50 transition-colors"
          >
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Webhook 갱신
          </button>
        </div>
      </div>

      {/* 사용자별 사용량 */}
      <UsageTable
        dailyUsage={stats?.daily_usage ?? {}}
        globalLimit={stats?.daily_limit ?? 20}
      />

      {/* 지원 명령어 */}
      <div className="rounded-xl border border-app-border bg-app-card p-4">
        <h3 className="text-sm font-semibold text-app-text flex items-center gap-2 mb-3">
          <MessageCircle className="h-4 w-4 text-app-primary" />
          지원 명령어
        </h3>
        <div className="space-y-1.5">
          {GUEST_COMMANDS.map((item) => (
            <div
              key={item.cmd}
              className="flex items-center justify-between rounded-lg bg-app-bg px-3 py-2.5 hover:bg-app-card-hover transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-app-primary/60" />
                <code className="text-xs font-mono text-app-primary truncate">{item.cmd}</code>
              </div>
              <span className="text-xs text-app-text-muted shrink-0 ml-2">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ephemeral Messages 설명 */}
      <div className="rounded-xl border border-dashed border-app-border bg-app-card/50 p-4">
        <h3 className="text-sm font-semibold text-app-text flex items-center gap-2 mb-2">
          <Bot className="h-4 w-4 text-app-primary/60" />
          Ephemeral Messages (임시 메시지)
        </h3>
        <p className="text-xs text-app-text-muted">
          Bot API 10.2+ (2026년 7월) 기능. 그룹 내 특정 사용자에게만 보이는 개인화 메시지입니다.
          Guest Mode 응답 후 환영 메시지나 전환 유도 메시지를 전송하는 데 사용됩니다.
        </p>
        <ul className="mt-2 space-y-1">
          {[
            "신규 가입자에게만 보이는 환영 메시지 자동 전송",
            "5회 이상 사용한 사용자에게 프리미엄 전환 유도",
            "그룹 스팸 없이 개인화된 커뮤니케이션",
          ].map((item, i) => (
            <li key={`guest-item-${i}`} className="flex items-center gap-2 text-xs text-app-text-muted">
              <span className="h-1 w-1 rounded-full bg-app-primary/40 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-3 text-xs text-app-text-muted italic">
          ⏳ @BotFather에서 Ephemeral Messages 활성화 후 사용 가능
        </div>
      </div>
    </div>
  );
}

// ── StatCard Component ─────────────────────────────────────────────

const CARD_COLORS: Record<string, { bg: string; icon: string; text: string }> = {
  indigo: { bg: "bg-indigo-500/10", icon: "text-indigo-500", text: "text-indigo-600 dark:text-indigo-400" },
  emerald: { bg: "bg-emerald-500/10", icon: "text-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  amber: { bg: "bg-amber-500/10", icon: "text-amber-500", text: "text-amber-600 dark:text-amber-400" },
  rose: { bg: "bg-rose-500/10", icon: "text-rose-500", text: "text-rose-600 dark:text-rose-400" },
};

function StatCard({
  icon: Icon,
  label,
  value,
  color = "indigo",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color?: string;
}) {
  const colors = CARD_COLORS[color] ?? CARD_COLORS.indigo;
  return (
    <div className="rounded-xl border border-app-border bg-app-card p-3 transition-all hover:shadow-sm">
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`flex h-6 w-6 items-center justify-center rounded-md ${colors.bg}`}>
          <Icon className={`h-3.5 w-3.5 ${colors.icon}`} />
        </div>
        <span className="text-[10px] text-app-text-muted font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className={`text-lg sm:text-xl font-bold ${colors.text}`}>{value}</p>
    </div>
  );
}
