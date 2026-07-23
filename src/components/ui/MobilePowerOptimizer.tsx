'use client';

import { useEffect } from 'react';

export function MobilePowerOptimizer() {
  useEffect(() => {
    // ë°±ê·¸?¼ìš´???‘ì—… ìµœì†Œ??    let animationFrameId: number;
    
    // ?¬ìš©???œë™ ê°ì?
    let lastUserActivity = Date.now();
    const inactivityTimeout = 300000; // 5ë¶?    
    const updateUserActivity = () => {
      lastUserActivity = Date.now();
    };
    
    // ë§ˆìš°?? ?¤ë³´?? ?°ì¹˜ ?´ë²¤?¸ì— ?€??ë¦¬ìŠ¤??    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'touchmove'].forEach(event => {
      document.addEventListener(event, updateUserActivity, { passive: true });
    });
    
    // ?„ë ¥ ?ˆì•½ ëª¨ë“œ ê°ì?
    const isLowPowerMode = () => {
      return 'connection' in navigator && 
             (navigator as any).connection &&
             (navigator as any).connection.saveData;
    };
    
    // ? ë‹ˆë©”ì´???„ë ˆ???”ì²­ ìµœì ??    const optimizedAnimation = () => {
      if (Date.now() - lastUserActivity > inactivityTimeout) {
        // ë¹„í™œ???íƒœ???ŒëŠ” ? ë‹ˆë©”ì´??ìµœì†Œ??        return;
      }
      
      // ?€?„ë ¥ ëª¨ë“œ ?ëŠ” ?ë¦° ?¤íŠ¸?Œí¬????? ë‹ˆë©”ì´???¨ìˆœ??      if (isLowPowerMode()) {
        // ? ë‹ˆë©”ì´??ë¹„í™œ?±í™” ?ëŠ” ?¨ìˆœ??        document.body.classList.add('power-saving-mode');
      } else {
        document.body.classList.remove('power-saving-mode');
      }
      
      animationFrameId = requestAnimationFrame(optimizedAnimation);
    };
    
    // ?œìž‘
    animationFrameId = requestAnimationFrame(optimizedAnimation);
    
    // ?˜ì´ì§€ ê°€?œì„± ë³€ê²?ê°ì?
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // ë°±ê·¸?¼ìš´?œì¼ ??? ë‹ˆë©”ì´??ë°??…ë°?´íŠ¸ ì¤‘ì?
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      } else {
        // ?¬ê·¸?¼ìš´?œë¡œ ?Œì•„?????¤ì‹œ ?œìž‘
        lastUserActivity = Date.now();
        animationFrameId = requestAnimationFrame(optimizedAnimation);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      // ?•ë¦¬
      cancelAnimationFrame(animationFrameId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'touchmove'].forEach(event => {
        document.removeEventListener(event, updateUserActivity);
      });
    };
  }, []);

  return null;
}
