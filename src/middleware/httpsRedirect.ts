import { NextApiRequest, NextApiResponse } from 'next';
import { securityConfig } from '../config/securityConfig';

export interface HttpsConfig {
  enabled: boolean;
  port?: number;
  redirectCode?: number;
  excludePaths?: string[];
}

export class HttpsRedirectMiddleware {
  private config: HttpsConfig;
  
  constructor(config?: Partial<HttpsConfig>) {
    this.config = {
      enabled: config?.enabled ?? true,
      port: config?.port ?? 443,
      redirectCode: config?.redirectCode ?? 308, // 영구 리디렉션
      excludePaths: config?.excludePaths ?? ['/health', '/api/webhook'],
      ...config
    };
  }

  // HTTP 요청을 HTTPS로 리디렉션
  redirectToHttps(req: NextApiRequest, res: NextApiResponse, next?: () => void) {
    if (!this.config.enabled) {
      if (next) next();
      return;
    }

    // 특정 경로는 예외 처리
    if (this.config.excludePaths?.some(path => req.url?.startsWith(path))) {
      if (next) next();
      return;
    }

    // 이미 HTTPS이거나 로컬 개발 환경이면 리디렉션하지 않음
    const isSecure = req.headers['x-forwarded-proto'] === 'https' || 
                     req.connection.encrypted || 
                     process.env.NODE_ENV === 'development';
    
    if (isSecure) {
      if (next) next();
      return;
    }

    // 호스트 정보 가져오기
    const host = req.headers.host || 'localhost';
    const hostname = host.split(':')[0]; // 포트 제거
    const port = this.config.port !== 443 ? `:${this.config.port}` : '';
    
    // 리디렉션 URL 생성
    const redirectUrl = `https://${hostname}${port}${req.url}`;
    
    // 리디렉션 헤더 설정
    res.setHeader('Location', redirectUrl);
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5분 캐시
    res.status(this.config.redirectCode).end();
  }

  // HSTS 헤더 설정
  setHstsHeaders(res: NextApiResponse) {
    // 1년 동안 HTTPS만 사용하도록 지정
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // HTTP에서 HTTPS로의 안전한 리디렉션을 위한 미들웨어
  applySecurityHeaders(req: NextApiRequest, res: NextApiResponse, next: () => void) {
    // HSTS 헤더 설정
    this.setHstsHeaders(res);
    
    // X-Forwarded-Proto 헤더가 있는 경우 HTTPS로 처리
    if (req.headers['x-forwarded-proto'] === 'https') {
      (req as any).secure = true;
    }
    
    // 보안 관련 추가 헤더 설정
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    next();
  }

  // 리디렉션 설정 업데이트
  updateConfig(newConfig: Partial<HttpsConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  // 현재 설정 반환
  getConfig(): HttpsConfig {
    return { ...this.config };
  }
}

// 기본 HTTPS 리디렉션 미들웨어 인스턴스
export const httpsRedirectMiddleware = new HttpsRedirectMiddleware({
  enabled: process.env.NODE_ENV === 'production',
  port: 443,
  redirectCode: 308,
  excludePaths: ['/health', '/api/webhook', '/api/health']
});

// Next.js API 라우트용 핸들러
export function createHttpsHandler<T>(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<T>,
  config?: Partial<HttpsConfig>
) {
  const middleware = new HttpsRedirectMiddleware(config);
  
  return async (req: NextApiRequest, res: NextApiResponse): Promise<T> => {
    return new Promise((resolve, reject) => {
      // HTTPS 리디렉션 확인
      if (req.method !== 'GET' || !req.url?.startsWith('/api/webhook')) {
        const originalUrl = req.url;
        middleware.redirectToHttps(req, res, () => {
          // 리디렉션이 필요 없을 경우 원래 핸들러 실행
          if (req.url === originalUrl) {
            handler(req, res)
              .then(resolve)
              .catch(reject);
          }
        });
      } else {
        // 웹훅 등 특정 경로는 리디렉션 없이 실행
        handler(req, res)
          .then(resolve)
          .catch(reject);
      }
    });
  };
}

// 사용자 정의 리디렉션 핸들러
export function withHttpsRedirect<T>(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<T>,
  customConfig?: Partial<HttpsConfig>
) {
  return createHttpsHandler(handler, {
    enabled: process.env.NODE_ENV === 'production',
    ...customConfig
  });
}