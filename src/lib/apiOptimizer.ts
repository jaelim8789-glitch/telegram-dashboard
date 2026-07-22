// API 호출 최적화 유틸리티
import { cachedApiCall, useCache, CacheOptions } from './cache';

export interface ApiRequestOptions {
  cache?: boolean;
  cacheTtl?: number;
  retry?: number;
  timeout?: number;
  deduplicate?: boolean; // 중복 요청 방지
}

export interface ApiResponse<T> {
  data: T;
  cached?: boolean;
  from?: 'cache' | 'network';
  timestamp: number;
}

class ApiOptimizer {
  private requestQueue: Map<string, Promise<any>> = new Map();
  private cacheOptions: CacheOptions;

  constructor(cacheOptions?: CacheOptions) {
    this.cacheOptions = {
      ttl: 5 * 60 * 1000, // 5분 기본 TTL
      maxSize: 50,
      ...cacheOptions
    };
  }

  // 중복 요청 방지
  private getDeduplicatedPromise<T>(
    key: string,
    promiseFactory: () => Promise<T>
  ): Promise<T> {
    if (this.requestQueue.has(key)) {
      return this.requestQueue.get(key)!;
    }

    const promise = promiseFactory().finally(() => {
      this.requestQueue.delete(key);
    });

    this.requestQueue.set(key, promise);
    return promise;
  }

  // 요청 지연
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 요청 병합
  async batchRequests<T>(
    requests: Array<() => Promise<T>>,
    concurrency: number = 3
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(req => req().catch(err => ({ error: err })))
      );
      results.push(...batchResults as T[]);
    }

    return results;
  }

  // API 요청 최적화
  async optimizedRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      cache = true,
      cacheTtl = this.cacheOptions.ttl,
      retry = 3,
      timeout = 10000,
      deduplicate = true
    } = options;

    const cacheKey = `api_${key}`;

    // 캐시 우선 검색
    if (cache) {
      const cacheResult = await cachedApiCall(cacheKey, async () => {
        let attempts = 0;
        let lastError: any;

        while (attempts < retry) {
          try {
            // 요청 병합 또는 중복 방지
            const promise = deduplicate 
              ? this.getDeduplicatedPromise(cacheKey, requestFn)
              : requestFn();

            // 타임아웃 처리
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error('Request timeout')), timeout);
            });

            const result = await Promise.race([promise, timeoutPromise]);
            return result;
          } catch (error) {
            attempts++;
            lastError = error;
            
            // 재시도 지수 백오프
            if (attempts < retry) {
              await this.delay(Math.pow(2, attempts) * 1000);
            }
          }
        }

        throw lastError;
      }, { ttl: cacheTtl });

      return {
        data: cacheResult,
        cached: false, // 캐시에서 가져온 것이 아니라 계산된 결과
        from: 'network',
        timestamp: Date.now()
      };
    }

    // 캐시를 사용하지 않는 경우
    let attempts = 0;
    let lastError: any;

    while (attempts < retry) {
      try {
        const promise = deduplicate 
          ? this.getDeduplicatedPromise(key, requestFn)
          : requestFn();

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), timeout);
        });

        const result = await Promise.race([promise, timeoutPromise]);
        
        return {
          data: result,
          from: 'network',
          timestamp: Date.now()
        };
      } catch (error) {
        attempts++;
        lastError = error;
        
        if (attempts < retry) {
          await this.delay(Math.pow(2, attempts) * 1000);
        }
      }
    }

    throw lastError;
  }

  // 요청 큐 관리
  getRequestQueueSize(): number {
    return this.requestQueue.size;
  }

  clearRequestQueue(): void {
    this.requestQueue.clear();
  }

  // 벌크 요청 처리
  async bulkRequest<T>(
    requests: Array<{ key: string; fn: () => Promise<T>; options?: ApiRequestOptions }>,
    options: {
      concurrency?: number;
      deduplicate?: boolean;
      timeout?: number;
    } = {}
  ): Promise<Array<ApiResponse<T>>> {
    const { 
      concurrency = 5, 
      deduplicate = true, 
      timeout = 30000 
    } = options;

    const results: Array<ApiResponse<T>> = [];

    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      
      const batchResults = await Promise.all(
        batch.map(async ({ key, fn, options: reqOptions }) => {
          try {
            return await this.optimizedRequest(
              key, 
              fn, 
              { 
                ...reqOptions, 
                deduplicate,
                timeout: reqOptions?.timeout || timeout 
              }
            );
          } catch (error) {
            return {
              data: null as any,
              error: error,
              from: 'network',
              timestamp: Date.now()
            };
          }
        })
      );

      results.push(...batchResults);
    }

    return results;
  }

  // 실시간 요청 모니터링
  monitorRequests(): {
    queueSize: number;
    activeRequests: string[];
    stats: {
      total: number;
      success: number;
      failed: number;
      avgResponseTime: number;
    };
  } {
    return {
      queueSize: this.getRequestQueueSize(),
      activeRequests: Array.from(this.requestQueue.keys()),
      stats: {
        total: 0, // 실제 통계는 외부에서 수집 필요
        success: 0,
        failed: 0,
        avgResponseTime: 0
      }
    };
  }
}

// 전역 API 최적화 인스턴스
export const apiOptimizer = new ApiOptimizer();

// 훅 형태의 API 최적화
export function useOptimizedApi<T>(
  key: string,
  requestFn: () => Promise<T>,
  options: ApiRequestOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [cached, setCached] = useState(false);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCached(false);

    try {
      const result = await apiOptimizer.optimizedRequest(key, requestFn, options);
      setData(result.data);
      
      if (result.cached) {
        setCached(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [key, requestFn, options]);

  return {
    data,
    loading,
    error,
    cached,
    refetch: execute
  };
}

// 요청 제한 유틸리티
export class RateLimiter {
  private tokens: Map<string, number> = new Map();
  private lastRefill: Map<string, number> = new Map();
  
  constructor(
    private readonly capacity: number = 10,
    private readonly refillRate: number = 1 // per second
  ) {}

  async acquire(key: string): Promise<boolean> {
    const now = Date.now();
    const last = this.lastRefill.get(key) || 0;
    const timePassed = (now - last) / 1000; // seconds
    
    let tokens = this.tokens.get(key) || 0;
    
    // 토큰 리필
    tokens = Math.min(this.capacity, tokens + timePassed * this.refillRate);
    
    if (tokens >= 1) {
      tokens -= 1;
      this.tokens.set(key, tokens);
      this.lastRefill.set(key, now);
      return true;
    }
    
    // 대기 시간 계산
    const waitTime = (1 - tokens) / this.refillRate * 1000;
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    return this.acquire(key); // 재시도
  }

  reset(key: string): void {
    this.tokens.delete(key);
    this.lastRefill.delete(key);
  }
}

export const rateLimiter = new RateLimiter(10, 1); // 10 requests per second