import { NextApiRequest, NextApiResponse } from 'next';
import { securityConfig } from '../config/securityConfig';
import { securityLogger } from '../logging/securityLogger';
import { CryptoUtils } from '../utils/cryptoUtils';

export interface RateLimitInfo {
  remaining: number;
  resetTime: number;
  limit: number;
}

export interface BruteForceProtection {
  attempts: number;
  lastAttempt: number;
  lockedUntil: number | null;
}

export class ApiSecurityManager {
  private rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();
  private bruteForceStore: Map<string, BruteForceProtection> = new Map();
  private blockedIps: Map<string, number> = new Map(); // IP, 블록 해제 시간

  // Rate Limiting
  checkRateLimit(identifier: string, windowMs: number, maxRequests: number): RateLimitInfo {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // 이전 요청 정리
    if (this.rateLimitStore.has(identifier)) {
      const record = this.rateLimitStore.get(identifier)!;
      if (record.resetTime < now) {
        // 윈도우가 지나면 리셋
        this.rateLimitStore.set(identifier, { count: 0, resetTime: now + windowMs });
      }
    } else {
      this.rateLimitStore.set(identifier, { count: 0, resetTime: now + windowMs });
    }
    
    const record = this.rateLimitStore.get(identifier)!;
    record.count++;
    
    const remaining = Math.max(0, maxRequests - record.count);
    const resetTime = record.resetTime;
    
    return { remaining, resetTime, limit: maxRequests };
  }

  // 브루트 포스 방지
  checkBruteForceProtection(ip: string, maxAttempts: number = 5, lockoutWindow: number = 15 * 60 * 1000): boolean {
    const now = Date.now();
    const ipRecord = this.bruteForceStore.get(ip) || { attempts: 0, lastAttempt: 0, lockedUntil: null };
    
    // 잠금 시간이 지났는지 확인
    if (ipRecord.lockedUntil && ipRecord.lockedUntil < now) {
      // 잠금 해제
      this.bruteForceStore.delete(ip);
      return true; // 접근 허용
    }
    
    // 잠겨있으면 접근 거부
    if (ipRecord.lockedUntil && ipRecord.lockedUntil >= now) {
      securityLogger.logBruteForceAttempt(ip, ipRecord.attempts, '15min', undefined);
      return false; // 접근 거부
    }
    
    // 마지막 시도로부터 일정 시간이 지나면 카운트 리셋
    if (now - ipRecord.lastAttempt > 15 * 60 * 1000) { // 15분
      ipRecord.attempts = 0;
    }
    
    ipRecord.attempts++;
    ipRecord.lastAttempt = now;
    
    // 최대 시도 횟수 초과 시 잠금
    if (ipRecord.attempts >= maxAttempts) {
      ipRecord.lockedUntil = now + lockoutWindow;
      securityLogger.logBruteForceAttempt(ip, ipRecord.attempts, '15min', undefined);
    }
    
    this.bruteForceStore.set(ip, ipRecord);
    return ipRecord.lockedUntil === null;
  }

  // IP 블록
  blockIp(ip: string, duration: number = 24 * 60 * 60 * 1000): void { // 기본 24시간
    const unblockTime = Date.now() + duration;
    this.blockedIps.set(ip, unblockTime);
    
    securityLogger.security('IP blocked', {
      ip,
      duration,
      unblockTime: new Date(unblockTime).toISOString()
    });
  }

  // IP 블록 해제
  unblockIp(ip: string): boolean {
    return this.blockedIps.delete(ip);
  }

  // 블록된 IP 확인
  isIpBlocked(ip: string): boolean {
    const unblockTime = this.blockedIps.get(ip);
    if (!unblockTime) {
      return false;
    }
    
    // 블록 시간이 지났으면 자동 해제
    if (Date.now() > unblockTime) {
      this.blockedIps.delete(ip);
      return false;
    }
    
    return true;
  }

  // API 키 유효성 검사
  validateApiKey(providedKey: string, expectedKey: string): boolean {
    // 타이밍 어택 방지를 위해 타이밍 세이프 비교 사용
    return CryptoUtils.verifyHmac(providedKey, expectedKey);
  }

  // API 요청 검증 미들웨어
  validateApiRequest(req: NextApiRequest, res: NextApiResponse, next: () => void) {
    const ip = this.getClientIp(req);
    
    // IP 블록 확인
    if (this.isIpBlocked(ip)) {
      securityLogger.logSecurityThreat('blocked-ip-access', ip);
      return res.status(403).json({ error: 'Access forbidden' });
    }
    
    // 브루트 포스 보호 확인
    if (!this.checkBruteForceProtection(ip)) {
      securityLogger.logSecurityThreat('brute-force-attempt', ip);
      return res.status(429).json({ error: 'Too many requests' });
    }
    
    // Rate Limiting 확인
    const rateLimit = this.checkRateLimit(
      ip, 
      securityConfig.rateLimit.windowMs, 
      securityConfig.rateLimit.max
    );
    
    // 헤더에 Rate Limit 정보 추가
    res.setHeader('X-RateLimit-Limit', rateLimit.limit);
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
    res.setHeader('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString());
    
    if (rateLimit.remaining <= 0) {
      securityLogger.logSecurityThreat('rate-limit-exceeded', ip);
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }
    
    next();
  }

  // 클라이언트 IP 추출
  private getClientIp(req: NextApiRequest): string {
    // Cloudflare, Nginx 등에서 전달한 헤더 확인
    return req.headers['cf-connecting-ip'] as string ||
           req.headers['x-real-ip'] as string ||
           req.headers['x-forwarded-for'] as string ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           (req as any).connection.socket.remoteAddress ||
           'unknown';
  }

  // 요청 서명 검증 (HMAC)
  validateRequestSignature(req: NextApiRequest, secret: string): boolean {
    const signature = req.headers['x-signature'] as string;
    if (!signature) {
      return false;
    }
    
    // 요청 바디와 타임스탬프를 결합하여 서명 생성
    const timestamp = req.headers['x-timestamp'] as string;
    if (!timestamp || Date.now() - parseInt(timestamp) > 5 * 60 * 1000) { // 5분 유효
      return false;
    }
    
    const requestBody = JSON.stringify(req.body);
    const dataToSign = `${timestamp}.${requestBody}`;
    const expectedSignature = CryptoUtils.generateHmac(dataToSign, secret);
    
    return CryptoUtils.verifyHmac(dataToSign, expectedSignature, secret);
  }

  // CORS 보안 헤더 설정
  setCorsHeaders(res: NextApiResponse, origin: string = '*') {
    // 보안 헤더 설정
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY'); // 클릭재킹 방지
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    // Content Security Policy 설정
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self'; " +
      "connect-src 'self' https://api.telegram.org; " +
      "frame-ancestors 'none';"
    );
    
    // CORS 헤더 설정
    if (securityConfig.allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', securityConfig.allowedOrigins[0]);
    }
    
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-API-Key, X-Signature, X-Timestamp');
  }

  // 보안 헤더 설정
  setSecurityHeaders(res: NextApiResponse) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN'); // 클릭재킹 방지
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  }

  // 보안 이벤트 로깅
  logSecurityEvent(eventType: string, ip: string, details?: any) {
    securityLogger.logSecurityThreat(eventType, ip, details);
  }

  // 보안 통계
  getSecurityStats() {
    return {
      totalRateLimitedRequests: this.rateLimitStore.size,
      totalBruteForceAttempts: this.bruteForceStore.size,
      totalBlockedIps: this.blockedIps.size,
      activeBlocks: Array.from(this.blockedIps.entries()).filter(([_, unblockTime]) => Date.now() < unblockTime).length
    };
  }
}

// 전역 API 보안 관리자 인스턴스
export const apiSecurityManager = new ApiSecurityManager();

// Rate Limiting 미들웨어
export function rateLimitMiddleware(windowMs: number = securityConfig.rateLimit.windowMs, max: number = securityConfig.rateLimit.max) {
  return (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    apiSecurityManager.validateApiRequest(req, res, next);
  };
}

// 브루트 포스 보호 미들웨어
export function bruteForceProtectionMiddleware(maxAttempts: number = 5, lockoutWindow: number = 15 * 60 * 1000) {
  return (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    const ip = apiSecurityManager.getClientIp(req);
    
    if (!apiSecurityManager.checkBruteForceProtection(ip, maxAttempts, lockoutWindow)) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    
    next();
  };
}