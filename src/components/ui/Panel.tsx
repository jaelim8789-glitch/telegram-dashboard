import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PanelProps {
  title?: ReactNode;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Gradient accent bar at top. Leave empty for no accent. */
  accent?: "indigo" | "emerald" | "amber" | "rose" | "cyan" | "violet";
  /** Compact internal padding */
  compact?: boolean;
}

const ACCENT_BAR: Record<string, string> = {
  indigo: "bg-gradient-to-r from-indigo-500 to-purple-500",
  emerald: "bg-gradient-to-r from-emerald-500 to-teal-500",
  amber: "bg-gradient-to-r from-amber-500 to-orange-500",
  rose: "bg-gradient-to-r from-rose-500 to-pink-500",
  cyan: "bg-gradient-to-r from-cyan-500 to-blue-500",
  violet: "bg-gradient-to-r from-violet-500 to-indigo-500",
};

export function Panel({ title, description, action, children, className, accent, compact }: PanelProps) {
  return (
    <section
      className={cn(
        "relative rounded-2xl border border-app-border bg-app-card shadow-sm transition-shadow duration-200 hover:shadow-md",
        className
      )}
    >
      {accent && (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-2xl",
            ACCENT_BAR[accent]
          )}
        />
      )}
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 border-b border-app-border px-4 py-3.5">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-semibold text-app-text">{title}</h3>}
            {description && <p className="mt-0.5 text-xs text-app-text-muted">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={cn(compact ? "p-3" : "p-4")}>{children}</div>
    </section>
  );
}
