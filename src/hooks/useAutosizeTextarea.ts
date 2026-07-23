"use client";

import { useEffect, useRef, type RefObject } from "react";

export function useAutosizeTextarea(ref: RefObject<HTMLTextAreaElement | null>, deps: unknown[] = []) {
  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0";
    el.style.height = `${Math.min(el.scrollHeight, 280)}px`;
  };

  useEffect(() => {
    resize();
  }, deps);
}
