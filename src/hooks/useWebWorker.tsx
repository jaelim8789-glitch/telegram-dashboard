import { useState, useEffect, useRef, useCallback } from 'react';

type WorkerResponse =
  | { id: string; type: 'COMPUTATION_RESULT'; payload: unknown }
  | { id: string; type: 'PROGRESS'; payload: number }
  | { id: string; type: 'ERROR'; payload: string };

interface WorkerRequest {
  computationType: 'sort' | 'filter' | 'map' | 'reduce' | 'search' | 'aggregate' | 'processLargeArray' | 'calculateStats';
  data: any[];
  options?: any;
}

export function useWebWorker() {
  const [worker, setWorker] = useState<Worker | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const messageIdRef = useRef(0);

  // 워커 초기화
  useEffect(() => {
    // 워커 생성
    const workerInstance = new Worker(new URL('../workers/heavyComputation.worker.ts', import.meta.url));
    workerRef.current = workerInstance;
    setWorker(workerInstance);

    // 메시지 핸들러
    const handleMessage = (e: MessageEvent) => {
      const msg = e.data as WorkerResponse;

      switch (msg.type) {
        case 'COMPUTATION_RESULT':
          setResult(msg.payload);
          setIsWorking(false);
          setProgress(0);
          break;
        case 'PROGRESS':
          setProgress(msg.payload);
          break;
        case 'ERROR':
          setError(msg.payload);
          setIsWorking(false);
          setProgress(0);
          break;
      }
    };

    workerInstance.addEventListener('message', handleMessage);

    return () => {
      workerInstance.removeEventListener('message', handleMessage);
      workerInstance.terminate();
    };
  }, []);

  // 워커에 작업 전송
  const executeComputation = useCallback((request: WorkerRequest): Promise<any> => {
    if (!workerRef.current) {
      throw new Error('Worker is not initialized');
    }

    return new Promise((resolve, reject) => {
      const id = `task_${++messageIdRef.current}_${Date.now()}`;
      
      // 메시지 핸들러 등록
      const handleMessage = (e: MessageEvent) => {
        const msg = e.data as WorkerResponse;

        if (msg.id === id) {
          switch (msg.type) {
            case 'COMPUTATION_RESULT':
              workerRef.current?.removeEventListener('message', handleMessage);
              resolve(msg.payload);
              break;
            case 'ERROR':
              workerRef.current?.removeEventListener('message', handleMessage);
              reject(new Error(msg.payload));
              break;
          }
        }
      };

      workerRef.current.addEventListener('message', handleMessage);

      // 작업 시작
      setIsWorking(true);
      setError(null);
      setProgress(0);

      workerRef.current.postMessage({
        type: 'START_COMPUTATION',
        payload: {
          computationType: request.computationType,
          data: request.data,
          options: request.options
        },
        id
      });
    });
  }, []);

  // 여러 작업을 순차적으로 실행
  const executeMultipleComputations = useCallback(async (requests: WorkerRequest[]): Promise<any[]> => {
    const results: unknown[] = [];
    
    for (const request of requests) {
      try {
        const result = await executeComputation(request);
        results.push(result);
      } catch (err) {
        results.push(null); // 오류 발생 시 null 추가
      }
    }
    
    return results;
  }, [executeComputation]);

  // 워커 재시작
  const restartWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
    }

    const newWorker = new Worker(new URL('../workers/heavyComputation.worker.ts', import.meta.url));
    workerRef.current = newWorker;
    setWorker(newWorker);

    const handleMessage = (e: MessageEvent) => {
      const msg = e.data as WorkerResponse;

      switch (msg.type) {
        case 'COMPUTATION_RESULT':
          setResult(msg.payload);
          setIsWorking(false);
          setProgress(0);
          break;
        case 'PROGRESS':
          setProgress(msg.payload);
          break;
        case 'ERROR':
          setError(msg.payload);
          setIsWorking(false);
          setProgress(0);
          break;
      }
    };

    newWorker.addEventListener('message', handleMessage);
  }, []);

  return {
    executeComputation,
    executeMultipleComputations,
    isWorking,
    progress,
    result,
    error,
    restartWorker
  };
}

// 웹 워커를 사용하는 커스텀 훅들
export function useSortWorker() {
  const { executeComputation, isWorking, progress, result, error } = useWebWorker();

  const sort = useCallback(async (data: any[], key?: string) => {
    return executeComputation({
      computationType: 'sort',
      data,
      options: { key }
    });
  }, [executeComputation]);

  return { sort, isWorking, progress, result, error };
}

export function useFilterWorker() {
  const { executeComputation, isWorking, progress, result, error } = useWebWorker();

  const filter = useCallback(async (data: any[], predicate: string) => {
    return executeComputation({
      computationType: 'filter',
      data,
      options: { predicate }
    });
  }, [executeComputation]);

  return { filter, isWorking, progress, result, error };
}

export function useMapWorker() {
  const { executeComputation, isWorking, progress, result, error } = useWebWorker();

  const map = useCallback(async (data: any[], transform: string) => {
    return executeComputation({
      computationType: 'map',
      data,
      options: { transform }
    });
  }, [executeComputation]);

  return { map, isWorking, progress, result, error };
}

export function useSearchWorker() {
  const { executeComputation, isWorking, progress, result, error } = useWebWorker();

  const search = useCallback(async (data: any[], query: string, field?: string) => {
    return executeComputation({
      computationType: 'search',
      data,
      options: { query, field }
    });
  }, [executeComputation]);

  return { search, isWorking, progress, result, error };
}

export function useCalculateStatsWorker() {
  const { executeComputation, isWorking, progress, result, error } = useWebWorker();

  const calculateStats = useCallback(async (data: number[]) => {
    return executeComputation({
      computationType: 'calculateStats',
      data
    });
  }, [executeComputation]);

  return { calculateStats, isWorking, progress, result, error };
}

// 웹 워커를 사용하는 고차 컴포넌트
export function withWebWorker<P extends object>(WrappedComponent: React.ComponentType<P>) {
  return function WithWebWorker(props: P) {
    const workerHook = useWebWorker();
    
    return <WrappedComponent {...props} worker={workerHook} />;
  };
}

// 웹 워커 상태 관리 컨텍스트
import { createContext, useContext } from 'react';

interface WebWorkerContextType {
  executeComputation: (request: WorkerRequest) => Promise<any>;
  isWorking: boolean;
  progress: number;
  result: any;
  error: string | null;
  restartWorker: () => void;
}

const WebWorkerContext = createContext<WebWorkerContextType | undefined>(undefined);

export function WebWorkerProvider({ children }: { children: React.ReactNode }) {
  const workerHook = useWebWorker();

  return (
    <WebWorkerContext.Provider value={workerHook}>
      {children}
    </WebWorkerContext.Provider>
  );
}

export function useWebWorkerContext() {
  const context = useContext(WebWorkerContext);
  if (!context) {
    throw new Error('useWebWorkerContext must be used within a WebWorkerProvider');
  }
  return context;
}

// 웹 워커 풀 (여러 워커 인스턴스 관리)
export class WebWorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: number[] = [];
  private tasks: Array<{ request: WorkerRequest; resolve: (value: any) => void; reject: (reason: any) => void }> = [];
  private maxWorkers: number;

  constructor(maxWorkers: number = 4) {
    this.maxWorkers = maxWorkers;
    this.initializeWorkers();
  }

  private initializeWorkers() {
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker(new URL('../workers/heavyComputation.worker.ts', import.meta.url));
      this.workers.push(worker);
      this.availableWorkers.push(i);

      worker.addEventListener('message', (e) => {
        const msg = e.data as WorkerResponse;
        const task = this.tasks.find(t => t.request.data.toString() === msg.id);

        if (task) {
          if (msg.type === 'COMPUTATION_RESULT') {
            task.resolve(msg.payload);
          } else if (msg.type === 'ERROR') {
            task.reject(new Error(msg.payload));
          }
          this.tasks = this.tasks.filter(t => t !== task);
          this.availableWorkers.push(this.workers.indexOf(worker));
          this.processNextTask();
        }
      });
    }
  }

  private processNextTask() {
    if (this.availableWorkers.length > 0 && this.tasks.length > 0) {
      const workerIndex = this.availableWorkers.pop()!;
      const task = this.tasks.shift()!;
      
      this.workers[workerIndex].postMessage({
        type: 'START_COMPUTATION',
        payload: {
          computationType: task.request.computationType,
          data: task.request.data,
          options: task.request.options
        },
        id: task.request.data.toString()
      });
    }
  }

  public execute(request: WorkerRequest): Promise<any> {
    return new Promise((resolve, reject) => {
      this.tasks.push({ request, resolve, reject });
      this.processNextTask();
    });
  }

  public destroy() {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.availableWorkers = [];
    this.tasks = [];
  }
}