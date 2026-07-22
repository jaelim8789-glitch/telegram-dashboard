'use client';

import { useEffect } from 'react';

export function MobileLocalizationOptimizer() {
  useEffect(() => {
    // 모바일 장치의 언어 설정에 따라 UI 조정
    const updateUILanguage = () => {
      const userLang = navigator.language || 'ko-KR';
      const langCode = userLang.split('-')[0]; // 언어 코드 추출 (예: 'ko')

      // 문서 언어 속성 업데이트
      document.documentElement.lang = userLang;

      // 특정 언어에 맞는 폰트 설정
      const setFontForLanguage = (lang: string) => {
        switch(lang) {
          case 'ko':
            document.documentElement.style.setProperty('--font-body', '"Apple SD Gothic Neo", "Malgun Gothic", "Nanum Gothic", sans-serif');
            break;
          case 'ja':
            document.documentElement.style.setProperty('--font-body', '"Hiragino Kaku Gothic ProN", "Hiragino Sans", "Meiryo", sans-serif');
            break;
          case 'zh':
            document.documentElement.style.setProperty('--font-body', '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif');
            break;
          default:
            document.documentElement.style.setProperty('--font-body', '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif');
        }
      };

      setFontForLanguage(langCode);

      // 날짜/시간 형식 지역화
      const dateFormatter = new Intl.DateTimeFormat(userLang, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // 숫자 형식 지역화
      const numberFormatter = new Intl.NumberFormat(userLang);

      // 모바일에서만 적용할 지역화 설정
      if (window.matchMedia('(max-width: 768px)').matches) {
        // 모바일에서는 더 간결한 형식 사용
        const mobileDateFormatter = new Intl.DateTimeFormat(userLang, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        // 포맷터를 전역으로 사용할 수 있도록 설정
        (window as any).__localeDateFormatter = mobileDateFormatter;
        (window as any).__localeNumberFormatter = numberFormatter;
      }
    };

    updateUILanguage();

    // 언어 변경 감지
    const handleLanguageChange = () => {
      updateUILanguage();
    };

    // 언어 설정 변경 시 이벤트 리스너
    window.addEventListener('languagechange', handleLanguageChange);

    return () => {
      window.removeEventListener('languagechange', handleLanguageChange);
    };
  }, []);

  return null;
}