'use client';

import { useEffect } from 'react';

export function MobileFontOptimizer() {
  useEffect(() => {
    // ?�트 로딩 ?�략 최적??
    const optimizeFontLoading = () => {
      // 모바???�경?�서 ?�트 로딩 최적??
      if (window.matchMedia('(max-width: 768px)').matches) {
        // ?�트 ?�스?�레???�략 ?�정
        const fontLinks = document.querySelectorAll('link[rel="stylesheet"][href*="font"]');
        
        fontLinks.forEach(link => {
          // ?�트 로딩 ?�략??swap?�로 ?�정?�여 ?�스???�시 지??최소??
          link.setAttribute('data-font-display', 'swap');
        });

        // ?�트 로딩 ?�료 ??처리
        if ('fonts' in document) {
          (document as any).fonts.ready.then(() => {
            document.documentElement.classList.add('fonts-loaded');
          });
        }
      }
    };

    // DOM 로드 ???�행
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', optimizeFontLoading);
    } else {
      optimizeFontLoading();
    }

    return () => {
      document.removeEventListener('DOMContentLoaded', optimizeFontLoading);
    };
  }, []);

  return null;
}
