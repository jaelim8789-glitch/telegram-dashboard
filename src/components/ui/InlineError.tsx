import type { ReactNode } from "react";
import { XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

interface InlineErrorProps {
  title?: string;
  children?: ReactNode;
  /** Optional retry/dismiss control rendered at the end of the row. */
  action?: ReactNode;
  className?: string;
}

/** Standard danger-toned error presentation for forms, panels, and data
 * loading failures. Formalizes the ad hoc "icon + danger box" pattern already
 * used ad hoc across several tabs so it renders identically everywhere. */
export function InlineError({ title, children, action, className }: InlineErrorProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-xl border border-app-danger/20 bg-app-danger-muted px-3 py-2.5 text-xs text-app-danger",
        className
      )}
    >
      <XCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <p className={cn(title && "mt-0.5", "text-app-danger/90")}>{children}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
