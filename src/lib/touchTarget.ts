export const TOUCH_MIN_SIZE = 44;

export const touchStyles = {
  button: `min-h-[${TOUCH_MIN_SIZE}px] min-w-[${TOUCH_MIN_SIZE}px]`,
  iconButton: `flex min-h-[${TOUCH_MIN_SIZE}px] min-w-[${TOUCH_MIN_SIZE}px] items-center justify-center`,
  activeScale: "active:scale-95",
} as const;

export function ensureTouchTarget(className = ""): string {
  const needsSize = !className.includes("min-h-") && !className.includes("h-");
  return needsSize ? `${className} min-h-[44px]` : className;
}
