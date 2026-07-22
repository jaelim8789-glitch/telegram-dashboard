/**
 * 모바일 터치 타겟 최적화 유틸리티
 */

/** 
 * 최소 터치 타겟 크기 (44px)를 보장하는 클래스
 */
export const MIN_TOUCH_TARGET_CLASS = 'min-touch-target';

/**
 * 모바일 네비게이션 관련 유틸리티
 */
export const MOBILE_NAVIGATION_UTILS = {
  /**
   * 햅틱 피드백을 트리거하는 함수
   */
  triggerHapticFeedback: (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      const durations = {
        light: 10,
        medium: 20,
        heavy: 30,
        success: [10, 10, 10],
        warning: [50],
        error: [100]
      };
      navigator.vibrate(durations[type]);
    }
  },

  /**
   * 모바일인지 감지하는 함수
   */
  isMobile: (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  },

  /**
   * 모바일 네비게이션 상태 업데이트
   */
  updateMobileNavigationState: () => {
    // 모바일 네비게이션 상태 업데이트 로직
    const isMobile = MOBILE_NAVIGATION_UTILS.isMobile();
    
    // 모바일 환경에서 터치 타겟 최소 크기 적용
    if (isMobile) {
      document.documentElement.classList.add('mobile-environment');
    } else {
      document.documentElement.classList.remove('mobile-environment');
    }
  }
};

/**
 * 성능 모니터링 유틸리티
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private observers: PerformanceObserver[] = [];
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  /**
   * FPS 모니터링 시작
   */
  startFPSMonitoring(callback: (fps: number) => void): () => void {
    let lastTime: number | null = null;
    let frameCount = 0;
    let fps = 0;
    
    const calculateFPS = (timestamp: number) => {
      if (!lastTime) lastTime = timestamp;
      
      frameCount++;
      const delta = timestamp - lastTime;
      
      if (delta >= 1000) {
        fps = Math.round((frameCount * 1000) / delta);
        callback(fps);
        frameCount = 0;
        lastTime = timestamp;
      }
      
      requestAnimationFrame(calculateFPS);
    };
    
    const animationId = requestAnimationFrame(calculateFPS);
    
    return () => cancelAnimationFrame(animationId);
  }
  
  /**
   * 메모리 사용량 모니터링
   */
  getMemoryUsage(): { used: number; total: number; percentage: number } | null {
    if ((performance as any).memory) {
      const mem = (performance as any).memory;
      return {
        used: mem.usedJSHeapSize,
        total: mem.totalJSHeapSize,
        percentage: Math.round((mem.usedJSHeapSize / mem.totalJSHeapSize) * 100),
      };
    }
    return null;
  }

  /**
   * 모바일 성능 저하 감지
   */
  detectPerformanceIssues(): { lowFPS: boolean; highMemory: boolean; issues: string[] } {
    const fps = this.getCurrentFPS();
    const memory = this.getMemoryUsage();
    
    const issues: string[] = [];
    
    // FPS가 30 이하일 경우 성능 저하로 간주
    const lowFPS = fps < 30;
    if (lowFPS) {
      issues.push(`FPS가 ${fps}로 낮습니다. 애니메이션 또는 렌더링 최적화 필요`);
    }
    
    // 메모리 사용량이 80% 이상일 경우 성능 저하로 간주
    const highMemory = memory ? memory.percentage > 80 : false;
    if (highMemory) {
      issues.push(`메모리 사용량이 ${memory?.percentage}%로 높습니다. 메모리 누수 가능성 있음`);
    }
    
    return { lowFPS, highMemory, issues };
  }
  
  /**
   * 현재 FPS 가져오기 (근사치)
   */
  private getCurrentFPS(): number {
    // 간단한 FPS 측정 로직
    let lastTime: number | null = null;
    let frameCount = 0;
    let currentFPS = 60;
    
    const measureFPS = (timestamp: number) => {
      if (!lastTime) lastTime = timestamp;
      
      frameCount++;
      const delta = timestamp - lastTime;
      
      if (delta >= 1000) {
        currentFPS = Math.round((frameCount * 1000) / delta);
        frameCount = 0;
        lastTime = timestamp;
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);
    return currentFPS;
  }
}

/**
 * 모바일 최적화 헬퍼 함수들
 */
export const MobileOptimizationHelpers = {
  /**
   * 애니메이션 프레임 감지 (모바일 성능 최적화용)
   */
  optimizeForMobileAnimations: () => {
    if (MOBILE_NAVIGATION_UTILS.isMobile()) {
      // 모바일에서 애니메이션 감소 설정 감지
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.documentElement.classList.add('reduce-motion');
      }
    }
  },
  
  /**
   * 모바일에서의 스크롤 성능 최적화
   */
  optimizeScrollForMobile: () => {
    if (MOBILE_NAVIGATION_UTILS.isMobile()) {
      // 모바일에서의 스크롤 성능 최적화
      document.addEventListener('touchstart', (e) => {
        // 터치 이벤트에 대해 기본 동작 방지 없이 이벤트 처리
        if (e.touches.length > 1) {
          // 멀티 터치 제스처는 기본 동작 허용
          return;
        }
      }, { passive: true });
      
      // 스크롤 성능 향상을 위해 transform 사용
      document.querySelectorAll('.scroll-container').forEach(el => {
        (el as HTMLElement).style.willChange = 'transform';
      });
    }
  },
  
  /**
   * 터치 이벤트 최적화
   */
  optimizeTouchEvents: () => {
    if (MOBILE_NAVIGATION_UTILS.isMobile()) {
      // 터치 이벤트에 대한 최적화
      document.documentElement.style.touchAction = 'manipulation';
    }
  }
};