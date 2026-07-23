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

  const triggerHapticFeedback = (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      const durations = {
        light: 10,
        medium: 20,
        heavy: 30,
        success: [10, 10, 10],
        warning: [50],
        error: [100]
      };
      navigator.vibrate(durations[type]);
    }
  };

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
        triggerHapticFeedback('light');
      } else {
        callbacks.onSwipeLeft?.();
        triggerHapticFeedback('light');
      }
    } 
    // 수직 스와이프 감지
    else if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > minSwipeDistance) {
      if (diffY > 0) {
        callbacks.onSwipeDown?.();
        triggerHapticFeedback('light');
      } else {
        callbacks.onSwipeUp?.();
        triggerHapticFeedback('light');
      }
    }

    // 탭 감지 (움직임이 작은 경우)
    else if (Math.abs(diffX) < 20 && Math.abs(diffY) < 20) {
      callbacks.onTap?.();
      triggerHapticFeedback('light');
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