"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export function useLongPress(callback: () => void, ms = 500) {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const [pressing, setPressing] = useState(false);

  const start = useCallback(() => { setPressing(true); timer.current = setTimeout(() => { setPressing(false); callback(); }, ms); }, [callback, ms]);
  const stop = useCallback(() => { setPressing(false); clearTimeout(timer.current); }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { pressing, onTouchStart: start, onTouchEnd: stop, onMouseDown: start, onMouseUp: stop, onMouseLeave: stop };
}
