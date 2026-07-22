"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Trash2, RotateCcw, Copy } from "lucide-react";
import { SwipeableRow } from "@/components/ui/SwipeableRow";

export function useSwipeActions() {
  const createActions = useCallback((callbacks: { onDelete?: () => void; onRetry?: () => void; onCopy?: () => void }) => {
    return [
      ...(callbacks.onCopy ? [{ icon: Copy as any, label: "복사", color: "#3b82f6", onAction: callbacks.onCopy }] : []),
      ...(callbacks.onRetry ? [{ icon: RotateCcw as any, label: "재시도", color: "#f59e0b", onAction: callbacks.onRetry }] : []),
      ...(callbacks.onDelete ? [{ icon: Trash2 as any, label: "삭제", color: "#ef4444", onAction: callbacks.onDelete }] : []),
    ];
  }, []);

  return { createActions, SwipeableRow };
}
