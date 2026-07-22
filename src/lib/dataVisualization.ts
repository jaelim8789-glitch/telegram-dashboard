// 데이터 시각화 대시보드 기능
export interface ChartDataPoint {
  x: string | number | Date;
  y: number;
  label?: string;
  color?: string;
  metadata?: Record<string, any>;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter' | 'radar' | 'heatmap';
  title?: string;
  xAxis?: {
    label?: string;
    type?: 'category' | 'numeric' | 'time';
  };
  yAxis?: {
    label?: string;
    min?: number;
    max?: number;
  };
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  animations?: boolean;
  responsive?: boolean;
}

export interface DashboardWidget {
  id: string;
  title: string;
  chartConfig: ChartConfig;
  data: ChartDataPoint[];
  refreshInterval?: number; // 초 단위
  lastUpdated?: Date;
}

export interface VisualizationTheme {
  primary: string;
  secondary: string;
  background: string;
  grid: string;
  text: string;
  success: string;
  warning: string;
  danger: string;
}

export interface DataVisualizationOptions {
  theme?: VisualizationTheme;
  defaultColors?: string[];
  animationDuration?: number;
  exportEnabled?: boolean;
}

class DataVisualizationManager {
  private widgets: Map<string, DashboardWidget> = new Map();
  private theme: VisualizationTheme;
  private defaultColors: string[];
  private animationDuration: number;
  private exportEnabled: boolean;

  constructor(options: DataVisualizationOptions = {}) {
    this.theme = options.theme || {
      primary: '#3b82f6',
      secondary: '#60a5fa',
      background: '#ffffff',
      grid: '#e5e7eb',
      text: '#1f2937',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444'
    };

    this.defaultColors = options.defaultColors || [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
      '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
    ];

    this.animationDuration = options.animationDuration || 500;
    this.exportEnabled = options.exportEnabled !== false; // 기본값은 true
  }

  // 위젯 추가
  addWidget(widget: Omit<DashboardWidget, 'id' | 'lastUpdated'>): string {
    const id = widget.id || `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newWidget: DashboardWidget = {
      ...widget,
      id,
      lastUpdated: new Date()
    };

    this.widgets.set(id, newWidget);
    return id;
  }

  // 위젯 업데이트
  updateWidget(id: string, updates: Partial<DashboardWidget>): boolean {
    const widget = this.widgets.get(id);
    if (!widget) return false;

    // 데이터 업데이트 시 마지막 업데이트 시간 갱신
    if (updates.data) {
      updates.lastUpdated = new Date();
    }

    Object.assign(widget, updates);
    return true;
  }

  // 위젯 가져오기
  getWidget(id: string): DashboardWidget | undefined {
    return this.widgets.get(id);
  }

  // 모든 위젯 가져오기
  getAllWidgets(): DashboardWidget[] {
    return Array.from(this.widgets.values());
  }

  // 위젯 삭제
  removeWidget(id: string): boolean {
    return this.widgets.delete(id);
  }

  // 데이터 업데이트
  updateWidgetData(id: string, data: ChartDataPoint[]): boolean {
    const widget = this.widgets.get(id);
    if (!widget) return false;

    widget.data = data;
    widget.lastUpdated = new Date();
    return true;
  }

  // 차트 데이터 전처리
  preprocessChartData(data: ChartDataPoint[], config: ChartConfig): any {
    // 시간 기반 데이터 정렬
    if (config.xAxis?.type === 'time') {
      data.sort((a, b) => {
        const dateA = typeof a.x === 'string' || typeof a.x === 'number' ? new Date(a.x) : a.x;
        const dateB = typeof b.x === 'string' || typeof b.x === 'number' ? new Date(b.x) : b.x;
        return dateA.getTime() - dateB.getTime();
      });
    }

    // 데이터 레이블 설정
    const labels = data.map(point => point.x.toString());
    const values = data.map(point => point.y);
    const colors = data.map(point => point.color || this.getColorForIndex(data.indexOf(point)));

    return {
      labels,
      datasets: [{
        label: config.title || 'Dataset',
        data: values,
        backgroundColor: config.type === 'bar' || config.type === 'pie' ? colors : this.adjustColorOpacity(this.theme.primary, 0.6),
        borderColor: config.type === 'line' ? this.theme.primary : colors,
        borderWidth: config.type === 'line' ? 2 : 1,
        tension: config.type === 'line' ? 0.4 : 0,
        fill: config.type === 'area'
      }]
    };
  }

  // 색상 가져오기
  private getColorForIndex(index: number): string {
    return this.defaultColors[index % this.defaultColors.length];
  }

  // 색상 투명도 조절
  private adjustColorOpacity(color: string, opacity: number): string {
    // RGB 색상에서 투명도 추가
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color;
  }

  // 데이터 요약
  summarizeData(data: ChartDataPoint[]): {
    total: number;
    average: number;
    min: number;
    max: number;
    count: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  } {
    if (data.length === 0) {
      return { total: 0, average: 0, min: 0, max: 0, count: 0, trend: 'stable' };
    }

    const values = data.map(point => point.y);
    const total = values.reduce((sum, val) => sum + val, 0);
    const average = total / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const count = values.length;

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (data.length >= 2) {
      const first = data[0].y;
      const last = data[data.length - 1].y;
      if (last > first) {
        trend = 'increasing';
      } else if (last < first) {
        trend = 'decreasing';
      }
    }

    return { total, average, min, max, count, trend };
  }

  // 데이터 필터링
  filterData(data: ChartDataPoint[], filterFn: (point: ChartDataPoint) => boolean): ChartDataPoint[] {
    return data.filter(filterFn);
  }

  // 데이터 그룹화
  groupData(data: ChartDataPoint[], groupBy: (point: ChartDataPoint) => string): Map<string, ChartDataPoint[]> {
    const grouped = new Map<string, ChartDataPoint[]>();
    
    data.forEach(point => {
      const key = groupBy(point);
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(point);
    });

    return grouped;
  }

  // 데이터 정렬
  sortData(data: ChartDataPoint[], sortBy: 'x' | 'y' = 'y', order: 'asc' | 'desc' = 'desc'): ChartDataPoint[] {
    return [...data].sort((a, b) => {
      const valueA = sortBy === 'x' ? (typeof a.x === 'object' ? a.x.getTime() : a.x as number) : a.y;
      const valueB = sortBy === 'x' ? (typeof b.x === 'object' ? b.x.getTime() : b.x as number) : b.y;
      
      const comparison = valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      return order === 'asc' ? comparison : -comparison;
    });
  }

  // 데이터 변환 (예: 이동 평균)
  transformData(data: ChartDataPoint[], transformation: 'movingAverage' | 'cumulative' | 'rateOfChange', window?: number): ChartDataPoint[] {
    if (transformation === 'movingAverage') {
      const win = window || 3;
      return data.map((point, index) => {
        const start = Math.max(0, index - win + 1);
        const end = index + 1;
        const slice = data.slice(start, end);
        const avg = slice.reduce((sum, p) => sum + p.y, 0) / slice.length;
        
        return {
          ...point,
          y: avg
        };
      });
    } else if (transformation === 'cumulative') {
      let cumulative = 0;
      return data.map(point => {
        cumulative += point.y;
        return {
          ...point,
          y: cumulative
        };
      });
    } else if (transformation === 'rateOfChange') {
      return data.map((point, index) => {
        if (index === 0) {
          return { ...point, y: 0 };
        }
        
        const prevY = data[index - 1].y;
        const rateOfChange = prevY !== 0 ? ((point.y - prevY) / prevY) * 100 : 0;
        
        return {
          ...point,
          y: rateOfChange
        };
      });
    }

    return data;
  }

  // 차트 이미지로 내보내기 (가상)
  exportChart(id: string, format: 'png' | 'jpeg' | 'svg' = 'png'): Promise<Blob | null> {
    if (!this.exportEnabled) {
      return Promise.reject(new Error('Export is disabled'));
    }

    // 실제 구현은 Canvas 또는 SVG를 기반으로 이미지 생성
    // 여기서는 더미 구현
    return Promise.resolve(null);
  }

  // 데이터 CSV로 내보내기
  exportDataToCSV(id: string): string {
    const widget = this.widgets.get(id);
    if (!widget) return '';

    const headers = ['x', 'y'];
    if (widget.data[0]?.label) headers.push('label');
    if (widget.data[0]?.metadata) {
      const metadataKeys = Object.keys(widget.data[0].metadata);
      headers.push(...metadataKeys);
    }

    const rows = [headers.join(',')];

    widget.data.forEach(point => {
      const row = [point.x.toString(), point.y.toString()];
      if (point.label) row.push(point.label);
      
      if (point.metadata) {
        const metadataKeys = Object.keys(point.metadata);
        metadataKeys.forEach(key => row.push(point.metadata![key].toString()));
      }
      
      rows.push(row.join(','));
    });

    return rows.join('\n');
  }

  // 데이터 요약 보고서 생성
  generateSummaryReport(): string {
    const widgets = this.getAllWidgets();
    const reportLines = [
      '=== TeleMon 데이터 시각화 대시보드 요약 보고서 ===',
      `생성된 위젯 수: ${widgets.length}`,
      `총 데이터 포인트 수: ${widgets.reduce((sum, widget) => sum + widget.data.length, 0)}`,
      '\n위젯별 요약:'
    ];

    widgets.forEach(widget => {
      const summary = this.summarizeData(widget.data);
      reportLines.push(
        `- ${widget.title || '제목 없음'}:`,
        `  * 총합: ${summary.total.toFixed(2)}, 평균: ${summary.average.toFixed(2)}`,
        `  * 최소: ${summary.min}, 최대: ${summary.max}`,
        `  * 개수: ${summary.count}, 추세: ${summary.trend}`,
        `  * 마지막 업데이트: ${widget.lastUpdated?.toLocaleString() || '미정'}`,
        ''
      );
    });

    return reportLines.join('\n');
  }

  // 테마 업데이트
  updateTheme(newTheme: Partial<VisualizationTheme>): void {
    Object.assign(this.theme, newTheme);
  }

  // 차트 옵션 업데이트
  updateChartOptions(id: string, options: Partial<ChartConfig>): boolean {
    const widget = this.widgets.get(id);
    if (!widget) return false;

    Object.assign(widget.chartConfig, options);
    return true;
  }

  // 실시간 데이터 업데이트
  updateRealTimeData(id: string, newDataPoint: ChartDataPoint, maxPoints: number = 100): boolean {
    const widget = this.widgets.get(id);
    if (!widget) return false;

    widget.data.push(newDataPoint);

    // 최대 포인트 수 유지
    if (widget.data.length > maxPoints) {
      widget.data = widget.data.slice(-maxPoints);
    }

    widget.lastUpdated = new Date();
    return true;
  }

  // 데이터 범위 기반 필터
  filterByRange(data: ChartDataPoint[], minX?: any, maxX?: any, minY?: number, maxY?: number): ChartDataPoint[] {
    return data.filter(point => {
      const xCondition = (
        (minX === undefined || point.x >= minX) &&
        (maxX === undefined || point.x <= maxX)
      );
      const yCondition = (
        (minY === undefined || point.y >= minY) &&
        (maxY === undefined || point.y <= maxY)
      );
      return xCondition && yCondition;
    });
  }

  // 통계 계산
  calculateStatistics(data: ChartDataPoint[]): {
    mean: number;
    median: number;
    stdDev: number;
    variance: number;
    q25: number;
    q75: number;
  } {
    if (data.length === 0) {
      return { mean: 0, median: 0, stdDev: 0, variance: 0, q25: 0, q75: 0 };
    }

    const values = data.map(p => p.y).sort((a, b) => a - b);
    const n = values.length;

    // 평균
    const mean = values.reduce((sum, val) => sum + val, 0) / n;

    // 중앙값
    const median = n % 2 === 0 
      ? (values[n / 2 - 1] + values[n / 2]) / 2 
      : values[Math.floor(n / 2)];

    // 분산 및 표준편차
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / n;
    const stdDev = Math.sqrt(variance);

    // 사분위수
    const q25 = values[Math.floor(n * 0.25)];
    const q75 = values[Math.floor(n * 0.75)];

    return { mean, median, stdDev, variance, q25, q75 };
  }

  // 메모리 정리
  destroy(): void {
    this.widgets.clear();
  }
}

// 전역 데이터 시각화 관리자 인스턴스
export const dataVisualizationManager = new DataVisualizationManager();

// React 훅 형태
export function useDataVisualization() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(dataVisualizationManager.getAllWidgets());

  useEffect(() => {
    // 주기적으로 위젯 상태 갱신
    const interval = setInterval(() => {
      setWidgets(dataVisualizationManager.getAllWidgets());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    widgets,
    addWidget: dataVisualizationManager.addWidget.bind(dataVisualizationManager),
    updateWidget: dataVisualizationManager.updateWidget.bind(dataVisualizationManager),
    getWidget: dataVisualizationManager.getWidget.bind(dataVisualizationManager),
    removeWidget: dataVisualizationManager.removeWidget.bind(dataVisualizationManager),
    updateWidgetData: dataVisualizationManager.updateWidgetData.bind(dataVisualizationManager),
    preprocessChartData: dataVisualizationManager.preprocessChartData.bind(dataVisualizationManager),
    summarizeData: dataVisualizationManager.summarizeData.bind(dataVisualizationManager),
    filterData: dataVisualizationManager.filterData.bind(dataVisualizationManager),
    groupData: dataVisualizationManager.groupData.bind(dataVisualizationManager),
    sortData: dataVisualizationManager.sortData.bind(dataVisualizationManager),
    transformData: dataVisualizationManager.transformData.bind(dataVisualizationManager),
    exportDataToCSV: dataVisualizationManager.exportDataToCSV.bind(dataVisualizationManager),
    updateRealTimeData: dataVisualizationManager.updateRealTimeData.bind(dataVisualizationManager),
    calculateStatistics: dataVisualizationManager.calculateStatistics.bind(dataVisualizationManager)
  };
}

// 차트 빌더
export class ChartBuilder {
  private config: Partial<ChartConfig> = {};
  private data: ChartDataPoint[] = [];

  type(type: ChartConfig['type']) {
    this.config.type = type;
    return this;
  }

  title(title: string) {
    this.config.title = title;
    return this;
  }

  xAxis(label: string, type?: ChartConfig['xAxis']['type']) {
    this.config.xAxis = { label, type };
    return this;
  }

  yAxis(label?: string, min?: number, max?: number) {
    this.config.yAxis = { label, min, max };
    return this;
  }

  data(data: ChartDataPoint[]) {
    this.data = data;
    return this;
  }

  addDataPoint(x: string | number | Date, y: number, label?: string) {
    this.data.push({ x, y, label });
    return this;
  }

  colors(colors: string[]) {
    this.config.colors = colors;
    return this;
  }

  showLegend(show: boolean) {
    this.config.showLegend = show;
    return this;
  }

  showGrid(show: boolean) {
    this.config.showGrid = show;
    return this;
  }

  enableAnimations(enable: boolean) {
    this.config.animations = enable;
    return this;
  }

  makeResponsive(responsive: boolean) {
    this.config.responsive = responsive;
    return this;
  }

  build(): { config: ChartConfig; data: ChartDataPoint[] } {
    if (!this.config.type) {
      this.config.type = 'line';
    }

    return {
      config: this.config as ChartConfig,
      data: this.data
    };
  }
}

// 자주 사용하는 차트 템플릿
export const ChartTemplates = {
  // 메시지 발송 통계
  createMessageStatsChart: (data: Array<{ date: string; count: number }>) => {
    return new ChartBuilder()
      .type('line')
      .title('일일 메시지 발송 통계')
      .xAxis('날짜', 'time')
      .yAxis('발송 수', 0)
      .data(data.map(item => ({
        x: new Date(item.date),
        y: item.count,
        label: `${item.date}: ${item.count}건`
      })))
      .showGrid(true)
      .enableAnimations(true)
      .makeResponsive(true)
      .build();
  },

  // 계정별 활동 통계
  createAccountActivityChart: (data: Array<{ account: string; activity: number }>) => {
    return new ChartBuilder()
      .type('bar')
      .title('계정별 활동 통계')
      .xAxis('계정')
      .yAxis('활동 수')
      .data(data.map(item => ({
        x: item.account,
        y: item.activity,
        label: `${item.account}: ${item.activity}`
      })))
      .showLegend(false)
      .build();
  },

  // 응답률 분석
  createResponseRateChart: (data: Array<{ period: string; rate: number }>) => {
    return new ChartBuilder()
      .type('area')
      .title('응답률 추이')
      .xAxis('기간')
      .yAxis('응답률 (%)', 0, 100)
      .data(data.map(item => ({
        x: item.period,
        y: item.rate,
        label: `${item.period}: ${item.rate}%`
      })))
      .enableAnimations(true)
      .build();
  }
};

// 대시보드 레이아웃 관리
export class DashboardLayoutManager {
  private layouts: Map<string, DashboardWidget[]> = new Map();

  // 레이아웃 저장
  saveLayout(layoutId: string, widgets: DashboardWidget[]): void {
    this.layouts.set(layoutId, widgets);
  }

  // 레이아웃 불러오기
  loadLayout(layoutId: string): DashboardWidget[] | undefined {
    return this.layouts.get(layoutId);
  }

  // 레이아웃 삭제
  removeLayout(layoutId: string): boolean {
    return this.layouts.delete(layoutId);
  }

  // 모든 레이아웃 가져오기
  getAllLayouts(): string[] {
    return Array.from(this.layouts.keys());
  }

  // 레이아웃 복제
  cloneLayout(sourceId: string, targetId: string): boolean {
    const sourceLayout = this.layouts.get(sourceId);
    if (!sourceLayout) return false;

    // 위젯 ID 재생성
    const clonedWidgets = sourceLayout.map(widget => ({
      ...widget,
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }));

    this.layouts.set(targetId, clonedWidgets);
    return true;
  }
}

// 전역 레이아웃 관리자
export const dashboardLayoutManager = new DashboardLayoutManager();