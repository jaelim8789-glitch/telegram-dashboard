'use client';

import { useEffect, useState } from 'react';
import { PerformanceMonitor } from '@/lib/mobileOptimization';

export function MobilePerformanceMonitor() {
  const [fps, setFps] = useState<number | null>(null);
  const [memory, setMemory] = useState<{ used: number; total: number; percentage: number } | null>(null);
  const [battery, setBattery] = useState<{ level: number; charging: boolean } | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const perfMonitor = PerformanceMonitor.getInstance();
    
    // FPS ëª¨ë‹ˆ?°ë§
    const stopFPS = perfMonitor.startFPSMonitoring(setFps);
    
    // ë©”ëª¨ë¦??¬ìš©??ì£¼ê¸°?ìœ¼ë¡??•ì¸
    const memoryInterval = setInterval(() => {
      const mem = perfMonitor.getMemoryUsage();
      if (mem) {
        setMemory(mem);
      }
    }, 5000);
    
    // ë°°í„°ë¦??íƒœ ?•ì¸
    const batteryCheck = async () => {
      const batteryStatus = await perfMonitor.getBatteryStatus();
      if (batteryStatus) {
        setBattery(batteryStatus);
      }
    };
    batteryCheck();
    
    // ëª¨ë°”???˜ê²½?ì„œë§??œì‹œ
    if (window.matchMedia('(max-width: 768px)').matches) {
      setIsVisible(true);
    }
    
    return () => {
      stopFPS();
      clearInterval(memoryInterval);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 bg-black/80 text-white text-xs p-2 rounded-lg pointer-events-none">
      <div>FPS: {fps !== null ? fps : 'N/A'}</div>
      {memory && (
        <div>Mem: {Math.round(memory.percentage)}%</div>
      )}
      {battery && (
        <div>Bat: {battery.level}% {battery.charging ? '?? : ''}</div>
      )}
    </div>
  );
}
