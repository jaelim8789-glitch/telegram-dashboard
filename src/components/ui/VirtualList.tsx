"use client";

import { useRef, useCallback, useEffect, useState, type ReactNode } from "react";
import { useDashboardStore } from "@/store/useDashboardStore";

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  overscan?: number;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  keyExtractor?: (item: T, index: number) => string | number;
  gap?: number;
}

export function VirtualList<T>({
  items,
  itemHeight,
  overscan = 5,
  renderItem,
  className = "",
  keyExtractor,
  gap = 0,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTopRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const rafRef = useRef<number>(0);
  const visibleRangeRef = useRef({ start: 0, end: 0 });

  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const totalHeight = items.length * itemHeight + Math.max(0, items.length - 1) * gap;

  const updateVisibleRange = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const scrollTop = el.scrollTop;
    const viewportHeight = el.clientHeight;

    const start = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)) - overscan);
    const end = Math.min(items.length, Math.ceil((scrollTop + viewportHeight) / (itemHeight + gap)) + overscan);

    const prev = visibleRangeRef.current;
    if (start !== prev.start || end !== prev.end) {
      visibleRangeRef.current = { start, end };
      setVisibleRange({ start, end });
    }
  }, [items.length, itemHeight, gap, overscan]);

  const handleScroll = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(updateVisibleRange);
  }, [updateVisibleRange]);

  useEffect(() => {
    updateVisibleRange();
  }, [items.length, itemHeight, gap, updateVisibleRange]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`overflow-y-auto will-change-scroll ${className}`}
      style={{ contain: "strict" }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        {items.slice(visibleRange.start, visibleRange.end).map((item, i) => {
          const index = visibleRange.start + i;
          return (
            <div
              key={keyExtractor ? keyExtractor(item, index) : index}
              style={{
                position: "absolute",
                top: index * (itemHeight + gap),
                height: itemHeight,
                left: 0,
                right: 0,
              }}
            >
              {renderItem(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
