"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "telemon-dashboard-widget-order";

export const DEFAULT_WIDGET_ORDER = [
  "pixel-office",
  "stats-grid",
  "active-accounts",
  "recent-broadcasts",
  "weekly-summary",
] as const;

export type WidgetId = (typeof DEFAULT_WIDGET_ORDER)[number];

function loadOrder(): WidgetId[] {
  if (typeof window === "undefined") return [...DEFAULT_WIDGET_ORDER];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [...DEFAULT_WIDGET_ORDER];
    const parsed = JSON.parse(stored);
    if (
      Array.isArray(parsed) &&
      parsed.every((id: unknown) => DEFAULT_WIDGET_ORDER.includes(id as WidgetId))
    ) {
      return parsed as WidgetId[];
    }
    return [...DEFAULT_WIDGET_ORDER];
  } catch {
    return [...DEFAULT_WIDGET_ORDER];
  }
}

function saveOrder(order: WidgetId[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  } catch {
    /* noop */
  }
}

export function useWidgetOrder() {
  const [orderedWidgets, setOrderedWidgets] = useState<WidgetId[]>(loadOrder);

  useEffect(() => {
    saveOrder(orderedWidgets);
  }, [orderedWidgets]);

  const moveUp = useCallback((id: WidgetId) => {
    setOrderedWidgets((prev) => {
      const idx = prev.indexOf(id);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }, []);

  const moveDown = useCallback((id: WidgetId) => {
    setOrderedWidgets((prev) => {
      const idx = prev.indexOf(id);
      if (idx === -1 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }, []);

  const resetOrder = useCallback(() => {
    setOrderedWidgets([...DEFAULT_WIDGET_ORDER]);
  }, []);

  return [orderedWidgets, moveUp, moveDown, resetOrder] as const;
}

interface WidgetReorderItemProps {
  id: WidgetId;
  label: string;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export const WIDGET_LABELS: Record<WidgetId, string> = {
  "pixel-office": "PixelOffice",
  "stats-grid": "통계 그리드",
  "active-accounts": "활성 계정",
  "recent-broadcasts": "최근 발송",
  "weekly-summary": "주간 요약",
};

export function WidgetReorderItem({ id, label, index, total, onMoveUp, onMoveDown }: WidgetReorderItemProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-xl border border-app-border/40 bg-app-card px-4 py-3",
      )}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-app-card-hover text-[11px] font-bold text-app-text-muted">
          {index + 1}
        </span>
        <span className="text-sm font-medium text-app-text">{label}</span>
      </div>
      <div className="flex gap-1">
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg text-xs transition-colors",
            index === 0
              ? "text-app-text-muted/30 cursor-not-allowed"
              : "text-app-text-muted hover:bg-app-card-hover active:scale-90",
          )}
          aria-label={`${label} 위로 이동`}
        >
          ▲
        </button>
        <button
          onClick={onMoveDown}
          disabled={index === total - 1}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg text-xs transition-colors",
            index === total - 1
              ? "text-app-text-muted/30 cursor-not-allowed"
              : "text-app-text-muted hover:bg-app-card-hover active:scale-90",
          )}
          aria-label={`${label} 아래로 이동`}
        >
          ▼
        </button>
      </div>
    </div>
  );
}
