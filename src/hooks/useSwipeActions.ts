"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { type LucideIcon, Trash2, RotateCcw, Copy } from "lucide-react";
import { SwipeableRow } from "@/components/ui/SwipeableRow";

export function useSwipeActions() {
  const createActions = useCallback((callbacks: { onDelete?: () => void; onRetry?: () => void; onCopy?: () => void }) => {
    return [
      ...(callbacks.onCopy ? [{ icon: Copy as LucideIcon, label: "복사", color: "#3b82f6", onAction: callbacks.onCopy }] : []),
      ...(callbacks.onRetry ? [{ icon: RotateCcw as LucideIcon, label: "재시도", color: "#f59e0b", onAction: callbacks.onRetry }] : []),
      ...(callbacks.onDelete ? [{ icon: Trash2 as LucideIcon, label: "삭제", color: "#ef4444", onAction: callbacks.onDelete }] : []),
    ];
  }, []);

  return { createActions, SwipeableRow };
}
