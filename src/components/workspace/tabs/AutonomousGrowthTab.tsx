'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store/useWorkspaceStore';
import AutonomousGrowthLoop from '@/components/AutonomousGrowthLoop';

const AutonomousGrowthTab = () => {
  const { user } = useStore();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // ?¬ìš©??ID ?¤ì •
    if (user) {
      setUserId(user.id || user.phone || 'unknown');
    }
  }, [user]);

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">?¬ìš©???•ë³´ë¥?ë¶ˆëŸ¬?¤ëŠ” ì¤?..</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">?ìœ¨ ?±ì¥ ë£¨í”„</h1>
        <p className="text-gray-600 mt-1">
          AI ê¸°ë°˜ ?ë™ ì½˜í…ì¸??ì„± ë°?ë°œì†¡???µí•´ ëª©í‘œ ?¬ì„±???ë™?”í•©?ˆë‹¤
        </p>
      </div>

      <AutonomousGrowthLoop userId={userId} />
    </div>
  );
};

export default AutonomousGrowthTab;
