"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, MessageSquare, RefreshCw, TrendingUp, TrendingDown,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/cn";
import * as api from "@/lib/api";
import type { Broadcast } from "@/types";

interface DailyDigestProps {
  accounts: { id: string; name: string | null; phone: string; todaySent: number }[];
  logs: Broadcast[];
  /** Optional pre-fetched overview to avoid duplicate API calls */
  overview?: import("@/types").DeliveryOverview | null;
}

/**
 * Daily digest widget showing today's activity summary.
 * Placed at the top of the dashboard for immediate situation awareness.
 * Uses parent's overview data when available to avoid duplicate API calls.
 */
export function DailyDigest({ accounts, logs, overview }: DailyDigestProps) {
  // Compute today's activity from accounts and in-memory logs (no API call)
  const todayActivity = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayLogs = logs.filter((l) => l.createdAt?.startsWith(today));
    return {
      sent: todayLogs.filter((l) => l.status === "sent").length,
      failed: todayLogs.filter((l) => l.status === "failed").length,
      pending: todayLogs.filter((l) => l.status === "pending" || l.status === "sending").length,
      totalToday: accounts.reduce((s, a) => s + a.todaySent, 0),
    };
  }, [logs, accounts]);

  const hasActivity = todayActivity.totalToday > 0 || todayActivity.sent > 0 || todayActivity.failed > 0;
  const successRate = todayActivity.sent + todayActivity.failed > 0
    ? (todayActivity.sent / (todayActivity.sent + todayActivity.failed)) * 100
    : null;

  if (!hasActivity) {
    return null; // Silently hide when no data
  }

  return (
    <div className="rounded-xl border border-app-primary/10 bg-gradient-to-r from-app-primary-muted/30 via-transparent to-app-card/30 px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="h-3.5 w-3.5 text-app-primary" />
        <span className="text-xs font-semibold text-app-text">오늘의 활동</span>
        <span className="text-[10px] text-app-text-muted">
          {new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {/* Total sent */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-app-success-muted">
            <MessageSquare className="h-3.5 w-3.5 text-app-success" />
          </div>
          <div>
            <p className="text-lg font-bold tabular-nums text-app-success">
              {todayActivity.totalToday}
            </p>
            <p className="text-[10px] text-app-text-muted leading-tight">발송</p>
          </div>
        </div>

        {/* Failed */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-app-danger-muted">
            <Activity className="h-3.5 w-3.5 text-app-danger" />
          </div>
          <div>
            <p className={cn(
              "text-lg font-bold tabular-nums",
              todayActivity.failed > 0 ? "text-app-danger" : "text-app-text-muted"
            )}>
              {todayActivity.failed}
            </p>
            <p className="text-[10px] text-app-text-muted leading-tight">실패</p>
          </div>
        </div>

        {/* Success rate */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-app-info-muted">
            {successRate != null && successRate >= 80 ? (
              <TrendingUp className="h-3.5 w-3.5 text-app-success" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-app-danger" />
            )}
          </div>
          <div>
            <p className={cn(
              "text-lg font-bold tabular-nums",
              successRate != null && successRate >= 80 ? "text-app-success" : "text-app-danger"
            )}>
              {successRate != null ? `${successRate.toFixed(0)}%` : "-"}
            </p>
            <p className="text-[10px] text-app-text-muted leading-tight">성공률</p>
          </div>
        </div>

        {/* Pending */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-app-warning-muted">
            <RefreshCw className="h-3.5 w-3.5 text-app-warning" />
          </div>
          <div>
            <p className={cn(
              "text-lg font-bold tabular-nums",
              todayActivity.pending > 0 ? "text-app-warning" : "text-app-text-muted"
            )}>
              {todayActivity.pending}
            </p>
            <p className="text-[10px] text-app-text-muted leading-tight">처리 중</p>
          </div>
        </div>
      </div>
    </div>
  );
}
