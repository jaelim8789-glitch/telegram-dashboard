import { useState, useEffect, useRef, useCallback } from 'react';

interface WorkerTask {
  id: string;
  type: string;
  payload: any;
}

interface WorkerResult {
  id: string;
  type: 'SUCCESS' | 'ERROR';
  result?: any;
  error?: string;
}

/**
 * 웹 워커를 사용하여 CPU 집약적 작업을 백그라운드에서 처리하는 훅
 */
export function useWebWorker(workerPath: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const taskQueueRef = useRef<Map<string, (result: WorkerResult) => void>>(new Map());

  // 워커 초기화
  useEffect(() => {
    workerRef.current = new Worker(workerPath);
    
    // 메시지 수신 처리
    workerRef.current.onmessage = (e: MessageEvent<WorkerResult>) => {
      const { id, type, result, error } = e.data;
      
      const resolver = taskQueueRef.current.get(id);
      if (resolver) {
        if (type === 'SUCCESS') {
          resolver({ id, type, result });
        } else {
          resolver({ id, type: 'ERROR', error });
        }
        taskQueueRef.current.delete(id);
      }
      
      // 모든 작업이 완료되면 로딩 상태 종료
      if (taskQueueRef.current.size === 0) {
        setIsLoading(false);
        setError(null);
      }
    };
    
    workerRef.current.onerror = (e: ErrorEvent) => {
      setError(e.message);
      setIsLoading(false);
    };
    
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [workerPath]);

  // 작업 실행 함수
  const runTask = useCallback(<T,>(type: string, payload: any): Promise<T> => {
    if (!workerRef.current) {
      throw new Error('Worker is not initialized');
    }
    
    return new Promise<T>((resolve, reject) => {
      const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 작업 큐에 추가
      taskQueueRef.current.set(id, (result: WorkerResult) => {
        if (result.type === 'SUCCESS') {
          resolve(result.result as T);
        } else {
          reject(new Error(result.error || 'Unknown error'));
        }
      });
      
      // 작업 시작
      setIsLoading(true);
      workerRef.current!.postMessage({ id, type, payload });
    });
  }, []);

  // 다양한 데이터 처리 작업을 위한 헬퍼 함수들
  const sortData = useCallback((data: unknown[], sortBy: string, order: 'asc' | 'desc' = 'asc') => {
    return runTask('SORT_DATA', { data, sortBy, order });
  }, [runTask]);

  const filterData = useCallback((data: unknown[], filters: Record<string, unknown>) => {
    return runTask('FILTER_DATA', { data, filters });
  }, [runTask]);

  const groupData = useCallback((data: unknown[], groupBy: string) => {
    return runTask('GROUP_DATA', { data, groupBy });
  }, [runTask]);

  const aggregateData = useCallback((data: unknown[], aggregations: { field: string; operation: 'sum' | 'avg' | 'count' | 'min' | 'max' }[]) => {
    return runTask('AGGREGATE_DATA', { data, aggregations });
  }, [runTask]);

  const processLargeDataset = useCallback((
    data: unknown[],
    filters: Record<string, unknown>,
    sortBy: string,
    order: 'asc' | 'desc' = 'asc',
    aggregations: { field: string; operation: 'sum' | 'avg' | 'count' | 'min' | 'max' }[]
  ) => {
    return runTask('PROCESS_LARGE_DATASET', { data, filters, sortBy, order, aggregations });
  }, [runTask]);

  return {
    isLoading,
    error,
    sortData,
    filterData,
    groupData,
    aggregateData,
    processLargeDataset,
    runTask
  };
}

/**
 * 데이터 처리를 위한 전용 훅
 */
export function useDataProcessing() {
  const worker = useWebWorker('/workers/dataProcessor.worker.js');

  return worker;
}