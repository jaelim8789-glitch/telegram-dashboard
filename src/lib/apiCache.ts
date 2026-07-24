/**
 * API 요청을 위한 캐싱 유틸리티
 * 중복 요청 방지 및 네트워크 오버헤드 감소
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  expiry: number;
}

class ApiCache {
  private cache: Map<string, CacheEntry>;
  private pendingRequests: Map<string, Promise<unknown>>;

  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
  }

  /**
   * 캐시에서 데이터를 가져옵니다.
   * 만료되었거나 없는 경우 undefined를 반환합니다.
   */
  get(key: string): any | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    // 만료되었는지 확인
    if (Date.now() > entry.timestamp + entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.data;
  }

  /**
   * 캐시에 데이터를 저장합니다.
   */
  set(key: string, data: any, ttl: number = 5 * 60 * 1000): void { // 기본 5분 TTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: ttl
    });
  }

  /**
   * 캐시에서 항목을 삭제합니다.
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 캐시에서 항목을 모두 삭제합니다.
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * 동일한 요청이 여러 번 발생하지 않도록 방지합니다.
   */
  async getOrRequest<T>(
    key: string, 
    requestFn: () => Promise<T>, 
    ttl: number = 5 * 60 * 1000
  ): Promise<T> {
    // 먼저 캐시에서 확인
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    // 이미 요청 중인 경우 해당 프로미스를 반환
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    // 새로운 요청 시작
    const requestPromise = requestFn()
      .then(result => {
        // 요청 성공 시 캐시에 저장
        this.set(key, result, ttl);
        this.pendingRequests.delete(key);
        return result;
      })
      .catch(error => {
        // 요청 실패 시 요청 큐에서 제거
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, requestPromise);

    return requestPromise;
  }

  /**
   * 캐시된 항목의 수를 반환합니다.
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 만료된 항목들을 정리합니다.
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// 싱글톤 인스턴스 생성
export const apiCache = new ApiCache();

/**
 * 캐시된 API 요청을 수행하는 훅
 */
export const useCachedApi = <T>(
  key: string, 
  requestFn: () => Promise<T>, 
  ttl: number = 5 * 60 * 1000
): Promise<T> => {
  return apiCache.getOrRequest(key, requestFn, ttl);
};

/**
 * 캐시 무효화 함수
 */
export const invalidateCache = (key?: string): void => {
  if (key) {
    apiCache.delete(key);
  } else {
    apiCache.clear();
  }
};