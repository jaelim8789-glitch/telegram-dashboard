"use client";

import { useState, useRef, useCallback } from "react";

export function usePinchZoom(options: { minScale?: number; maxScale?: number } = {}) {
  const { minScale = 1, maxScale = 5 } = options;
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const lastDist = useRef(0);
  const lastPan = useRef({ x: 0, y: 0 });

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) { lastDist.current = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }
    if (e.touches.length === 1) { lastPan.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const delta = dist / lastDist.current;
      setScale(s => Math.min(maxScale, Math.max(minScale, s * delta)));
      lastDist.current = dist;
    }
  }, [minScale, maxScale]);

  const handlers = { onTouchStart, onTouchMove };

  return { scale, pan, setScale: (s: number) => setScale(Math.min(maxScale, Math.max(minScale, s))), reset: () => { setScale(1); setPan({ x: 0, y: 0 }); }, handlers };
}
