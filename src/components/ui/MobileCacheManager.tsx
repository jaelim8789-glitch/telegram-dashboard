'use client';

import { useEffect } from 'react';
import { CacheManager } from '@/lib/mobileOptimization';

export function MobileCacheManager() {
  useEffect(() => {
    const cacheManager = CacheManager.getInstance();
    
    // 캐시 ?�리 ?��?줄러 ?�정
    const cleanupInterval = setInterval(() => {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        navigator.storage.estimate().then(estimate => {
          const usagePercent = estimate.usage && estimate.quota ? 
            (estimate.usage / estimate.quota) * 100 : 0;
          
          if (usagePercent > 80) {
            // ?�??공간??80% ?�상 ?�용 중이�?캐시 ?�리
            cacheManager.cleanup();
          }
        });
      }
    }, 300000); // 5분마???�인

    return () => {
      clearInterval(cleanupInterval);
    };
  }, []);

  return null;
}
