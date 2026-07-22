import { NextApiRequest, NextApiResponse } from 'next';
import { CryptoUtils } from '../utils/cryptoUtils';

export interface CsrfToken {
  token: string;
  expiration: number; // 타임스탬프
  userId?: string;
}

export class CsrfProtection {
  private static readonly TOKEN_EXPIRATION_MINUTES = 30;
  private static readonly TOKEN_LENGTH = 32;
  private static readonly MAX_TOKENS_PER_USER = 10;

  private tokens: Map<string, CsrfToken> = new Map();

  // CSRF 토큰 생성
  generateToken(userId?: string): string {
    const token = CryptoUtils.generateSecureRandomString(this.TOKEN_LENGTH);
    const expiration = Date.now() + (this.TOKEN_EXPIRATION_MINUTES * 60 * 1000);

    // 사용자당 최대 토큰 수 제한
    if (userId) {
      const userTokens = Array.from(this.tokens.entries())
        .filter(([_, tokenData]) => tokenData.userId === userId);
      
      if (userTokens.length >= this.MAX_TOKENS_PER_USER) {
        // 오래된 토큰 제거
        userTokens
          .sort((a, b) => a[1].expiration - b[1].expiration)
          .slice(0, userTokens.length - this.MAX_TOKENS_PER_USER + 1)
          .forEach(([tokenId]) => this.tokens.delete(tokenId));
      }
    }

    this.tokens.set(token, {
      token,
      expiration,
      userId
    });

    return token;
  }

  // CSRF 토큰 검증
  validateToken(token: string, userId?: string): boolean {
    const tokenData = this.tokens.get(token);

    // 토큰 존재 여부 확인
    if (!tokenData) {
      return false;
    }

    // 만료 확인
    if (Date.now() > tokenData.expiration) {
      this.tokens.delete(token);
      return false;
    }

    // 사용자 ID 확인 (있는 경우)
    if (userId && tokenData.userId && tokenData.userId !== userId) {
      return false;
    }

    return true;
  }

  // CSRF 토큰 삭제 (사용 후)
  consumeToken(token: string): boolean {
    return this.tokens.delete(token);
  }

  // 모든 만료된 토큰 정리
  cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [tokenId, tokenData] of this.tokens.entries()) {
      if (now > tokenData.expiration) {
        this.tokens.delete(tokenId);
      }
    }
  }

  // 미들웨어: 토큰 생성
  generateTokenMiddleware(req: NextApiRequest, res: NextApiResponse, next: () => void) {
    // GET 요청에 대해서만 토큰 생성 (CSRF 토큰 필요 없음)
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      const token = this.generateToken(req.headers['user-id'] as string);
      
      // 헤더에 토큰 추가
      res.setHeader('X-CSRF-Token', token);
      
      // 또는 쿠키에 토큰 설정 (보안을 위해 httpOnly는 false)
      res.setHeader('Set-Cookie', [
        `csrfToken=${token}; Path=/; HttpOnly=false; SameSite=Strict; Max-Age=${this.TOKEN_EXPIRATION_MINUTES * 60}`
      ]);
    }
    
    next();
  }

  // 미들웨어: 토큰 검증
  validateTokenMiddleware(req: NextApiRequest, res: NextApiResponse, next: () => void) {
    // GET, HEAD, OPTIONS 요청은 CSRF 검증 생략
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      next();
      return;
    }

    // 헤더 또는 바디에서 CSRF 토큰 추출
    const headerToken = req.headers['x-csrf-token'] as string;
    const bodyToken = (req.body && req.body._csrf) as string;
    const cookieToken = req.cookies?.csrfToken as string;
    
    const token = headerToken || bodyToken || cookieToken;

    if (!token) {
      res.status(403).json({ error: 'CSRF token missing' });
      return;
    }

    // 토큰 검증
    const isValid = this.validateToken(token, req.headers['user-id'] as string);
    
    if (!isValid) {
      res.status(403).json({ error: 'Invalid CSRF token' });
      return;
    }

    // 토큰 사용 처리 (토큰당 1회 사용 제한)
    this.consumeToken(token);

    next();
  }

  // 토큰 갱신
  refreshToken(oldToken: string, userId?: string): string | null {
    if (this.validateToken(oldToken, userId)) {
      this.consumeToken(oldToken);
      return this.generateToken(userId);
    }
    return null;
  }

  // 사용자 관련 모든 토큰 삭제
  revokeUserTokens(userId: string): void {
    for (const [tokenId, tokenData] of this.tokens.entries()) {
      if (tokenData.userId === userId) {
        this.tokens.delete(tokenId);
      }
    }
  }
}

// CSRF 보호 인스턴스 (싱글톤)
export const csrfProtection = new CsrfProtection();

// 자동 정리 타이머 (10분마다 실행)
setInterval(() => {
  csrfProtection.cleanupExpiredTokens();
}, 10 * 60 * 1000); // 10분