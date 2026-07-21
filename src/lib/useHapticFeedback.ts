"use client";

import { useCallback } from "react";

function isHapticEnabled(): boolean {
  if (typeof localStorage === "undefined") return true;
  return localStorage.getItem("telemon-haptic-enabled") !== "false";
}

export function setHapticEnabled(enabled: boolean) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem("telemon-haptic-enabled", String(enabled));
}

export function useHapticFeedback() {
  const vibrate = useCallback((pattern: number | number[] = 10) => {
    if (!isHapticEnabled()) return;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  const isSupported = typeof navigator !== "undefined" && "vibrate" in navigator;

  return {
    light: useCallback(() => vibrate(5), [vibrate]),
    medium: useCallback(() => vibrate([10, 30, 10]), [vibrate]),
    heavy: useCallback(() => vibrate([20, 50, 30, 50, 20]), [vibrate]),
    selection: useCallback(() => vibrate(5), [vibrate]),
    success: useCallback(() => vibrate([10, 30, 15]), [vibrate]),
    error: useCallback(() => vibrate([30, 50, 30]), [vibrate]),
    /** Sharp impact feedback for swipe threshold, drag snap, etc. */
    impact: useCallback(() => vibrate(15), [vibrate]),
    /** Three rapid pulses for important notifications */
    notification: useCallback(() => vibrate([10, 50, 10, 50, 10]), [vibrate]),
    /** Very subtle tick for passive feedback */
    tick: useCallback(() => vibrate(3), [vibrate]),
    /** Double pulse for confirmation of multi-step actions */
    confirm: useCallback(() => vibrate([10, 40, 10]), [vibrate]),
    /** Declining buzz for rejection/cancel */
    reject: useCallback(() => vibrate([15, 40, 20]), [vibrate]),
    isSupported,
  };
}
