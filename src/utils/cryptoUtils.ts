import crypto from 'crypto';
import { securityConfig } from '../config/securityConfig';

export interface EncryptedData {
  encryptedData: string;
  iv: string;
  authTag?: string; // GCM 모드일 경우 인증 태그
}

export class CryptoUtils {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 16; // 128 bits

  // 암호화 키 생성 (PBKDF2를 사용한 키 파생)
  static deriveKey(password: string, salt: Buffer = crypto.randomBytes(16)): Buffer {
    return crypto.pbkdf2Sync(
      password,
      salt,
      100000, // 반복 횟수
      this.KEY_LENGTH,
      'sha256'
    );
  }

  // 데이터 암호화
  static encrypt(data: string | Buffer, key?: string): EncryptedData {
    const encryptionKey = key ? this.deriveKey(key) : Buffer.from(securityConfig.encryptionKey.substring(0, 32).padEnd(32, '0'), 'utf8');
    
    if (encryptionKey.length !== this.KEY_LENGTH) {
      throw new Error('Encryption key must be 32 bytes long');
    }

    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipher(this.ALGORITHM, encryptionKey);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  // 데이터 복호화
  static decrypt(encryptedData: EncryptedData, key?: string): string {
    const encryptionKey = key ? this.deriveKey(key) : Buffer.from(securityConfig.encryptionKey.substring(0, 32).padEnd(32, '0'), 'utf8');
    
    if (encryptionKey.length !== this.KEY_LENGTH) {
      throw new Error('Encryption key must be 32 bytes long');
    }

    const decipher = crypto.createDecipher(this.ALGORITHM, encryptionKey);
    decipher.setAuthTag(Buffer.from(encryptedData.authTag!, 'hex'));
    decipher.setIV(Buffer.from(encryptedData.iv, 'hex'));

    let decrypted = decipher.update(encryptedData.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // 해시 생성 (비밀번호 등에 사용)
  static hash(data: string, salt?: string): { hash: string; salt: string } {
    const saltToUse = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(
      data,
      saltToUse,
      100000, // 반복 횟수
      64, // 512 bits
      'sha512'
    ).toString('hex');

    return { hash, salt: saltToUse };
  }

  // 해시 검증
  static verifyHash(data: string, hash: string, salt: string): boolean {
    const { hash: computedHash } = this.hash(data, salt);
    return crypto.timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(computedHash, 'hex')
    );
  }

  // 대칭 키 생성
  static generateSymmetricKey(): string {
    return crypto.randomBytes(this.KEY_LENGTH).toString('base64');
  }

  // 비대칭 키 air 생성
  static generateKeyPair(): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    return { publicKey, privateKey };
  }

  // HMAC 생성
  static generateHmac(data: string, key?: string): string {
    const signingKey = key || securityConfig.jwtSecret;
    return crypto
      .createHmac('sha256', signingKey)
      .update(data)
      .digest('hex');
  }

  // HMAC 검증
  static verifyHmac(data: string, hmac: string, key?: string): boolean {
    const expectedHmac = this.generateHmac(data, key);
    return crypto.timingSafeEqual(
      Buffer.from(hmac, 'hex'),
      Buffer.from(expectedHmac, 'hex')
    );
  }

  // 데이터 무결성 검증 (체크섬)
  static generateChecksum(data: string | Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // 데이터 무결성 검증
  static verifyChecksum(data: string | Buffer, checksum: string): boolean {
    const expectedChecksum = this.generateChecksum(data);
    return crypto.timingSafeEqual(
      Buffer.from(checksum, 'hex'),
      Buffer.from(expectedChecksum, 'hex')
    );
  }

  // 안전한 랜덤 문자열 생성
  static generateSecureRandomString(length: number): string {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').substring(0, length);
  }

  // 세션 ID 생성
  static generateSessionId(): string {
    return this.generateSecureRandomString(32);
  }

  // CSRF 토큰 생성
  static generateCsrfToken(userId: string, timestamp: number = Date.now()): string {
    const data = `${userId}.${timestamp}.${this.generateSecureRandomString(16)}`;
    return this.generateHmac(data);
  }
}

// 암호화된 설정 관리자
export class SecureConfigManager {
  private encryptedConfigs: Map<string, EncryptedData> = new Map();

  // 설정 저장 (암호화)
  setConfig(key: string, value: any, encryptionKey?: string): void {
    const serializedValue = JSON.stringify(value);
    const encrypted = CryptoUtils.encrypt(serializedValue, encryptionKey);
    this.encryptedConfigs.set(key, encrypted);
  }

  // 설정 불러오기 (복호화)
  getConfig<T>(key: string, encryptionKey?: string): T | null {
    const encryptedData = this.encryptedConfigs.get(key);
    if (!encryptedData) {
      return null;
    }

    try {
      const decrypted = CryptoUtils.decrypt(encryptedData, encryptionKey);
      return JSON.parse(decrypted) as T;
    } catch (error) {
      console.error(`Failed to decrypt config for key ${key}:`, error);
      return null;
    }
  }

  // 설정 삭제
  removeConfig(key: string): void {
    this.encryptedConfigs.delete(key);
  }

  // 모든 설정 삭제
  clearAll(): void {
    this.encryptedConfigs.clear();
  }
}