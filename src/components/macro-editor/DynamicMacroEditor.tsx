'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/Skeleton';

// 동적으로 MacroFlowCanvas 불러오기 - 초기 로딩 속도 향상
const DynamicMacroFlowCanvas = dynamic(
  () => import('./MacroFlowCanvas'),
  {
    loading: () => (
      <div className="h-full w-full bg-app-surface">
        <div className="p-4 space-y-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    ),
    ssr: false // 클라이언트 사이드에서만 렌더링
  }
);

export default function MacroEditorWithSuspense() {
  return (
    <Suspense fallback={
      <div className="h-full w-full bg-app-surface">
        <div className="p-4 space-y-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    }>
      <DynamicMacroFlowCanvas />
    </Suspense>
  );
}