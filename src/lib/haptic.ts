export function hapticFeedback(pattern: "light" | "medium" | "heavy" | "success" | "error" = "medium") {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  const patterns: Record<string, number[]> = {
    light: [10],
    medium: [20],
    heavy: [40],
    success: [20, 50, 20],
    error: [40, 30, 40],
  };
  navigator.vibrate(patterns[pattern] ?? patterns.medium);
}
