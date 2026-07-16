import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Skeleton } from "@/components/ui/Skeleton";

interface SkeletonGroupProps {
  /** Number of skeleton rows to render. */
  rows?: number;
  /** Height of each row. */
  rowHeight?: string;
  /** Optional variant for different layouts. */
  variant?: "text" | "card" | "avatar-text" | "stat-card";
  className?: string;
  /** Custom children override the default skeleton rows. */
  children?: ReactNode;
}

/**
 * SkeletonGroup renders a predictable set of loading placeholders for
 * common patterns (text blocks, stat cards, avatar+text rows, cards).
 * Use it instead of hand-rolling multiple <Skeleton> instances so the
 * layout is consistent everywhere.
 *
 * Examples:
 *   <SkeletonGroup rows={3} rowHeight="h-3" />           // text lines
 *   <SkeletonGroup variant="stat-card" rows={4} />        // stat grid
 *   <SkeletonGroup variant="avatar-text" rows={5} />      // list rows
 */
export function SkeletonGroup({
  rows = 3,
  rowHeight = "h-4",
  variant = "text",
  className,
  children,
}: SkeletonGroupProps) {
  if (children) {
    return <div className={cn("space-y-2", className)}>{children}</div>;
  }

  if (variant === "card") {
    return (
      <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3", className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-app-border bg-app-card p-4"
          >
            <Skeleton className="mb-3 h-10 w-10 rounded-xl" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="mt-2 h-3 w-full" />
            <Skeleton className="mt-1 h-3 w-4/5" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "avatar-text") {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "stat-card") {
    return (
      <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-app-border bg-app-card p-4"
          >
            <Skeleton className="mb-3 h-10 w-10 rounded-xl" />
            <Skeleton className="h-7 w-1/2" />
            <Skeleton className="mt-1 h-3 w-3/4" />
            <Skeleton className="mt-2 h-2 w-full" />
          </div>
        ))}
      </div>
    );
  }

  // Default: text variant
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(rowHeight, i === rows - 1 ? "w-3/5" : "w-full")}
        />
      ))}
    </div>
  );
}
