"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

interface ProgressBarProps {
  /** Progress value between 0 and 100. */
  value: number;
  /** Max value (defaults to 100). */
  max?: number;
  /** Size variant. */
  size?: "sm" | "md" | "lg";
  /** Color variant. */
  variant?: "accent" | "success" | "warning" | "danger" | "info";
  /** Whether to show the percentage label. */
  showLabel?: boolean;
  /** Optional label text shown next to the bar. */
  label?: string;
  /** Animate progress changes. Defaults to true. */
  animated?: boolean;
  /** Determinate (default) or indeterminate (shows a looping animation). */
  indeterminate?: boolean;
  className?: string;
}

const SIZE_STYLES: Record<string, string> = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

const VARIANT_STYLES: Record<string, string> = {
  accent: "bg-app-primary",
  success: "bg-app-success",
  warning: "bg-app-warning",
  danger: "bg-app-danger",
  info: "bg-app-info",
};

const TRACK_STYLES: Record<string, string> = {
  accent: "bg-app-primary-muted/30",
  success: "bg-app-success-muted/30",
  warning: "bg-app-warning-muted/30",
  danger: "bg-app-danger-muted/30",
  info: "bg-app-info-muted/30",
};

export function ProgressBar({
  value,
  max = 100,
  size = "md",
  variant = "accent",
  showLabel = false,
  label,
  animated = true,
  indeterminate = false,
  className,
}: ProgressBarProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const rafRef = useRef<number>(0);
  const fromRef = useRef(0);
  const startRef = useRef<number | null>(null);

  const clampedValue = Math.min(max, Math.max(0, value));
  const pct = max > 0 ? (clampedValue / max) * 100 : 0;

  useEffect(() => {
    if (!animated || indeterminate) {
      setDisplayValue(pct);
      return;
    }

    fromRef.current = displayValue;
    startRef.current = null;
    const duration = 600;

    function tick(now: number) {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = fromRef.current + (pct - fromRef.current) * eased;
      setDisplayValue(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct, animated, indeterminate]);

  return (
    <div className={cn("w-full", className)}>
      {(showLabel || label) && (
        <div className="mb-1.5 flex items-center justify-between">
          {label && <span className="text-xs font-medium text-app-text-muted">{label}</span>}
          {showLabel && (
            <span className="text-xs font-semibold tabular-nums text-app-text-muted">
              {indeterminate ? "..." : `${Math.round(displayValue)}%`}
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : clampedValue}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuetext={indeterminate ? "indeterminate" : `${Math.round(pct)}%`}
        className={cn(
          "w-full overflow-hidden rounded-full",
          SIZE_STYLES[size],
          TRACK_STYLES[variant]
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300 ease-out",
            VARIANT_STYLES[variant],
            indeterminate && "animate-progress-indeterminate w-1/3"
          )}
          style={{ width: indeterminate ? undefined : `${displayValue}%` }}
        />
      </div>
    </div>
  );
}
