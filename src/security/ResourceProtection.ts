import os from 'os';
import { NextApiRequest, NextApiResponse } from 'next';
import { securityLogger } from '../logging/securityLogger';
import { apiSecurityManager } from './ApiSecurity';

export interface ResourceLimits {
  cpuPercent: number; // CPU 사용률 제한 (%)
  memoryPercent: number; // 메모리 사용률 제한 (%)
  maxConcurrentRequests: number; // 최대 동시 요청 수
  maxHeapUsedBytes: number; // 최대 힙 사용량 (바이트)
  maxRssBytes: number; // 최대 RSS (Resident Set Size) 바이트
}

export interface LoadSheddingConfig {
  cpuThreshold: number; // CPU 사용률 임계값 (%)
  memoryThreshold: number; // 메모리 사용률 임계값 (%)
  heapUsedThreshold: number; // 힙 사용량 임계값 (바이트)
  responseCode: number; // 부하 시 응답 코드 (기본 503)
  backoffTime: number; // 백오프 시간 (밀리초)
}

export class ResourceProtection {
  private resourceLimits: ResourceLimits;
  private loadSheddingConfig: LoadSheddingConfig;
  private concurrentRequests: number = 0;
  private peakConcurrentRequests: number = 0;
  private startTime: number = Date.now();
  private requestQueue: Array<() => void> = [];
  private isProcessingQueue: boolean = false;

  constructor(limits?: Partial<ResourceLimits>, config?: Partial<LoadSheddingConfig>) {
    this.resourceLimits = {
      cpuPercent: limits?.cpuPercent || 80,
      memoryPercent: limits?.memoryPercent || 85,
      maxConcurrentRequests: limits?.maxConcurrentRequests || 100,
      maxHeapUsedBytes: limits?.maxHeapUsedBytes || 512 * 1024 * 1024, // 512MB
      maxRssBytes: limits?.maxRssBytes || 1024 * 1024 * 1024, // 1GB
      ...limits
    };

    this.loadSheddingConfig = {
      cpuThreshold: config?.cpuThreshold || 80,
      memoryThreshold: config?.memoryThreshold || 85,
      heapUsedThreshold: config?.heapUsedThreshold || 512 * 1024 * 1024,
      responseCode: config?.responseCode || 503,
      backoffTime: config?.backoffTime || 1000,
      ...config
    };
  }

  // 시스템 리소스 사용량 확인
  getSystemUsage(): {
    cpuPercent: number;
    memoryPercent: number;
    heapUsed: number;
    rss: number;
    uptime: number;
    concurrentRequests: number;
  } {
    const cpus = os.cpus();
    const totalCpuTime = cpus.reduce((acc, cpu) => {
      const times = Object.values(cpu.times);
      return acc + times.reduce((sum, time) => sum + time, 0);
    }, 0);
    
    const avgCpuUsage = cpus.length > 0 ? 
      cpus.reduce((acc, cpu) => acc + (cpu.times.idle / (Object.values(cpu.times).reduce((sum, time) => sum + time, 0))), 0) / cpus.length 
      : 0;
    
    const cpuPercent = (1 - avgCpuUsage) * 100;
    
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryPercent = (usedMemory / totalMemory) * 100;

    const memoryUsage = process.memoryUsage();
    
    return {
      cpuPercent,
      memoryPercent,
      heapUsed: memoryUsage.heapUsed,
      rss: memoryUsage.rss,
      uptime: process.uptime(),
      concurrentRequests: this.concurrentRequests
    };
  }

  // 과부하 상태 확인
  isOverloaded(): boolean {
    const usage = this.getSystemUsage();
    
    return usage.cpuPercent > this.loadSheddingConfig.cpuThreshold ||
           usage.memoryPercent > this.loadSheddingConfig.memoryThreshold ||
           usage.heapUsed > this.loadSheddingConfig.heapUsedThreshold ||
           this.concurrentRequests > this.resourceLimits.maxConcurrentRequests;
  }

  // 요청 허용 여부 확인
  canAcceptRequest(): boolean {
    return !this.isOverloaded() && 
           this.concurrentRequests < this.resourceLimits.maxConcurrentRequests;
  }

  // 요청 시작
  startRequest(): boolean {
    if (!this.canAcceptRequest()) {
      // 요청 큐에 추가
      return false;
    }

    this.concurrentRequests++;
    if (this.concurrentRequests > this.peakConcurrentRequests) {
      this.peakConcurrentRequests = this.concurrentRequests;
    }

    return true;
  }

  // 요청 종료
  endRequest(): void {
    this.concurrentRequests = Math.max(0, this.concurrentRequests - 1);
    
    // 큐에 대기 중인 요청 처리
    this.processQueue();
  }

  // 요청 큐에 추가
  enqueueRequest(req: NextApiRequest, res: NextApiResponse, next: () => void): void {
    this.requestQueue.push(() => {
      if (this.startRequest()) {
        next();
      } else {
        // 여전히 과부하 상태면 다시 큐에 추가
        this.requestQueue.push(() => this.handleRequest(req, res, next));
      }
    });
    
    this.processQueue();
  }

  // 큐 처리
  private processQueue(): void {
    if (this.isProcessingQueue || this.requestQueue.length === 0 || !this.canAcceptRequest()) {
      return;
    }

    this.isProcessingQueue = true;
    
    // 처리 가능한 만큼 큐에서 요청 처리
    while (this.requestQueue.length > 0 && this.canAcceptRequest()) {
      const requestHandler = this.requestQueue.shift();
      if (requestHandler && this.startRequest()) {
        requestHandler();
      }
    }

    this.isProcessingQueue = false;
  }

  // 요청 처리 핸들러
  private handleRequest(req: NextApiRequest, res: NextApiResponse, next: () => void): void {
    if (this.startRequest()) {
      // 요청 처리 후 종료
      const finishHandler = () => {
        this.endRequest();
      };

      res.on('finish', finishHandler);
      res.on('close', finishHandler);
      res.on('error', finishHandler);

      next();
    } else {
      // 과부하 상태면 서비스 불가 응답
      res.status(this.loadSheddingConfig.responseCode).json({
        error: 'Service temporarily unavailable due to high load',
        retryAfter: this.loadSheddingConfig.backoffTime / 1000
      });

      // 로그 기록
      securityLogger.logSystemAnomaly('high-load-rejection', 'high', {
        concurrentRequests: this.concurrentRequests,
        cpuPercent: this.getSystemUsage().cpuPercent,
        memoryPercent: this.getSystemUsage().memoryPercent
      });
    }
  }

  // 과부하 보호 미들웨어
  overloadProtection(req: NextApiRequest, res: NextApiResponse, next: () => void): void {
    // 과부하 상태 확인
    if (this.isOverloaded()) {
      // 백오프 전략 적용
      setTimeout(() => {
        if (this.canAcceptRequest()) {
          this.handleRequest(req, res, next);
        } else {
          res.status(this.loadSheddingConfig.responseCode).json({
            error: 'Service temporarily unavailable due to high load',
            retryAfter: this.loadSheddingConfig.backoffTime / 1000
          });
        }
      }, this.loadSheddingConfig.backoffTime);
      return;
    }

    // 정상적인 요청 처리
    this.handleRequest(req, res, next);
  }

  // 메모리 누수 감지
  detectMemoryLeak(): boolean {
    const memoryUsage = process.memoryUsage();
    const heapUsed = memoryUsage.heapUsed;
    const uptime = process.uptime();

    // 시스템 시작 후 시간이 충분히 지났는지 확인
    if (uptime < 60) { // 1분 미만이면 판단하지 않음
      return false;
    }

    // 힙 사용량이 제한을 초과하면 누수로 간주
    return heapUsed > this.resourceLimits.maxHeapUsedBytes;
  }

  // CPU 과도한 사용 감지
  detectCpuSpikes(durationMs: number = 5000, thresholdPercent: number = 90): boolean {
    // 단순화된 CPU 스파이크 감지
    // 실제 구현에서는 더 정교한 방법이 필요
    const usage = this.getSystemUsage();
    return usage.cpuPercent > thresholdPercent;
  }

  // 자원 사용 통계
  getResourceStats() {
    const usage = this.getSystemUsage();
    
    return {
      system: {
        cpuPercent: usage.cpuPercent,
        memoryPercent: usage.memoryPercent,
        heapUsed: usage.heapUsed,
        rss: usage.rss,
        uptime: usage.uptime
      },
      application: {
        concurrentRequests: usage.concurrentRequests,
        peakConcurrentRequests: this.peakConcurrentRequests,
        canAcceptRequest: this.canAcceptRequest(),
        isOverloaded: this.isOverloaded()
      },
      limits: this.resourceLimits,
      loadShedding: this.loadSheddingConfig
    };
  }

  // 과부하 시스템 복구 시도
  attemptRecovery(): boolean {
    // 간단한 GC 호출 (Node.js에서 직접적인 GC는 권장되지 않지만 참고용으로)
    if (global.gc) {
      global.gc();
    }

    // 현재 상태 확인
    return !this.isOverloaded();
  }

  // 리소스 제한 업데이트
  updateLimits(newLimits: Partial<ResourceLimits>) {
    this.resourceLimits = { ...this.resourceLimits, ...newLimits };
  }

  // 과부하 설정 업데이트
  updateLoadSheddingConfig(newConfig: Partial<LoadSheddingConfig>) {
    this.loadSheddingConfig = { ...this.loadSheddingConfig, ...newConfig };
  }

  // 메모리 사용량 기반 백오프
  async memoryBasedBackoff(): Promise<void> {
    if (this.isOverloaded()) {
      const usage = this.getSystemUsage();
      let backoffTime = this.loadSheddingConfig.backoffTime;

      // 사용량에 따라 백오프 시간 조정
      if (usage.memoryPercent > 95 || usage.cpuPercent > 95) {
        backoffTime *= 3; // 매우 높은 부하 시 백오프 시간 증가
      } else if (usage.memoryPercent > 90 || usage.cpuPercent > 90) {
        backoffTime *= 2; // 높은 부하 시 백오프 시간 증가
      }

      await new Promise(resolve => setTimeout(resolve, backoffTime));
    }
  }

  // 주기적인 자원 사용 모니터링
  startMonitoring(intervalMs: number = 5000): void {
    setInterval(() => {
      const stats = this.getResourceStats();
      
      // 과부하 상태 감지 시 로그 기록
      if (stats.application.isOverloaded) {
        securityLogger.logSystemAnomaly('resource-overload', 'high', {
          cpuPercent: stats.system.cpuPercent,
          memoryPercent: stats.system.memoryPercent,
          heapUsed: stats.system.heapUsed,
          concurrentRequests: stats.application.concurrentRequests
        });
      }

      // 메모리 누수 감지
      if (this.detectMemoryLeak()) {
        securityLogger.logSystemAnomaly('memory-leak-detected', 'critical', {
          heapUsed: stats.system.heapUsed,
          maxAllowed: this.resourceLimits.maxHeapUsedBytes
        });
      }
    }, intervalMs);
  }
}

// 전역 리소스 보호 인스턴스
export const resourceProtection = new ResourceProtection({
  cpuPercent: 85,
  memoryPercent: 90,
  maxConcurrentRequests: 200,
  maxHeapUsedBytes: 1024 * 1024 * 1024, // 1GB
  maxRssBytes: 2 * 1024 * 1024 * 1024  // 2GB
}, {
  cpuThreshold: 80,
  memoryThreshold: 85,
  heapUsedThreshold: 768 * 1024 * 1024, // 768MB
  responseCode: 503,
  backoffTime: 1000
});

// 자원 보호 미들웨어
export function resourceProtectionMiddleware(req: NextApiRequest, res: NextApiResponse, next: () => void) {
  resourceProtection.overloadProtection(req, res, next);
}

// 자원 사용량 확인 미들웨어
export function resourceMonitoringMiddleware(req: NextApiRequest, res: NextApiResponse, next: () => void) {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const usage = resourceProtection.getResourceStats();
    
    // 장시간 실행 요청 로깅
    if (duration > 5000) { // 5초 이상 걸린 요청
      securityLogger.info('Long-running request detected', {
        url: req.url,
        method: req.method,
        duration,
        cpuPercent: usage.system.cpuPercent,
        memoryPercent: usage.system.memoryPercent
      });
    }
  });

  next();
}

// 모니터링 시작
resourceProtection.startMonitoring(10000); // 10초마다 모니터링