import { nanoid } from 'nanoid';

// CSRF 보호 클래스
export class CsrfProtection {
  private static readonly TOKEN_LENGTH = 32;
  private static readonly TOKEN_EXPIRY_MINUTES = 30;
  private static readonly TOKEN_STORAGE_KEY = 'csrf_token';

  // CSRF 토큰 생성
  static generateToken(): string {
    const token = nanoid(this.TOKEN_LENGTH);
    const expiry = Date.now() + (this.TOKEN_EXPIRY_MINUTES * 60 * 1000);
    
    // 토큰과 만료 시간 저장
    const tokenData = {
      token,
      expiry
    };
    
    if (typeof window !== 'undefined') {
      // 브라우저 환경에서는 sessionStorage에 저장
      sessionStorage.setItem(this.TOKEN_STORAGE_KEY, JSON.stringify(tokenData));
    }
    
    return token;
  }

  // CSRF 토큰 검증
  static validateToken(token: string): boolean {
    if (!token) {
      return false;
    }

    let storedTokenData;
    
    if (typeof window !== 'undefined') {
      // 브라우저 환경에서는 sessionStorage에서 가져옴
      const stored = sessionStorage.getItem(this.TOKEN_STORAGE_KEY);
      if (!stored) {
        return false;
      }
      
      try {
        storedTokenData = JSON.parse(stored);
      } catch (e) {
        return false;
      }
    } else {
      // 서버 환경에서는 메모리에 저장된 토큰 사용
      storedTokenData = this.serverTokens.get(token);
      if (!storedTokenData) {
        return false;
      }
    }

    // 토큰 일치 여부 확인
    if (storedTokenData.token !== token) {
      return false;
    }

    // 만료 시간 확인
    if (Date.now() > storedTokenData.expiry) {
      // 만료된 토큰은 제거
      this.clearToken(token);
      return false;
    }

    return true;
  }

  // CSRF 토큰 제거
  static clearToken(token: string): void {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(this.TOKEN_STORAGE_KEY);
    } else {
      this.serverTokens.delete(token);
    }
  }

  // 서버 측 토큰 저장소
  private static serverTokens = new Map<string, { token: string; expiry: number }>();

  // 서버 측 토큰 저장
  static storeServerToken(token: string, expiry: number): void {
    this.serverTokens.set(token, { token, expiry });
  }

  // 서버 측 토큰 제거
  static removeServerToken(token: string): void {
    this.serverTokens.delete(token);
  }

  // 서버 측 모든 만료된 토큰 정리
  static cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [token, data] of this.serverTokens.entries()) {
      if (now > data.expiry) {
        this.serverTokens.delete(token);
      }
    }
  }
}

// CSRF 보호 미들웨어 (Next.js API Routes용)
export function csrfMiddleware(handler: Function) {
  return async (req: any, res: any) => {
    // GET, HEAD, OPTIONS 요청은 CSRF 검증 생략
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return handler(req, res);
    }

    // CSRF 토큰 검증
    const csrfToken = req.headers['x-csrf-token'] || req.body['_csrf'];
    if (!CsrfProtection.validateToken(csrfToken)) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }

    return handler(req, res);
  };
}

// CSR 환경에서 CSRF 토큰을 폼에 포함시키는 훅
export function useCsrfToken(): string {
  const [token, setToken] = React.useState<string>('');

  React.useEffect(() => {
    const storedToken = sessionStorage.getItem(CsrfProtection.TOKEN_STORAGE_KEY);
    if (storedToken) {
      try {
        const tokenData = JSON.parse(storedToken);
        if (Date.now() <= tokenData.expiry) {
          setToken(tokenData.token);
          return;
        }
      } catch (e) {
        // 파싱 실패 시 새 토큰 생성
      }
    }

    // 새 토큰 생성
    const newToken = CsrfProtection.generateToken();
    setToken(newToken);
  }, []);

  return token;
}