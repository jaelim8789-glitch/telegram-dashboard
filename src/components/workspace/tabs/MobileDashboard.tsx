"use client";

import { useState, useEffect } from "react";
import { Send, AlertTriangle, CheckCircle2, Clock, Users, Activity } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import { WidgetErrorBoundary } from "@/components/ui/WidgetErrorBoundary";
import * as api from "@/lib/api";

/**
 * Mobile Dashboard — 모바일 전용 컴팩트 위젯
 */
export function MobileDashboard() {
  const account = useDashboardStore((s) => s.accounts.find((a) => a.id === s.selectedAccountId));
  const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.fetchLogs({ accountId: undefined, days: 1, limit: 50 })
      .then((logs) => {
        setStats({ total: logs.length, sent: logs.filter((l) => l.status === "sent").length, failed: logs.filter((l) => l.status === "failed").length });
      })
      .catch((e) => console.error("[MobileDashboard] logs fetch 실패", e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-24 rounded-xl bg-app-card-hover animate-pulse" />;

  return (
    <WidgetErrorBoundary>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-app-border bg-app-card p-3">
          <div className="flex items-center gap-1.5 text-[10px] text-app-text-muted">
            <Activity className="h-3 w-3" /> 오늘 발송
          </div>
          <p className="text-lg font-bold text-app-text mt-0.5">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-app-border bg-app-card p-3">
          <div className="flex items-center gap-1.5 text-[10px] text-app-text-muted">
            <CheckCircle2 className="h-3 w-3 text-app-success" /> 성공
          </div>
          <p className="text-lg font-bold text-app-text mt-0.5">{stats.sent}</p>
        </div>
        <div className="rounded-xl border border-app-border bg-app-card p-3">
          <div className="flex items-center gap-1.5 text-[10px] text-app-text-muted">
            <AlertTriangle className="h-3 w-3 text-app-danger" /> 실패
          </div>
          <p className="text-lg font-bold text-app-text mt-0.5">{stats.failed}</p>
        </div>
        <div className="rounded-xl border border-app-border bg-app-card p-3">
          <div className="flex items-center gap-1.5 text-[10px] text-app-text-muted">
            <Users className="h-3 w-3 text-app-primary" /> {account?.name ? account.name.slice(0, 6) : "계정"}
          </div>
          <p className="text-sm font-bold text-app-text mt-0.5 truncate">{account?.phone?.slice(0, 12) || "선택 안 됨"}</p>
        </div>
      </div>
    </WidgetErrorBoundary>
  );
}
