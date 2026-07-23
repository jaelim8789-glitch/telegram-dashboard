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
    }, 60000); // 1ë¶ë§???ë°?´í¸

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

  // ?ì¬ ?ê°???¨ì? ?ê°????´ë¹?ëì§ ?ì¸
  const isQuietHours = () => {
    if (!settings.quietHours.enabled) return false;
    
    const now = currentTime.getHours() * 100 + currentTime.getMinutes();
    const start = parseInt(settings.quietHours.start.replace(':', ''));
    const end = parseInt(settings.quietHours.end.replace(':', ''));
    
    if (end < start) {
      // ?ì ???ë ê²½ì°
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
              ?¤ë§???ë¦¼ ?¤ì 
            </CardTitle>
            <CardDescription>
              ?¬ì©???ë ?¨í´???°ë¼ ?ë?¼ë¡ ?ë¦¼ ?¤ì ??ì¡°ì ?©ë??            </CardDescription>
          </div>
          <Badge variant={settings.smartMode ? "default" : "secondary"}>
            {settings.smartMode ? "?¤ë§??ëª¨ë" : "?ë ëª¨ë"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">?¤ë§??ëª¨ë</h3>
            <p className="text-sm text-muted-foreground">
              ?ë ?¨í´???°ë¼ ?ë?¼ë¡ ?ë¦¼ ?¤ì  ì¡°ì 
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
            ê¸°ë³¸ ?ë¦¼
          </h3>
          <div className="space-y-3 ml-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">?°ì¤?¬í± ?ë¦¼</p>
                <p className="text-sm text-muted-foreground">ë¸ë¼?°ì? ?ë¦¼</p>
              </div>
              <Switch
                checked={settings.desktopNotifications}
                onCheckedChange={(checked) => handleSettingChange('desktopNotifications', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">?´ë©???ë¦¼</p>
                <p className="text-sm text-muted-foreground">ì¤ì ?ë°?´í¸</p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">ëª¨ë°???¸ì</p>
                <p className="text-sm text-muted-foreground">ëª¨ë°?????ë¦¼</p>
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
            ?¨ì? ?ê°
            {isQuietHours() && (
              <Badge variant="destructive" className="ml-2">ì§ê¸ì? ?¨ì? ?ê°?ë??/Badge>
            )}
          </h3>
          <div className="space-y-3 ml-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">?¨ì? ?ê° ?¬ì©</p>
                <p className="text-sm text-muted-foreground">
                  ?¹ì  ?ê°??ë ?ë¦¼??ë°ì? ?ì
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
                  <label className="block text-sm font-medium mb-1">?ì ?ê°</label>
                  <input
                    type="time"
                    value={settings.quietHours.start}
                    onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ì¢ë£ ?ê°</label>
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
              ?ë ê¸°ë° ?¤ì 
            </h3>
            <div className="space-y-3 ml-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">ê³ í?????ë¦¼ ê°í</p>
                  <p className="text-sm text-muted-foreground">
                    ?ë??ë§ì ????ë§ì? ?ë¦¼ ?ì 
                  </p>
                </div>
                <Switch
                  checked={settings.activityBased.highActivity}
                  onCheckedChange={(checked) => handleActivityBasedChange('highActivity', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">??ë ???ë¦¼ ì¶ì</p>
                  <p className="text-sm text-muted-foreground">
                    ?ë???ì ???ë¦¼ ë¹ë ì¡°ì 
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
              ?ì¬ ?ê°: {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <Badge variant={isQuietHours() ? "destructive" : "default"}>
            {isQuietHours() ? "?¨ì? ?ê°" : "?¼ë° ?ê°"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
