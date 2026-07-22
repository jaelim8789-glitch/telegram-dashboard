// 애니메이션 최적화 클래스
class AnimationOptimizer {
  private static instance: AnimationOptimizer;
  private animationFrames: Map<string, number> = new Map();
  private gpuAcceleratedElements: Set<string> = new Set();
  private animationCache: Map<string, AnimationCacheEntry> = new Map();
  private fpsMonitor: FpsMonitor;

  constructor() {
    this.fpsMonitor = new FpsMonitor();
  }

  public static getInstance(): AnimationOptimizer {
    if (!AnimationOptimizer.instance) {
      AnimationOptimizer.instance = new AnimationOptimizer();
    }
    return AnimationOptimizer.instance;
  }

  // GPU 가속 요소 식별
  public enableGpuAcceleration(element: HTMLElement, properties: string[] = ['transform', 'opacity']): void {
    const elementId = this.getElementId(element);
    
    // GPU 가속을 위한 CSS 속성 설정
    const translateZ = 'translateZ(0)';
    const willChange = properties.join(',');
    
    element.style.transform = element.style.transform || translateZ;
    element.style.willChange = willChange;
    
    this.gpuAcceleratedElements.add(elementId);
  }

  // GPU 가속 비활성화
  public disableGpuAcceleration(element: HTMLElement): void {
    const elementId = this.getElementId(element);
    
    element.style.willChange = 'auto';
    
    this.gpuAcceleratedElements.delete(elementId);
  }

  // 애니메이션 프레임 최적화
  public animate(
    element: HTMLElement,
    keyframes: PropertyIndexedKeyframes,
    options: KeyframeAnimationOptions,
    onFrame?: (progress: number) => void
  ): Promise<void> {
    const elementId = this.getElementId(element);
    
    // 애니메이션 캐시 확인
    const cacheKey = this.generateCacheKey(elementId, keyframes, options);
    const cached = this.animationCache.get(cacheKey);
    
    if (cached && cached.isValid) {
      // 캐시된 애니메이션 재사용
      return this.playCachedAnimation(element, cached);
    }
    
    // GPU 가속 활성화
    this.enableGpuAcceleration(element);
    
    // 애니메이션 시작 전 FPS 모니터링
    this.fpsMonitor.startTracking();
    
    return new Promise((resolve) => {
      const animation = element.animate(keyframes, options);
      
      // 프레임별 콜백 처리
      if (onFrame) {
        let startTime: number | null = null;
        
        const frameCallback = (time: number) => {
          if (!startTime) startTime = time;
          
          const elapsed = time - startTime;
          const progress = Math.min(elapsed / (options.duration as number || 1000), 1);
          
          onFrame(progress);
          
          if (progress < 1) {
            requestAnimationFrame(frameCallback);
          }
        };
        
        requestAnimationFrame(frameCallback);
      }
      
      animation.onfinish = () => {
        // 애니메이션 종료 후 GPU 가속 비활성화 (필요시)
        if (!this.shouldKeepGpuAcceleration(elementId)) {
          this.disableGpuAcceleration(element);
        }
        
        // FPS 모니터링 종료
        const fpsData = this.fpsMonitor.stopTracking();
        
        // 애니메이션 캐시 저장
        this.animationCache.set(cacheKey, {
          keyframes,
          options,
          fpsData,
          timestamp: Date.now(),
          isValid: true
        });
        
        resolve();
      };
      
      animation.oncancel = () => {
        this.disableGpuAcceleration(element);
        resolve();
      };
    });
  }

  // CSS 애니메이션 최적화
  public optimizeCssAnimation(
    element: HTMLElement,
    animationName: string,
    duration: number,
    easing: string = 'ease'
  ): void {
    const elementId = this.getElementId(element);
    
    // GPU 가속을 위한 CSS 클래스 추가
    element.style.transform = 'translateZ(0)';
    element.style.willChange = 'transform, opacity';
    
    // 애니메이션 CSS 생성
    const style = document.createElement('style');
    style.textContent = `
      @keyframes ${animationName}-optimized {
        from { transform: translateZ(0); }
        to { transform: translateZ(0); }
      }
      
      .${animationName}-optimized {
        animation: ${animationName}-optimized ${duration}ms ${easing};
        transform: translateZ(0);
        will-change: transform;
      }
    `;
    
    document.head.appendChild(style);
    element.classList.add(`${animationName}-optimized`);
    
    // 애니메이션 종료 후 정리
    setTimeout(() => {
      element.classList.remove(`${animationName}-optimized`);
      document.head.removeChild(style);
      this.disableGpuAcceleration(element);
    }, duration);
  }

  // 프레임 손실 방지 애니메이션
  public createFpsSafeAnimation(
    element: HTMLElement,
    updateFn: (progress: number) => void,
    duration: number,
    targetFps: number = 60
  ): () => void {
    const elementId = this.getElementId(element);
    const startTime = performance.now();
    const interval = 1000 / targetFps;
    let lastFrameTime = startTime;
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // FPS 제한
      if (currentTime - lastFrameTime >= interval) {
        updateFn(progress);
        lastFrameTime = currentTime;
      }
      
      if (progress < 1) {
        this.animationFrames.set(elementId, requestAnimationFrame(animate));
      } else {
        this.cleanupAnimation(elementId);
      }
    };
    
    this.animationFrames.set(elementId, requestAnimationFrame(animate));
    
    // 정지 함수 반환
    return () => this.stopAnimation(elementId);
  }

  // 애니메이션 중지
  public stopAnimation(elementId: string): void {
    const frameId = this.animationFrames.get(elementId);
    if (frameId) {
      cancelAnimationFrame(frameId);
      this.animationFrames.delete(elementId);
    }
  }

  // 요소별 애니메이션 정리
  private cleanupAnimation(elementId: string): void {
    const frameId = this.animationFrames.get(elementId);
    if (frameId) {
      cancelAnimationFrame(frameId);
      this.animationFrames.delete(elementId);
    }
  }

  // 요소 ID 생성
  private getElementId(element: HTMLElement): string {
    if (!element.id) {
      element.id = `animated-element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    return element.id;
  }

  // 캐시 키 생성
  private generateCacheKey(elementId: string, keyframes: any, options: any): string {
    return `${elementId}_${JSON.stringify(keyframes)}_${JSON.stringify(options)}`;
  }

  // 캐시된 애니메이션 재생
  private playCachedAnimation(element: HTMLElement, cached: AnimationCacheEntry): Promise<void> {
    // 캐시 유효성 확인
    if (Date.now() - cached.timestamp > 5 * 60 * 1000) { // 5분 이상 지난 캐시는 무효화
      cached.isValid = false;
      this.animationCache.delete(this.generateCacheKey('', {}, {}));
      return this.animate(element, cached.keyframes, cached.options);
    }
    
    // 캐시된 설정으로 애니메이션 실행
    return this.animate(element, cached.keyframes, cached.options);
  }

  // GPU 가속 유지 여부 확인
  private shouldKeepGpuAcceleration(elementId: string): boolean {
    // 특정 조건에 따라 GPU 가속 유지 여부 결정
    return this.gpuAcceleratedElements.has(elementId);
  }

  // 애니메이션 성능 모니터링
  public getAnimationPerformance(): AnimationPerformanceData {
    return {
      activeAnimations: this.animationFrames.size,
      gpuAcceleratedElements: this.gpuAcceleratedElements.size,
      averageFps: this.fpsMonitor.getAverageFps(),
      frameDrops: this.fpsMonitor.getFrameDrops(),
      cacheHitRate: this.calculateCacheHitRate()
    };
  }

  // 캐시 히트율 계산
  private calculateCacheHitRate(): number {
    // 간단한 캐시 히트율 계산 (실제 구현에서는 더 복잡한 로직 필요)
    const total = this.animationCache.size;
    const valid = Array.from(this.animationCache.values()).filter(c => c.isValid).length;
    return total > 0 ? (valid / total) * 100 : 0;
  }

  // 모든 애니메이션 정리
  public cleanupAll(): void {
    // 모든 애니메이션 프레임 정리
    for (const [elementId, frameId] of this.animationFrames) {
      cancelAnimationFrame(frameId);
    }
    this.animationFrames.clear();
    
    // GPU 가속 요소 정리
    this.gpuAcceleratedElements.clear();
    
    // 애니메이션 캐시 정리
    this.animationCache.clear();
  }
}

interface AnimationCacheEntry {
  keyframes: PropertyIndexedKeyframes;
  options: KeyframeAnimationOptions;
  fpsData: FpsData;
  timestamp: number;
  isValid: boolean;
}

interface AnimationPerformanceData {
  activeAnimations: number;
  gpuAcceleratedElements: number;
  averageFps: number;
  frameDrops: number;
  cacheHitRate: number;
}

interface FpsData {
  averageFps: number;
  minFps: number;
  maxFps: number;
  frameDrops: number;
}

// FPS 모니터링 클래스
class FpsMonitor {
  private frameTimes: number[] = [];
  private startTime: number | null = null;
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private drops: number = 0;
  private tracking: boolean = false;

  startTracking(): void {
    this.tracking = true;
    this.frameTimes = [];
    this.frameCount = 0;
    this.drops = 0;
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    
    this.measureFrame();
  }

  private measureFrame(): void {
    if (!this.tracking) return;

    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.frameTimes.push(delta);
    this.frameCount++;
    this.lastFrameTime = now;

    // 60fps 기준으로 프레임 드랍 계산 (16.67ms 이상 걸리면 드랍)
    if (delta > 16.67) {
      this.drops++;
    }

    requestAnimationFrame(() => this.measureFrame());
  }

  stopTracking(): FpsData {
    this.tracking = false;
    const totalTime = performance.now() - (this.startTime || performance.now());
    const averageFps = this.frameCount > 0 ? (1000 / (totalTime / this.frameCount)) : 0;
    
    const fpsValues = this.frameTimes.map(time => 1000 / time);
    const minFps = Math.min(...fpsValues);
    const maxFps = Math.max(...fpsValues);

    return {
      averageFps,
      minFps,
      maxFps,
      frameDrops: this.drops
    };
  }

  getAverageFps(): number {
    if (this.frameTimes.length === 0) return 0;
    const averageFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    return 1000 / averageFrameTime;
  }

  getFrameDrops(): number {
    return this.drops;
  }
}

// 애니메이션 최적화 훅
import { useState, useEffect, useCallback, useRef } from 'react';

export function useAnimationOptimizer() {
  const [optimizer] = useState(() => AnimationOptimizer.getInstance());
  const [performanceData, setPerformanceData] = useState<AnimationPerformanceData>({
    activeAnimations: 0,
    gpuAcceleratedElements: 0,
    averageFps: 0,
    frameDrops: 0,
    cacheHitRate: 0
  });
  const animationRefs = useRef<Map<string, HTMLElement>>(new Map());

  // 애니메이션 성능 데이터 업데이트
  useEffect(() => {
    const updatePerformance = () => {
      setPerformanceData(optimizer.getAnimationPerformance());
    };

    const interval = setInterval(updatePerformance, 1000);
    return () => clearInterval(interval);
  }, [optimizer]);

  const animate = useCallback((
    element: HTMLElement,
    keyframes: PropertyIndexedKeyframes,
    options: KeyframeAnimationOptions,
    onFrame?: (progress: number) => void
  ) => {
    return optimizer.animate(element, keyframes, options, onFrame);
  }, [optimizer]);

  const optimizeCssAnimation = useCallback((
    element: HTMLElement,
    animationName: string,
    duration: number,
    easing: string = 'ease'
  ) => {
    optimizer.optimizeCssAnimation(element, animationName, duration, easing);
  }, [optimizer]);

  const createFpsSafeAnimation = useCallback((
    element: HTMLElement,
    updateFn: (progress: number) => void,
    duration: number,
    targetFps: number = 60
  ) => {
    return optimizer.createFpsSafeAnimation(element, updateFn, duration, targetFps);
  }, [optimizer]);

  const enableGpuAcceleration = useCallback((element: HTMLElement, properties: string[] = ['transform', 'opacity']) => {
    optimizer.enableGpuAcceleration(element, properties);
  }, [optimizer]);

  const disableGpuAcceleration = useCallback((element: HTMLElement) => {
    optimizer.disableGpuAcceleration(element);
  }, [optimizer]);

  const stopAnimation = useCallback((elementId: string) => {
    optimizer.stopAnimation(elementId);
  }, [optimizer]);

  const cleanupAll = useCallback(() => {
    optimizer.cleanupAll();
  }, [optimizer]);

  return {
    animate,
    optimizeCssAnimation,
    createFpsSafeAnimation,
    enableGpuAcceleration,
    disableGpuAcceleration,
    stopAnimation,
    cleanupAll,
    performanceData,
    animationRefs: animationRefs.current
  };
}

// 애니메이션 최적화 컴포넌트
export function OptimizedAnimationComponent({
  children,
  animationKeyframes,
  animationOptions,
  enabled = true
}: {
  children: React.ReactElement;
  animationKeyframes: PropertyIndexedKeyframes;
  animationOptions: KeyframeAnimationOptions;
  enabled?: boolean;
}) {
  const [animated, setAnimated] = useState(false);
  const elementRef = useRef<HTMLElement>(null);
  const { animate } = useAnimationOptimizer();

  useEffect(() => {
    if (enabled && elementRef.current && animationKeyframes && !animated) {
      animate(elementRef.current, animationKeyframes, animationOptions)
        .then(() => setAnimated(true));
    }
  }, [enabled, animationKeyframes, animationOptions, animate, animated]);

  return React.cloneElement(children, {
    ref: (el: HTMLElement) => {
      elementRef.current = el;
      // 원래 ref가 있다면 연결
      if (typeof children.ref === 'function') {
        children.ref(el);
      }
    }
  });
}

// GPU 가속 컴포넌트
export function GpuAccelerated({
  children,
  properties = ['transform', 'opacity'],
  enabled = true
}: {
  children: React.ReactElement;
  properties?: string[];
  enabled?: boolean;
}) {
  const elementRef = useRef<HTMLElement>(null);
  const { enableGpuAcceleration, disableGpuAcceleration } = useAnimationOptimizer();

  useEffect(() => {
    if (enabled && elementRef.current) {
      enableGpuAcceleration(elementRef.current, properties);
    }

    return () => {
      if (elementRef.current) {
        disableGpuAcceleration(elementRef.current);
      }
    };
  }, [enabled, properties, enableGpuAcceleration, disableGpuAcceleration]);

  return React.cloneElement(children, {
    ref: (el: HTMLElement) => {
      elementRef.current = el;
      // 원래 ref가 있다면 연결
      if (typeof children.ref === 'function') {
        children.ref(el);
      }
    }
  });
}

// 애니메이션 최적화 컨텍스트
import { createContext, useContext } from 'react';

interface AnimationOptimizationContextType {
  animate: (element: HTMLElement, keyframes: PropertyIndexedKeyframes, options: KeyframeAnimationOptions, onFrame?: (progress: number) => void) => Promise<void>;
  optimizeCssAnimation: (element: HTMLElement, animationName: string, duration: number, easing?: string) => void;
  createFpsSafeAnimation: (element: HTMLElement, updateFn: (progress: number) => void, duration: number, targetFps?: number) => () => void;
  enableGpuAcceleration: (element: HTMLElement, properties?: string[]) => void;
  disableGpuAcceleration: (element: HTMLElement) => void;
  stopAnimation: (elementId: string) => void;
  cleanupAll: () => void;
  performanceData: AnimationPerformanceData;
  animationRefs: Map<string, HTMLElement>;
}

const AnimationOptimizationContext = createContext<AnimationOptimizationContextType | undefined>(undefined);

export function AnimationOptimizationProvider({ children }: { children: React.ReactNode }) {
  const animationOptimizer = useAnimationOptimizer();

  return (
    <AnimationOptimizationContext.Provider value={animationOptimizer}>
      {children}
    </AnimationOptimizationContext.Provider>
  );
}

export function useAnimationOptimization() {
  const context = useContext(AnimationOptimizationContext);
  if (!context) {
    throw new Error('useAnimationOptimization must be used within an AnimationOptimizationProvider');
  }
  return context;
}

// 애니메이션 훅
export function useOptimizedAnimation(
  keyframes: PropertyIndexedKeyframes,
  options: KeyframeAnimationOptions,
  dependencies: React.DependencyList = []
) {
  const elementRef = useRef<HTMLElement>(null);
  const { animate } = useAnimationOptimization();

  useEffect(() => {
    if (elementRef.current && keyframes) {
      animate(elementRef.current, keyframes, options);
    }
  }, dependencies); // dependencies가 변경될 때마다 애니메이션 재실행

  return elementRef;
}

// 프레임 손실 방지 훅
export function useFpsSafeAnimation(
  updateFn: (progress: number) => void,
  duration: number,
  targetFps: number = 60,
  dependencies: React.DependencyList = []
) {
  const elementRef = useRef<HTMLElement>(null);
  const { createFpsSafeAnimation } = useAnimationOptimization();

  useEffect(() => {
    if (elementRef.current) {
      return createFpsSafeAnimation(elementRef.current, updateFn, duration, targetFps);
    }
  }, dependencies);

  return elementRef;
}

// 서버 사이드 애니메이션 최적화 유틸리티
export const serverSideAnimationOptimization = {
  // 서버에서는 애니메이션 미적용
  animate: (_element: HTMLElement, _keyframes: PropertyIndexedKeyframes, _options: KeyframeAnimationOptions) => {
    // 서버 사이드에서는 애니메이션을 적용하지 않음
    return Promise.resolve();
  },
  
  // 서버 사이드를 위한 애니메이션 정보 미리 계산
  precomputeAnimation: (keyframes: PropertyIndexedKeyframes, options: KeyframeAnimationOptions) => {
    // 애니메이션 정보를 미리 계산하여 클라이언트에 전달
    return {
      duration: options.duration || 1000,
      easing: options.easing || 'ease',
      properties: Object.keys(keyframes)
    };
  }
};

// 애니메이션 최적화 유틸리티
export const AnimationOptimizationUtils = {
  // 일반적인 애니메이션 속성
  commonAnimatedProperties: [
    'transform',
    'opacity',
    'width',
    'height',
    'left',
    'top',
    'right',
    'bottom'
  ],

  // GPU 가속이 가능한 속성
  gpuAcceleratedProperties: [
    'transform',
    'opacity'
  ],

  // 애니메이션 성능 테스트
  testAnimationPerformance: (element: HTMLElement, keyframes: PropertyIndexedKeyframes, options: KeyframeAnimationOptions): Promise<FpsData> => {
    return new Promise((resolve) => {
      const optimizer = AnimationOptimizer.getInstance();
      const fpsMonitor = new FpsMonitor();
      
      fpsMonitor.startTracking();
      
      const animation = element.animate(keyframes, options);
      animation.onfinish = () => {
        const fpsData = fpsMonitor.stopTracking();
        resolve(fpsData);
      };
    });
  },

  // 애니메이션 최적화 권장 사항
  getOptimizationRecommendations: (properties: string[]): string[] => {
    const recommendations: string[] = [];
    
    if (properties.some(prop => !AnimationOptimizationUtils.gpuAcceleratedProperties.includes(prop))) {
      recommendations.push('GPU 가속이 가능한 속성(transform, opacity) 사용 권장');
    }
    
    if (properties.length > 3) {
      recommendations.push('애니메이션 속성 수를 최소화하여 성능 향상');
    }
    
    return recommendations;
  }
};