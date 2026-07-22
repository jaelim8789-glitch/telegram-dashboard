"use client";

import { useState, useCallback, useEffect } from "react";

export function useInactivityLock(timeoutMs = 300000) {
  const [locked, setLocked] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const reset = useCallback(() => {
    setLocked(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setLocked(true), timeoutMs);
  }, [timeoutMs]);

  useEffect(() => {
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    reset();
    events.forEach(e => window.addEventListener(e, reset));
    return () => { events.forEach(e => window.removeEventListener(e, reset)); clearTimeout(timer.current); };
  }, [reset]);

  return { locked, reset };
}
