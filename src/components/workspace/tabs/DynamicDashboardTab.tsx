'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/Skeleton';

// 동적으로 DashboardTab 불러오기 - 초기 로딩 속도 향상
const DynamicDashboardTab = dynamic(
  () => import('./DashboardTab'),
  {
    loading: () => (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-1/2" />
        <Skeleton className="h-48 w-1/2" />
      </div>
    ),
    ssr: false // 클라이언트 사이드에서만 렌더링
  }
);

export default function DashboardTabWithSuspense() {
  return (
    <Suspense fallback={
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-1/2" />
        <Skeleton className="h-48 w-1/2" />
      </div>
    }>
      <DynamicDashboardTab />
    </Suspense>
  );
}