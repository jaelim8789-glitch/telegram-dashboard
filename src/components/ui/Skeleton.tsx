"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

interface SkeletonProps {
  className?: string;
  variant?: "default" | "gold-shimmer" | "accent-shimmer";
  width?: string | number;
  height?: string | number;
}

export const Skeleton = memo(function Skeleton({ className, variant = "default", width, height }: SkeletonProps) {
  const style: React.CSSProperties = {};
  if (width != null) style.width = typeof width === "number" ? `${width}px` : width;
  if (height != null) style.height = typeof height === "number" ? `${height}px` : height;

  if (variant === "gold-shimmer" || variant === "accent-shimmer") {
    return (
      <div
        aria-hidden="true"
        className={cn("rounded-lg", className)}
        style={{
          ...style,
          background: `linear-gradient(90deg, var(--color-card) 0%, var(--color-accent-light) 25%, var(--color-card) 50%)`,
          backgroundSize: "200% 100%",
          animation: "accent-shimmer 3s ease-in-out infinite",
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

const cardVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export const SkeletonCard = memo(function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("rounded-xl border border-app-border/40 bg-app-card p-4", className)}
    >
      <div className="animate-pulse space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-app-card-hover" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-2/5 rounded bg-app-card-hover" />
            <div className="h-2.5 w-3/5 rounded bg-app-card-hover" />
          </div>
        </div>
        <div className="h-3 w-full rounded bg-app-card-hover" />
        <div className="h-3 w-4/5 rounded bg-app-card-hover" />
      </div>
    </div>
  );
});

interface SkeletonListProps {
  count?: number;
  className?: string;
  staggered?: boolean;
}

export const SkeletonList = memo(function SkeletonList({ count = 3, className, staggered = true }: SkeletonListProps) {
  return (
    <div className={cn("space-y-3", className)} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) =>
        staggered ? (
          <motion.div
            key={i}
            initial="initial"
            animate="animate"
            variants={cardVariants}
            transition={{ delay: i * 0.08, duration: 0.25 }}
          >
            <SkeletonCard />
          </motion.div>
        ) : (
          <SkeletonCard key={i} />
        ),
      )}
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
      className={cn("animate-pulse rounded bg-app-card-hover", width, className)}
      style={{ height: "0.85em" }}
    />
  );
});

export const SkeletonDashboard = memo(function SkeletonDashboard({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("space-y-4", className)}>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton-shimmer rounded-2xl p-4 space-y-2">
            <div className="h-3 w-12 rounded bg-current opacity-20" />
            <div className="h-6 w-16 rounded bg-current opacity-20" />
          </div>
        ))}
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="skeleton-shimmer rounded-2xl p-4 space-y-3">
          <div className="h-3 w-24 rounded bg-current opacity-20" />
          <div className="h-3 w-full rounded bg-current opacity-20" />
          <div className="h-3 w-3/4 rounded bg-current opacity-20" />
        </div>
      ))}
    </div>
  );
});

export const SkeletonSend = memo(function SkeletonSend({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("space-y-4 p-4", className)}>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton-shimmer h-7 w-16 rounded-full" />
        ))}
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton-shimmer h-7 w-20 rounded-full" />
        ))}
      </div>
      <div className="skeleton-shimmer h-32 w-full rounded-2xl" />
      <div className="skeleton-shimmer h-11 w-full rounded-xl" />
    </div>
  );
});

export const SkeletonChat = memo(function SkeletonChat({ className }: { className?: string }) {
  const rightBubbles = Array.from({ length: 2 });
  const leftBubbles = Array.from({ length: 3 });
  return (
    <div aria-hidden="true" className={cn("space-y-3 p-4", className)}>
      {rightBubbles.map((_, i) => (
        <div key={`r-${i}`} className="flex justify-end">
          <div className="skeleton-shimmer h-8 w-3/5 rounded-2xl rounded-br-sm" />
        </div>
      ))}
      {leftBubbles.map((_, i) => (
        <div key={`l-${i}`} className="flex justify-start">
          <div className="skeleton-shimmer h-8 w-2/4 rounded-2xl rounded-bl-sm" />
        </div>
      ))}
    </div>
  );
});
