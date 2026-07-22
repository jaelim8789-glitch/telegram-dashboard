"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export function useDoubleTap({ onDoubleTap, delay = 250 }: { onDoubleTap: () => void; delay?: number }) {
  const [taps, setTaps] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const handle = useCallback(() => {
    setTaps(t => t + 1);
    if (taps === 1) { clearTimeout(timer.current); setTaps(0); onDoubleTap(); }
    else { timer.current = setTimeout(() => setTaps(0), delay); }
  }, [taps, delay, onDoubleTap]);

  return { onDoubleTab: handle };
}

export function DoubleTapRefresh({ children, onRefresh }: { children: React.ReactNode; onRefresh: () => void }) {
  const lastTap = useRef(0);
  const handleClick = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 300) { lastTap.current = 0; onRefresh(); }
    else lastTap.current = now;
  }, [onRefresh]);
  return <div onClick={handleClick}>{children}</div>;
}
