// 웹 워커를 위한 타입 정의
interface WorkerMessage {
  type: 'START_COMPUTATION' | 'COMPUTATION_RESULT' | 'ERROR' | 'PROGRESS';
  payload: any;
  id?: string;
}

// 계산 작업 타입
type ComputationType = 
  | 'sort' 
  | 'filter' 
  | 'map' 
  | 'reduce' 
  | 'search' 
  | 'aggregate'
  | 'processLargeArray'
  | 'calculateStats';

// 계산 작업을 수행하는 함수들
const computeTasks = {
  sort: (data: any[], key?: string) => {
    if (key) {
      return [...data].sort((a, b) => {
        const valA = a[key];
        const valB = b[key];
        if (valA < valB) return -1;
        if (valA > valB) return 1;
        return 0;
      });
    }
    return [...data].sort();
  },

  filter: (data: any[], predicate: string) => {
    // predicate는 문자열 형태로 함수를 표현
    // 실제 구현에서는 더 안전한 방식으로 처리해야 함
    try {
      const func = new Function('item', `return ${predicate}`);
      return data.filter(item => func(item));
    } catch (e) {
      throw new Error('Invalid filter predicate');
    }
  },

  map: (data: any[], transform: string) => {
    try {
      const func = new Function('item', `return ${transform}`);
      return data.map(item => func(item));
    } catch (e) {
      throw new Error('Invalid map transform');
    }
  },

  reduce: (data: any[], reducer: string, initialValue?: any) => {
    try {
      const func = new Function('accumulator', 'currentValue', `return ${reducer}`);
      return data.reduce(func, initialValue);
    } catch (e) {
      throw new Error('Invalid reduce function');
    }
  },

  search: (data: any[], query: string, field?: string) => {
    const lowerQuery = query.toLowerCase();
    if (field) {
      return data.filter(item => 
        String(item[field]).toLowerCase().includes(lowerQuery)
      );
    }
    return data.filter(item => 
      Object.values(item).some(value => 
        String(value).toLowerCase().includes(lowerQuery)
      )
    );
  },

  aggregate: (data: any[], aggregations: { field: string; operation: string }[]) => {
    const result: any = {};
    
    aggregations.forEach(agg => {
      switch (agg.operation) {
        case 'sum':
          result[agg.field] = data.reduce((sum, item) => sum + Number(item[agg.field] || 0), 0);
          break;
        case 'avg':
          const values = data.map(item => Number(item[agg.field] || 0));
          result[agg.field] = values.reduce((sum, val) => sum + val, 0) / values.length;
          break;
        case 'count':
          result[agg.field] = data.length;
          break;
        case 'min':
          result[agg.field] = Math.min(...data.map(item => Number(item[agg.field] || Infinity)));
          break;
        case 'max':
          result[agg.field] = Math.max(...data.map(item => Number(item[agg.field] || -Infinity)));
          break;
        default:
          throw new Error(`Unknown aggregation operation: ${agg.operation}`);
      }
    });
    
    return result;
  },

  processLargeArray: (data: number[], operation: string) => {
    // 대규모 배열 처리
    switch (operation) {
      case 'square':
        return data.map(x => x * x);
      case 'double':
        return data.map(x => x * 2);
      case 'sqrt':
        return data.map(x => Math.sqrt(Math.abs(x)));
      default:
        return data;
    }
  },

  calculateStats: (data: number[]) => {
    const sorted = [...data].sort((a, b) => a - b);
    const n = sorted.length;
    
    return {
      count: n,
      min: sorted[0],
      max: sorted[n - 1],
      sum: data.reduce((sum, val) => sum + val, 0),
      mean: data.reduce((sum, val) => sum + val, 0) / n,
      median: n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)],
      variance: (() => {
        const mean = data.reduce((sum, val) => sum + val, 0) / n;
        return data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
      })(),
      stdDev: Math.sqrt(data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n)
    };
  }
};

// 워커 메시지 핸들러
self.onmessage = function(e: MessageEvent<WorkerMessage>) {
  const { type, payload, id } = e.data;

  if (type === 'START_COMPUTATION') {
    const { computationType, data, options } = payload;
    
    try {
      // 진행 상황을 주기적으로 보고
      if (computationType === 'processLargeArray' && data.length > 10000) {
        // 대규모 작업의 경우 진행 상황 보고
        const chunkSize = Math.floor(data.length / 10);
        for (let i = 0; i <= 10; i++) {
          const progress = (i / 10) * 100;
          (self as any).postMessage({
            type: 'PROGRESS',
            payload: { progress, id },
            id
          } as WorkerMessage);
          
          // 비동기적으로 잠시 대기하여 다른 작업이 실행될 수 있도록 함
          postMessage({
            type: 'PROGRESS',
            payload: { progress, id },
            id
          } as WorkerMessage);
        }
      }

      // 실제 계산 수행
      const result = computeTasks[computationType as ComputationType](data, options);
      
      (self as any).postMessage({
        type: 'COMPUTATION_RESULT',
        payload: result,
        id
      } as WorkerMessage);
    } catch (error) {
      (self as any).postMessage({
        type: 'ERROR',
        payload: (error as Error).message,
        id
      } as WorkerMessage);
    }
  }
};