"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface InfiniteScrollProps<T> {
  fetchPage: (page: number) => Promise<T[]>;
  renderItem: (item: T, index: number) => React.ReactNode;
  pageSize?: number;
  className?: string;
}

export function InfiniteScroll<T>({ fetchPage, renderItem, pageSize = 20, className }: InfiniteScrollProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const newItems = await fetchPage(page);
    if (newItems.length < pageSize) setHasMore(false);
    setItems(prev => [...prev, ...newItems]);
    setPage(p => p + 1);
    setLoading(false);
  }, [page, loading, hasMore, fetchPage, pageSize]);

  useEffect(() => {
    loadMore();
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(entries => { if (entries[0].isIntersecting) loadMore(); }, { rootMargin: "200px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className={className}>
      {items.map((item, i) => renderItem(item, i))}
      <div ref={sentinelRef} className="flex justify-center py-4">
        {loading && <Loader2 className="h-5 w-5 animate-spin text-app-text-muted" />}
        {!hasMore && items.length > 0 && <p className="text-[11px] text-app-text-muted">모든 항목을 불러왔습니다</p>}
      </div>
    </div>
  );
}
