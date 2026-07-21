// 사용자 행동 로깅 및 분석 시스템
export interface UserAction {
  id: string;
  userId?: string;
  timestamp: number;
  action: string;
  tabId?: string;
  details?: Record<string, any>;
  error?: string;
}

class UserAnalytics {
  private logBuffer: UserAction[] = [];
  private readonly bufferSize = 10; // 버퍼 크기
  private readonly flushInterval = 30000; // 30초마다 전송
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startFlushTimer();
    
    // 앱 종료 시 남은 로그 전송
    window.addEventListener('beforeunload', () => {
      this.flushLogs();
    });
  }

  // 사용자 행동 로깅
  logAction(action: Omit<UserAction, 'id' | 'timestamp'>) {
    const logEntry: UserAction = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      ...action
    };

    this.logBuffer.push(logEntry);

    // 오류 발생 시 즉시 전송
    if (action.error) {
      this.flushLogs();
    }

    console.debug('사용자 행동 로그:', logEntry);
  }

  // 로그 전송
  private async flushLogs() {
    if (this.logBuffer.length === 0) return;

    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];

    try {
      // 실제 구현에서는 서버로 로그 전송
      await this.sendLogsToServer(logsToSend);
      console.log(`로그 ${logsToSend.length}개 전송 완료`);
    } catch (error) {
      console.error('로그 전송 실패:', error);
      // 실패 시 다시 버퍼에 추가
      this.logBuffer = [...logsToSend, ...this.logBuffer];
    }
  }

  private async sendLogsToServer(logs: UserAction[]) {
    // 실제 구현에서는 서버 API 호출
    // 예: await fetch('/api/analytics/user-actions', { method: 'POST', body: JSON.stringify(logs) });
    console.log('서버로 로그 전송:', logs);
  }

  private startFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    this.flushTimer = setInterval(() => {
      this.flushLogs();
    }, this.flushInterval);
  }

  // 오류 발생 시 로깅
  logError(error: Error, context?: string) {
    this.logAction({
      action: 'error_occurred',
      details: {
        message: error.message,
        stack: error.stack,
        context
      },
      error: error.message
    });
  }

  // 탭 전환 로깅
  logTabChange(fromTab: string, toTab: string) {
    this.logAction({
      action: 'tab_changed',
      details: {
        from: fromTab,
        to: toTab
      },
      tabId: toTab
    });
  }

  // API 호출 로깅
  logApiCall(endpoint: string, method: string, status?: number, duration?: number) {
    this.logAction({
      action: 'api_call',
      details: {
        endpoint,
        method,
        status,
        duration
      }
    });
  }
}

// 전역 인스턴스 생성
export const userAnalytics = new UserAnalytics();

// 전역 오류 처리기 등록
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    userAnalytics.logError(event.error, 'global_error_handler');
  });

  window.addEventListener('unhandledrejection', (event) => {
    userAnalytics.logError(event.reason, 'unhandled_promise_rejection');
  });
}