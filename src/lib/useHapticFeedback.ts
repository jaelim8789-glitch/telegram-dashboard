"use client";

import { useCallback } from "react";

export function useHapticFeedback() {
  const vibrate = useCallback((pattern: number | number[] = 10) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  return {
    light: useCallback(() => vibrate(5), [vibrate]),
    medium: useCallback(() => vibrate([10, 30, 10]), [vibrate]),
    heavy: useCallback(() => vibrate([20, 50, 30, 50, 20]), [vibrate]),
    selection: useCallback(() => vibrate(5), [vibrate]),
    success: useCallback(() => vibrate([10, 30, 15]), [vibrate]),
    error: useCallback(() => vibrate([30, 50, 30]), [vibrate]),
  };
}
