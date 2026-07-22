// 사용자 행동 분석 기능
export interface UserAction {
  id: string;
  userId: string;
  sessionId: string;
  action: string;
  category: 'navigation' | 'interaction' | 'input' | 'api-call' | 'error' | 'custom';
  target?: string;
  value?: any;
  timestamp: Date;
  duration?: number; // 작업 수행 시간 (ms)
  metadata?: Record<string, any>;
  pageUrl?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface AnalyticsEvent {
  name: string;
  properties: Record<string, any>;
  timestamp: Date;
  userId: string;
  sessionId: string;
}

export interface UserBehaviorProfile {
  userId: string;
  totalActions: number;
  sessionCount: number;
  avgSessionDuration: number;
  mostActiveTime: string; // HH:MM 형식
  preferredFeatures: string[];
  conversionRate: number;
  lastActive: Date;
  engagementScore: number; // 0-100
  retentionProbability: number; // 0-1
}

export interface BehaviorInsight {
  metric: string;
  currentValue: number;
  previousValue: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  significance: 'low' | 'medium' | 'high';
  recommendation: string;
}

export interface AnalyticsConfig {
  trackPageViews?: boolean;
  trackClicks?: boolean;
  trackInputs?: boolean;
  trackErrors?: boolean;
  sampleRate?: number; // 샘플링 비율 (0-1)
  flushInterval?: number; // 데이터 전송 간격 (ms)
  maxBufferSize?: number; // 최대 버퍼 크기
  enableAnonymization?: boolean; // 익명화 활성화
  consentRequired?: boolean; // 동의 필요 여부
}

class UserBehaviorAnalytics {
  private actions: UserAction[] = [];
  private buffer: UserAction[] = [];
  private profiles: Map<string, UserBehaviorProfile> = new Map();
  private config: AnalyticsConfig;
  private sessionId: string;
  private userId: string | null = null;
  private consentGiven: boolean = false;
  private flushTimer: NodeJS.Timeout | null = null;
  private listeners: Array<(action: UserAction) => void> = [];

  constructor(config: AnalyticsConfig = {}) {
    this.config = {
      trackPageViews: true,
      trackClicks: true,
      trackInputs: false,
      trackErrors: true,
      sampleRate: 1,
      flushInterval: 30000, // 30초
      maxBufferSize: 100,
      enableAnonymization: false,
      consentRequired: false,
      ...config
    };

    this.sessionId = this.generateSessionId();
    
    // 사용자 세션 초기화
    this.initSession();
    
    // 이벤트 리스너 등록
    this.setupEventListeners();
  }

  // 이벤트 리스너 등록
  private setupEventListeners(): void {
    if (typeof window !== 'undefined') {
      if (this.config.trackPageViews) {
        // 페이지 뷰 추적
        window.addEventListener('load', () => {
          this.trackAction('page_view', 'navigation', window.location.href);
        });

        // SPA 라우트 변경 추적
        const originalPushState = history.pushState;
        history.pushState = (...args) => {
          originalPushState.apply(history, args);
          setTimeout(() => {
            this.trackAction('route_change', 'navigation', window.location.href);
          }, 0);
          return originalPushState.apply(history, args);
        };
      }

      if (this.config.trackClicks) {
        // 클릭 이벤트 추적
        document.addEventListener('click', (event) => {
          const target = event.target as HTMLElement;
          this.trackAction('click', 'interaction', target.tagName, {
            elementId: target.id,
            elementClass: target.className,
            text: target.textContent?.substring(0, 50)
          });
        });
      }

      if (this.config.trackInputs) {
        // 입력 이벤트 추적
        document.addEventListener('input', (event) => {
          const target = event.target as HTMLInputElement;
          this.trackAction('input_change', 'input', target.tagName, {
            elementId: target.id,
            elementName: target.name,
            valueLength: target.value.length
          });
        });
      }

      if (this.config.trackErrors) {
        // 자바스크립트 오류 추적
        window.addEventListener('error', (event) => {
          this.trackAction('javascript_error', 'error', event.error?.message || 'Unknown error', {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          });
        });

        // Promise 오류 추적
        window.addEventListener('unhandledrejection', (event) => {
          this.trackAction('unhandled_rejection', 'error', event.reason?.toString() || 'Unknown rejection');
        });
      }
    }

    // 주기적으로 버퍼 플러시
    this.flushTimer = setInterval(() => {
      this.flushBuffer();
    }, this.config.flushInterval);
  }

  // 이벤트 리스너 등록
  subscribe(listener: (action: UserAction) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // 이벤트 알림
  private notifyListeners(action: UserAction): void {
    this.listeners.forEach(listener => listener(action));
  }

  // 세션 초기화
  private initSession(): void {
    // 사용자 ID 가져오기 (localStorage 또는 다른 소스에서)
    this.userId = localStorage.getItem('telemon_user_id');
    if (!this.userId) {
      this.userId = this.generateUserId();
      localStorage.setItem('telemon_user_id', this.userId);
    }
  }

  // 사용자 ID 생성
  private generateUserId(): string {
    return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // 세션 ID 생성
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // 사용자 행동 추적
  trackAction(
    action: string, 
    category: UserAction['category'], 
    target?: string, 
    value?: any, 
    metadata?: Record<string, any>
  ): void {
    if (!this.consentGiven && this.config.consentRequired) {
      return;
    }

    // 샘플링
    if (Math.random() > this.config.sampleRate!) {
      return;
    }

    const userAction: UserAction = {
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: this.userId || 'unknown',
      sessionId: this.sessionId,
      action,
      category,
      target,
      value,
      timestamp: new Date(),
      metadata: {
        ...metadata,
        pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
      }
    };

    // 익명화 처리
    if (this.config.enableAnonymization) {
      userAction.ipAddress = undefined;
      if (userAction.metadata) {
        delete userAction.metadata.ipAddress;
      }
    }

    this.actions.push(userAction);
    this.buffer.push(userAction);

    // 버퍼 크기 제한
    if (this.buffer.length > this.config.maxBufferSize!) {
      this.flushBuffer();
    }

    // 프로필 업데이트
    this.updateUserProfile(userAction);

    // 리스너에 알림
    this.notifyListeners(userAction);
  }

  // 사용자 프로필 업데이트
  private updateUserProfile(action: UserAction): void {
    const profile = this.profiles.get(action.userId) || this.createDefaultProfile(action.userId);
    
    profile.totalActions++;
    profile.lastActive = action.timestamp;
    
    // 선호 기능 추적
    if (!profile.preferredFeatures.includes(action.action)) {
      profile.preferredFeatures.push(action.action);
    }

    // 참여 점수 계산
    profile.engagementScore = this.calculateEngagementScore(profile);

    this.profiles.set(action.userId, profile);
  }

  // 기본 프로필 생성
  private createDefaultProfile(userId: string): UserBehaviorProfile {
    return {
      userId,
      totalActions: 0,
      sessionCount: 1,
      avgSessionDuration: 0,
      mostActiveTime: '00:00',
      preferredFeatures: [],
      conversionRate: 0,
      lastActive: new Date(),
      engagementScore: 0,
      retentionProbability: 0.5
    };
  }

  // 참여 점수 계산
  private calculateEngagementScore(profile: UserBehaviorProfile): number {
    // 간단한 참여 점수 계산 (0-100)
    const actionScore = Math.min(profile.totalActions / 10, 50); // 최대 50점
    const recencyScore = this.calculateRecencyScore(profile.lastActive); // 최대 30점
    const featureScore = Math.min(profile.preferredFeatures.length * 2, 20); // 최대 20점

    return Math.round(actionScore + recencyScore + featureScore);
  }

  // 최근성 점수 계산
  private calculateRecencyScore(lastActive: Date): number {
    const daysSinceLastActive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastActive < 1) return 30; // 24시간 이내면 30점
    if (daysSinceLastActive < 7) return 20; // 1주일 이내면 20점
    if (daysSinceLastActive < 30) return 10; // 1개월 이내면 10점
    return 0;
  }

  // 버퍼 플러시 (서버로 전송)
  private async flushBuffer(): Promise<void> {
    if (this.buffer.length === 0) return;

    const actionsToSend = [...this.buffer];
    this.buffer = [];

    try {
      // 실제 구현에서는 서버로 데이터 전송
      // await api.sendAnalyticsData(actionsToSend);
      console.log(`Flushing ${actionsToSend.length} analytics events to server`);
    } catch (error) {
      console.error('Failed to flush analytics buffer:', error);
      // 실패 시 다시 버퍼에 추가
      this.buffer.unshift(...actionsToSend);
    }
  }

  // 사용자 프로필 가져오기
  getUserProfile(userId: string): UserBehaviorProfile | undefined {
    return this.profiles.get(userId);
  }

  // 모든 사용자 프로필 가져오기
  getAllProfiles(): UserBehaviorProfile[] {
    return Array.from(this.profiles.values());
  }

  // 행동 통계 가져오기
  getBehaviorStats(): {
    totalActions: number;
    uniqueUsers: number;
    sessions: number;
    avgActionsPerUser: number;
    mostPopularActions: Array<{ action: string; count: number }>;
  } {
    const totalActions = this.actions.length;
    const uniqueUsers = new Set(this.actions.map(a => a.userId)).size;
    const sessions = new Set(this.actions.map(a => a.sessionId)).size;
    const avgActionsPerUser = uniqueUsers > 0 ? totalActions / uniqueUsers : 0;

    // 가장 인기 있는 액션
    const actionCounts: Record<string, number> = {};
    this.actions.forEach(action => {
      actionCounts[action.action] = (actionCounts[action.action] || 0) + 1;
    });

    const mostPopularActions = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalActions,
      uniqueUsers,
      sessions,
      avgActionsPerUser,
      mostPopularActions
    };
  }

  // 인사이트 생성
  generateInsights(): BehaviorInsight[] {
    const stats = this.getBehaviorStats();
    const insights: BehaviorInsight[] = [];

    // 사용자 증가 추세
    const recentActions = this.actions.filter(a => {
      const timeDiff = Date.now() - a.timestamp.getTime();
      return timeDiff < 7 * 24 * 60 * 60 * 1000; // 7일 이내
    });

    const prevRecentActions = this.actions.filter(a => {
      const timeDiff = Date.now() - a.timestamp.getTime();
      return timeDiff >= 7 * 24 * 60 * 60 * 1000 && timeDiff < 14 * 24 * 60 * 60 * 1000; // 7-14일 전
    });

    const currentWeekly = recentActions.length;
    const previousWeekly = prevRecentActions.length;
    const weeklyTrend = currentWeekly > previousWeekly ? 'increasing' : currentWeekly < previousWeekly ? 'decreasing' : 'stable';

    insights.push({
      metric: 'weekly_active_users',
      currentValue: currentWeekly,
      previousValue: previousWeekly,
      trend: weeklyTrend,
      significance: currentWeekly > 100 ? 'high' : currentWeekly > 50 ? 'medium' : 'low',
      recommendation: weeklyTrend === 'decreasing' ? '사용자 참여를 증가시키기 위한 캠페인을 고려하세요' : '현재 전략을 유지하세요'
    });

    return insights;
  }

  // 사용자 세션 시작
  startSession(userId?: string): void {
    if (userId) {
      this.userId = userId;
    }
    
    this.sessionId = this.generateSessionId();
    
    this.trackAction('session_start', 'navigation', 'session', undefined, {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
    });
  }

  // 사용자 세션 종료
  endSession(): void {
    this.trackAction('session_end', 'navigation', 'session');
    
    // 남은 버퍼 플러시
    this.flushBuffer();

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  // 동의 설정
  setConsent(granted: boolean): void {
    this.consentGiven = granted;
  }

  // 동의 상태 확인
  hasConsent(): boolean {
    return this.consentGiven;
  }

  // 특정 사용자의 행동 기록 가져오기
  getUserActions(userId: string, limit?: number): UserAction[] {
    const userActions = this.actions.filter(action => action.userId === userId);
    return limit ? userActions.slice(0, limit) : userActions;
  }

  // 특정 기간의 행동 기록 가져오기
  getActionsByDateRange(startDate: Date, endDate: Date): UserAction[] {
    return this.actions.filter(action => {
      return action.timestamp >= startDate && action.timestamp <= endDate;
    });
  }

  // 특정 카테고리의 행동 기록 가져오기
  getActionsByCategory(category: UserAction['category']): UserAction[] {
    return this.actions.filter(action => action.category === category);
  }

  // 데이터 필터링
  filterActions(filterFn: (action: UserAction) => boolean): UserAction[] {
    return this.actions.filter(filterFn);
  }

  // 데이터 그룹화
  groupActionsByAction(): Map<string, UserAction[]> {
    const grouped = new Map<string, UserAction[]>();
    
    this.actions.forEach(action => {
      if (!grouped.has(action.action)) {
        grouped.set(action.action, []);
      }
      grouped.get(action.action)!.push(action);
    });

    return grouped;
  }

  // 행동 패턴 분석
  analyzeBehaviorPatterns(userId: string): {
    peakUsageHours: number[];
    mostActiveDays: number[];
    commonPaths: string[][];
    featureAdoptionRate: number;
  } {
    const userActions = this.getUserActions(userId);
    
    // 피크 사용 시간 분석 (0-23시)
    const hourCounts: number[] = new Array(24).fill(0);
    userActions.forEach(action => {
      hourCounts[action.timestamp.getHours()]++;
    });
    
    const peakUsageHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.hour);

    // 가장 활동이 많은 요일 분석 (0: 일요일, 6: 토요일)
    const dayCounts: number[] = new Array(7).fill(0);
    userActions.forEach(action => {
      dayCounts[action.timestamp.getDay()]++;
    });
    
    const mostActiveDays = dayCounts
      .map((count, day) => ({ day, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.day);

    // 공통 경로 분석 (간단한 구현)
    const navigationActions = userActions
      .filter(a => a.category === 'navigation')
      .map(a => a.target)
      .filter(Boolean) as string[];
    
    const commonPaths: string[][] = [];
    // 실제 구현에서는 더 복잡한 경로 분석 알고리즘 필요

    // 기능 채택률
    const totalFeatures = 10; // 실제 기능 수에 따라 달라짐
    const usedFeatures = new Set(userActions.map(a => a.action)).size;
    const featureAdoptionRate = totalFeatures > 0 ? usedFeatures / totalFeatures : 0;

    return {
      peakUsageHours,
      mostActiveDays,
      commonPaths,
      featureAdoptionRate
    };
  }

  // 사용자 세분화
  segmentUsers(): {
    powerUsers: string[];
    casualUsers: string[];
    inactiveUsers: string[];
  } {
    const powerUsers: string[] = [];
    const casualUsers: string[] = [];
    const inactiveUsers: string[] = [];

    for (const [userId, profile] of this.profiles.entries()) {
      if (profile.engagementScore >= 70) {
        powerUsers.push(userId);
      } else if (profile.engagementScore >= 30) {
        casualUsers.push(userId);
      } else {
        inactiveUsers.push(userId);
      }
    }

    return { powerUsers, casualUsers, inactiveUsers };
  }

  // 실시간 대시보드 데이터
  getRealtimeData(): {
    activeUsers: number;
    actionsPerMinute: number;
    topActions: Array<{ action: string; count: number }>;
    errorRate: number;
  } {
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const recentActions = this.actions.filter(a => a.timestamp >= oneMinuteAgo);

    const activeUsers = new Set(recentActions.map(a => a.userId)).size;
    const actionsPerMinute = recentActions.length;
    
    const actionCounts: Record<string, number> = {};
    recentActions.forEach(action => {
      actionCounts[action.action] = (actionCounts[action.action] || 0) + 1;
    });

    const topActions = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const errorActions = recentActions.filter(a => a.category === 'error');
    const errorRate = recentActions.length > 0 ? errorActions.length / recentActions.length : 0;

    return {
      activeUsers,
      actionsPerMinute,
      topActions,
      errorRate
    };
  }

  // 데이터 내보내기
  exportData(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.actions, (key, value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }, 2);
    } else {
      // CSV 형식은 간단한 구현
      const headers = ['id', 'userId', 'sessionId', 'action', 'category', 'target', 'timestamp'];
      const rows = [headers.join(',')];
      
      this.actions.forEach(action => {
        const row = [
          action.id,
          action.userId,
          action.sessionId,
          action.action,
          action.category,
          action.target || '',
          action.timestamp.toISOString()
        ];
        rows.push(row.join(','));
      });
      
      return rows.join('\n');
    }
  }

  // 데이터 삭제
  clearUserData(userId: string): void {
    this.actions = this.actions.filter(action => action.userId !== userId);
    this.profiles.delete(userId);
  }

  // 전체 데이터 삭제
  clearAllData(): void {
    this.actions = [];
    this.buffer = [];
    this.profiles.clear();
  }

  // 메모리 정리
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // 이벤트 리스너 제거
    if (typeof window !== 'undefined') {
      window.removeEventListener('error', () => {});
      window.removeEventListener('unhandledrejection', () => {});
    }
    
    this.listeners = [];
    this.clearAllData();
  }
}

// 전역 사용자 행동 분석 인스턴스
export const userBehaviorAnalytics = new UserBehaviorAnalytics({
  trackPageViews: true,
  trackClicks: true,
  trackErrors: true,
  sampleRate: 1,
  flushInterval: 30000,
  maxBufferSize: 100
});

// React 훅 형태
export function useUserBehaviorAnalytics() {
  const [realtimeData, setRealtimeData] = useState(userBehaviorAnalytics.getRealtimeData());
  const [insights, setInsights] = useState(userBehaviorAnalytics.generateInsights());

  useEffect(() => {
    // 실시간 데이터 업데이트
    const interval = setInterval(() => {
      setRealtimeData(userBehaviorAnalytics.getRealtimeData());
      setInsights(userBehaviorAnalytics.generateInsights());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    trackAction: userBehaviorAnalytics.trackAction.bind(userBehaviorAnalytics),
    getUserProfile: userBehaviorAnalytics.getUserProfile.bind(userBehaviorAnalytics),
    getBehaviorStats: userBehaviorAnalytics.getBehaviorStats.bind(userBehaviorAnalytics),
    generateInsights: userBehaviorAnalytics.generateInsights.bind(userBehaviorAnalytics),
    startSession: userBehaviorAnalytics.startSession.bind(userBehaviorAnalytics),
    endSession: userBehaviorAnalytics.endSession.bind(userBehaviorAnalytics),
    setConsent: userBehaviorAnalytics.setConsent.bind(userBehaviorAnalytics),
    hasConsent: userBehaviorAnalytics.hasConsent.bind(userBehaviorAnalytics),
    realtimeData,
    insights,
    segmentUsers: userBehaviorAnalytics.segmentUsers.bind(userBehaviorAnalytics),
    analyzeBehaviorPatterns: userBehaviorAnalytics.analyzeBehaviorPatterns.bind(userBehaviorAnalytics)
  };
}

// 사용자 행동 분석 빌더
export class UserBehaviorAnalyticsBuilder {
  private config: Partial<AnalyticsConfig> = {};

  trackPageViews(track: boolean) {
    this.config.trackPageViews = track;
    return this;
  }

  trackClicks(track: boolean) {
    this.config.trackClicks = track;
    return this;
  }

  trackInputs(track: boolean) {
    this.config.trackInputs = track;
    return this;
  }

  trackErrors(track: boolean) {
    this.config.trackErrors = track;
    return this;
  }

  sampleRate(rate: number) {
    this.config.sampleRate = rate;
    return this;
  }

  flushInterval(interval: number) {
    this.config.flushInterval = interval;
    return this;
  }

  maxBufferSize(size: number) {
    this.config.maxBufferSize = size;
    return this;
  }

  enableAnonymization(enable: boolean) {
    this.config.enableAnonymization = enable;
    return this;
  }

  consentRequired(required: boolean) {
    this.config.consentRequired = required;
    return this;
  }

  build(): UserBehaviorAnalytics {
    return new UserBehaviorAnalytics(this.config as AnalyticsConfig);
  }
}

// 자주 사용하는 분석 이벤트
export const AnalyticsEvents = {
  // 계정 관련
  accountCreated: (userId: string) => ({
    name: 'account_created',
    properties: { userId },
    timestamp: new Date()
  }),

  accountLoggedIn: (userId: string) => ({
    name: 'account_logged_in',
    properties: { userId },
    timestamp: new Date()
  }),

  // 메시지 관련
  messageSent: (userId: string, groupId: string, messageLength: number) => ({
    name: 'message_sent',
    properties: { userId, groupId, messageLength },
    timestamp: new Date()
  }),

  messageScheduled: (userId: string, groupId: string, scheduledTime: Date) => ({
    name: 'message_scheduled',
    properties: { userId, groupId, scheduledTime: scheduledTime.toISOString() },
    timestamp: new Date()
  }),

  // 자동 응답 관련
  autoReplyCreated: (userId: string, keyword: string) => ({
    name: 'auto_reply_created',
    properties: { userId, keyword },
    timestamp: new Date()
  }),

  autoReplyUpdated: (userId: string, keyword: string) => ({
    name: 'auto_reply_updated',
    properties: { userId, keyword },
    timestamp: new Date()
  }),

  // 템플릿 관련
  templateUsed: (userId: string, templateId: string) => ({
    name: 'template_used',
    properties: { userId, templateId },
    timestamp: new Date()
  }),

  templateCreated: (userId: string, templateId: string) => ({
    name: 'template_created',
    properties: { userId, templateId },
    timestamp: new Date()
  })
};