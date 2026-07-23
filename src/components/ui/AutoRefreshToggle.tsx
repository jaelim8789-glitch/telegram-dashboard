"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";

export function AutoRefreshToggle({ interval = 30, onRefresh }: { interval?: number; onRefresh: () => void }) {
  const [auto, setAuto] = useState(true);
  const [remaining, setRemaining] = useState(interval);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const countRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!auto) { clearInterval(timerRef.current); clearInterval(countRef.current); return; }
    setRemaining(interval);
    timerRef.current = setInterval(() => { onRefresh(); setRemaining(interval); }, interval * 1000);
    countRef.current = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000);
    return () => { clearInterval(timerRef.current); clearInterval(countRef.current); };
  }, [auto, interval, onRefresh]);

  return (
    <button onClick={() => setAuto(!auto)} className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium transition-colors" style={{ backgroundColor: auto ? "var(--tg-theme-button-color, #5288c1)" : "var(--tg-theme-section-bg-color, #232e3c)", color: auto ? "#fff" : "var(--tg-theme-hint-color, #708499)" }} aria-label={auto ? "자동 새로고침 켜짐" : "자동 새로고침 꺼짐"}>
      {auto ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
      {auto ? `${remaining}초` : "자동"}
    </button>
  );
}
