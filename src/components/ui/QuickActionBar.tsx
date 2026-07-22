import { useState, useEffect } from 'react';
import { Bot, Send, Search, Bell, X, Settings } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/cn';
import { useDashboardStore } from '@/store/useDashboardStore';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  color: string;
  enabled?: boolean;
}

export function QuickActionBar() {
  const [isVisible, setIsVisible] = useState(true);
  const { activeTab, setActiveTab, selectedAccountId } = useDashboardStore();
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);

  // 자동 응답 상태 가져오기
  useEffect(() => {
    // 실제 상태 가져오기 로직은 실제 API 호출로 대체해야 합니다
    // 임시로 상태를 설정합니다
    setAutoReplyEnabled(true);
  }, [selectedAccountId]);

  const quickActions: QuickAction[] = [
    {
      id: 'autoreply',
      label: autoReplyEnabled ? '자동 응답 끄기' : '자동 응답 켜기',
      icon: Bot,
      action: () => {
        // 실제 자동 응답 토글 로직은 여기에 구현
        setAutoReplyEnabled(!autoReplyEnabled);
      },
      color: autoReplyEnabled ? 'text-red-500' : 'text-green-500',
      enabled: autoReplyEnabled
    },
    {
      id: 'send',
      label: '새 메시지',
      icon: Send,
      action: () => setActiveTab('send'),
      color: 'text-blue-500'
    },
    {
      id: 'search',
      label: '그룹 검색',
      icon: Search,
      action: () => setActiveTab('groupsearch'),
      color: 'text-purple-500'
    },
    {
      id: 'notifications',
      label: '알림 확인',
      icon: Bell,
      action: () => setActiveTab('dashboard'),
      color: 'text-yellow-500'
    }
  ];

  // 퀵 액션 바를 숨기는 조건: 특정 탭에서는 표시하지 않음
  const hideOnTabs = ['send', 'autoreply'];
  if (hideOnTabs.includes(activeTab) || !isVisible) {
    return null;
  }

  return (
    <div className={cn(
      "fixed bottom-20 left-1/2 transform -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md",
      "bg-app-card border border-app-border rounded-2xl shadow-xl",
      "flex items-center justify-around p-2"
    )}>
      <div className="flex items-center justify-between w-full px-2">
        {quickActions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={action.action}
            className={cn(
              "flex flex-col items-center justify-center p-2 rounded-xl",
              "hover:bg-app-card-hover transition-colors",
              "min-w-[60px]"
            )}
            aria-label={action.label}
          >
            <action.icon className={cn("h-5 w-5", action.color)} />
            <span className="text-[10px] mt-1 text-app-text truncate max-w-[60px]">{action.label}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setIsVisible(false)}
          className="p-2 rounded-full hover:bg-app-card-hover transition-colors ml-2"
          aria-label="퀵 액션 바 숨기기"
        >
          <X className="h-4 w-4 text-app-text-muted" />
        </button>
      </div>
    </div>
  );
}