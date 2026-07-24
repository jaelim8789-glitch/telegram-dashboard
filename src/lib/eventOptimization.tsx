"use client";
// ?´ë²¤??ìµì ???´ë??
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

  // ?ë°?´ì± ?¨ì
  public debounce<T extends (...args: unknown[]) => any>(
    func: T,
    delay: number,
    key?: string
  ): T {
    const identifier = key || func.toString();
    
    return ((...args: unknown[]) => {
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

  // ?°ë¡?ë§??¨ì
  public throttle<T extends (...args: unknown[]) => any>(
    func: T,
    limit: number,
    key?: string
  ): T {
    const identifier = key || func.toString();
    
    return ((...args: unknown[]) => {
      const now = Date.now();
      const existing = this.throttledFunctions.get(identifier);
      
      if (!existing || !existing.lastExecuted || now - existing.lastExecuted >= limit) {
        func.apply(this, args);
        this.throttledFunctions.set(identifier, { func, lastExecuted: now });
      }
    }) as T;
  }

  // ì¦ì ?¤í ê°?¥í ?ë°?´ì± (leading edge)
  public debounceLeading<T extends (...args: unknown[]) => any>(
    func: T,
    delay: number,
    key?: string
  ): T {
    const identifier = key || func.toString();
    let timeoutId: NodeJS.Timeout | null = null;
    let lastExecuted = 0;
    
    return ((...args: unknown[]) => {
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

  // ?°ë¡?ë§?+ ?ë°?´ì± ì¡°í©
  public throttleDebounce<T extends (...args: unknown[]) => any>(
    func: T,
    throttleMs: number,
    debounceMs: number,
    key?: string
  ): T {
    const throttled = this.throttle(func, throttleMs, `${key}_throttle`);
    return this.debounce(throttled, debounceMs, `${key}_debounce`);
  }

  // ?´ë²¤??ë¦¬ì¤??ìµì ??
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
    
    // ?´ë¦°???¨ì ë°í
    const cleanup = () => {
      element.removeEventListener(event, optimizedHandler, finalOptions);
    };
    
    this.listeners.push({ element, event, handler: optimizedHandler });
    
    return cleanup;
  }

  // ?¤í¬ë¡??´ë²¤??ìµì ??
  public optimizeScrollHandler(
    handler: EventListener,
    options?: { 
      debounce?: number; 
      throttle?: number; 
      passive?: boolean; 
      useRAF?: boolean // requestAnimationFrame ?¬ì© ?¬ë?
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

  // ë§ì°?¤ë¬´ë¸??´ë²¤??ìµì ??
  public optimizeMouseMoveHandler(
    handler: EventListener,
    options?: { 
      throttle?: number; 
      sampleRate?: number; // ?íë§?ë¹ì¨ (?? 0.5??50%ë§?ì²ë¦¬)
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

  // ?¤ë³´???´ë²¤??ìµì ??
  public optimizeKeyboardHandler(
    handler: EventListener,
    options?: { debounce?: number; throttle?: number }
  ): EventListener {
    const { debounce, throttle } = options || {};
    
    let optimizedHandler: EventListener = handler;
    
    // ?ë ¥ ?´ë²¤?¸ë ?¼ë°?ì¼ë¡??ë°?´ì±?????ì ??
    if (debounce) {
      optimizedHandler = this.debounce(optimizedHandler as any, debounce) as EventListener;
    }
    
    if (throttle) {
      optimizedHandler = this.throttle(optimizedHandler as any, throttle) as EventListener;
    }
    
    return optimizedHandler;
  }

  // ?´ë²¤??ë²ë¸ë§?ìµì ??
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

  // ëª¨ë  ìµì ?ë ?´ë²¤??ë¦¬ì¤???ë¦¬
  public clearAllOptimizations(): void {
    // ?ë°?´ì¤ ?¨ì ?ë¦¬
    for (const [key, { timeoutId }] of this.debouncedFunctions) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
    this.debouncedFunctions.clear();
    
    // ?°ë¡? ?¨ì ?ë¦¬
    this.throttledFunctions.clear();
    
    // ?´ë²¤??ë¦¬ì¤???ë¦¬
    for (const listener of this.listeners) {
      listener.element.removeEventListener(listener.event, listener.handler as EventListener);
    }
    this.listeners = [];
  }

  // ?¹ì  ?¤ì ????ë°?´ì¤/?°ë¡? ?ë¦¬
  public clearOptimization(key: string): void {
    const debounced = this.debouncedFunctions.get(key);
    if (debounced && debounced.timeoutId) {
      clearTimeout(debounced.timeoutId);
    }
    this.debouncedFunctions.delete(key);
    this.throttledFunctions.delete(key);
  }

  // ?±ë¥ ëª¨ë?°ë§
  public getStats() {
    return {
      debouncedCount: this.debouncedFunctions.size,
      throttledCount: this.throttledFunctions.size,
      listenersCount: this.listeners.length
    };
  }
}

// ?´ë²¤??ìµì ????
import { useState, useEffect, useRef, useCallback } from "react";

export function useThrottledCallback<T extends (...args: unknown[]) => any>(
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

export function useDebouncedCallback<T extends (...args: unknown[]) => any>(
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
      // ?ì : ?µì ê°ì²´ë¥??¬ë°ë¥´ê² ?ë¬
      element.removeEventListener(event, optimizedHandler, options);
    };
  }, [element, event, handler, options]);
}

export function useEventOptimization() {
  const optimizerRef = useRef(EventOptimizer.getInstance());
  const callbacksRef = useRef(new Map<string, Function>());

  const debounce = useCallback(<T extends (...args: unknown[]) => any>(
    func: T,
    delay: number,
    key?: string
  ): T => {
    return optimizerRef.current.debounce(func, delay, key);
  }, []);

  const throttle = useCallback(<T extends (...args: unknown[]) => any>(
    func: T,
    limit: number,
    key?: string
  ): T => {
    return optimizerRef.current.throttle(func, limit, key);
  }, []);

  const debounceLeading = useCallback(<T extends (...args: unknown[]) => any>(
    func: T,
    delay: number,
    key?: string
  ): T => {
    return optimizerRef.current.debounceLeading(func, delay, key);
  }, []);

  const throttleDebounce = useCallback(<T extends (...args: unknown[]) => any>(
    func: T,
    throttleMs: number,
    debounceMs: number,
    key?: string
  ): T => {
    return optimizerRef.current.throttleDebounce(func, throttleMs, debounceMs, key);
  }, []);

  // ì»´í¬?í¸ ?¸ë§?´í¸ ??ìµì ???ë¦¬
  useEffect(() => {
    return () => {
      // ??ì»´í¬?í¸?ì ?ì±??ì½ë°±?¤ë§ ?ë¦¬
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

// ?ë°?´ì¤ ??
export function useDebounce<T extends (...args: unknown[]) => any>(
  func: T,
  delay: number,
  key?: string
): T {
  const { debounce } = useEventOptimization();
  return debounce(func, delay, key);
}

// ?°ë¡? ??
export function useThrottle<T extends (...args: unknown[]) => any>(
  func: T,
  limit: number,
  key?: string
): T {
  const { throttle } = useEventOptimization();
  return throttle(func, limit, key);
}

// ?°ë¡???ê°???
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

// ?¤í¬ë¡??´ë²¤??ìµì ????
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

// ?´ë²¤??ìµì ??ì»´í¬?í¸
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

  // ìµì ?ë ?´ë²¤???¸ë¤???ì©
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

// ?´ë²¤??ìµì ??ì»¨í?¤í¸
import { createContext, useContext } from 'react';

interface EventOptimizationContextType {
  debounce: <T extends (...args: unknown[]) => any>(func: T, delay: number, key?: string) => T;
  throttle: <T extends (...args: unknown[]) => any>(func: T, limit: number, key?: string) => T;
  debounceLeading: <T extends (...args: unknown[]) => any>(func: T, delay: number, key?: string) => T;
  throttleDebounce: <T extends (...args: unknown[]) => any>(func: T, throttleMs: number, debounceMs: number, key?: string) => T;
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

// ?´ë²¤??ìµì ??? í¸ë¦¬í°
export const EventOptimizationUtils = {
  // ?¼ë°?ì¸ ?ë°?´ì¤ ?ê°
  typicalDelays: {
    search: 300,
    resize: 250,
    scroll: 100,
    input: 500,
    apiCall: 1000
  },

  // ?¼ë°?ì¸ ?°ë¡? ?ê°
  typicalLimits: {
    scroll: 16, // ~60fps
    mouseMove: 50, // ~20fps
    resize: 100,
    animation: 16
  },

  // ?´ë²¤????ë³ ìµì ??ì¶ì²
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