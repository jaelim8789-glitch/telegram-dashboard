'use client';

import { useEffect, useRef } from 'react';
import { useVisualViewport } from '@/hooks/useVisualViewport';

export function MobileKeyboardHandler() {
  const { isKeyboardVisible } = useVisualViewport();
  const focusHandlerRef = useRef<EventListener | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        const viewport = window.visualViewport;
        document.documentElement.style.setProperty('--visual-viewport-height', `${viewport.height}px`);
        document.documentElement.style.setProperty('--keyboard-offset', `${window.innerHeight - viewport.height}px`);

        if (isKeyboardVisible) {
          document.body.classList.add('keyboard-open');
        } else {
          document.body.classList.remove('keyboard-open');
        }
      }
    };

    handleResize();

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }

    const focusHandler: EventListener = (e) => {
      const input = e.target as HTMLElement;
      if (!input || !input.matches('input, textarea, select')) return;
      setTimeout(() => {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    };
    focusHandlerRef.current = focusHandler;
    document.addEventListener('focusin', focusHandler, true);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
      if (focusHandlerRef.current) {
        document.removeEventListener('focusin', focusHandlerRef.current, true);
      }
    };
  }, [isKeyboardVisible]);

  return null;
}