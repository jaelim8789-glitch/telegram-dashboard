"use client";

import { useEffect, useRef, useState, memo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/cn";

// ─── KPI Card Definition ─────────────────────────────────────────

interface KPICard {
  key: string;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  progress: number; // 0–100
  trend: "up" | "down" | "neutral";
  formatter?: (v: number) => string;
}

interface DashboardGridProps {
  cards?: KPICard[];
  className?: string;
}

const DEFAULT_CARDS: KPICard[] = [
  { key: "revenue", label: "Revenue", value: 48250, prefix: "$", progress: 78, trend: "up" },
  { key: "users", label: "Users", value: 1284, progress: 62, trend: "up" },
  { key: "messages", label: "Messages", value: 87321, progress: 91, trend: "up" },
  { key: "response_rate", label: "Response Rate", value: 94.2, suffix: "%", progress: 94, trend: "up" },
];

// ─── Animated Number ─────────────────────────────────────────────

function AnimatedNumber({ value, prefix, suffix, formatter }: {
  value: number; prefix?: string; suffix?: string; formatter?: (v: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 1200;
    const from = 0;
    const to = value;

    let raf: number;
    function tick(now: number) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const formatted = formatter ? formatter(display) : display.toLocaleString(undefined, {
    maximumFractionDigits: display % 1 === 0 ? 0 : 1,
  });

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}{formatted}{suffix}
    </span>
  );
}

// ─── KPI Card Component ──────────────────────────────────────────

function KPICard({ card, index }: { card: KPICard; index: number }) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-accent-border/30",
        "bg-glass-bg backdrop-blur-xl",
        "transition-all duration-500 ease-out",
        "hover:scale-[1.02] hover:border-accent-border/60",
        "hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.25)]",
      )}
      style={{ animationDelay: ${index * 80}ms }}
    >
      <div className="relative z-10 p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium tracking-wide text-app-text-muted uppercase">
            {card.label}
          </span>
          <div className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full transition-transform group-hover:scale-110",
            card.trend === "up" ? "text-accent" : "text-app-danger",
          )}>
            {card.trend === "up" ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : card.trend === "down" ? (
              <TrendingDown className="h-3.5 w-3.5" />
            ) : null}
          </div>
        </div>

        {/* Value */}
        <div className="mt-2 text-2xl font-bold tracking-tight text-app-text">
          <AnimatedNumber
            value={card.value}
            prefix={card.prefix}
            suffix={card.suffix}
            formatter={card.formatter}
          />
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] text-app-text-subtle mb-1">
            <span>Progress</span>
            <span className="tabular-nums">{Math.round(card.progress)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-app-card-hover">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-accent-secondary transition-all duration-1000 ease-out"
              style={{ width: ${card.progress}% }}
            />
          </div>
        </div>
      </div>

      {/* Glow effect on hover */}
      <div className="pointer-events-none absolute -inset-1 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/5 via-transparent to-accent-secondary/5 blur-xl" />
      </div>
    </div>
  );
}

// ─── Grid Component ──────────────────────────────────────────────

export const DashboardGrid = memo(function DashboardGrid({ cards = DEFAULT_CARDS, className }: DashboardGridProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4", className)}>
      {cards.map((card, i) => (
        <KPICard key={card.key} card={card} index={i} />
      ))}
    </div>
  );
});

export type { KPICard, DashboardGridProps };
