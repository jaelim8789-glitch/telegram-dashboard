"use client";

import dynamic from "next/dynamic";
import { BarChart3, TrendingUp, Users, Send, Activity } from "lucide-react";

const DeliveryAnalyticsTab = dynamic(
  () => import("@/components/workspace/tabs/DeliveryAnalyticsTab").then((m) => ({ default: m.DeliveryAnalyticsTab })),
  {
    loading: () => (
      <div className="space-y-3 p-4">
        <div className="h-6 w-1/3 animate-pulse rounded bg-app-border" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-app-border" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-app-border" />
      </div>
    ),
  },
);

export function AnalyticsCategory({ panel }: { panel: "left" | "center" | "right" }) {
  if (panel !== "center") return null;

  return (
    <div className="flex h-full flex-col">
      {/* Analytics header */}
      <div className="border-b border-app-border bg-app-surface px-4 py-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-app-primary" />
          <h2 className="text-sm font-semibold text-app-text">분석 대시보드</h2>
        </div>
        {/* Mini stat pills */}
        <div className="mt-2 flex items-center gap-3 text-[11px] text-app-text-muted">
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-app-success" />
            전송량
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3 text-app-primary" />
            수신자
          </span>
          <span className="flex items-center gap-1">
            <Activity className="h-3 w-3 text-app-warning" />
            전달률
          </span>
        </div>
      </div>
      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <DeliveryAnalyticsTab />
      </div>
    </div>
  );
}
