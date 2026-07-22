// 사용자 피드백 시스템
export interface Feedback {
  id: string;
  userId?: string;
  sessionId?: string;
  type: 'bug-report' | 'feature-request' | 'general-feedback' | 'rating' | 'nps' | 'usability-test';
  category?: string;
  title: string;
  description: string;
  rating?: number; // 1-5 or 0-10 scale
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in-progress' | 'resolved' | 'closed' | 'duplicate' | 'wont-fix';
  tags: string[];
  metadata: {
    userAgent?: string;
    os?: string;
    browser?: string;
    deviceType?: 'mobile' | 'tablet' | 'desktop';
    appVersion?: string;
    timestamp: Date;
    pageUrl?: string;
    reproSteps?: string;
  };
  assignedTo?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  response?: string;
  responseDate?: Date;
  isPublic?: boolean; // 공개 피드백 여부
}

export interface FeedbackAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number; // 0-1
  keywords: string[];
  topics: string[];
  urgency: number; // 0-1
  relevance: number; // 0-1
}

export interface FeedbackPreferences {
  allowAnonymous: boolean;
  requireAccount: boolean;
  enableRating: boolean;
  enableTags: boolean;
  enableAttachments: boolean;
  maxAttachments: number;
  attachmentSizeLimit: number; // bytes
  autoResponse: boolean;
  autoResponseMessage: string;
  publicFeedback: boolean;
}

export interface FeedbackSettings {
  categories: string[];
  tags: string[];
  priorities: Array<'low' | 'medium' | 'high' | 'critical'>;
  statuses: Array<'open' | 'in-progress' | 'resolved' | 'closed' | 'duplicate' | 'wont-fix'>;
  defaultCategory: string;
  defaultPriority: 'low' | 'medium' | 'high' | 'critical';
}

export interface FeedbackNotification {
  id: string;
  feedbackId: string;
  userId?: string;
  type: 'new-feedback' | 'status-change' | 'response' | 'reminder';
  message: string;
  read: boolean;
  timestamp: Date;
}

class UserFeedbackManager {
  private feedback: Feedback[] = [];
  private notifications: FeedbackNotification[] = [];
  private preferences: FeedbackPreferences;
  private settings: FeedbackSettings;
  private listeners: Array<(feedback: Feedback | FeedbackNotification) => void> = [];
  private analysisCache: Map<string, FeedbackAnalysis> = new Map();

  constructor(
    preferences: Partial<FeedbackPreferences> = {},
    settings: Partial<FeedbackSettings> = {}
  ) {
    this.preferences = {
      allowAnonymous: true,
      requireAccount: false,
      enableRating: true,
      enableTags: true,
      enableAttachments: true,
      maxAttachments: 3,
      attachmentSizeLimit: 10 * 1024 * 1024, // 10MB
      autoResponse: true,
      autoResponseMessage: '귀하의 피드백을 제출해 주셔서 감사합니다. 빠르게 검토 후 답변드리겠습니다.',
      publicFeedback: false,
      ...preferences
    };

    this.settings = {
      categories: [
        '버그 리포트', '기능 요청', '사용성', '성능', '보안', '기타'
      ],
      tags: [
        'UI/UX', 'API', '성능', '버그', '개선', '요청', '문의'
      ],
      priorities: ['low', 'medium', 'high', 'critical'],
      statuses: ['open', 'in-progress', 'resolved', 'closed', 'duplicate', 'wont-fix'],
      defaultCategory: '기타',
      defaultPriority: 'medium',
      ...settings
    };
  }

  // 이벤트 리스너 등록
  subscribe(listener: (feedback: Feedback | FeedbackNotification) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // 이벤트 알림
  private notifyListeners(item: Feedback | FeedbackNotification): void {
    this.listeners.forEach(listener => listener(item));
  }

  // 피드백 제출
  submitFeedback(feedback: Omit<Feedback, 'id' | 'status' | 'metadata' | 'tags'>): string {
    if (!feedback.title.trim() || !feedback.description.trim()) {
      throw new Error('제목과 설명은 필수 입력 항목입니다.');
    }

    if (feedback.rating !== undefined && (feedback.rating < 1 || feedback.rating > 10)) {
      throw new Error('평점은 1에서 10 사이의 값이어야 합니다.');
    }

    const id = `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newFeedback: Feedback = {
      ...feedback,
      id,
      status: 'open',
      tags: feedback.tags || [],
      metadata: {
        ...feedback.metadata,
        timestamp: new Date(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        os: this.detectOS(),
        browser: this.detectBrowser(),
        deviceType: this.detectDeviceType(),
        appVersion: typeof window !== 'undefined' ? (window as any).__APP_VERSION__ || 'unknown' : 'unknown'
      },
      priority: feedback.priority || this.settings.defaultPriority
    };

    // 카테고리 유효성 검사
    if (feedback.category && !this.settings.categories.includes(feedback.category)) {
      throw new Error(`유효하지 않은 카테고리입니다: ${feedback.category}`);
    }

    this.feedback.push(newFeedback);

    // 자동 응답
    if (this.preferences.autoResponse && feedback.userId) {
      this.sendNotification({
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        feedbackId: id,
        userId: feedback.userId,
        type: 'response',
        message: this.preferences.autoResponseMessage,
        read: false,
        timestamp: new Date()
      });
    }

    // 분석 캐시 초기화
    this.analysisCache.delete(id);

    // 리스너에 알림
    this.notifyListeners(newFeedback);

    return id;
  }

  // 피드백 업데이트
  updateFeedback(id: string, updates: Partial<Feedback>): boolean {
    const feedback = this.feedback.find(f => f.id === id);
    if (!feedback) return false;

    // 상태 변경 시 알림
    if (updates.status && updates.status !== feedback.status) {
      this.sendNotification({
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        feedbackId: id,
        userId: feedback.userId,
        type: 'status-change',
        message: `피드백 상태가 ${updates.status}로 변경되었습니다.`,
        read: false,
        timestamp: new Date()
      });
    }

    // 응답 시 알림
    if (updates.response && !feedback.response) {
      this.sendNotification({
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        feedbackId: id,
        userId: feedback.userId,
        type: 'response',
        message: `귀하의 피드백에 대한 응답이 등록되었습니다.`,
        read: false,
        timestamp: new Date()
      });
    }

    Object.assign(feedback, updates);
    
    // 분석 캐시 초기화
    this.analysisCache.delete(id);

    // 리스너에 알림
    this.notifyListeners(feedback);

    return true;
  }

  // 피드백 삭제 (soft delete)
  softDeleteFeedback(id: string): boolean {
    const feedback = this.feedback.find(f => f.id === id);
    if (!feedback) return false;

    feedback.status = 'closed';
    return true;
  }

  // 피드백 영구 삭제
  deleteFeedback(id: string): boolean {
    const index = this.feedback.findIndex(f => f.id === id);
    if (index === -1) return false;

    this.feedback.splice(index, 1);
    this.analysisCache.delete(id);
    return true;
  }

  // 피드백 가져오기
  getFeedback(
    filters: {
      userId?: string;
      type?: Feedback['type'];
      status?: Feedback['status'];
      priority?: Feedback['priority'];
      category?: string;
      tag?: string;
      isPublic?: boolean;
    } = {},
    limit?: number,
    offset?: number
  ): Feedback[] {
    let filtered = [...this.feedback];

    if (filters.userId) {
      filtered = filtered.filter(f => f.userId === filters.userId);
    }
    if (filters.type) {
      filtered = filtered.filter(f => f.type === filters.type);
    }
    if (filters.status) {
      filtered = filtered.filter(f => f.status === filters.status);
    }
    if (filters.priority) {
      filtered = filtered.filter(f => f.priority === filters.priority);
    }
    if (filters.category) {
      filtered = filtered.filter(f => f.category === filters.category);
    }
    if (filters.tag) {
      filtered = filtered.filter(f => f.tags.includes(filters.tag!));
    }
    if (filters.isPublic !== undefined) {
      filtered = filtered.filter(f => f.isPublic === filters.isPublic);
    }

    // 최신 순으로 정렬
    filtered = filtered.sort((a, b) => b.metadata.timestamp.getTime() - a.metadata.timestamp.getTime());

    if (offset !== undefined) {
      filtered = filtered.slice(offset);
    }
    if (limit !== undefined) {
      filtered = filtered.slice(0, limit);
    }

    return filtered;
  }

  // 피드백 분석
  analyzeFeedback(id: string): FeedbackAnalysis {
    const cached = this.analysisCache.get(id);
    if (cached) {
      return cached;
    }

    const feedback = this.feedback.find(f => f.id === id);
    if (!feedback) {
      throw new Error(`Feedback not found: ${id}`);
    }

    // 간단한 감정 분석 (실제 구현은 NLP 라이브러리 사용)
    const positiveWords = ['좋다', '감사', '편리', '좋아요', '추천', '만족', '효율', '빠름', '깔끔', '명확'];
    const negativeWords = ['문제', '불편', '버그', '오류', '느림', '복잡', '불만', '실패', '에러', '문제'];
    
    const description = feedback.description.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveWords.forEach(word => {
      if (description.includes(word)) positiveCount++;
    });
    
    negativeWords.forEach(word => {
      if (description.includes(word)) negativeCount++;
    });

    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (positiveCount > negativeCount) {
      sentiment = 'positive';
    } else if (negativeCount > positiveCount) {
      sentiment = 'negative';
    }

    // 키워드 추출
    const keywords = [...positiveWords, ...negativeWords]
      .filter(word => description.includes(word))
      .slice(0, 5);

    // 주제 추출 (카테고리 기반)
    const topics = feedback.category ? [feedback.category] : [];

    // 긴급도 (우선순위 기반)
    let urgency = 0;
    switch (feedback.priority) {
      case 'critical': urgency = 1.0; break;
      case 'high': urgency = 0.7; break;
      case 'medium': urgency = 0.4; break;
      case 'low': urgency = 0.1; break;
    }

    // 관련성 (타입 기반)
    let relevance = 0.5; // 기본값
    if (feedback.type === 'bug-report') relevance = 0.9;
    else if (feedback.type === 'feature-request') relevance = 0.8;
    else if (feedback.type === 'general-feedback') relevance = 0.6;

    const analysis: FeedbackAnalysis = {
      sentiment,
      confidence: Math.max(positiveCount, negativeCount) / Math.max(1, positiveCount + negativeCount),
      keywords,
      topics,
      urgency,
      relevance
    };

    // 캐시 저장
    this.analysisCache.set(id, analysis);

    return analysis;
  }

  // 피드백 요약
  getFeedbackSummary(): {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byCategory: Record<string, number>;
    averageRating: number;
    satisfactionRate: number;
    resolutionTimeAvg: number;
    openCount: number;
  } {
    const total = this.feedback.length;
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    
    let totalRating = 0;
    let ratingCount = 0;
    let totalResolutionTime = 0;
    let resolutionCount = 0;
    let openCount = 0;

    this.feedback.forEach(feedback => {
      byType[feedback.type] = (byType[feedback.type] || 0) + 1;
      byStatus[feedback.status] = (byStatus[feedback.status] || 0) + 1;
      byPriority[feedback.priority] = (byPriority[feedback.priority] || 0) + 1;
      byCategory[feedback.category || 'etc'] = (byCategory[feedback.category || 'etc'] || 0) + 1;

      if (feedback.rating) {
        totalRating += feedback.rating;
        ratingCount++;
      }

      if (feedback.resolvedAt && feedback.metadata.timestamp) {
        totalResolutionTime += feedback.resolvedAt.getTime() - feedback.metadata.timestamp.getTime();
        resolutionCount++;
      }

      if (feedback.status === 'open') {
        openCount++;
      }
    });

    const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;
    const satisfactionRate = ratingCount > 0 ? (averageRating / 10) * 100 : 0;
    const resolutionTimeAvg = resolutionCount > 0 ? totalResolutionTime / resolutionCount / (1000 * 60 * 60 * 24) : 0; // 일 단위

    return {
      total,
      byType,
      byStatus,
      byPriority,
      byCategory,
      averageRating,
      satisfactionRate,
      resolutionTimeAvg,
      openCount
    };
  }

  // 알림 보내기
  private sendNotification(notification: Omit<FeedbackNotification, 'id' | 'timestamp'>): string {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newNotification: FeedbackNotification = {
      ...notification,
      id,
      timestamp: new Date()
    };

    this.notifications.push(newNotification);
    
    // 리스너에 알림
    this.notifyListeners(newNotification);

    return id;
  }

  // 알림 가져오기
  getNotifications(userId?: string, unreadOnly: boolean = false): FeedbackNotification[] {
    let filtered = [...this.notifications];

    if (userId) {
      filtered = filtered.filter(n => n.userId === userId);
    }

    if (unreadOnly) {
      filtered = filtered.filter(n => !n.read);
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // 알림 읽음 처리
  markNotificationAsRead(id: string): boolean {
    const notification = this.notifications.find(n => n.id === id);
    if (!notification) return false;

    notification.read = true;
    return true;
  }

  // 알림 전체 읽음 처리
  markAllNotificationsAsRead(userId?: string): number {
    let count = 0;
    
    this.notifications.forEach(notification => {
      if ((!userId || notification.userId === userId) && !notification.read) {
        notification.read = true;
        count++;
      }
    });

    return count;
  }

  // 피드백 해결
  resolveFeedback(id: string, resolverId: string, response?: string): boolean {
    const feedback = this.feedback.find(f => f.id === id);
    if (!feedback) return false;

    feedback.status = 'resolved';
    feedback.resolvedBy = resolverId;
    feedback.resolvedAt = new Date();
    
    if (response) {
      feedback.response = response;
      feedback.responseDate = new Date();
    }

    // 분석 캐시 초기화
    this.analysisCache.delete(id);

    // 리스너에 알림
    this.notifyListeners(feedback);

    return true;
  }

  // 피드백 검색
  searchFeedback(query: string): Feedback[] {
    const lowerQuery = query.toLowerCase();
    return this.feedback.filter(feedback => 
      feedback.title.toLowerCase().includes(lowerQuery) ||
      feedback.description.toLowerCase().includes(lowerQuery) ||
      feedback.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      (feedback.category && feedback.category.toLowerCase().includes(lowerQuery))
    );
  }

  // 운영 체제 감지
  private detectOS(): string | undefined {
    if (typeof navigator === 'undefined') return undefined;

    const userAgent = navigator.userAgent;
    if (userAgent.includes('Win')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
    
    return undefined;
  }

  // 브라우저 감지
  private detectBrowser(): string | undefined {
    if (typeof navigator === 'undefined') return undefined;

    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edg')) return 'Edge';
    if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera';
    
    return undefined;
  }

  // 장치 타입 감지
  private detectDeviceType(): 'mobile' | 'tablet' | 'desktop' | undefined {
    if (typeof navigator === 'undefined') return undefined;

    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isTablet = /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent);

    if (isMobile && !isTablet) return 'mobile';
    if (isTablet) return 'tablet';
    return 'desktop';
  }

  // 피드백 태그 관리
  addTagToFeedback(feedbackId: string, tag: string): boolean {
    const feedback = this.feedback.find(f => f.id === feedbackId);
    if (!feedback) return false;

    if (!feedback.tags.includes(tag)) {
      feedback.tags.push(tag);
      return true;
    }
    return false;
  }

  removeTagFromFeedback(feedbackId: string, tag: string): boolean {
    const feedback = this.feedback.find(f => f.id === feedbackId);
    if (!feedback) return false;

    const index = feedback.tags.indexOf(tag);
    if (index > -1) {
      feedback.tags.splice(index, 1);
      return true;
    }
    return false;
  }

  // 피드백 통계
  getFeedbackStats(): {
    weeklyGrowth: number;
    monthlyTrend: Array<{ week: string; count: number; avgRating?: number }>;
    topCategories: Array<{ category: string; count: number }>;
    topKeywords: Array<{ keyword: string; count: number }>;
    satisfactionTrend: Array<{ week: string; satisfaction: number }>;
  } {
    // 주간 증가율
    const now = new Date();
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(now.getDate() - 14);
    
    const recentFeedback = this.feedback.filter(f => f.metadata.timestamp >= twoWeeksAgo);
    const lastWeekFeedback = recentFeedback.filter(f => {
      const daysDiff = (now.getTime() - f.metadata.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    });
    const prevWeekFeedback = recentFeedback.filter(f => {
      const daysDiff = (now.getTime() - f.metadata.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff > 7 && daysDiff <= 14;
    });
    
    const weeklyGrowth = prevWeekFeedback.length > 0 
      ? ((lastWeekFeedback.length - prevWeekFeedback.length) / prevWeekFeedback.length) * 100 
      : lastWeekFeedback.length > 0 ? 100 : 0;

    // 주간 추세
    const monthlyTrend: Array<{ week: string; count: number; avgRating?: number }> = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date();
      weekStart.setDate(now.getDate() - (i * 7 + 6));
      const weekEnd = new Date();
      weekEnd.setDate(now.getDate() - (i * 7));
      
      const weekFeedback = this.feedback.filter(f => 
        f.metadata.timestamp >= weekStart && f.metadata.timestamp <= weekEnd
      );
      
      const avgRating = weekFeedback.length > 0 
        ? weekFeedback.reduce((sum, f) => sum + (f.rating || 0), 0) / weekFeedback.length
        : undefined;
      
      const weekStr = `${weekStart.getFullYear()}-${(weekStart.getMonth() + 1).toString().padStart(2, '0')}-${weekStart.getDate().toString().padStart(2, '0')}`;
      monthlyTrend.push({ 
        week: weekStr, 
        count: weekFeedback.length, 
        avgRating 
      });
    }

    // 상위 카테고리
    const categoryCounts: Record<string, number> = {};
    this.feedback.forEach(f => {
      const cat = f.category || 'etc';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    
    const topCategories = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 상위 키워드 (분석 기반)
    const keywordCounts: Record<string, number> = {};
    this.feedback.forEach(f => {
      const analysis = this.analyzeFeedback(f.id);
      analysis.keywords.forEach(keyword => {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      });
    });
    
    const topKeywords = Object.entries(keywordCounts)
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 만족도 추세
    const satisfactionTrend: Array<{ week: string; satisfaction: number }> = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date();
      weekStart.setDate(now.getDate() - (i * 7 + 6));
      const weekEnd = new Date();
      weekEnd.setDate(now.getDate() - (i * 7));
      
      const weekFeedback = this.feedback.filter(f => 
        f.metadata.timestamp >= weekStart && f.metadata.timestamp <= weekEnd && f.rating !== undefined
      );
      
      const avgRating = weekFeedback.length > 0 
        ? weekFeedback.reduce((sum, f) => sum + (f.rating || 0), 0) / weekFeedback.length
        : 0;
      
      const satisfaction = (avgRating / 10) * 100;
      const weekStr = `${weekStart.getFullYear()}-${(weekStart.getMonth() + 1).toString().padStart(2, '0')}-${weekStart.getDate().toString().padStart(2, '0')}`;
      satisfactionTrend.push({ week: weekStr, satisfaction });
    }

    return {
      weeklyGrowth,
      monthlyTrend: monthlyTrend.reverse(),
      topCategories,
      topKeywords,
      satisfactionTrend: satisfactionTrend.reverse()
    };
  }

  // 피드백 내보내기
  exportFeedback(format: 'json' | 'csv' = 'json', filters?: Parameters<UserFeedbackManager['getFeedback']>[0]): string {
    const data = this.getFeedback(filters || {});

    if (format === 'json') {
      return JSON.stringify(data, (key, value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }, 2);
    } else {
      // CSV 형식
      const headers = [
        'id', 'type', 'category', 'title', 'description', 'rating', 'priority', 'status',
        'assignedTo', 'resolvedAt', 'resolvedBy', 'response', 'responseDate', 'isPublic'
      ];
      
      const rows = [headers.join(',')];
      
      data.forEach(feedback => {
        const row = [
          feedback.id,
          feedback.type,
          feedback.category || '',
          `"${feedback.title.replace(/"/g, '""')}"`,
          `"${feedback.description.replace(/"/g, '""')}"`,
          feedback.rating || '',
          feedback.priority,
          feedback.status,
          feedback.assignedTo || '',
          feedback.resolvedAt ? feedback.resolvedAt.toISOString() : '',
          feedback.resolvedBy || '',
          feedback.response ? `"${feedback.response.replace(/"/g, '""')}"` : '',
          feedback.responseDate ? feedback.responseDate.toISOString() : '',
          feedback.isPublic ? 'true' : 'false'
        ];
        rows.push(row.join(','));
      });
      
      return rows.join('\n');
    }
  }

  // 피드백 임포트
  importFeedback(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (Array.isArray(data)) {
        for (const item of data) {
          // 유효성 검사 후 추가
          if (item.title && item.description) {
            this.feedback.push({
              ...item,
              metadata: {
                ...item.metadata,
                timestamp: new Date(item.metadata.timestamp)
              },
              resolvedAt: item.resolvedAt ? new Date(item.resolvedAt) : undefined,
              responseDate: item.responseDate ? new Date(item.responseDate) : undefined
            });
          }
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import feedback:', error);
      return false;
    }
  }

  // 설정 업데이트
  updatePreferences(updates: Partial<FeedbackPreferences>): void {
    Object.assign(this.preferences, updates);
  }

  updateSettings(updates: Partial<FeedbackSettings>): void {
    Object.assign(this.settings, updates);
  }

  // 메모리 정리
  destroy(): void {
    this.listeners = [];
    this.feedback = [];
    this.notifications = [];
    this.analysisCache.clear();
  }
}

// 전역 사용자 피드백 관리자 인스턴스
export const userFeedbackManager = new UserFeedbackManager();

// React 훅 형태
export function useUserFeedback() {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>(userFeedbackManager.getFeedback());
  const [notifications, setNotifications] = useState<FeedbackNotification[]>(
    userFeedbackManager.getNotifications()
  );
  const [stats, setStats] = useState(userFeedbackManager.getFeedbackSummary());

  useEffect(() => {
    const updateData = () => {
      setFeedbackList(userFeedbackManager.getFeedback());
      setNotifications(userFeedbackManager.getNotifications());
      setStats(userFeedbackManager.getFeedbackSummary());
    };

    const unsubscribe = userFeedbackManager.subscribe(updateData);
    
    // 주기적으로 업데이트
    const interval = setInterval(updateData, 30000); // 30초마다

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  return {
    feedbackList,
    notifications,
    stats,
    submitFeedback: userFeedbackManager.submitFeedback.bind(userFeedbackManager),
    updateFeedback: userFeedbackManager.updateFeedback.bind(userFeedbackManager),
    getFeedback: userFeedbackManager.getFeedback.bind(userFeedbackManager),
    getNotifications: userFeedbackManager.getNotifications.bind(userFeedbackManager),
    markNotificationAsRead: userFeedbackManager.markNotificationAsRead.bind(userFeedbackManager),
    resolveFeedback: userFeedbackManager.resolveFeedback.bind(userFeedbackManager),
    searchFeedback: userFeedbackManager.searchFeedback.bind(userFeedbackManager),
    getFeedbackStats: userFeedbackManager.getFeedbackStats.bind(userFeedbackManager),
    addTagToFeedback: userFeedbackManager.addTagToFeedback.bind(userFeedbackManager)
  };
}

// 피드백 빌더
export class FeedbackBuilder {
  private feedback: Partial<Omit<Feedback, 'id' | 'status' | 'metadata' | 'tags'>> = {};

  type(type: Feedback['type']) {
    this.feedback.type = type;
    return this;
  }

  title(title: string) {
    this.feedback.title = title;
    return this;
  }

  description(description: string) {
    this.feedback.description = description;
    return this;
  }

  category(category: string) {
    this.feedback.category = category;
    return this;
  }

  rating(rating: number) {
    this.feedback.rating = rating;
    return this;
  }

  priority(priority: Feedback['priority']) {
    this.feedback.priority = priority;
    return this;
  }

  userId(userId: string) {
    this.feedback.userId = userId;
    return this;
  }

  tags(tags: string[]) {
    this.feedback.tags = tags;
    return this;
  }

  isPublic(isPublic: boolean) {
    this.feedback.isPublic = isPublic;
    return this;
  }

  metadata(metadata: Partial<Feedback['metadata']>) {
    this.feedback.metadata = { ...this.feedback.metadata, ...metadata };
    return this;
  }

  build(): Omit<Feedback, 'id' | 'status' | 'metadata' | 'tags'> {
    if (!this.feedback.title || !this.feedback.description) {
      throw new Error('Title and description are required');
    }

    if (!this.feedback.type) {
      this.feedback.type = 'general-feedback';
    }

    if (!this.feedback.priority) {
      this.feedback.priority = 'medium';
    }

    return this.feedback as Omit<Feedback, 'id' | 'status' | 'metadata' | 'tags'>;
  }
}

// 자주 사용하는 피드백 템플릿
export const FeedbackTemplates = {
  // 버그 리포트
  bugReport: (title: string, description: string, reproSteps?: string) => {
    return new FeedbackBuilder()
      .type('bug-report')
      .title(title)
      .description(description)
      .metadata({ reproSteps })
      .priority('high')
      .build();
  },

  // 기능 요청
  featureRequest: (title: string, description: string, reason: string) => {
    return new FeedbackBuilder()
      .type('feature-request')
      .title(title)
      .description(`${description}\n\n요청 이유: ${reason}`)
      .priority('medium')
      .build();
  },

  // 일반 피드백
  generalFeedback: (title: string, description: string) => {
    return new FeedbackBuilder()
      .type('general-feedback')
      .title(title)
      .description(description)
      .priority('low')
      .build();
  },

  // NPS 평가
  npsRating: (score: number, comment?: string) => {
    return new FeedbackBuilder()
      .type('nps')
      .title(`NPS 평가: ${score}점`)
      .description(comment || '')
      .rating(score)
      .priority('low')
      .build();
  }
};

// 피드백 위젯 구성
export interface FeedbackWidgetConfig {
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme: 'light' | 'dark';
  enableFloatingButton: boolean;
  floatingButtonText: string;
  enableInAppNotifications: boolean;
  notificationPosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

// 기본 피드백 위젯 설정
export const DEFAULT_FEEDBACK_WIDGET_CONFIG: FeedbackWidgetConfig = {
  position: 'bottom-right',
  theme: 'light',
  enableFloatingButton: true,
  floatingButtonText: '피드백 남기기',
  enableInAppNotifications: true,
  notificationPosition: 'top-right'
};