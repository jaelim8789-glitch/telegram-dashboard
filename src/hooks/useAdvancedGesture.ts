"use client";

import { useCallback, useRef, useState, useEffect } from "react";

type GestureType = "none" | "swipe_left" | "swipe_right" | "swipe_up" | "swipe_down" | "tap" | "double_tap" | "long_press";

export function useAdvancedGesture(options: { onGesture?: (g: GestureType) => void; threshold?: number } = {}) {
  const { threshold = 50 } = options;
  const [gesture, setGesture] = useState<GestureType>("none");
  const start = useRef({ x: 0, y: 0, t: 0 });
  const pressTimer = useRef<ReturnType<typeof setTimeout>>();
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout>>();

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
    pressTimer.current = setTimeout(() => { setGesture("long_press"); options.onGesture?.("long_press"); }, 500);
  }, [options]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    clearTimeout(pressTimer.current);
    const dx = e.changedTouches[0].clientX - start.current.x;
    const dy = e.changedTouches[0].clientY - start.current.y;
    const elapsed = Date.now() - start.current.t;

    if (elapsed > 400) return;
    if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy)) {
      const g: GestureType = dx > 0 ? "swipe_right" : "swipe_left";
      setGesture(g); options.onGesture?.(g);
    } else if (Math.abs(dy) > threshold && Math.abs(dy) > Math.abs(dx)) {
      const g: GestureType = dy > 0 ? "swipe_down" : "swipe_up";
      setGesture(g); options.onGesture?.(g);
    } else {
      tapCount.current++;
      if (tapCount.current === 2) { clearTimeout(tapTimer.current); tapCount.current = 0; setGesture("double_tap"); options.onGesture?.("double_tap"); }
      else { tapTimer.current = setTimeout(() => { tapCount.current = 0; setGesture("tap"); options.onGesture?.("tap"); }, 250); }
    }
  }, [threshold, options]);

  useEffect(() => () => { clearTimeout(pressTimer.current); clearTimeout(tapTimer.current); }, []);

  return { gesture, onTouchStart, onTouchEnd };
}
