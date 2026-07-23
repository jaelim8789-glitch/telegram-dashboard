import { NextApiRequest, NextApiResponse } from 'next';
import { CryptoUtils } from '../utils/cryptoUtils';
import { securityLogger } from '../logging/securityLogger';
import { securityConfig } from '../config/securityConfig';
import { v4 as uuidv4 } from 'uuid';
import { jwtVerify, SignJWT } from 'jose';

// 세션 관리 클래스
export class SessionManager {
  private sessions: Map<string, SessionData> = new Map();
  private config: SessionConfig;
  private readonly SESSION_PREFIX = 'sess_';
  private static readonly SESSION_SECRET = new TextEncoder().encode(
    process.env.SESSION_SECRET || 'fallback_session_secret_for_dev_only'
  );
  private static readonly SESSION_EXPIRY_HOURS = 24;
  private static readonly REFRESH_THRESHOLD_MINUTES = 30;

  constructor(config?: Partial<SessionConfig>) {
    this.config = {
      sessionTimeout: config?.sessionTimeout || 24 * 60 * 60 * 1000, // 24시간
      regenerateInterval: config?.regenerateInterval || 30 * 60 * 1000, // 30분
      maxInactiveInterval: config?.maxInactiveInterval || 30 * 60 * 1000, // 30분
      ...config
    };
  }

  // 새 세션 생성
  static async createSession(userId: string, tenantId: string): Promise<string> {
    const sessionId = uuidv4();
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + (this.SESSION_EXPIRY_HOURS * 60 * 60);

    const jwt = await new SignJWT({ userId, tenantId, sessionId })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(issuedAt)
      .setExpirationTime(expiresAt)
      .sign(this.SESSION_SECRET);

    return jwt;
  }

  // 세션 검증
  static async validateSession(token: string): Promise<{ userId: string; tenantId: string; sessionId: string } | null> {
    try {
      const verified = await jwtVerify(token, this.SESSION_SECRET);
      const claims = verified.payload;
      
      // 세션 ID 존재 여부 확인
      if (!claims.sessionId) {
        return null;
      }

      return {
        userId: claims.userId as string,
        tenantId: claims.tenantId as string,
        sessionId: claims.sessionId as string
      };
    } catch (error) {
      console.error('세션 검증 실패:', error);
      return null;
    }
  }

  // 로그인 시 세션 ID 변경 (세션 고정 방지)
  static async rotateSession(oldToken: string, userId: string, tenantId: string): Promise<string> {
    // 기존 세션 검증
    const oldSession = await this.validateSession(oldToken);
    if (!oldSession || oldSession.userId !== userId) {
      throw new Error('Invalid old session');
    }

    // 새 세션 생성 (세션 ID 새로 생성)
    return this.createSession(userId, tenantId);
  }

  // 세션 연장 (세션 만료 시간 갱신)
  static async extendSession(token: string): Promise<string | null> {
    const session = await this.validateSession(token);
    if (!session) {
      return null;
    }

    // 만료 시간이 임계값보다 가까우면 연장
    const now = Math.floor(Date.now() / 1000);
    const timeToExpiry = (session.expiresAt || 0) - now;
    
    if (timeToExpiry < (this.REFRESH_THRESHOLD_MINUTES * 60)) {
      // 새 토큰 생성 (기존 세션 ID 유지)
      return this.createSession(session.userId, session.tenantId);
    }

    return token;
  }

  // 세션 무효화
  static async invalidateSession(token: string): Promise<boolean> {
    try {
      // 토큰 검증 후 무효화 (실제로는 블랙리스트에 추가)
      const verified = await jwtVerify(token, this.SESSION_SECRET);
      // 블랙리스트 처리 로직은 실제 구현 시 Redis 등에 저장
      console.log(`세션 무효화: ${verified.payload.sessionId}`);
      return true;
    } catch (error) {
      console.error('세션 무효화 실패:', error);
      return false;
    }
  }

  // 세션 생성
  createSession(userId: string, tenantId: string, req: NextApiRequest): SessionData {
    const sessionId = this.generateSessionId();
    const now = Date.now();
    const csrfToken = CryptoUtils.generateCsrfToken(userId, now);

    const session: SessionData = {
      id: sessionId,
      userId,
      tenantId,
      createdAt: now,
      lastAccessed: now,
      expiresAt: now + this.config.sessionTimeout,
      userAgent: req.headers['user-agent'],
      ipAddress: this.getClientIp(req),
      csrfToken,
      permissions: [] // 초기에는 빈 배열, 권한은 별도 시스템에서 관리
    };

    this.sessions.set(sessionId, session);

    // 세션 생성 로그
    securityLogger.logSessionEvent(sessionId, userId, 'created', {
      tenantId,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress
    });

    return session;
  }

  // 세션 검색
  getSession(sessionId: string): SessionData | null {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // 세션 만료 확인
    if (Date.now() > session.expiresAt) {
      this.destroySession(sessionId);
      return null;
    }

    // 비활성화 시간 초과 확인
    if (Date.now() - session.lastAccessed > this.config.maxInactiveInterval) {
      this.destroySession(sessionId);
      return null;
    }

    return session;
  }

  // 세션 갱신
  refreshSession(sessionId: string, req?: NextApiRequest): SessionData | null {
    const session = this.getSession(sessionId);
    if (!session) {
      return null;
    }

    // 세션 ID 재생성 간격 확인
    if (Date.now() - session.createdAt > this.config.regenerateInterval) {
      return this.regenerateSession(sessionId, req);
    }

    // 마지막 접근 시간 갱신
    session.lastAccessed = Date.now();
    
    // 요청이 있는 경우 IP와 User Agent 확인 (세션 하이재킹 탐지)
    if (req) {
      const currentIp = this.getClientIp(req);
      const currentUserAgent = req.headers['user-agent'];

      // IP 또는 User Agent가 변경되었는지 확인
      if (session.ipAddress !== currentIp || session.userAgent !== currentUserAgent) {
        securityLogger.logSecurityThreat('potential-session-hijacking', currentIp, {
          originalIp: session.ipAddress,
          currentIp,
          originalUserAgent: session.userAgent,
          currentUserAgent
        });
        
        // 보안상 문제가 있을 수 있으므로 세션 무효화
        this.destroySession(sessionId);
        return null;
      }
    }

    return session;
  }

  // 세션 ID 재생성 (보안 강화)
  regenerateSession(oldSessionId: string, req?: NextApiRequest): SessionData | null {
    const oldSession = this.getSession(oldSessionId);
    if (!oldSession) {
      return null;
    }

    // 새 세션 생성
    const newSessionId = this.generateSessionId();
    const now = Date.now();

    const newSession: SessionData = {
      ...oldSession,
      id: newSessionId,
      createdAt: now,
      lastAccessed: now,
      expiresAt: now + this.config.sessionTimeout,
      csrfToken: CryptoUtils.generateCsrfToken(oldSession.userId, now)
    };

    // 이전 세션 제거
    this.destroySession(oldSessionId);

    // 새 세션 저장
    this.sessions.set(newSessionId, newSession);

    // 세션 재생성 로그
    securityLogger.logSessionEvent(newSessionId, oldSession.userId, 'regenerated', {
      oldSessionId,
      userAgent: newSession.userAgent,
      ipAddress: newSession.ipAddress
    });

    return newSession;
  }

  // 세션 삭제
  destroySession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      securityLogger.logSessionEvent(sessionId, session.userId, 'destroyed', {
        reason: 'manual'
      });
    }
    return this.sessions.delete(sessionId);
  }

  // 사용자 세션 모두 삭제 (예: 계정 탈퇴, 비밀번호 변경 시)
  destroyUserSessions(userId: string): number {
    const sessionsToDelete: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        sessionsToDelete.push(sessionId);
      }
    }

    let destroyedCount = 0;
    for (const sessionId of sessionsToDelete) {
      this.destroySession(sessionId);
      destroyedCount++;
    }

    if (destroyedCount > 0) {
      securityLogger.logSessionEvent('multiple', userId, 'destroyed-all', {
        count: destroyedCount,
        reason: 'user-action'
      });
    }

    return destroyedCount;
  }

  // 테넌트 세션 모두 삭제 (예: 테넌트 비활성화 시)
  destroyTenantSessions(tenantId: string): number {
    const sessionsToDelete: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.tenantId === tenantId) {
        sessionsToDelete.push(sessionId);
      }
    }

    let destroyedCount = 0;
    for (const sessionId of sessionsToDelete) {
      this.destroySession(sessionId);
      destroyedCount++;
    }

    if (destroyedCount > 0) {
      securityLogger.logSecurityThreat('tenant-sessions-cleared', 'system', {
        tenantId,
        count: destroyedCount,
        reason: 'tenant-action'
      });
    }

    return destroyedCount;
  }

  // 세션 시간 갱신 (연장)
  extendSession(sessionId: string, additionalTime: number = this.config.sessionTimeout): boolean {
    const session = this.getSession(sessionId);
    if (!session) {
      return false;
    }

    session.expiresAt = Date.now() + additionalTime;
    return true;
  }

  // 세션 권한 확인
  hasPermission(sessionId: string, permission: string): boolean {
    const session = this.getSession(sessionId);
    if (!session) {
      return false;
    }

    return session.permissions.includes(permission);
  }

  // 세션 권한 추가
  addPermission(sessionId: string, permission: string): boolean {
    const session = this.getSession(sessionId);
    if (!session) {
      return false;
    }

    if (!session.permissions.includes(permission)) {
      session.permissions.push(permission);
    }

    return true;
  }

  // 세션 권한 제거
  removePermission(sessionId: string, permission: string): boolean {
    const session = this.getSession(sessionId);
    if (!session) {
      return false;
    }

    const index = session.permissions.indexOf(permission);
    if (index !== -1) {
      session.permissions.splice(index, 1);
      return true;
    }

    return false;
  }

  // 세션 ID 생성
  private generateSessionId(): string {
    return this.SESSION_PREFIX + CryptoUtils.generateSecureRandomString(32);
  }

  // 클라이언트 IP 추출
  private getClientIp(req: NextApiRequest): string {
    return req.headers['cf-connecting-ip'] as string ||
           req.headers['x-real-ip'] as string ||
           req.headers['x-forwarded-for'] as string ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           (req as any).connection.socket.remoteAddress ||
           'unknown';
  }

  // CSRF 토큰 검증
  validateCsrfToken(sessionId: string, token: string): boolean {
    const session = this.getSession(sessionId);
    if (!session) {
      return false;
    }

    return token === session.csrfToken;
  }

  // 세션 쿠키 설정
  setSessionCookie(res: NextApiResponse, sessionId: string, secure: boolean = true) {
    const cookieOptions = {
      httpOnly: true,
      secure, // HTTPS에서만 전송
      maxAge: this.config.sessionTimeout / 1000, // 초 단위
      sameSite: 'strict' as const, // CSRF 방지
      path: '/',
    };

    res.setHeader('Set-Cookie', [
      `sessionId=${sessionId}; Path=${cookieOptions.path}; HttpOnly; SameSite=${cookieOptions.sameSite}; Max-Age=${cookieOptions.maxAge}${secure ? '; Secure' : ''}`
    ]);
  }

  // 세션 쿠키 삭제
  clearSessionCookie(res: NextApiResponse) {
    res.setHeader('Set-Cookie', [
      'sessionId=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; HttpOnly; SameSite=strict'
    ]);
  }

  // 모든 만료된 세션 정리
  cleanupExpiredSessions(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt || (now - session.lastAccessed) > this.config.maxInactiveInterval) {
        this.sessions.delete(sessionId);
        cleanedCount++;
        
        securityLogger.logSessionEvent(sessionId, session.userId, 'expired', {
          reason: now > session.expiresAt ? 'timeout' : 'inactive'
        });
      }
    }

    return cleanedCount;
  }

  // 세션 통계
  getStats() {
    const now = Date.now();
    let activeSessions = 0;
    let expiredSessions = 0;
    const sessionsByUser = new Map<string, number>();

    for (const session of this.sessions.values()) {
      if (now <= session.expiresAt && (now - session.lastAccessed) <= this.config.maxInactiveInterval) {
        activeSessions++;
        sessionsByUser.set(session.userId, (sessionsByUser.get(session.userId) || 0) + 1);
      } else {
        expiredSessions++;
      }
    }

    return {
      totalSessions: this.sessions.size,
      activeSessions,
      expiredSessions,
      uniqueUsers: sessionsByUser.size,
      maxSessionsPerUser: Math.max(...Array.from(sessionsByUser.values()), 0)
    };
  }

  // 세션 ID 검증
  isValidSessionId(sessionId: string): boolean {
    return sessionId.startsWith(this.SESSION_PREFIX) && sessionId.length === this.SESSION_PREFIX.length + 32;
  }
}

// 전역 세션 관리자 인스턴스
export const sessionManager = new SessionManager({
  sessionTimeout: 8 * 60 * 60 * 1000, // 8시간
  regenerateInterval: 30 * 60 * 1000, // 30분
  maxInactiveInterval: 30 * 60 * 1000 // 30분
});

// 세션 관리 미들웨어
export function sessionMiddleware(handler: Function) {
  return async (req: any, res: any) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      const session = await SessionManager.validateSession(token);
      if (session) {
        req.session = session;
        
        // 세션 연장 시도
        const extendedToken = await SessionManager.extendSession(token);
        if (extendedToken && extendedToken !== token) {
          res.setHeader('X-Session-Extended', 'true');
          res.setHeader('X-New-Token', extendedToken);
        }
      }
    }

    return handler(req, res);
  };
}

// 세션 정리 타이머 (10분마다 실행)
setInterval(() => {
  const cleaned = sessionManager.cleanupExpiredSessions();
  if (cleaned > 0) {
    securityLogger.info(`Cleaned up ${cleaned} expired sessions`);
  }
}, 10 * 60 * 1000); // 10분