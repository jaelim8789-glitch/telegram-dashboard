'use client';

import { useEffect } from 'react';
import { CacheManager } from '@/lib/mobileOptimization';

export function MobileCacheManager() {
  useEffect(() => {
    const cacheManager = CacheManager.getInstance();
    
    // ìºì‹œ ?•ë¦¬ ?¤ì?ì¤„ëŸ¬ ?¤ì •
    const cleanupInterval = setInterval(() => {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        navigator.storage.estimate().then(estimate => {
          const usagePercent = estimate.usage && estimate.quota ? 
            (estimate.usage / estimate.quota) * 100 : 0;
          
          if (usagePercent > 80) {
            // ?€??ê³µê°„??80% ?´ìƒ ?¬ìš© ì¤‘ì´ë©?ìºì‹œ ?•ë¦¬
            cacheManager.cleanup();
          }
        });
      }
    }, 300000); // 5ë¶„ë§ˆ???•ì¸

    return () => {
      clearInterval(cleanupInterval);
    };
  }, []);

  return null;
}
