"use client";

import { useCallback, useRef, useState } from "react";

interface SwipeHandlers {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
}

interface SwipeState {
  direction: "left" | "right" | null;
  isSwiping: boolean;
  swipeProgress: number;
}

const THRESHOLD = 50;
const EDGE_MARGIN = 20;

export function useSwipeTabs(): { handlers: SwipeHandlers; direction: "left" | "right" | null; isSwiping: boolean; swipeProgress: number } {
  const [state, setState] = useState<SwipeState>({ direction: null, isSwiping: false, swipeProgress: 0 });
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.clientX > EDGE_MARGIN && e.clientX < window.innerWidth - EDGE_MARGIN) return;
    startRef.current = { x: e.clientX, y: e.clientY };
    setState((s) => ({ ...s, isSwiping: true, swipeProgress: 0, direction: null }));
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!startRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const progress = Math.min(Math.abs(dx) / THRESHOLD, 1);
    setState({
      isSwiping: true,
      direction: dx < 0 ? "left" : "right",
      swipeProgress: progress,
    });
  }, []);

  const onPointerUp = useCallback((_e: React.PointerEvent) => {
    if (!startRef.current) {
      setState({ direction: null, isSwiping: false, swipeProgress: 0 });
      return;
    }
    startRef.current = null;
    setState({ direction: null, isSwiping: false, swipeProgress: 0 });
  }, []);

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp },
    direction: state.direction,
    isSwiping: state.isSwiping,
    swipeProgress: state.swipeProgress,
  };
}
