"use client";

/**
 * Haptic vibration patterns for different events
 */
export function vibrate(pattern: "success" | "error" | "warning" | "notification") {
  if (!("vibrate" in navigator)) return;
  const patterns: Record<string, number[]> = {
    success: [50],
    error: [100, 50, 100, 50, 100],
    warning: [100, 50, 100],
    notification: [50, 30, 50],
  };
  navigator.vibrate(patterns[pattern] || [50]);
}
