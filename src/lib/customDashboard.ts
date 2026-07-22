// 사용자 정의 대시보드 기능
export interface WidgetConfig {
  id: string;
  type: 'chart' | 'stat' | 'list' | 'analytics' | 'activity' | 'quick-actions';
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  settings: Record<string, any>;
  visible: boolean;
}

export interface DashboardLayout {
  id: string;
  name: string;
  widgets: WidgetConfig[];
  createdAt: Date;
  updatedAt: Date;
  isDefault: boolean;
}

export interface DashboardPreferences {
  theme: 'light' | 'dark' | 'auto';
  gridSize: number;
  snapToGrid: boolean;
  autoSave: boolean;
  refreshInterval: number; // 초 단위
}

export interface DashboardState {
  layouts: DashboardLayout[];
  currentLayoutId: string | null;
  preferences: DashboardPreferences;
  isEditing: boolean;
  isDragging: boolean;
  isResizing: boolean;
}

class CustomDashboardManager {
  private state: DashboardState;
  private listeners: Array<(state: DashboardState) => void> = [];

  constructor(initialState?: Partial<DashboardState>) {
    this.state = {
      layouts: [],
      currentLayoutId: null,
      preferences: {
        theme: 'auto',
        gridSize: 20,
        snapToGrid: true,
        autoSave: true,
        refreshInterval: 30
      },
      isEditing: false,
      isDragging: false,
      isResizing: false,
      ...initialState
    };

    // 로컬 스토리지에서 상태 복원
    this.loadFromStorage();
  }

  // 상태 변경 구독
  subscribe(listener: (state: DashboardState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // 상태 변경 알림
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  // 상태 가져오기
  getState(): DashboardState {
    return { ...this.state };
  }

  // 로컬 스토리지에서 불러오기
  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem('telemon-dashboard-state');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.state = {
          ...this.state,
          ...parsed,
          layouts: parsed.layouts.map((layout: any) => ({
            ...layout,
            createdAt: new Date(layout.createdAt),
            updatedAt: new Date(layout.updatedAt)
          }))
        };
      }
    } catch (error) {
      console.warn('Failed to load dashboard state from storage:', error);
    }
  }

  // 로컬 스토리지에 저장
  private saveToStorage(): void {
    try {
      localStorage.setItem('telemon-dashboard-state', JSON.stringify(this.state));
    } catch (error) {
      console.warn('Failed to save dashboard state to storage:', error);
    }
  }

  // 레이아웃 추가
  addLayout(name: string): DashboardLayout {
    const newLayout: DashboardLayout = {
      id: `layout-${Date.now()}`,
      name,
      widgets: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isDefault: false
    };

    this.state.layouts.push(newLayout);
    this.state.currentLayoutId = newLayout.id;
    this.saveState();

    return newLayout;
  }

  // 레이アウト 업데이트
  updateLayout(layoutId: string, updates: Partial<DashboardLayout>): void {
    const layoutIndex = this.state.layouts.findIndex(l => l.id === layoutId);
    if (layoutIndex > -1) {
      this.state.layouts[layoutIndex] = {
        ...this.state.layouts[layoutIndex],
        ...updates,
        updatedAt: new Date()
      };
      this.saveState();
    }
  }

  // 레이아웃 삭제
  deleteLayout(layoutId: string): void {
    this.state.layouts = this.state.layouts.filter(l => l.id !== layoutId);
    if (this.state.currentLayoutId === layoutId) {
      this.state.currentLayoutId = this.state.layouts[0]?.id || null;
    }
    this.saveState();
  }

  // 레이아웃 선택
  selectLayout(layoutId: string): void {
    const layoutExists = this.state.layouts.some(l => l.id === layoutId);
    if (layoutExists) {
      this.state.currentLayoutId = layoutId;
      this.saveState();
    }
  }

  // 현재 레이아웃 가져오기
  getCurrentLayout(): DashboardLayout | null {
    if (!this.state.currentLayoutId) {
      return this.state.layouts.find(l => l.isDefault) || this.state.layouts[0] || null;
    }
    return this.state.layouts.find(l => l.id === this.state.currentLayoutId) || null;
  }

  // 위젯 추가
  addWidget(widget: Omit<WidgetConfig, 'id'>): WidgetConfig {
    const currentLayout = this.getCurrentLayout();
    if (!currentLayout) {
      throw new Error('No current layout selected');
    }

    const newWidget: WidgetConfig = {
      ...widget,
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    currentLayout.widgets.push(newWidget);
    this.updateLayout(currentLayout.id, currentLayout);
    this.saveState();

    return newWidget;
  }

  // 위젯 업데이트
  updateWidget(widgetId: string, updates: Partial<WidgetConfig>): void {
    const currentLayout = this.getCurrentLayout();
    if (!currentLayout) return;

    const widgetIndex = currentLayout.widgets.findIndex(w => w.id === widgetId);
    if (widgetIndex > -1) {
      currentLayout.widgets[widgetIndex] = {
        ...currentLayout.widgets[widgetIndex],
        ...updates
      };
      this.updateLayout(currentLayout.id, currentLayout);
      this.saveState();
    }
  }

  // 위젯 삭제
  removeWidget(widgetId: string): void {
    const currentLayout = this.getCurrentLayout();
    if (!currentLayout) return;

    currentLayout.widgets = currentLayout.widgets.filter(w => w.id !== widgetId);
    this.updateLayout(currentLayout.id, currentLayout);
    this.saveState();
  }

  // 위젯 이동
  moveWidget(widgetId: string, newPosition: { x: number; y: number }): void {
    this.updateWidget(widgetId, { position: newPosition });
  }

  // 위젯 크기 조정
  resizeWidget(widgetId: string, newSize: { width: number; height: number }): void {
    this.updateWidget(widgetId, { size: newSize });
  }

  // 위젯 표시/숨김
  toggleWidgetVisibility(widgetId: string): void {
    const currentLayout = this.getCurrentLayout();
    if (!currentLayout) return;

    const widget = currentLayout.widgets.find(w => w.id === widgetId);
    if (widget) {
      widget.visible = !widget.visible;
      this.updateLayout(currentLayout.id, currentLayout);
      this.saveState();
    }
  }

  // 편집 모드 토글
  toggleEditMode(): void {
    this.state.isEditing = !this.state.isEditing;
    this.saveState();
    this.notifyListeners();
  }

  // 드래그 상태 업데이트
  setDragging(isDragging: boolean): void {
    this.state.isDragging = isDragging;
    this.notifyListeners();
  }

  // 리사이즈 상태 업데이트
  setResizing(isResizing: boolean): void {
    this.state.isResizing = isResizing;
    this.notifyListeners();
  }

  // 환경설정 업데이트
  updatePreferences(updates: Partial<DashboardPreferences>): void {
    this.state.preferences = { ...this.state.preferences, ...updates };
    this.saveState();
  }

  // 기본 레이아웃 설정
  setAsDefault(layoutId: string): void {
    // 기존 기본 레이아웃 해제
    this.state.layouts = this.state.layouts.map(layout => ({
      ...layout,
      isDefault: layout.id === layoutId
    }));
    this.saveState();
  }

  // 레이아웃 복제
  cloneLayout(layoutId: string, newName: string): DashboardLayout | null {
    const layout = this.state.layouts.find(l => l.id === layoutId);
    if (!layout) return null;

    const clonedLayout: DashboardLayout = {
      ...layout,
      id: `layout-${Date.now()}-clone`,
      name: newName,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDefault: false
    };

    this.state.layouts.push(clonedLayout);
    this.saveState();

    return clonedLayout;
  }

  // 위젯 타입별 통계
  getWidgetStats(): Record<string, number> {
    const currentLayout = this.getCurrentLayout();
    if (!currentLayout) return {};

    const stats: Record<string, number> = {};
    currentLayout.widgets.forEach(widget => {
      stats[widget.type] = (stats[widget.type] || 0) + 1;
    });

    return stats;
  }

  // 레이아웃 검색
  searchLayouts(query: string): DashboardLayout[] {
    return this.state.layouts.filter(layout =>
      layout.name.toLowerCase().includes(query.toLowerCase())
    );
  }

  // 위젯 검색
  searchWidgets(query: string): WidgetConfig[] {
    const currentLayout = this.getCurrentLayout();
    if (!currentLayout) return [];

    return currentLayout.widgets.filter(widget =>
      widget.title.toLowerCase().includes(query.toLowerCase()) ||
      widget.type.toLowerCase().includes(query.toLowerCase())
    );
  }

  // 상태 저장
  private saveState(): void {
    if (this.state.autoSave) {
      this.saveToStorage();
    }
    this.notifyListeners();
  }

  // 레이아웃 초기화
  resetLayout(): void {
    const currentLayout = this.getCurrentLayout();
    if (!currentLayout) return;

    currentLayout.widgets = [];
    this.updateLayout(currentLayout.id, currentLayout);
  }

  // 전체 상태 초기화
  resetAll(): void {
    this.state = {
      layouts: [],
      currentLayoutId: null,
      preferences: {
        theme: 'auto',
        gridSize: 20,
        snapToGrid: true,
        autoSave: true,
        refreshInterval: 30
      },
      isEditing: false,
      isDragging: false,
      isResizing: false
    };
    this.saveToStorage();
    this.notifyListeners();
  }

  // 레이아웃 내보내기
  exportLayout(layoutId?: string): string {
    const layout = layoutId ? 
      this.state.layouts.find(l => l.id === layoutId) : 
      this.getCurrentLayout();
    
    if (!layout) return '';

    return JSON.stringify(layout, null, 2);
  }

  // 레이아웃 가져오기
  importLayout(json: string): boolean {
    try {
      const layout = JSON.parse(json) as DashboardLayout;
      
      // 유효성 검사
      if (!layout.id || !layout.name || !Array.isArray(layout.widgets)) {
        return false;
      }

      // ID 재생성 (중복 방지)
      layout.id = `layout-import-${Date.now()}`;
      layout.createdAt = new Date();
      layout.updatedAt = new Date();
      layout.isDefault = false;

      this.state.layouts.push(layout);
      this.saveToStorage();
      this.notifyListeners();

      return true;
    } catch (error) {
      console.error('Failed to import layout:', error);
      return false;
    }
  }

  // 메모리 정리
  destroy(): void {
    this.listeners = [];
    this.saveToStorage();
  }
}

// 전역 대시보드 관리자 인스턴스
export const customDashboardManager = new CustomDashboardManager();

// React 훅 형태
export function useCustomDashboard() {
  const [state, setState] = useState(customDashboardManager.getState());

  useEffect(() => {
    const unsubscribe = customDashboardManager.subscribe(setState);
    return unsubscribe;
  }, []);

  return {
    state,
    addLayout: customDashboardManager.addLayout.bind(customDashboardManager),
    updateLayout: customDashboardManager.updateLayout.bind(customDashboardManager),
    deleteLayout: customDashboardManager.deleteLayout.bind(customDashboardManager),
    selectLayout: customDashboardManager.selectLayout.bind(customDashboardManager),
    getCurrentLayout: customDashboardManager.getCurrentLayout.bind(customDashboardManager),
    addWidget: customDashboardManager.addWidget.bind(customDashboardManager),
    updateWidget: customDashboardManager.updateWidget.bind(customDashboardManager),
    removeWidget: customDashboardManager.removeWidget.bind(customDashboardManager),
    moveWidget: customDashboardManager.moveWidget.bind(customDashboardManager),
    resizeWidget: customDashboardManager.resizeWidget.bind(customDashboardManager),
    toggleWidgetVisibility: customDashboardManager.toggleWidgetVisibility.bind(customDashboardManager),
    toggleEditMode: customDashboardManager.toggleEditMode.bind(customDashboardManager),
    setDragging: customDashboardManager.setDragging.bind(customDashboardManager),
    setResizing: customDashboardManager.setResizing.bind(customDashboardManager),
    updatePreferences: customDashboardManager.updatePreferences.bind(customDashboardManager),
    setAsDefault: customDashboardManager.setAsDefault.bind(customDashboardManager),
    cloneLayout: customDashboardManager.cloneLayout.bind(customDashboardManager),
    getWidgetStats: customDashboardManager.getWidgetStats.bind(customDashboardManager),
    searchLayouts: customDashboardManager.searchLayouts.bind(customDashboardManager),
    searchWidgets: customDashboardManager.searchWidgets.bind(customDashboardManager),
    resetLayout: customDashboardManager.resetLayout.bind(customDashboardManager),
    resetAll: customDashboardManager.resetAll.bind(customDashboardManager),
    exportLayout: customDashboardManager.exportLayout.bind(customDashboardManager),
    importLayout: customDashboardManager.importLayout.bind(customDashboardManager)
  };
}

// 대시보드 위젯 타입 정의
export const DASHBOARD_WIDGET_TYPES = {
  CHART: 'chart',
  STAT: 'stat',
  LIST: 'list',
  ANALYTICS: 'analytics',
  ACTIVITY: 'activity',
  QUICK_ACTIONS: 'quick-actions'
} as const;

// 기본 위젯 설정
export const DEFAULT_WIDGETS: Omit<WidgetConfig, 'id' | 'position' | 'size'>[] = [
  {
    type: 'stat',
    title: '총 계정 수',
    settings: { metric: 'totalAccounts', refreshInterval: 30 },
    visible: true
  },
  {
    type: 'stat',
    title: '오늘 발송 수',
    settings: { metric: 'todaySent', refreshInterval: 60 },
    visible: true
  },
  {
    type: 'list',
    title: '최근 활동',
    settings: { type: 'activity', limit: 5 },
    visible: true
  },
  {
    type: 'chart',
    title: '발송 통계',
    settings: { chartType: 'line', timeRange: 'week' },
    visible: true
  }
];

// 대시보드 템플릿
export const DASHBOARD_TEMPLATES = {
  BASIC: {
    name: '기본 대시보드',
    widgets: [
      { ...DEFAULT_WIDGETS[0], position: { x: 0, y: 0 }, size: { width: 6, height: 2 } },
      { ...DEFAULT_WIDGETS[1], position: { x: 6, y: 0 }, size: { width: 6, height: 2 } },
      { ...DEFAULT_WIDGETS[2], position: { x: 0, y: 2 }, size: { width: 12, height: 4 } },
      { ...DEFAULT_WIDGETS[3], position: { x: 0, y: 6 }, size: { width: 12, height: 6 } }
    ]
  },
  ANALYTICS: {
    name: '분석 중심',
    widgets: [
      { ...DEFAULT_WIDGETS[3], position: { x: 0, y: 0 }, size: { width: 12, height: 6 } },
      { ...DEFAULT_WIDGETS[0], position: { x: 0, y: 6 }, size: { width: 4, height: 2 } },
      { ...DEFAULT_WIDGETS[1], position: { x: 4, y: 6 }, size: { width: 4, height: 2 } },
      { ...DEFAULT_WIDGETS[2], position: { x: 8, y: 6 }, size: { width: 4, height: 4 } }
    ]
  },
  MINIMAL: {
    name: '미니멀',
    widgets: [
      { ...DEFAULT_WIDGETS[0], position: { x: 0, y: 0 }, size: { width: 12, height: 2 } },
      { ...DEFAULT_WIDGETS[1], position: { x: 0, y: 2 }, size: { width: 12, height: 2 } }
    ]
  }
} as const;