"use client";

import { cn } from "@/lib/cn";

interface DashboardSkeletonProps {
  /** Priority level: "critical" renders first, then "high", then "normal". */
  priority?: "critical" | "high" | "normal";
  variant: "metrics" | "chart" | "progress" | "activity" | "attention" | "header";
  className?: string;
}

function CriticalMetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-app-border bg-app-card p-3">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-app-card-hover animate-pulse" />
            <div className="h-3 w-12 rounded bg-app-card-hover animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <div className="h-7 w-16 rounded bg-app-card-hover animate-pulse" />
            <div className="h-3 w-8 rounded bg-app-card-hover animate-pulse" />
          </div>
          <div className="mt-1 h-3 w-20 rounded bg-app-card-hover animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  const bars = Array.from({ length: 10 }).map((_, i) => ({
    key: i,
    h: 20 + ((i * 7 + 13) % 50),
  }));
  return (
    <div className="rounded-2xl border border-app-border bg-app-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-4 w-4 rounded bg-app-card-hover animate-pulse" />
        <div className="h-4 w-24 rounded bg-app-card-hover animate-pulse" />
      </div>
      <div className="flex items-end gap-2 h-48 px-2">
        {bars.map((b) => (
          <div
            key={b.key}
            className="flex-1 rounded-t bg-app-card-hover animate-pulse"
            style={{ height: `${b.h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function ProgressSkeleton() {
  return (
    <div className="rounded-2xl border border-app-border bg-app-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-4 w-4 rounded bg-app-card-hover animate-pulse" />
        <div className="h-4 w-20 rounded bg-app-card-hover animate-pulse" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="h-3 w-12 rounded bg-app-card-hover animate-pulse" />
              <div className="h-3 w-16 rounded bg-app-card-hover animate-pulse" />
            </div>
            <div className="h-2 w-full rounded-full bg-app-border">
              <div
                className="h-full rounded-full bg-app-card-hover animate-pulse"
                style={{ width: `${30 + Math.random() * 50}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="rounded-2xl border border-app-border bg-app-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-4 w-4 rounded bg-app-card-hover animate-pulse" />
        <div className="h-4 w-20 rounded bg-app-card-hover animate-pulse" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-app-card-hover animate-pulse" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-2/3 rounded bg-app-card-hover animate-pulse" />
              <div className="h-2 w-1/3 rounded bg-app-card-hover animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttentionSkeleton() {
  return (
    <div className="rounded-2xl border border-app-border overflow-hidden">
      <div className="flex items-center gap-2 border-b border-app-border bg-app-card px-4 py-2">
        <div className="h-3.5 w-3.5 rounded bg-app-danger-muted animate-pulse" />
        <div className="h-3 w-24 rounded bg-app-card-hover animate-pulse" />
      </div>
      <div className="divide-y divide-app-border">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5">
            <div className="h-7 w-7 rounded-lg bg-app-card-hover animate-pulse" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-32 rounded bg-app-card-hover animate-pulse" />
              <div className="h-2 w-48 rounded bg-app-card-hover animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <div className="h-5 w-36 rounded bg-app-card-hover animate-pulse" />
        <div className="h-3 w-24 rounded bg-app-card-hover animate-pulse" />
      </div>
      <div className="h-8 w-20 rounded-xl bg-app-card-hover animate-pulse" />
    </div>
  );
}

const OPACITY_MAP = { critical: "", high: "opacity-60", normal: "opacity-30" } as const;

export function DashboardSkeleton({ priority = "normal", variant, className }: DashboardSkeletonProps) {
  const priorityClass = `transition-opacity duration-500 ${OPACITY_MAP[priority]}`;

  switch (variant) {
    case "header":
      return <div className={cn(priorityClass, className)}><HeaderSkeleton /></div>;
    case "metrics":
      return <div className={cn(priorityClass, className)}><CriticalMetricsSkeleton /></div>;
    case "chart":
      return <div className={cn(priorityClass, className)}><ChartSkeleton /></div>;
    case "progress":
      return <div className={cn(priorityClass, className)}><ProgressSkeleton /></div>;
    case "activity":
      return <div className={cn(priorityClass, className)}><ActivitySkeleton /></div>;
    case "attention":
      return <div className={cn(priorityClass, className)}><AttentionSkeleton /></div>;
    default:
      return null;
  }
}
