// 배치 작업 최적화 기능
export interface BatchOperation<T> {
  id: string;
  data: T;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface BatchOperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  retries?: number;
}

export interface BatchProcessorOptions {
  concurrency?: number; // 동시 실행 수
  batchSize?: number; // 배치 크기
  retryAttempts?: number; // 재시도 횟수
  delayBetweenBatches?: number; // 배치 간 지연 시간
  timeout?: number; // 작업 타임아웃
}

class BatchOperationsProcessor {
  private operations: Map<string, BatchOperation<any>> = new Map();
  private queue: string[] = [];
  private processing: boolean = false;
  private options: BatchProcessorOptions;

  constructor(options: BatchProcessorOptions = {}) {
    this.options = {
      concurrency: 3,
      batchSize: 10,
      retryAttempts: 3,
      delayBetweenBatches: 100,
      timeout: 30000,
      ...options
    };
  }

  // 배치 작업 추가
  addOperation<T>(operation: Omit<BatchOperation<T>, 'status' | 'progress'>): string {
    const id = operation.id || `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const batchOp: BatchOperation<T> = {
      ...operation,
      id,
      status: 'pending'
    };

    this.operations.set(id, batchOp);
    this.queue.push(id);

    return id;
  }

  // 배치 작업 실행
  async executeOperation<T>(
    id: string,
    processor: (data: T) => Promise<BatchOperationResult<T>>
  ): Promise<BatchOperationResult<T>> {
    const operation = this.operations.get(id);
    if (!operation) {
      return { success: false, error: 'Operation not found' };
    }

    operation.status = 'processing';
    operation.startedAt = new Date();

    let result: BatchOperationResult<T> | null = null;
    let attempts = 0;
    let lastError: string | undefined;

    while (attempts < this.options.retryAttempts!) {
      try {
        // 타임아웃 처리
        const timeoutPromise = new Promise<BatchOperationResult<T>>((_, reject) => {
          setTimeout(() => reject(new Error('Operation timeout')), this.options.timeout);
        });

        const processPromise = processor(operation.data);
        
        result = await Promise.race([processPromise, timeoutPromise as Promise<BatchOperationResult<T>>]);
        
        if (result.success) {
          operation.status = 'completed';
          operation.completedAt = new Date();
          operation.progress = 100;
          this.operations.set(id, operation);
          return result;
        } else {
          throw new Error(result.error || 'Unknown error');
        }
      } catch (error) {
        attempts++;
        lastError = error instanceof Error ? error.message : String(error);
        
        if (attempts >= this.options.retryAttempts!) {
          operation.status = 'failed';
          operation.error = lastError;
          operation.completedAt = new Date();
          this.operations.set(id, operation);
          return { success: false, error: lastError, retries: attempts };
        }

        // 재시도 전 지연
        await this.delay(Math.pow(2, attempts) * 1000); // 지수 백오프
      }
    }

    return { success: false, error: lastError, retries: attempts };
  }

  // 배치 실행
  async executeBatch<T>(
    processor: (data: T) => Promise<BatchOperationResult<T>>
  ): Promise<Map<string, BatchOperationResult<T>>> {
    if (this.processing) {
      throw new Error('Batch is already processing');
    }

    this.processing = true;
    const results = new Map<string, BatchOperationResult<T>>();

    try {
      // 동시성 제어를 위한 큐 처리
      const concurrency = this.options.concurrency!;
      const batches = this.chunkArray(this.queue, this.options.batchSize!);

      for (const batch of batches) {
        const batchPromises = batch.map(id => 
          this.executeOperation(id, processor).then(result => ({ id, result }))
        );

        const batchResults = await Promise.all(batchPromises);
        
        for (const { id, result } of batchResults) {
          results.set(id, result);
        }

        // 배치 간 지연
        if (this.options.delayBetweenBatches! > 0) {
          await this.delay(this.options.delayBetweenBatches!);
        }
      }
    } finally {
      this.processing = false;
    }

    return results;
  }

  // 배열 분할
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // 지연 함수
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 작업 취소
  cancelOperation(id: string): boolean {
    const operation = this.operations.get(id);
    if (operation && (operation.status === 'pending' || operation.status === 'processing')) {
      operation.status = 'cancelled';
      operation.completedAt = new Date();
      this.operations.set(id, operation);
      
      // 큐에서 제거
      const index = this.queue.indexOf(id);
      if (index > -1) {
        this.queue.splice(index, 1);
      }
      
      return true;
    }
    return false;
  }

  // 모든 작업 취소
  cancelAll(): void {
    for (const id of this.queue) {
      this.cancelOperation(id);
    }
  }

  // 작업 진행률 업데이트
  updateProgress(id: string, progress: number): void {
    const operation = this.operations.get(id);
    if (operation) {
      operation.progress = progress;
      this.operations.set(id, operation);
    }
  }

  // 작업 상태 가져오기
  getOperation(id: string): BatchOperation<any> | undefined {
    return this.operations.get(id);
  }

  // 모든 작업 상태 가져오기
  getAllOperations(): BatchOperation<any>[] {
    return Array.from(this.operations.values());
  }

  // 완료된 작업 수
  getCompletedCount(): number {
    return Array.from(this.operations.values()).filter(op => op.status === 'completed').length;
  }

  // 실패한 작업 수
  getFailedCount(): number {
    return Array.from(this.operations.values()).filter(op => op.status === 'failed').length;
  }

  // 진행 중인 작업 수
  getProcessingCount(): number {
    return Array.from(this.operations.values()).filter(op => op.status === 'processing').length;
  }

  // 대기 중인 작업 수
  getPendingCount(): number {
    return Array.from(this.operations.values()).filter(op => op.status === 'pending').length;
  }

  // 진행률 계산
  getOverallProgress(): number {
    const operations = this.getAllOperations();
    if (operations.length === 0) return 0;

    const totalProgress = operations.reduce((sum, op) => {
      if (op.status === 'completed') return sum + 100;
      if (op.status === 'failed' || op.status === 'cancelled') return sum + 100;
      return sum + (op.progress || 0);
    }, 0);

    return totalProgress / operations.length;
  }

  // 배치 통계
  getStats(): {
    total: number;
    completed: number;
    failed: number;
    processing: number;
    pending: number;
    progress: number;
    averageDuration: number;
  } {
    const operations = this.getAllOperations();
    const completedOps = operations.filter(op => op.status === 'completed');
    const totalDuration = completedOps.reduce((sum, op) => {
      if (op.startedAt && op.completedAt) {
        return sum + (op.completedAt.getTime() - op.startedAt.getTime());
      }
      return sum;
    }, 0);

    return {
      total: operations.length,
      completed: this.getCompletedCount(),
      failed: this.getFailedCount(),
      processing: this.getProcessingCount(),
      pending: this.getPendingCount(),
      progress: this.getOverallProgress(),
      averageDuration: completedOps.length > 0 ? totalDuration / completedOps.length : 0
    };
  }

  // 작업 정리
  clearCompleted(): void {
    const completedIds = Array.from(this.operations.entries())
      .filter(([_, op]) => op.status === 'completed')
      .map(([id, _]) => id);

    for (const id of completedIds) {
      this.operations.delete(id);
      const index = this.queue.indexOf(id);
      if (index > -1) {
        this.queue.splice(index, 1);
      }
    }
  }

  // 메모리 정리
  destroy(): void {
    this.operations.clear();
    this.queue = [];
    this.processing = false;
  }
}

// 전역 배치 작업 프로세서 인스턴스
export const batchOperationsProcessor = new BatchOperationsProcessor();

// React 훅 형태
export function useBatchOperations<T>(
  processor: (data: T) => Promise<BatchOperationResult<T>>,
  options: BatchProcessorOptions = {}
) {
  const [processorInstance] = useState(() => new BatchOperationsProcessor(options));
  const [stats, setStats] = useState(processorInstance.getStats());
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(processorInstance.getStats());
    }, 1000);

    return () => clearInterval(interval);
  }, [processorInstance]);

  const addOperation = useCallback((data: T) => {
    return processorInstance.addOperation({ data });
  }, [processorInstance]);

  const executeBatch = useCallback(async () => {
    setIsProcessing(true);
    try {
      const results = await processorInstance.executeBatch(processor);
      return results;
    } finally {
      setIsProcessing(false);
    }
  }, [processorInstance, processor]);

  const cancelOperation = useCallback((id: string) => {
    return processorInstance.cancelOperation(id);
  }, [processorInstance]);

  return {
    addOperation,
    executeBatch,
    cancelOperation,
    stats,
    isProcessing,
    operations: processorInstance.getAllOperations(),
    clearCompleted: processorInstance.clearCompleted.bind(processorInstance)
  };
}

// 배치 작업 유틸리티 함수들
export const batchUtils = {
  // 계정 등록 배치
  async batchRegisterAccounts(accounts: Array<{ name: string; phone: string; telegramSession: string }>) {
    const processor = async (account: { name: string; phone: string; telegramSession: string }) => {
      try {
        // 실제 API 호출 로직
        // const result = await api.createAccount(account);
        // 임시 결과
        await new Promise(resolve => setTimeout(resolve, 1000)); // 시뮬레이션
        return { success: true, data: { id: `acc-${Date.now()}`, ...account } };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    };

    const batchProcessor = new BatchOperationsProcessor({ concurrency: 2, batchSize: 5 });
    
    for (const account of accounts) {
      batchProcessor.addOperation({ data: account });
    }

    return batchProcessor.executeBatch(processor);
  },

  // 그룹 메시지 발송 배치
  async batchSendMessage(groups: Array<{ id: string; title: string }>, message: string) {
    const processor = async (group: { id: string; title: string }) => {
      try {
        // 실제 메시지 발송 로직
        // const result = await api.sendMessageToGroup(group.id, message);
        // 임시 결과
        await new Promise(resolve => setTimeout(resolve, 500)); // 시뮬레이션
        return { success: true, data: { groupId: group.id, message } };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    };

    const batchProcessor = new BatchOperationsProcessor({ concurrency: 3, batchSize: 10 });
    
    for (const group of groups) {
      batchProcessor.addOperation({ data: group });
    }

    return batchProcessor.executeBatch(processor);
  },

  // 자동 응답 설정 배치
  async batchSetAutoReply(rules: Array<{ accountId: string; keyword: string; response: string }>) {
    const processor = async (rule: { accountId: string; keyword: string; response: string }) => {
      try {
        // 실제 자동 응답 설정 로직
        // const result = await api.setAutoReply(rule.accountId, rule.keyword, rule.response);
        // 임시 결과
        await new Promise(resolve => setTimeout(resolve, 800)); // 시뮬레이션
        return { success: true, data: rule };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    };

    const batchProcessor = new BatchOperationsProcessor({ concurrency: 2, batchSize: 8 });
    
    for (const rule of rules) {
      batchProcessor.addOperation({ data: rule });
    }

    return batchProcessor.executeBatch(processor);
  }
};