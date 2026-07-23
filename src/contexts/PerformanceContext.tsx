"use client";
import { createContext, useContext, useState } from "react";

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  clearCache: () => void;
}

export const PerformanceContext = createContext<PerformanceMetrics>({
  fps: 60,
  memoryUsage: 0,
  clearCache: () => {},
});

export function PerformanceProvider({ children }: { children: React.ReactNode }) {
  const [fps] = useState(60);
  const [memoryUsage] = useState(0);
  const clearCache = () => {};

  return (
    <PerformanceContext.Provider value={{ fps, memoryUsage, clearCache }}>
      {children}
    </PerformanceContext.Provider>
  );
}

export function usePerformanceContext() {
  return useContext(PerformanceContext);
}
