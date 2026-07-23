"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight: number;
  keyExtractor?: (item: T, index: number) => string | number;
}

export function VirtualizedList<T>({
  items,
  renderItem,
  itemHeight,
  containerHeight,
  keyExtractor = (_, index) => index,
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // ê°???ì­??ë³´ì¬?????ì´?ë¤???¸ë±??ê³ì°
  const startIndex = Math.floor(scrollTop / itemHeight);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const endIndex = Math.min(startIndex + visibleCount + 5, items.length); // ë²í¼ë¥??í´ +5
  
  // ?¤ì  ?ëë§í  ?ì´?ë¤ ì¶ì¶
  const visibleItems = items.slice(startIndex, endIndex);
  
  // ?¤í¬ë¡??¸ë¤??  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);
  
  // ?¤í¬ë¡??ë??ì´???ì´
  const spacerStyle = {
    height: `${items.length * itemHeight}px`,
    position: 'relative' as const,
  };
  
  const wrapperStyle = {
    position: 'absolute' as const,
    top: `${startIndex * itemHeight}px`,
    width: '100%',
  };

  return (
    <div
      ref={containerRef}
      className="overflow-auto"
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={spacerStyle}>
        <div style={wrapperStyle}>
          {visibleItems.map((item, index) => {
            const actualIndex = startIndex + index;
            return (
              <div
                key={keyExtractor(item, actualIndex)}
                style={{ height: itemHeight }}
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}