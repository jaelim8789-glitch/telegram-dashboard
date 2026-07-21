'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store/useWorkspaceStore';
import AutonomousGrowthLoop from '@/components/AutonomousGrowthLoop';

const AutonomousGrowthTab = () => {
  const { user } = useStore();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // 사용자 ID 설정
    if (user) {
      setUserId(user.id || user.phone || 'unknown');
    }
  }, [user]);

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">사용자 정보를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">자율 성장 루프</h1>
        <p className="text-gray-600 mt-1">
          AI 기반 자동 콘텐츠 생성 및 발송을 통해 목표 달성을 자동화합니다
        </p>
      </div>

      <AutonomousGrowthLoop userId={userId} />
    </div>
  );
};

export default AutonomousGrowthTab;