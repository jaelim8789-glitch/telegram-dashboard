"use client";

import { useEffect, useState } from "react";
import { Send, FileText, CalendarClock, Zap, MessageSquare, CheckCircle2, AlertTriangle, Clock, ArrowRight, Plus } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { TABS, type TabId } from "@/types";
import { getToken } from "@/lib/auth";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

const SEND_FEATURES: TabId[] = ["send", "drafts", "scheduler", "replymacro", "templates"];

const FEATURE_META: Record<string, { icon: React.ComponentType<{ className?: string }>; desc: string; color: string }> = {
  send: { icon: Send, desc: "메시지 작성 및 발송", color: "text-blue-500" },
  drafts: { icon: FileText, desc: "임시저장 메시지 검토", color: "text-amber-500" },
  scheduler: { icon: CalendarClock, desc: "반복 발송 일정 관리", color: "text-purple-500" },
  replymacro: { icon: Zap, desc: "자동 답장 매크로", color: "text-green-500" },
  templates: { icon: MessageSquare, desc: "메시지 템플릿 관리", color: "text-rose-500" },
};

export function SendHub() {
  const navigateToFeature = useDashboardStore((s) => s.navigateToFeature);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const [stats, setStats] = useState<{ sent: number; failed: number; scheduled: number; loading: boolean }>({ sent: 0, failed: 0, scheduled: 0, loading: true });

  useEffect(() => {
    let cancelled = false;
    if (!selectedAccountId) {
      setStats((s) => ({ ...s, loading: false }));
      return;
    }
    fetch(`${BASE_URL}/api/broadcasts?account_id=${selectedAccountId}&limit=100`, { headers: authHeaders() })
      .then((r) => r.json().catch(() => ({})))
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : (data.broadcasts || []);
        const sent = list.filter((b: any) => b.status === "sent").length;
        const failed = list.filter((b: any) => b.status === "failed").length;
        const scheduled = list.filter((b: any) => b.status === "pending" || b.status === "scheduled").length;
        setStats({ sent, failed, scheduled, loading: false });
      })
      .catch(() => { if (!cancelled) setStats((s) => ({ ...s, loading: false })); });
    return () => { cancelled = true; };
  }, [selectedAccountId]);

  const sendTabs = TABS.filter((t) => SEND_FEATURES.includes(t.id));

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold text-app-text">발송</h2>

      <div className="grid grid-cols-3 gap-2">
        <StatCard icon={CheckCircle2} label="성공" value={stats.loading ? null : stats.sent} color="text-emerald-500" bg="bg-emerald-500/10" loading={stats.loading} />
        <StatCard icon={AlertTriangle} label="실패" value={stats.loading ? null : stats.failed} color="text-red-500" bg="bg-red-500/10" loading={stats.loading} />
        <StatCard icon={Clock} label="예약" value={stats.loading ? null : stats.scheduled} color="text-amber-500" bg="bg-amber-500/10" loading={stats.loading} />
      </div>

      <button
        type="button"
        onClick={() => navigateToFeature("send")}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-app-primary py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" />
        빠른 발송하기
      </button>

      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold text-app-text-muted uppercase tracking-wider">발송 기능</p>
        {sendTabs.map((tab) => {
          const meta = FEATURE_META[tab.id];
          const Icon = meta?.icon || Send;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => navigateToFeature(tab.id)}
              className="flex w-full items-center gap-3 rounded-xl border border-app-border bg-app-card px-3 py-3 text-left transition-all hover:border-app-primary/30 hover:bg-app-card-hover active:scale-[0.98]"
            >
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", meta?.color.replace("text-", "bg-").replace("500", "500/10"))}>
                <Icon className={cn("h-4.5 w-4.5", meta?.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-app-text">{tab.label}</p>
                {meta?.desc && <p className="text-[11px] text-app-text-muted truncate">{meta.desc}</p>}
              </div>
              <ArrowRight className="h-4 w-4 text-app-text-muted shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg, loading }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | null; color: string; bg: string; loading: boolean }) {
  return (
    <div className={cn("rounded-xl border border-app-border/50 px-3 py-3 text-center", bg)}>
      <Icon className={cn("h-4 w-4 mx-auto mb-1", color)} />
      {loading ? (
        <Skeleton className="h-5 w-8 mx-auto rounded" />
      ) : (
        <p className={cn("text-lg font-bold", color)}>{value ?? "-"}</p>
      )}
      <p className="text-[10px] text-app-text-muted">{label}</p>
    </div>
  );
}
