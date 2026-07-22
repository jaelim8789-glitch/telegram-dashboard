// 고급 보안 기능
export interface SecurityEvent {
  id: string;
  type: 'login_attempt' | 'session_expired' | 'unauthorized_access' | 'data_breach' | 'anomalous_behavior' | 'security_alert';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, any>;
  resolved: boolean;
  resolvedBy?: string;
  resolutionTime?: Date;
}

export interface SecurityRule {
  id: string;
  name: string;
  description: string;
  condition: (event: SecurityEvent) => boolean;
  severity: SecurityEvent['severity'];
  action: (event: SecurityEvent) => void;
  enabled: boolean;
}

export interface SecurityProfile {
  userId: string;
  riskScore: number; // 0-100
  trustedDevices: string[];
  suspiciousActivities: number;
  lastSecurityEvent?: Date;
  securityLevel: 'basic' | 'standard' | 'premium';
  twoFactorEnabled: boolean;
  lastPasswordChange?: Date;
}

export interface ThreatIntelligence {
  ipAddresses: Set<string>;
  domains: Set<string>;
  patterns: RegExp[];
  lastUpdated: Date;
}

export interface SecurityAuditOptions {
  enableLogging: boolean;
  logRetentionDays: number;
  threatDetection: boolean;
  autoResolve: boolean;
  notificationThreshold: number; // 보안 이벤트 알림 임계값
}

class SecurityAuditManager {
  private events: SecurityEvent[] = [];
  private rules: SecurityRule[] = [];
  private profiles: Map<string, SecurityProfile> = new Map();
  private threatIntel: ThreatIntelligence;
  private options: SecurityAuditOptions;
  private listeners: Array<(event: SecurityEvent) => void> = [];
  private sessionTokens: Map<string, { userId: string; expiresAt: Date }> = new Map();

  constructor(options: SecurityAuditOptions = {
    enableLogging: true,
    logRetentionDays: 30,
    threatDetection: true,
    autoResolve: false,
    notificationThreshold: 5
  }) {
    this.options = options;
    this.threatIntel = {
      ipAddresses: new Set(),
      domains: new Set(),
      patterns: [],
      lastUpdated: new Date()
    };

    // 기본 보안 규칙 설정
    this.setupDefaultRules();
    
    // 로그 정리 타이머
    this.startLogCleanupTimer();
  }

  // 이벤트 리스너 등록
  subscribe(listener: (event: SecurityEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // 이벤트 알림
  private notifyListeners(event: SecurityEvent): void {
    this.listeners.forEach(listener => listener(event));
  }

  // 기본 보안 규칙 설정
  private setupDefaultRules(): void {
    // 반복 로그인 시도 감지
    this.addRule({
      id: 'multiple_failed_logins',
      name: 'Multiple Failed Logins',
      description: '짧은 시간 내 여러 번의 로그인 실패 감지',
      condition: (event: SecurityEvent) => {
        if (event.type !== 'login_attempt' || event.details.success) return false;
        
        const recentFailures = this.events.filter(e => 
          e.type === 'login_attempt' && 
          !e.details.success &&
          e.ipAddress === event.ipAddress &&
          e.timestamp > new Date(Date.now() - 5 * 60 * 1000) // 5분 이내
        ).length;
        
        return recentFailures >= 5;
      },
      severity: 'high',
      action: (event: SecurityEvent) => {
        console.warn(`Potential brute force attack detected from IP: ${event.ipAddress}`);
        // IP 차단 로직 등
      },
      enabled: true
    });

    // 비정상적인 세션 활동 감지
    this.addRule({
      id: 'anomalous_session_activity',
      name: 'Anomalous Session Activity',
      description: '비정상적인 위치 또는 시간의 세션 활동 감지',
      condition: (event: SecurityEvent) => {
        if (!event.userId || !event.ipAddress) return false;
        
        const profile = this.profiles.get(event.userId);
        if (!profile) return false;
        
        // 간단한 위치 기반 이상 탐지 (IP 기반)
        const knownDevices = profile.trustedDevices;
        return !knownDevices.includes(event.ipAddress);
      },
      severity: 'medium',
      action: (event: SecurityEvent) => {
        console.warn(`Unusual activity detected for user: ${event.userId}`);
      },
      enabled: true
    });
  }

  // 보안 이벤트 기록
  recordEvent(event: Omit<SecurityEvent, 'id' | 'resolved' | 'timestamp'>): string {
    const id = `sec-event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const securityEvent: SecurityEvent = {
      ...event,
      id,
      timestamp: new Date(),
      resolved: false
    };

    this.events.push(securityEvent);

    // 보안 규칙 적용
    this.applySecurityRules(securityEvent);

    // 프로필 업데이트
    if (event.userId) {
      this.updateSecurityProfile(event.userId, securityEvent);
    }

    // 리스너에 알림
    this.notifyListeners(securityEvent);

    return id;
  }

  // 보안 규칙 적용
  private applySecurityRules(event: SecurityEvent): void {
    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      
      if (rule.condition(event)) {
        rule.action(event);
        
        // 이벤트 중요도 업데이트
        if (rule.severity !== event.severity) {
          event.severity = rule.severity;
        }
      }
    }
  }

  // 보안 프로필 업데이트
  private updateSecurityProfile(userId: string, event: SecurityEvent): void {
    let profile = this.profiles.get(userId);
    if (!profile) {
      profile = this.createDefaultProfile(userId);
      this.profiles.set(userId, profile);
    }

    // 위험 점수 계산
    profile.riskScore = this.calculateRiskScore(userId);
    profile.lastSecurityEvent = event.timestamp;

    // 보안 수준 결정
    if (profile.riskScore >= 80) {
      profile.securityLevel = 'premium';
    } else if (profile.riskScore >= 50) {
      profile.securityLevel = 'standard';
    } else {
      profile.securityLevel = 'basic';
    }
  }

  // 기본 프로필 생성
  private createDefaultProfile(userId: string): SecurityProfile {
    return {
      userId,
      riskScore: 0,
      trustedDevices: [],
      suspiciousActivities: 0,
      securityLevel: 'basic',
      twoFactorEnabled: false
    };
  }

  // 위험 점수 계산
  private calculateRiskScore(userId: string): number {
    const userEvents = this.events.filter(e => e.userId === userId);
    let score = 0;

    for (const event of userEvents) {
      switch (event.severity) {
        case 'low': score += 5; break;
        case 'medium': score += 15; break;
        case 'high': score += 30; break;
        case 'critical': score += 50; break;
      }
    }

    // 최대 100점까지
    return Math.min(100, score);
  }

  // 보안 규칙 추가
  addRule(rule: SecurityRule): void {
    this.rules.push(rule);
  }

  // 보안 규칙 제거
  removeRule(ruleId: string): boolean {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index > -1) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  // 보안 프로필 가져오기
  getSecurityProfile(userId: string): SecurityProfile | undefined {
    return this.profiles.get(userId);
  }

  // 보안 이벤트 조회
  getEvents(
    userId?: string, 
    severity?: SecurityEvent['severity'], 
    eventType?: SecurityEvent['type'],
    limit?: number
  ): SecurityEvent[] {
    let filtered = this.events;

    if (userId) {
      filtered = filtered.filter(e => e.userId === userId);
    }

    if (severity) {
      filtered = filtered.filter(e => e.severity === severity);
    }

    if (eventType) {
      filtered = filtered.filter(e => e.type === eventType);
    }

    // 최신 순으로 정렬
    filtered = filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (limit) {
      filtered = filtered.slice(0, limit);
    }

    return filtered;
  }

  // 보안 이벤트 해결
  resolveEvent(eventId: string, resolvedBy?: string): boolean {
    const event = this.events.find(e => e.id === eventId);
    if (event && !event.resolved) {
      event.resolved = true;
      event.resolvedBy = resolvedBy;
      event.resolutionTime = new Date();
      return true;
    }
    return false;
  }

  // 위협 인텔리전스 업데이트
  updateThreatIntelligence(threats: {
    ipAddresses?: string[];
    domains?: string[];
    patterns?: RegExp[];
  }): void {
    if (threats.ipAddresses) {
      threats.ipAddresses.forEach(ip => this.threatIntel.ipAddresses.add(ip));
    }
    if (threats.domains) {
      threats.domains.forEach(domain => this.threatIntel.domains.add(domain));
    }
    if (threats.patterns) {
      this.threatIntel.patterns.push(...threats.patterns);
    }
    this.threatIntel.lastUpdated = new Date();
  }

  // 위협 감지
  detectThreat(event: SecurityEvent): boolean {
    if (!this.options.threatDetection) return false;

    // IP 기반 위협 감지
    if (event.ipAddress && this.threatIntel.ipAddresses.has(event.ipAddress)) {
      return true;
    }

    // 사용자 에이전트 기반 위협 감지
    if (event.userAgent) {
      for (const pattern of this.threatIntel.patterns) {
        if (pattern.test(event.userAgent)) {
          return true;
        }
      }
    }

    return false;
  }

  // 세션 토큰 관리
  createSessionToken(userId: string, expiresIn: number = 3600): string {
    const tokenId = `sess-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    
    this.sessionTokens.set(tokenId, { userId, expiresAt });
    
    return tokenId;
  }

  // 세션 토큰 검증
  validateSessionToken(tokenId: string): { valid: boolean; userId?: string } {
    const session = this.sessionTokens.get(tokenId);
    if (!session) {
      return { valid: false };
    }

    if (session.expiresAt < new Date()) {
      this.sessionTokens.delete(tokenId);
      return { valid: false };
    }

    return { valid: true, userId: session.userId };
  }

  // 세션 토큰 폐기
  invalidateSessionToken(tokenId: string): boolean {
    return this.sessionTokens.delete(tokenId);
  }

  // 보안 감사 보고서 생성
  generateAuditReport(): {
    totalEvents: number;
    unresolvedEvents: number;
    highSeverityEvents: number;
    threatDetected: number;
    riskiestUsers: Array<{ userId: string; riskScore: number }>;
    recentEvents: SecurityEvent[];
  } {
    const totalEvents = this.events.length;
    const unresolvedEvents = this.events.filter(e => !e.resolved).length;
    const highSeverityEvents = this.events.filter(e => e.severity === 'high' || e.severity === 'critical').length;
    const threatDetected = this.events.filter(e => this.detectThreat(e)).length;

    const riskiestUsers = Array.from(this.profiles.entries())
      .map(([userId, profile]) => ({ userId, riskScore: profile.riskScore }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);

    const recentEvents = this.events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 20);

    return {
      totalEvents,
      unresolvedEvents,
      highSeverityEvents,
      threatDetected,
      riskiestUsers,
      recentEvents
    };
  }

  // 로그 정리 타이머 시작
  private startLogCleanupTimer(): void {
    setInterval(() => {
      this.cleanupOldLogs();
    }, 24 * 60 * 60 * 1000); // 24시간마다
  }

  // 오래된 로그 정리
  private cleanupOldLogs(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.options.logRetentionDays);

    this.events = this.events.filter(event => event.timestamp >= cutoffDate);
  }

  // 침입 탐지
  detectIntrusion(userId: string, currentIp: string): {
    isSuspicious: boolean;
    riskFactors: string[];
    recommendedAction: 'allow' | 'warn' | 'block';
  } {
    const profile = this.profiles.get(userId);
    if (!profile) {
      return {
        isSuspicious: true,
        riskFactors: ['unknown_user_profile'],
        recommendedAction: 'warn'
      };
    }

    const riskFactors: string[] = [];

    // 신뢰할 수 없는 장치에서의 접속
    if (!profile.trustedDevices.includes(currentIp)) {
      riskFactors.push('untrusted_device');
    }

    // 위험 점수가 높은 경우
    if (profile.riskScore >= 70) {
      riskFactors.push('high_risk_score');
    }

    // 최근 보안 이벤트가 있는 경우
    if (profile.lastSecurityEvent && 
        profile.lastSecurityEvent.getTime() > Date.now() - 24 * 60 * 60 * 1000) { // 24시간 이내
      riskFactors.push('recent_security_event');
    }

    // 위협 인텔리전스에 포함된 IP
    if (this.threatIntel.ipAddresses.has(currentIp)) {
      riskFactors.push('blacklisted_ip');
    }

    let recommendedAction: 'allow' | 'warn' | 'block' = 'allow';
    if (riskFactors.length >= 3) {
      recommendedAction = 'block';
    } else if (riskFactors.length >= 1) {
      recommendedAction = 'warn';
    }

    return {
      isSuspicious: riskFactors.length > 0,
      riskFactors,
      recommendedAction
    };
  }

  // 2FA 활성화
  enableTwoFactorAuth(userId: string): boolean {
    const profile = this.profiles.get(userId);
    if (!profile) return false;

    profile.twoFactorEnabled = true;
    return true;
  }

  // 2FA 비활성화
  disableTwoFactorAuth(userId: string): boolean {
    const profile = this.profiles.get(userId);
    if (!profile) return false;

    profile.twoFactorEnabled = false;
    return true;
  }

  // 비밀번호 변경
  updatePassword(userId: string): boolean {
    const profile = this.profiles.get(userId);
    if (!profile) return false;

    profile.lastPasswordChange = new Date();
    return true;
  }

  // 신뢰 장치 추가
  addTrustedDevice(userId: string, deviceId: string): boolean {
    const profile = this.profiles.get(userId);
    if (!profile) return false;

    if (!profile.trustedDevices.includes(deviceId)) {
      profile.trustedDevices.push(deviceId);
    }
    return true;
  }

  // 보안 이벤트 통계
  getSecurityStats(): {
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    monthlyTrend: Array<{ month: string; count: number }>;
  } {
    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};
    
    this.events.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
    });

    // 월별 트렌드 (최근 6개월)
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    
    const monthlyTrend: Array<{ month: string; count: number }> = [];
    for (let i = 0; i < 6; i++) {
      const monthDate = new Date();
      monthDate.setMonth(now.getMonth() - i);
      const monthKey = `${monthDate.getFullYear()}-${(monthDate.getMonth() + 1).toString().padStart(2, '0')}`;
      
      const count = this.events.filter(event => {
        const eventMonth = `${event.timestamp.getFullYear()}-${(event.timestamp.getMonth() + 1).toString().padStart(2, '0')}`;
        return eventMonth === monthKey;
      }).length;
      
      monthlyTrend.push({ month: monthKey, count });
    }

    return {
      eventsByType,
      eventsBySeverity,
      monthlyTrend: monthlyTrend.reverse()
    };
  }

  // 전체 보안 상태 초기화
  resetSecurityState(): void {
    this.events = [];
    this.profiles.clear();
    this.sessionTokens.clear();
  }

  // 메모리 정리
  destroy(): void {
    this.listeners = [];
    this.rules = [];
    this.profiles.clear();
    this.sessionTokens.clear();
    this.events = [];
  }
}

// 전역 보안 감사 관리자 인스턴스
export const securityAuditManager = new SecurityAuditManager();

// React 훅 형태
export function useSecurityAudit() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [auditReport, setAuditReport] = useState(securityAuditManager.generateAuditReport());

  useEffect(() => {
    const updateEvents = () => {
      setEvents(securityAuditManager.getEvents(undefined, undefined, undefined, 20));
      setAuditReport(securityAuditManager.generateAuditReport());
    };

    const unsubscribe = securityAuditManager.subscribe(updateEvents);
    
    // 주기적으로 업데이트
    const interval = setInterval(updateEvents, 30000); // 30초마다

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  return {
    events,
    auditReport,
    recordEvent: securityAuditManager.recordEvent.bind(securityAuditManager),
    getEvents: securityAuditManager.getEvents.bind(securityAuditManager),
    getSecurityProfile: securityAuditManager.getSecurityProfile.bind(securityAuditManager),
    resolveEvent: securityAuditManager.resolveEvent.bind(securityAuditManager),
    detectIntrusion: securityAuditManager.detectIntrusion.bind(securityAuditManager),
    generateAuditReport: securityAuditManager.generateAuditReport.bind(securityAuditManager),
    getSecurityStats: securityAuditManager.getSecurityStats.bind(securityAuditManager)
  };
}

// 보안 규칙 빌더
export class SecurityRuleBuilder {
  private rule: Partial<SecurityRule> = {
    enabled: true
  };

  id(id: string) {
    this.rule.id = id;
    return this;
  }

  name(name: string) {
    this.rule.name = name;
    return this;
  }

  description(desc: string) {
    this.rule.description = desc;
    return this;
  }

  condition(condition: (event: SecurityEvent) => boolean) {
    this.rule.condition = condition;
    return this;
  }

  severity(severity: SecurityEvent['severity']) {
    this.rule.severity = severity;
    return this;
  }

  action(action: (event: SecurityEvent) => void) {
    this.rule.action = action;
    return this;
  }

  enable(enabled: boolean) {
    this.rule.enabled = enabled;
    return this;
  }

  build(): SecurityRule {
    if (!this.rule.id || !this.rule.name || !this.rule.condition || !this.rule.action) {
      throw new Error('Security rule must have id, name, condition, and action');
    }

    return this.rule as SecurityRule;
  }
}

// 자주 사용하는 보안 규칙 템플릿
export const SecurityRuleTemplates = {
  // 로그인 실패 감지
  loginFailureDetector: () => {
    return new SecurityRuleBuilder()
      .id('login_failure_detector')
      .name('Login Failure Detector')
      .description('5분 이내 5회 이상 로그인 실패 감지')
      .condition((event: SecurityEvent) => {
        if (event.type !== 'login_attempt' || event.details.success) return false;
        
        // 실제 구현에서는 이전 이벤트를 확인
        return false; // 더미 구현
      })
      .severity('high')
      .action((event: SecurityEvent) => {
        console.warn(`Potential brute force attempt from ${event.ipAddress}`);
      })
      .build();
  },

  // 비정상 활동 감지
  anomalousActivityDetector: () => {
    return new SecurityRuleBuilder()
      .id('anomalous_activity_detector')
      .name('Anomalous Activity Detector')
      .description('비정상적인 시간 또는 위치의 활동 감지')
      .condition((event: SecurityEvent) => {
        // 실제 구현에서는 사용자 프로필 기반 분석
        return false; // 더미 구현
      })
      .severity('medium')
      .action((event: SecurityEvent) => {
        console.warn(`Anomalous activity detected for user ${event.userId}`);
      })
      .build();
  },

  // 데이터 접근 감지
  unauthorizedAccessDetector: () => {
    return new SecurityRuleBuilder()
      .id('unauthorized_access_detector')
      .name('Unauthorized Access Detector')
      .description('권한 없는 데이터 접근 시도 감지')
      .condition((event: SecurityEvent) => {
        return event.type === 'unauthorized_access';
      })
      .severity('critical')
      .action((event: SecurityEvent) => {
        console.error(`Unauthorized access attempt detected: ${JSON.stringify(event.details)}`);
      })
      .build();
  }
};

// 보안 유틸리티 함수들
export const securityUtils = {
  // IP 주소 마스킹
  maskIpAddress: (ip: string): string => {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.*.*`;
    }
    return ip;
  },

  // 민감한 정보 마스킹
  maskSensitiveData: (data: string, unmaskedChars: number = 4): string => {
    if (data.length <= unmaskedChars * 2) {
      return '*'.repeat(data.length);
    }
    
    const prefix = data.substring(0, unmaskedChars);
    const suffix = data.substring(data.length - unmaskedChars);
    const masked = '*'.repeat(data.length - unmaskedChars * 2);
    
    return `${prefix}${masked}${suffix}`;
  },

  // 비밀번호 강도 검사
  checkPasswordStrength: (password: string): {
    score: number;
    strength: 'weak' | 'medium' | 'strong' | 'very_strong';
    requirements: {
      length: boolean;
      uppercase: boolean;
      lowercase: boolean;
      number: boolean;
      specialChar: boolean;
    };
  } => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      specialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    const passedRequirements = Object.values(requirements).filter(Boolean).length;
    const score = Math.round((passedRequirements / 5) * 100);

    let strength: 'weak' | 'medium' | 'strong' | 'very_strong' = 'weak';
    if (score >= 80) strength = 'very_strong';
    else if (score >= 60) strength = 'strong';
    else if (score >= 40) strength = 'medium';

    return { score, strength, requirements };
  },

  // XSS 방지
  sanitizeInput: (input: string): string => {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  // SQL Injection 방지
  escapeSqlString: (str: string): string => {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\0/g, '\\0')
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n')
      .replace(/[\b]/g, '\\b');
  }
};