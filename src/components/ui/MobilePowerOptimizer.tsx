'use client';

import { useEffect } from 'react';

export function MobilePowerOptimizer() {
  useEffect(() => {
    // 백그라운드 작업 최소화
    let animationFrameId: number;
    
    // 사용자 활동 감지
    let lastUserActivity = Date.now();
    const inactivityTimeout = 300000; // 5분
    
    const updateUserActivity = () => {
      lastUserActivity = Date.now();
    };
    
    // 마우스, 키보드, 터치 이벤트에 대한 리스너
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'touchmove'].forEach(event => {
      document.addEventListener(event, updateUserActivity, { passive: true });
    });
    
    // 전력 절약 모드 감지
    const isLowPowerMode = () => {
      return 'connection' in navigator && 
             (navigator as any).connection &&
             (navigator as any).connection.saveData;
    };
    
    // 애니메이션 프레임 요청 최적화
    const optimizedAnimation = () => {
      if (Date.now() - lastUserActivity > inactivityTimeout) {
        // 비활성 상태일 때는 애니메이션 최소화
        return;
      }
      
      // 저전력 모드 또는 느린 네트워크일 때 애니메이션 단순화
      if (isLowPowerMode()) {
        // 애니메이션 비활성화 또는 단순화
        document.body.classList.add('power-saving-mode');
      } else {
        document.body.classList.remove('power-saving-mode');
      }
      
      animationFrameId = requestAnimationFrame(optimizedAnimation);
    };
    
    // 시작
    animationFrameId = requestAnimationFrame(optimizedAnimation);
    
    // 페이지 가시성 변경 감지
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 백그라운드일 때 애니메이션 및 업데이트 중지
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      } else {
        // 포그라운드로 돌아올 때 다시 시작
        lastUserActivity = Date.now();
        animationFrameId = requestAnimationFrame(optimizedAnimation);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      // 정리
      cancelAnimationFrame(animationFrameId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'touchmove'].forEach(event => {
        document.removeEventListener(event, updateUserActivity);
      });
    };
  }, []);

  return null;
}