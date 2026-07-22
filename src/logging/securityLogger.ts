import fs from 'fs';
import path from 'path';
import { maskSensitiveData } from '../middleware/errorHandler';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  SECURITY = 'SECURITY',
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: any;
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
}

export class SecurityLogger {
  private logFilePath: string;
  private maxFileSize: number; // 바이트 단위
  private currentFileSize: number = 0;

  constructor(logFilePath: string = './logs/security.log', maxFileSize: number = 10 * 1024 * 1024) { // 10MB
    this.logFilePath = logFilePath;
    this.maxFileSize = maxFileSize;

    // 로그 디렉토리 생성
    const logDir = path.dirname(logFilePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // 현재 파일 크기 확인
    if (fs.existsSync(logFilePath)) {
      this.currentFileSize = fs.statSync(logFilePath).size;
    }
  }

  // 로그 라인 생성
  private formatLogEntry(entry: LogEntry): string {
    return JSON.stringify(entry) + '\n';
  }

  // 로그 파일에 쓰기
  private writeLog(entry: LogEntry): void {
    const logLine = this.formatLogEntry(entry);
    const logSize = Buffer.byteLength(logLine);

    // 파일 크기 확인 및 로테이션
    if (this.currentFileSize + logSize > this.maxFileSize) {
      this.rotateLog();
    }

    fs.appendFileSync(this.logFilePath, logLine);
    this.currentFileSize += logSize;
  }

  // 로그 파일 로테이션
  private rotateLog(): void {
    const rotatedPath = this.logFilePath.replace(/\.log$/, `.${Date.now()}.log`);
    fs.renameSync(this.logFilePath, rotatedPath);
    this.currentFileSize = 0;
  }

  // 민감 정보 마스킹
  private maskSensitiveInfo(data: any): any {
    return maskSensitiveData(data);
  }

  // 일반 로그
  log(level: LogLevel, message: string, context?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: context ? this.maskSensitiveInfo(context) : undefined,
    };

    this.writeLog(entry);
  }

  // 디버그 로그
  debug(message: string, context?: any): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  // 정보 로그
  info(message: string, context?: any): void {
    this.log(LogLevel.INFO, message, context);
  }

  // 경고 로그
  warn(message: string, context?: any): void {
    this.log(LogLevel.WARN, message, context);
  }

  // 오류 로그
  error(message: string, context?: any): void {
    this.log(LogLevel.ERROR, message, context);
  }

  // 보안 이벤트 로그
  security(message: string, context?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.SECURITY,
      message,
      context: context ? this.maskSensitiveInfo(context) : undefined,
    };

    this.writeLog(entry);
  }

  // 인증 시도 로그
  logAuthAttempt(ip: string, userAgent: string, success: boolean, userId?: string, details?: any): void {
    this.security(`Authentication ${success ? 'successful' : 'failed'}`, {
      ip,
      userAgent,
      userId,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  // API 접근 로그
  logApiAccess(ip: string, userAgent: string, endpoint: string, method: string, userId?: string, status: number = 200): void {
    this.info(`API access to ${endpoint}`, {
      ip,
      userAgent,
      endpoint,
      method,
      userId,
      status,
      timestamp: new Date().toISOString()
    });
  }

  // 민감한 데이터 접근 로그
  logDataAccess(userId: string, dataType: string, action: string, details?: any): void {
    this.security(`Sensitive data access: ${action} ${dataType}`, {
      userId,
      dataType,
      action,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  // 보안 위협 탐지 로그
  logSecurityThreat(type: string, ip: string, details?: any): void {
    this.security(`Security threat detected: ${type}`, {
      type,
      ip,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  // 입력 검증 실패 로그
  logValidationError(ip: string, endpoint: string, errors: string[], body?: any): void {
    this.security('Input validation failed', {
      ip,
      endpoint,
      errors,
      body: body ? this.maskSensitiveInfo(body) : undefined,
      timestamp: new Date().toISOString()
    });
  }

  // 브루트 포스 시도 감지 로그
  logBruteForceAttempt(ip: string, attempts: number, period: string, userId?: string): void {
    this.security(`Potential brute force attack detected`, {
      ip,
      attempts,
      period,
      userId,
      timestamp: new Date().toISOString()
    });
  }

  // 세션 관련 이벤트 로그
  logSessionEvent(sessionId: string, userId: string, event: string, details?: any): void {
    this.security(`Session event: ${event}`, {
      sessionId,
      userId,
      event,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  // 데이터 변경 로그
  logDataModification(userId: string, dataType: string, action: string, recordId: string, changes?: any): void {
    this.security(`Data modification: ${action} ${dataType}`, {
      userId,
      dataType,
      action,
      recordId,
      changes: changes ? this.maskSensitiveInfo(changes) : undefined,
      timestamp: new Date().toISOString()
    });
  }

  // 시스템 이상 감지 로그
  logSystemAnomaly(type: string, severity: 'low' | 'medium' | 'high', details?: any): void {
    this.security(`System anomaly detected: ${type}`, {
      type,
      severity,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  // 로그 파일 크기 확인
  getLogFileSize(): number {
    if (fs.existsSync(this.logFilePath)) {
      return fs.statSync(this.logFilePath).size;
    }
    return 0;
  }

  // 로그 파일 삭제
  clearLogs(): void {
    if (fs.existsSync(this.logFilePath)) {
      fs.unlinkSync(this.logFilePath);
      this.currentFileSize = 0;
    }
  }

  // 특정 기간의 로그 읽기
  readLogs(fromDate: Date, toDate: Date = new Date()): LogEntry[] {
    if (!fs.existsSync(this.logFilePath)) {
      return [];
    }

    const fileContent = fs.readFileSync(this.logFilePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');

    return lines
      .map(line => {
        try {
          return JSON.parse(line) as LogEntry;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is LogEntry => entry !== null)
      .filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= fromDate && entryDate <= toDate;
      });
  }

  // 로그 수준별 필터링
  getLogsByLevel(levels: LogLevel[]): LogEntry[] {
    if (!fs.existsSync(this.logFilePath)) {
      return [];
    }

    const fileContent = fs.readFileSync(this.logFilePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');

    return lines
      .map(line => {
        try {
          return JSON.parse(line) as LogEntry;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is LogEntry => entry !== null)
      .filter(entry => levels.includes(entry.level));
  }
}

// 전역 보안 로거 인스턴스
export const securityLogger = new SecurityLogger('./logs/security.log');

// 로깅 미들웨어
export function loggingMiddleware(req: any, res: any, next: () => void) {
  const startTime = Date.now();

  // 응답 완료 시 로깅
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    securityLogger.logApiAccess(
      req.ip,
      req.get('User-Agent') || '',
      req.originalUrl,
      req.method,
      req.userId,
      res.statusCode
    );
  });

  next();
}