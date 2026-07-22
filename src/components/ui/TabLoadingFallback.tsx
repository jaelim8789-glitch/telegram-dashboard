"use client";

import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export function TabLoadingFallback() {
  return (
    <div className="space-y-4 p-6 animate-fade-in">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-64" />
      <div className="space-y-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
