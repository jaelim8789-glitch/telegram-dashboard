'use client';

import { useEffect } from 'react';
import { optimizeImageLoading } from '@/lib/mobileOptimization';

export function MobileImageOptimizer() {
  useEffect(() => {
    // 이미지 로딩 최적화 적용
    optimizeImageLoading();
  }, []);

  return null;
}