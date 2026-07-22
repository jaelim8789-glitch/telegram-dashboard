"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

interface CompactCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  color?: string;
  compact?: boolean;
  onClick?: () => void;
}

export function CompactCard({ icon, label, value, trend, color, compact, onClick }: CompactCardProps) {
  const [showLabel, setShowLabel] = useState(false);
  const Comp = onClick ? "button" : "div";

  function handleClick() {
    if (compact) {
      setShowLabel(true);
      setTimeout(() => setShowLabel(false), 1500);
    }
    onClick?.();
  }

  return (
    <Comp
      {...(onClick ? { onClick: handleClick, type: "button" as const } : {})}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-app-border/60 bg-app-card p-3 text-left transition-all duration-200 hover:border-app-border-strong",
        onClick && "cursor-pointer"
      )}
    >
      {compact ? (
        <div className="flex flex-col items-center gap-1">
          <span className="text-lg" style={{ color: color ?? "var(--color-accent)" }}>
            {icon}
          </span>
          <span className="text-sm font-bold" style={{ fontFamily: "var(--font-heading)" }}>
            {value}
          </span>
          <AnimatedLabel visible={showLabel}>{label}</AnimatedLabel>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${color ?? "var(--color-accent)"}20`, color: color ?? "var(--color-accent)" }}>
              {icon}
            </span>
            <div>
              <div className="text-xs text-app-text-muted">{label}</div>
              <div className="text-base font-bold" style={{ fontFamily: "var(--font-heading)" }}>{value}</div>
            </div>
          </div>
          {trend && (
            <span
              className={cn(
                "text-xs font-medium",
                trend === "up" && "text-emerald-500",
                trend === "down" && "text-rose-500",
                trend === "neutral" && "text-app-text-muted"
              )}
            >
              {trend === "up" && "↑"}
              {trend === "down" && "↓"}
              {trend}
            </span>
          )}
        </div>
      )}
    </Comp>
  );
}

function AnimatedLabel({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  return (
    <motion.span
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : -4 }}
      transition={{ duration: 0.2 }}
      className="text-[10px] text-app-text-muted"
    >
      {children}
    </motion.span>
  );
}
