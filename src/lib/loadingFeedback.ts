// 로딩 상태 피드백 및 스켈레톤 UI 유틸리티
export interface LoadingState {
  id: string;
  type: 'global' | 'section' | 'button' | 'data' | 'image';
  status: 'idle' | 'loading' | 'success' | 'error';
  progress?: number;
  message?: string;
  timestamp: number;
  duration?: number;
}

export interface SkeletonOptions {
  type: 'text' | 'image' | 'card' | 'list' | 'grid' | 'button';
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  animation?: 'pulse' | 'wave' | 'gradient' | 'none';
  count?: number;
  className?: string;
}

export interface LoadingFeedbackOptions {
  enableGlobalLoader?: boolean;
  enableProgressTracking?: boolean;
  enableSmartPlaceholders?: boolean;
  skeletonAnimation?: 'pulse' | 'wave' | 'gradient';
  skeletonDuration?: number;
  minLoadingTime?: number;
  showSuccessFeedback?: boolean;
  showErrorFeedback?: boolean;
}

class LoadingFeedbackManager {
  private states: Map<string, LoadingState> = new Map();
  private globalLoader: HTMLElement | null = null;
  private progressCallbacks: Map<string, (progress: number) => void> = new Map();
  private options: LoadingFeedbackOptions;

  constructor(options: LoadingFeedbackOptions = {}) {
    this.options = {
      enableGlobalLoader: true,
      enableProgressTracking: true,
      enableSmartPlaceholders: true,
      skeletonAnimation: 'pulse',
      skeletonDuration: 2000,
      minLoadingTime: 300,
      showSuccessFeedback: true,
      showErrorFeedback: true,
      ...options
    };

    if (this.options.enableGlobalLoader) {
      this.createGlobalLoader();
    }
  }

  private createGlobalLoader(): void {
    const loader = document.createElement('div');
    loader.id = 'global-loading-indicator';
    loader.className = 'global-loader hidden';
    loader.innerHTML = `
      <div class="loader-overlay">
        <div class="loader-spinner">
          <div class="loader-icon"></div>
          <div class="loader-text">로딩 중...</div>
        </div>
      </div>
    `;
    document.body.appendChild(loader);
    this.globalLoader = loader;
  }

  // 로딩 상태 시작
  startLoading(
    id: string,
    type: LoadingState['type'] = 'section',
    message?: string
  ): void {
    const startTime = Date.now();
    const state: LoadingState = {
      id,
      type,
      status: 'loading',
      message,
      timestamp: startTime
    };

    this.states.set(id, state);

    // 글로벌 로더 표시
    if (type === 'global' && this.globalLoader) {
      this.globalLoader.classList.remove('hidden');
    }

    // 상태 변경 콜백 호출 (React 상태 업데이트 등)
    this.notifyStateChange(id, state);
  }

  // 로딩 진행률 업데이트
  updateProgress(id: string, progress: number, message?: string): void {
    const state = this.states.get(id);
    if (state) {
      state.progress = progress;
      if (message) state.message = message;
      
      this.states.set(id, state);
      this.notifyStateChange(id, state);

      // 진행률 콜백 호출
      const callback = this.progressCallbacks.get(id);
      if (callback) {
        callback(progress);
      }
    }
  }

  // 로딩 성공
  completeLoading(id: string, message?: string): void {
    const state = this.states.get(id);
    if (state) {
      const duration = Date.now() - state.timestamp;
      state.status = 'success';
      state.duration = duration;
      if (message) state.message = message;
      
      this.states.set(id, state);
      this.notifyStateChange(id, state);

      // 최소 로딩 시간 보장
      setTimeout(() => {
        this.hideLoader(id);
      }, Math.max(0, this.options.minLoadingTime! - duration));

      // 성공 피드백 표시
      if (this.options.showSuccessFeedback) {
        this.showSuccessFeedback(message || '로딩 완료');
      }
    }
  }

  // 로딩 오류
  errorLoading(id: string, message: string): void {
    const state = this.states.get(id);
    if (state) {
      const duration = Date.now() - state.timestamp;
      state.status = 'error';
      state.duration = duration;
      state.message = message;
      
      this.states.set(id, state);
      this.notifyStateChange(id, state);

      // 오류 피드백 표시
      if (this.options.showErrorFeedback) {
        this.showErrorFeedback(message);
      }

      this.hideLoader(id);
    }
  }

  // 로더 숨기기
  private hideLoader(id: string): void {
    const state = this.states.get(id);
    if (state) {
      if (state.type === 'global' && this.globalLoader) {
        this.globalLoader.classList.add('hidden');
      }
      
      // 상태 제거 (성공 또는 오류 후)
      setTimeout(() => {
        this.states.delete(id);
        this.progressCallbacks.delete(id);
      }, 1000);
    }
  }

  // 상태 변경 알림 (외부 콜백)
  private notifyStateChange(id: string, state: LoadingState): void {
    // 이 부분은 React 또는 다른 상태 관리 시스템과 통합 시 구현
    // 예: 상태 변경 이벤트 발생, 콜백 호출 등
  }

  // 진행률 콜백 등록
  onProgress(id: string, callback: (progress: number) => void): void {
    this.progressCallbacks.set(id, callback);
  }

  // 스켈레톤 HTML 생성
  createSkeleton(options: SkeletonOptions): string {
    const {
      type = 'text',
      width = '100%',
      height = type === 'text' ? '1em' : '100px',
      borderRadius = '4px',
      animation = this.options.skeletonAnimation,
      count = 1,
      className = ''
    } = options;

    const animationClass = animation !== 'none' ? `skeleton-${animation}` : '';
    const styles = `width: ${width}; height: ${height}; border-radius: ${borderRadius};`;

    const skeletonItems = Array(count).fill(0).map(() => `
      <div class="skeleton ${animationClass} ${className}" style="${styles}">
        ${type === 'text' ? '&nbsp;' : ''}
      </div>
    `).join('');

    return skeletonItems;
  }

  // 스켈레톤 컴포넌트 스타일
  getSkeletonStyles(): string {
    return `
      .skeleton {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: skeleton-loading ${this.options.skeletonDuration}ms infinite;
      }

      .skeleton-pulse {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: skeleton-pulse 1.5s ease-in-out infinite;
      }

      .skeleton-wave {
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
        background-size: 200% 100%;
        animation: skeleton-wave 1.6s linear infinite;
      }

      .skeleton-gradient {
        background: linear-gradient(90deg, #f0f0f0, #e0e0e0, #f0f0f0);
        background-size: 400% 400%;
        animation: skeleton-gradient 3s ease infinite;
      }

      @keyframes skeleton-loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      @keyframes skeleton-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      @keyframes skeleton-wave {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }

      @keyframes skeleton-gradient {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }

      .global-loader {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      }

      .global-loader.hidden {
        display: none;
      }

      .loader-overlay {
        background: white;
        padding: 2rem;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
      }

      .loader-spinner {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
      }

      .loader-icon {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .loader-text {
        color: #666;
        font-size: 14px;
      }

      .loading-feedback {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem;
        border-radius: 8px;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
      }

      .loading-feedback.success {
        background: #d4edda;
        color: #155724;
        border: 1px solid #c3e6cb;
      }

      .loading-feedback.error {
        background: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
      }

      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
  }

  // 성공 피드백 표시
  private showSuccessFeedback(message: string): void {
    this.showFeedback(message, 'success');
  }

  // 오류 피드백 표시
  private showErrorFeedback(message: string): void {
    this.showFeedback(message, 'error');
  }

  // 피드백 표시
  private showFeedback(message: string, type: 'success' | 'error'): void {
    const feedback = document.createElement('div');
    feedback.className = `loading-feedback ${type}`;
    feedback.textContent = message;
    
    document.body.appendChild(feedback);

    // 3초 후 자동 제거
    setTimeout(() => {
      feedback.remove();
    }, 3000);
  }

  // 현재 로딩 상태 가져오기
  getState(id: string): LoadingState | null {
    return this.states.get(id) || null;
  }

  // 모든 로딩 상태 가져오기
  getAllStates(): LoadingState[] {
    return Array.from(this.states.values());
  }

  // 로딩 중인 항목 확인
  isLoading(id: string): boolean {
    const state = this.states.get(id);
    return state?.status === 'loading';
  }

  // 스마트 플레이스홀더 생성 (컨텐츠 유형에 따라 적절한 스켈레톤 표시)
  createSmartPlaceholder(contentType: string, options?: Partial<SkeletonOptions>): string {
    const baseOptions: SkeletonOptions = {
      type: 'text',
      width: '100%',
      height: '1em',
      borderRadius: '4px',
      animation: 'pulse',
      count: 1,
      ...options
    };

    switch (contentType) {
      case 'avatar':
        return this.createSkeleton({
          ...baseOptions,
          type: 'image',
          width: '40px',
          height: '40px',
          borderRadius: '50%'
        });
      case 'button':
        return this.createSkeleton({
          ...baseOptions,
          type: 'button',
          width: '120px',
          height: '40px',
          borderRadius: '8px'
        });
      case 'card':
        return this.createSkeleton({
          ...baseOptions,
          type: 'card',
          height: '200px',
          borderRadius: '12px'
        });
      case 'list-item':
        return this.createSkeleton({
          ...baseOptions,
          type: 'list',
          height: '60px',
          count: 3
        });
      default:
        return this.createSkeleton(baseOptions);
    }
  }

  // 로딩 그룹 관리
  async executeWithLoading<T>(
    id: string,
    executor: () => Promise<T>,
    options: {
      type?: LoadingState['type'];
      message?: string;
      showProgress?: boolean;
    } = {}
  ): Promise<T> {
    const { type = 'section', message, showProgress = false } = options;
    
    this.startLoading(id, type, message);

    try {
      const result = await executor();
      
      if (showProgress) {
        this.updateProgress(id, 100, '완료 중...');
      }
      
      this.completeLoading(id, '로딩 완료');
      return result;
    } catch (error) {
      this.errorLoading(id, error instanceof Error ? error.message : '알 수 없는 오류');
      throw error;
    }
  }

  // 메모리 정리
  destroy(): void {
    if (this.globalLoader) {
      this.globalLoader.remove();
    }
    
    this.states.clear();
    this.progressCallbacks.clear();
  }
}

// 전역 로딩 피드백 관리자 인스턴스
export const loadingFeedbackManager = new LoadingFeedbackManager();

// React 훅 형태
export function useLoading(id: string, type: LoadingState['type'] = 'section') {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<LoadingState['status']>('idle');

  useEffect(() => {
    const updateState = (state: LoadingState) => {
      setLoading(state.status === 'loading');
      setProgress(state.progress || 0);
      setMessage(state.message || '');
      setStatus(state.status);
    };

    // 상태 변경 감지를 위한 폴링 (실제 구현에서는 이벤트 기반으로 개선)
    const interval = setInterval(() => {
      const state = loadingFeedbackManager.getState(id);
      if (state) {
        updateState(state);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [id]);

  const start = useCallback((msg?: string) => {
    loadingFeedbackManager.startLoading(id, type, msg);
  }, [id, type]);

  const complete = useCallback((msg?: string) => {
    loadingFeedbackManager.completeLoading(id, msg);
  }, [id]);

  const error = useCallback((msg: string) => {
    loadingFeedbackManager.errorLoading(id, msg);
  }, [id]);

  const updateProgress = useCallback((prog: number, msg?: string) => {
    loadingFeedbackManager.updateProgress(id, prog, msg);
  }, [id]);

  return {
    loading,
    progress,
    message,
    status,
    start,
    complete,
    error,
    updateProgress
  };
}

// 스켈레톤 훅
export function useSkeleton(options: SkeletonOptions) {
  const [skeletonHtml, setSkeletonHtml] = useState('');

  useEffect(() => {
    setSkeletonHtml(loadingFeedbackManager.createSkeleton(options));
  }, [options]);

  return skeletonHtml;
}

// 로딩 실행 훅
export function useLoadingExecutor() {
  const execute = useCallback(async <T>(
    id: string,
    executor: () => Promise<T>,
    options?: {
      type?: LoadingState['type'];
      message?: string;
      showProgress?: boolean;
    }
  ): Promise<T> => {
    return loadingFeedbackManager.executeWithLoading(id, executor, options);
  }, []);

  return { execute };
}