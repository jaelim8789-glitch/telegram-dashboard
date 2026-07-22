import { useState, useEffect } from "react";
import { Bell, Smartphone, Mail, Volume2, VolumeX, Clock, Activity } from "lucide-react";
import { cn } from "@/lib/cn";

interface NotificationSettings {
  sound: boolean;
  vibration: boolean;
  badgeCount: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
  activitySummary: 'daily' | 'weekly' | 'none';
}

interface SmartNotificationSettingsProps {
  initialSettings?: Partial<NotificationSettings>;
  onSave?: (settings: NotificationSettings) => void;
  className?: string;
}

export function SmartNotificationSettings({ 
  initialSettings, 
  onSave,
  className 
}: SmartNotificationSettingsProps) {
  const [settings, setSettings] = useState<NotificationSettings>({
    sound: true,
    vibration: true,
    badgeCount: true,
    emailNotifications: false,
    pushNotifications: true,
    quietHours: {
      enabled: false,
      startTime: "22:00",
      endTime: "07:00"
    },
    activitySummary: 'daily'
  });

  useEffect(() => {
    if (initialSettings) {
      setSettings(prev => ({ ...prev, ...initialSettings }));
    }
  }, [initialSettings]);

  const handleSettingChange = (key: keyof NotificationSettings, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      if (onSave) onSave(newSettings);
      return newSettings;
    });
  };

  const handleQuietHoursChange = (key: keyof NotificationSettings['quietHours'], value: any) => {
    setSettings(prev => {
      const newSettings = {
        ...prev,
        quietHours: { ...prev.quietHours, [key]: value }
      };
      if (onSave) onSave(newSettings);
      return newSettings;
    });
  };

  return (
    <div className={cn("rounded-xl border bg-app-card p-4", className)}>
      <div className="flex items-center gap-2 mb-4" style={{ color: "var(--tg-theme-text-color, #f5f5f5)" }}>
        <Bell className="h-5 w-5" />
        <h3 className="font-semibold">알림 설정</h3>
      </div>
      
      <div className="space-y-4">
        {/* 사운드 및 진동 설정 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            <span className="text-sm">사운드 알림</span>
          </div>
          <label className="relative inline-flex h-6 w-11 cursor-pointer items-center">
            <input
              type="checkbox"
              checked={settings.sound}
              onChange={(e) => handleSettingChange('sound', e.target.checked)}
              className="peer sr-only"
            />
            <span className="absolute inset-0 rounded-full bg-gray-600 transition-colors peer-checked:bg-app-primary"></span>
            <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5"></span>
          </label>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            <span className="text-sm">진동 알림</span>
          </div>
          <label className="relative inline-flex h-6 w-11 cursor-pointer items-center">
            <input
              type="checkbox"
              checked={settings.vibration}
              onChange={(e) => handleSettingChange('vibration', e.target.checked)}
              className="peer sr-only"
            />
            <span className="absolute inset-0 rounded-full bg-gray-600 transition-colors peer-checked:bg-app-primary"></span>
            <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5"></span>
          </label>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="text-sm">뱃지 표시</span>
          </div>
          <label className="relative inline-flex h-6 w-11 cursor-pointer items-center">
            <input
              type="checkbox"
              checked={settings.badgeCount}
              onChange={(e) => handleSettingChange('badgeCount', e.target.checked)}
              className="peer sr-only"
            />
            <span className="absolute inset-0 rounded-full bg-gray-600 transition-colors peer-checked:bg-app-primary"></span>
            <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5"></span>
          </label>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="text-sm">이메일 알림</span>
          </div>
          <label className="relative inline-flex h-6 w-11 cursor-pointer items-center">
            <input
              type="checkbox"
              checked={settings.emailNotifications}
              onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
              className="peer sr-only"
            />
            <span className="absolute inset-0 rounded-full bg-gray-600 transition-colors peer-checked:bg-app-primary"></span>
            <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5"></span>
          </label>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="text-sm">푸시 알림</span>
          </div>
          <label className="relative inline-flex h-6 w-11 cursor-pointer items-center">
            <input
              type="checkbox"
              checked={settings.pushNotifications}
              onChange={(e) => handleSettingChange('pushNotifications', e.target.checked)}
              className="peer sr-only"
            />
            <span className="absolute inset-0 rounded-full bg-gray-600 transition-colors peer-checked:bg-app-primary"></span>
            <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5"></span>
          </label>
        </div>
        
        {/* 무음 시간 설정 */}
        <div className="pt-2 border-t" style={{ borderColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm">무음 시간</span>
            </div>
            <label className="relative inline-flex h-6 w-11 cursor-pointer items-center">
              <input
                type="checkbox"
                checked={settings.quietHours.enabled}
                onChange={(e) => handleQuietHoursChange('enabled', e.target.checked)}
                className="peer sr-only"
              />
              <span className="absolute inset-0 rounded-full bg-gray-600 transition-colors peer-checked:bg-app-primary"></span>
              <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5"></span>
            </label>
          </div>
          
          {settings.quietHours.enabled && (
            <div className="grid grid-cols-2 gap-2 ml-6">
              <div>
                <label className="text-xs text-app-text-muted block mb-1">시작 시간</label>
                <input
                  type="time"
                  value={settings.quietHours.startTime}
                  onChange={(e) => handleQuietHoursChange('startTime', e.target.value)}
                  className="w-full rounded-lg border bg-app-bg px-3 py-2 text-sm outline-none"
                  style={{ 
                    borderColor: "var(--tg-theme-section-separator-color, #3a4a5a)",
                    backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)",
                    color: "var(--tg-theme-text-color, #f5f5f5)"
                  }}
                />
              </div>
              <div>
                <label className="text-xs text-app-text-muted block mb-1">종료 시간</label>
                <input
                  type="time"
                  value={settings.quietHours.endTime}
                  onChange={(e) => handleQuietHoursChange('endTime', e.target.value)}
                  className="w-full rounded-lg border bg-app-bg px-3 py-2 text-sm outline-none"
                  style={{ 
                    borderColor: "var(--tg-theme-section-separator-color, #3a4a5a)",
                    backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)",
                    color: "var(--tg-theme-text-color, #f5f5f5)"
                  }}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* 활동 요약 설정 */}
        <div className="pt-2">
          <label className="text-sm block mb-2">활동 요약</label>
          <div className="grid grid-cols-3 gap-2">
            {(['daily', 'weekly', 'none'] as const).map(option => (
              <button
                key={option}
                onClick={() => handleSettingChange('activitySummary', option)}
                className={`py-2 px-3 rounded-lg text-center text-sm ${
                  settings.activitySummary === option
                    ? 'bg-[var(--tg-theme-button-color,#5288c1)] text-white'
                    : 'bg-app-card-hover text-app-text'
                }`}
              >
                {option === 'daily' && '일간'}
                {option === 'weekly' && '주간'}
                {option === 'none' && '안 함'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}