'use client';

import { useEffect } from 'react';

export function MobileLocalizationOptimizer() {
  useEffect(() => {
    // ëª¨ë°”???¥ì¹˜???¸ì–´ ?¤ì •???°ë¼ UI ì¡°ì •
    const updateUILanguage = () => {
      const userLang = navigator.language || 'ko-KR';
      const langCode = userLang.split('-')[0]; // ?¸ì–´ ì½”ë“œ ì¶”ì¶œ (?? 'ko')

      // ë¬¸ì„œ ?¸ì–´ ?ì„± ?…ë°?´íŠ¸
      document.documentElement.lang = userLang;

      // ?¹ì • ?¸ì–´??ë§žëŠ” ?°íŠ¸ ?¤ì •
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

      // ? ì§œ/?œê°„ ?•ì‹ ì§€??™”
      const dateFormatter = new Intl.DateTimeFormat(userLang, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // ?«ìž ?•ì‹ ì§€??™”
      const numberFormatter = new Intl.NumberFormat(userLang);

      // ëª¨ë°”?¼ì—?œë§Œ ?ìš©??ì§€??™” ?¤ì •
      if (window.matchMedia('(max-width: 768px)').matches) {
        // ëª¨ë°”?¼ì—?œëŠ” ??ê°„ê²°???•ì‹ ?¬ìš©
        const mobileDateFormatter = new Intl.DateTimeFormat(userLang, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        // ?¬ë§·?°ë? ?„ì—­?¼ë¡œ ?¬ìš©?????ˆë„ë¡??¤ì •
        (window as any).__localeDateFormatter = mobileDateFormatter;
        (window as any).__localeNumberFormatter = numberFormatter;
      }
    };

    updateUILanguage();

    // ?¸ì–´ ë³€ê²?ê°ì?
    const handleLanguageChange = () => {
      updateUILanguage();
    };

    // ?¸ì–´ ?¤ì • ë³€ê²????´ë²¤??ë¦¬ìŠ¤??
    window.addEventListener('languagechange', handleLanguageChange);

    return () => {
      window.removeEventListener('languagechange', handleLanguageChange);
    };
  }, []);

  return null;
}
