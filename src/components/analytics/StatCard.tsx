"use client";

import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  change: number;
  positive: boolean;
  icon: LucideIcon;
}

export function StatCard({ label, value, change, positive, icon: Icon }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-violet-500/20 bg-app-card p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-app-text-muted">{label}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
          <Icon className="h-4 w-4 text-violet-400" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-app-text tabular-nums">{value}</span>
        <span
          className={`inline-flex items-center gap-0.5 text-xs font-medium tabular-nums ${
            positive ? "text-green-400" : "text-red-400"
          }`}
        >
          {positive ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {positive ? "+" : "-"}
          {change}%
        </span>
      </div>
    </div>
  );
}
