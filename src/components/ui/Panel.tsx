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
    <section
      className={cn(
        "rounded-xl border border-neutral-800 bg-neutral-900/60",
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 border-b border-neutral-800 px-4 py-3">
          <div>
            {title && <h3 className="text-sm font-semibold text-neutral-100">{title}</h3>}
            {description && (
              <p className="mt-0.5 text-xs text-neutral-500">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}
