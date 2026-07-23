"use client";

import { useCallback, useRef, useEffect } from "react";

export function useSwipeToDismissKeyboard() {
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const ref = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => { touchStartY.current = e.touches[0].clientY; touchStartX.current = e.touches[0].clientX; }, []);
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    const dx = Math.abs(e.changedTouches[0].clientX - touchStartX.current);
    if (dy > 40 && dx < 30 && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => { el.removeEventListener("touchstart", handleTouchStart); el.removeEventListener("touchend", handleTouchEnd); };
  }, [handleTouchStart, handleTouchEnd]);

  return { ref };
}
