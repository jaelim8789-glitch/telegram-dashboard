"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { hapticFeedback } from "@tma.js/sdk-react";

export function useSwipeNav() {
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  const startX = useRef(0);
  const startY = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => { startX.current = e.touches[0].clientX; startY.current = e.touches[0].clientY; }, []);
  const onTouchEnd = useCallback((e: React.TouchEvent, onSwipeLeft?: () => void, onSwipeRight?: () => void) => {
    const dx = e.changedTouches[0].clientX - startX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - startY.current);
    if (Math.abs(dx) > 60 && dy < Math.abs(dx)) {
      if (dx > 0) { setDirection("right"); onSwipeRight?.(); try { hapticFeedback.impactOccurred("light"); } catch (e) { console.warn('Unhandled error in useSwipeNav', e) } }
      else { setDirection("left"); onSwipeLeft?.(); try { hapticFeedback.impactOccurred("light"); } catch (e) { console.warn('Unhandled error in useSwipeNav', e) } }
    }
  }, []);

  return { direction, onTouchStart, onTouchEnd, clearDirection: () => setDirection(null) };
}
