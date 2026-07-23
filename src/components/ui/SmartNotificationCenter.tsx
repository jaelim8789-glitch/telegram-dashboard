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
      title: 'Í≥ÑÏ†ï ?±Î°ù ?ÑÎ£å',
      message: '?àÎ°ú??Telegram Í≥ÑÏ†ï???±Í≥µ?ÅÏúºÎ°??±Î°ù?òÏóà?µÎãà??',
      type: 'success',
      category: 'account',
      timestamp: Date.now() - 300000, // 5Î∂???      read: false,
      priority: 'medium'
    },
    {
      id: '2',
      title: 'Î©îÏãúÏßÄ ?ÑÏÜ° ?§Ìå®',
      message: '?ºÎ? Î©îÏãúÏßÄ ?ÑÏÜ°???§Ìå®?àÏäµ?àÎã§. ?§Ïãú ?úÎèÑ?¥Ï£º?∏Ïöî.',
      type: 'error',
      category: 'message',
      timestamp: Date.now() - 1800000, // 30Î∂???      read: false,
      priority: 'high',
      action: {
        label: '?¨Ïãú??,
        callback: () => console.log('?¨Ïãú???¥Î¶≠')
      }
    },
    {
      id: '3',
      title: 'AI ?ëÎãµ Í∑úÏπô ?ÖÎç∞?¥Ìä∏',
      message: 'AI ?ëÎãµ Í∑úÏπô???êÎèô?ºÎ°ú ÏµúÏ†Å?îÎêò?àÏäµ?àÎã§.',
      type: 'info',
      category: 'ai',
      timestamp: Date.now() - 3600000, // 1?úÍ∞Ñ ??      read: true,
      priority: 'low'
    },
    {
      id: '4',
      title: '?†Í∑ú ?êÎèô ?ëÎãµ ?ÑÏ∞©',
      message: '?àÎ°ú???êÎèô ?ëÎãµ Î©îÏãúÏßÄÍ∞Ä ?ÑÏ∞©?àÏäµ?àÎã§.',
      type: 'info',
      category: 'message',
      timestamp: Date.now() - 7200000, // 2?úÍ∞Ñ ??      read: true,
      priority: 'medium'
    },
    {
      id: '5',
      title: 'Í≥ÑÏ†ï ?úÎèô Í≤ΩÍ≥†',
      message: 'Í≥ÑÏ†ï???•ÏãúÍ∞?ÎπÑÌôú???ÅÌÉú?ÖÎãà?? ?ïÏù∏???ÑÏöî?©Îãà??',
      type: 'warning',
      category: 'account',
      timestamp: Date.now() - 86400000, // ?òÎ£® ??      read: false,
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
                <CardTitle className="text-lg">?åÎ¶º ?ºÌÑ∞</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                >
                  Î™®Îëê ?ΩÏùå
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
                  <TabsTrigger value="all">?ÑÏ≤¥</TabsTrigger>
                  <TabsTrigger value="unread">?ΩÏ? ?äÏùå</TabsTrigger>
                  <TabsTrigger value="message">Î©îÏãúÏßÄ</TabsTrigger>
                  <TabsTrigger value="account">Í≥ÑÏ†ï</TabsTrigger>
                  <TabsTrigger value="ai">AI</TabsTrigger>
                  <TabsTrigger value="broadcast">Î∞©ÏÜ°</TabsTrigger>
                </TabsList>
                {Object.entries(notificationsByCategory).map(([category, categoryNotifications]) => (
                  <TabsContent key={category} value={category} className="mt-2">
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {categoryNotifications.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Bell className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                          <p>?úÏãú???åÎ¶º???ÜÏäµ?àÎã§</p>
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
                                        ???åÎ¶º
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
