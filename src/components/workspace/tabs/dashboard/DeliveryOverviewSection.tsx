"use client";

import { Activity, TrendingUp, TrendingDown } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import type { DeliveryOverview, TabId } from "@/types";

export interface DeliveryOverviewSectionProps {
  overview: DeliveryOverview | null;
  dataLoading: boolean;
  onNavigate: (tab: TabId) => void;
}

export function DeliveryOverviewSection({ overview, dataLoading, onNavigate }: DeliveryOverviewSectionProps) {
  const summary = overview?.summary;

  if (dataLoading) {
    return (
      <Panel title="전달 건강" className="lg:col-span-1">
        <div className="space-y-2">
          <Skeleton className="h-8 w-full rounded-xl" />
          <Skeleton className="h-8 w-full rounded-xl" />
          <Skeleton className="h-8 w-full rounded-xl" />
        </div>
      </Panel>
    );
  }

  if (!summary) {
    return (
      <Panel title="전달 건강" className="lg:col-span-1">
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Activity className="mb-2 h-6 w-6 text-app-text-subtle" aria-hidden="true" />
          <p className="text-xs text-app-text-muted">전달 데이터가 아직 없습니다</p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title={<div className="flex items-center gap-2"><Activity className="h-4 w-4 text-app-success" aria-hidden="true" /> 전달 건강</div>}
      className="lg:col-span-1"
    >
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

        <button onClick={() => onNavigate("deliveryanalytics")}
          className="w-full rounded-xl border border-app-border py-1.5 text-[11px] font-medium text-app-text-muted hover:bg-app-card-hover transition-colors focus-ring">
          전체 분석 보기 <ArrowRight className="inline h-3 w-3" />
        </button>
      </div>
    </Panel>
  );
}
