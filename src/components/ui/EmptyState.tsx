"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string | ReactNode;
  /** Optional primary action button (object format for new usage). */
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  /** Optional secondary action. */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Legacy: pass a React element directly as children (e.g. <Button>). */
  children?: ReactNode;
  className?: string;
  /** Compact variant for inline use (e.g. inside a panel). */
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  children,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 gap-3" : "py-16 gap-4",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-app-card-hover text-app-text-subtle",
          compact ? "h-10 w-10" : "h-14 w-14"
        )}
      >
        <Icon className={compact ? "h-5 w-5" : "h-7 w-7"} />
      </div>
      <div className="max-w-xs">
        <p className={cn("font-semibold text-app-text", compact ? "text-sm" : "text-base")}>
          {title}
        </p>
        {description && (
          typeof description === "string" ? (
            <p className={cn("mt-1 text-app-text-muted", compact ? "text-xs" : "text-sm")}>
              {description}
            </p>
          ) : (
            <div className="mt-1">{description}</div>
          )
        )}
      </div>
      {/* New object-based action */}
      {(action || secondaryAction) && !children && (
        <div className="flex items-center gap-2 mt-1">
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="btn-primary inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold"
            >
              {action.icon && <action.icon className="h-3.5 w-3.5" />}
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="btn-secondary inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
      {/* Legacy children-based action */}
      {children && (
        <div className="mt-1">{children}</div>
      )}
    </motion.div>
  );
}