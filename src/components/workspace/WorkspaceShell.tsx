'use client';

import { useEffect, useState } from 'react';
import { TabBar } from './TabBar';
import { DashboardTab } from './tabs/DashboardTab';
import { SendTab } from './tabs/SendTab';
import { GroupTab } from './tabs/GroupTab';
import { AutoReplyTab } from './tabs/AutoReplyTab';
import { TemplatesTab } from './tabs/TemplatesTab';
import { useDashboardStore } from '@/store/useDashboardStore';
import ErrorBoundary from '../ErrorBoundary';
import { LoadingSpinner } from '../LoadingSpinner';
import { userAnalytics } from '@/lib/userAnalytics';
import { permissionManager } from '@/lib/permissionManager';
import { performanceMonitor } from '@/lib/performanceMonitor';

const TAB_COMPONENTS = {
  dashboard: DashboardTab,
  send: SendTab,
  group: GroupTab,
  autoreply: AutoReplyTab,
  templates: TemplatesTab,
  // 기타 탭 컴포넌트들...
};

export default function WorkspaceShell() {
  const activeTab = useDashboardStore(state => state.activeTab);
  const accounts = useDashboardStore(state => state.accounts);
  const loading = useDashboardStore(state => state.loading);
  const error = useDashboardStore(state => state.error);
  
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // 초기 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      performanceMonitor.measureLoadTime('workspace-initial-load', async () => {
        await useDashboardStore.getState().initialize();
      });
      setInitialLoadComplete(true);
    };

    loadData();
  }, []);

  // 탭 전환 시 사용자 행동 로깅
  useEffect(() => {
    if (initialLoadComplete) {
      userAnalytics.logTabChange(useDashboardStore.getState().previousTab, activeTab);
    }
  }, [activeTab, initialLoadComplete]);

  // 권한 관리 초기화
  useEffect(() => {
    // 실제 애플리케이션에서는 인증 후 권한 정보 받아옴
    permissionManager.setUserPermissions({
      userId: 'current-user-id',
      permissions: [
        'read_accounts',
        'send_messages',
        'read_analytics',
        'manage_autoreply',
        'manage_templates'
      ],
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24시간 후 만료
    });
  }, []);

  // 현재 탭에 따라 적절한 컴포넌트 렌더링
  const renderActiveTab = () => {
    if (!initialLoadComplete) {
      return <LoadingSpinner message="워크스페이스를 로드하고 있습니다..." />;
    }

    if (loading && accounts.length === 0) {
      return <LoadingSpinner message="계정 정보를 불러오는 중..." />;
    }

    if (error) {
      return (
        <div className="p-6 text-center text-red-600">
          <h2 className="text-lg font-semibold">오류 발생</h2>
          <p>{error}</p>
          <button 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => useDashboardStore.getState().initialize()}
          >
            다시 시도
          </button>
        </div>
      );
    }

    const ActiveTabComponent = TAB_COMPONENTS[activeTab as keyof typeof TAB_COMPONENTS];

    if (!ActiveTabComponent) {
      return (
        <div className="p-6 text-center text-gray-600">
          <h2 className="text-lg font-semibold">탭을 찾을 수 없습니다</h2>
          <p>요청하신 기능은 현재 사용할 수 없습니다.</p>
        </div>
      );
    }

    // 권한 확인 후 렌더링
    if (!permissionManager.hasPermission('read_accounts')) {
      return (
        <div className="p-6 text-center text-gray-600">
          <h2 className="text-lg font-semibold">접근 권한이 없습니다</h2>
          <p>이 탭을 사용할 권한이 없습니다.</p>
        </div>
      );
    }

    // 성능 측정과 함께 탭 렌더링
    const { element } = performanceMonitor.measureRender(activeTab, () => <ActiveTabComponent />);
    
    return (
      <ErrorBoundary>
        {element}
      </ErrorBoundary>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white shadow-sm z-10">
        <TabBar />
      </header>
      
      <main className="flex-1 overflow-auto bg-white">
        {renderActiveTab()}
      </main>
    </div>
  );
}