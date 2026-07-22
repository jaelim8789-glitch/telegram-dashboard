"use client";

import { HeartPulse, Gauge } from "lucide-react";
import { cn } from "@/lib/cn";
import type { AccountHealthScore } from "@/lib/healthScore";
import { healthScoreColor, healthScoreBg, computeOverallScore } from "@/lib/healthScore";

export interface HealthScoreSectionProps {
  healthScores: AccountHealthScore[];
}

export function HealthScoreSection({ healthScores }: HealthScoreSectionProps) {
  const overall = computeOverallScore(healthScores);

  return (
    <div className="rounded-xl border border-app-border bg-app-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-app-text">
          <HeartPulse className="h-4 w-4 text-app-danger" aria-hidden="true" />
          계정 건강 점수
        </div>
        <div className="flex items-center gap-1.5 text-xs text-app-text-muted">
          <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
          종합 <span className={cn("font-bold tabular-nums", healthScoreColor(overall.level))}>{overall.score}</span>
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
  );
}
