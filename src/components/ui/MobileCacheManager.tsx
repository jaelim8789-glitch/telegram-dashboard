'use client';

import { useEffect } from 'react';
import { CacheManager } from '@/lib/mobileOptimization';

export function MobileCacheManager() {
  useEffect(() => {
    const cacheManager = CacheManager.getInstance();
    
    // 캐시 정리 스케줄러 설정
    const cleanupInterval = setInterval(() => {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        navigator.storage.estimate().then(estimate => {
          const usagePercent = estimate.usage && estimate.quota ? 
            (estimate.usage / estimate.quota) * 100 : 0;
          
          if (usagePercent > 80) {
            // 저장 공간이 80% 이상 사용 중이면 캐시 정리
            cacheManager.cleanup();
          }
        });
      }
    }, 300000); // 5분마다 확인

    return () => {
      clearInterval(cleanupInterval);
    };
  }, []);

  return null;
}