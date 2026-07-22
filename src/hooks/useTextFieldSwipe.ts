import { useState, useRef, useEffect } from 'react';
import { useTemplates } from './useTemplates';

interface SwipeCallbacks {
  onSwipeLeft?: () => void; // 왼쪽 스와이프: 템플릿 목록
  onSwipeRight?: () => void; // 오른쪽 스와이프: 최근 메시지
}

export const useTextFieldSwipe = (callbacks?: SwipeCallbacks) => {
  const [showTemplates, setShowTemplates] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);
  const { getRecentMessages } = useTemplates();
  
  const minSwipeDistance = 30;
  const swipeTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!touchStartX.current || !touchStartY.current) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const diffX = touchEndX - touchStartX.current;
    const diffY = touchEndY - touchStartY.current;

    // 수평 스와이프 감지 (수직 움직임이 너무 크지 않은 경우)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > minSwipeDistance) {
      if (diffX > 0) {
        // 오른쪽 스와이프: 최근 메시지
        callbacks?.onSwipeRight?.();
        setShowRecent(true);
        if (swipeTimeout.current) clearTimeout(swipeTimeout.current);
        swipeTimeout.current = setTimeout(() => setShowRecent(false), 2000);
      } else {
        // 왼쪽 스와이프: 템플릿
        callbacks?.onSwipeLeft?.();
        setShowTemplates(true);
        if (swipeTimeout.current) clearTimeout(swipeTimeout.current);
        swipeTimeout.current = setTimeout(() => setShowTemplates(false), 2000);
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  const attachSwipeListener = (element: HTMLElement | null) => {
    if (!element) return;

    elementRef.current = element;
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  };

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (swipeTimeout.current) {
        clearTimeout(swipeTimeout.current);
      }
    };
  }, []);

  return {
    attachSwipeListener,
    showTemplates,
    showRecent,
    recentMessages: getRecentMessages()
  };
};