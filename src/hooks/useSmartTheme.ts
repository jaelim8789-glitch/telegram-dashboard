import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'auto';
type PreferredTheme = 'morning' | 'daytime' | 'evening' | 'night';

interface ThemePreferences {
  theme: Theme;
  preferredTimes: {
    morning: string; // HH:MM
    daytime: string;
    evening: string;
    night: string;
  };
  brightnessThreshold: number; // 화면 밝기 임계값
  adaptiveEnabled: boolean; // 적응형 테마 활성화 여부
  lastUsed: number; // 마지막 사용 시간
}

export function useSmartTheme() {
  const [theme, setTheme] = useState<Theme>('auto');
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');
  const [screenBrightness, setScreenBrightness] = useState<number | null>(null);
  const [timeBasedTheme, setTimeBasedTheme] = useState<PreferredTheme | null>(null);

  const [preferences, setPreferences] = useState<ThemePreferences>(() => {
    try {
      const saved = localStorage.getItem('theme-preferences');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('테마 설정을 불러오는 데 실패했습니다:', e);
    }

    // 기본 설정
    return {
      theme: 'auto',
      preferredTimes: {
        morning: '06:00',
        daytime: '09:00',
        evening: '18:00',
        night: '22:00'
      },
      brightnessThreshold: 50,
      adaptiveEnabled: true,
      lastUsed: Date.now()
    };
  });

  // 테마 적용
  useEffect(() => {
    const root = window.document.documentElement;

    // 기존 테마 클래스 제거
    root.classList.remove('light', 'dark');

    // 현재 시간 기반 테마 결정
    const currentTimeBasedTheme = getCurrentTimeBasedTheme();
    const currentTheme = getCurrentTheme();

    // 테마 클래스 추가
    root.classList.add(currentTheme === 'auto' ? (systemTheme === 'dark' ? 'dark' : 'light') : currentTheme);

    // CSS 변수 설정
    root.style.setProperty('--preferred-theme', currentTheme);
    root.style.setProperty('--time-based-theme', currentTimeBasedTheme || 'none');
  }, [theme, systemTheme, timeBasedTheme]);

  // 시스템 테마 감지
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    handleChange(mediaQuery);
    mediaQuery.addEventListener('change', (e) => handleChange(e));

    return () => {
      mediaQuery.removeEventListener('change', (e) => handleChange(e));
    };
  }, []);

  // 시간 기반 테마 계산
  useEffect(() => {
    const calculateTimeBasedTheme = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const morning = parseTime(preferences.preferredTimes.morning);
      const daytime = parseTime(preferences.preferredTimes.daytime);
      const evening = parseTime(preferences.preferredTimes.evening);
      const night = parseTime(preferences.preferredTimes.night);

      if (currentMinutes >= night || currentMinutes < morning) {
        setTimeBasedTheme('night');
      } else if (currentMinutes >= evening) {
        setTimeBasedTheme('evening');
      } else if (currentMinutes >= daytime) {
        setTimeBasedTheme('daytime');
      } else {
        setTimeBasedTheme('morning');
      }
    };

    calculateTimeBasedTheme();
    
    // 1분마다 업데이트
    const interval = setInterval(calculateTimeBasedTheme, 60000);

    return () => clearInterval(interval);
  }, [preferences.preferredTimes]);

  // 현재 테마 반환
  const getCurrentTheme = (): Theme => {
    if (theme !== 'auto') {
      return theme;
    }

    // 자동 테마일 경우 시간 기반 또는 시스템 테마 사용
    if (preferences.adaptiveEnabled && timeBasedTheme) {
      return timeBasedTheme === 'night' || timeBasedTheme === 'evening' ? 'dark' : 'light';
    }

    return systemTheme;
  };

  // 현재 시간 기반 테마 반환
  const getCurrentTimeBasedTheme = (): PreferredTheme | null => {
    if (!preferences.adaptiveEnabled) {
      return null;
    }
    return timeBasedTheme;
  };

  // 시간 문자열을 분으로 변환
  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // 테마 변경
  const changeTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    updatePreferences({ ...preferences, theme: newTheme, lastUsed: Date.now() });
  };

  // 테마 설정 업데이트
  const updatePreferences = (newPreferences: ThemePreferences) => {
    setPreferences(newPreferences);
    try {
      localStorage.setItem('theme-preferences', JSON.stringify(newPreferences));
    } catch (e) {
      console.error('테마 설정을 저장하는 데 실패했습니다:', e);
    }
  };

  // 선호 시간 업데이트
  const updatePreferredTimes = (times: Partial<ThemePreferences['preferredTimes']>) => {
    updatePreferences({
      ...preferences,
      preferredTimes: { ...preferences.preferredTimes, ...times },
      lastUsed: Date.now()
    });
  };

  // 화면 밝기 기반 테마 변경
  const updateScreenBrightness = (brightness: number) => {
    setScreenBrightness(brightness);
    
    // 화면 밝기에 따라 테마 조정 (선택적 기능)
    if (preferences.adaptiveEnabled && screenBrightness !== null) {
      const shouldChange = 
        (brightness < preferences.brightnessThreshold && getCurrentTheme() === 'light') ||
        (brightness >= preferences.brightnessThreshold && getCurrentTheme() === 'dark');

      if (shouldChange) {
        // 화면 밝기 변화에 따른 테마 자동 전환 (사용자 동의 후)
        console.log('화면 밝기에 따라 테마를 변경할 수 있습니다.');
      }
    }
  };

  // 테마 미리보기
  const previewTheme = (tempTheme: Theme) => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(tempTheme);
    
    // 2초 후 원래 테마로 복구
    setTimeout(() => {
      root.classList.remove('light', 'dark');
      root.classList.add(theme === 'auto' ? (systemTheme === 'dark' ? 'dark' : 'light') : theme);
    }, 2000);
  };

  return {
    theme: getCurrentTheme(),
    systemTheme,
    timeBasedTheme: getCurrentTimeBasedTheme(),
    preferences,
    changeTheme,
    updatePreferences,
    updatePreferredTimes,
    updateScreenBrightness,
    previewTheme,
    getCurrentTheme
  };
}

// 테마 프로바이더 컴포넌트
export const SmartThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const themeHook = useSmartTheme();
  
  return (
    <div 
      className={`${themeHook.theme === 'dark' ? 'dark' : 'light'}`}
      data-theme={themeHook.theme}
      data-system-theme={themeHook.systemTheme}
      data-time-based-theme={themeHook.timeBasedTheme}
    >
      {children}
    </div>
  );
};