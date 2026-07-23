"use client";

import { useCallback, useRef, useState } from "react";

export function useRateLimit(key: string, limit: number = 5, windowMs: number = 60000) {
  const hits = useRef<number[]>([]);
  const [blocked, setBlocked] = useState(false);

  const check = useCallback(() => {
    const now = Date.now();
    hits.current = hits.current.filter(t => now - t < windowMs);
    if (hits.current.length >= limit) { setBlocked(true); setTimeout(() => setBlocked(false), windowMs); return false; }
    hits.current.push(now);
    return true;
  }, [limit, windowMs]);

  return { check, blocked };
}
