'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/Skeleton';

// 동적으로 SendTab 불러오기 - 초기 로딩 속도 향상
const DynamicSendTab = dynamic(
  () => import('./SendTab'),
  {
    loading: () => (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    ),
    ssr: false // 클라이언트 사이드에서만 렌더링
  }
);

export default function SendTabWithSuspense() {
  return (
    <Suspense fallback={
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    }>
      <DynamicSendTab />
    </Suspense>
  );
}