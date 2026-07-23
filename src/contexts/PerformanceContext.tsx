"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiCache } from '@/lib/apiCache';
import { performanceMonitor } from '@/lib/performanceMonitor';

interface PerformanceContextType {
  isOptimized: boolean;
  setIsOptimized: (optimized: boolean) => void;
  cache: typeof apiCache;
  monitor: typeof performanceMonitor;
  clearCache: () => void;
  forceGC: () => void;
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined);

interface PerformanceProviderProps {
  children: ReactNode;
}

export function PerformanceProvider({ children }: PerformanceProviderProps) {
  const [isOptimized, setIsOptimized] = useState(true);

  // 컴포?�트 마운?????�능 모니?�링 ?�작
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      performanceMonitor.startMonitoring();
    }

    return () => {
      performanceMonitor.stopMonitoring();
    };
  }, []);

  // 캐시 ?�리 ?�수
  const clearCache = () => {
    apiCache.clear();
  };

  // 가비�? 컬렉???�도 (브라?��?가 지?�하??경우)
  const forceGC = () => {
    if ((window as any).gc) {
      (window as any).gc();
    }
  };

  const value: PerformanceContextType = {
    isOptimized,
    setIsOptimized,
    cache: apiCache,
    monitor: performanceMonitor,
    clearCache,
    forceGC
  };

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
}

export function usePerformance() {
  const context = useContext(PerformanceContext);
  if (context === undefined) {
    throw new Error('usePerformance must be used within a PerformanceProvider');
  }
  return context;
}

// ?�능 최적??HOC
export function withPerformance<P extends Record<string, any>>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return function WithPerformance(props: P) {
    return (
      <PerformanceProvider>
        <Component {...props} />
      </PerformanceProvider>
    );
  };
}