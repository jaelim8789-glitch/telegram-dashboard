// 성능 모니터링 시스템
export interface PerformanceMetric {
  id: string;
  timestamp: number;
  metricType: 'load_time' | 'api_call' | 'render_time' | 'memory_usage' | 'fps';
  value: number;
  unit: string;
  context: string;
  details?: Record<string, any>;
}

export interface PerformanceThreshold {
  metricType: string;
  warningThreshold: number;
  errorThreshold: number;
  unit: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics = 100; // 최대 메트릭 수
  private readonly thresholds: PerformanceThreshold[] = [
    { metricType: 'load_time', warningThreshold: 3000, errorThreshold: 5000, unit: 'ms' },
    { metricType: 'api_call', warningThreshold: 2000, errorThreshold: 5000, unit: 'ms' },
    { metricType: 'render_time', warningThreshold: 100, errorThreshold: 200, unit: 'ms' },
    { metricType: 'memory_usage', warningThreshold: 100, errorThreshold: 200, unit: 'MB' },
  ];
  
  // 성능 메트릭 기록
  recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>) {
    const performanceMetric: PerformanceMetric = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      ...metric
    };

    this.metrics.push(performanceMetric);
    
    // 최대 메트릭 수 초과 시 오래된 메트릭 제거
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // 성능 임계값 확인
    this.checkThresholds(performanceMetric);
    
    console.debug('성능 메트릭 기록:', performanceMetric);
  }

  // API 호출 시간 측정
  async measureApiCall<T>(
    endpoint: string, 
    call: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    let result: T;
    let error: any;

    try {
      result = await call();
      return result;
    } catch (err) {
      error = err;
      throw err;
    } finally {
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.recordMetric({
        metricType: 'api_call',
        value: duration,
        unit: 'ms',
        context: endpoint,
        details: {
          success: !error,
          error: error?.message
        }
      });
    }
  }

  // 렌더링 시간 측정
  measureRender(
    componentName: string,
    render: () => React.ReactNode
  ): { element: React.ReactNode; renderTime: number } {
    const startTime = performance.now();
    const element = render();
    const endTime = performance.now();
    const renderTime = endTime - startTime;

    this.recordMetric({
      metricType: 'render_time',
      value: renderTime,
      unit: 'ms',
      context: componentName
    });

    return { element, renderTime };
  }

  // 로드 시간 측정
  measureLoadTime(context: string, loadFunction: () => Promise<any>): Promise<any> {
    const startTime = performance.now();
    
    return loadFunction().finally(() => {
      const endTime = performance.now();
      const loadTime = endTime - startTime;

      this.recordMetric({
        metricType: 'load_time',
        value: loadTime,
        unit: 'ms',
        context
      });
    });
  }

  // 성능 임계값 확인
  private checkThresholds(metric: PerformanceMetric) {
    const threshold = this.thresholds.find(t => t.metricType === metric.metricType);
    if (!threshold) return;

    let level: 'info' | 'warn' | 'error' = 'info';
    
    if (metric.value >= threshold.errorThreshold) {
      level = 'error';
    } else if (metric.value >= threshold.warningThreshold) {
      level = 'warn';
    }

    if (level !== 'info') {
      console[level](`성능 경고: ${metric.metricType} ${metric.value}${threshold.unit} (임계값: ${threshold.warningThreshold}-${threshold.errorThreshold}${threshold.unit})`, {
        context: metric.context,
        details: metric.details
      });
    }
  }

  // 성능 요약 가져오기
  getPerformanceSummary(): {
    averageLoadTime: number;
    averageApiTime: number;
    averageRenderTime: number;
    memoryUsage: number;
    fps: number;
  } {
    const loadTimes = this.metrics
      .filter(m => m.metricType === 'load_time')
      .map(m => m.value);
    
    const apiTimes = this.metrics
      .filter(m => m.metricType === 'api_call')
      .map(m => m.value);
    
    const renderTimes = this.metrics
      .filter(m => m.metricType === 'render_time')
      .map(m => m.value);

    return {
      averageLoadTime: loadTimes.length > 0 ? loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length : 0,
      averageApiTime: apiTimes.length > 0 ? apiTimes.reduce((a, b) => a + b, 0) / apiTimes.length : 0,
      averageRenderTime: renderTimes.length > 0 ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length : 0,
      memoryUsage: performance.memory ? performance.memory.usedJSHeapSize / 1024 / 1024 : 0, // MB
      fps: 60 // 실제 FPS는 별도로 측정 필요
    };
  }

  // 성능 데이터 리셋
  resetMetrics() {
    this.metrics = [];
  }

  // 성능 데이터 내보내기
  exportMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  // 현재 메모리 사용량 측정
  getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  // FPS 측정
  measureFPS(callback: (fps: number) => void) {
    let lastTime = performance.now();
    let frames = 0;
    
    const calculateFPS = (currentTime: number) => {
      frames++;
      if (currentTime - lastTime >= 1000) {
        callback(Math.round((frames * 1000) / (currentTime - lastTime)));
        frames = 0;
        lastTime = currentTime;
      }
      requestAnimationFrame(calculateFPS);
    };
    
    requestAnimationFrame(calculateFPS);
  }
}

// 전역 인스턴스 생성
export const performanceMonitor = new PerformanceMonitor();