// 고급 알림 시스템
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'critical';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'system' | 'user' | 'task' | 'alert' | 'maintenance';
  timestamp: Date;
  read: boolean;
  actions?: Array<{
    label: string;
    handler: () => void;
  }>;
  metadata?: Record<string, any>;
}

export interface NotificationChannel {
  id: string;
  name: string;
  enabled: boolean;
  priorityThreshold: 'low' | 'medium' | 'high' | 'urgent';
  deliveryMethods: ('toast' | 'modal' | 'email' | 'push' | 'sound')[];
  filters?: {
    categories?: string[];
    excludeTypes?: string[];
  };
}

export interface NotificationPreferences {
  channels: NotificationChannel[];
  muteUntil?: Date;
  doNotDisturb: boolean;
  defaultTimeout: number; // 알림 표시 시간 (ms)
  maxNotifications: number; // 최대 알림 수
}

export interface NotificationRule {
  id: string;
  name: string;
  condition: (notification: Notification) => boolean;
  action: (notification: Notification) => void;
  enabled: boolean;
  priority: number;
}

class NotificationSystem {
  private notifications: Notification[] = [];
  private channels: Map<string, NotificationChannel> = new Map();
  private rules: NotificationRule[] = [];
  private preferences: NotificationPreferences;
  private listeners: Array<(notification: Notification) => void> = [];
  private unreadCount: number = 0;

  constructor(preferences?: Partial<NotificationPreferences>) {
    this.preferences = {
      channels: [
        {
          id: 'default-toast',
          name: '기본 토스트',
          enabled: true,
          priorityThreshold: 'medium',
          deliveryMethods: ['toast'],
          filters: { categories: ['system', 'user'] }
        },
        {
          id: 'critical-alert',
          name: '중요 알림',
          enabled: true,
          priorityThreshold: 'high',
          deliveryMethods: ['toast', 'sound'],
          filters: { categories: ['alert'] }
        }
      ],
      doNotDisturb: false,
      defaultTimeout: 5000,
      maxNotifications: 50,
      ...preferences
    };

    // 기본 채널 설정
    this.preferences.channels.forEach(channel => {
      this.channels.set(channel.id, channel);
    });

    // 브라우저 알림 권한 요청
    this.requestNotificationPermission();
  }

  // 이벤트 리스너 등록
  subscribe(listener: (notification: Notification) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // 이벤트 알림
  private notify(notification: Notification): void {
    this.listeners.forEach(listener => listener(notification));
  }

  // 브라우저 알림 권한 요청
  private async requestNotificationPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      return Notification.requestPermission();
    }
    return 'denied';
  }

  // 알림 추가
  add(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): string {
    if (this.preferences.doNotDisturb) {
      return ''; // 방해금지 모드일 때는 알림 추가하지 않음
    }

    const id = notification.id || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date(),
      read: false
    };

    // 알림 규칙 적용
    this.applyRules(newNotification);

    // 채널별 전송
    this.deliverToChannels(newNotification);

    // 알림 목록에 추가
    this.notifications.unshift(newNotification);
    
    // 최대 알림 수 제한
    if (this.notifications.length > this.preferences.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.preferences.maxNotifications);
    }

    // 읽지 않은 알림 수 갱신
    if (!newNotification.read) {
      this.unreadCount++;
    }

    // 이벤트 알림
    this.notify(newNotification);

    return id;
  }

  // 채널별 전송
  private deliverToChannels(notification: Notification): void {
    for (const channel of this.channels.values()) {
      if (!channel.enabled) continue;

      // 우선순위 체크
      const priorityLevel = this.getPriorityLevel(channel.priorityThreshold);
      const notifPriorityLevel = this.getPriorityLevel(notification.priority);
      
      if (notifPriorityLevel < priorityLevel) continue;

      // 필터 적용
      if (channel.filters) {
        if (channel.filters.categories && !channel.filters.categories.includes(notification.category)) {
          continue;
        }
        if (channel.filters.excludeTypes && channel.filters.excludeTypes.includes(notification.type)) {
          continue;
        }
      }

      // 전달 방식별 처리
      channel.deliveryMethods.forEach(method => {
        this.deliverByMethod(notification, method);
      });
    }
  }

  // 전달 방식별 처리
  private deliverByMethod(notification: Notification, method: string): void {
    switch (method) {
      case 'toast':
        this.showToast(notification);
        break;
      case 'modal':
        this.showModal(notification);
        break;
      case 'email':
        this.sendEmail(notification);
        break;
      case 'push':
        this.sendPush(notification);
        break;
      case 'sound':
        this.playSound(notification);
        break;
    }
  }

  // 토스트 알림 표시
  private showToast(notification: Notification): void {
    // 브라우저 토스트 알림
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id
      });
    } else {
      // 대체 토스트 (DOM 기반)
      this.showDomToast(notification);
    }
  }

  // DOM 기반 토스트 알림
  private showDomToast(notification: Notification): void {
    // 이 기능은 실제 UI 컴포넌트와 통합되어야 함
    // 여기서는 로그만 출력
    console.log(`Toast: ${notification.title} - ${notification.message}`);
    
    // 일정 시간 후 자동 제거 (기본 시간)
    setTimeout(() => {
      this.markAsRead(notification.id);
    }, this.preferences.defaultTimeout);
  }

  // 모달 알림 표시
  private showModal(notification: Notification): void {
    // 모달은 사용자 인터랙션 필요
    console.log(`Modal: ${notification.title} - ${notification.message}`);
  }

  // 이메일 전송 (가상)
  private sendEmail(notification: Notification): void {
    // 이메일 전송 로직은 백엔드에서 처리
    console.log(`Email: ${notification.title} - ${notification.message}`);
  }

  // 푸시 전송 (가상)
  private sendPush(notification: Notification): void {
    // 푸시 전송 로직은 백엔드에서 처리
    console.log(`Push: ${notification.title} - ${notification.message}`);
  }

  // 소리 재생
  private playSound(notification: Notification): void {
    // 중요한 알림에만 소리 재생
    if (['error', 'critical'].includes(notification.type)) {
      // 시스템 알림 소리 재생 (가상)
      console.log(`Playing sound for: ${notification.title}`);
    }
  }

  // 알림 규칙 적용
  private applyRules(notification: Notification): void {
    const applicableRules = this.rules
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority); // 우선순위 높은 순

    for (const rule of applicableRules) {
      if (rule.condition(notification)) {
        rule.action(notification);
      }
    }
  }

  // 알림 읽음 처리
  markAsRead(id: string): boolean {
    const notification = this.notifications.find(n => n.id === id);
    if (notification && !notification.read) {
      notification.read = true;
      this.unreadCount = Math.max(0, this.unreadCount - 1);
      return true;
    }
    return false;
  }

  // 모든 알림 읽음 처리
  markAllAsRead(): void {
    this.notifications.forEach(notification => {
      if (!notification.read) {
        notification.read = true;
      }
    });
    this.unreadCount = 0;
  }

  // 알림 삭제
  remove(id: string): boolean {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index > -1) {
      const notification = this.notifications[index];
      if (!notification.read) {
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      }
      this.notifications.splice(index, 1);
      return true;
    }
    return false;
  }

  // 카테고리별 알림 삭제
  removeByCategory(category: string): number {
    const initialCount = this.notifications.length;
    this.notifications = this.notifications.filter(notification => {
      if (notification.category === category) {
        if (!notification.read) {
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
        return false;
      }
      return true;
    });
    return initialCount - this.notifications.length;
  }

  // 유형별 알림 삭제
  removeByType(type: string): number {
    const initialCount = this.notifications.length;
    this.notifications = this.notifications.filter(notification => {
      if (notification.type === type) {
        if (!notification.read) {
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
        return false;
      }
      return true;
    });
    return initialCount - this.notifications.length;
  }

  // 채널 추가
  addChannel(channel: NotificationChannel): void {
    this.channels.set(channel.id, channel);
  }

  // 채널 업데이트
  updateChannel(id: string, updates: Partial<NotificationChannel>): boolean {
    const channel = this.channels.get(id);
    if (channel) {
      Object.assign(channel, updates);
      return true;
    }
    return false;
  }

  // 채널 삭제
  removeChannel(id: string): boolean {
    return this.channels.delete(id);
  }

  // 규칙 추가
  addRule(rule: NotificationRule): void {
    this.rules.push(rule);
    // 우선순위 순으로 정렬
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  // 규칙 제거
  removeRule(id: string): boolean {
    const index = this.rules.findIndex(r => r.id === id);
    if (index > -1) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  // 알림 가져오기
  getNotifications(limit?: number, unreadOnly?: boolean): Notification[] {
    let notifications = [...this.notifications];
    
    if (unreadOnly) {
      notifications = notifications.filter(n => !n.read);
    }
    
    if (limit) {
      notifications = notifications.slice(0, limit);
    }
    
    return notifications;
  }

  // 읽지 않은 알림 수 가져오기
  getUnreadCount(): number {
    return this.unreadCount;
  }

  // 카테고리별 알림 수
  getCountByCategory(): Record<string, number> {
    const counts: Record<string, number> = {};
    
    this.notifications.forEach(notification => {
      counts[notification.category] = (counts[notification.category] || 0) + 1;
    });
    
    return counts;
  }

  // 유형별 알림 수
  getCountByType(): Record<string, number> {
    const counts: Record<string, number> = {};
    
    this.notifications.forEach(notification => {
      counts[notification.type] = (counts[notification.type] || 0) + 1;
    });
    
    return counts;
  }

  // 방해금지 모드 설정
  setDoNotDisturb(enabled: boolean): void {
    this.preferences.doNotDisturb = enabled;
  }

  // 방해금지 모드 해제 시간 설정
  setMuteUntil(until: Date): void {
    this.preferences.muteUntil = until;
    
    // 타이머 설정
    const delay = until.getTime() - Date.now();
    if (delay > 0) {
      setTimeout(() => {
        this.preferences.doNotDisturb = false;
        this.preferences.muteUntil = undefined;
      }, delay);
    }
  }

  // 알림 선호도 업데이트
  updatePreferences(updates: Partial<NotificationPreferences>): void {
    Object.assign(this.preferences, updates);
  }

  // 우선순위 레벨
  private getPriorityLevel(priority: 'low' | 'medium' | 'high' | 'urgent'): number {
    switch (priority) {
      case 'urgent': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  // 알림 검색
  search(query: string): Notification[] {
    const lowerQuery = query.toLowerCase();
    return this.notifications.filter(notification => 
      notification.title.toLowerCase().includes(lowerQuery) ||
      notification.message.toLowerCase().includes(lowerQuery) ||
      (notification.metadata && JSON.stringify(notification.metadata).toLowerCase().includes(lowerQuery))
    );
  }

  // 알림 필터링
  filterBy(filterFn: (notification: Notification) => boolean): Notification[] {
    return this.notifications.filter(filterFn);
  }

  // 알림 정리 (오래된 알림 제거)
  cleanup(retentionDays: number = 7): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    const initialCount = this.notifications.length;
    this.notifications = this.notifications.filter(notification => {
      if (notification.timestamp > cutoffDate) {
        return true;
      } else {
        if (!notification.read) {
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
        return false;
      }
    });
    
    return initialCount - this.notifications.length;
  }

  // 메모리 정리
  destroy(): void {
    this.listeners = [];
    this.notifications = [];
    this.rules = [];
    this.channels.clear();
    this.unreadCount = 0;
  }
}

// 전역 알림 시스템 인스턴스
export const notificationSystem = new NotificationSystem();

// React 훅 형태
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(notificationSystem.getNotifications(10));
  const [unreadCount, setUnreadCount] = useState(notificationSystem.getUnreadCount());

  useEffect(() => {
    const updateNotifications = () => {
      setNotifications(notificationSystem.getNotifications(10));
      setUnreadCount(notificationSystem.getUnreadCount());
    };

    const unsubscribe = notificationSystem.subscribe(updateNotifications);
    
    // 주기적으로 업데이트
    const interval = setInterval(updateNotifications, 5000);

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  return {
    notifications,
    unreadCount,
    add: notificationSystem.add.bind(notificationSystem),
    markAsRead: notificationSystem.markAsRead.bind(notificationSystem),
    markAllAsRead: notificationSystem.markAllAsRead.bind(notificationSystem),
    remove: notificationSystem.remove.bind(notificationSystem),
    getNotifications: notificationSystem.getNotifications.bind(notificationSystem),
    setDoNotDisturb: notificationSystem.setDoNotDisturb.bind(notificationSystem),
    search: notificationSystem.search.bind(notificationSystem),
    cleanup: notificationSystem.cleanup.bind(notificationSystem)
  };
}

// 알림 빌더
export class NotificationBuilder {
  private notification: Partial<Notification> = {};

  title(title: string) {
    this.notification.title = title;
    return this;
  }

  message(message: string) {
    this.notification.message = message;
    return this;
  }

  type(type: Notification['type']) {
    this.notification.type = type;
    return this;
  }

  priority(priority: Notification['priority']) {
    this.notification.priority = priority;
    return this;
  }

  category(category: Notification['category']) {
    this.notification.category = category;
    return this;
  }

  action(label: string, handler: () => void) {
    if (!this.notification.actions) {
      this.notification.actions = [];
    }
    this.notification.actions.push({ label, handler });
    return this;
  }

  metadata(metadata: Record<string, any>) {
    this.notification.metadata = metadata;
    return this;
  }

  build(): Omit<Notification, 'id' | 'timestamp' | 'read'> {
    if (!this.notification.title || !this.notification.message) {
      throw new Error('Notification must have title and message');
    }

    if (!this.notification.type) {
      this.notification.type = 'info';
    }

    if (!this.notification.priority) {
      this.notification.priority = 'medium';
    }

    if (!this.notification.category) {
      this.notification.category = 'system';
    }

    return this.notification as Omit<Notification, 'id' | 'timestamp' | 'read'>;
  }
}

// 자주 사용하는 알림 타입
export const CommonNotifications = {
  // 시스템 알림
  systemInfo: (message: string) => {
    return new NotificationBuilder()
      .title('시스템 정보')
      .message(message)
      .type('info')
      .category('system')
      .priority('medium')
      .build();
  },

  // 성공 알림
  success: (message: string) => {
    return new NotificationBuilder()
      .title('성공')
      .message(message)
      .type('success')
      .category('system')
      .priority('low')
      .build();
  },

  // 경고 알림
  warning: (message: string) => {
    return new NotificationBuilder()
      .title('경고')
      .message(message)
      .type('warning')
      .category('system')
      .priority('high')
      .build();
  },

  // 오류 알림
  error: (message: string) => {
    return new NotificationBuilder()
      .title('오류')
      .message(message)
      .type('error')
      .category('system')
      .priority('high')
      .build();
  },

  // 긴급 알림
  critical: (message: string) => {
    return new NotificationBuilder()
      .title('긴급')
      .message(message)
      .type('critical')
      .category('alert')
      .priority('urgent')
      .action('확인', () => console.log('Critical alert acknowledged'))
      .build();
  },

  // 작업 완료 알림
  taskCompleted: (taskName: string, details?: string) => {
    return new NotificationBuilder()
      .title(`${taskName} 작업 완료`)
      .message(details || `${taskName} 작업이 성공적으로 완료되었습니다.`)
      .type('success')
      .category('task')
      .priority('medium')
      .build();
  }
};

// 알림 규칙 빌더
export class NotificationRuleBuilder {
  private rule: Partial<NotificationRule> = {
    enabled: true,
    priority: 10
  };

  name(name: string) {
    this.rule.name = name;
    return this;
  }

  condition(condition: (notification: Notification) => boolean) {
    this.rule.condition = condition;
    return this;
  }

  action(action: (notification: Notification) => void) {
    this.rule.action = action;
    return this;
  }

  priority(priority: number) {
    this.rule.priority = priority;
    return this;
  }

  disabled() {
    this.rule.enabled = false;
    return this;
  }

  build(): NotificationRule {
    if (!this.rule.name || !this.rule.condition || !this.rule.action) {
      throw new Error('Rule must have name, condition and action');
    }

    return this.rule as NotificationRule;
  }
}