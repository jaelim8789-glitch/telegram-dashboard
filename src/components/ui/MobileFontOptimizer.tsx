'use client';

import { useEffect } from 'react';

export function MobileFontOptimizer() {
  useEffect(() => {
    // 폰트 로딩 전략 최적화
    const optimizeFontLoading = () => {
      // 모바일 환경에서 폰트 로딩 최적화
      if (window.matchMedia('(max-width: 768px)').matches) {
        // 폰트 디스플레이 전략 설정
        const fontLinks = document.querySelectorAll('link[rel="stylesheet"][href*="font"]');
        
        fontLinks.forEach(link => {
          // 폰트 로딩 전략을 swap으로 설정하여 텍스트 표시 지연 최소화
          link.setAttribute('data-font-display', 'swap');
        });

        // 폰트 로딩 완료 시 처리
        if ('fonts' in document) {
          (document as any).fonts.ready.then(() => {
            document.documentElement.classList.add('fonts-loaded');
          });
        }
      }
    };

    // DOM 로드 후 실행
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