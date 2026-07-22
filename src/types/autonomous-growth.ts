// Autonomous Growth Loop 시스템 타입 정의

export interface AutonomousGrowthLoop {
  id: string;
  goal: string;           // "회원 1000명 만들기"
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  currentCycle: number;
  retryCount: number;
  lastError?: string;
  successMetrics: Metrics;
  strategy: Strategy;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

export interface Metrics {
  totalReached: number;   // 현재까지 달성한 회원 수
  dailyGoals: DailyGoal[];
  conversionRate: number;
  engagementRate: number;
  lastUpdated: Date;
}

export interface DailyGoal {
  date: Date;
  target: number;
  achieved: number;
}

export interface Strategy {
  contentStrategy: ContentStrategy;
  targetingStrategy: TargetingStrategy;
  timingStrategy: TimingStrategy;
  contentVariations: ContentVariation[];
}

export interface ContentStrategy {
  contentType: 'text' | 'image' | 'video' | 'mixed';
  tone: 'professional' | 'friendly' | 'promotional' | 'informative';
  frequency: number; // 발송 빈도 (일일 기준)
  aiModel: string; // 사용할 AI 모델
}

export interface TargetingStrategy {
  audience: string; // 대상 청중
  groups: string[]; // 발송할 그룹 목록
  excludeGroups: string[]; // 제외할 그룹 목록
  targetingCriteria: Record<string, unknown>; // 타겟팅 기준
}

export interface TimingStrategy {
  optimalTimes: string[]; // 최적 발송 시간 (HH:MM)
  timezone: string;
  delayBetweenSends: number; // 발송 간 지연 시간 (초)
  pausePeriods: { start: string; end: string }[]; // 일시 중지 기간
}

export interface ContentVariation {
  id: string;
  content: string;
  performance: number; // 성능 점수
  usedCount: number; // 사용 횟수
  successRate: number; // 성공률
}

export interface LoopCycle {
  id: string;
  loopId: string;
  cycleNumber: number;
  startDate: Date;
  endDate: Date;
  goal: string;
  contentGenerated: string;
  targets: string[];
  sentCount: number;
  deliveredCount: number;
  engagementCount: number;
  successRate: number;
  analysis: CycleAnalysis;
  nextStrategy: Strategy;
}

export interface CycleAnalysis {
  performance: string; // 성능 분석
  failureReasons?: string[]; // 실패 원인
  improvementSuggestions: string[]; // 개선 제안
  nextSteps: string[]; // 다음 단계
}