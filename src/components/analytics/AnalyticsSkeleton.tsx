"use client";

import { Skeleton } from "@/components/ui/Skeleton";

export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-violet-500/15 bg-app-card p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-14 rounded" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <Skeleton className="h-9 w-20 rounded" />
        <Skeleton className="h-4 w-12 rounded" />
      </div>
    </div>
  );
}

export function LineChartSkeleton() {
  return (
    <div className="rounded-2xl border border-violet-500/20 bg-app-card p-5">
      <Skeleton className="h-5 w-32 rounded" />
      <div className="mt-4 flex items-end gap-3" style={{ height: 280 }}>
        {[60, 80, 50, 90, 70, 95, 75].map((h, i) => (
          <Skeleton key={i} className="flex-1 rounded-t" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

export function DonutChartSkeleton() {
  return (
    <div className="rounded-2xl border border-violet-500/20 bg-app-card p-5">
      <Skeleton className="h-5 w-24 rounded" />
      <div className="mt-4 flex items-center justify-center" style={{ height: 280 }}>
        <Skeleton className="h-40 w-40 rounded-full" />
      </div>
    </div>
  );
}

export function Top5TableSkeleton() {
  return (
    <div className="rounded-2xl border border-violet-500/20 bg-app-card overflow-hidden">
      <div className="px-5 py-4 border-b border-app-border">
        <Skeleton className="h-5 w-36 rounded" />
      </div>
      <div className="p-5 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-5 w-5 rounded shrink-0" />
            <Skeleton className="h-4 flex-1 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-4 w-12 rounded" />
            <Skeleton className="h-3 flex-1 max-w-[120px] rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
