import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  accent: "indigo" | "emerald" | "rose" | "amber" | "cyan" | "violet" | "orange";
  children?: ReactNode;
}

const ACCENT_GRADIENT: Record<string, string> = {
  indigo: "from-indigo-500/20 via-indigo-500/10 to-transparent",
  emerald: "from-emerald-500/20 via-emerald-500/10 to-transparent",
  rose: "from-rose-500/20 via-rose-500/10 to-transparent",
  amber: "from-amber-500/20 via-amber-500/10 to-transparent",
  cyan: "from-cyan-500/20 via-cyan-500/10 to-transparent",
  violet: "from-violet-500/20 via-violet-500/10 to-transparent",
  orange: "from-orange-500/20 via-orange-500/10 to-transparent",
};

const ICON_BG: Record<string, string> = {
  indigo: "bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-indigo-500/25",
  emerald: "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/25",
  rose: "bg-gradient-to-br from-rose-500 to-pink-500 shadow-rose-500/25",
  amber: "bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/25",
  cyan: "bg-gradient-to-br from-cyan-500 to-blue-500 shadow-cyan-500/25",
  violet: "bg-gradient-to-br from-violet-500 to-purple-500 shadow-violet-500/25",
  orange: "bg-gradient-to-br from-orange-500 to-red-500 shadow-orange-500/25",
};

export function StatCard({ icon, label, value, sub, trend, accent, children }: StatCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-app-border bg-app-card p-4",
        "transition-all duration-200 hover:border-app-border-strong hover:shadow-lg hover:-translate-y-0.5",
        "before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-br before:opacity-0 before:transition-opacity before:duration-200 hover:before:opacity-100",
        ACCENT_GRADIENT[accent]
      )}
    >
      <div className="relative z-10 flex items-start justify-between">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md", ICON_BG[accent])}>
          {icon}
        </div>
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
              trend === "up" && "bg-emerald-500/10 text-emerald-500",
              trend === "down" && "bg-rose-500/10 text-rose-500",
              trend === "neutral" && "bg-app-card-hover text-app-text-muted"
            )}
          >
            {trend === "up" && "↑"}
            {trend === "down" && "↓"}
            {trend}
          </span>
        )}
      </div>
      <div className="relative z-10 mt-3">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tracking-tight text-app-text">{value}</span>
          {sub && <span className="text-xs font-medium text-app-text-muted">{sub}</span>}
        </div>
        <div className="mt-0.5 text-xs text-app-text-muted">{label}</div>
      </div>
      {children && <div className="relative z-10 mt-3">{children}</div>}
    </div>
  );
}
