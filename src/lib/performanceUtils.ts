// 성능 최적화 유틸리티

// 디바운스 함수
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  waitFor: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>): void => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), waitFor);
  };
}

// 쓰로틀 함수
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>): void => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// 가상 스크롤링을 위한 유틸리티
export interface VirtualItem {
  index: number;
  start: number;
  size: number;
}

export function calculateRange(
  offset: number,
  limit: number,
  itemSize: number,
  itemCount: number
): VirtualItem[] {
  const startIndex = Math.max(0, Math.floor(offset / itemSize));
  const endIndex = Math.min(
    itemCount - 1,
    Math.ceil((offset + limit) / itemSize)
  );

  const items: VirtualItem[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    items.push({
      index: i,
      start: i * itemSize,
      size: itemSize,
    });
  }

  return items;
}

// 메모이제이션 유틸리티
export function memoize<T extends (...args: any[]) => any>(func: T): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return function (...args: Parameters<T>): ReturnType<T> {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key) as ReturnType<T>;
    }
    
    const result = func.apply(this, args) as ReturnType<T>;
    cache.set(key, result);
    
    return result;
  } as T;
}

// 가벼운 상태 관리 유틸리티
export class SimpleStateManager<T> {
  private state: T;
  private listeners: Array<(state: T) => void> = [];

  constructor(initialState: T) {
    this.state = initialState;
  }

  getState(): T {
    return this.state;
  }

  setState(newState: Partial<T> | ((prevState: T) => Partial<T>)): void {
    const newStateValue =
      typeof newState === 'function' ? newState(this.state) : newState;
    this.state = { ...this.state, ...newStateValue };
    this.notifyListeners();
  }

  subscribe(listener: (state: T) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }
}

// 이미지 지연 로딩 유틸리티
export function lazyLoadImage(src: string, callback: (img: HTMLImageElement) => void) {
  const img = new Image();
  img.onload = () => callback(img);
  img.src = src;
}

// 리소스 사전 로딩 유틸리티
export async function preloadResource(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'fetch';
    link.href = url;
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to preload resource: ${url}`));
    document.head.appendChild(link);
  });
}