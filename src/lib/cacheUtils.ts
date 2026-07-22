// 캐시 관련 유틸리티 함수들

// 캐시 키 생성
export const generateCacheKey = (namespace: string, key: string): string => {
  return `${namespace}:${key}`;
};

// 데이터 캐시
export const setCache = (key: string, data: any, ttl: number = 300000): void => { // 기본 5분 TTL
  try {
    const cacheEntry = {
      data,
      timestamp: Date.now(),
      ttl
    };
    localStorage.setItem(key, JSON.stringify(cacheEntry));
  } catch (e) {
    console.warn('Cache set failed:', e);
  }
};

// 캐시에서 데이터 가져오기
export const getCache = (key: string) => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const cacheEntry = JSON.parse(cached);
    const now = Date.now();

    // TTL 확인
    if (now - cacheEntry.timestamp > cacheEntry.ttl) {
      localStorage.removeItem(key);
      return null;
    }

    return cacheEntry.data;
  } catch (e) {
    console.warn('Cache get failed:', e);
    return null;
  }
};

// 캐시 삭제
export const removeCache = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn('Cache removal failed:', e);
  }
};

// 캐시 정리 (TTL이 지난 항목 제거)
export const cleanupCache = (): void => {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const cached = localStorage.getItem(key);
        if (cached) {
          try {
            const cacheEntry = JSON.parse(cached);
            const now = Date.now();
            if (now - cacheEntry.timestamp > cacheEntry.ttl) {
              keysToRemove.push(key);
            }
          } catch (e) {
            // 파싱 실패한 항목 제거
            keysToRemove.push(key);
          }
        }
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (e) {
    console.warn('Cache cleanup failed:', e);
  }
};

// 오프라인 데이터 저장
export const storeOfflineData = (key: string, data: any): void => {
  try {
    const offlineKey = `offline:${key}`;
    const timestampedData = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(offlineKey, JSON.stringify(timestampedData));
  } catch (e) {
    console.warn('Offline data storage failed:', e);
  }
};

// 오프라인 데이터 가져오기
export const getOfflineData = (key: string) => {
  try {
    const offlineKey = `offline:${key}`;
    const stored = localStorage.getItem(offlineKey);
    if (!stored) return null;

    const timestampedData = JSON.parse(stored);
    return timestampedData.data;
  } catch (e) {
    console.warn('Offline data retrieval failed:', e);
    return null;
  }
};

// 오프라인 데이터 삭제
export const removeOfflineData = (key: string): void => {
  try {
    const offlineKey = `offline:${key}`;
    localStorage.removeItem(offlineKey);
  } catch (e) {
    console.warn('Offline data removal failed:', e);
  }
};