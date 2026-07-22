"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useWakeLockAuto() {
  const [held, setHeld] = useState(false);
  const wakeRef = useRef<any>(null);

  const request = useCallback(async () => {
    try {
      if ("wakeLock" in navigator) {
        // @ts-ignore - Wake Lock API는 실험적인 기능
        wakeRef.current = await (navigator as any).wakeLock.request("screen");
        setHeld(true);
        console.log("Wake Lock이 활성화되었습니다.");
        
        wakeRef.current.addEventListener("release", () => {
          setHeld(false);
          console.log("Wake Lock이 해제되었습니다.");
        });
      }
    } catch (err) {
      console.error("Wake Lock 요청 실패:", err);
    }
  }, []);

  const release = useCallback(async () => {
    try {
      if (wakeRef.current) {
        await wakeRef.current.release();
        setHeld(false);
        console.log("Wake Lock이 해제되었습니다.");
      }
    } catch (err) {
      console.error("Wake Lock 해제 실패:", err);
    }
  }, []);

  useEffect(() => () => { release(); }, [release]);

  return { held, request, release };
}
