import { 
  AutonomousGrowthLoop, 
  Metrics, 
  Strategy, 
  ContentStrategy, 
  TargetingStrategy, 
  TimingStrategy, 
  ContentVariation, 
  LoopCycle, 
  CycleAnalysis 
} from '@/types/autonomous-growth';
import { requestAiReply } from '@/lib/api'; // AI 콘텐츠 생성을 위한 API
import * as api from '@/lib/api'; // 발송을 위한 API

const STORAGE_KEY = "autonomous_growth_loops";

function loadLoops(): Map<string, AutonomousGrowthLoop> {
  if (typeof window === "undefined") return new Map();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const map = new Map<string, AutonomousGrowthLoop>();
      Object.entries(parsed).forEach(([k, v]) => map.set(k, v as AutonomousGrowthLoop));
      return map;
    }
  } catch {}
  return new Map();
}

function saveLoops(loops: Map<string, AutonomousGrowthLoop>) {
  if (typeof window === "undefined") return;
  try {
    const obj: Record<string, AutonomousGrowthLoop> = {};
    loops.forEach((v, k) => { obj[k] = v; });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {}
}

class AutonomousGrowthManager {
  private loops: Map<string, AutonomousGrowthLoop> = loadLoops();
  private activeTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * 새로운 자동 성장 루프를 생성합니다
   */
  async createLoop(goal: string, userId: string): Promise<AutonomousGrowthLoop> {
    const loopId = `loop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newLoop: AutonomousGrowthLoop = {
      id: loopId,
      goal,
      status: 'idle',
      currentCycle: 0,
      retryCount: 0,
      successMetrics: {
        totalReached: 0,
        dailyGoals: [],
        conversionRate: 0,
        engagementRate: 0,
        lastUpdated: new Date()
      },
      strategy: this.getDefaultStrategy(),
      createdAt: new Date(),
      updatedAt: new Date(),
      userId
    };

    this.loops.set(loopId, newLoop);
    saveLoops(this.loops);
    return newLoop;
  }

  /**
   * 자동 성장 루프를 시작합니다
   */
  async startLoop(loopId: string): Promise<boolean> {
    const loop = this.loops.get(loopId);
    if (!loop) {
      console.error(`Loop with id ${loopId} not found`);
      return false;
    }

    if (loop.status !== 'idle' && loop.status !== 'paused') {
      console.error(`Loop with id ${loopId} is already running or completed`);
      return false;
    }

    // 루프 상태 업데이트
    loop.status = 'running';
    loop.updatedAt = new Date();
    this.loops.set(loopId, loop);
    saveLoops(this.loops);

    // 루프 실행
    this.executeLoop(loopId);

    return true;
  }

  /**
   * 자동 성장 루프를 일시 중지합니다
   */
  async pauseLoop(loopId: string): Promise<boolean> {
    const loop = this.loops.get(loopId);
    if (!loop) {
      console.error(`Loop with id ${loopId} not found`);
      return false;
    }

    if (loop.status !== 'running') {
      console.error(`Loop with id ${loopId} is not running`);
      return false;
    }

    loop.status = 'paused';
    loop.updatedAt = new Date();
    this.loops.set(loopId, loop);
    saveLoops(this.loops);

    // 실행 중인 타이머 정리
    if (this.activeTimers.has(loopId)) {
      clearTimeout(this.activeTimers.get(loopId)!);
      this.activeTimers.delete(loopId);
    }

    return true;
  }

  /**
   * 자동 성장 루프를 중지합니다
   */
  async stopLoop(loopId: string): Promise<boolean> {
    const loop = this.loops.get(loopId);
    if (!loop) {
      console.error(`Loop with id ${loopId} not found`);
      return false;
    }

    loop.status = 'idle';
    loop.updatedAt = new Date();
    this.loops.set(loopId, loop);
    saveLoops(this.loops);

    // 실행 중인 타이머 정리
    if (this.activeTimers.has(loopId)) {
      clearTimeout(this.activeTimers.get(loopId)!);
      this.activeTimers.delete(loopId);
    }

    return true;
  }

  private getBackoffDelay(retryCount: number, isRateLimit: boolean): number {
    if (isRateLimit) {
      return RATE_LIMIT_RETRY_DELAY_MS;
    }
    return Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, retryCount), MAX_BACKOFF_DELAY_MS);
  }

  private isRateLimitError(error: unknown): boolean {
    if (error instanceof Error && 'status' in error) {
      return (error as any).status === 429;
    }
    return false;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 자동 성장 루프를 실행합니다
   */
  private async executeLoop(loopId: string) {
    const loop = this.loops.get(loopId);
    if (!loop || loop.status !== 'running') {
      return;
    }

    try {
      await this.executeCycle(loopId);

      loop.retryCount = 0;
      this.loops.set(loopId, loop);
      saveLoops(this.loops);

      const nextRunDelay = this.calculateNextRunDelay(loop.strategy.timingStrategy);
      const timer = setTimeout(() => {
        this.executeLoop(loopId);
      }, nextRunDelay);

      this.activeTimers.set(loopId, timer);
    } catch (error) {
      console.error(`Error executing loop ${loopId}:`, error);

      const isRateLimit = this.isRateLimitError(error);
      loop.lastError = error instanceof Error ? error.message : String(error);

      if (loop.retryCount < MAX_RETRY_COUNT) {
        loop.retryCount++;
        const delay = this.getBackoffDelay(loop.retryCount, isRateLimit);
        console.log(
          `Retrying loop ${loopId} in ${delay}ms (attempt ${loop.retryCount}/${MAX_RETRY_COUNT})`
        );
        loop.updatedAt = new Date();
        this.loops.set(loopId, loop);
        saveLoops(this.loops);

        const timer = setTimeout(() => {
          this.executeLoop(loopId);
        }, delay);
        this.activeTimers.set(loopId, timer);
      } else {
        console.error(`Loop ${loopId} failed after ${MAX_RETRY_COUNT} retries`);
        loop.status = 'failed';
        loop.updatedAt = new Date();
        this.loops.set(loopId, loop);
        saveLoops(this.loops);
      }
    }
  }

  /**
   * 루프의 단일 사이클을 실행합니다
   */
  private async executeCycle(loopId: string): Promise<void> {
    const loop = this.loops.get(loopId);
    if (!loop) {
      throw new Error(`Loop with id ${loopId} not found`);
    }

    // 1. 콘텐츠 생성
    const content = await this.generateContent(loop.strategy.contentStrategy, loop.goal, loop.userId);

    // 2. 발송 대상 결정
    const targets = await this.determineTargets(loop.strategy.targetingStrategy);

    // 3. 콘텐츠 발송
    const sentResult = await this.sendContent(content, targets, loop.strategy.timingStrategy);

    // 4. 사이클 분석
    const analysis = await this.analyzeCycle(content, sentResult);

    // 5. 전략 업데이트
    const updatedStrategy = await this.updateStrategy(loop.strategy, analysis);

    // 6. 메트릭 업데이트
    const updatedMetrics = await this.updateMetrics(loop.successMetrics, sentResult, analysis);

    // 7. 루프 상태 업데이트
    loop.currentCycle++;
    loop.strategy = updatedStrategy;
    loop.successMetrics = updatedMetrics;
    loop.updatedAt = new Date();

    // 목표 달성 여부 확인
    if (this.isGoalAchieved(loop)) {
      loop.status = 'completed';
    }

    this.loops.set(loopId, loop);
    saveLoops(this.loops);
  }

  /**
   * 콘텐츠를 생성합니다
   */
  private async generateContent(strategy: ContentStrategy, goal: string, accountId: string): Promise<string> {
    // AI를 사용하여 콘텐츠 생성
    const prompt = `
      사용자의 목표: "${goal}"
      콘텐츠 유형: ${strategy.contentType}
      톤: ${strategy.tone}
      
      위 조건에 맞는 콘텐츠를 생성해주세요. 이 콘텐츠는 Telegram 그룹에 발송될 예정입니다.
      콘텐츠는 간결하고 매력적이어야 하며, 사용자의 목표 달성을 돕는 내용이어야 합니다.
    `;

    try {
      // AI API를 사용하여 콘텐츠 생성
      const aiResponse = await requestAiReply({
        accountId,
        message: prompt,
        session_id: null,
        use_memory: true
      });

      return aiResponse.reply;
    } catch (error) {
      console.error('Failed to generate content:', error);
      // 실패 시 기본 콘텐츠 반환
      return `안녕하세요! ${goal}을(를) 위해 연락드렸습니다.`;
    }
  }

  /**
   * 발송 대상을 결정합니다
   */
  private async determineTargets(strategy: TargetingStrategy): Promise<string[]> {
    try {
      // 실제 계정 및 그룹 정보를 가져옴
      const accounts = await api.fetchAccounts();
      const activeAccount = accounts.find(acc => acc.status === 'active');
      
      if (!activeAccount) {
        throw new Error('활성 계정이 없습니다');
      }

      // 계정의 그룹 목록 가져오기
      const groups = await api.fetchGroups(activeAccount.id);
      
      // 전략에 따라 타겟팅
      let targetedGroups = groups;
      
      // 제외 그룹 필터링
      if (strategy.excludeGroups && strategy.excludeGroups.length > 0) {
        targetedGroups = targetedGroups.filter(group => 
          !strategy.excludeGroups.includes(group.id)
        );
      }
      
      // 포함 그룹 필터링
      if (strategy.groups && strategy.groups.length > 0) {
        targetedGroups = targetedGroups.filter(group => 
          strategy.groups.includes(group.id)
        );
      }

      // 최대 10개 그룹으로 제한 (API 제한 고려)
      return targetedGroups.slice(0, 10).map(group => group.id);
    } catch (error) {
      console.error('Failed to determine targets:', error);
      return [];
    }
  }

  /**
   * 콘텐츠를 발송합니다
   */
  private async sendContent(content: string, targets: string[], timing: TimingStrategy): Promise<any> {
    try {
      // 활성 계정 가져오기
      const accounts = await api.fetchAccounts();
      const activeAccount = accounts.find(acc => acc.status === 'active');
      
      if (!activeAccount) {
        throw new Error('활성 계정이 없습니다');
      }

      // 발송 요청
      const broadcast = await api.sendToGroup({
        accountId: activeAccount.id,
        message: content,
        groupIds: targets,
        delaySeconds: timing.delayBetweenSends
      });

      // 발송 결과 반환
      return {
        success: true,
        broadcastId: broadcast.id,
        sentCount: targets.length,
        content,
        targets
      };
    } catch (error) {
      console.error('Failed to send content:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        content,
        targets
      };
    }
  }

  /**
   * 사이클을 분석합니다
   */
  private async analyzeCycle(content: string, sentResult: any): Promise<CycleAnalysis> {
    // 간단한 분석 로직 (실제 구현에서는 더 복잡한 분석이 필요)
    const analysis: CycleAnalysis = {
      performance: sentResult.success ? 'good' : 'poor',
      improvementSuggestions: [],
      nextSteps: []
    };

    if (!sentResult.success) {
      analysis.failureReasons = [sentResult.error];
      analysis.improvementSuggestions.push('콘텐츠를 변경해보세요');
      analysis.nextSteps.push('콘텐츠 전략을 조정합니다');
    } else {
      analysis.improvementSuggestions.push('성공적인 발송입니다. 계속 진행하세요');
      analysis.nextSteps.push('다음 사이클로 진행합니다');
    }

    return analysis;
  }

  /**
   * 전략을 업데이트합니다
   */
  private async updateStrategy(currentStrategy: Strategy, analysis: CycleAnalysis): Promise<Strategy> {
    // 분석 결과에 따라 전략 업데이트
    const updatedStrategy = { ...currentStrategy };

    // 실패한 경우 전략 조정
    if (analysis.failureReasons && analysis.failureReasons.length > 0) {
      // 콘텐츠 전략 조정
      if (updatedStrategy.contentStrategy.frequency > 1) {
        updatedStrategy.contentStrategy.frequency--;
      }

      // 타겟팅 전략 조정
      if (analysis.improvementSuggestions.some(suggestion => 
          suggestion.toLowerCase().includes('콘텐츠')
        )) {
        // 콘텐츠 유형 변경
        if (updatedStrategy.contentStrategy.contentType === 'text') {
          updatedStrategy.contentStrategy.contentType = 'mixed';
        }
      }
    }

    return updatedStrategy;
  }

  /**
   * 메트릭을 업데이트합니다
   */
  private async updateMetrics(currentMetrics: Metrics, sentResult: any, analysis: CycleAnalysis): Promise<Metrics> {
    const updatedMetrics = { ...currentMetrics };
    
    // 발송 성공 시 메트릭 업데이트
    if (sentResult.success) {
      updatedMetrics.totalReached += sentResult.sentCount;
      updatedMetrics.conversionRate = Math.min(100, updatedMetrics.conversionRate + 0.1);
      updatedMetrics.engagementRate = Math.min(100, updatedMetrics.engagementRate + 0.05);
    } else {
      updatedMetrics.conversionRate = Math.max(0, updatedMetrics.conversionRate - 0.05);
      updatedMetrics.engagementRate = Math.max(0, updatedMetrics.engagementRate - 0.02);
    }

    updatedMetrics.lastUpdated = new Date();
    
    // 일일 목표 업데이트
    const today = new Date().toISOString().split('T')[0];
    const todayGoalIndex = updatedMetrics.dailyGoals.findIndex(
      goal => goal.date.toISOString().split('T')[0] === today
    );
    
    if (todayGoalIndex >= 0) {
      updatedMetrics.dailyGoals[todayGoalIndex].achieved += sentResult.sentCount || 0;
    } else {
      updatedMetrics.dailyGoals.push({
        date: new Date(),
        target: 10, // 기본 일일 목표
        achieved: sentResult.sentCount || 0
      });
    }

    // 최대 30일치 데이터만 유지
    if (updatedMetrics.dailyGoals.length > 30) {
      updatedMetrics.dailyGoals = updatedMetrics.dailyGoals.slice(-30);
    }

    return updatedMetrics;
  }

  /**
   * 목표 달성 여부를 확인합니다
   */
  private isGoalAchieved(loop: AutonomousGrowthLoop): boolean {
    // 현재는 단순하게 totalReached가 1000 이상이면 달성으로 간주
    // 실제 구현에서는 goal 문자열을 파싱하여 실제 목표와 비교
    const goalMatch = loop.goal.match(/(\d+)/);
    if (goalMatch) {
      const targetNumber = parseInt(goalMatch[1], 10);
      return loop.successMetrics.totalReached >= targetNumber;
    }
    return false;
  }

  /**
   * 기본 전략을 반환합니다
   */
  private getDefaultStrategy(): Strategy {
    return {
      contentStrategy: {
        contentType: 'text',
        tone: 'promotional',
        frequency: 5, // 하루 5회 발송
        aiModel: 'gpt-4'
      },
      targetingStrategy: {
        audience: 'potential customers',
        groups: [],
        excludeGroups: [],
        targetingCriteria: {}
      },
      timingStrategy: {
        optimalTimes: ['09:00', '12:00', '15:00', '18:00'],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        delayBetweenSends: 30, // 발송 간 30초 지연
        pausePeriods: []
      },
      contentVariations: []
    };
  }

  /**
   * 다음 실행까지의 지연 시간을 계산합니다
   */
  private calculateNextRunDelay(timingStrategy: TimingStrategy): number {
    // 기본적으로 1시간 (3600000ms)으로 설정
    // 실제 구현에서는 timingStrategy에 따라 동적으로 계산
    return 3600000; // 1 hour in milliseconds
  }

  /**
   * 루프 목록을 가져옵니다
   */
  getLoops(): AutonomousGrowthLoop[] {
    return Array.from(this.loops.values());
  }

  /**
   * 특정 루프를 가져옵니다
   */
  getLoop(loopId: string): AutonomousGrowthLoop | undefined {
    return this.loops.get(loopId);
  }
}

// 싱글톤 인스턴스 생성
export const autonomousGrowthManager = new AutonomousGrowthManager();