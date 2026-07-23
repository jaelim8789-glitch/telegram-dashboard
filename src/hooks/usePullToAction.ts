"use client";

import { useState, useCallback, useRef } from "react";

export function usePullToAction(threshold = 80) {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const startY = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => startY.current = e.touches[0].clientY, []);
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) { setProgress(Math.min(dy / threshold, 1)); setReady(dy >= threshold); }
  }, [threshold]);
  const onTouchEnd = useCallback(() => { setProgress(0); setReady(false); }, []);

  return { progress, ready, onTouchStart, onTouchMove, onTouchEnd, pullDistance: progress * threshold };
}
