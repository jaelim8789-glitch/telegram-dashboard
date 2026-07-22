// 데이터 구조 최적화 클래스
class DataStructureOptimizer {
  private static instance: DataStructureOptimizer;
  private indexes: Map<string, Map<any, number[]>> = new Map(); // 검색 인덱스
  private caches: Map<string, Map<any, any>> = new Map(); // 데이터 캐시
  private optimizedArrays: Map<string, OptimizedArray<any>> = new Map(); // 최적화된 배열

  public static getInstance(): DataStructureOptimizer {
    if (!DataStructureOptimizer.instance) {
      DataStructureOptimizer.instance = new DataStructureOptimizer();
    }
    return DataStructureOptimizer.instance;
  }

  // 검색 인덱스 생성
  public createSearchIndex<T>(key: string, data: T[], fields: (keyof T)[]): void {
    const index = new Map<any, number[]>();
    
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      
      for (const field of fields) {
        const value = item[field];
        if (!index.has(value)) {
          index.set(value, []);
        }
        index.get(value)!.push(i);
      }
    }
    
    this.indexes.set(key, index);
  }

  // 인덱스 기반 검색
  public searchByIndex<T>(key: string, field: string, value: any): number[] {
    const index = this.indexes.get(key);
    if (!index) {
      return [];
    }
    
    const positions = index.get(value);
    return positions || [];
  }

  // 데이터 캐시
  public setCache<T>(key: string, dataKey: any, value: T): void {
    if (!this.caches.has(key)) {
      this.caches.set(key, new Map());
    }
    
    this.caches.get(key)!.set(dataKey, value);
  }

  public getCache<T>(key: string, dataKey: any): T | undefined {
    const cache = this.caches.get(key);
    if (!cache) {
      return undefined;
    }
    
    return cache.get(dataKey) as T;
  }

  // 최적화된 배열 생성
  public createOptimizedArray<T>(key: string, data: T[], compareFn?: (a: T, b: T) => number): OptimizedArray<T> {
    const optimizedArray = new OptimizedArray<T>(data, compareFn);
    this.optimizedArrays.set(key, optimizedArray);
    return optimizedArray;
  }

  public getOptimizedArray<T>(key: string): OptimizedArray<T> | undefined {
    return this.optimizedArrays.get(key) as OptimizedArray<T>;
  }

  // 이진 검색을 사용한 정렬된 배열 검색
  public binarySearch<T>(arr: T[], target: T, compareFn?: (a: T, b: T) => number): number {
    const compare = compareFn || ((a, b) => (a > b ? 1 : a < b ? -1 : 0));
    
    let left = 0;
    let right = arr.length - 1;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const comparison = compare(arr[mid], target);
      
      if (comparison === 0) {
        return mid;
      } else if (comparison < 0) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    
    return -1; // 찾지 못함
  }

  // 해시 테이블 기반 데이터 구조
  public createHashTable<T>(key: string, data: T[], hashFn: (item: T) => string): HashTable<T> {
    const hashTable = new HashTable<T>(hashFn);
    for (const item of data) {
      hashTable.set(hashFn(item), item);
    }
    return hashTable;
  }

  // 집합 최적화
  public createOptimizedSet<T>(key: string, data: T[]): OptimizedSet<T> {
    const optimizedSet = new OptimizedSet<T>(data);
    // 실제 구현에서는 캐시에 저장
    return optimizedSet;
  }

  // 맵 최적화
  public createOptimizedMap<K, V>(key: string, entries: [K, V][]): OptimizedMap<K, V> {
    const optimizedMap = new OptimizedMap<K, V>(entries);
    // 실제 구현에서는 캐시에 저장
    return optimizedMap;
  }

  // 데이터 변형 최적화
  public transformData<T, R>(data: T[], transformer: (item: T) => R, options: { cacheKey?: string; useIndex?: boolean } = {}): R[] {
    if (options.cacheKey) {
      const cached = this.getCache<R[]>(options.cacheKey, 'transformed');
      if (cached) {
        return cached;
      }
    }
    
    const result = data.map(transformer);
    
    if (options.cacheKey) {
      this.setCache<R[]>(options.cacheKey, 'transformed', result);
    }
    
    return result;
  }

  // 필터 최적화
  public filterData<T>(data: T[], predicate: (item: T) => boolean, options: { cacheKey?: string; useIndex?: boolean } = {}): T[] {
    if (options.cacheKey) {
      const cached = this.getCache<T[]>(options.cacheKey, 'filtered');
      if (cached) {
        return cached;
      }
    }
    
    const result = data.filter(predicate);
    
    if (options.cacheKey) {
      this.setCache<T[]>(options.cacheKey, 'filtered', result);
    }
    
    return result;
  }

  // 정렬 최적화
  public sortData<T>(data: T[], compareFn?: (a: T, b: T) => number, options: { cacheKey?: string; useIndex?: boolean } = {}): T[] {
    if (options.cacheKey) {
      const cached = this.getCache<T[]>(options.cacheKey, 'sorted');
      if (cached) {
        return cached;
      }
    }
    
    const result = [...data].sort(compareFn);
    
    if (options.cacheKey) {
      this.setCache<T[]>(options.cacheKey, 'sorted', result);
    }
    
    return result;
  }

  // 그룹화 최적화
  public groupData<T, K>(data: T[], keySelector: (item: T) => K): Map<K, T[]> {
    const grouped = new Map<K, T[]>();
    
    for (const item of data) {
      const key = keySelector(item);
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(item);
    }
    
    return grouped;
  }

  // 고유 값 추출 최적화
  public distinctData<T, K>(data: T[], keySelector?: (item: T) => K): T[] {
    if (!keySelector) {
      // 기본적으로 JSON 문자열 비교
      const seen = new Set<string>();
      const result: T[] = [];
      
      for (const item of data) {
        const key = JSON.stringify(item);
        if (!seen.has(key)) {
          seen.add(key);
          result.push(item);
        }
      }
      
      return result;
    }
    
    // 키 기반 고유 값 추출
    const seen = new Set<K>();
    const result: T[] = [];
    
    for (const item of data) {
      const key = keySelector(item);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(item);
      }
    }
    
    return result;
  }
}

// 최적화된 배열 클래스
class OptimizedArray<T> {
  private data: T[];
  private sorted: boolean = false;
  private sortedData: T[] | null = null;
  private compareFn?: (a: T, b: T) => number;

  constructor(data: T[], compareFn?: (a: T, b: T) => number) {
    this.data = [...data]; // 복사본 생성
    this.compareFn = compareFn;
  }

  // 이진 검색을 위한 정렬
  private ensureSorted(): void {
    if (!this.sorted) {
      this.sortedData = [...this.data].sort(this.compareFn);
      this.sorted = true;
    }
  }

  // 인덱스로 요소 가져오기
  get(index: number): T | undefined {
    return this.data[index];
  }

  // 길이 반환
  get length(): number {
    return this.data.length;
  }

  // 검색 (정렬된 상태에서는 이진 검색 사용)
  search(target: T): number {
    if (this.sorted && this.sortedData) {
      // 이진 검색
      const compare = this.compareFn || ((a, b) => (a > b ? 1 : a < b ? -1 : 0));
      let left = 0;
      let right = this.sortedData.length - 1;
      
      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const comparison = compare(this.sortedData[mid], target);
        
        if (comparison === 0) {
          // 원래 배열에서의 인덱스를 찾아 반환
          return this.data.indexOf(this.sortedData[mid]);
        } else if (comparison < 0) {
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      }
      
      return -1; // 찾지 못함
    } else {
      // 선형 검색
      return this.data.indexOf(target);
    }
  }

  // 요소 추가
  push(item: T): void {
    this.data.push(item);
    this.sorted = false; // 정렬 상태 무효화
    this.sortedData = null;
  }

  // 요소 제거
  remove(item: T): boolean {
    const index = this.data.indexOf(item);
    if (index !== -1) {
      this.data.splice(index, 1);
      this.sorted = false; // 정렬 상태 무효화
      this.sortedData = null;
      return true;
    }
    return false;
  }

  // 정렬
  sort(compareFn?: (a: T, b: T) => number): void {
    this.compareFn = compareFn || this.compareFn;
    this.data.sort(this.compareFn);
    this.ensureSorted();
  }

  // 필터
  filter(predicate: (value: T, index: number, array: T[]) => boolean): T[] {
    return this.data.filter(predicate);
  }

  // 맵
  map<U>(transformer: (value: T, index: number, array: T[]) => U): U[] {
    return this.data.map(transformer);
  }

  // 모든 요소 반환
  getAll(): T[] {
    return [...this.data];
  }
}

// 해시 테이블 클래스
class HashTable<T> {
  private buckets: Map<string, T[]>;
  private hashFn: (item: T) => string;
  private bucketCount: number;

  constructor(hashFn: (item: T) => string, bucketCount: number = 100) {
    this.hashFn = hashFn;
    this.bucketCount = bucketCount;
    this.buckets = new Map<string, T[]>();
  }

  // 해시 값 계산
  private hash(key: string): string {
    // 단순한 해시 함수 (실제 구현에서는 더 좋은 해시 함수 사용)
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString();
  }

  // 요소 설정
  set(key: string, value: T): void {
    const bucketKey = this.hash(key);
    if (!this.buckets.has(bucketKey)) {
      this.buckets.set(bucketKey, []);
    }
    this.buckets.get(bucketKey)!.push(value);
  }

  // 요소 가져오기
  get(key: string): T[] {
    const bucketKey = this.hash(key);
    return this.buckets.get(bucketKey) || [];
  }

  // 요소 삭제
  remove(key: string, value: T): boolean {
    const bucketKey = this.hash(key);
    const bucket = this.buckets.get(bucketKey);
    if (bucket) {
      const index = bucket.indexOf(value);
      if (index !== -1) {
        bucket.splice(index, 1);
        if (bucket.length === 0) {
          this.buckets.delete(bucketKey);
        }
        return true;
      }
    }
    return false;
  }

  // 모든 키 가져오기
  keys(): string[] {
    return Array.from(this.buckets.keys());
  }

  // 모든 값 가져오기
  values(): T[] {
    const allValues: T[] = [];
    for (const bucket of this.buckets.values()) {
      allValues.push(...bucket);
    }
    return allValues;
  }
}

// 최적화된 집합 클래스
class OptimizedSet<T> {
  private data: Map<string, T>;
  private keyFn: (item: T) => string;

  constructor(items: T[] = [], keyFn?: (item: T) => string) {
    this.keyFn = keyFn || ((item: T) => JSON.stringify(item));
    this.data = new Map<string, T>();
    
    for (const item of items) {
      const key = this.keyFn(item);
      this.data.set(key, item);
    }
  }

  // 요소 추가
  add(item: T): OptimizedSet<T> {
    const key = this.keyFn(item);
    this.data.set(key, item);
    return this;
  }

  // 요소 삭제
  delete(item: T): boolean {
    const key = this.keyFn(item);
    return this.data.delete(key);
  }

  // 요소 존재 여부 확인
  has(item: T): boolean {
    const key = this.keyFn(item);
    return this.data.has(key);
  }

  // 크기
  get size(): number {
    return this.data.size;
  }

  // 모든 값 가져오기
  values(): T[] {
    return Array.from(this.data.values());
  }

  // 반복자
  [Symbol.iterator](): Iterator<T> {
    return this.data.values();
  }

  // 클리어
  clear(): void {
    this.data.clear();
  }

  // 배열로 변환
  toArray(): T[] {
    return Array.from(this.data.values());
  }
}

// 최적화된 맵 클래스
class OptimizedMap<K, V> {
  private data: Map<string, { key: K; value: V }>;
  private keyFn: (key: K) => string;

  constructor(entries: [K, V][] = [], keyFn?: (key: K) => string) {
    this.keyFn = keyFn || ((key: K) => JSON.stringify(key));
    this.data = new Map<string, { key: K; value: V }>();
    
    for (const [key, value] of entries) {
      const stringKey = this.keyFn(key);
      this.data.set(stringKey, { key, value });
    }
  }

  // 값 설정
  set(key: K, value: V): OptimizedMap<K, V> {
    const stringKey = this.keyFn(key);
    this.data.set(stringKey, { key, value });
    return this;
  }

  // 값 가져오기
  get(key: K): V | undefined {
    const stringKey = this.keyFn(key);
    const entry = this.data.get(stringKey);
    return entry ? entry.value : undefined;
  }

  // 키 존재 여부 확인
  has(key: K): boolean {
    const stringKey = this.keyFn(key);
    return this.data.has(stringKey);
  }

  // 키 삭제
  delete(key: K): boolean {
    const stringKey = this.keyFn(key);
    return this.data.delete(stringKey);
  }

  // 크기
  get size(): number {
    return this.data.size;
  }

  // 모든 키 가져오기
  keys(): K[] {
    return Array.from(this.data.values()).map(entry => entry.key);
  }

  // 모든 값 가져오기
  values(): V[] {
    return Array.from(this.data.values()).map(entry => entry.value);
  }

  // 모든 엔트리 가져오기
  entries(): [K, V][] {
    return Array.from(this.data.values()).map(entry => [entry.key, entry.value]);
  }

  // 반복자
  [Symbol.iterator](): Iterator<[K, V]> {
    return this.entries()[Symbol.iterator]();
  }

  // 클리어
  clear(): void {
    this.data.clear();
  }

  // 맵으로 변환
  toMap(): Map<K, V> {
    const map = new Map<K, V>();
    for (const [k, v] of this.entries()) {
      map.set(k, v);
    }
    return map;
  }
}

// 데이터 구조 최적화 훅
import { useState, useCallback, useEffect } from 'react';

export function useDataStructureOptimizer() {
  const [optimizer] = useState(() => DataStructureOptimizer.getInstance());
  const [indexes, setIndexes] = useState<Map<string, Map<any, number[]>>(() => new Map());
  const [cache, setCache] = useState<Map<string, any>>(() => new Map());

  const createSearchIndex = useCallback(<T,>(key: string, data: T[], fields: (keyof T)[]) => {
    optimizer.createSearchIndex(key, data, fields);
    setIndexes(new Map(optimizer['indexes'])); // 내부 상태 접근 (실제 구현에서는 getter 제공)
  }, [optimizer]);

  const searchByIndex = useCallback(<T,>(key: string, field: string, value: any) => {
    return optimizer.searchByIndex<T>(key, field, value);
  }, [optimizer]);

  const setCachedValue = useCallback(<T,>(cacheKey: string, dataKey: any, value: T) => {
    optimizer.setCache(cacheKey, dataKey, value);
    setCache(prev => new Map(prev).set(cacheKey, optimizer.getCache(cacheKey, dataKey)));
  }, [optimizer]);

  const getCachedValue = useCallback(<T,>(cacheKey: string, dataKey: any) => {
    return optimizer.getCache<T>(cacheKey, dataKey);
  }, [optimizer]);

  const binarySearch = useCallback(<T,>(arr: T[], target: T, compareFn?: (a: T, b: T) => number) => {
    return optimizer.binarySearch(arr, target, compareFn);
  }, [optimizer]);

  const transformData = useCallback(<T, R>(data: T[], transformer: (item: T) => R, options: { cacheKey?: string; useIndex?: boolean } = {}) => {
    return optimizer.transformData(data, transformer, options);
  }, [optimizer]);

  const filterData = useCallback(<T,>(data: T[], predicate: (item: T) => boolean, options: { cacheKey?: string; useIndex?: boolean } = {}) => {
    return optimizer.filterData(data, predicate, options);
  }, [optimizer]);

  const sortData = useCallback(<T,>(data: T[], compareFn?: (a: T, b: T) => number, options: { cacheKey?: string; useIndex?: boolean } = {}) => {
    return optimizer.sortData(data, compareFn, options);
  }, [optimizer]);

  const groupData = useCallback(<T, K>(data: T[], keySelector: (item: T) => K) => {
    return optimizer.groupData(data, keySelector);
  }, [optimizer]);

  const distinctData = useCallback(<T, K>(data: T[], keySelector?: (item: T) => K) => {
    return optimizer.distinctData(data, keySelector);
  }, [optimizer]);

  return {
    createSearchIndex,
    searchByIndex,
    setCachedValue,
    getCachedValue,
    binarySearch,
    transformData,
    filterData,
    sortData,
    groupData,
    distinctData,
    indexes,
    cache
  };
}

// 데이터 구조 최적화 컴포넌트
export function OptimizedDataComponent<T>({
  data,
  children,
  onOptimize
}: {
  data: T[];
  children: React.ReactNode;
  onOptimize?: (optimizedData: T[]) => void;
}) {
  const [optimizedData, setOptimizedData] = useState<T[]>(data);
  const { sortData, filterData, transformData } = useDataStructureOptimizer();

  useEffect(() => {
    // 예: 정렬 최적화
    const sorted = sortData(data, (a: any, b: any) => {
      // 적절한 비교 함수
      if (a.id < b.id) return -1;
      if (a.id > b.id) return 1;
      return 0;
    });
    
    setOptimizedData(sorted);
    
    if (onOptimize) {
      onOptimize(sorted);
    }
  }, [data, sortData, onOptimize]);

  return <>{children}</>;
}

// 데이터 구조 최적화 컨텍스트
import { createContext, useContext } from 'react';

interface DataStructureOptimizationContextType {
  createSearchIndex: <T>(key: string, data: T[], fields: (keyof T)[]) => void;
  searchByIndex: <T>(key: string, field: string, value: any) => number[];
  setCachedValue: <T>(cacheKey: string, dataKey: any, value: T) => void;
  getCachedValue: <T>(cacheKey: string, dataKey: any) => T | undefined;
  binarySearch: <T>(arr: T[], target: T, compareFn?: (a: T, b: T) => number) => number;
  transformData: <T, R>(data: T[], transformer: (item: T) => R, options?: { cacheKey?: string; useIndex?: boolean }) => R[];
  filterData: <T>(data: T[], predicate: (item: T) => boolean, options?: { cacheKey?: string; useIndex?: boolean }) => T[];
  sortData: <T>(data: T[], compareFn?: (a: T, b: T) => number, options?: { cacheKey?: string; useIndex?: boolean }) => T[];
  groupData: <T, K>(data: T[], keySelector: (item: T) => K) => Map<K, T[]>;
  distinctData: <T, K>(data: T[], keySelector?: (item: T) => K) => T[];
  indexes: Map<string, Map<any, number[]>>;
  cache: Map<string, any>;
}

const DataStructureOptimizationContext = createContext<DataStructureOptimizationContextType | undefined>(undefined);

export function DataStructureOptimizationProvider({ children }: { children: React.ReactNode }) {
  const dataStructureOptimizer = useDataStructureOptimizer();

  return (
    <DataStructureOptimizationContext.Provider value={dataStructureOptimizer}>
      {children}
    </DataStructureOptimizationContext.Provider>
  );
}

export function useDataStructureOptimization() {
  const context = useContext(DataStructureOptimizationContext);
  if (!context) {
    throw new Error('useDataStructureOptimization must be used within a DataStructureOptimizationProvider');
  }
  return context;
}

// 서버 사이드 데이터 구조 최적화 유틸리티
export const serverSideDataStructureOptimization = {
  // 서버에서 검색 인덱스 생성
  createIndex: <T>(data: T[], fields: (keyof T)[]) => {
    const optimizer = DataStructureOptimizer.getInstance();
    // 고유한 키 생성
    const key = `index_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    optimizer.createSearchIndex(key, data, fields);
    return key;
  },

  // 서버에서 데이터 변형
  transform: <T, R>(data: T[], transformer: (item: T) => R) => {
    const optimizer = DataStructureOptimizer.getInstance();
    return optimizer.transformData(data, transformer);
  },

  // 서버에서 데이터 필터링
  filter: <T>(data: T[], predicate: (item: T) => boolean) => {
    const optimizer = DataStructureOptimizer.getInstance();
    return optimizer.filterData(data, predicate);
  },

  // 서버에서 데이터 정렬
  sort: <T>(data: T[], compareFn?: (a: T, b: T) => number) => {
    const optimizer = DataStructureOptimizer.getInstance();
    return optimizer.sortData(data, compareFn);
  }
};

// 검색 최적화 유틸리티
export function createSearchableCollection<T>(data: T[], searchFields: (keyof T)[]) {
  const optimizer = DataStructureOptimizer.getInstance();
  const key = `search_${Date.now()}`;
  
  optimizer.createSearchIndex(key, data, searchFields);
  
  return {
    search: (field: keyof T, value: any) => {
      return optimizer.searchByIndex<T>(key, field as string, value);
    },
    getData: (indices: number[]) => {
      return indices.map(i => data[i]);
    }
  };
}

// 데이터 구조 성능 측정 유틸리티
export function measureDataOperation<T>(operation: () => T): { result: T; duration: number } {
  const start = performance.now();
  const result = operation();
  const end = performance.now();
  
  return { result, duration: end - start };
}