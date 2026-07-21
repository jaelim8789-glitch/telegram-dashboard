"use client";

import { useEffect, useRef } from "react";

/**
 * Keep screen awake during active broadcast — 발송 중 화면 꺼짐 방지
 */
export function useWakeLock(active = false) {
  const wakeRef = useRef<any>(null);

  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    navigator.wakeLock.request("screen").then((w) => { wakeRef.current = w; }).catch(() => {});
    return () => { wakeRef.current?.release?.().catch(() => {}); };
  }, [active]);
}
