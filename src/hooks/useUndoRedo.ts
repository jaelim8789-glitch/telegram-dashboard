"use client";

import { useState, useCallback } from "react";

/**
 * Simple undo/redo stack for text content (4)
 */
const MAX_STACK = 30;

export function useUndoRedo(initial = "") {
  const [past, setPast] = useState<string[]>([initial]);
  const [future, setFuture] = useState<string[]>([]);
  const [index, setIndex] = useState(0);

  const push = useCallback((value: string) => {
    setPast((p) => {
      const next = p.slice(0, index + 1);
      if (next[next.length - 1] === value) return p;
      return [...next, value].slice(-MAX_STACK);
    });
    setIndex((i) => i + 1);
    setFuture([]);
  }, [index]);

  const undo = useCallback(() => {
    if (index <= 0) return "";
    setFuture((f) => [...f, past[index]]);
    setIndex((i) => i - 1);
    return past[index - 1];
  }, [index, past]);

  const redo = useCallback(() => {
    if (future.length === 0) return "";
    const next = future[future.length - 1];
    setFuture((f) => f.slice(0, -1));
    setIndex((i) => i + 1);
    setPast((p) => [...p, next]);
    return next;
  }, [future]);

  const canUndo = index > 0;
  const canRedo = future.length > 0;

  return { current: past[index], push, undo, redo, canUndo, canRedo };
}
