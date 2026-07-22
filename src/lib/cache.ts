// 캐시 최적화 유틸리티
export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of items
  staleWhileRevalidate?: boolean; // Allow serving stale data while revalidating
}

export interface CacheItem<T> {
  value: T;
  timestamp: number;
  ttl: number;
  stale?: boolean;
}

export class LocalCache<T = any> {
  private cache: Map<string, CacheItem<T>> = new Map();
  private options: CacheOptions;

  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: 5 * 60 * 1000, // 5 minutes default
      maxSize: 100, // 100 items default
      ...options
    };
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    const now = Date.now();
    const isExpired = now - item.timestamp > item.ttl;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    // 스테일 상태 표시
    if (this.options.staleWhileRevalidate && 
        now - item.timestamp > item.ttl * 0.8) { // 80% 지점부터 스테일
      item.stale = true;
    }

    return item.value;
  }

  set(key: string, value: T, ttl?: number): void {
    const actualTtl = ttl ?? this.options.ttl!;
    
    // 최대 크기 제한 초과 시 오래된 항목 제거
    if (this.options.maxSize && this.cache.size >= this.options.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: actualTtl
    });
  }

  has(key: string): boolean {
    const item = this.get(key);
    return item !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  size(): number {
    return this.cache.size;
  }

  // 캐시 정리: 만료된 항목 제거
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // 캐시 통계
  stats(): { hits: number; misses: number; size: number; expired: number } {
    let hits = 0;
    let misses = 0;
    let expired = 0;

    for (const [key, item] of this.cache.entries()) {
      const now = Date.now();
      if (now - item.timestamp > item.ttl) {
        expired++;
      }
    }

    return {
      hits,
      misses,
      size: this.cache.size,
      expired
    };
  }
}

// IndexedDB 기반의 영구 캐시
export class IndexedDBCache<T = any> {
  private dbName: string;
  private storeName: string;
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(dbName: string = 'TeleMonCache', storeName: string = 'cache') {
    this.dbName = dbName;
    this.storeName = storeName;
  }

  private async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' });
        }
      };
    });

    return this.dbPromise;
  }

  async get(key: string): Promise<T | null> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const result = await store.get(key);

      if (!result) {
        return null;
      }

      // TTL 확인
      if (result.expires && Date.now() > result.expires) {
        await this.delete(key);
        return null;
      }

      return result.value;
    } catch (error) {
      console.warn('IndexedDB cache get failed:', error);
      return null;
    }
  }

  async set(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const expires = ttl ? Date.now() + ttl : null;
      
      await store.put({
        key,
        value,
        expires
      });
    } catch (error) {
      console.warn('IndexedDB cache set failed:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      await store.delete(key);
    } catch (error) {
      console.warn('IndexedDB cache delete failed:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      await store.clear();
    } catch (error) {
      console.warn('IndexedDB cache clear failed:', error);
    }
  }

  async keys(): Promise<string[]> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const keys = await store.getAllKeys();
      return keys.map(k => k.toString());
    } catch (error) {
      console.warn('IndexedDB cache keys failed:', error);
      return [];
    }
  }
}

// 캐시 훅
export function useCache<T>(key: string, options?: CacheOptions) {
  const memoryCache = new LocalCache<T>(options);
  const persistentCache = new IndexedDBCache<T>();

  const get = async (): Promise<{ value: T | null; from: 'memory' | 'persistent' | 'miss' }> => {
    // 먼저 메모리 캐시 확인
    const memoryValue = memoryCache.get(key);
    if (memoryValue !== null) {
      return { value: memoryValue, from: 'memory' };
    }

    // 메모리에 없으면 IndexedDB 확인
    const persistentValue = await persistentCache.get(key);
    if (persistentValue !== null) {
      // 메모리 캐시에도 저장 (히트율 향상)
      memoryCache.set(key, persistentValue);
      return { value: persistentValue, from: 'persistent' };
    }

    return { value: null, from: 'miss' };
  };

  const set = async (value: T, ttl?: number): Promise<void> => {
    // 메모리 및 영구 캐시 모두 저장
    memoryCache.set(key, value, ttl);
    await persistentCache.set(key, value, ttl);
  };

  const remove = async (): Promise<void> => {
    memoryCache.delete(key);
    await persistentCache.delete(key);
  };

  return { get, set, remove };
}

// 전역 캐시 인스턴스
export const globalCache = new LocalCache();

// API 응답 캐시 래퍼
export async function cachedApiCall<T>(
  key: string,
  apiFn: () => Promise<T>,
  options?: CacheOptions
): Promise<T> {
  const cache = new LocalCache<T>(options);
  
  // 캐시 확인
  const cached = cache.get(key);
  if (cached !== null) {
    return cached;
  }

  // API 호출
  const result = await apiFn();
  
  // 캐시 저장
  cache.set(key, result);
  
  return result;
}

// 캐시 관리자
export class CacheManager {
  private caches: Map<string, LocalCache> = new Map();

  getCache<T>(name: string, options?: CacheOptions): LocalCache<T> {
    if (!this.caches.has(name)) {
      this.caches.set(name, new LocalCache<T>(options));
    }
    return this.caches.get(name)! as LocalCache<T>;
  }

  clearCache(name: string): void {
    if (this.caches.has(name)) {
      this.caches.get(name)!.clear();
    }
  }

  clearAll(): void {
    this.caches.clear();
  }

  // 모든 캐시 정리
  cleanup(): void {
    for (const cache of this.caches.values()) {
      cache.cleanup();
    }
  }
}

export const cacheManager = new CacheManager();