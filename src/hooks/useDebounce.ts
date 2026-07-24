"use client";

import { useEffect, useRef, useCallback } from "react";

export function useDebounce<T extends (...args: unknown[]) => void>(fn: T, delayMs: number): T {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debounced = useCallback(
    (...args: unknown[]) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fn(...args), delayMs);
    },
    [fn, delayMs]
  ) as unknown as T;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return debounced;
}
