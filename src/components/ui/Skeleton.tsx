"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

interface SkeletonProps {
  className?: string;
  variant?: "default" | "gold-shimmer";
  width?: string | number;
  height?: string | number;
}

export const Skeleton = memo(function Skeleton({ className, variant = "default", width, height }: SkeletonProps) {
  const style: React.CSSProperties = {};
  if (width != null) style.width = typeof width === "number" ? `${width}px` : width;
  if (height != null) style.height = typeof height === "number" ? `${height}px` : height;

  if (variant === "gold-shimmer") {
    return (
      <div
        aria-hidden="true"
        className={cn("rounded-lg", className)}
        style={{
          ...style,
          background: `linear-gradient(90deg, var(--color-card) 0%, var(--color-accent-light) 25%, var(--color-card) 50%)`,
          backgroundSize: "200% 100%",
          animation: "gold-shimmer 3s ease-in-out infinite",
        }}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-lg bg-app-card-hover", className)}
      style={style}
    />
  );
});

interface SkeletonCardProps {
  className?: string;
}

export const SkeletonCard = memo(function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("rounded-xl border border-app-border bg-app-card p-4 space-y-3 animate-pulse", className)}
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-app-card-hover" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-2/5 rounded bg-app-card-hover" />
          <div className="h-3 w-3/5 rounded bg-app-card-hover" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-app-card-hover" />
        <div className="h-3 w-4/5 rounded bg-app-card-hover" />
      </div>
    </div>
  );
});

interface SkeletonListProps {
  count?: number;
  className?: string;
}

export const SkeletonList = memo(function SkeletonList({ count = 3, className }: SkeletonListProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.2 }}
        >
          <SkeletonCard />
        </motion.div>
      ))}
    </div>
  );
});

interface SkeletonTextProps {
  width?: string;
  className?: string;
}

export const SkeletonText = memo(function SkeletonText({ width = "w-full", className }: SkeletonTextProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("h-3.5 animate-pulse rounded bg-app-card-hover", width, className)}
    />
  );
});
