// 이벤트 최적화 클래스
class EventOptimizer {
  private static instance: EventOptimizer;
  private debouncedFunctions: Map<string, { func: Function; timeoutId: NodeJS.Timeout | null }> = new Map();
  private throttledFunctions: Map<string, { func: Function; lastExecuted: number | null }> = new Map();
  private listeners: Array<{ element: HTMLElement; event: string; handler: Function }> = [];

  public static getInstance(): EventOptimizer {
    if (!EventOptimizer.instance) {
      EventOptimizer.instance = new EventOptimizer();
    }
    return EventOptimizer.instance;
  }

  // 디바운싱 함수
  public debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number,
    key?: string
  ): T {
    const identifier = key || func.toString();
    
    return ((...args: any[]) => {
      const existing = this.debouncedFunctions.get(identifier);
      if (existing && existing.timeoutId) {
        clearTimeout(existing.timeoutId);
      }
      
      const timeoutId = setTimeout(() => {
        func.apply(this, args);
        const current = this.debouncedFunctions.get(identifier);
        if (current) {
          current.timeoutId = null;
        }
      }, delay);
      
      this.debouncedFunctions.set(identifier, { func, timeoutId });
    }) as T;
  }

  // 쓰로틀링 함수
  public throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number,
    key?: string
  ): T {
    const identifier = key || func.toString();
    
    return ((...args: any[]) => {
      const now = Date.now();
      const existing = this.throttledFunctions.get(identifier);
      
      if (!existing || !existing.lastExecuted || now - existing.lastExecuted >= limit) {
        func.apply(this, args);
        this.throttledFunctions.set(identifier, { func, lastExecuted: now });
      }
    }) as T;
  }

  // 즉시 실행 가능한 디바운싱 (leading edge)
  public debounceLeading<T extends (...args: any[]) => any>(
    func: T,
    delay: number,
    key?: string
  ): T {
    const identifier = key || func.toString();
    let timeoutId: NodeJS.Timeout | null = null;
    let lastExecuted = 0;
    
    return ((...args: any[]) => {
      const now = Date.now();
      
      if (now - lastExecuted >= delay) {
        func.apply(this, args);
        lastExecuted = now;
      } else {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        timeoutId = setTimeout(() => {
          timeoutId = null;
          lastExecuted = Date.now();
          func.apply(this, args);
        }, delay - (now - lastExecuted));
      }
    }) as T;
  }

  // 쓰로틀링 + 디바운싱 조합
  public throttleDebounce<T extends (...args: any[]) => any>(
    func: T,
    throttleMs: number,
    debounceMs: number,
    key?: string
  ): T {
    const throttled = this.throttle(func, throttleMs, `${key}_throttle`);
    return this.debounce(throttled, debounceMs, `${key}_debounce`);
  }

  // 이벤트 리스너 최적화
  public addOptimizedListener(
    element: HTMLElement,
    event: string,
    handler: EventListener,
    options?: { debounce?: number; throttle?: number; passive?: boolean }
  ): () => void {
    const { debounce, throttle, passive = true } = options || {};
    
    let optimizedHandler: EventListener = handler;
    
    if (throttle) {
      optimizedHandler = this.throttle(handler as any, throttle) as EventListener;
    }
    
    if (debounce) {
      optimizedHandler = this.debounce(optimizedHandler as any, debounce) as EventListener;
    }
    
    const finalOptions = { passive };
    element.addEventListener(event, optimizedHandler, finalOptions);
    
    // 클린업 함수 반환
    const cleanup = () => {
      element.removeEventListener(event, optimizedHandler, finalOptions);
    };
    
    this.listeners.push({ element, event, handler: optimizedHandler });
    
    return cleanup;
  }

  // 스크롤 이벤트 최적화
  public optimizeScrollHandler(
    handler: EventListener,
    options?: { 
      debounce?: number; 
      throttle?: number; 
      passive?: boolean; 
      useRAF?: boolean // requestAnimationFrame 사용 여부
    }
  ): EventListener {
    const { debounce, throttle, passive = true, useRAF = false } = options || {};
    
    if (useRAF) {
      let ticking = false;
      
      return (event: Event) => {
        if (!ticking) {
          requestAnimationFrame(() => {
            handler(event);
            ticking = false;
          });
          ticking = true;
        }
      };
    }
    
    let optimizedHandler: EventListener = handler;
    
    if (throttle) {
      optimizedHandler = this.throttle(optimizedHandler as any, throttle) as EventListener;
    }
    
    if (debounce) {
      optimizedHandler = this.debounce(optimizedHandler as any, debounce) as EventListener;
    }
    
    return optimizedHandler;
  }

  // 마우스무브 이벤트 최적화
  public optimizeMouseMoveHandler(
    handler: EventListener,
    options?: { 
      throttle?: number; 
      sampleRate?: number; // 샘플링 비율 (예: 0.5는 50%만 처리)
    }
  ): EventListener {
    const { throttle, sampleRate = 1 } = options || {};
    let count = 0;
    
    let optimizedHandler: EventListener = (event: Event) => {
      count++;
      if (count % Math.round(1 / sampleRate) === 0) {
        handler(event);
      }
    };
    
    if (throttle) {
      optimizedHandler = this.throttle(optimizedHandler as any, throttle) as EventListener;
    }
    
    return optimizedHandler;
  }

  // 키보드 이벤트 최적화
  public optimizeKeyboardHandler(
    handler: EventListener,
    options?: { debounce?: number; throttle?: number }
  ): EventListener {
    const { debounce, throttle } = options || {};
    
    let optimizedHandler: EventListener = handler;
    
    // 입력 이벤트는 일반적으로 디바운싱이 더 적절함
    if (debounce) {
      optimizedHandler = this.debounce(optimizedHandler as any, debounce) as EventListener;
    }
    
    if (throttle) {
      optimizedHandler = this.throttle(optimizedHandler as any, throttle) as EventListener;
    }
    
    return optimizedHandler;
  }

  // 이벤트 버블링 최적화
  public optimizeEventBubbling(
    container: HTMLElement,
    eventType: string,
    selector: string,
    handler: (event: Event, target: Element) => void,
    options?: { debounce?: number; throttle?: number }
  ): () => void {
    const { debounce, throttle } = options || {};
    
    let optimizedHandler: EventListener = (event: Event) => {
      const target = event.target as Element;
      if (target && target.matches(selector)) {
        handler(event, target);
      }
    };
    
    if (throttle) {
      optimizedHandler = this.throttle(optimizedHandler as any, throttle) as EventListener;
    }
    
    if (debounce) {
      optimizedHandler = this.debounce(optimizedHandler as any, debounce) as EventListener;
    }
    
    container.addEventListener(eventType, optimizedHandler);
    
    return () => {
      container.removeEventListener(eventType, optimizedHandler);
    };
  }

  // 모든 최적화된 이벤트 리스너 정리
  public clearAllOptimizations(): void {
    // 디바운스 함수 정리
    for (const [key, { timeoutId }] of this.debouncedFunctions) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
    this.debouncedFunctions.clear();
    
    // 쓰로틀 함수 정리
    this.throttledFunctions.clear();
    
    // 이벤트 리스너 정리
    for (const listener of this.listeners) {
      listener.element.removeEventListener(listener.event, listener.handler as EventListener);
    }
    this.listeners = [];
  }

  // 특정 키에 대한 디바운스/쓰로틀 정리
  public clearOptimization(key: string): void {
    const debounced = this.debouncedFunctions.get(key);
    if (debounced && debounced.timeoutId) {
      clearTimeout(debounced.timeoutId);
    }
    this.debouncedFunctions.delete(key);
    this.throttledFunctions.delete(key);
  }

  // 성능 모니터링
  public getStats() {
    return {
      debouncedCount: this.debouncedFunctions.size,
      throttledCount: this.throttledFunctions.size,
      listenersCount: this.listeners.length
    };
  }
}

// 이벤트 최적화 훅
import { useState, useEffect, useRef, useCallback } from "react";

export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback((...args: Parameters<T>): void => {
    if (timeoutRef.current) return;
    
    callbackRef.current(...args);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
    }, delay);
  }, [delay]) as T;
}

export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback((...args: Parameters<T>): void => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
      timeoutRef.current = null;
    }, delay);
  }, [delay]) as T;
}

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useEventListener<T extends HTMLElement = HTMLElement>(
  element: T | Window | Document | null,
  event: string,
  handler: (e: Event) => void,
  options?: boolean | AddEventListenerOptions
) {
  useEffect(() => {
    if (!element) return;
    
    const optimizedHandler = handler;
    
    element.addEventListener(event, optimizedHandler, options);
    
    return () => {
      // 수정: 옵션 객체를 올바르게 전달
      element.removeEventListener(event, optimizedHandler, options);
    };
  }, [element, event, handler, options]);
}

export function useEventOptimization() {
  const optimizerRef = useRef(EventOptimizer.getInstance());
  const callbacksRef = useRef(new Map<string, Function>());

  const debounce = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    delay: number,
    key?: string
  ): T => {
    return optimizerRef.current.debounce(func, delay, key);
  }, []);

  const throttle = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    limit: number,
    key?: string
  ): T => {
    return optimizerRef.current.throttle(func, limit, key);
  }, []);

  const debounceLeading = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    delay: number,
    key?: string
  ): T => {
    return optimizerRef.current.debounceLeading(func, delay, key);
  }, []);

  const throttleDebounce = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    throttleMs: number,
    debounceMs: number,
    key?: string
  ): T => {
    return optimizerRef.current.throttleDebounce(func, throttleMs, debounceMs, key);
  }, []);

  // 컴포넌트 언마운트 시 최적화 정리
  useEffect(() => {
    return () => {
      // 이 컴포넌트에서 생성된 콜백들만 정리
      for (const [key, callback] of callbacksRef.current) {
        optimizerRef.current.clearOptimization(key);
      }
    };
  }, []);

  return {
    debounce,
    throttle,
    debounceLeading,
    throttleDebounce,
    addOptimizedListener: optimizerRef.current.addOptimizedListener.bind(optimizerRef.current),
    optimizeScrollHandler: optimizerRef.current.optimizeScrollHandler.bind(optimizerRef.current),
    optimizeMouseMoveHandler: optimizerRef.current.optimizeMouseMoveHandler.bind(optimizerRef.current),
    optimizeKeyboardHandler: optimizerRef.current.optimizeKeyboardHandler.bind(optimizerRef.current),
    optimizeEventBubbling: optimizerRef.current.optimizeEventBubbling.bind(optimizerRef.current),
    clearOptimization: optimizerRef.current.clearOptimization.bind(optimizerRef.current),
    getStats: optimizerRef.current.getStats.bind(optimizerRef.current)
  };
}

// 디바운스 훅
export function useDebounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  key?: string
): T {
  const { debounce } = useEventOptimization();
  return debounce(func, delay, key);
}

// 쓰로틀 훅
export function useThrottle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
  key?: string
): T {
  const { throttle } = useEventOptimization();
  return throttle(func, limit, key);
}

// 쓰로틀된 값 훅
export function useThrottledValue<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastExecuted = useRef<number>(0);

  useEffect(() => {
    const now = Date.now();
    if (now - lastExecuted.current >= interval) {
      setThrottledValue(value);
      lastExecuted.current = now;
    } else {
      const timeoutId = setTimeout(() => {
        setThrottledValue(value);
        lastExecuted.current = Date.now();
      }, interval - (now - lastExecuted.current));

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [value, interval]);

  return throttledValue;
}

// 스크롤 이벤트 최적화 훅
export function useOptimizedScrollHandler(
  handler: EventListener,
  options?: { 
    debounce?: number; 
    throttle?: number; 
    passive?: boolean; 
    useRAF?: boolean 
  }
) {
  const { optimizeScrollHandler } = useEventOptimization();
  return optimizeScrollHandler(handler, options);
}

// 이벤트 최적화 컴포넌트
export function OptimizedEventComponent({
  children,
  onScroll,
  onClick,
  onMouseMove,
  options
}: {
  children: React.ReactNode;
  onScroll?: (event: Event) => void;
  onClick?: (event: Event) => void;
  onMouseMove?: (event: Event) => void;
  options?: {
    scroll?: { debounce?: number; throttle?: number; useRAF?: boolean };
    click?: { debounce?: number; throttle?: number };
    mouseMove?: { throttle?: number; sampleRate?: number };
  };
}) {
  const { optimizeScrollHandler, optimizeMouseMoveHandler, optimizeKeyboardHandler } = useEventOptimization();
  
  const optimizedScrollHandler = onScroll 
    ? optimizeScrollHandler(onScroll, options?.scroll) 
    : undefined;
    
  const optimizedMouseMoveHandler = onMouseMove 
    ? optimizeMouseMoveHandler(onMouseMove, options?.mouseMove) 
    : undefined;

  // 최적화된 이벤트 핸들러 적용
  return (
    <div
      onScroll={optimizedScrollHandler as any}
      onClick={options?.click 
        ? useThrottle(onClick as any, options.click.throttle || 300) 
        : onClick
      }
      onMouseMove={optimizedMouseMoveHandler as any}
    >
      {children}
    </div>
  );
}

// 이벤트 최적화 컨텍스트
import { createContext, useContext } from 'react';

interface EventOptimizationContextType {
  debounce: <T extends (...args: any[]) => any>(func: T, delay: number, key?: string) => T;
  throttle: <T extends (...args: any[]) => any>(func: T, limit: number, key?: string) => T;
  debounceLeading: <T extends (...args: any[]) => any>(func: T, delay: number, key?: string) => T;
  throttleDebounce: <T extends (...args: any[]) => any>(func: T, throttleMs: number, debounceMs: number, key?: string) => T;
  addOptimizedListener: (element: HTMLElement, event: string, handler: EventListener, options?: { debounce?: number; throttle?: number; passive?: boolean }) => () => void;
  optimizeScrollHandler: (handler: EventListener, options?: { debounce?: number; throttle?: number; passive?: boolean; useRAF?: boolean }) => EventListener;
  optimizeMouseMoveHandler: (handler: EventListener, options?: { throttle?: number; sampleRate?: number }) => EventListener;
  optimizeKeyboardHandler: (handler: EventListener, options?: { debounce?: number; throttle?: number }) => EventListener;
  clearOptimization: (key: string) => void;
  getStats: () => { debouncedCount: number; throttledCount: number; listenersCount: number };
}

const EventOptimizationContext = createContext<EventOptimizationContextType | undefined>(undefined);

export function EventOptimizationProvider({ children }: { children: React.ReactNode }) {
  const eventOptimizer = useEventOptimization();

  return (
    <EventOptimizationContext.Provider value={eventOptimizer}>
      {children}
    </EventOptimizationContext.Provider>
  );
}

export function useEventOptimizationContext() {
  const context = useContext(EventOptimizationContext);
  if (!context) {
    throw new Error('useEventOptimizationContext must be used within an EventOptimizationProvider');
  }
  return context;
}

// 이벤트 최적화 유틸리티
export const EventOptimizationUtils = {
  // 일반적인 디바운스 시간
  typicalDelays: {
    search: 300,
    resize: 250,
    scroll: 100,
    input: 500,
    apiCall: 1000
  },

  // 일반적인 쓰로틀 시간
  typicalLimits: {
    scroll: 16, // ~60fps
    mouseMove: 50, // ~20fps
    resize: 100,
    animation: 16
  },

  // 이벤트 타입별 최적화 추천
  recommendOptimization: (eventType: string): { debounce?: number; throttle?: number } => {
    switch (eventType) {
      case 'scroll':
      case 'resize':
        return { throttle: 16 };
      case 'input':
      case 'keyup':
      case 'keydown':
        return { debounce: 300 };
      case 'mousemove':
        return { throttle: 50 };
      case 'click':
        return { throttle: 300 };
      default:
        return {};
    }
  }
};