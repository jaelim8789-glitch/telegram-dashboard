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
import { requestAiReply } from '@/lib/api'; // AI 콘텐??성???한 API
import * as api from '@/lib/api'; // 발송???한 API

const STORAGE_KEY = "autonomous_growth_loops";

const MAX_RETRY_COUNT = 3;
const BASE_RETRY_DELAY_MS = 5_000;
const MAX_BACKOFF_DELAY_MS = 5 * 60_000;
const RATE_LIMIT_RETRY_DELAY_MS = 60_000;

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
  } catch (e) { console.warn('Unhandled error in autonomous-growth-manager', e) }
  return new Map();
}

function saveLoops(loops: Map<string, AutonomousGrowthLoop>) {
  if (typeof window === "undefined") return;
  try {
    const obj: Record<string, AutonomousGrowthLoop> = {};
    loops.forEach((v, k) => { obj[k] = v; });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch (e) { console.warn('Unhandled error in autonomous-growth-manager', e) }
}

class AutonomousGrowthManager {
  private loops: Map<string, AutonomousGrowthLoop> = loadLoops();
  private activeTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * ?로???동 ?장 루프??성?니??
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
   * ?동 ?장 루프??작?니??
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

    // 루프 ?태 ?데?트
    loop.status = 'running';
    loop.updatedAt = new Date();
    this.loops.set(loopId, loop);
    saveLoops(this.loops);

    // 루프 ?행
    this.executeLoop(loopId);

    return true;
  }

  /**
   * ?동 ?장 루프??시 중??니??
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

    // ?행 중인 ??머 ?리
    if (this.activeTimers.has(loopId)) {
      clearTimeout(this.activeTimers.get(loopId)!);
      this.activeTimers.delete(loopId);
    }

    return true;
  }

  /**
   * ?동 ?장 루프?중??니??
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

    // ?행 중인 ??머 ?리
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
   * ?동 ?장 루프??행?니??
   */
  private async executeLoop(loopId: string) {
    const loop = this.loops.get(loopId);
    if (!loop || loop.status !== 'running') {
      return;
    }

    // 최? ?행 ?간 체크 추?
    const startTime = Date.now();
    const MAX_EXECUTION_TIME = 30 * 60 * 1000; // 30?

    try {
      // 최? ?행 ?간 초과 ??루프 종료
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        console.warn(`Loop ${loopId} exceeded maximum execution time, stopping.`);
        await this.stopLoop(loopId);
        return;
      }

      await this.executeCycle(loopId);

      loop.retryCount = 0;
      this.loops.set(loopId, loop);
      saveLoops(this.loops);

      const nextRunDelay = this.calculateNextRunDelay(loop.strategy.timingStrategy);
      
      // ?무 짧? 지???간??방??여 ?스??과???방?
      const safeDelay = Math.max(nextRunDelay, 30000); // 최소 30?지??
      
      const timer = setTimeout(() => {
        this.executeLoop(loopId);
      }, safeDelay);

      this.activeTimers.set(loopId, timer);
    } catch (error) {
      console.error(`Error executing loop ${loopId}:`, error);

      const isRateLimit = this.isRateLimitError(error);
      loop.lastError = error instanceof Error ? error.message : String(error);

      // 최? ?시???수 초과 ???패 처리
      if (loop.retryCount >= MAX_RETRY_COUNT) {
        console.error(`Loop ${loopId} failed after ${MAX_RETRY_COUNT} retries`);
        loop.status = 'failed';
        loop.updatedAt = new Date();
        this.loops.set(loopId, loop);
        saveLoops(this.loops);
        return; // ???상 ?시?하지 ?음
      }

      // ?시??로직
      loop.retryCount++;
      const delay = this.getBackoffDelay(loop.retryCount, isRateLimit);
      
      // ?무 ????간??방?
      const cappedDelay = Math.min(delay, 30 * 60 * 1000); // 최? 30?
      
      console.debug(
        `Retrying loop ${loopId} in ${cappedDelay}ms (attempt ${loop.retryCount}/${MAX_RETRY_COUNT})`
      );
      loop.updatedAt = new Date();
      this.loops.set(loopId, loop);
      saveLoops(this.loops);

      const timer = setTimeout(() => {
        this.executeLoop(loopId);
      }, cappedDelay);
      this.activeTimers.set(loopId, timer);
    }
  }

  /**
   * 루프???일 ?이?을 ?행?니??
   */
  private async executeCycle(loopId: string): Promise<void> {
    const loop = this.loops.get(loopId);
    if (!loop) {
      throw new Error(`Loop with id ${loopId} not found`);
    }

    // 1. 콘텐??성
    const content = await this.generateContent(loop.strategy.contentStrategy, loop.goal, loop.userId);

    // 2. 발송 ???결정
    const targets = await this.determineTargets(loop.strategy.targetingStrategy);

    // 3. 콘텐?발송
    const sentResult = await this.sendContent(content, targets, loop.strategy.timingStrategy);

    // 4. ?이??분석
    const analysis = await this.analyzeCycle(content, sentResult);

    // 5. ?략 ?데?트
    const updatedStrategy = await this.updateStrategy(loop.strategy, analysis);

    // 6. 메트??데?트
    const updatedMetrics = await this.updateMetrics(loop.successMetrics, sentResult, analysis);

    // 7. 루프 ?태 ?데?트
    loop.currentCycle++;
    loop.strategy = updatedStrategy;
    loop.successMetrics = updatedMetrics;
    loop.updatedAt = new Date();

    // 목표 ?성 ?? ?인
    if (this.isGoalAchieved(loop)) {
      loop.status = 'completed';
    }

    this.loops.set(loopId, loop);
    saveLoops(this.loops);
  }

  /**
   * 콘텐츠? ?성?니??
   */
  private async generateContent(strategy: ContentStrategy, goal: string, accountId: string): Promise<string> {
    // AI??용?여 콘텐??성
    const prompt = `
      ?용?의 목표: "${goal}"
      콘텐??형: ${strategy.contentType}
      ?? ${strategy.tone}
      
      ??조건??맞는 콘텐츠? ?성?주?요. ??콘텐츠는 Telegram 그룹??발송???정?니??
      콘텐츠는 간결?고 매력?이?야 ?며, ?용?의 목표 ?성???는 ?용?어???니??
    `;

    try {
      // AI API??용?여 콘텐??성
      const aiResponse = await requestAiReply({
        accountId,
        message: prompt,
        session_id: null,
        use_memory: true
      });

      return aiResponse.reply;
    } catch (error) {
      console.error('Failed to generate content:', error);
      // ?패 ??기본 콘텐?반환
      return `?녕?세?? ${goal}??? ?해 ?락?렸?니??`;
    }
  }

  /**
   * 발송 ??을 결정?니??
   */
  private async determineTargets(strategy: TargetingStrategy): Promise<string[]> {
    try {
      // ?제 계정 ?그룹 ?보?가?옴
      const accounts = await api.fetchAccounts();
      const activeAccount = accounts.find(acc => acc.status === 'active');
      
      if (!activeAccount) {
        throw new Error('?성 계정???습?다');
      }

      // 계정??그룹 목록 가?오?
      const groups = await api.fetchGroups(activeAccount.id);
      
      // ?략???라 ?겟팅
      let targetedGroups = groups;
      
      // ?외 그룹 ?터?
      if (strategy.excludeGroups && strategy.excludeGroups.length > 0) {
        targetedGroups = targetedGroups.filter(group => 
          !strategy.excludeGroups.includes(group.id)
        );
      }
      
      // ?함 그룹 ?터?
      if (strategy.groups && strategy.groups.length > 0) {
        targetedGroups = targetedGroups.filter(group => 
          strategy.groups.includes(group.id)
        );
      }

      // 최? 10?그룹?로 ?한 (API ?한 고려)
      return targetedGroups.slice(0, 10).map(group => group.id);
    } catch (error) {
      console.error('Failed to determine targets:', error);
      return [];
    }
  }

  /**
   * 콘텐츠? 발송?니??
   */
  private async sendContent(content: string, targets: string[], timing: TimingStrategy): Promise<unknown> {
    try {
      // ?성 계정 가?오?
      const accounts = await api.fetchAccounts();
      const activeAccount = accounts.find(acc => acc.status === 'active');
      
      if (!activeAccount) {
        throw new Error('?성 계정???습?다');
      }

      // 발송 ?청
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
   * ?이?을 분석?니??
   */
  private async analyzeCycle(content: string, sentResult: any): Promise<CycleAnalysis> {
    // 간단??분석 로직 (?제 구현?서????복잡??분석???요)
    const analysis: CycleAnalysis = {
      performance: sentResult.success ? 'good' : 'poor',
      improvementSuggestions: [],
      nextSteps: []
    };

    if (!sentResult.success) {
      analysis.failureReasons = [sentResult.error];
      analysis.improvementSuggestions.push('콘텐츠? 변경해보세??);
      analysis.nextSteps.push('콘텐??략??조정?니??);
    } else {
      analysis.improvementSuggestions.push('?공?인 발송?니?? 계속 진행?세??);
      analysis.nextSteps.push('?음 ?이?로 진행?니??);
    }

    return analysis;
  }

  /**
   * ?략???데?트?니??
   */
  private async updateStrategy(currentStrategy: Strategy, analysis: CycleAnalysis): Promise<Strategy> {
    // 분석 결과???라 ?략 ?데?트
    const updatedStrategy = { ...currentStrategy };

    // ?패??경우 ?략 조정
    if (analysis.failureReasons && analysis.failureReasons.length > 0) {
      // 콘텐??략 조정
      if (updatedStrategy.contentStrategy.frequency > 1) {
        updatedStrategy.contentStrategy.frequency--;
      }

      // ?겟팅 ?략 조정
      if (analysis.improvementSuggestions.some(suggestion => 
          suggestion.toLowerCase().includes('콘텐?)
        )) {
        // 콘텐??형 변?
        if (updatedStrategy.contentStrategy.contentType === 'text') {
          updatedStrategy.contentStrategy.contentType = 'mixed';
        }
      }
    }

    return updatedStrategy;
  }

  /**
   * 메트? ?데?트?니??
   */
  private async updateMetrics(currentMetrics: Metrics, sentResult: any, analysis: CycleAnalysis): Promise<Metrics> {
    const updatedMetrics = { ...currentMetrics };
    
    // 발송 ?공 ??메트??데?트
    if (sentResult.success) {
      updatedMetrics.totalReached += sentResult.sentCount;
      updatedMetrics.conversionRate = Math.min(100, updatedMetrics.conversionRate + 0.1);
      updatedMetrics.engagementRate = Math.min(100, updatedMetrics.engagementRate + 0.05);
    } else {
      updatedMetrics.conversionRate = Math.max(0, updatedMetrics.conversionRate - 0.05);
      updatedMetrics.engagementRate = Math.max(0, updatedMetrics.engagementRate - 0.02);
    }

    updatedMetrics.lastUpdated = new Date();
    
    // ?일 목표 ?데?트
    const today = new Date().toISOString().split('T')[0];
    const todayGoalIndex = updatedMetrics.dailyGoals.findIndex(
      goal => goal.date.toISOString().split('T')[0] === today
    );
    
    if (todayGoalIndex >= 0) {
      updatedMetrics.dailyGoals[todayGoalIndex].achieved += sentResult.sentCount || 0;
    } else {
      updatedMetrics.dailyGoals.push({
        date: new Date(),
        target: 10, // 기본 ?일 목표
        achieved: sentResult.sentCount || 0
      });
    }

    // 최? 30?치 ?이?만 ??
    if (updatedMetrics.dailyGoals.length > 30) {
      updatedMetrics.dailyGoals = updatedMetrics.dailyGoals.slice(-30);
    }

    return updatedMetrics;
  }

  /**
   * 목표 ?성 ????인?니??
   */
  private isGoalAchieved(loop: AutonomousGrowthLoop): boolean {
    // ?재???순?게 totalReached가 1000 ?상?면 ?성?로 간주
    // ?제 구현?서??goal 문자?을 ?싱?여 ?제 목표? 비교
    const goalMatch = loop.goal.match(/(\d+)/);
    if (goalMatch) {
      const targetNumber = parseInt(goalMatch[1], 10);
      return loop.successMetrics.totalReached >= targetNumber;
    }
    return false;
  }

  /**
   * 기본 ?략??반환?니??
   */
  private getDefaultStrategy(): Strategy {
    return {
      contentStrategy: {
        contentType: 'text',
        tone: 'promotional',
        frequency: 5, // ?루 5??발송
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
        delayBetweenSends: 30, // 발송 ?30?지??
        pausePeriods: []
      },
      contentVariations: []
    };
  }

  /**
   * ?음 ?행까???지???간??계산?니??
   */
  private calculateNextRunDelay(timingStrategy: TimingStrategy): number {
    // 기본?으?1?간 (3600000ms)?로 ?정
    // ?제 구현?서??timingStrategy???라 ?적?로 계산
    return 3600000; // 1 hour in milliseconds
  }

  /**
   * 루프 목록??가?옵?다
   */
  getLoops(): AutonomousGrowthLoop[] {
    return Array.from(this.loops.values());
  }

  /**
   * ?정 루프?가?옵?다
   */
  getLoop(loopId: string): AutonomousGrowthLoop | undefined {
    return this.loops.get(loopId);
  }
}

// ?????스?스 ?성
export const autonomousGrowthManager = new AutonomousGrowthManager();