import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export interface PerformanceMetrics {
  cls: number | null;
  fid: number | null;
  fcp: number | null;
  lcp: number | null;
  ttfb: number | null;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    cls: null,
    fid: null,
    fcp: null,
    lcp: null,
    ttfb: null
  };

  private observers: PerformanceObserver[] = [];

  init() {
    // Core Web Vitals 수집
    getCLS(this.handleCLS);
    getFID(this.handleFID);
    getFCP(this.handleFCP);
    getLCP(this.handleLCP);
    getTTFB(this.handleTTFB);

    // 성능 타임라인 이벤트 수집
    this.observePaint();
    this.observeNavigation();
  }

  private handleCLS = (metric: any) => {
    this.metrics.cls = metric.value;
    this.reportMetric('CLS', metric.value);
  };

  private handleFID = (metric: any) => {
    this.metrics.fid = metric.value;
    this.reportMetric('FID', metric.value);
  };

  private handleFCP = (metric: any) => {
    this.metrics.fcp = metric.value;
    this.reportMetric('FCP', metric.value);
  };

  private handleLCP = (metric: any) => {
    this.metrics.lcp = metric.value;
    this.reportMetric('LCP', metric.value);
  };

  private handleTTFB = (metric: any) => {
    this.metrics.ttfb = metric.value;
    this.reportMetric('TTFB', metric.value);
  };

  private observePaint = () => {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name === 'first-paint') {
            this.reportMetric('FP', entry.startTime);
          } else if (entry.name === 'first-contentful-paint') {
            this.reportMetric('FCP', entry.startTime);
          }
        });
      });
      observer.observe({ entryTypes: ['paint'] });
      this.observers.push(observer);
    }
  };

  private observeNavigation = () => {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.reportMetric('Navigation', {
            url: (entry as PerformanceNavigationTiming).name,
            loadTime: entry.loadEventEnd - entry.loadEventStart,
            domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart
          });
        });
      });
      observer.observe({ entryTypes: ['navigation'] });
      this.observers.push(observer);
    }
  };

  private reportMetric(name: string, value: any) {
    // 성능 메트릭을 콘솔에 로깅 (실제 배포 시에는 분석 서버로 전송)
    if (process.env.NODE_ENV === 'development') {
      console.group(`📊 ${name} Metric`);
      console.log('Value:', value);
      console.log('Timestamp:', new Date().toISOString());
      console.groupEnd();
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }

  // 성능 테스트를 위한 메서드
  simulateHeavyTask(duration: number) {
    const start = performance.now();
    while (performance.now() - start < duration) {
      // CPU 바인딩 작업 시뮬레이션
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();

// 앱 시작 시 초기화
if (typeof window !== 'undefined') {
  performanceMonitor.init();
}