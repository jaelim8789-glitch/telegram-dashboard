'use client';

import { useEffect } from 'react';
import { useVisualViewport } from '@/hooks/useVisualViewport';

export function MobileKeyboardHandler() {
  const { isKeyboardVisible } = useVisualViewport();

  useEffect(() => {
    // iOS Safari에서 가상 키보드로 인한 뷰포트 문제 해결
    const handleResize = () => {
      if (window.visualViewport) {
        const viewport = window.visualViewport;
        document.documentElement.style.setProperty('--visual-viewport-height', `${viewport.height}px`);
        
        // 키보드가 활성화되었을 때 body에 클래스 추가
        if (isKeyboardVisible) {
          document.body.classList.add('keyboard-open');
        } else {
          document.body.classList.remove('keyboard-open');
        }
      }
    };

    // 초기 설정
    handleResize();

    // 이벤트 리스너 추가
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }

    // 폼 요소에 포커스 이벤트 리스너 추가
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      const onFocus = () => {
        // 입력 필드가 뷰포트 상단에 있도록 스크롤
        setTimeout(() => {
          if (input.getBoundingClientRect().top < 100) {
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);
      };

      const onBlur = () => {
        // 입력 해제 시 스크롤 복원
        setTimeout(() => {
          if (document.activeElement !== input) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }, 100);
      };

      input.addEventListener('focus', onFocus);
      input.addEventListener('blur', onBlur);
    });

    // Clean up function
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
      
      inputs.forEach(input => {
        input.removeEventListener('focus', onFocus);
        input.removeEventListener('blur', onBlur);
      });
    };
  }, [isKeyboardVisible]);

  return null;
}