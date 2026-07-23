"use client";

import { memo } from "react";
import { Send, RefreshCw, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/cn";

// ─── Types ────────────────────────────────────────────────────────

interface QuickAction {
  key: string;
  label: string;
  icon: typeof Send;
  shortcut?: string;
  onClick?: () => void;
}

interface QuickActionsProps {
  actions?: QuickAction[];
  className?: string;
  onAction?: (key: string) => void;
}

// ─── Default actions ─────────────────────────────────────────────

const DEFAULT_ACTIONS: QuickAction[] = [
  { key: "send", label: "New Broadcast", icon: Send, shortcut: "⌘N" },
  { key: "sync", label: "Sync Accounts", icon: RefreshCw, shortcut: "⌘R" },
  { key: "analytics", label: "Analytics", icon: BarChart3, shortcut: "⌘A" },
  { key: "settings", label: "Settings", icon: Settings, shortcut: "⌘," },
];

// ─── Action Button ───────────────────────────────────────────────

function ActionButton({ action, index, onAction }: {
  action: QuickAction; index: number; onAction?: (key: string) => void;
}) {
  const Icon = action.icon;

  return (
    <button
      onClick={() => onAction?.(action.key)}
      className={cn(
        "group relative flex flex-col items-center justify-center gap-1.5",
        "rounded-xl border border-accent-border/20 bg-glass-bg backdrop-blur-xl",
        "px-3 py-3 transition-all duration-300",
        "hover:border-accent-border/50 hover:bg-accent/5",
        "hover:shadow-[0_0_20px_-6px_rgba(139,92,246,0.25)]",
        "hover:scale-[1.03]",
        "active:scale-[0.98]",
      )}
    >
      {/* Icon container */}
      <div className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg",
        "bg-accent/10 transition-all duration-300",
        "group-hover:bg-accent/20 group-hover:shadow-[0_0_16px_rgba(139,92,246,0.15)]",
      )}>
        <Icon className="h-4 w-4 text-accent transition-transform duration-300 group-hover:scale-110" />
      </div>

      {/* Label */}
      <span className="text-[10px] font-medium text-app-text-muted transition-colors duration-300 group-hover:text-app-text">
        {action.label}
      </span>

      {/* Shortcut badge */}
      {action.shortcut && (
        <span className="text-[8px] text-app-text-subtle tracking-wider opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          {action.shortcut}
        </span>
      )}
    </button>
  );
}

// ─── Quick Actions Row ───────────────────────────────────────────

export const QuickActions = memo(function QuickActions({
  actions = DEFAULT_ACTIONS,
  className,
  onAction,
}: QuickActionsProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-4 gap-2",
        className,
      )}
    >
      {actions.map((action, i) => (
        <ActionButton
          key={action.key}
          action={action}
          index={i}
          onAction={onAction}
        />
      ))}
    </div>
  );
});

export type { QuickAction, QuickActionsProps };
