"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface StatItem {
  icon: ReactNode;
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  color: "indigo" | "emerald" | "rose" | "amber" | "cyan" | "violet" | "orange";
  onClick?: () => void;
}

interface MiniStatGridProps { items: StatItem[]; className?: string; }

export function MiniStatGrid({ items, className }: MiniStatGridProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3", className)}>
      {items.map((item, i) => (
        <button key={i} onClick={item.onClick}
          className={cn("flex flex-col items-center justify-center gap-1 rounded-xl border border-app-border bg-app-card p-3 text-center transition-colors hover:border-app-border-strong active:scale-[0.97]", item.onClick ? "cursor-pointer" : "cursor-default")}>
          <div className={cn("text-lg", { "text-indigo-500": item.color === "indigo", "text-emerald-500": item.color === "emerald", "text-rose-500": item.color === "rose", "text-amber-500": item.color === "amber", "text-cyan-500": item.color === "cyan", "text-violet-500": item.color === "violet", "text-orange-500": item.color === "orange" })}>{item.icon}</div>
          <span className="text-base font-bold tracking-tight text-app-text">{item.value}</span>
          <span className="flex items-center gap-1 text-[11px] text-app-text-muted">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
