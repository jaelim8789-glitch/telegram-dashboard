import { useState, useRef, useCallback } from 'react';

interface DragAndDropOptions {
  onDragStart?: (index: number) => void;
  onDragOver?: (fromIndex: number, toIndex: number) => void;
  onDrop?: (fromIndex: number, toIndex: number) => void;
}

export const useTouchDragAndDrop = (options?: DragAndDropOptions) => {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  
  const touchStartY = useRef<number | null>(null);
  const elementHeight = useRef<number>(0);

  const handleTouchStart = useCallback((e: React.TouchEvent, index: number) => {
    touchStartY.current = e.touches[0].clientY;
    elementHeight.current = (e.target as HTMLElement).offsetHeight || 60; // 기본 높이 60px
    
    setDraggingIndex(index);
    options?.onDragStart?.(index);
  }, [options]);

  const handleTouchMove = useCallback((e: React.TouchEvent, currentIndex: number) => {
    if (touchStartY.current === null || draggingIndex === null) return;

    const touchY = e.touches[0].clientY;
    const diffY = touchY - touchStartY.current;

    // 요소 높이를 기준으로 드래그 오버 감지
    const dragOverIndex = Math.round(diffY / elementHeight.current) + currentIndex;

    if (dragOverIndex !== currentIndex && dragOverIndex >= 0) {
      setHoverIndex(dragOverIndex);
      options?.onDragOver?.(draggingIndex, dragOverIndex);
    }
  }, [draggingIndex, options]);

  const handleTouchEnd = useCallback(() => {
    if (draggingIndex !== null && hoverIndex !== null && draggingIndex !== hoverIndex) {
      options?.onDrop?.(draggingIndex, hoverIndex);
    }
    
    setDraggingIndex(null);
    setHoverIndex(null);
    touchStartY.current = null;
  }, [draggingIndex, hoverIndex, options]);

  const getDragHandlers = (index: number) => ({
    onTouchStart: (e: React.TouchEvent) => handleTouchStart(e, index),
    onTouchMove: (e: React.TouchEvent) => handleTouchMove(e, index),
    onTouchEnd: handleTouchEnd,
  });

  const isDragging = (index: number) => draggingIndex === index;
  const isOver = (index: number) => hoverIndex === index;

  return {
    getDragHandlers,
    isDragging,
    isOver,
    draggingIndex,
    hoverIndex,
  };
};