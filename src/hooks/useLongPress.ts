"use client";

import { useRef, useCallback, useState } from "react";

interface LongPressOptions {
  delay?: number; // ms
  onLongPress: () => void;
  onTap?: () => void;
  disabled?: boolean;
}

export function useLongPress({ delay = 500, onLongPress, onTap, disabled = false }: LongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pressing, setPressing] = useState(false);
  const isLongRef = useRef(false);
  const posRef = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return;
    posRef.current = { x: e.clientX, y: e.clientY };
    isLongRef.current = false;
    setPressing(true);
    timerRef.current = setTimeout(() => {
      isLongRef.current = true;
      onLongPress();
      setPressing(false);
    }, delay);
  }, [disabled, delay, onLongPress]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPressing(false);
    if (!isLongRef.current && onTap) {
      onTap();
    }
  }, [onTap]);

  const onPointerLeave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPressing(false);
  }, []);

  return {
    onPointerDown,
    onPointerUp,
    onPointerLeave,
    pressing,
    position: posRef,
  };
}
