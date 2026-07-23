'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/Switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Bell, Activity, TrendingUp, Clock, Moon, Sun } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface NotificationSettings {
  desktopNotifications: boolean;
  emailNotifications: boolean;
  mobilePush: boolean;
  smartMode: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  activityBased: {
    highActivity: boolean;
    lowActivity: boolean;
  };
}

export function SmartNotificationSettings() {
  const [settings, setSettings] = useLocalStorage<NotificationSettings>(
    'notification-settings',
    {
      desktopNotifications: true,
      emailNotifications: false,
      mobilePush: true,
      smartMode: true,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '07:00'
      },
      activityBased: {
        highActivity: true,
        lowActivity: true
      }
    }
  );

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 1분마다 업데이트

    return () => clearInterval(timer);
  }, []);

  const handleSettingChange = (key: keyof NotificationSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleQuietHoursChange = (key: keyof NotificationSettings['quietHours'], value: any) => {
    setSettings(prev => ({
      ...prev,
      quietHours: {
        ...prev.quietHours,
        [key]: value
      }
    }));
  };

  const handleActivityBasedChange = (key: keyof NotificationSettings['activityBased'], value: any) => {
    setSettings(prev => ({
      ...prev,
      activityBased: {
        ...prev.activityBased,
        [key]: value
      }
    }));
  };

  // 현재 시간이 숨은 시간대에 해당하는지 확인
  const isQuietHours = () => {
    if (!settings.quietHours.enabled) return false;
    
    const now = currentTime.getHours() * 100 + currentTime.getMinutes();
    const start = parseInt(settings.quietHours.start.replace(':', ''));
    const end = parseInt(settings.quietHours.end.replace(':', ''));
    
    if (end < start) {
      // 자정을 넘는 경우
      return now >= start || now <= end;
    }
    
    return now >= start && now <= end;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              스마트 알림 설정
            </CardTitle>
            <CardDescription>
              사용자 활동 패턴에 따라 자동으로 알림 설정을 조정합니다
            </CardDescription>
          </div>
          <Badge variant={settings.smartMode ? "default" : "secondary"}>
            {settings.smartMode ? "스마트 모드" : "수동 모드"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">스마트 모드</h3>
            <p className="text-sm text-muted-foreground">
              활동 패턴에 따라 자동으로 알림 설정 조정
            </p>
          </div>
          <Switch
            checked={settings.smartMode}
            onCheckedChange={(checked) => handleSettingChange('smartMode', checked)}
          />
        </div>

        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            <Activity className="w-4 h-4" />
            기본 알림
          </h3>
          <div className="space-y-3 ml-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">데스크톱 알림</p>
                <p className="text-sm text-muted-foreground">브라우저 알림</p>
              </div>
              <Switch
                checked={settings.desktopNotifications}
                onCheckedChange={(checked) => handleSettingChange('desktopNotifications', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">이메일 알림</p>
                <p className="text-sm text-muted-foreground">중요 업데이트</p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">모바일 푸시</p>
                <p className="text-sm text-muted-foreground">모바일 앱 알림</p>
              </div>
              <Switch
                checked={settings.mobilePush}
                onCheckedChange={(checked) => handleSettingChange('mobilePush', checked)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            숨은 시간
            {isQuietHours() && (
              <Badge variant="destructive" className="ml-2">지금은 숨은 시간입니다</Badge>
            )}
          </h3>
          <div className="space-y-3 ml-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">숨은 시간 사용</p>
                <p className="text-sm text-muted-foreground">
                  특정 시간대에는 알림을 받지 않음
                </p>
              </div>
              <Switch
                checked={settings.quietHours.enabled}
                onCheckedChange={(checked) => handleQuietHoursChange('enabled', checked)}
              />
            </div>
            {settings.quietHours.enabled && (
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="block text-sm font-medium mb-1">시작 시간</label>
                  <input
                    type="time"
                    value={settings.quietHours.start}
                    onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">종료 시간</label>
                  <input
                    type="time"
                    value={settings.quietHours.end}
                    onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {settings.smartMode && (
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              활동 기반 설정
            </h3>
            <div className="space-y-3 ml-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">고활동 시 알림 강화</p>
                  <p className="text-sm text-muted-foreground">
                    활동이 많을 때 더 많은 알림 수신
                  </p>
                </div>
                <Switch
                  checked={settings.activityBased.highActivity}
                  onCheckedChange={(checked) => handleActivityBasedChange('highActivity', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">저활동 시 알림 축소</p>
                  <p className="text-sm text-muted-foreground">
                    활동이 적을 때 알림 빈도 조절
                  </p>
                </div>
                <Switch
                  checked={settings.activityBased.lowActivity}
                  onCheckedChange={(checked) => handleActivityBasedChange('lowActivity', checked)}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            {isQuietHours() ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            <span className="font-medium">
              현재 시간: {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <Badge variant={isQuietHours() ? "destructive" : "default"}>
            {isQuietHours() ? "숨은 시간" : "일반 시간"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}