'use client';

import { useEffect } from 'react';
import { useVisualViewport } from '@/hooks/useVisualViewport';

export function MobileKeyboardHandler() {
  const { isKeyboardVisible } = useVisualViewport();

  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        const viewport = window.visualViewport;
        document.documentElement.style.setProperty('--visual-viewport-height', `${viewport.height}px`);
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

    function handleFocus(this: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) {
      const input = this;
      setTimeout(() => {
        try {
          const rect = input.getBoundingClientRect();
          if (rect.top < 100) {
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } catch (e) { console.warn('Unhandled error in MobileKeyboardHandler', e) }
      }, 300);
    }

    const container = document.querySelector('[data-content-scroll-container]') || document.body;
    container.addEventListener('focus', handleFocus as any, { capture: true });

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
      container.removeEventListener('focus', handleFocus as any, { capture: true });
    };
  }, [isKeyboardVisible]);

  return null;
}
