import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-app-border px-6 py-10 text-center">
      <div aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-app-card-hover text-app-text-subtle">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-app-text">{title}</p>
      {description && <p className="max-w-xs text-xs text-app-text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
