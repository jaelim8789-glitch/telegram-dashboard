'use client';

import { useEffect } from 'react';

export function MobileAccessibilityEnhancer() {
  useEffect(() => {
    // 모바일 스크린 리더 최적화
    const enhanceAccessibility = () => {
      // 모든 버튼에 접근성 라벨 추가
      const buttons = document.querySelectorAll('button:not([role="tab"])');
      buttons.forEach(button => {
        if (!button.getAttribute('aria-label') && !button.getAttribute('aria-labelledby')) {
          const buttonText = button.textContent?.trim();
          if (buttonText && buttonText.length <= 50) {
            button.setAttribute('aria-label', buttonText);
          }
        }
      });

      // 링크에 역할 명시
      const links = document.querySelectorAll('a');
      links.forEach(link => {
        if (!link.getAttribute('aria-label') && !link.getAttribute('aria-labelledby')) {
          const linkText = link.textContent?.trim();
          if (linkText && linkText.length <= 50) {
            link.setAttribute('aria-label', linkText);
          }
        }
      });

      // 포커스 가능한 요소에 포커스 스타일 추가
      const focusableElements = document.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      focusableElements.forEach(element => {
        // CSS에서 이미 focus-ring 클래스를 사용하고 있으므로 여기서는 추가하지 않음
        // 대신 모바일 환경에서 더 큰 포커스 표시를 보장
        if (window.matchMedia('(max-width: 768px)').matches) {
          element.classList.add('focus-ring');
        }
      });
    };

    // DOM이 로드된 후 실행
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', enhanceAccessibility);
    } else {
      enhanceAccessibility();
    }

    // 동적 콘텐츠를 위한 MutationObserver
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              // 새로 추가된 요소에 대해 접근성 향상 적용
              if (element.tagName === 'BUTTON' || element.tagName === 'A') {
                if (!element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby')) {
                  const textContent = element.textContent?.trim();
                  if (textContent && textContent.length <= 50) {
                    element.setAttribute('aria-label', textContent);
                  }
                }
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => {
      document.removeEventListener('DOMContentLoaded', enhanceAccessibility);
      observer.disconnect();
    };
  }, []);

  return null;
}