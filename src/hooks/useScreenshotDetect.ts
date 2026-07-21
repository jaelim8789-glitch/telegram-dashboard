"use client";

import { useEffect } from "react";

/**
 * Screenshot detection — API 키 페이지에서 스크린샷 시 경고
 */
export function useScreenshotDetect(enabled = false) {
  useEffect(() => {
    if (!enabled) return;

    function warn() {
      const toast = document.createElement("div");
      toast.className = "fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-xs rounded-xl bg-app-danger px-4 py-3 text-xs text-white shadow-lg animate-slide-up text-center";
      toast.textContent = "🔒 보안을 위해 API 키를 가려주세요";
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }

    // Visibility change 감지 (iOS screenshot shortcut)
    let lastVis = document.visibilityState;
    function onVisChange() {
      if (lastVis === "visible" && document.visibilityState === "hidden") {
        // Screenshot 가능성
      }
      lastVis = document.visibilityState;
    }
    document.addEventListener("visibilitychange", onVisChange);

    // Keyboard shortcut detection (Cmd+Shift+3, etc)
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "3" || e.key === "4" || e.key === "5")) {
        warn();
      }
    }
    window.addEventListener("keydown", onKeyDown);

    // Blur detection
    function onBlur() { setTimeout(warn, 500); }
    window.addEventListener("blur", onBlur);

    return () => {
      document.removeEventListener("visibilitychange", onVisChange);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onBlur);
    };
  }, [enabled]);
}
