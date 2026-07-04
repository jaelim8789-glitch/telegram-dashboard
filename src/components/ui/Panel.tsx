import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PanelProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Panel({ title, description, action, children, className }: PanelProps) {
  return (
    <section className={cn("rounded-2xl border border-app-border bg-app-card", className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 border-b border-app-border px-4 py-3.5">
          <div>
            {title && <h3 className="text-sm font-semibold text-app-text">{title}</h3>}
            {description && <p className="mt-0.5 text-xs text-app-text-muted">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}
