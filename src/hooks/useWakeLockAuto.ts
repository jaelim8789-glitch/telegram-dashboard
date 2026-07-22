"use client";

import { useCallback, useEffect, useState } from "react";

export function useWakeLockAuto() {
  const [held, setHeld] = useState(false);
  const wakeRef = useRef<any>(null);

  const request = useCallback(async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeRef.current = await (navigator as any).wakeLock.request("screen");
        setHeld(true);
        wakeRef.current.addEventListener("release", () => setHeld(false));
      }
    } catch {}
  }, []);

  const release = useCallback(async () => {
    try { await wakeRef.current?.release(); setHeld(false); } catch {}
  }, []);

  useEffect(() => () => { release(); }, [release]);

  return { held, request, release };
}
