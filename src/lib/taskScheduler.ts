// 자동화된 작업 스케줄러 기능
export interface Task {
  id: string;
  name: string;
  description?: string;
  action: () => Promise<any> | any;
  schedule: {
    type: 'once' | 'interval' | 'cron' | 'daily' | 'weekly';
    time?: Date; // 'once' 타입에 사용
    interval?: number; // 밀리초 단위, 'interval' 타입에 사용
    cronExpression?: string; // 'cron' 타입에 사용
    dailyTime?: string; // 'HH:MM' 형식, 'daily' 타입에 사용
    weeklySchedule?: { day: number; time: string }; // 'weekly' 타입에 사용 (0: 일요일, 6: 토요일)
  };
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  maxRetries: number;
  currentRetries: number;
  created: Date;
  updated: Date;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  result?: any;
  error?: string;
  startedAt: Date;
  completedAt: Date;
}

export interface TaskSchedulerOptions {
  persistence?: boolean; // 작업 상태를 로컬 스토리지에 저장할지 여부
  maxConcurrentTasks?: number; // 최대 동시 실행 작업 수
  defaultMaxRetries?: number; // 기본 최대 재시도 횟수
}

class TaskScheduler {
  private tasks: Map<string, Task> = new Map();
  private runningTasks: Set<string> = new Set();
  private timers: Map<string, NodeJS.Timeout | null> = new Map();
  private options: TaskSchedulerOptions;
  private listeners: Array<(task: Task, result?: TaskResult) => void> = [];

  constructor(options: TaskSchedulerOptions = {}) {
    this.options = {
      persistence: true,
      maxConcurrentTasks: 3,
      defaultMaxRetries: 3,
      ...options
    };

    // 브라우저 환경에서 로컬 스토리지에서 작업 복원
    if (typeof window !== 'undefined' && this.options.persistence) {
      this.restoreFromStorage();
    }

    // 주기적으로 다음 실행 시간 갱신
    this.startScheduler();
  }

  // 이벤트 리스너 등록
  subscribe(listener: (task: Task, result?: TaskResult) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // 이벤트 알림
  private notifyListeners(task: Task, result?: TaskResult): void {
    this.listeners.forEach(listener => listener(task, result));
  }

  // 작업 추가
  addTask(task: Omit<Task, 'id' | 'created' | 'updated' | 'currentRetries'>): string {
    const id = task.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newTask: Task = {
      ...task,
      id,
      created: new Date(),
      updated: new Date(),
      currentRetries: 0
    };

    this.tasks.set(id, newTask);
    
    if (newTask.enabled) {
      this.scheduleTask(newTask);
    }

    if (this.options.persistence) {
      this.saveToStorage();
    }

    return id;
  }

  // 작업 업데이트
  updateTask(id: string, updates: Partial<Task>): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;

    // 이전 스케줄 타이머 제거
    this.clearTaskTimer(id);

    const updatedTask = {
      ...task,
      ...updates,
      updated: new Date()
    } as Task;

    this.tasks.set(id, updatedTask);

    // 새 스케줄에 따라 타이머 설정
    if (updatedTask.enabled) {
      this.scheduleTask(updatedTask);
    } else {
      this.clearTaskTimer(id);
    }

    if (this.options.persistence) {
      this.saveToStorage();
    }

    return true;
  }

  // 작업 삭제
  removeTask(id: string): boolean {
    const removed = this.tasks.delete(id);
    this.clearTaskTimer(id);
    
    if (this.options.persistence) {
      this.saveToStorage();
    }

    return removed;
  }

  // 작업 활성화/비활성화
  toggleTask(id: string, enabled: boolean): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;

    this.clearTaskTimer(id);
    
    task.enabled = enabled;
    task.updated = new Date();

    if (enabled) {
      this.scheduleTask(task);
    }

    if (this.options.persistence) {
      this.saveToStorage();
    }

    return true;
  }

  // 작업 실행
  async runTask(id: string): Promise<TaskResult> {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task with id ${id} not found`);
    }

    if (this.runningTasks.has(id)) {
      throw new Error(`Task with id ${id} is already running`);
    }

    if (this.runningTasks.size >= this.options.maxConcurrentTasks!) {
      throw new Error(`Maximum concurrent tasks limit (${this.options.maxConcurrentTasks}) reached`);
    }

    this.runningTasks.add(id);
    
    const startedAt = new Date();
    let result: TaskResult;

    try {
      const taskResult = await Promise.resolve(task.action());
      
      task.lastRun = new Date();
      task.currentRetries = 0; // 성공 시 재시도 횟수 초기화
      
      result = {
        taskId: id,
        success: true,
        result: taskResult,
        startedAt,
        completedAt: new Date()
      };

      // 다음 실행 시간 계산
      task.nextRun = this.calculateNextRun(task);

      this.notifyListeners(task, result);
      
      return result;
    } catch (error) {
      task.currentRetries++;
      
      if (task.currentRetries < task.maxRetries) {
        // 재시도 예약
        const retryDelay = Math.pow(2, task.currentRetries) * 1000; // 지수 백오프
        setTimeout(() => {
          this.runTask(id).catch(console.error);
        }, retryDelay);
      }

      result = {
        taskId: id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        startedAt,
        completedAt: new Date()
      };

      this.notifyListeners(task, result);
      
      throw error;
    } finally {
      this.runningTasks.delete(id);
      if (this.options.persistence) {
        this.saveToStorage();
      }
    }
  }

  // 작업 스케줄링
  private scheduleTask(task: Task): void {
    this.clearTaskTimer(task.id);

    if (!task.enabled) return;

    const now = new Date();
    let delay: number;

    switch (task.schedule.type) {
      case 'once':
        if (!task.schedule.time) {
          console.error(`Task ${task.id} scheduled as 'once' but no time specified`);
          return;
        }
        delay = task.schedule.time.getTime() - now.getTime();
        if (delay <= 0) {
          // 이미 지난 시간이면 실행
          setTimeout(() => this.runTask(task.id).catch(console.error), 0);
          return;
        }
        break;

      case 'interval':
        if (!task.schedule.interval) {
          console.error(`Task ${task.id} scheduled as 'interval' but no interval specified`);
          return;
        }
        delay = task.schedule.interval;
        break;

      case 'daily':
        if (!task.schedule.dailyTime) {
          console.error(`Task ${task.id} scheduled as 'daily' but no time specified`);
          return;
        }
        delay = this.calculateDailyDelay(task.schedule.dailyTime);
        break;

      case 'weekly':
        if (!task.schedule.weeklySchedule) {
          console.error(`Task ${task.id} scheduled as 'weekly' but no schedule specified`);
          return;
        }
        delay = this.calculateWeeklyDelay(task.schedule.weeklySchedule);
        break;

      default:
        console.error(`Unsupported schedule type: ${task.schedule.type}`);
        return;
    }

    const timer = setTimeout(() => {
      this.runTask(task.id)
        .catch(error => console.error(`Error running task ${task.id}:`, error))
        .finally(() => {
          // 반복 작업이면 다시 스케줄
          if (task.schedule.type !== 'once') {
            this.scheduleTask(task);
          }
        });
    }, delay);

    this.timers.set(task.id, timer);
    task.nextRun = new Date(now.getTime() + delay);
  }

  // 작업 타이머 제거
  private clearTaskTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  // 일일 지연 계산 (HH:MM 형식)
  private calculateDailyDelay(dailyTime: string): number {
    const [hours, minutes] = dailyTime.split(':').map(Number);
    const now = new Date();
    const nextRun = new Date();
    
    nextRun.setHours(hours, minutes, 0, 0);
    
    // 이미 오늘의 해당 시간이 지났다면 내일로 설정
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    return nextRun.getTime() - now.getTime();
  }

  // 주간 지연 계산
  private calculateWeeklyDelay(schedule: { day: number; time: string }): number {
    const [hours, minutes] = schedule.time.split(':').map(Number);
    const now = new Date();
    const nextRun = new Date();
    
    nextRun.setHours(hours, minutes, 0, 0);
    nextRun.setDate(now.getDate() + ((7 - now.getDay() + schedule.day) % 7));
    
    // 같은 요일인데 이미 시간이 지났다면 다음 주로 설정
    if (nextRun <= now && nextRun.getDay() === schedule.day) {
      nextRun.setDate(nextRun.getDate() + 7);
    }

    return nextRun.getTime() - now.getTime();
  }

  // 다음 실행 시간 계산
  private calculateNextRun(task: Task): Date | undefined {
    const now = new Date();
    
    switch (task.schedule.type) {
      case 'once':
        return task.schedule.time && task.schedule.time > now ? task.schedule.time : undefined;
      
      case 'interval':
        return task.schedule.interval ? new Date(now.getTime() + task.schedule.interval) : undefined;
      
      case 'daily':
        return task.schedule.dailyTime ? new Date(now.getTime() + this.calculateDailyDelay(task.schedule.dailyTime)) : undefined;
      
      case 'weekly':
        return task.schedule.weeklySchedule ? new Date(now.getTime() + this.calculateWeeklyDelay(task.schedule.weeklySchedule)) : undefined;
      
      default:
        return undefined;
    }
  }

  // 모든 작업 가져오기
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  // 실행 중인 작업 가져오기
  getRunningTasks(): string[] {
    return Array.from(this.runningTasks);
  }

  // 특정 작업 가져오기
  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  // 스케줄러 시작
  private startScheduler(): void {
    // 주기적으로 다음 실행 시간 갱신
    setInterval(() => {
      this.updateNextRunTimes();
    }, 60000); // 1분마다 갱신
  }

  // 다음 실행 시간 갱신
  private updateNextRunTimes(): void {
    const now = new Date();
    
    for (const task of this.tasks.values()) {
      if (task.enabled && task.schedule.type !== 'once') {
        task.nextRun = this.calculateNextRun(task);
      }
    }
  }

  // 로컬 스토리지에서 복원
  private restoreFromStorage(): void {
    try {
      const stored = localStorage.getItem('telemon-task-scheduler');
      if (stored) {
        const storedData = JSON.parse(stored);
        
        for (const taskData of storedData.tasks) {
          // 함수는 복원할 수 없으므로 기본 함수로 대체
          const task: Task = {
            ...taskData,
            action: () => console.log(`Restored task: ${taskData.id}`),
            created: new Date(taskData.created),
            updated: new Date(taskData.updated),
            lastRun: taskData.lastRun ? new Date(taskData.lastRun) : undefined,
            nextRun: taskData.nextRun ? new Date(taskData.nextRun) : undefined
          };
          
          this.tasks.set(task.id, task);
          
          if (task.enabled) {
            this.scheduleTask(task);
          }
        }
      }
    } catch (error) {
      console.error('Failed to restore task scheduler from storage:', error);
    }
  }

  // 로컬 스토리지에 저장
  private saveToStorage(): void {
    try {
      // action 함수는 직렬화할 수 없으므로 제외
      const serializableTasks = Array.from(this.tasks.entries()).map(([id, task]) => {
        const { action, ...serializable } = task;
        return serializable;
      });
      
      localStorage.setItem('telemon-task-scheduler', JSON.stringify({
        tasks: serializableTasks
      }));
    } catch (error) {
      console.error('Failed to save task scheduler to storage:', error);
    }
  }

  // 작업 결과 가져오기 (가상)
  getTaskHistory(taskId: string, limit: number = 10): TaskResult[] {
    // 실제 구현에서는 데이터베이스나 로컬 스토리지에서 결과를 가져와야 함
    // 현재는 더미 데이터 반환
    return [];
  }

  // 모든 작업 실행
  runAllEnabledTasks(): Promise<TaskResult[]> {
    const enabledTasks = Array.from(this.tasks.values()).filter(task => task.enabled);
    return Promise.all(
      enabledTasks.map(task => this.runTask(task.id).catch(error => ({
        taskId: task.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        startedAt: new Date(),
        completedAt: new Date()
      })))
    );
  }

  // 스케줄러 정지
  stop(): void {
    for (const timer of this.timers.values()) {
      if (timer) {
        clearTimeout(timer);
      }
    }
    this.timers.clear();
    this.runningTasks.clear();
  }

  // 스케줄러 재시작
  restart(): void {
    this.stop();
    for (const task of this.tasks.values()) {
      if (task.enabled) {
        this.scheduleTask(task);
      }
    }
  }

  // 메모리 정리
  destroy(): void {
    this.stop();
    this.listeners = [];
    this.tasks.clear();
    
    if (this.options.persistence) {
      localStorage.removeItem('telemon-task-scheduler');
    }
  }
}

// 전역 작업 스케줄러 인스턴스
export const taskScheduler = new TaskScheduler();

// React 훅 형태
export function useTaskScheduler() {
  const [tasks, setTasks] = useState<Task[]>(taskScheduler.getAllTasks());
  const [runningTasks, setRunningTasks] = useState<string[]>(taskScheduler.getRunningTasks());

  useEffect(() => {
    const updateTasks = () => {
      setTasks(taskScheduler.getAllTasks());
      setRunningTasks(taskScheduler.getRunningTasks());
    };

    // 이벤트 리스너 등록
    const unsubscribe = taskScheduler.subscribe(updateTasks);
    
    // 주기적으로 업데이트
    const interval = setInterval(updateTasks, 5000);

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  return {
    tasks,
    runningTasks,
    addTask: taskScheduler.addTask.bind(taskScheduler),
    updateTask: taskScheduler.updateTask.bind(taskScheduler),
    removeTask: taskScheduler.removeTask.bind(taskScheduler),
    toggleTask: taskScheduler.toggleTask.bind(taskScheduler),
    runTask: taskScheduler.runTask.bind(taskScheduler),
    runAllEnabledTasks: taskScheduler.runAllEnabledTasks.bind(taskScheduler),
    getTask: taskScheduler.getTask.bind(taskScheduler),
    stop: taskScheduler.stop.bind(taskScheduler),
    restart: taskScheduler.restart.bind(taskScheduler)
  };
}

// 작업 빌더
export class TaskBuilder {
  private task: Partial<Task> = {
    enabled: true,
    maxRetries: 3,
    currentRetries: 0
  };

  name(name: string) {
    this.task.name = name;
    return this;
  }

  description(description: string) {
    this.task.description = description;
    return this;
  }

  action(action: () => Promise<any> | any) {
    this.task.action = action;
    return this;
  }

  once(time: Date) {
    this.task.schedule = {
      type: 'once',
      time
    };
    return this;
  }

  interval(milliseconds: number) {
    this.task.schedule = {
      type: 'interval',
      interval: milliseconds
    };
    return this;
  }

  daily(time: string) {
    this.task.schedule = {
      type: 'daily',
      dailyTime: time
    };
    return this;
  }

  weekly(day: number, time: string) {
    this.task.schedule = {
      type: 'weekly',
      weeklySchedule: { day, time }
    };
    return this;
  }

  maxRetries(count: number) {
    this.task.maxRetries = count;
    return this;
  }

  disabled() {
    this.task.enabled = false;
    return this;
  }

  build(): Omit<Task, 'id' | 'created' | 'updated' | 'currentRetries'> {
    if (!this.task.name || !this.task.action || !this.task.schedule) {
      throw new Error('Task must have name, action, and schedule');
    }

    return this.task as Omit<Task, 'id' | 'created' | 'updated' | 'currentRetries'>;
  }
}

// 사용 예시:
// const task = new TaskBuilder()
//   .name('Daily backup')
//   .description('Backup all data daily at 2 AM')
//   .action(() => performBackup())
//   .daily('02:00')
//   .maxRetries(3)
//   .build();

// 자주 사용하는 작업 타입
export const CommonTasks = {
  // 계정 상태 확인 작업
  createAccountHealthCheck: (accountId: string) => {
    return new TaskBuilder()
      .name(`Account health check: ${accountId}`)
      .description(`Check health of account ${accountId}`)
      .action(async () => {
        // 실제 계정 상태 확인 로직
        console.log(`Checking health of account: ${accountId}`);
        // const result = await api.checkAccountStatus(accountId);
        return { accountId, status: 'healthy' };
      })
      .interval(30 * 60 * 1000) // 30분마다
      .build();
  },

  // 메시지 발송 작업
  createScheduledMessageSender: (groupId: string, message: string, sendTime: Date) => {
    return new TaskBuilder()
      .name(`Scheduled message to group: ${groupId}`)
      .description(`Send message to group ${groupId} at ${sendTime}`)
      .action(async () => {
        // 실제 메시지 발송 로직
        console.log(`Sending scheduled message to group: ${groupId}`);
        // const result = await api.sendMessage(groupId, message);
        return { groupId, message, sentAt: new Date() };
      })
      .once(sendTime)
      .build();
  },

  // 자동 응답 규칙 갱신 작업
  createAutoReplyUpdate: (accountId: string) => {
    return new TaskBuilder()
      .name(`Update auto-reply rules: ${accountId}`)
      .description(`Update auto-reply rules for account ${accountId}`)
      .action(async () => {
        // 실제 자동 응답 규칙 갱신 로직
        console.log(`Updating auto-reply rules for account: ${accountId}`);
        // const result = await api.updateAutoReplyRules(accountId);
        return { accountId, updated: new Date() };
      })
      .daily('03:00') // 매일 새벽 3시
      .build();
  }
};