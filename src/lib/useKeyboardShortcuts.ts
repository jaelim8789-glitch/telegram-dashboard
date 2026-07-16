"use client";

import { useEffect } from "react";
import type { TabId } from "@/types";

const TAB_INDEX_MAP: Record<string, TabId> = {
  "1": "dashboard",
  "2": "send",
  "3": "scheduler",
  "4": "log",
  "5": "deliveryanalytics",
  "6": "register",
  "7": "group",
  "8": "groupsearch",
  "9": "autoreply",
};

/**
 * Returns true if the user is focused on an editable input/textarea/select.
 */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

interface ShortcutHandlers {
  /** Called when Ctrl+Enter is pressed (only when not in an input that already handles it) */
  onSubmit?: () => void;
  /** Called when Escape is pressed (only when not in the command palette or modals) */
  onEscape?: () => void;
  /** Navigate to a tab by index (Alt+1..9) */
  onNavigate?: (tabId: TabId) => void;
}

/**
 * Global keyboard shortcuts hook.
 * Mount once in DashboardShell or use conditionally.
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    function handler(event: KeyboardEvent) {
      // Base shortcuts (Ctrl+K for command palette is handled by CommandPalette itself)

      // Ctrl+Enter → submit
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        // Let inputs with Ctrl+Enter be handled by their own handlers
        if (isTypingTarget(event.target)) {
          // Still allow submit — this is the main use case
          event.preventDefault();
          handlers.onSubmit?.();
          return;
        }
        event.preventDefault();
        handlers.onSubmit?.();
        return;
      }

      // Escape → close
      if (event.key === "Escape" && !isTypingTarget(event.target)) {
        handlers.onEscape?.();
        return;
      }

      // Alt+1..9 → navigate to tabs
      if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        const tabId = TAB_INDEX_MAP[event.key];
        if (tabId) {
          event.preventDefault();
          handlers.onNavigate?.(tabId);
          return;
        }
      }
    }

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handlers]);
}