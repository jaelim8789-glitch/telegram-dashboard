"use client";

import { useEffect, useRef } from "react";
import { RuntimeManager } from "@/lib/runtimeManager";

/**
 * 부트스트랩 컴포넌트 — 앱 시작 시 RuntimeManager를 초기화합니다.
 *
 * 최상위 layout.tsx에 배치하여 앱이 마운트될 때
 * 모든 계정 Runtime의 캐시를 Prefetch합니다.
 */
export function RuntimeInitializer() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const manager = RuntimeManager.getInstance();
    manager.initialize().catch((err) => {
      console.error("[RuntimeInitializer] RuntimeManager init failed:", err);
    });

    // Cleanup on unmount
    return () => {
      manager.destroy();
      initialized.current = false;
    };
  }, []);

  return null; // This component renders nothing
}
