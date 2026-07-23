import { useState, useRef, useEffect } from 'react';

interface SwipeTemplateOptions {
  templates: string[];
  recentMessages: string[];
  onTemplateSelect: (template: string) => void;
  onRecentMessageSelect: (message: string) => void;
}

export const useSwipeTemplate = ({ 
  templates, 
  recentMessages, 
  onTemplateSelect,
  onRecentMessageSelect 
}: SwipeTemplateOptions) => {
  const [showTemplates, setShowTemplates] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartTime = useRef<number | null>(null);
  const minSwipeDistance = 30; // Reduced for more responsive swipes
  const maxSwipeTime = 300; // Reduced for more responsive swipes

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartTime.current = Date.now();
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!touchStartX.current || !touchStartTime.current) return;

    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchEndX - touchStartX.current;
    const deltaTime = Date.now() - touchStartTime.current;

    // 스와이프 방향과 속도 확인
    if (Math.abs(diffX) > minSwipeDistance && deltaTime < maxSwipeTime) {
      if (diffX > 0 && diffX > minSwipeDistance) {
        // 오른쪽 스와이프 - 최근 메시지
        setSwipeDirection('right');
        setShowRecent(true);
        setShowTemplates(false);
        // Automatically hide after showing
        setTimeout(() => {
          setShowRecent(false);
          setSwipeDirection(null);
        }, 2000);
      } else if (diffX < 0 && Math.abs(diffX) > minSwipeDistance) {
        // 왼쪽 스와이프 - 템플릿
        setSwipeDirection('left');
        setShowTemplates(true);
        setShowRecent(false);
        // Automatically hide after showing
        setTimeout(() => {
          setShowTemplates(false);
          setSwipeDirection(null);
        }, 2000);
      }
    }

    touchStartX.current = null;
    touchStartTime.current = null;
  };

  const attachSwipeListeners = (element: HTMLElement | null) => {
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  };

  const hidePanels = () => {
    setShowTemplates(false);
    setShowRecent(false);
    setSwipeDirection(null);
  };

  useEffect(() => {
    // 2초 후 패널 자동 숨김
    if (showTemplates || showRecent) {
      const timer = setTimeout(hidePanels, 2000);
      return () => clearTimeout(timer);
    }
  }, [showTemplates, showRecent]);

  return {
    showTemplates,
    showRecent,
    swipeDirection,
    attachSwipeListeners,
    hidePanels,
    templates,
    recentMessages,
    onTemplateSelect,
    onRecentMessageSelect
  };
};