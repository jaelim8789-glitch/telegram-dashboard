'use client';

import { useEffect } from 'react';
import { optimizeImageLoading } from '@/lib/mobileOptimization';

export function MobileImageOptimizer() {
  useEffect(() => {
    // 네트워크 조건 확인
    const isLowEndDevice = () => {
      return 'connection' in navigator && 
             (navigator as any).connection.effectiveType === 'slow-2g' ||
             (navigator as any).connection.effectiveType === '2g';
    };

    // 이미지 로딩 최적화 적용
    if (window.matchMedia('(max-width: 768px)').matches || isLowEndDevice()) {
      optimizeImageLoading();
      
      // 모바일에서는 이미지 프리로드 방지
      const images = document.querySelectorAll('img[data-src]');
      images.forEach(img => {
        if (window.matchMedia('(max-width: 768px)').matches) {
          img.setAttribute('loading', 'lazy');
        }
      });
    }
  }, []);

  return null;
}