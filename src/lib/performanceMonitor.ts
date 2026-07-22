/**
 * 성능 모니터링 유틸리티
 * 웹사이트 성능 지표를 수집하고 분석합니다.
 */

interface PerformanceMetrics {
  // 로딩 성능
  navigationStart: number;
  domContentLoaded: number;
  loadComplete: number;
  firstPaint: number;
  firstContentfulPaint: number;
  
  // 렌더링 성능
  framesPerSecond: number;
  totalBlockingTime: number;
  largestContentfulPaint: number;
  
  // 네트워크 성능
  dnsLookupTime: number;
  tcpConnectTime: number;
  requestResponseTime: number;
  domProcessingTime: number;
  
  // 메모리 사용량
  jsHeapUsed: number;
  jsHeapTotal: number;
  jsHeapLimit: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics | null = null;
  private observers: PerformanceObserver[] = [];
  private fpsInterval: number | null = null;
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private fpsCallback: ((fps: number) => void) | null = null;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * 성능 측정 시작
   */
  startMonitoring(): void {
    // 성능 데이터 수집
    this.collectPerformanceMetrics();
    
    // FPS 측정 시작
    this.startFPSMonitoring();
  }

  /**
   * 성능 데이터 수집
   */
  private collectPerformanceMetrics(): void {
    // Navigation Timing API를 사용하여 로딩 성능 측정
    const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    // Paint Timing API를 사용하여 렌더링 성능 측정
    const paintEntries = performance.getEntriesByType('paint');
    
    // Memory API를 사용하여 메모리 사용량 측정 (브라우저 호환성에 따라 다름)
    const memoryInfo = (performance as any).memory || {};
    
    // Navigation Timing 데이터
    this.metrics = {
      navigationStart: perfData?.navigationStart || 0,
      domContentLoaded: perfData?.domContentLoadedEventEnd - perfData?.navigationStart || 0,
      loadComplete: perfData?.loadEventEnd - perfData?.navigationStart || 0,
      firstPaint: 0, // Paint Timing에서 가져옴
      firstContentfulPaint: 0, // Paint Timing에서 가져옴
      
      // 렌더링 성능 (FPS는 별도 측정)
      framesPerSecond: 0,
      totalBlockingTime: perfData?.domInteractive - perfData?.responseEnd || 0,
      largestContentfulPaint: 0, // LCP는 별도 측정
      
      // 네트워크 성능
      dnsLookupTime: perfData?.domainLookupEnd - perfData?.domainLookupStart || 0,
      tcpConnectTime: perfData?.connectEnd - perfData?.connectStart || 0,
      requestResponseTime: perfData?.responseEnd - perfData?.requestStart || 0,
      domProcessingTime: perfData?.domComplete - perfData?.domInteractive || 0,
      
      // 메모리 사용량
      jsHeapUsed: memoryInfo.usedJSHeapSize || 0,
      jsHeapTotal: memoryInfo.totalJSHeapSize || 0,
      jsHeapLimit: memoryInfo.jsHeapSizeLimit || 0
    };

    // Paint Timing 데이터 추가
    paintEntries.forEach((entry: PerformanceEntry) => {
      if (entry.name === 'first-paint') {
        this.metrics!.firstPaint = entry.startTime;
      } else if (entry.name === 'first-contentful-paint') {
        this.metrics!.firstContentfulPaint = entry.startTime;
      }
    });

    // Largest Contentful Paint (LCP) 측정
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.metrics!.largestContentfulPaint = lastEntry.startTime;
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    this.observers.push(lcpObserver);
  }

  /**
   * FPS 측정 시작
   */
  private startFPSMonitoring(): void {
    let lastTime = performance.now();
    let frameCount = 0;
    let fps = 0;

    const updateFPS = (currentTime: number) => {
      frameCount++;

      if (currentTime - lastTime >= 1000) {
        fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        this.metrics!.framesPerSecond = fps;

        if (this.fpsCallback) {
          this.fpsCallback(fps);
        }

        frameCount = 0;
        lastTime = currentTime;
      }

      this.fpsInterval = requestAnimationFrame(updateFPS) as unknown as number;
    };

    this.fpsInterval = requestAnimationFrame(updateFPS) as unknown as number;
  }

  /**
   * FPS 측정 콜백 등록
   */
  onFPSUpdate(callback: (fps: number) => void): void {
    this.fpsCallback = callback;
  }

  /**
   * 현재 성능 지표 반환
   */
  getMetrics(): PerformanceMetrics | null {
    return this.metrics;
  }

  /**
   * 성능 지표 리셋
   */
  resetMetrics(): void {
    this.metrics = null;
  }

  /**
   * 성능 이슈 감지
   */
  detectPerformanceIssues(): {
    slowLoading: boolean;
    lowFPS: boolean;
    highMemoryUsage: boolean;
    issues: string[];
  } {
    if (!this.metrics) {
      return {
        slowLoading: false,
        lowFPS: false,
        highMemoryUsage: false,
        issues: ['성능 데이터가 수집되지 않았습니다.']
      };
    }

    const issues: string[] = [];

    // 로딩 속도가 느린지 확인 (기준: 3초 이상)
    const slowLoading = this.metrics.domContentLoaded > 3000;
    if (slowLoading) {
      issues.push(`DOM 로딩 시간이 ${this.metrics.domContentLoaded}ms로 느립니다. (기준: 3000ms)`);
    }

    // FPS가 낮은지 확인 (기준: 30fps 이하)
    const lowFPS = this.metrics.framesPerSecond < 30;
    if (lowFPS) {
      issues.push(`FPS가 ${this.metrics.framesPerSecond}로 낮습니다. (기준: 30fps)`);
    }

    // 메모리 사용량이 높은지 확인 (기준: 80% 이상)
    const memoryUsageRatio = this.metrics.jsHeapTotal / this.metrics.jsHeapLimit;
    const highMemoryUsage = memoryUsageRatio > 0.8;
    if (highMemoryUsage) {
      issues.push(`메모리 사용량이 ${(memoryUsageRatio * 100).toFixed(1)}%로 높습니다. (기준: 80%)`);
    }

    return {
      slowLoading,
      lowFPS,
      highMemoryUsage,
      issues
    };
  }

  /**
   * 성능 보고서 생성
   */
  generateReport(): string {
    if (!this.metrics) {
      return '성능 데이터가 수집되지 않았습니다.';
    }

    const { slowLoading, lowFPS, highMemoryUsage, issues } = this.detectPerformanceIssues();

    return `
=== 성능 보고서 ===
로딩 성능:
- DOM 로딩 시간: ${this.metrics.domContentLoaded}ms
- 전체 로딩 시간: ${this.metrics.loadComplete}ms
- First Paint: ${this.metrics.firstPaint}ms
- First Contentful Paint: ${this.metrics.firstContentfulPaint}ms

렌더링 성능:
- 평균 FPS: ${this.metrics.framesPerSecond}fps
- Total Blocking Time: ${this.metrics.totalBlockingTime}ms
- Largest Contentful Paint: ${this.metrics.largestContentfulPaint}ms

네트워크 성능:
- DNS 조회 시간: ${this.metrics.dnsLookupTime}ms
- TCP 연결 시간: ${this.metrics.tcpConnectTime}ms
- 요청 응답 시간: ${this.metrics.requestResponseTime}ms

메모리 사용량:
- JS 힙 사용량: ${this.metrics.jsHeapUsed} bytes
- JS 힙 총량: ${this.metrics.jsHeapTotal} bytes
- JS 힙 제한: ${this.metrics.jsHeapLimit} bytes

성능 이슈:
- 느린 로딩: ${slowLoading ? '감지됨' : '없음'}
- 낮은 FPS: ${lowFPS ? '감지됨' : '없음'}
- 높은 메모리 사용: ${highMemoryUsage ? '감지됨' : '없음'}

상세 이슈:
${issues.length > 0 ? issues.map(issue => `- ${issue}`).join('\n') : '- 없음'}
    `.trim();
  }

  /**
   * 모니터링 종료
   */
  stopMonitoring(): void {
    // FPS 모니터링 종료
    if (this.fpsInterval) {
      cancelAnimationFrame(this.fpsInterval as number);
      this.fpsInterval = null;
    }

    // 성능 옵저버 종료
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// 싱글톤 인스턴스
export const performanceMonitor = PerformanceMonitor.getInstance();

/**
 * 성능 모니터링 컴포넌트
 * 개발 중에 실시간으로 성능 지표를 확인할 수 있습니다.
 */
export function PerformanceOverlay(): React.ReactElement | null {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const [metrics, setMetrics] = React.useState<PerformanceMetrics | null>(null);
  const [issues, setIssues] = React.useState<{ issues: string[] }>({ issues: [] });

  React.useEffect(() => {
    performanceMonitor.onFPSUpdate(() => {
      setMetrics(performanceMonitor.getMetrics());
      setIssues(performanceMonitor.detectPerformanceIssues());
    });

    // 주기적으로 성능 데이터 업데이트
    const interval = setInterval(() => {
      setMetrics(performanceMonitor.getMetrics());
      setIssues(performanceMonitor.detectPerformanceIssues());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!metrics) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white text-xs p-3 rounded-lg z-50 font-mono max-w-xs">
      <div>FPS: {metrics.framesPerSecond}</div>
      <div>DOM Load: {metrics.domContentLoaded}ms</div>
      <div>Memory: {((metrics.jsHeapUsed / 1024 / 1024)).toFixed(1)}MB</div>
      {issues.issues.length > 0 && (
        <div className="mt-2 text-red-400">
          {issues.issues.slice(0, 2).map((issue, i) => (
            <div key={i}>• {issue}</div>
          ))}
        </div>
      )}
    </div>
  );
}