import { securityLogger } from './securityLogger';
import { maskSensitiveData } from '../middleware/errorHandler';

export interface LogSecurityConfig {
  maskTokens: boolean;
  maskPasswords: boolean;
  maskApiKeys: boolean;
  maskCreditCards: boolean;
  maskSsn: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'security';
  piiMasking: boolean; // 개인 식별 정보 마스킹
}

export class LogSecurityManager {
  private config: LogSecurityConfig;
  private readonly SENSITIVE_FIELDS = [
    'password', 'pwd', 'secret', 'key', 'token', 'authorization', 
    'apikey', 'api_key', 'access_token', 'refresh_token', 'jwt',
    'creditCard', 'cardNumber', 'cvv', 'ssn', 'socialSecurity', 
    'bankAccount', 'pin', 'otp', 'verificationCode'
  ];

  constructor(config?: Partial<LogSecurityConfig>) {
    this.config = {
      maskTokens: true,
      maskPasswords: true,
      maskApiKeys: true,
      maskCreditCards: true,
      maskSsn: true,
      logLevel: 'info',
      piiMasking: true,
      ...config
    };
  }

  // 민감한 로그 데이터 마스킹
  maskSensitiveData(data: any): any {
    if (!data) return data;

    // 기존 마스킹 기능 사용
    return maskSensitiveData(data);
  }

  // 로그 데이터 검증
  validateLogData(data: any): boolean {
    if (typeof data === 'string') {
      // 일반적인 민감 정보 패턴 검사
      const sensitivePatterns = [
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // 이메일
        /\b(?:\d{4}[-\s]?){3}\d{4}\b/, // 신용카드
        /\b\d{3}-\d{2}-\d{4}\b/, // SSN
        /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/, // 전화번호
      ];

      return !sensitivePatterns.some(pattern => pattern.test(data));
    }

    if (typeof data === 'object' && data !== null) {
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') {
          if (!this.validateLogData(value)) {
            return false;
          }
        }
      }
    }

    return true;
  }

  // 안전한 로그 작성
  safeLog(level: 'debug' | 'info' | 'warn' | 'error' | 'security', message: string, context?: any): void {
    // 로그 레벨 확인
    if (!this.shouldLog(level)) {
      return;
    }

    // 민감 정보 마스킹
    const safeContext = context ? this.maskSensitiveData(context) : undefined;

    // 마스킹 후 유효성 검사
    if (safeContext && !this.validateLogData(safeContext)) {
      securityLogger.security('Potentially unsafe log data detected', {
        originalMessage: message,
        attemptedContext: JSON.stringify(context).substring(0, 200) + '...'
      });
      return;
    }

    // 안전한 데이터만 로깅
    switch (level) {
      case 'debug':
        if (process.env.NODE_ENV === 'development') {
          securityLogger.debug(message, safeContext);
        }
        break;
      case 'info':
        securityLogger.info(message, safeContext);
        break;
      case 'warn':
        securityLogger.warn(message, safeContext);
        break;
      case 'error':
        securityLogger.error(message, safeContext);
        break;
      case 'security':
        securityLogger.security(message, safeContext);
        break;
    }
  }

  // 조건부 로깅
  conditionalLog(condition: boolean, level: 'debug' | 'info' | 'warn' | 'error' | 'security', message: string, context?: any): void {
    if (condition) {
      this.safeLog(level, message, context);
    }
  }

  // 오류 안전 로깅
  safeError(error: Error, context?: any): void {
    this.safeLog('error', error.message, {
      ...context,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      name: error.name
    });
  }

  // 민감한 요청 로깅
  logRequest(ip: string, userAgent: string, url: string, method: string, body?: any, userId?: string): void {
    // 민감한 요청 본문 마스킹
    const safeBody = body ? this.maskSensitiveData(body) : undefined;

    this.safeLog('info', `API request: ${method} ${url}`, {
      ip,
      userAgent: userAgent.substring(0, 100), // 길이 제한
      method,
      url,
      body: safeBody,
      userId,
      timestamp: new Date().toISOString()
    });
  }

  // 민감한 응답 로깅
  logResponse(statusCode: number, url: string, response?: any, userId?: string): void {
    // 응답 본문 마스킹
    const safeResponse = response ? this.maskSensitiveData(response) : undefined;

    this.safeLog('info', `API response: ${statusCode} for ${url}`, {
      statusCode,
      url,
      response: safeResponse,
      userId,
      timestamp: new Date().toISOString()
    });
  }

  // 사용자 행동 로깅
  logUserAction(userId: string, action: string, details?: any): void {
    const safeDetails = details ? this.maskSensitiveData(details) : undefined;

    this.safeLog('security', `User action: ${action}`, {
      userId,
      action,
      details: safeDetails,
      timestamp: new Date().toISOString()
    });
  }

  // 데이터 접근 로깅
  logDataAccess(userId: string, dataType: string, action: string, recordId?: string, data?: any): void {
    // 실제 데이터는 마스킹하거나 로깅하지 않음
    const logData = data ? this.maskSensitiveData(data) : undefined;

    securityLogger.logDataAccess(userId, dataType, action, {
      recordId,
      hasData: !!data,
      dataPreview: logData ? '[MASKED_DATA_PREVIEW]' : undefined,
      timestamp: new Date().toISOString()
    });
  }

  // 보안 이벤트 로깅
  logSecurityEvent(type: string, ip: string, details?: any): void {
    const safeDetails = details ? this.maskSensitiveData(details) : undefined;

    securityLogger.logSecurityThreat(type, ip, safeDetails);
  }

  // 로그 레벨 확인
  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error' | 'security'): boolean {
    const levels = ['debug', 'info', 'warn', 'error', 'security'];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const targetLevelIndex = levels.indexOf(level);

    return targetLevelIndex >= currentLevelIndex;
  }

  // 설정 업데이트
  updateConfig(newConfig: Partial<LogSecurityConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  // 현재 설정 반환
  getConfig(): LogSecurityConfig {
    return { ...this.config };
  }

  // 민감한 필드 이름 검사
  isSensitiveField(fieldName: string): boolean {
    const lowerFieldName = fieldName.toLowerCase();
    return this.SENSITIVE_FIELDS.some(field => lowerFieldName.includes(field));
  }

  // 로그 마스킹 규칙 추가
  addSensitiveField(fieldName: string): void {
    if (!this.SENSITIVE_FIELDS.includes(fieldName.toLowerCase())) {
      this.SENSITIVE_FIELDS.push(fieldName.toLowerCase());
    }
  }

  // 로그 정책 검증
  validateLoggingPolicy(): boolean {
    // 현재 설정이 보안 기준을 충족하는지 검증
    return this.config.piiMasking && 
           this.config.maskPasswords && 
           this.config.maskApiKeys;
  }
}

// 전역 로그 보안 관리자 인스턴스
export const logSecurityManager = new LogSecurityManager({
  maskTokens: true,
  maskPasswords: true,
  maskApiKeys: true,
  maskCreditCards: true,
  maskSsn: true,
  logLevel: 'info',
  piiMasking: true
});

// 로깅 헬퍼 함수들
export const logHelpers = {
  // 안전한 오류 로깅
  safeError: (error: Error, context?: any) => {
    logSecurityManager.safeError(error, context);
  },

  // 조건부 정보 로깅
  conditionalInfo: (condition: boolean, message: string, context?: any) => {
    logSecurityManager.conditionalLog(condition, 'info', message, context);
  },

  // 보안 이벤트 로깅
  securityEvent: (type: string, ip: string, details?: any) => {
    logSecurityManager.logSecurityEvent(type, ip, details);
  },

  // 사용자 행동 로깅
  userAction: (userId: string, action: string, details?: any) => {
    logSecurityManager.logUserAction(userId, action, details);
  },

  // 요청 로깅
  request: (req: any, userId?: string) => {
    logSecurityManager.logRequest(
      req.ip || 'unknown',
      req.headers['user-agent'] || 'unknown',
      req.url || 'unknown',
      req.method || 'unknown',
      req.body,
      userId
    );
  }
};