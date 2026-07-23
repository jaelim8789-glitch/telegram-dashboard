// 민감한 정보 필터링 클래스
export class LogSanitizer {
  private static readonly SENSITIVE_FIELDS = [
    'password', 'token', 'api_key', 'session', 'authorization', 
    'secret', 'key', 'credentials', 'auth', 'bearer', 'access_token',
    'refresh_token', 'id_token', 'jwt', 'cookie', 'ssid'
  ];

  private static readonly SENSITIVE_PATTERNS = [
    /\b([a-zA-Z0-9]{32,})\b/g,  // 긴 키 값
    /\b(ey[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*)\b/g,  // JWT 토큰
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,  // 이메일 주소 (필요 시 제거)
  ];

  // 민감한 정보 마스킹
  static sanitize(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (typeof obj === 'object' && !Array.isArray(obj)) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // 키 이름 기반 필터링
        if (this.isSensitiveField(key)) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitize(value);
        }
      }
      return sanitized;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitize(item));
    }

    return obj;
  }

  // 문자열 내 민감한 정보 마스킹
  private static sanitizeString(str: string): string {
    if (typeof str !== 'string') {
      return str;
    }

    let sanitized = str;

    // 패턴 기반 필터링
    for (const pattern of this.SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    return sanitized;
  }

  // 필드명이 민감한지 확인
  private static isSensitiveField(field: string): boolean {
    const lowerField = field.toLowerCase();
    return this.SENSITIVE_FIELDS.some(sensitive => 
      lowerField.includes(sensitive) || sensitive === lowerField
    );
  }

  // 오류 객체 정제
  static sanitizeError(error: any): any {
    if (!error) {
      return error;
    }

    const sanitized: any = {};

    // 일반적인 오류 속성만 복사
    if (error.message) sanitized.message = error.message;
    if (error.name) sanitized.name = error.name;
    if (error.code) sanitized.code = error.code;
    if (error.status) sanitized.status = error.status;

    // stack trace는 개발 환경에서만 포함
    if (process.env.NODE_ENV === 'development' && error.stack) {
      sanitized.stack = error.stack;
    } else {
      sanitized.stack = '[STACK_TRACE_REMOVED_IN_PRODUCTION]';
    }

    return sanitized;
  }

  // 요청 객체 정제
  static sanitizeRequest(req: any): any {
    if (!req) {
      return req;
    }

    const sanitized: any = {};
    
    // 특정 필드만 복사
    if (req.method) sanitized.method = req.method;
    if (req.url) sanitized.url = req.url;
    if (req.headers) {
      sanitized.headers = this.sanitize(req.headers);
    }
    if (req.query) sanitized.query = this.sanitize(req.query);
    if (req.params) sanitized.params = this.sanitize(req.params);
    if (req.body) sanitized.body = this.sanitize(req.body);

    return sanitized;
  }

  // 응답 객체 정제
  static sanitizeResponse(res: any): any {
    if (!res) {
      return res;
    }

    const sanitized: any = {};
    
    // 특정 필드만 복사
    if (res.statusCode) sanitized.statusCode = res.statusCode;
    if (res.statusMessage) sanitized.statusMessage = res.statusMessage;
    if (res.headers) {
      sanitized.headers = this.sanitize(res.headers);
    }

    return sanitized;
  }
}

// 로깅 래퍼
export class SecureLogger {
  static info(message: string, meta?: any): void {
    console.log(`[INFO] ${message}`, LogSanitizer.sanitize(meta));
  }

  static warn(message: string, meta?: any): void {
    console.warn(`[WARN] ${message}`, LogSanitizer.sanitize(meta));
  }

  static error(message: string, error?: any): void {
    console.error(`[ERROR] ${message}`, LogSanitizer.sanitizeError(error));
  }

  static debug(message: string, meta?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, LogSanitizer.sanitize(meta));
    }
  }
}