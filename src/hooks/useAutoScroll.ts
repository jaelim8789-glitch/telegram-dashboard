"use client";

import { useRef, useCallback } from "react";

export function useAutoScroll(options: { smooth?: boolean; threshold?: number } = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isNearBottom = useRef(true);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    isNearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < (options.threshold || 100);
  }, [options.threshold]);

  const scrollToBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el || !isNearBottom.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: options.smooth ? "smooth" : "instant" });
  }, [options.smooth]);

  return { containerRef, handleScroll, scrollToBottom };
}
