"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}

export function useInfiniteScroll(
  onLoadMore: () => void | Promise<void>,
  { threshold = 0.1, rootMargin = "100px", enabled = true }: UseInfiniteScrollOptions = {}
) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleIntersect = useCallback(
    async (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (!entry?.isIntersecting || isLoading || !enabled) return;
      setIsLoading(true);
      try {
        await onLoadMore();
      } finally {
        setIsLoading(false);
      }
    },
    [onLoadMore, isLoading, enabled]
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !enabled) return;

    const observer = new IntersectionObserver(handleIntersect, {
      threshold,
      rootMargin,
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [handleIntersect, threshold, rootMargin, enabled]);

  return { sentinelRef, isLoading };
}
