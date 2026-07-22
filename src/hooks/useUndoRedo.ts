"use client";

import { useState, useCallback, useRef } from "react";
import { create } from "zustand";

interface UndoStack { past: string[]; future: string[]; }
interface UndoRedoState { stacks: Record<string, UndoStack>; push: (key: string, value: string) => void; undo: (key: string) => string | null; redo: (key: string) => string | null; canUndo: (key: string) => boolean; canRedo: (key: string) => boolean; }

export const useUndoRedoStore = create<UndoRedoState>((set, get) => ({
  stacks: {},
  push: (key, value) => set(s => {
    const stack = s.stacks[key] || { past: [], future: [] };
    return { stacks: { ...s.stacks, [key]: { past: [...stack.past.slice(-49), value], future: [] } } };
  }),
  undo: (key) => {
    const stack = get().stacks[key];
    if (!stack || stack.past.length < 2) return null;
    const current = stack.past[stack.past.length - 1];
    const prev = stack.past[stack.past.length - 2];
    set(s => ({ stacks: { ...s.stacks, [key]: { past: stack.past.slice(0, -1), future: [current, ...stack.future] } } }));
    return prev;
  },
  redo: (key) => {
    const stack = get().stacks[key];
    if (!stack || stack.future.length === 0) return null;
    const next = stack.future[0];
    set(s => ({ stacks: { ...s.stacks, [key]: { past: [...stack.past, next], future: stack.future.slice(1) } } }));
    return next;
  },
  canUndo: (key) => { const s = get().stacks[key]; return !!s && s.past.length > 1; },
  canRedo: (key) => { const s = get().stacks[key]; return !!s && s.future.length > 0; },
}));

export function useUndoRedo(key: string, initialValue = "") {
  const push = useUndoRedoStore(s => s.push);
  const undo = useUndoRedoStore(s => s.undo);
  const redo = useUndoRedoStore(s => s.redo);
  const canUndo = useUndoRedoStore(s => s.canUndo(key));
  const canRedo = useUndoRedoStore(s => s.canRedo(key));
  const [value, setValue] = useState(initialValue);
  const lastPushed = useRef(initialValue);

  const handleChange = useCallback((newVal: string) => {
    if (newVal !== lastPushed.current) { push(key, newVal); lastPushed.current = newVal; }
    setValue(newVal);
  }, [key, push]);

  const handleUndo = useCallback(() => { const v = undo(key); if (v !== null) { setValue(v); lastPushed.current = v; } }, [key, undo]);
  const handleRedo = useCallback(() => { const v = redo(key); if (v !== null) { setValue(v); lastPushed.current = v; } }, [key, redo]);

  return { value, setValue: handleChange, undo: handleUndo, redo: handleRedo, canUndo, canRedo };
}
