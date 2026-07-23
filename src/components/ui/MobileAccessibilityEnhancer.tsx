'use client';

import { useEffect, useRef } from 'react';

export function MobileAccessibilityEnhancer() {
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const enhanceAccessibility = () => {
      const buttons = document.querySelectorAll('button:not([role="tab"])');
      buttons.forEach(button => {
        if (!button.getAttribute('aria-label') && !button.getAttribute('aria-labelledby')) {
          const buttonText = button.textContent?.trim();
          if (buttonText && buttonText.length <= 50) {
            button.setAttribute('aria-label', buttonText);
          }
        }
      });

      const links = document.querySelectorAll('a');
      links.forEach(link => {
        if (!link.getAttribute('aria-label') && !link.getAttribute('aria-labelledby')) {
          const linkText = link.textContent?.trim();
          if (linkText && linkText.length <= 50) {
            link.setAttribute('aria-label', linkText);
          }
        }
      });

      // ëª¨ë°”???˜ê²½?ì„œ ?¬ì»¤??ê°€?¥í•œ ?”ì†Œ???‘ê·¼???´ëž˜??ì¶”ê?
      if (window.matchMedia('(max-width: 768px)').matches) {
        const focusableElements = document.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        focusableElements.forEach(element => {
          element.classList.add('focus-ring');
          
          // ?°ì¹˜ ê¸°ê¸°?ì„œ???‘ê·¼?±ì„ ?„í•´ ì¶”ê? ?ì„± ë¶€??
          if (!element.getAttribute('role')) {
            element.setAttribute('role', 'button');
          }
        });
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', enhanceAccessibility);
    } else {
      enhanceAccessibility();
    }

    let pending = false;
    const observer = new MutationObserver(mutations => {
      if (pending) return;
      pending = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        pending = false;
        for (const mutation of mutations) {
          if (mutation.type !== 'childList') continue;
          for (const node of mutation.addedNodes) {
            if (node.nodeType !== Node.ELEMENT_NODE) continue;
            const element = node as Element;
            if (element.tagName === 'BUTTON' || element.tagName === 'A') {
              if (!element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby')) {
                const textContent = element.textContent?.trim();
                if (textContent && textContent.length <= 50) {
                  element.setAttribute('aria-label', textContent);
                }
              }
              
              // ?™ì ?¼ë¡œ ì¶”ê??˜ëŠ” ?”ì†Œ?ë„ ëª¨ë°”???‘ê·¼???´ëž˜???ìš©
              if (window.matchMedia('(max-width: 768px)').matches) {
                element.classList.add('focus-ring');
                if (!element.getAttribute('role')) {
                  element.setAttribute('role', 'button');
                }
              }
            }
          }
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
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return null;
}
