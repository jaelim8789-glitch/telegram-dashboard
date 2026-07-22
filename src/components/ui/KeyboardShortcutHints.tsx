"use client";

import { Command, Keyboard } from "lucide-react";
import { cn } from "@/lib/cn";

interface Shortcut {
  keys: string[];
  label: string;
}

const DEFAULT_SHORTCUTS: Shortcut[] = [
  { keys: ["⌘", "K"], label: "명령 팔레트" },
  { keys: ["?"], label: "단축키 도움말" },
  { keys: ["⌘", "1-9"], label: "탭 전환" },
  { keys: ["⌘", "⇧", "F"], label: "전체 화면" },
];

interface KeyboardShortcutHintsProps {
  /** Custom shortcuts to display. Falls back to defaults. */
  shortcuts?: Shortcut[];
  /** Compact inline display (for footer/status bar). */
  compact?: boolean;
  className?: string;
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-md border border-app-border bg-app-card px-1.5 text-[10px] font-mono font-medium text-app-text-muted shadow-sm">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutHints({
  shortcuts = DEFAULT_SHORTCUTS,
  compact = false,
  className,
}: KeyboardShortcutHintsProps) {
  if (compact) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <Keyboard className="h-3.5 w-3.5 text-app-text-subtle" />
        {shortcuts.slice(0, 2).map((s, i) => (
          <span key={s.label} className="flex items-center gap-1 text-xs text-app-text-muted">
            {s.keys.map((key, ki) => (
              <Kbd key={`${ki}-${key}`}>{key}</Kbd>
            ))}
            <span className="ml-0.5">{s.label}</span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-app-text-muted uppercase tracking-wider">
        <Command className="h-3.5 w-3.5" />
        단축키
      </p>
      <div className="space-y-1.5">
        {shortcuts.map((s, i) => (
          <div key={s.label} className="flex items-center justify-between">
            <span className="text-xs text-app-text-muted">{s.label}</span>
            <span className="flex items-center gap-1">
              {s.keys.map((key, ki) => (
                <Kbd key={`${ki}-${key}`}>{key}</Kbd>
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}