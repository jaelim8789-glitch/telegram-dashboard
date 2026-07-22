"use client";

import { memo, useEffect, useMemo, useState, useRef } from "react";
import {
  Activity, AlertCircle, AlertTriangle, BarChart3, CheckCircle2, Clock, Download, Link, MessageSquare,
  RefreshCw, Send, SendHorizonal, Users, XCircle,
  ArrowRight, Ban, Plus, UserPlus, ShieldAlert, ShieldOff, PauseCircle,
  Bug, Settings, Eye, EyeOff, HeartPulse, TrendingUp, TrendingDown,
  Gauge, Layers, Zap, Timer, Sparkles,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { cn } from "@/lib/cn";
import { PixelOfficeWidget } from "@/components/ai/PixelOfficeWidget";
import { useDashboardStore } from "@/store/useDashboardStore";
import * as api from "@/lib/api";
import type { AccountHealthItem, Broadcast, BroadcastStatus, DeliveryOverview, TabId, DeliverySummary, TeleMonMemorySnapshot } from "@/types";
import { isRecurringActive, getRecurringState } from "@/types";
import { useCountdown, intervalLabel } from "@/lib/useRecurringCountdown";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { DailyDigest } from "@/components/workspace/tabs/dashboard/DailyDigest";
import { UsageChartWidget } from "@/components/workspace/tabs/dashboard/UsageChartWidget";
import { UsageProgressWidget } from "@/components/workspace/tabs/dashboard/UsageProgressWidget";
import { DashboardSkeleton } from "@/components/workspace/tabs/dashboard/DashboardSkeleton";
import { exportCSV, exportJSON } from "@/lib/exportUtils";

const STATUS_TONE: Record<BroadcastStatus, { tone: "neutral" | "success" | "warning" | "danger" | "info"; label: string }> = {
  pending: { tone: "neutral", label: "대기 중" },
  sending: { tone: "info", label: "발송 중" },
  sent: { tone: "success", label: "완료" },
  failed: { tone: "danger", label: "실패" },
  cancelled: { tone: "warning", label: "취소됨" },
};

import { formatRelativeTime, formatCompact } from "@/lib/formatTime";
import { computeHealthScore, computeOverallScore, healthScoreColor, healthScoreBg } from "@/lib/healthScore";
import { predictBanRisk, banRiskColor, banRiskBg, banRiskLabel, type BanPrediction } from "@/lib/banPredictor";

function failureInfoSummary(info: Broadcast["failureInfo"] | null | undefined): { summary: string; action: string | null; retryable: string | null } {
  if (!info || !info.category) return { summary: "", action: null, retryable: null };
  const summary = String(info.summary ?? info.category ?? "");
  const recovery = String(info.recovery_action ?? "");
  let action: string | null = null;
  if (recovery === "reauthenticate_account" || recovery === "account_is_banned" || recovery === "check_configuration") action = "register";
  if (recovery === "wait_and_retry" || recovery === "check_recipient" || recovery === "check_media" || recovery === "retry_broadcast" || recovery === "contact_support") action = "log";
  return { summary, action, retryable: info.retryable ?? null };
}

function RecurringCard({ b, accounts }: { b: Broadcast; accounts: { id: string; name: string | null; phone: string }[] }) {
  const countdown = useCountdown(b.nextScheduledAt);
  const account = accounts.find((a) => a.id === b.accountId);
  const accLabel = account
    ? account.name?.trim() || account.phone
    : b.accountId.slice(0, 8);
  const state = getRecurringState(b);
  return (
    <div className={cn(
      "flex items-center justify-between rounded-xl border px-3 py-2.5 transition-all hover:shadow-sm",
      state === "error" ? "border-app-danger/20 bg-app-danger-muted/10" :
      state === "paused" ? "border-app-warning/20 bg-app-warning-muted/10" :
      "border-app-border bg-gradient-to-r from-app-bg to-app-card hover:border-app-border-strong",
    )}>
      <div className="min-w-0 flex-1 pr-2">
        <p className="truncate text-xs font-medium text-app-text">{b.message}</p>
        <p className="mt-0.5 flex flex-wrap gap-x-1.5 text-[11px] text-app-text-subtle">
          <span className="inline-flex items-center gap-1">
            <RefreshCw className="h-3 w-3 text-app-info" />
            {intervalLabel(b.recurringIntervalMinutes)}
          </span>
          <span>·</span>
          <span>{accLabel}</span>
          <span>·</span>
          <span>{b.recipients.length}명</span>
          {countdown && (
            <span className="font-mono text-app-info flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {countdown}
            </span>
          )}
        </p>
      </div>
      <Badge tone={state === "error" ? "danger" : state === "paused" ? "warning" : state === "cancelled" ? "neutral" : "info"} className="shrink-0">
        {state === "active" ? "반복 중" : state === "paused" ? "일시 정지" : state === "cancelled" ? "취소됨" : "오류"}
      </Badge>
    </div>
  );
}

function AttentionItem({
  icon, label, detail, actionLabel, action, tone,
}: {
  icon: React.ReactNode; label: string; detail: string; actionLabel: string; action: () => void; tone: "danger" | "warning" | "muted";
}) {
  return (
    <div className={cn(
      "flex items-start justify-between gap-2 px-4 py-2.5",
      tone === "danger" ? "bg-app-danger-muted/5" : tone === "warning" ? "bg-app-warning-muted/5" : "",
    )}>
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        <div className={cn(
          "flex h-7 w-7 shrink-0 mt-0.5 items-center justify-center rounded-lg",
          tone === "danger" ? "bg-app-danger-muted" : tone === "warning" ? "bg-app-warning-muted" : "bg-app-card-hover",
        )}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn(
            "text-xs font-medium truncate",
            tone === "danger" ? "text-app-danger" : tone === "warning" ? "text-app-warning" : "text-app-text",
          )}>{label}</p>
          <p className="text-[11px] text-app-text-muted truncate">{detail}</p>
        </div>
      </div>
      <button onClick={action}
        className={cn(
          "shrink-0 flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors",
          tone === "danger" ? "text-app-danger hover:bg-app-danger-muted/30" :
          tone === "warning" ? "text-app-warning hover:bg-app-warning-muted/30" :
          "text-app-text-muted hover:bg-app-card-hover",
        )}>
        {actionLabel} <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────

export function DashboardTab() {
  const accounts = useDashboardStore((s) => s.accounts);
  const accountsLoading = useDashboardStore((s) => s.accountsLoading);
  const accountsError = useDashboardStore((s) => s.accountsError);
  const fetchAccounts = useDashboardStore((s) => s.fetchAccounts);

  const [logs, setLogs] = useState<Broadcast[]>([]);
  const [upcoming, setUpcoming] = useState<Broadcast[]>([]);
  const [recurring, setRecurring] = useState<Broadcast[]>([]);
  const recurringPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [overview, setOverview] = useState<DeliveryOverview | null>(null);
  const [telemonMemory, setTelemonMemory] = useState<TeleMonMemorySnapshot | null>(null);
  const plan = useDashboardStore((s) => s.plan);
  const [healthItems, setHealthItems] = useState<AccountHealthItem[]>([]);

  // Unified loading: true while the initial batch is in flight
  const [dataLoading, setDataLoading] = useState(true);
  // Per-dataset error flags, cleared on each successful reload
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const markError = (key: string, failed: boolean) => {
    if (failed) setErrors((prev) => ({ ...prev, [key]: true }));
    else setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  };

  const [refreshing, setRefreshing] = useState(false);

  const [priorityVisible, setPriorityVisible] = useState<Record<string, boolean>>({});

  // Priority rendering: show critical data immediately, delay lower-priority widgets
  useEffect(() => {
    const t1 = setTimeout(() => setPriorityVisible(p => ({ ...p, header: true })), 0);
    const t2 = setTimeout(() => setPriorityVisible(p => ({ ...p, metrics: true })), 50);
    const t3 = setTimeout(() => setPriorityVisible(p => ({ ...p, attention: true, progress: true })), 200);
    const t4 = setTimeout(() => setPriorityVisible(p => ({ ...p, chart: true, activity: true })), 400);
    const t5 = setTimeout(() => setPriorityVisible(p => ({ ...p, remainder: true })), 600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, []);

  const WIDGET_DEFAULTS: Record<string, boolean> = {
    dailyDigest: true, realtimeMetrics: true, attention: true, recentFailures: true,
    middlePanels: true, recentActivity: true, accountOverview: true, failureIntelligence: true,
    healthTrend: true, usageChart: true, usageProgress: true, healthScore: true,
    banPredictor: true,
  };

  const WIDGET_LABELS: Record<string, string> = {
    dailyDigest: "오늘의 활동", realtimeMetrics: "실시간 메트릭", usageChart: "사용량 차트",
    usageProgress: "사용량 한도", attention: "운영 주의 사항", recentFailures: "최근 발송 실패",
    middlePanels: "예약/반복/건강 패널", recentActivity: "최근 활동", accountOverview: "계정 현황",
    failureIntelligence: "실패 분석", healthTrend: "계정 건강 트렌드", healthScore: "계정 건강 점수",
    banPredictor: "계정 차단 예측",
  };

  // ── Widget visibility ──
  const [widgetVisibility, setWidgetVisibility] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("telemon-dashboard-widgets");
      return saved ? JSON.parse(saved) : { ...WIDGET_DEFAULTS };
    } catch { return { ...WIDGET_DEFAULTS }; }
  });
  const [showWidgetSettings, setShowWidgetSettings] = useState(false);

  // ── Mobile widget simplification ──
  function useWidgetSimplification() {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
      const check = () => setIsMobile(window.innerWidth < 768);
      check();
      window.addEventListener("resize", check);
      return () => window.removeEventListener("resize", check);
    }, []);
    return isMobile;
  }
  const isMobileWidget = useWidgetSimplification();
  const CORE_WIDGETS = new Set(["dailyDigest", "realtimeMetrics", "healthScore", "usageChart", "usageProgress"]);
  const [mobileCollapsedWidgets, setMobileCollapsedWidgets] = useState<Set<string>>(new Set());

  // ── Dashboard profiles ──
  interface DashboardProfile {
    name: string;
    widgetVisibility: Record<string, boolean>;
    widgetOrder: string[];
  }

  const PROFILES_STORAGE_KEY = "telemon-dashboard-profiles";
  const DEFAULT_PROFILE_NAME = "기본";

  const [profiles, setProfiles] = useState<DashboardProfile[]>(() => {
    try {
      const saved = localStorage.getItem(PROFILES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [{ name: DEFAULT_PROFILE_NAME, widgetVisibility: { ...WIDGET_DEFAULTS }, widgetOrder: Object.keys(WIDGET_DEFAULTS) }];
    } catch { return [{ name: DEFAULT_PROFILE_NAME, widgetVisibility: { ...WIDGET_DEFAULTS }, widgetOrder: Object.keys(WIDGET_DEFAULTS) }]; }
  });

  const [currentProfile, setCurrentProfile] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("telemon-dashboard-current-profile");
      if (saved) return saved;
    } catch {}
    return DEFAULT_PROFILE_NAME;
  });

  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const profilePanelRef = useRef<HTMLDivElement>(null);

  const persistProfiles = (next: DashboardProfile[]) => {
    try { localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(next)); } catch {}
    setProfiles(next);
  };

  const saveCurrentProfile = (name: string) => {
    const entry: DashboardProfile = { name, widgetVisibility: { ...widgetVisibility }, widgetOrder: [...widgetOrder] };
    const next = [...profiles.filter((p) => p.name !== name), entry];
    persistProfiles(next);
    setCurrentProfile(name);
    try { localStorage.setItem("telemon-dashboard-current-profile", name); } catch {}
  };

  const switchProfile = (name: string) => {
    const profile = profiles.find((p) => p.name === name);
    if (!profile) return;
    setWidgetVisibility(profile.widgetVisibility);
    try { localStorage.setItem("telemon-dashboard-widgets", JSON.stringify(profile.widgetVisibility)); } catch {}
    setWidgetOrder(profile.widgetOrder);
    try { localStorage.setItem("telemon-dashboard-widget-order", JSON.stringify(profile.widgetOrder)); } catch {}
    setCurrentProfile(name);
    try { localStorage.setItem("telemon-dashboard-current-profile", name); } catch {}
  };

  const deleteProfile = (name: string) => {
    if (name === DEFAULT_PROFILE_NAME) return;
    const next = profiles.filter((p) => p.name !== name);
    persistProfiles(next);
    if (currentProfile === name) {
      switchProfile(DEFAULT_PROFILE_NAME);
    }
  };

  const [profilePrompt, setProfilePrompt] = useState<string | null>(null);

  const toggleWidget = (key: string) => {
    setWidgetVisibility((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem("telemon-dashboard-widgets", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // ── Export handlers ──
  const handleExportCSV = () => {
    const headers = ["message", "status", "account", "recipients", "error", "created_at"];
    const rows = logs.map((b) => {
      const acct = accounts.find((a) => a.id === b.accountId);
      return [
        b.message,
        STATUS_TONE[b.status]?.label ?? b.status,
        acct?.name?.trim() || acct?.phone || b.accountId,
        String(b.recipients?.length ?? 0),
        b.errorMessage ?? "",
        b.createdAt,
      ];
    });
    exportCSV(headers, rows, `telemon-logs-${new Date().toISOString().slice(0, 10)}`);
    setShowExportDropdown(false);
  };

  const handleExportJSON = () => {
    exportJSON({ logs, overview, recurring, health: healthItems }, `telemon-dashboard-${new Date().toISOString().slice(0, 10)}`);
    setShowExportDropdown(false);
  };

  // ── Click-outside ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setShowExportDropdown(false);
      }
      if (profilePanelRef.current && !profilePanelRef.current.contains(e.target as Node)) {
        setShowProfilePanel(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Widget order (drag-reorderable) ──
  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("telemon-dashboard-widget-order");
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* noop */ }
    return Object.keys(WIDGET_DEFAULTS);
  });

  const persistOrder = (order: string[]) => {
    try { localStorage.setItem("telemon-dashboard-widget-order", JSON.stringify(order)); } catch {}
    setWidgetOrder(order);
  };

  const moveWidget = (key: string, direction: -1 | 1) => {
    const idx = widgetOrder.indexOf(key);
    if (idx < 0) return;
    const target = idx + direction;
    if (target < 0 || target >= widgetOrder.length) return;
    const next = [...widgetOrder];
    [next[idx], next[target]] = [next[target], next[idx]];
    persistOrder(next);
  };

  const dragWidgetRef = useRef<{ key: string; from: number } | null>(null);

  // Widget keys in stored order
  const widgetKeys = widgetOrder.filter((k) => k in WIDGET_LABELS).map((key) => ({ key, label: WIDGET_LABELS[key] }));

  const loadLogs = async () => {
    try { setLogs(await api.fetchLogs()); markError("logs", false); }
    catch { setLogs([]); markError("logs", true); }
  };

  const loadUpcoming = async () => {
    try { setUpcoming(await api.fetchUpcomingBroadcasts()); markError("upcoming", false); }
    catch { setUpcoming([]); markError("upcoming", true); }
  };

  const loadRecurring = async () => {
    try { setRecurring(await api.fetchRecurringBroadcasts()); markError("recurring", false); }
    catch { setRecurring([]); markError("recurring", true); }
  };

  const loadOverview = async () => {
    try { setOverview(await api.fetchDeliveryOverview(undefined, 30)); markError("overview", false); }
    catch { setOverview(null); markError("overview", true); }
  };

  const loadHealth = async () => {
    try { setHealthItems(await api.fetchAccountHealth()); markError("health", false); }
    catch { setHealthItems([]); markError("health", true); }
  };

  const loadTeleMonMemory = async () => {
    try { setTelemonMemory(await api.fetchTeleMonMemorySnapshot()); markError("telemonMemory", false); }
    catch { setTelemonMemory(null); markError("telemonMemory", true); }
  };

  const loadAll = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchAccounts(), loadLogs(), loadUpcoming(), loadRecurring(), loadOverview(), loadHealth(), loadTeleMonMemory()]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setDataLoading(true);
    Promise.all([fetchAccounts(), loadLogs(), loadUpcoming(), loadRecurring(), loadOverview(), loadHealth(), loadTeleMonMemory()])
      .finally(() => setDataLoading(false));
  }, [fetchAccounts]);

  useEffect(() => {
    if (recurringPollRef.current) clearTimeout(recurringPollRef.current);
    if (recurring.length === 0) return;
    recurringPollRef.current = setTimeout(loadRecurring, 30000);
    return () => { if (recurringPollRef.current) clearTimeout(recurringPollRef.current); };
  }, [recurring]);

  const activeAccounts = useMemo(() => accounts.filter((a) => a.status === "active"), [accounts]);
  const inactiveAccounts = useMemo(() => accounts.filter((a) => a.status === "inactive"), [accounts]);
  const bannedAccounts = useMemo(() => accounts.filter((a) => a.status === "banned"), [accounts]);
  const sentCount = useMemo(() => logs.filter((l) => l.status === "sent").length, [logs]);
  const failedCount = useMemo(() => logs.filter((l) => l.status === "failed").length, [logs]);

  const recentLogs = useMemo(
    () => [...logs].sort((a, b) => new Date(`${b.createdAt}Z`).getTime() - new Date(`${a.createdAt}Z`).getTime()).slice(0, 8),
    [logs]
  );

  const failureTypes = useMemo(() => {
    return (overview?.failure_breakdown ?? []).slice(0, 5);
  }, [overview]);

  const erroredRecurring = useMemo(() => {
    return recurring.filter(b => getRecurringState(b) === "error");
  }, [recurring]);

  const pausedRecurring = useMemo(() => {
    return recurring.filter(b => getRecurringState(b) === "paused");
  }, [recurring]);

  const healthCritical = useMemo(() => {
    return healthItems.filter(h => h.status === "unauthorized" || h.status === "banned" || h.status === "not_configured");
  }, [healthItems]);

  const healthWarning = useMemo(() => {
    return healthItems.filter(h => h.status === "rate_limited" || h.status === "error");
  }, [healthItems]);

  const healthyCount = useMemo(() => {
    return healthItems.filter(h => h.status === "healthy").length;
  }, [healthItems]);

  const healthScores = useMemo(() => {
    return accounts.map((a) => computeHealthScore(a, overview, logs));
  }, [accounts, overview, logs]);

  const overallHealthScore = useMemo(() => computeOverallScore(healthScores), [healthScores]);

  const recentFailures = useMemo(() => {
    return [...logs].filter(l => l.status === "failed").sort((a, b) => new Date(`${b.createdAt}Z`).getTime() - new Date(`${a.createdAt}Z`).getTime()).slice(0, 4);
  }, [logs]);

  const nonRetryableFailures = useMemo(() => {
    return recentFailures.filter(f => f.failureInfo?.retryable === "not_retryable");
  }, [recentFailures]);

  const banPredictions = useMemo(() =>
    accounts.map((a) => {
      const hi = healthItems.find((h) => h.accountId === a.id) ?? null;
      return predictBanRisk(a, logs, hi);
    }).sort((a, b) => b.riskScore - a.riskScore),
  [accounts, logs, healthItems]);

  const summary = overview?.summary;
  const memoryPeriods = telemonMemory?.periods;
  const memoryTopPosts = telemonMemory?.top_posts ?? [];

  const totalAttention = healthCritical.length + healthWarning.length + erroredRecurring.length + pausedRecurring.length + nonRetryableFailures.length;

  const hasAnyAttention = totalAttention > 0 || failedCount > 0 || bannedAccounts.length > 0;

  const setTab = useDashboardStore.getState().setActiveTab;

  const priorityQueue = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      detail: string;
      cta: string;
      tone: "danger" | "warning" | "info" | "success";
      action: () => void;
    }> = [];

    if (healthCritical.length > 0) {
      items.push({
        id: "auth",
        title: `인증/차단 계정 ${healthCritical.length}개`,
        detail: "발송 중단 전에 재인증 또는 상태 점검이 필요합니다.",
        cta: "계정 확인",
        tone: "danger",
        action: () => setTab("register"),
      });
    }

    if (recentFailures.length > 0) {
      items.push({
        id: "failures",
        title: `최근 실패 발송 ${recentFailures.length}건`,
        detail: recentFailures[0]?.message || "실패 원인을 확인하고 재시도하세요.",
        cta: "로그 열기",
        tone: "warning",
        action: () => setTab("log"),
      });
    }

    if ((summary?.success_rate ?? 100) < 85) {
      items.push({
        id: "performance",
        title: `성공률 ${summary?.success_rate?.toFixed(1) ?? "0.0"}%`,
        detail: "최근 성과가 낮습니다. 시간대와 계정별 실패 원인을 바로 확인하세요.",
        cta: "분석 보기",
        tone: "warning",
        action: () => setTab("deliveryanalytics"),
      });
    }

    if (memoryTopPosts.length > 0) {
      items.push({
        id: "reuse",
        title: "고성과 문구 재활용 가능",
        detail: `Top 글 ${memoryTopPosts[0].success_rate}% 성과를 참고해 재작성할 수 있습니다.`,
        cta: "AI로 재작성",
        tone: "success",
        action: () => setTab("aibroadcast"),
      });
    }

    if (upcoming.length === 0 && activeAccounts.length > 0) {
      items.push({
        id: "schedule",
        title: "다음 발송 예약 없음",
        detail: "모바일에서는 미리 1건 예약해두면 운영 누락을 줄일 수 있습니다.",
        cta: "발송 준비",
        tone: "info",
        action: () => setTab("send"),
      });
    }

    return items.slice(0, 4);
  }, [healthCritical.length, recentFailures, summary?.success_rate, memoryTopPosts, upcoming.length, activeAccounts.length, setTab]);

  // Skeleton loading state
  if (accountsLoading && accounts.length === 0) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="대시보드 로딩 중">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  // Error state only when accounts API fails with no cached data
  if (accountsError && accounts.length === 0) {
    return (
      <Panel title="시스템 상태">
        <div className="flex flex-col items-center justify-center py-12 text-center" role="alert">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-app-danger-muted">
            <XCircle className="h-8 w-8 text-app-danger" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-app-danger">서버에 연결할 수 없습니다</p>
          <p className="mt-1 text-xs text-app-text-muted max-w-xs">{accountsError}</p>
          <button onClick={loadAll}
            className="mt-4 flex items-center gap-1.5 rounded-xl bg-app-primary px-4 py-2 text-xs font-medium text-white hover:bg-app-primary-hover transition-colors focus-ring">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> 다시 시도
          </button>
        </div>
      </Panel>
    );
  }

  const widgetIdx = (key: string): number => {
    const idx = widgetOrder.indexOf(key);
    return idx >= 0 ? idx * 10 + 10 : 999;
  };

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* ── Header Section ───────────────────────────────────── */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-app-text">운영 대시보드</h1>
            {hasAnyAttention && (
              <span className="inline-flex items-center justify-center rounded-full bg-app-danger-muted px-2 py-0.5 text-[10px] font-bold text-app-danger tabular-nums">
                {totalAttention}
              </span>
            )}
          </div>
          <p className="text-xs text-app-text-muted">실시간 운영 현황</p>
        </div>
        <div className="flex items-center gap-2">
          {accounts.length === 0 && (
            <button onClick={() => setTab("register")}
              className="flex items-center gap-1.5 rounded-xl bg-app-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-app-primary-hover transition-colors focus-ring">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" /> 계정 추가
            </button>
          )}
          <div className="relative" ref={exportDropdownRef}>
            <button onClick={() => setShowExportDropdown(!showExportDropdown)} aria-label="내보내기"
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors focus-ring">
              <Download className="h-3.5 w-3.5" aria-hidden="true" /> 내보내기
            </button>
            {showExportDropdown && (
              <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-app-border bg-app-surface p-1 shadow-xl">
                <button onClick={handleExportCSV}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-app-text hover:bg-app-card-hover transition-colors">
                  CSV 내보내기 (로그)
                </button>
                <button onClick={handleExportJSON}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-app-text hover:bg-app-card-hover transition-colors">
                  JSON 내보내기 (전체)
                </button>
              </div>
            )}
          </div>
          <button onClick={loadAll} aria-label="새로고침"
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors focus-ring">
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* ── Daily Digest ──────────────────────────── */}
      <div key="dailyDigest" style={{ order: widgetIdx("dailyDigest") }}>
        {widgetVisibility.dailyDigest && (
          <DailyDigest accounts={accounts} logs={logs} />
        )}
      </div>

      {/* ── Onboarding Wizard (0 accounts) ──────────── */}
      {accounts.length > 0 && (
        <div className="order-1 sm:order-none">
          <Panel title="🏢 AI 사무실">
            <PixelOfficeWidget onExpand={() => useDashboardStore.getState().setActiveTab("pixeloffice")} />
          </Panel>
        </div>
      )}

      {/* ── Onboarding Wizard (0 accounts) ──────────── */}
      {accounts.length === 0 && !accountsLoading && (
        <Panel title="🚀 TeleMon 시작하기" className="border-app-primary/20 bg-app-primary-muted/5">
          <div className="space-y-4 py-4">
            <p className="text-sm text-app-text-secondary">
              TeleMon에 오신 것을 환영합니다! 시작하려면 Telegram 계정을 연결하세요.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { step: 1, title: "계정 연결", desc: "Telegram 계정을 TeleMon에 연결하세요", icon: Link, action: "계정 등록하기", tab: "register" as const },
                { step: 2, title: "그룹 선택", desc: "관리할 그룹과 채널을 선택하세요", icon: Users, action: "그룹 관리", tab: "group" as const },
                { step: 3, title: "첫 메시지 발송", desc: "AI의 도움을 받아 첫 발송을 시작하세요", icon: Send, action: "발송하기", tab: "send" as const },
              ].map((item) => (
                <div key={item.step} className="flex flex-col items-center text-center rounded-xl border border-app-border bg-app-card p-4 hover:border-app-primary/30 transition-colors cursor-pointer"
                  onClick={() => setTab(item.tab)}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-app-primary/10 mb-3">
                    <item.icon className="h-5 w-5 text-app-primary" />
                  </div>
                  <span className="text-[10px] font-bold text-app-primary mb-1">STEP {item.step}</span>
                  <h4 className="text-sm font-semibold text-app-text">{item.title}</h4>
                  <p className="text-xs text-app-text-muted mt-1 mb-3">{item.desc}</p>
                  <span className="text-xs font-medium text-app-primary">{item.action} →</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs text-app-text-muted border-t border-app-border pt-3">
              <AlertCircle className="h-3.5 w-3.5" />
              도움이 필요하시면 {process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@telemon.io"} 으로 문의하세요
            </div>
          </div>
        </Panel>
      )}

      <section className="rounded-2xl border border-app-border bg-app-card p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-app-text">
              <Zap className="h-4 w-4 text-app-primary" aria-hidden="true" />
              모바일 운영 우선순위
            </div>
            <p className="mt-1 text-[11px] text-app-text-muted">지금 바로 처리해야 할 작업만 추려서 보여줍니다.</p>
          </div>
          <button
            type="button"
            onClick={() => setTab(priorityQueue[0]?.id === "auth" ? "register" : "log")}
            className="rounded-xl border border-app-border px-2.5 py-1.5 text-[10px] text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors"
          >
            빠른 이동
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {priorityQueue.length === 0 ? (
            <div className="rounded-xl border border-app-border bg-app-bg px-3 py-3 text-xs text-app-text-muted">
              처리 우선순위가 높은 이슈가 없습니다. 지금은 발송 예약이나 AI 문구 개선을 진행하기 좋은 상태입니다.
            </div>
          ) : (
            priorityQueue.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={item.action}
                className={cn(
                  "w-full rounded-xl border px-3 py-3 text-left transition-all",
                  item.tone === "danger" && "border-app-danger/25 bg-app-danger-muted/10",
                  item.tone === "warning" && "border-app-warning/25 bg-app-warning-muted/10",
                  item.tone === "info" && "border-app-info/25 bg-app-info-muted/10",
                  item.tone === "success" && "border-app-success/25 bg-app-success-muted/10",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-app-text">{item.title}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-app-text-muted">{item.detail}</p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-app-card px-2 py-1 text-[10px] font-medium text-app-text">{item.cta}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-app-border bg-app-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-app-text">
              <Sparkles className="h-4 w-4 text-app-primary" aria-hidden="true" />
              TeleMon AI Memory
            </div>
            <p className="mt-1 text-[11px] text-app-text-muted">
              AI가 참고하는 이번달, 지난주, 작년 성과와 반응 좋은 글입니다.
            </p>
          </div>
          <div className="text-[11px] text-app-text-subtle">
            {telemonMemory?.generated_at ? `${formatRelativeTime(telemonMemory.generated_at)} 업데이트` : "데이터 준비 중"}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            { label: "이번달", value: memoryPeriods?.this_month },
            { label: "지난주", value: memoryPeriods?.last_week },
            { label: "작년", value: memoryPeriods?.last_year },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-app-border bg-app-bg p-3">
              <div className="text-[11px] font-medium text-app-text-muted">{item.label}</div>
              <div className="mt-2 text-lg font-bold tabular-nums text-app-text">{item.value?.attempted ?? 0}</div>
              <div className="text-[11px] text-app-text-subtle">발송 시도</div>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-app-text-muted">성공</span>
                <span className="font-medium text-app-text">{item.value?.successful ?? 0}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className="text-app-text-muted">성공률</span>
                <span className="font-medium text-app-primary">{item.value?.success_rate ?? 0}%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-app-border bg-app-bg p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-app-text">
            <TrendingUp className="h-4 w-4 text-app-success" aria-hidden="true" />
            반응 좋았던 글 TOP 3
          </div>
          {memoryTopPosts.length === 0 ? (
            <p className="mt-3 text-xs text-app-text-muted">아직 참고할 고성과 발송 데이터가 부족합니다. 최근 180일 내 시도 3건 이상인 브로드캐스트부터 메모리에 쌓입니다.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {memoryTopPosts.map((post, index) => (
                <div key={post.broadcast_id} className="rounded-lg border border-app-border/80 bg-app-card px-3 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[11px] text-app-text-muted">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-app-primary/10 font-semibold text-app-primary">{index + 1}</span>
                        <span>시도 {post.attempted}건</span>
                        <span>성공 {post.successful}건</span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-app-text">{post.message_preview}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-bold text-app-success">{post.success_rate}%</div>
                      <div className="text-[10px] text-app-text-subtle">성공률</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Real-time Metrics Row ──────────────── */}
      <div key="realtimeMetrics" style={{ order: widgetIdx("realtimeMetrics") }}>
      {widgetVisibility.realtimeMetrics && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
          <div className="rounded-xl border border-app-border bg-gradient-to-br from-app-card to-app-bg p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-text-muted">
              <Gauge className="h-3.5 w-3.5 text-app-info" aria-hidden="true" />
              발송 속도
            </div>
            <div className="mt-1 text-lg font-bold tabular-nums text-app-text">
              {formatCompact(sentCount)}
              <span className="text-xs font-normal text-app-text-muted">/30일</span>
            </div>
            <div className="text-[10px] text-app-text-subtle">
              {failedCount > 0
                ? <span className="text-app-danger">{((failedCount / Math.max(sentCount + failedCount, 1)) * 100).toFixed(1)}% 실패율</span>
                : "실패 없음"}
            </div>
          </div>
          <div className="rounded-xl border border-app-border bg-gradient-to-br from-app-card to-app-bg p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-text-muted">
              <Timer className="h-3.5 w-3.5 text-app-warning" aria-hidden="true" />
              대기열
            </div>
            <div className="mt-1 text-lg font-bold tabular-nums text-app-text">
              {logs.filter(l => l.status === "pending").length}
            </div>
            <div className="text-[10px] text-app-text-subtle">
              {upcoming.length > 0 ? `${upcoming.length}건 예약됨` : "대기 중 없음"}
            </div>
          </div>
          <div className="rounded-xl border border-app-border bg-gradient-to-br from-app-card to-app-bg p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-text-muted">
              <Zap className="h-3.5 w-3.5 text-app-primary" aria-hidden="true" />
              성공률
            </div>
            <div className={cn("mt-1 text-lg font-bold tabular-nums",
              (summary?.success_rate ?? 100) >= 90 ? "text-app-success" :
              (summary?.success_rate ?? 100) >= 70 ? "text-app-warning" : "text-app-danger"
            )}>
              {summary ? `${summary.success_rate.toFixed(1)}%` : "-"}
            </div>
            <div className="text-[10px] text-app-text-subtle">
              {summary ? `${summary.successful}/${summary.total_attempted}건` : "데이터 없음"}
            </div>
          </div>
          <div className="rounded-xl border border-app-border bg-gradient-to-br from-app-card to-app-bg p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-text-muted">
              <Activity className="h-3.5 w-3.5 text-app-success" aria-hidden="true" />
              계정 건강
            </div>
            <div className="mt-1 text-lg font-bold tabular-nums">
              <span className="text-app-success">{healthyCount}</span>
              <span className="text-xs font-normal text-app-text-muted">/{accounts.length}</span>
            </div>
            <div className="text-[10px] text-app-text-subtle">
              {healthCritical.length > 0 ? `${healthCritical.length}개 주의 필요` : "모든 계정 정상"}
            </div>
          </div>
          <div className="rounded-xl border border-app-border bg-gradient-to-br from-app-card to-app-bg p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-text-muted">
              <Layers className="h-3.5 w-3.5 text-app-text-muted" aria-hidden="true" />
              반복 스케줄
            </div>
            <div className="mt-1 text-lg font-bold tabular-nums text-app-text">{recurring.length}</div>
            <div className="text-[10px] text-app-text-subtle">
              {erroredRecurring.length > 0
                ? `${erroredRecurring.length}개 오류`
                : `${recurring.filter(r => getRecurringState(r) === "active").length}개 활성`}
            </div>
          </div>
        </div>
      )}
      </div>

      {/* ── Account Health Score ──────────────── */}
      <div key="healthScore" style={{ order: widgetIdx("healthScore") }}>
      {widgetVisibility.healthScore && (
        <div className="rounded-xl border border-app-border bg-app-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-app-text">
              <HeartPulse className="h-4 w-4 text-app-danger" aria-hidden="true" />
              계정 건강 점수
            </div>
            <div className="flex items-center gap-1.5 text-xs text-app-text-muted">
              <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
              종합 <span className={cn("font-bold tabular-nums", healthScoreColor(overallHealthScore.level))}>{overallHealthScore.score}</span>
              <span className="text-[10px]">/100</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {healthScores.map((hs) => (
              <div key={hs.accountId}
                className="rounded-lg border border-app-border bg-gradient-to-br from-app-card to-app-bg p-2.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-[11px] font-medium text-app-text">{hs.label}</span>
                  <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold", healthScoreBg(hs.level), healthScoreColor(hs.level))}>
                    {hs.level === "excellent" ? "우수" : hs.level === "healthy" ? "양호" : hs.level === "warning" ? "주의" : "위험"}
                  </span>
                </div>
                <div className={cn("mt-1 text-xl font-bold tabular-nums leading-none", healthScoreColor(hs.level))}>
                  {hs.score}
                  <span className="text-xs font-normal text-app-text-muted">/100</span>
                </div>
                <div className="mt-1.5 space-y-0.5">
                  {hs.factors.map((f) => (
                    <div key={f.label} className="flex items-center justify-between text-[10px]">
                      <span className="text-app-text-muted">{f.label}</span>
                      <span className="font-medium tabular-nums text-app-text">{f.value}/{f.max}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>

      {/* ── Operational Summary Hierarchy ───────── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-app-border bg-app-card p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-text-muted">
            <CheckCircle2 className="h-3.5 w-3.5 text-app-success" aria-hidden="true" />
            정상 계정
          </div>
          <div className="mt-1 text-lg font-bold tabular-nums text-app-success">
            {healthyCount}
            <span className="text-xs font-normal text-app-text-muted">/{accounts.length}</span>
          </div>
          {inactiveAccounts.length > 0 && (
            <div className="text-[10px] text-app-text-subtle">{inactiveAccounts.length}개 비활성</div>
          )}
        </div>
        <div className="rounded-xl border border-app-border bg-app-card p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-text-muted">
            <AlertTriangle className={cn("h-3.5 w-3.5", totalAttention > 0 ? "text-app-danger" : "text-app-text-subtle")} aria-hidden="true" />
            주의 필요
          </div>
          <div className={cn("mt-1 text-lg font-bold tabular-nums", totalAttention > 0 ? "text-app-danger" : "text-app-text")}>
            {totalAttention}
          </div>
          {healthCritical.length > 0 && <div className="text-[10px] text-app-danger">{healthCritical.length}개 인증/차단</div>}
        </div>
        <div className="rounded-xl border border-app-border bg-app-card p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-text-muted">
            <SendHorizonal className="h-3.5 w-3.5 text-app-text-muted" aria-hidden="true" />
            발송
          </div>
          <div className="mt-1 text-lg font-bold tabular-nums text-app-text">{formatCompact(sentCount)}</div>
          <div className="text-[10px] text-app-text-subtle">{failedCount > 0 ? `${formatCompact(failedCount)}건 실패` : "실패 없음"}</div>
        </div>
        <div className="rounded-xl border border-app-border bg-app-card p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-text-muted">
            <RefreshCw className="h-3.5 w-3.5 text-app-info" aria-hidden="true" />
            반복
          </div>
          <div className="mt-1 text-lg font-bold tabular-nums text-app-text">{recurring.length}</div>
          <div className="text-[10px] text-app-text-subtle">
            {erroredRecurring.length > 0 ? `${erroredRecurring.length}개 오류` :
             pausedRecurring.length > 0 ? `${pausedRecurring.length}개 일시 정지` :
             "정상"}
          </div>
        </div>
      </div>

      <div key="attention" style={{ order: widgetIdx("attention") }}>
      {/* ── Operational Attention Queue ─────────── */}
      {widgetVisibility.attention && hasAnyAttention && (
        <div className="rounded-2xl border border-app-border overflow-hidden">
          <div className="flex items-center gap-2 border-b border-app-border bg-app-card px-4 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-app-danger" aria-hidden="true" />
            <span className="text-xs font-semibold text-app-text">운영 주의 사항</span>
            <span className="ml-auto text-[11px] text-app-text-muted">{totalAttention}건</span>
          </div>
          <div className="divide-y divide-app-border">
            {healthCritical.filter(h => h.status === "unauthorized").map(h => {
              const acct = accounts.find(a => a.id === h.accountId);
              return (
                <AttentionItem key={"unauth-" + h.accountId}
                  icon={<ShieldAlert className="h-3.5 w-3.5 text-app-warning" />}
                  label={acct?.name?.trim() || h.phone}
                  detail="인증 필요 — 세션이 만료되었거나 인증되지 않았습니다"
                  actionLabel="재인증"
                  tone="warning"
                  action={() => setTab("register")}
                />
              );
            })}
            {healthCritical.filter(h => h.status === "banned").map(h => {
              const acct = accounts.find(a => a.id === h.accountId);
              return (
                <AttentionItem key={"banned-" + h.accountId}
                  icon={<Ban className="h-3.5 w-3.5 text-app-danger" />}
                  label={acct?.name?.trim() || h.phone}
                  detail="Telegram 계정이 차단되었습니다"
                  actionLabel="계정 관리"
                  tone="danger"
                  action={() => setTab("register")}
                />
              );
            })}
            {healthCritical.filter(h => h.status === "not_configured").map(h => {
              const acct = accounts.find(a => a.id === h.accountId);
              return (
                <AttentionItem key={"noconfig-" + h.accountId}
                  icon={<ShieldOff className="h-3.5 w-3.5 text-app-text-muted" />}
                  label={acct?.name?.trim() || h.phone}
                  detail="세션이 구성되지 않았습니다"
                  actionLabel="설정하기"
                  tone="muted"
                  action={() => setTab("register")}
                />
              );
            })}
            {healthWarning.filter(h => h.status === "rate_limited").map(h => {
              const acct = accounts.find(a => a.id === h.accountId);
              return (
                <AttentionItem key={"ratelimit-" + h.accountId}
                  icon={<Clock className="h-3.5 w-3.5 text-app-warning" />}
                  label={acct?.name?.trim() || h.phone}
                  detail="속도 제한 — 너무 많은 요청으로 일시 제한됨"
                  actionLabel="로그 보기"
                  tone="warning"
                  action={() => setTab("log")}
                />
              );
            })}
            {healthWarning.filter(h => h.status === "error").map(h => {
              const acct = accounts.find(a => a.id === h.accountId);
              return (
                <AttentionItem key={"error-" + h.accountId}
                  icon={<AlertTriangle className="h-3.5 w-3.5 text-app-danger" />}
                  label={acct?.name?.trim() || h.phone}
                  detail={h.lastError ?? "알 수 없는 오류"}
                  actionLabel="계정 관리"
                  tone="danger"
                  action={() => setTab("register")}
                />
              );
            })}
            {errors.health && bannedAccounts.length > 0 && (
              <AttentionItem key="banned-fallback"
                icon={<Ban className="h-3.5 w-3.5 text-app-danger" />}
                label={`차단된 계정 ${bannedAccounts.length}개`}
                detail={bannedAccounts.map(a => a.name?.trim() || a.phone).join(", ")}
                actionLabel="계정 관리"
                tone="danger"
                action={() => setTab("register")}
              />
            )}
            {erroredRecurring.length > 0 && (
              <AttentionItem key="recurring-error"
                icon={<AlertTriangle className="h-3.5 w-3.5 text-app-danger" />}
                label={`반복 스케줄 오류 ${erroredRecurring.length}개`}
                detail={erroredRecurring.map(b => b.message).join(", ")}
                actionLabel="스케줄러"
                tone="danger"
                action={() => setTab("scheduler")}
              />
            )}
            {pausedRecurring.length > 0 && (
              <AttentionItem key="recurring-paused"
                icon={<PauseCircle className="h-3.5 w-3.5 text-app-warning" />}
                label={`일시 정지된 반복 ${pausedRecurring.length}개`}
                detail={pausedRecurring.map(b => b.message).join(", ")}
                actionLabel="스케줄러"
                tone="warning"
                action={() => setTab("scheduler")}
              />
            )}
            {nonRetryableFailures.length > 0 && (
              <AttentionItem key="nonretryable-failures"
                icon={<Bug className="h-3.5 w-3.5 text-app-danger" />}
                label={`재시도 불가 실패 ${nonRetryableFailures.length}건`}
                detail={nonRetryableFailures.map(f => f.message).join(", ")}
                actionLabel="로그 보기"
                tone="danger"
                action={() => setTab("log")}
              />
            )}
          </div>
        </div>
      )}

      {/* All-clear state */}
      {!hasAnyAttention && accounts.length > 0 && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-app-success/20 bg-app-success-muted/20 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 text-app-success shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-app-success">모든 시스템 정상</p>
            <p className="text-[11px] text-app-text-muted">{activeAccounts.length}개 계정 활성 · {recurring.length}개 반복 스케줄</p>
          </div>
        </div>
      )}
      </div>

      <div key="recentFailures" style={{ order: widgetIdx("recentFailures") }}>
      {/* ── Recent Failures with retryable classification ── */}
      {widgetVisibility.recentFailures && recentFailures.length > 0 && (
        <div className="rounded-2xl border border-app-border overflow-hidden">
          <div className="flex items-center gap-2 border-b border-app-border bg-app-card px-4 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-app-danger" aria-hidden="true" />
            <span className="text-xs font-medium text-app-text">최근 발송 실패</span>
            <span className="ml-auto text-[11px] text-app-text-muted">{recentFailures.length}건</span>
          </div>
          <div className="divide-y divide-app-border">
            {recentFailures.map(f => {
              const acct = accounts.find(a => a.id === f.accountId);
              const acctLabel = acct ? (acct.name?.trim() || acct.phone) : f.accountId.slice(0, 8);
              const fi = f.failureInfo;
              const { summary: failureSummary, action: recoveryTarget, retryable } = failureInfoSummary(fi);
              const displayError = failureSummary || f.errorMessage || "알 수 없는 오류";
              const recoveryTab: TabId = (recoveryTarget === "register" ? "register" : "log") as TabId;
              return (
                <div key={f.id} className="flex items-center justify-between px-4 py-2">
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-xs text-app-text">{f.message}</p>
                      {retryable === "retryable" && <Badge tone="warning" className="shrink-0 text-[9px] px-1 py-0">재시도 가능</Badge>}
                      {retryable === "not_retryable" && <Badge tone="danger" className="shrink-0 text-[9px] px-1 py-0">재시도 불가</Badge>}
                      {retryable === "conditional" && <Badge tone="info" className="shrink-0 text-[9px] px-1 py-0">조건부</Badge>}
                    </div>
                    <p className="flex flex-wrap gap-x-1.5 text-[11px] text-app-text-muted">
                      <span>{acctLabel}</span>
                      <span>·</span>
                      <span>{formatRelativeTime(f.createdAt)}</span>
                      <span>·</span>
                      <span className="text-app-danger truncate max-w-[120px] sm:max-w-[200px]">{displayError}</span>
                    </p>
                  </div>
                  <button onClick={() => setTab(recoveryTab)}
                    className="shrink-0 flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-app-text-muted hover:bg-app-card-hover transition-colors focus-ring">
                    {recoveryTab === "register" ? "계정 관리" : "로그 보기"} <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
          <button onClick={() => setTab("log")}
            className="flex w-full items-center justify-center gap-1 border-t border-app-border py-2 text-[11px] font-medium text-app-text-muted hover:bg-app-card-hover transition-colors focus-ring">
            전체 로그 보기 <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}
      </div>

      <div key="usageChart" style={{ order: Math.min(widgetIdx("usageChart"), widgetIdx("usageProgress")) }}>
      {/* ── Usage Chart & Usage Progress (side by side) ── */}
      {priorityVisible.progress && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {widgetVisibility.usageChart ? (
            priorityVisible.chart ? (
              <UsageChartWidget timeline={overview?.timeline ?? []} loading={dataLoading} />
            ) : (
              <DashboardSkeleton variant="chart" priority="high" />
            )
          ) : null}
          {widgetVisibility.usageProgress ? (
            priorityVisible.progress ? (
              <UsageProgressWidget
                planId={plan ?? "free"}
                summary={overview?.summary ?? null}
                accountsCount={accounts.length}
                autoReplyCount={accounts.filter(a => a.autoReplyEnabled).length}
                loading={accountsLoading && accounts.length === 0}
              />
            ) : (
              <DashboardSkeleton variant="progress" priority="high" />
            )
          ) : null}
        </div>
      )}
      </div>

      {/* ── Widget Customization & Profiles ─────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setShowWidgetSettings(!showWidgetSettings)}
            className="flex items-center gap-1.5 rounded-xl border border-app-border bg-app-card px-3 py-1.5 text-xs font-medium text-app-text-muted hover:border-app-border-strong hover:text-app-text transition-colors"
          >
            <Settings className="h-3.5 w-3.5" aria-hidden="true" />
            위젯 설정
          </button>
          {showWidgetSettings && (
            <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-xl border border-app-border bg-app-surface p-2 shadow-xl">
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-app-text-muted">위젯 순서 및 표시</p>
              {widgetKeys.map((w, i) => (
                <div
                  key={w.key}
                  draggable
                  onDragStart={() => { dragWidgetRef.current = { key: w.key, from: i }; }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragWidgetRef.current && dragWidgetRef.current.key !== w.key) {
                      const from = dragWidgetRef.current.from;
                      const to = i;
                      const next = [...widgetOrder];
                      next.splice(from, 1);
                      next.splice(to, 0, dragWidgetRef.current.key);
                      persistOrder(next);
                      dragWidgetRef.current.from = to;
                    }
                  }}
                  onDragEnd={() => { dragWidgetRef.current = null; }}
                  className="flex items-center gap-1 rounded-lg px-1 py-1 text-xs text-app-text hover:bg-app-card-hover transition-colors group cursor-grab active:cursor-grabbing"
                >
                  <span className="text-[10px] text-app-text-subtle opacity-0 group-hover:opacity-100 transition-opacity shrink-0">⠿</span>
                  <button
                    onClick={() => toggleWidget(w.key)}
                    className="flex items-center gap-2 flex-1 px-1"
                  >
                    {widgetVisibility[w.key] ? (
                      <Eye className="h-3.5 w-3.5 text-app-primary shrink-0" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 text-app-text-subtle shrink-0" />
                    )}
                    <span className={widgetVisibility[w.key] ? "text-app-text" : "text-app-text-muted"}>{w.label}</span>
                  </button>
                  <div className="flex shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); moveWidget(w.key, -1); }}
                      disabled={i === 0}
                      className="flex h-5 w-5 items-center justify-center rounded text-app-text-subtle hover:text-app-text hover:bg-app-card-hover disabled:opacity-20"
                      title="위로 이동"
                    >↑</button>
                    <button
                      onClick={(e) => { e.stopPropagation(); moveWidget(w.key, 1); }}
                      disabled={i === widgetKeys.length - 1}
                      className="flex h-5 w-5 items-center justify-center rounded text-app-text-subtle hover:text-app-text hover:bg-app-card-hover disabled:opacity-20"
                      title="아래로 이동"
                    >↓</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="relative" ref={profilePanelRef}>
          <button
            onClick={() => setShowProfilePanel(!showProfilePanel)}
            className="flex items-center gap-1.5 rounded-xl border border-app-border bg-app-card px-3 py-1.5 text-xs font-medium text-app-text-muted hover:border-app-border-strong hover:text-app-text transition-colors"
          >
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            프로필
          </button>
          {showProfilePanel && (
            <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-xl border border-app-border bg-app-surface p-2 shadow-xl">
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-app-text-muted">
                현재 프로필: {currentProfile}
              </p>
              <div className="space-y-0.5">
                {profiles.map((p) => (
                  <div key={p.name} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs">
                    <button
                      onClick={() => { switchProfile(p.name); setShowProfilePanel(false); }}
                      className={`flex-1 text-left ${currentProfile === p.name ? "font-medium text-app-primary" : "text-app-text hover:text-app-text-strong"}`}
                    >
                      {p.name}
                    </button>
                    {p.name !== DEFAULT_PROFILE_NAME && (
                      <button
                        onClick={() => deleteProfile(p.name)}
                        className="shrink-0 rounded px-1 py-0.5 text-[10px] text-app-text-muted hover:text-app-danger transition-colors"
                        title="삭제"
                      >×</button>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 border-t border-app-border pt-2">
                <button
                  onClick={() => setProfilePrompt("")}
                  className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-app-text-muted hover:bg-app-card-hover transition-colors"
                >
                  <Plus className="h-3 w-3" /> 새 프로필로 저장
                </button>
              </div>
              {profilePrompt !== null && (
                <div className="mt-2 border-t border-app-border pt-2">
                  <form onSubmit={(e) => { e.preventDefault(); if (profilePrompt.trim()) { saveCurrentProfile(profilePrompt.trim()); setProfilePrompt(null); setShowProfilePanel(false); } }}>
                    <input
                      autoFocus
                      value={profilePrompt}
                      onChange={(e) => setProfilePrompt(e.target.value)}
                      placeholder="프로필 이름 입력..."
                      className="w-full rounded-lg border border-app-border bg-app-bg px-2 py-1.5 text-xs text-app-text placeholder:text-app-text-muted outline-none focus:border-app-primary"
                    />
                    <div className="mt-1.5 flex justify-end gap-1">
                      <button type="button" onClick={() => setProfilePrompt(null)}
                        className="rounded-lg px-2 py-1 text-[11px] text-app-text-muted hover:bg-app-card-hover transition-colors">취소</button>
                      <button type="submit"
                        className="rounded-lg bg-app-primary px-2 py-1 text-[11px] text-white hover:bg-app-primary-hover transition-colors">저장</button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setTab("send")}
          className="flex items-center gap-1.5 rounded-xl bg-app-primary px-3.5 py-2 text-xs font-medium text-white shadow-sm shadow-app-primary/20 hover:bg-app-primary-hover transition-colors focus-ring" aria-label="새 발송">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> 새 발송
        </button>
        <button onClick={() => setTab("groupsearch")}
          className="flex items-center gap-1.5 rounded-xl border border-app-border bg-app-card px-3.5 py-2 text-xs font-medium text-app-text hover:border-app-border-strong hover:shadow-sm transition-colors focus-ring">
          <Users className="h-3.5 w-3.5" aria-hidden="true" /> 그룹 찾기
        </button>
        <button onClick={() => setTab("scheduler")}
          className="flex items-center gap-1.5 rounded-xl border border-app-border bg-app-card px-3.5 py-2 text-xs font-medium text-app-text hover:border-app-border-strong hover:shadow-sm transition-colors focus-ring">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" /> 반복 스케줄러
        </button>
        <button onClick={() => setTab("deliveryanalytics")}
          className="flex items-center gap-1.5 rounded-xl border border-app-border bg-app-card px-3.5 py-2 text-xs font-medium text-app-text hover:border-app-border-strong hover:shadow-sm transition-colors focus-ring">
          <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" /> 전달 분석
        </button>
        <button onClick={() => setTab("log")}
          className="flex items-center gap-1.5 rounded-xl border border-app-border bg-app-card px-3.5 py-2 text-xs font-medium text-app-text hover:border-app-border-strong hover:shadow-sm transition-colors focus-ring">
          <Activity className="h-3.5 w-3.5" aria-hidden="true" /> 발송 로그
        </button>
        <button onClick={() => setTab("register")}
          className="flex items-center gap-1.5 rounded-xl border border-app-primary/30 bg-app-primary-muted/20 px-3.5 py-2 text-xs font-medium text-app-primary hover:bg-app-primary-muted/30 transition-colors focus-ring">
          <UserPlus className="h-3.5 w-3.5" aria-hidden="true" /> 계정 관리
        </button>
      </div>

      <div key="middlePanels" style={{ order: widgetIdx("middlePanels") }}>
      {/* ── Middle Section: 3 columns ────────────────────────── */}
      {widgetVisibility.middlePanels && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel
            title={<div className="flex items-center gap-2"><Clock className="h-4 w-4 text-app-info" aria-hidden="true" /> 예약된 발송</div>}
            className="lg:col-span-1"
          >
            {dataLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : upcoming.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Clock className="mb-2 h-6 w-6 text-app-text-subtle" aria-hidden="true" />
                <p className="text-xs text-app-text-muted">예약된 발송이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {upcoming.map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-xl border border-app-border bg-app-bg px-3 py-2 transition-colors hover:border-app-border-strong">
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="truncate text-xs font-medium text-app-text">{b.message}</p>
                      <p className="text-[11px] text-app-text-subtle">
                        {new Date(`${b.scheduledAt}Z`).toLocaleString("ko-KR", { hour12: false })}
                        {" · "}{b.recipients.length}개 대상
                      </p>
                    </div>
                    <Badge tone="info">예약</Badge>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel
            title={<div className="flex items-center gap-2"><RefreshCw className="h-4 w-4 text-app-primary" aria-hidden="true" /> 반복 발송</div>}
            className="lg:col-span-1"
          >
            {dataLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
              </div>
            ) : recurring.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <RefreshCw className="mb-2 h-6 w-6 text-app-text-subtle" aria-hidden="true" />
                <p className="text-xs text-app-text-muted">반복 발송 일정이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {recurring.slice(0, 5).map((b) => (
                  <RecurringCard key={b.id} b={b} accounts={accounts} />
                ))}
                {recurring.length > 5 && (
                  <button onClick={() => setTab("scheduler")}
                    className="w-full rounded-xl border border-app-border py-1.5 text-[11px] font-medium text-app-text-muted hover:bg-app-card-hover transition-colors focus-ring">
                    전체 {recurring.length}개 보기
                  </button>
                )}
              </div>
            )}
          </Panel>

          <Panel
            title={<div className="flex items-center gap-2"><Activity className="h-4 w-4 text-app-success" aria-hidden="true" /> 전달 건강</div>}
            className="lg:col-span-1"
          >
            {dataLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full rounded-xl" />
                <Skeleton className="h-8 w-full rounded-xl" />
                <Skeleton className="h-8 w-full rounded-xl" />
              </div>
            ) : !summary ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Activity className="mb-2 h-6 w-6 text-app-text-subtle" aria-hidden="true" />
                <p className="text-xs text-app-text-muted">전달 데이터가 아직 없습니다</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="relative h-16 w-16 shrink-0">
                    <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90" role="img" aria-label={`성공률 ${summary.success_rate.toFixed(0)}%`}>
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3" className="text-app-border" />
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3"
                        strokeDasharray={`${summary.success_rate * 0.97} 100`}
                        className={cn("transition-all duration-1000",
                          summary.success_rate >= 90 ? "text-app-success" : summary.success_rate >= 70 ? "text-app-warning" : "text-app-danger")}
                        strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={cn("text-sm font-bold",
                        summary.success_rate >= 90 ? "text-app-success" : summary.success_rate >= 70 ? "text-app-warning" : "text-app-danger")}>
                        {summary.success_rate.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-app-text-muted">총 시도</span>
                      <span className="font-medium tabular-nums text-app-text">{summary.total_attempted}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span className="text-app-success">성공</span>
                      <span className="font-medium tabular-nums text-app-success">{summary.successful}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span className="text-app-danger">실패</span>
                      <span className="font-medium tabular-nums text-app-danger">{summary.failed}</span>
                    </div>
                  </div>
                </div>

                {(overview?.by_source?.length ?? 0) > 0 && (
                  <div className="border-t border-app-border pt-2.5">
                    <p className="mb-1.5 text-[11px] font-medium text-app-text-muted">소스별</p>
                    <div className="space-y-1">
                      {(overview?.by_source ?? []).map((s) => (
                        <div key={s.source} className="flex items-center justify-between text-xs">
                          <span className="text-app-text capitalize">{s.source === "broadcast" ? "발송" : s.source}</span>
                          <div className="flex items-center gap-2">
                            <span className="tabular-nums text-app-text-muted">{s.total}건</span>
                            <span className={cn("tabular-nums font-medium",
                              s.success_rate >= 90 ? "text-app-success" : s.success_rate >= 70 ? "text-app-warning" : "text-app-danger")}>{s.success_rate.toFixed(0)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={() => setTab("deliveryanalytics")}
                  className="w-full rounded-xl border border-app-border py-1.5 text-[11px] font-medium text-app-text-muted hover:bg-app-card-hover transition-colors focus-ring">
                  전체 분석 보기 <ArrowRight className="inline h-3 w-3" />
                </button>
              </div>
            )}
          </Panel>
        </div>
      )}
      </div>

      <div key="recentActivity" style={{ order: widgetIdx("recentActivity") }}>
      {/* ── Recent Activity ──────────────────── */}
      {widgetVisibility.recentActivity && (
        <Panel
          title={<div className="flex items-center gap-2"><Activity className="h-4 w-4 text-app-primary" aria-hidden="true" /> 최근 활동</div>}
          className="w-full"
        >
          {dataLoading && recentLogs.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
            </div>
          ) : accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="mb-2 h-6 w-6 text-app-text-subtle" aria-hidden="true" />
              <p className="text-sm font-medium text-app-text">연결된 계정이 없습니다</p>
              <p className="mt-1 text-xs text-app-text-muted">계정 등록 탭에서 새 계정을 추가하세요</p>
            </div>
          ) : recentLogs.length === 0 && !dataLoading ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="mb-2 h-6 w-6 text-app-text-subtle" aria-hidden="true" />
              <p className="text-sm font-medium text-app-text">아직 활동 기록이 없습니다</p>
              <p className="mt-1 text-xs text-app-text-muted">계정을 연결하고 메시지를 발송하면 여기에 표시됩니다</p>
            </div>
          ) : (
            <div className="divide-y divide-app-border">
              {recentLogs.map((b) => {
                const fi = b.failureInfo;
                const { retryable } = failureInfoSummary(fi);
                const isRecur = isRecurringActive(b);
                const isFailed = b.status === "failed";
                return (
                  <div key={b.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-app-text">{b.message}</p>
                        {retryable === "retryable" && <Badge tone="warning" className="shrink-0 text-[9px] px-1 py-0">재시도 가능</Badge>}
                        {retryable === "not_retryable" && <Badge tone="danger" className="shrink-0 text-[9px] px-1 py-0">재시도 불가</Badge>}
                        {isRecur && <Badge tone="info" className="shrink-0 text-[9px] px-1 py-0">반복</Badge>}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-1 text-xs text-app-text-muted">
                        <span>{formatRelativeTime(b.createdAt)}</span>
                        {b.errorMessage && <><span>·</span><span className="text-app-danger truncate max-w-[120px]">{b.errorMessage}</span></>}
                      </div>
                    </div>
                    <button onClick={() => setTab(isFailed ? "log" : isRecur ? "scheduler" : "send")}
                      className="shrink-0 flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-app-text-muted hover:bg-app-card-hover transition-colors focus-ring"
                      aria-label={isFailed ? "로그 보기" : isRecur ? "스케줄러 보기" : "발송 보기"}>
                      {isFailed ? "로그 보기" : isRecur ? "스케줄러" : "발송 보기"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {errors.logs && logs.length > 0 && (
            <p className="mt-2 text-[11px] text-app-warning">로그 데이터를 불러오는 중 일부 오류가 발생했습니다</p>
          )}
        </Panel>
      )}
      </div>

      <div key="accountOverview" style={{ order: widgetIdx("accountOverview") }}>
      {/* ── Account Overview Table ──────────────────────────── */}
      {widgetVisibility.accountOverview && (
        <Panel
          title={<div className="flex items-center gap-2"><Users className="h-4 w-4 text-app-primary" aria-hidden="true" /> 계정 현황</div>}
          description="연결된 모든 Telegram 계정의 상태와 주요 지표"
        >
          {accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="mb-2 h-8 w-8 text-app-text-subtle" aria-hidden="true" />
              <p className="text-sm font-medium text-app-text">연결된 계정이 없습니다</p>
              <p className="mt-1 text-xs text-app-text-muted">계정 등록 탭에서 새 계정을 추가하세요</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>계정</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="hidden sm:table-cell">자동 응답</TableHead>
                    <TableHead className="text-right">오늘</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">그룹</TableHead>
                    <TableHead className="hidden md:table-cell">최근 활동</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((a) => {
                    const healthItem = healthItems.find(h => h.accountId === a.id);
                    const healthStatus = healthItem?.status;
                    const hasHealthIssue = healthStatus && healthStatus !== "healthy";
                    return (
                      <TableRow key={a.id} className={hasHealthIssue ? "bg-app-danger-muted/5" : undefined}>
                        <TableCell className="max-w-[120px] sm:max-w-[180px]">
                          <div className="truncate text-sm font-medium text-app-text" title={a.name || a.phone}>{a.name || a.phone}</div>
                          {a.name && <div className="truncate text-xs text-app-text-muted">{a.phone}</div>}
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                            a.status === "active" && !hasHealthIssue && "bg-app-success-muted text-app-success",
                            a.status === "active" && hasHealthIssue && "bg-app-warning-muted text-app-warning",
                            a.status === "inactive" && "bg-app-card-hover text-app-text-muted",
                            a.status === "banned" && "bg-app-danger-muted text-app-danger",
                          )}>
                            <span className={cn("h-1.5 w-1.5 rounded-full",
                              a.status === "active" && !hasHealthIssue && "bg-app-success",
                              a.status === "active" && hasHealthIssue && "bg-app-warning",
                              a.status === "inactive" && "bg-app-text-subtle",
                              a.status === "banned" && "bg-app-danger")} />
                            {a.status === "active" ? (hasHealthIssue ? "주의" : "활성") : a.status === "inactive" ? "비활성" : "차단"}
                          </span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {a.autoReplyEnabled
                            ? <span className="text-app-success text-xs font-medium">켜짐</span>
                            : <span className="text-app-text-subtle text-xs">꺼짐</span>}
                        </TableCell>
                        <TableCell className="font-medium tabular-nums text-right">{a.todaySent}</TableCell>
                        <TableCell className="tabular-nums text-app-text-muted text-right hidden sm:table-cell">{a.groupCount}</TableCell>
                        <TableCell className="text-xs text-app-text-muted hidden md:table-cell">
                          {a.lastActivity ? formatRelativeTime(a.lastActivity) : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Panel>
      )}
      </div>

      <div key="healthTrend" style={{ order: widgetIdx("healthTrend") }}>
      {/* ── Health Trend ──────────────────────────────────────── */}
      {widgetVisibility.healthTrend && healthItems.length > 0 && (
        <Panel
          title={<div className="flex items-center gap-2"><HeartPulse className="h-4 w-4 text-app-primary" aria-hidden="true" /> 계정 건강 트렌드</div>}
          description="각 계정의 최근 발송 성공률 및 건강 상태"
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {healthItems.map((h) => {
              const acct = accounts.find((a) => a.id === h.accountId);
              const totalAttempts = h.recentSuccessCount + h.recentFailureCount;
              const successRate = totalAttempts > 0 ? (h.recentSuccessCount / totalAttempts) * 100 : 0;
              const statusLabel: Record<string, { label: string; tone: string }> = {
                healthy: { label: "정상", tone: "text-app-success" },
                unauthorized: { label: "인증 필요", tone: "text-app-warning" },
                banned: { label: "차단", tone: "text-app-danger" },
                rate_limited: { label: "제한", tone: "text-app-warning" },
                error: { label: "오류", tone: "text-app-danger" },
                not_configured: { label: "미설정", tone: "text-app-text-muted" },
                unknown: { label: "알 수 없음", tone: "text-app-text-muted" },
              };
              const statusInfo = statusLabel[h.status] ?? { label: h.status, tone: "text-app-text-muted" };
              const barColor = successRate >= 90 ? "bg-app-success" : successRate >= 70 ? "bg-app-warning" : "bg-app-danger";
              return (
                <div key={h.accountId} className="rounded-xl border border-app-border bg-app-card p-3 transition-colors hover:border-app-border-strong">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="truncate text-xs font-medium text-app-text">{acct?.name?.trim() || h.phone}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-medium ${statusInfo.tone}`}>{statusInfo.label}</span>
                  </div>
                  {totalAttempts > 0 ? (
                    <>
                      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-app-border">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${Math.max(successRate, 4)}%` }}
                        />
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-app-text-muted">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-app-success" />
                          {h.recentSuccessCount}건
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingDown className="h-3 w-3 text-app-danger" />
                          {h.recentFailureCount}건
                        </span>
                        <span className="font-medium">{successRate.toFixed(0)}%</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-app-border">
                      <div className="h-full w-1/3 rounded-full bg-app-text-subtle/30" />
                    </div>
                  )}
                  {h.lastActivity && (
                    <p className="mt-1 text-[9px] text-app-text-subtle">마지막 활동: {formatRelativeTime(h.lastActivity)}</p>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      )}
      </div>

      <div key="banPredictor" style={{ order: widgetIdx("banPredictor") }}>
      {widgetVisibility.banPredictor && banPredictions.length > 0 && (
        <div className="rounded-xl border border-app-border bg-app-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-app-text">
              <ShieldAlert className="h-4 w-4 text-app-danger" aria-hidden="true" />
              계정 차단 예측
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {banPredictions.map((bp) => {
              const acct = accounts.find((a) => a.id === bp.accountId);
              return (
                <div key={bp.accountId} className="rounded-xl border border-app-border bg-app-card p-3 transition-colors hover:border-app-border-strong">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="truncate text-xs font-medium text-app-text">
                        {acct?.name?.trim() || acct?.phone || bp.accountId}
                      </p>
                    </div>
                    <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold", banRiskBg(bp.riskLevel), banRiskColor(bp.riskLevel))}>
                      {banRiskLabel(bp.riskLevel)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-1.5 rounded-full bg-app-border overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", banRiskBg(bp.riskLevel))}
                        style={{ width: `${Math.min(bp.riskScore, 100)}%` }}
                      />
                    </div>
                    <span className={cn("text-xs font-bold tabular-nums", banRiskColor(bp.riskLevel))}>
                      {bp.riskScore}
                    </span>
                  </div>
                  {bp.factors.length > 0 && (
                    <p className="text-[10px] text-app-text-muted truncate" title={bp.factors.join(", ")}>
                      {bp.factors.join(", ")}
                    </p>
                  )}
                  {(bp.riskLevel === "critical" || bp.riskLevel === "high") && bp.estimatedDaysLeft !== undefined && (
                    <p className="mt-0.5 text-[10px] text-app-danger">
                      예상 {bp.estimatedDaysLeft}일 내 차단
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      </div>

      <div key="failureIntelligence" style={{ order: widgetIdx("failureIntelligence") }}>
      {/* ── Failure Intelligence ─────────────────────────────── */}
      {widgetVisibility.failureIntelligence && failureTypes.length > 0 && (
        <Panel
          title={<div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-app-danger" aria-hidden="true" /> 실패 분석</div>}
          description="주요 실패 유형 및 영향"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {failureTypes.map((f) => (
              <div key={f.status} className="rounded-xl border border-app-border bg-app-card p-3 transition-colors hover:border-app-border-strong">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-app-text">{f.status}</span>
                  <span className={cn("text-xs font-bold tabular-nums", f.percentage > 30 ? "text-app-danger" : f.percentage > 10 ? "text-app-warning" : "text-app-text-muted")}>
                    {f.percentage.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-app-border overflow-hidden" role="progressbar" aria-valuenow={Math.round(f.percentage)} aria-valuemin={0} aria-valuemax={100} aria-label={`${f.status}: ${f.percentage.toFixed(0)}%`}>
                  <div className={cn("h-full rounded-full transition-all", f.percentage > 30 ? "bg-app-danger" : f.percentage > 10 ? "bg-app-warning" : "bg-app-text-subtle")}
                    style={{ width: `${Math.min(f.percentage, 100)}%` }} />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-app-text-muted">
                  <span>{f.count}건</span>
                  <span>{f.affected_accounts}개 계정</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
      </div>

      {/* ── API errors banner — non-blocking ── */}
      {(errors.logs || errors.upcoming || errors.recurring || errors.overview) && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-app-warning/20 bg-app-warning-muted/20 px-3 py-2 text-[11px] text-app-warning">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>일부 데이터를 불러오지 못했습니다.</span>
          <button onClick={loadAll} className="ml-auto underline hover:no-underline focus-ring">다시 시도</button>
        </div>
      )}

      {errors.health && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-app-warning/20 bg-app-warning-muted/20 px-3 py-2 text-[11px] text-app-warning">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>계정 상태 정보를 불러올 수 없습니다.</span>
          <button onClick={loadHealth} className="ml-auto underline hover:no-underline focus-ring">다시 시도</button>
        </div>
      )}
    </div>
  );
}
