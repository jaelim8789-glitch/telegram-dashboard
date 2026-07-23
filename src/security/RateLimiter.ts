import { IncomingMessage } from 'http';

// 고급 레이트 리미터 클래스
export class AdvancedRateLimiter {
  private static readonly WINDOW_MS = 15 * 60 * 1000; // 15분
  private static readonly MAX_REQUESTS = 100; // 15분당 최대 요청 수
  private static readonly BLOCK_DURATION_MS = 15 * 60 * 1000; // 차단 지속 시간
  
  // 요청 기록 저장소 (실제 구현 시 Redis 사용 권장)
  private static requestCounts = new Map<string, { count: number; windowStart: number; blockedUntil: number | null }>();
  
  // IP 추출 함수
  static getClientIp(req: IncomingMessage): string {
    // 프록시 헤더 확인
    const forwarded = req.headers['x-forwarded-for'] as string;
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    const realIp = req.headers['x-real-ip'] as string;
    if (realIp) {
      return realIp;
    }
    
    // 기본 IP
    return req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
  }
  
  // 요청 허용 여부 확인
  static async isAllowed(req: IncomingMessage, endpoint: string = '*'): Promise<{ allowed: boolean; retryAfter?: number }> {
    const ip = this.getClientIp(req);
    const key = `${ip}:${endpoint}`;
    const now = Date.now();
    
    // 차단 상태 확인
    const record = this.requestCounts.get(key);
    if (record && record.blockedUntil && now < record.blockedUntil) {
      return { 
        allowed: false, 
        retryAfter: Math.ceil((record.blockedUntil - now) / 1000) 
      };
    }
    
    // 새로운 레코드 생성 또는 기존 레코드 확인
    if (!record) {
      this.requestCounts.set(key, { count: 1, windowStart: now, blockedUntil: null });
      return { allowed: true };
    }
    
    // 윈도우 시간 확인
    if (now - record.windowStart > this.WINDOW_MS) {
      // 윈도우 갱신
      record.count = 1;
      record.windowStart = now;
      record.blockedUntil = null;
      return { allowed: true };
    }
    
    // 요청 수 증가
    record.count++;
    
    // 제한 초과 시 차단
    if (record.count > this.MAX_REQUESTS) {
      record.blockedUntil = now + this.BLOCK_DURATION_MS;
      return { 
        allowed: false, 
        retryAfter: Math.ceil(this.BLOCK_DURATION_MS / 1000) 
      };
    }
    
    return { allowed: true };
  }
  
  // 요청 수 정리 (메모리 누수 방지)
  static cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.requestCounts.entries()) {
      // 오래된 레코드 정리
      if (now - record.windowStart > this.WINDOW_MS * 2) {
        this.requestCounts.delete(key);
      }
      // 차단 시간이 지난 레코드 정리
      if (record.blockedUntil && now > record.blockedUntil) {
        record.blockedUntil = null;
      }
    }
  }
  
  // 차단 해제
  static unblock(key: string): void {
    const record = this.requestCounts.get(key);
    if (record) {
      record.blockedUntil = null;
    }
  }
  
  // 모든 차단 해제 (관리자용)
  static unblockAll(): void {
    for (const [, record] of this.requestCounts.entries()) {
      record.blockedUntil = null;
    }
  }
}

// 레이트 리미터 미들웨어
export function rateLimitMiddleware(maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) {
  return async (req: any, res: any, next: () => void) => {
    const result = await AdvancedRateLimiter.isAllowed(req);
    
    if (!result.allowed) {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: result.retryAfter
      });
      return;
    }
    
    next();
  };
}

// 정기 정리 타이머 (메모리 누수 방지)
setInterval(() => {
  AdvancedRateLimiter.cleanup();
}, 5 * 60 * 1000); // 5분마다 정리