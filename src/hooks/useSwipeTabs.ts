"use client";

import { useCallback, useRef, useState } from "react";

const SWIPE_THRESHOLD = 50;
const EDGE_MARGIN = 20;

interface UseSwipeTabsOptions {
  currentTabId: string;
  allTabIds: string[];
  onTabChange?: (tabId: string) => void;
  enabled?: boolean;
}

interface UseSwipeTabsReturn {
  handlers: { onPointerDown: (e: React.PointerEvent) => void; onPointerMove: (e: React.PointerEvent) => void; onPointerUp: (e: React.PointerEvent) => void };
  direction: 1 | -1;
  isSwiping: boolean;
  swipeProgress: number;
}

export function useSwipeTabs({ currentTabId, allTabIds, onTabChange, enabled = true }: UseSwipeTabsOptions): UseSwipeTabsReturn {
  const startX = useRef(0);
  const startY = useRef(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const locked = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!enabled) return;
    locked.current = false;
    startX.current = e.clientX;
    startY.current = e.clientY;
    setIsSwiping(false);
    setSwipeProgress(0);
  }, [enabled]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!enabled || locked.current) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (!isSwiping && Math.abs(dy) > Math.abs(dx)) { locked.current = true; return; }
    if (Math.abs(dx) > 5) {
      if (dx > 0 && startX.current < EDGE_MARGIN) { locked.current = true; return; }
      if (dx < 0 && window.innerWidth - startX.current < EDGE_MARGIN) { locked.current = true; return; }
      setIsSwiping(true);
      setSwipeProgress(Math.min(Math.abs(dx) / SWIPE_THRESHOLD, 1));
      setDirection(dx > 0 ? -1 : 1);
    }
  }, [enabled, isSwiping]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!enabled || locked.current || !isSwiping) return;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) >= SWIPE_THRESHOLD) {
      const currentIndex = allTabIds.indexOf(currentTabId);
      if (currentIndex === -1) return;
      const nextIndex = dx > 0 ? currentIndex - 1 : currentIndex + 1;
      if (nextIndex >= 0 && nextIndex < allTabIds.length) onTabChange?.(allTabIds[nextIndex]);
    }
    setIsSwiping(false);
    setSwipeProgress(0);
  }, [enabled, isSwiping, allTabIds, currentTabId, onTabChange]);

  return { handlers: { onPointerDown, onPointerMove, onPointerUp }, direction, isSwiping, swipeProgress };
}
