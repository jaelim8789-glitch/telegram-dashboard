"use client";

import { useCallback, useRef } from "react";

export function useThrottledClick() {
  const lastRef = useRef(0);

  return useCallback((fn: () => void, cooldownMs = 500) => {
    const now = Date.now();
    if (now - lastRef.current < cooldownMs) return;
    lastRef.current = now;
    fn();
  }, []);
}
