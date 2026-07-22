import { useState } from 'react';
import { Bot, Bell, Moon, Settings, Wifi, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { useDashboardStore } from '@/store/useDashboardStore';
import { useHapticFeedback } from '@/lib/useHapticFeedback';
import * as api from '@/lib/api';

interface StateToggleButtonProps {
  type: 'autoReply' | 'notifications' | 'focusMode' | 'connection' | 'mobileMode';
  className?: string;
}

export function StateToggleButton({ type, className }: StateToggleButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const haptics = useHapticFeedback();
  
  // 상태 가져오기
  const autoReplyEnabled = useDashboardStore(state => state.accounts.find(a => a.id === state.selectedAccountId)?.autoReplyEnabled);
  const mobileFocusMode = useDashboardStore(state => state.mobileFocusMode);
  const selectedAccountId = useDashboardStore(state => state.selectedAccountId);
  const setMobileFocusMode = useDashboardStore(state => state.setMobileFocusMode);

  // 아이콘 및 라벨 설정
  const getStateConfig = () => {
    switch (type) {
      case 'autoReply':
        return {
          icon: Bot,
          label: '자동 응답',
          enabled: autoReplyEnabled,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10'
        };
      case 'notifications':
        return {
          icon: Bell,
          label: '알림',
          enabled: true, // 현재 알림 상태는 단순 시각적 표시
          color: 'text-orange-500',
          bgColor: 'bg-orange-500/10'
        };
      case 'focusMode':
        return {
          icon: Moon,
          label: '집중 모드',
          enabled: mobileFocusMode,
          color: 'text-indigo-500',
          bgColor: 'bg-indigo-500/10'
        };
      case 'connection':
        return {
          icon: Wifi,
          label: '연결 상태',
          enabled: true, // 현재 연결 상태는 단순 시각적 표시
          color: 'text-green-500',
          bgColor: 'bg-green-500/10'
        };
      case 'mobileMode':
        return {
          icon: Smartphone,
          label: '모바일 모드',
          enabled: true, // 항상 활성화된 상태로 표시
          color: 'text-purple-500',
          bgColor: 'bg-purple-500/10'
        };
      default:
        return {
          icon: Settings,
          label: '상태',
          enabled: false,
          color: 'text-gray-500',
          bgColor: 'bg-gray-500/10'
        };
    }
  };

  const config = getStateConfig();
  const Icon = config.icon;

  // 상태 토글 핸들러
  const handleToggle = async () => {
    if (isLoading) return;
    
    haptics.light();
    setIsLoading(true);

    try {
      switch (type) {
        case 'autoReply':
          if (selectedAccountId) {
            await api.toggleAutoReply(selectedAccountId, !autoReplyEnabled);
          }
          break;
        case 'focusMode':
          setMobileFocusMode(!mobileFocusMode);
          break;
        // 다른 상태 유형에 대한 처리 추가 가능
      }
    } catch (error) {
      console.error(`${type} 상태 전환 실패:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={cn(
        "flex items-center gap-1.5 p-2 rounded-full transition-all",
        config.bgColor,
        "hover:opacity-80 active:scale-95",
        className
      )}
      aria-label={`${config.label} ${config.enabled ? '끄기' : '켜기'}`}
    >
      <Icon 
        className={cn(
          "h-4 w-4 transition-colors",
          config.enabled ? config.color : "text-app-text-muted"
        )} 
      />
      <span className={cn(
        "text-xs font-medium",
        config.enabled ? config.color : "text-app-text-muted"
      )}>
        {config.enabled ? 'ON' : 'OFF'}
      </span>
    </button>
  );
}