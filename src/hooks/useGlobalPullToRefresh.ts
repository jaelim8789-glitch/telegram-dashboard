"use client";

import { useCallback, useEffect, useState } from "react";

export function useGlobalPullToRefresh() {
  const [refreshing, setRefreshing] = useState(false);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const startY = useRef(0);

  const onTouchStart = useCallback((e: TouchEvent) => { startY.current = e.touches[0].clientY; }, []);
  const onTouchEnd = useCallback((e: TouchEvent) => {
    const dy = e.changedTouches[0].clientY - startY.current;
    if (dy > 80 && !refreshing) { setRefreshing(true); }
  }, [refreshing]);

  useEffect(() => {
    if (!target) return;
    target.addEventListener("touchstart", onTouchStart, { passive: true });
    target.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => { target.removeEventListener("touchstart", onTouchStart); target.removeEventListener("touchend", onTouchEnd); };
  }, [target, onTouchStart, onTouchEnd]);

  const done = useCallback(() => setRefreshing(false), []);

  return { setRef (el: HTMLElement | null) { setTarget(el); }, refreshing, done };
}
