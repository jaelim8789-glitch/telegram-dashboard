import React, { useState, useEffect } from 'react';
import { performanceMonitor } from '@/lib/performanceMonitor';

interface PerformanceMetric {
  name: string;
  value: string | number;
  unit?: string;
  status: 'good' | 'warning' | 'critical';
}

export function PerformanceMonitorUI() {
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [issues, setIssues] = useState<string[]>([]);

  useEffect(() => {
    if (!isVisible) return;

    const updateMetrics = () => {
      const currentMetrics = performanceMonitor.getMetrics();
      if (!currentMetrics) return;

      // 현재 성능 지표를 상태에 저장
      const newMetrics: PerformanceMetric[] = [
        {
          name: 'DOM 로딩 시간',
          value: currentMetrics.domContentLoaded,
          unit: 'ms',
          status: currentMetrics.domContentLoaded > 3000 ? 'critical' : currentMetrics.domContentLoaded > 1000 ? 'warning' : 'good'
        },
        {
          name: 'FPS',
          value: currentMetrics.framesPerSecond,
          unit: 'fps',
          status: currentMetrics.framesPerSecond < 30 ? 'critical' : currentMetrics.framesPerSecond < 50 ? 'warning' : 'good'
        },
        {
          name: 'First Paint',
          value: currentMetrics.firstPaint,
          unit: 'ms',
          status: currentMetrics.firstPaint > 1000 ? 'critical' : currentMetrics.firstPaint > 500 ? 'warning' : 'good'
        },
        {
          name: 'FCP',
          value: currentMetrics.firstContentfulPaint,
          unit: 'ms',
          status: currentMetrics.firstContentfulPaint > 1500 ? 'critical' : currentMetrics.firstContentfulPaint > 1000 ? 'warning' : 'good'
        },
        {
          name: 'LCP',
          value: currentMetrics.largestContentfulPaint,
          unit: 'ms',
          status: currentMetrics.largestContentfulPaint > 2500 ? 'critical' : currentMetrics.largestContentfulPaint > 1500 ? 'warning' : 'good'
        },
        {
          name: 'JS 힙 사용량',
          value: (currentMetrics.jsHeapUsed / 1024 / 1024).toFixed(1),
          unit: 'MB',
          status: (currentMetrics.jsHeapUsed / currentMetrics.jsHeapLimit) > 0.8 ? 'critical' : (currentMetrics.jsHeapUsed / currentMetrics.jsHeapLimit) > 0.6 ? 'warning' : 'good'
        }
      ];

      setMetrics(newMetrics);

      // 성능 이슈 감지
      const perfIssues = performanceMonitor.detectPerformanceIssues();
      setIssues(perfIssues.issues);
    };

    // 1초마다 업데이트
    const interval = setInterval(updateMetrics, 1000);
    updateMetrics(); // 초기 호출

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-2 rounded-full shadow-lg z-50"
        aria-label="성능 모니터링 보기"
      >
        ⚡
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-xl z-50 max-w-md w-full">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold">성능 모니터링</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ×
        </button>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {metrics.map((metric, index) => (
          <div key={index} className="flex justify-between items-center text-sm">
            <span className="text-gray-300">{metric.name}</span>
            <span className={`font-mono ${
              metric.status === 'good' ? 'text-green-400' :
              metric.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {metric.value}{metric.unit}
            </span>
          </div>
        ))}

        {issues.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <h4 className="font-bold text-red-400 mb-2">성능 이슈:</h4>
            <ul className="space-y-1 text-xs">
              {issues.map((issue, i) => (
                <li key={i} className="text-red-300 flex items-start">
                  <span className="mr-1">•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-3 text-xs text-gray-400">
        실시간 성능 모니터링 - 개발용
      </div>
    </div>
  );
}