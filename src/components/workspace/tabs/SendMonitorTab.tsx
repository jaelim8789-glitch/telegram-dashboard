"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity, Send, Clock, BarChart3, AlertTriangle, CheckCircle2,
  Loader2, TrendingUp, Users, Zap, Calendar, RefreshCw,
  ChevronRight, Radio, FileText,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { useDashboardStore } from "@/store/useDashboardStore";
import { WidgetErrorBoundary } from "@/components/ui/WidgetErrorBoundary";
import { cn } from "@/lib/cn";
import * as api from "@/lib/api";

interface BroadcastStats {
  total: number; sent: number; failed: number; pending: number;
  activeBroadcasts: { id: string; message: string; status: string; sentCount?: number; createdAt: string }[];
}

type SubTab = "monitor" | "compose" | "history" | "schedule";

export function SendMonitorTab() {
  const accounts = useDashboardStore((s) => s.accounts);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const account = accounts.find((a) => a.id === selectedAccountId);
  const [sub, setSub] = useState<SubTab>("monitor");
  const [stats, setStats] = useState<BroadcastStats>({ total: 0, sent: 0, failed: 0, pending: 0, activeBroadcasts: [] });
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);

  const loadStats = useCallback(async () => {
    setPolling(true);
    try {
      const logs = await api.fetchLogs({ accountId: selectedAccountId || undefined, days: 1 });
      const active = logs.filter((l) => l.status === "pending" || l.status === "running").slice(0, 10);
      setStats({
        total: logs.length,
        sent: logs.filter((l) => l.status === "sent").length,
        failed: logs.filter((l) => l.status === "failed").length,
        pending: logs.filter((l) => l.status === "pending" || l.status === "running").length,
        activeBroadcasts: active.map((l) => ({ id: l.id, message: l.message.slice(0, 80), status: l.status, sentCount: l.recipients?.length ?? 0, createdAt: l.createdAt })),
      });
    } catch {}
    finally { setLoading(false); setPolling(false); }
  }, [selectedAccountId]);

  useEffect(() => { loadStats(); const t = setInterval(loadStats, 15000); return () => clearInterval(t); }, [loadStats]);

  const SUB_TABS: { id: SubTab; label: string; icon: React.ReactNode }[] = [
    { id: "monitor", label: "모니터링", icon: <Activity className="h-3.5 w-3.5" /> },
    { id: "compose", label: "발송하기", icon: <Send className="h-3.5 w-3.5" /> },
    { id: "history", label: "발송내역", icon: <FileText className="h-3.5 w-3.5" /> },
    { id: "schedule", label: "예약관리", icon: <Calendar className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-app-primary/10">
          <Radio className="h-5 w-5 text-app-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-bold text-app-text">발송 센터</h2>
          <p className="text-[10px] text-app-text-muted">{account ? `${account.name || account.phone?.slice(0, 10)} · ` : ""}{loading ? "로딩 중..." : `오늘 ${stats.total}건 · ${stats.pending}건 진행 중`}</p>
        </div>
        <button onClick={loadStats} disabled={polling} className="p-2 rounded-lg hover:bg-app-card-hover text-app-text-muted transition-colors"><RefreshCw className={cn("h-4 w-4", polling && "animate-spin")} /></button>
      </div>
      <div className="flex gap-1.5 overflow-x-auto scrollbar-thin">
        {SUB_TABS.map((t) => (
          <button key={t.id} onClick={() => setSub(t.id)}
            className={cn("shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              sub === t.id ? "bg-app-primary text-white shadow-sm" : "bg-app-card border border-app-border text-app-text-muted hover:bg-app-card-hover"
            )}>{t.icon} {t.label}</button>
        ))}
      </div>
      {sub === "monitor" && <MonitorView stats={stats} loading={loading} />}
      {sub === "compose" && <RedirectTab tab="send" label="발송하기" />}
      {sub === "history" && <RedirectTab tab="log" label="발송내역" />}
      {sub === "schedule" && <RedirectTab tab="scheduler" label="예약관리" />}
    </div>
  );
}

function MonitorView({ stats, loading }: { stats: BroadcastStats; loading: boolean }) {
  const successRate = stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 100;
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);
  return (
    <WidgetErrorBoundary>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard icon={<Send />} label="전체" value={stats.total} color="text-app-text" />
          <StatCard icon={<CheckCircle2 />} label="성공" value={stats.sent} color="text-app-success" />
          <StatCard icon={<AlertTriangle />} label="실패" value={stats.failed} color="text-app-danger" />
          <StatCard icon={<Clock />} label="진행 중" value={stats.pending} color="text-app-primary" pulse={stats.pending > 0} />
        </div>
        <Panel title="🚀 빠른 액션">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setActiveTab("send")} className="flex items-center gap-2 rounded-xl border border-app-border bg-app-card p-3 text-left hover:bg-app-card-hover">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-app-primary/10"><Send className="h-5 w-5 text-app-primary" /></div>
              <div><p className="text-xs font-medium text-app-text">새 발송</p><p className="text-[10px] text-app-text-muted">메시지 작성</p></div>
              <ChevronRight className="h-4 w-4 text-app-text-muted ml-auto" />
            </button>
            <button onClick={() => setActiveTab("scheduler")} className="flex items-center gap-2 rounded-xl border border-app-border bg-app-card p-3 text-left hover:bg-app-card-hover">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-app-warning/10"><Calendar className="h-5 w-5 text-app-warning" /></div>
              <div><p className="text-xs font-medium text-app-text">예약 발송</p><p className="text-[10px] text-app-text-muted">시간 예약</p></div>
              <ChevronRight className="h-4 w-4 text-app-text-muted ml-auto" />
            </button>
            <button onClick={() => setActiveTab("myai")} className="flex items-center gap-2 rounded-xl border border-app-primary/30 bg-app-primary/5 p-3 text-left hover:bg-app-primary/10">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-app-primary/10"><TrendingUp className="h-5 w-5 text-app-primary" /></div>
              <div><p className="text-xs font-medium text-app-text">AI 분석</p><p className="text-[10px] text-app-text-muted">실패 원인 분석</p></div>
              <ChevronRight className="h-4 w-4 text-app-text-muted ml-auto" />
            </button>
          </div>
        </Panel>
      </div>
    </WidgetErrorBoundary>
  );
}

function RedirectTab({ tab, label }: { tab: string; label: string }) {
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);
  useEffect(() => { setActiveTab(tab as any); }, [tab]);
  return <div className="flex flex-col items-center gap-3 py-8 text-app-text-muted"><Loader2 className="h-6 w-6 animate-spin text-app-primary" /><p className="text-xs">{label}로 이동 중...</p></div>;
}

function StatCard({ icon, label, value, color, pulse }: { icon: React.ReactNode; label: string; value: number; color: string; pulse?: boolean }) {
  return (
    <div className="rounded-xl border border-app-border bg-app-card p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-medium text-app-text-muted">
        <span className={cn(color, pulse && "animate-pulse")}>{icon}</span> {label}
      </div>
      <p className={cn("text-lg font-bold mt-0.5", color)}>{value.toLocaleString()}</p>
    </div>
  );
}
