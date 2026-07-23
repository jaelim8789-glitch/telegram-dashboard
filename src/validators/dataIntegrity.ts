import { z } from 'zod';
import { InputValidator } from '../utils/inputValidation';
import { CryptoUtils } from '../utils/cryptoUtils';

// 사용자 데이터 스키마
export const UserSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens"),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  isActive: z.boolean(),
  profilePicture: z.string().url().optional(),
  lastLoginAt: z.date().optional(),
});

// 계정 데이터 스키마
export const AccountSchema = z.object({
  id: z.string().uuid(),
  telegramId: z.string().min(1),
  firstName: z.string().max(64).optional(),
  lastName: z.string().max(64).optional(),
  username: z.string().max(32).optional(),
  isActive: z.boolean(),
  connectedAt: z.date(),
  disconnectedAt: z.date().optional(),
  userId: z.string().uuid(),
});

// 메시지 데이터 스키마
export const MessageSchema = z.object({
  id: z.string().uuid(),
  content: z.string().max(4096),
  senderId: z.string().uuid(),
  recipientId: z.string().uuid(),
  sentAt: z.date(),
  readAt: z.date().optional(),
  isEncrypted: z.boolean().optional(),
  attachments: z.array(z.string().url()).optional(),
});

// 자동 응답 규칙 스키마
export const AutoReplyRuleSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  keyword: z.string().min(1).max(100),
  response: z.string().max(2048),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  schedule: z.object({
    startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:MM 형식
    endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    daysOfWeek: z.array(z.number().min(0).max(6)).optional(), // 0: Sunday, 1: Monday, ..., 6: Saturday
  }).optional(),
});

// 데이터 무결성 검사기
export class DataIntegrityValidator {
  // 사용자 데이터 검증
  static validateUser(data: any): { success: boolean; data?: any; error?: string } {
    try {
      const validatedData = UserSchema.parse(data);
      return { success: true, data: validatedData };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: error.errors.map(e => e.message).join(', ') };
      }
      return { success: false, error: 'Unknown validation error' };
    }
  }

  // 계정 데이터 검증
  static validateAccount(data: any): { success: boolean; data?: any; error?: string } {
    try {
      const validatedData = AccountSchema.parse(data);
      return { success: true, data: validatedData };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: error.errors.map(e => e.message).join(', ') };
      }
      return { success: false, error: 'Unknown validation error' };
    }
  }

  // 메시지 데이터 검증
  static validateMessage(data: any): { success: boolean; data?: any; error?: string } {
    try {
      const validatedData = MessageSchema.parse(data);
      
      // 추가적인 비즈니스 로직 검증
      if (validatedData.senderId === validatedData.recipientId) {
        return { success: false, error: 'Sender and recipient cannot be the same' };
      }
      
      return { success: true, data: validatedData };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: error.errors.map(e => e.message).join(', ') };
      }
      return { success: false, error: 'Unknown validation error' };
    }
  }

  // 자동 응답 규칙 검증
  static validateAutoReplyRule(data: any): { success: boolean; data?: any; error?: string } {
    try {
      const validatedData = AutoReplyRuleSchema.parse(data);
      
      // 추가적인 비즈니스 로직 검증
      if (validatedData.schedule) {
        const startHour = parseInt(validatedData.schedule.startTime.split(':')[0]);
        const endHour = parseInt(validatedData.schedule.endTime.split(':')[0]);
        
        if (startHour >= endHour) {
          return { success: false, error: 'Start time must be before end time' };
        }
      }
      
      return { success: true, data: validatedData };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: error.errors.map(e => e.message).join(', ') };
      }
      return { success: false, error: 'Unknown validation error' };
    }
  }

  // 일반 객체에 대해 스키마 기반 검증
  static validateWithSchema<T extends z.ZodSchema>(schema: T, data: any): { success: boolean; data?: z.infer<T>; error?: string } {
    try {
      const validatedData = schema.parse(data);
      return { success: true, data: validatedData };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, error: error.errors.map(e => e.message).join(', ') };
      }
      return { success: false, error: 'Unknown validation error' };
    }
  }

  // 데이터 해시 생성 (무결성 검증용)
  static generateDataIntegrityHash(data: any): string {
    const serialized = JSON.stringify(data, Object.keys(data).sort());
    return CryptoUtils.generateChecksum(serialized);
  }

  // 데이터 무결성 검증
  static verifyDataIntegrity(data: any, expectedHash: string): boolean {
    const calculatedHash = this.generateDataIntegrityHash(data);
    return CryptoUtils.verifyChecksum(calculatedHash, expectedHash);
  }

  // SQL 인젝션 시도 탐지
  static detectSqlInjection(data: any): boolean {
    if (typeof data === 'string') {
      return InputValidator.containsSqlInjectionAttempt(data);
    }
    
    if (typeof data === 'object' && data !== null) {
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string' && InputValidator.containsSqlInjectionAttempt(value)) {
          return true;
        }
      }
    }
    
    return false;
  }

  // XSS 시도 탐지
  static detectXssAttempt(data: any): boolean {
    if (typeof data === 'string') {
      return InputValidator.containsXssAttempt(data);
    }
    
    if (typeof data === 'object' && data !== null) {
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string' && InputValidator.containsXssAttempt(value)) {
          return true;
        }
      }
    }
    
    return false;
  }

  // 민감한 정보 검출
  static detectSensitiveInformation(data: any): string[] {
    const sensitivePatterns = [
      { name: 'Email', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g },
      { name: 'Credit Card', pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g },
      { name: 'SSN', pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
      { name: 'Phone', pattern: /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g },
      { name: 'IP Address', pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g },
    ];
    
    const detections: string[] = [];
    
    const checkString = (str: string) => {
      for (const { name, pattern } of sensitivePatterns) {
        if (pattern.test(str)) {
          detections.push(name);
        }
      }
    };
    
    if (typeof data === 'string') {
      checkString(data);
    } else if (typeof data === 'object' && data !== null) {
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') {
          checkString(value);
        }
      }
    }
    
    return [...new Set(detections)]; // 중복 제거
  }
}

// 데이터 검증 미들웨어
export function validateData(schema: z.ZodSchema) {
  return (req: any, res: any, next: () => void) => {
    try {
      const validatedData = schema.parse(req.body);
      req.validatedBody = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(e => e.message).join(', ');
        res.status(400).json({ error: `Validation failed: ${errors}` });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}