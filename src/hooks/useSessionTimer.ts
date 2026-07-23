"use client";

import { useCallback, useRef, useState, useEffect } from "react";

export function useSessionTimer() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const start = useRef<number>(0);
  const interval = useRef<ReturnType<typeof setInterval>>();

  const begin = useCallback(() => { start.current = Date.now(); setRunning(true); interval.current = setInterval(() => setElapsed(Math.floor((Date.now() - start.current) / 1000)), 1000); }, []);
  const stop = useCallback(() => { setRunning(false); clearInterval(interval.current); }, []);
  const reset = useCallback(() => { stop(); setElapsed(0); }, [stop]);

  useEffect(() => () => clearInterval(interval.current), []);

  const format = useCallback((sec: number) => {
    const m = Math.floor(sec / 60); const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, []);

  return { elapsed, running, begin, stop, reset, format: format(elapsed) };
}
