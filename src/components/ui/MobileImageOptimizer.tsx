'use client';

import { useEffect } from 'react';
import { optimizeImageLoading } from '@/lib/mobileOptimization';

export function MobileImageOptimizer() {
  useEffect(() => {
    // ??지 로딩 최적???용
    optimizeImageLoading();
  }, []);

  return null;
}
