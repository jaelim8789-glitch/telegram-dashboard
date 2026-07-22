import { Suspense, lazy } from 'react';
import { TabLoadingFallback } from '@/components/ui/TabLoadingFallback';

// Lazy load 탭 컴포넌트들 - 코드 스플리팅을 위해 dynamic import 사용
const SendTab = lazy(() => import('./tabs/SendTab'));
const GroupsTab = lazy(() => import('./tabs/GroupsTab'));
const MyAiTab = lazy(() => import('./tabs/MyAiTab'));
const AutoReplyTab = lazy(() => import('./tabs/AutoReplyTab'));
const TemplatesTab = lazy(() => import('./tabs/TemplatesTab'));
const BroadcastTab = lazy(() => import('./tabs/BroadcastTab'));
const AnalyticsTab = lazy(() => import('./tabs/AnalyticsTab'));
const SettingsTab = lazy(() => import('./tabs/SettingsTab'));
const HistoryTab = lazy(() => import('./tabs/HistoryTab'));
const TriggersTab = lazy(() => import('./tabs/TriggersTab'));
const ReferralTab = lazy(() => import('./tabs/ReferralTab'));

interface TabContentProps {
  activeTab: string;
}

export function TabContent({ activeTab }: TabContentProps) {
  const renderTabContent = () => {
    switch (activeTab) {
      case 'send':
        return <SendTab />;
      case 'groups':
        return <GroupsTab />;
      case 'my-ai':
        return <MyAiTab />;
      case 'auto-reply':
        return <AutoReplyTab />;
      case 'templates':
        return <TemplatesTab />;
      case 'broadcast':
        return <BroadcastTab />;
      case 'analytics':
        return <AnalyticsTab />;
      case 'settings':
        return <SettingsTab />;
      case 'history':
        return <HistoryTab />;
      case 'triggers':
        return <TriggersTab />;
      case 'referral':
        return <ReferralTab />;
      default:
        return <div className="flex items-center justify-center h-full">탭을 찾을 수 없습니다</div>;
    }
  };

  return (
    <Suspense fallback={<TabLoadingFallback />}>
      {renderTabContent()}
    </Suspense>
  );
}