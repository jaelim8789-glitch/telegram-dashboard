"use client";

import { useRef, useCallback, useState } from "react";

export function useNetworkRetry(maxRetries = 3) {
  const [retrying, setRetrying] = useState(false);
  const countRef = useRef(0);

  const execute = useCallback(async <T>(fn: () => Promise<T>): Promise<T | null> => {
    countRef.current = 0;
    setRetrying(true);
    while (countRef.current < maxRetries) {
      try { const result = await fn(); setRetrying(false); return result; }
      catch { countRef.current++; if (countRef.current >= maxRetries) { setRetrying(false); return null; } await new Promise(r => setTimeout(r, 1000 * countRef.current)); }
    }
    setRetrying(false);
    return null;
  }, [maxRetries]);

  return { execute, retrying };
}
