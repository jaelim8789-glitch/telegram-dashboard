'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { 
  Bell, 
  Mail, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Clock,
  X,
  Archive,
  Settings,
  MessageSquare,
  Bot,
  Users
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'system' | 'message' | 'account' | 'ai' | 'broadcast';
  timestamp: number;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  action?: {
    label: string;
    callback: () => void;
  };
}

export function SmartNotificationCenter() {
  const [notifications, setNotifications] = useLocalStorage<Notification[]>('notifications', [
    {
      id: '1',
      title: '계정 등록 완료',
      message: '새로운 Telegram 계정이 성공적으로 등록되었습니다.',
      type: 'success',
      category: 'account',
      timestamp: Date.now() - 300000, // 5분 전
      read: false,
      priority: 'medium'
    },
    {
      id: '2',
      title: '메시지 전송 실패',
      message: '일부 메시지 전송에 실패했습니다. 다시 시도해주세요.',
      type: 'error',
      category: 'message',
      timestamp: Date.now() - 1800000, // 30분 전
      read: false,
      priority: 'high',
      action: {
        label: '재시도',
        callback: () => console.log('재시도 클릭')
      }
    },
    {
      id: '3',
      title: 'AI 응답 규칙 업데이트',
      message: 'AI 응답 규칙이 자동으로 최적화되었습니다.',
      type: 'info',
      category: 'ai',
      timestamp: Date.now() - 3600000, // 1시간 전
      read: true,
      priority: 'low'
    },
    {
      id: '4',
      title: '신규 자동 응답 도착',
      message: '새로운 자동 응답 메시지가 도착했습니다.',
      type: 'info',
      category: 'message',
      timestamp: Date.now() - 7200000, // 2시간 전
      read: true,
      priority: 'medium'
    },
    {
      id: '5',
      title: '계정 활동 경고',
      message: '계정이 장시간 비활성 상태입니다. 확인이 필요합니다.',
      type: 'warning',
      category: 'account',
      timestamp: Date.now() - 86400000, // 하루 전
      read: false,
      priority: 'high'
    }
  ]);

  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const unread = notifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const archiveNotification = (id: string) => {
    setNotifications(prev => 
      prev.filter(n => n.id !== id)
    );
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getCategoryIcon = (category: Notification['category']) => {
    switch (category) {
      case 'message': return <MessageSquare className="w-4 h-4" />;
      case 'account': return <Users className="w-4 h-4" />;
      case 'ai': return <Bot className="w-4 h-4" />;
      case 'broadcast': return <MessageSquare className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      default: return 'border-l-blue-500';
    }
  };

  const notificationsByCategory = {
    all: notifications,
    unread: notifications.filter(n => !n.read),
    system: notifications.filter(n => n.category === 'system'),
    message: notifications.filter(n => n.category === 'message'),
    account: notifications.filter(n => n.category === 'account'),
    ai: notifications.filter(n => n.category === 'ai'),
    broadcast: notifications.filter(n => n.category === 'broadcast')
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        className="relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-popover border rounded-md shadow-lg z-50">
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">알림 센터</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                >
                  모두 읽음
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
                  <TabsTrigger value="all">전체</TabsTrigger>
                  <TabsTrigger value="unread">읽지 않음</TabsTrigger>
                  <TabsTrigger value="message">메시지</TabsTrigger>
                  <TabsTrigger value="account">계정</TabsTrigger>
                  <TabsTrigger value="ai">AI</TabsTrigger>
                  <TabsTrigger value="broadcast">방송</TabsTrigger>
                </TabsList>
                {Object.entries(notificationsByCategory).map(([category, categoryNotifications]) => (
                  <TabsContent key={category} value={category} className="mt-2">
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {categoryNotifications.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Bell className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                          <p>표시할 알림이 없습니다</p>
                        </div>
                      ) : (
                        categoryNotifications.map(notification => (
                          <div
                            key={notification.id}
                            className={`p-3 border rounded-md ${getPriorityColor(notification.priority)} ${
                              notification.read ? 'opacity-70' : 'bg-accent'
                            }`}
                          >
                            <div className="flex justify-between">
                              <div className="flex items-start gap-2">
                                <div className="flex-shrink-0 mt-0.5">
                                  {getIcon(notification.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium truncate">{notification.title}</h4>
                                    {!notification.read && (
                                      <Badge variant="secondary" className="text-xs">
                                        새 알림
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {notification.message}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                    {getCategoryIcon(notification.category)}
                                    <span>{new Date(notification.timestamp).toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => archiveNotification(notification.id)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                                {!notification.read && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => markAsRead(notification.id)}
                                  >
                                    <Mail className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            {notification.action && (
                              <div className="mt-2 flex justify-end">
                                <Button
                                  size="sm"
                                  onClick={notification.action.callback}
                                >
                                  {notification.action.label}
                                </Button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}