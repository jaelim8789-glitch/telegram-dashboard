'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';
import { 
  Send, 
  MessageSquare, 
  Settings, 
  Plus, 
  Clock, 
  Bot, 
  Users, 
  Zap, 
  Search,
  BarChart3,
  Package
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  hotkey?: string;
  visible: boolean;
}

export function QuickActionBar() {
  const [actions] = useLocalStorage<QuickAction[]>('quick-actions', [
    {
      id: 'send-message',
      label: '메시지 보내�?,
      icon: <Send className="w-4 h-4" />,
      action: () => { window.location.hash = '#/send'; },
      hotkey: 'Ctrl+M',
      visible: true
    },
    {
      id: 'create-auto-reply',
      label: '?�동 ?�답 ?�성',
      icon: <Bot className="w-4 h-4" />,
      action: () => { window.location.hash = '#/auto-reply'; },
      hotkey: 'Ctrl+R',
      visible: true
    },
    {
      id: 'add-account',
      label: '계정 추�?',
      icon: <Users className="w-4 h-4" />,
      action: () => { window.location.hash = '#/accounts'; },
      hotkey: 'Ctrl+A',
      visible: true
    },
    {
      id: 'schedule-broadcast',
      label: '방송 ?�약',
      icon: <Clock className="w-4 h-4" />,
      action: () => { window.location.hash = '#/broadcast'; },
      hotkey: 'Ctrl+S',
      visible: true
    },
    {
      id: 'ai-assistant',
      label: 'AI ?�시?�턴??,
      icon: <Bot className="w-4 h-4" />,
      action: () => { window.location.hash = '#/ai'; },
      hotkey: 'Ctrl+I',
      visible: true
    },
    {
      id: 'analytics',
      label: '분석',
      icon: <BarChart3 className="w-4 h-4" />,
      action: () => { window.location.hash = '#/analytics'; },
      hotkey: 'Ctrl+L',
      visible: true
    },
    {
      id: 'create-business',
      label: '비즈?�스 ?�성',
      icon: <Zap className="w-4 h-4" />,
      action: () => {
        const event = new CustomEvent('openOneClickBusinessModal');
        window.dispatchEvent(event);
      },
      hotkey: 'Ctrl+B',
      visible: true
    },
    {
      id: 'search',
      label: '검??,
      icon: <Search className="w-4 h-4" />,
      action: () => {
        const event = new CustomEvent('openCommandPalette');
        window.dispatchEvent(event);
      },
      hotkey: 'Ctrl+K',
      visible: true
    }
  ]);

  const [visibleActions, setVisibleActions] = useState<QuickAction[]>([]);

  useEffect(() => {
    setVisibleActions(actions.filter(action => action.visible));
  }, [actions]);

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 p-2 bg-muted rounded-lg border">
        {visibleActions.map((action) => (
          <Tooltip key={action.id}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={action.action}
                className="rounded-md p-2 hover:bg-accent"
              >
                {action.icon}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <div className="flex flex-col items-start">
                <span>{action.label}</span>
                {action.hotkey && (
                  <span className="text-xs text-muted-foreground">{action.hotkey}</span>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
