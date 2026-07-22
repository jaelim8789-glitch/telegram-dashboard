import { useState, useEffect } from 'react';

export const useKeyboardStatus = () => {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;

      // 키보드가 활성화되면 viewport.height가 줄어듦
      const isKeyboard = viewport.height < window.innerHeight * 0.85;
      
      if (isKeyboard) {
        const calculatedKeyboardHeight = window.innerHeight - viewport.height;
        setKeyboardHeight(calculatedKeyboardHeight);
      }
      
      setIsKeyboardVisible(isKeyboard);
    };

    // visualViewport API 사용 (iOS Safari 지원)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => window.visualViewport?.removeEventListener('resize', handleResize);
    } else {
      // 폴백: 일반 resize 이벤트
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  return { isKeyboardVisible, keyboardHeight };
};