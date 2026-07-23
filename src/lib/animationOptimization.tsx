"use client";
// ?�니메이??최적???�래??class AnimationOptimizer {
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

  // GPU 가???�소 ?�별
  public enableGpuAcceleration(element: HTMLElement, properties: string[] = ['transform', 'opacity']): void {
    const elementId = this.getElementId(element);
    
    // GPU 가?�을 ?�한 CSS ?�성 ?�정
    const translateZ = 'translateZ(0)';
    const willChange = properties.join(',');
    
    element.style.transform = element.style.transform || translateZ;
    element.style.willChange = willChange;
    
    this.gpuAcceleratedElements.add(elementId);
  }

  // GPU 가??비활?�화
  public disableGpuAcceleration(element: HTMLElement): void {
    const elementId = this.getElementId(element);
    
    element.style.willChange = 'auto';
    
    this.gpuAcceleratedElements.delete(elementId);
  }

  // ?�니메이???�레??최적??  public animate(
    element: HTMLElement,
    keyframes: PropertyIndexedKeyframes,
    options: KeyframeAnimationOptions,
    onFrame?: (progress: number) => void
  ): Promise<void> {
    const elementId = this.getElementId(element);
    
    // ?�니메이??캐시 ?�인
    const cacheKey = this.generateCacheKey(elementId, keyframes, options);
    const cached = this.animationCache.get(cacheKey);
    
    if (cached && cached.isValid) {
      // 캐시???�니메이???�사??      return this.playCachedAnimation(element, cached);
    }
    
    // GPU 가???�성??    this.enableGpuAcceleration(element);
    
    // ?�니메이???�작 ??FPS 모니?�링
    this.fpsMonitor.startTracking();
    
    return new Promise((resolve) => {
      const animation = element.animate(keyframes, options);
      
      // ?�레?�별 콜백 처리
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
        // ?�니메이??종료 ??GPU 가??비활?�화 (?�요??
        if (!this.shouldKeepGpuAcceleration(elementId)) {
          this.disableGpuAcceleration(element);
        }
        
        // FPS 모니?�링 종료
        const fpsData = this.fpsMonitor.stopTracking();
        
        // ?�니메이??캐시 ?�??        this.animationCache.set(cacheKey, {
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

  // CSS ?�니메이??최적??  public optimizeCssAnimation(
    element: HTMLElement,
    animationName: string,
    duration: number,
    easing: string = 'ease'
  ): void {
    const elementId = this.getElementId(element);
    
    // GPU 가?�을 ?�한 CSS ?�래??추�?
    element.style.transform = 'translateZ(0)';
    element.style.willChange = 'transform, opacity';
    
    // ?�니메이??CSS ?�성
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
    
    // ?�니메이??종료 ???�리
    setTimeout(() => {
      element.classList.remove(`${animationName}-optimized`);
      document.head.removeChild(style);
      this.disableGpuAcceleration(element);
    }, duration);
  }

  // ?�레???�실 방�? ?�니메이??  public createFpsSafeAnimation(
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
      
      // FPS ?�한
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
    
    // ?��? ?�수 반환
    return () => this.stopAnimation(elementId);
  }

  // ?�니메이??중�?
  public stopAnimation(elementId: string): void {
    const frameId = this.animationFrames.get(elementId);
    if (frameId) {
      cancelAnimationFrame(frameId);
      this.animationFrames.delete(elementId);
    }
  }

  // ?�소�??�니메이???�리
  private cleanupAnimation(elementId: string): void {
    const frameId = this.animationFrames.get(elementId);
    if (frameId) {
      cancelAnimationFrame(frameId);
      this.animationFrames.delete(elementId);
    }
  }

  // ?�소 ID ?�성
  private getElementId(element: HTMLElement): string {
    if (!element.id) {
      element.id = `animated-element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    return element.id;
  }

  // 캐시 ???�성
  private generateCacheKey(elementId: string, keyframes: any, options: any): string {
    return `${elementId}_${JSON.stringify(keyframes)}_${JSON.stringify(options)}`;
  }

  // 캐시???�니메이???�생
  private playCachedAnimation(element: HTMLElement, cached: AnimationCacheEntry): Promise<void> {
    // 캐시 ?�효???�인
    if (Date.now() - cached.timestamp > 5 * 60 * 1000) { // 5�??�상 지??캐시??무효??      cached.isValid = false;
      this.animationCache.delete(this.generateCacheKey('', {}, {}));
      return this.animate(element, cached.keyframes, cached.options);
    }
    
    // 캐시???�정?�로 ?�니메이???�행
    return this.animate(element, cached.keyframes, cached.options);
  }

  // GPU 가???��? ?��? ?�인
  private shouldKeepGpuAcceleration(elementId: string): boolean {
    // ?�정 조건???�라 GPU 가???��? ?��? 결정
    return this.gpuAcceleratedElements.has(elementId);
  }

  // ?�니메이???�능 모니?�링
  public getAnimationPerformance(): AnimationPerformanceData {
    return {
      activeAnimations: this.animationFrames.size,
      gpuAcceleratedElements: this.gpuAcceleratedElements.size,
      averageFps: this.fpsMonitor.getAverageFps(),
      frameDrops: this.fpsMonitor.getFrameDrops(),
      cacheHitRate: this.calculateCacheHitRate()
    };
  }

  // 캐시 ?�트??계산
  private calculateCacheHitRate(): number {
    // 간단??캐시 ?�트??계산 (?�제 구현?�서????복잡??로직 ?�요)
    const total = this.animationCache.size;
    const valid = Array.from(this.animationCache.values()).filter(c => c.isValid).length;
    return total > 0 ? (valid / total) * 100 : 0;
  }

  // 모든 ?�니메이???�리
  public cleanupAll(): void {
    // 모든 ?�니메이???�레???�리
    for (const [elementId, frameId] of this.animationFrames) {
      cancelAnimationFrame(frameId);
    }
    this.animationFrames.clear();
    
    // GPU 가???�소 ?�리
    this.gpuAcceleratedElements.clear();
    
    // ?�니메이??캐시 ?�리
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

// FPS 모니?�링 ?�래??class FpsMonitor {
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

    // 60fps 기�??�로 ?�레???�랍 계산 (16.67ms ?�상 걸리�??�랍)
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

// ?�니메이??최적????import { useState, useEffect, useCallback, useRef } from 'react';

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

  // ?�니메이???�능 ?�이???�데?�트
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

// ?�니메이??최적??컴포?�트
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
      // ?�래 ref가 ?�다�??�결
      if (typeof children.ref === 'function') {
        children.ref(el);
      }
    }
  });
}

// GPU 가??컴포?�트
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
      // ?�래 ref가 ?�다�??�결
      if (typeof children.ref === 'function') {
        children.ref(el);
      }
    }
  });
}

// ?�니메이??최적??컨텍?�트
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

// ?�니메이????export function useOptimizedAnimation(
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
  }, dependencies); // dependencies가 변경될 ?�마???�니메이???�실??
  return elementRef;
}

// ?�레???�실 방�? ??export function useFpsSafeAnimation(
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

// ?�버 ?�이???�니메이??최적???�틸리티
export const serverSideAnimationOptimization = {
  // ?�버?�서???�니메이??미적??  animate: (_element: HTMLElement, _keyframes: PropertyIndexedKeyframes, _options: KeyframeAnimationOptions) => {
    // ?�버 ?�이?�에?�는 ?�니메이?�을 ?�용?��? ?�음
    return Promise.resolve();
  },
  
  // ?�버 ?�이?��? ?�한 ?�니메이???�보 미리 계산
  precomputeAnimation: (keyframes: PropertyIndexedKeyframes, options: KeyframeAnimationOptions) => {
    // ?�니메이???�보�?미리 계산?�여 ?�라?�언?�에 ?�달
    return {
      duration: options.duration || 1000,
      easing: options.easing || 'ease',
      properties: Object.keys(keyframes)
    };
  }
};

// ?�니메이??최적???�틸리티
export const AnimationOptimizationUtils = {
  // ?�반?�인 ?�니메이???�성
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

  // GPU 가?�이 가?�한 ?�성
  gpuAcceleratedProperties: [
    'transform',
    'opacity'
  ],

  // ?�니메이???�능 ?�스??  testAnimationPerformance: (element: HTMLElement, keyframes: PropertyIndexedKeyframes, options: KeyframeAnimationOptions): Promise<FpsData> => {
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

  // ?�니메이??최적??권장 ?�항
  getOptimizationRecommendations: (properties: string[]): string[] => {
    const recommendations: string[] = [];
    
    if (properties.some(prop => !AnimationOptimizationUtils.gpuAcceleratedProperties.includes(prop))) {
      recommendations.push('GPU 가?�이 가?�한 ?�성(transform, opacity) ?�용 권장');
    }
    
    if (properties.length > 3) {
      recommendations.push('?�니메이???�성 ?��? 최소?�하???�능 ?�상');
    }
    
    return recommendations;
  }
};