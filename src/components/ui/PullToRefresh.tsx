"use client";

import { useRef, useCallback, useEffect, useState, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  onRefresh: () => Promise<void> | void;
  disabled?: boolean;
}

export function PullToRefresh({ children, onRefresh, disabled }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pullDist = useRef(0);
  const [indicatorHeight, setIndicatorHeight] = useState(0);

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (disabled) return;
    if (containerRef.current && containerRef.current.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    pullDist.current = 0;
  }, [disabled]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || refreshing) return;
    if (containerRef.current && containerRef.current.scrollTop > 0) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) {
      pullDist.current = Math.min(dy * 0.4, 80);
      setPulling(true);
      setIndicatorHeight(pullDist.current);
    }
  }, [disabled, refreshing]);

  const onTouchEnd = useCallback(async () => {
    if (disabled || refreshing) return;
    setPulling(false);
    setIndicatorHeight(0);
    if (pullDist.current >= 60) {
      setRefreshing(true);
      try { await onRefresh(); } finally { setRefreshing(false); }
    }
  }, [disabled, refreshing, onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd]);

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      <div
        className="flex items-center justify-center transition-all overflow-hidden"
        style={{ height: refreshing ? 32 : indicatorHeight, opacity: refreshing || pulling ? 1 : 0 }}
      >
        <div
          className="h-5 w-5 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--tg-theme-button-color, #5288c1)", borderTopColor: "transparent" }}
        />
      </div>
      {children}
    </div>
  );
}
