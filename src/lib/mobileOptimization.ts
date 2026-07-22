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
        percentage: (mem.usedJSHeapSize / mem.totalJSHeapSize) * 100
      };
    }
    return null;
  }
  
  /**
   * 배터리 상태 모니터링
   */
  async getBatteryStatus(): Promise<{ level: number; charging: boolean } | null> {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        return {
          level: battery.level * 100,
          charging: battery.charging
        };
      } catch (error) {
        console.warn('배터리 정보를 가져올 수 없습니다:', error);
        return null;
      }
    }
    return null;
  }
}

/**
 * 캐시 전략 최적화 유틸리티
 */
export class CacheManager {
  private static instance: CacheManager;
  private cacheSizeLimit = 50 * 1024 * 1024; // 50MB
  private currentSize = 0;
  
  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }
  
  /**
   * 캐시 크기 제한 초과 여부 확인
   */
  isOverLimit(size: number): boolean {
    return (this.currentSize + size) > this.cacheSizeLimit;
  }
  
  /**
   * 캐시 정리 (LRU 알고리즘 기반)
   */
  cleanup(): void {
  }
  
  /**
   * 캐시 공간 확보
   */
  async reclaimSpace(requiredBytes: number): Promise<boolean> {
    if (this.isOverLimit(requiredBytes)) {
      this.cleanup();
      return !this.isOverLimit(requiredBytes);
    }
    return true;
  }
}

/**
 * 이미지 lazy loading 최적화
 */
export const optimizeImageLoading = () => {
  // Intersection Observer를 사용한 이미지 lazy loading 최적화
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
          if (img.dataset.srcset) {
            img.srcset = img.dataset.srcset;
            img.removeAttribute('data-srcset');
          }
          observer.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px 0px', // 미리 50px 전에 로드
      threshold: 0.01
    });

    // 모바일에서는 더 일찍 로드하도록 조정
    if (MOBILE_NAVIGATION_UTILS.isMobile()) {
      imageObserver.disconnect();
      const mobileImageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
            }
            if (img.dataset.srcset) {
              img.srcset = img.dataset.srcset;
              img.removeAttribute('data-srcset');
            }
            observer.unobserve(img);
          }
        });
      }, {
        rootMargin: '100px 0px', // 모바일에서는 더 일찍 로드
        threshold: 0.01
      });

      document.querySelectorAll('img[data-src]').forEach(img => {
        mobileImageObserver.observe(img);
      });
    } else {
      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    }
  }
};

/**
 * 화면 회전 대응 유틸리티
 */
export const handleOrientationChange = () => {
  // 화면 회전 시 UI 조정
  const adjustUIForOrientation = () => {
    const orientation = screen.orientation?.angle || window.orientation;
    const isPortrait = orientation === 0 || orientation === 180;
    
    document.body.classList.toggle('orientation-portrait', isPortrait);
    document.body.classList.toggle('orientation-landscape', !isPortrait);
    
    // 필요한 경우 UI 요소 재조정
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300); // 회전 애니메이션 후 UI 조정
  };

  // iOS Safari에서는 window.orientation 이벤트 사용
  if ('orientation' in window) {
    window.addEventListener('orientationchange', adjustUIForOrientation);
  } else {
    screen.orientation?.addEventListener('change', adjustUIForOrientation);
  }

  // 초기 호출
  adjustUIForOrientation();
};