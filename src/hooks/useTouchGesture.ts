import { useCallback, useRef } from 'react';

interface TouchGestureCallbacks {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onTap?: () => void;
}

export const useTouchGesture = (callbacks: TouchGestureCallbacks) => {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const minSwipeDistance = 50; // 최소 스와이프 거리

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchStartX.current || !touchStartY.current) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const diffX = touchEndX - touchStartX.current;
    const diffY = touchEndY - touchStartY.current;

    // 수평 스와이프 감지
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > minSwipeDistance) {
      if (diffX > 0) {
        callbacks.onSwipeRight?.();
      } else {
        callbacks.onSwipeLeft?.();
      }
    } 
    // 수직 스와이프 감지
    else if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > minSwipeDistance) {
      if (diffY > 0) {
        callbacks.onSwipeDown?.();
      } else {
        callbacks.onSwipeUp?.();
      }
    }

    // 탭 감지 (움직임이 작은 경우)
    else if (Math.abs(diffX) < 20 && Math.abs(diffY) < 20) {
      callbacks.onTap?.();
    }

    touchStartX.current = null;
    touchStartY.current = null;
  }, [callbacks]);

  const bindTouchEvents = (element: HTMLElement | null) => {
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true });
    element.addEventListener('touchend', handleTouchEnd as EventListener, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart as EventListener);
      element.removeEventListener('touchend', handleTouchEnd as EventListener);
    };
  };

  return { bindTouchEvents };
};