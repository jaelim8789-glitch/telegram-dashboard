// SSR 최적화 유틸리티
class SsrOptimizer {
  private static instance: SsrOptimizer;
  private dataCache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private componentCache: Map<string, string> = new Map();
  private readonly DEFAULT_TTL: number = 5 * 60 * 1000; // 5분 기본 TTL

  public static getInstance(): SsrOptimizer {
    if (!SsrOptimizer.instance) {
      SsrOptimizer.instance = new SsrOptimizer();
    }
    return SsrOptimizer.instance;
  }

  // 데이터 사전 로딩
  public async preloadData<T>(key: string, fetcher: () => Promise<T>, ttl: number = this.DEFAULT_TTL): Promise<T> {
    const cached = this.dataCache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T;
    }

    const data = await fetcher();
    this.dataCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    return data;
  }

  // 여러 데이터 동시에 사전 로딩
  public async preloadMultipleData(dataFetchers: Array<{ key: string; fetcher: () => Promise<any>; ttl?: number }>): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    
    const promises = dataFetchers.map(async ({ key, fetcher, ttl }) => {
      results[key] = await this.preloadData(key, fetcher, ttl);
    });

    await Promise.all(promises);
    return results;
  }

  // 캐시된 데이터 가져오기
  public getCachedData<T>(key: string): T | null {
    const cached = this.dataCache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.dataCache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  // 데이터 캐시 무효화
  public invalidateDataCache(key: string): void {
    this.dataCache.delete(key);
  }

  // 컴포넌트 사전 렌더링
  public prerenderComponent(componentKey: string, renderer: () => string): string {
    const cached = this.componentCache.get(componentKey);
    if (cached) {
      return cached;
    }

    const rendered = renderer();
    this.componentCache.set(componentKey, rendered);
    return rendered;
  }

  // 서버 사이드에서 사용할 데이터 로딩 훅 시뮬레이션
  public async loadServerData<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    options: { 
      revalidate?: number; 
      cache?: boolean; 
      timeout?: number 
    } = {}
  ): Promise<T> {
    const { revalidate = this.DEFAULT_TTL, cache = true, timeout = 10000 } = options;

    if (cache) {
      const cached = this.getCachedData<T>(key);
      if (cached) {
        return cached;
      }
    }

    // 타임아웃 처리
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Data fetch timeout')), timeout);
    });

    const fetchPromise = fetcher();
    const result = await Promise.race([fetchPromise, timeoutPromise]);

    if (cache) {
      this.dataCache.set(key, {
        data: result,
        timestamp: Date.now(),
        ttl: revalidate
      });
    }

    return result;
  }

  // 서버 사이드 렌더링 성능 측정
  public async measureRenderTime(renderFn: () => any): Promise<{ result: any; duration: number }> {
    const startTime = performance.now();
    const result = await renderFn();
    const endTime = performance.now();
    
    return {
      result,
      duration: endTime - startTime
    };
  }

  // 렌더링 전략 선택
  public selectRenderingStrategy(
    userAgent: string,
    options: {
      isBot: boolean;
      isMobile: boolean;
      connectionSpeed: 'fast' | 'slow';
      prefersReducedMotion: boolean;
    }
  ): 'ssr' | 'csr' | 'isr' | 'ssg' {
    // 검색 엔진 봇이면 항상 SSR
    if (options.isBot) {
      return 'ssr';
    }

    // 느린 연결이면 SSG 또는 CSR
    if (options.connectionSpeed === 'slow') {
      return 'ssg'; // 정적 생성으로 빠른 로딩
    }

    // 모바일이면서 느린 연결이면 ISR (Incremental Static Regeneration)
    if (options.isMobile && options.connectionSpeed === 'slow') {
      return 'isr';
    }

    // 그 외에는 기본 SSR
    return 'ssr';
  }

  // 서버 사이드 캐시 키 생성
  public generateCacheKey(url: string, params: Record<string, any>, userAgent?: string): string {
    const paramStr = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    const userAgentHash = userAgent ? this.simpleHash(userAgent) : '';
    
    return `${url}?${paramStr}#${userAgentHash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // HTML 스트리밍 렌더링
  public async * streamRender(components: Array<{ key: string; renderer: () => string; priority: number }>): AsyncGenerator<string, void, unknown> {
    // 우선순위에 따라 컴포넌트 정렬
    const sortedComponents = [...components].sort((a, b) => b.priority - a.priority);
    
    for (const component of sortedComponents) {
      yield component.renderer();
      // 각 컴포넌트 렌더링 후 잠시 대기하여 스트리밍 효과
      await new Promise(resolve => setImmediate(resolve));
    }
  }

  // 레이아웃 우선 렌더링
  public async renderLayoutFirst(
    layoutRenderer: () => string,
    contentFetchers: Array<{ key: string; fetcher: () => Promise<any> }>
  ): Promise<{ layoutHtml: string; contentData: Record<string, any> }> {
    // 레이아웃 먼저 렌더링
    const layoutHtml = layoutRenderer();
    
    // 콘텐츠 데이터 병렬로 가져오기
    const contentData: Record<string, any> = {};
    const fetchPromises = contentFetchers.map(async (fetcher) => {
      contentData[fetcher.key] = await fetcher.fetcher();
    });
    
    await Promise.all(fetchPromises);
    
    return { layoutHtml, contentData };
  }

  // 조건부 SSR
  public shouldRenderOnServer(headers: Record<string, string>): boolean {
    // 모바일 사용자 에이전트 감지
    const userAgent = headers['user-agent'];
    if (!userAgent) return true;

    // 검색 엔진 봇 감지
    const botAgents = ['googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider', 'yandexbot'];
    const isBot = botAgents.some(bot => userAgent.toLowerCase().includes(bot));

    // 봇이거나 JS 미지원 브라우저면 SSR
    if (isBot) return true;

    // JS 사용 가능 여부 확인 (일부 렌더링 엔진에서 확인 가능)
    const acceptsJs = headers['accept']?.includes('text/html');
    const isLegacyBrowser = /MSIE|Trident/.test(userAgent);

    return acceptsJs || isLegacyBrowser;
  }

  // 데이터 패턴 기반 사전 로딩
  public async preloadBasedOnPattern(
    url: string,
    dataDependencies: Array<{ pattern: string; fetcher: () => Promise<any> }>
  ): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    
    for (const dep of dataDependencies) {
      if (url.includes(dep.pattern)) {
        const key = `${url}-${dep.pattern}`;
        results[dep.pattern] = await this.preloadData(key, dep.fetcher);
      }
    }
    
    return results;
  }
}

// SSR 최적화 훅
import { useState, useEffect, useCallback } from 'react';

export function useSsrOptimizer() {
  const [optimizer] = useState(() => SsrOptimizer.getInstance());
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const preloadData = useCallback(async <T,>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 5 * 60 * 1000
  ) => {
    return optimizer.preloadData<T>(key, fetcher, ttl);
  }, [optimizer]);

  const loadServerData = useCallback(async <T,>(
    key: string,
    fetcher: () => Promise<T>,
    options: { revalidate?: number; cache?: boolean; timeout?: number } = {}
  ) => {
    if (isClient) {
      // 클라이언트에서는 캐시된 데이터 사용
      const cached = optimizer.getCachedData<T>(key);
      if (cached) {
        return cached;
      }
    }

    return optimizer.loadServerData<T>(key, fetcher, options);
  }, [optimizer, isClient]);

  const selectRenderingStrategy = useCallback((
    userAgent: string,
    options: {
      isBot: boolean;
      isMobile: boolean;
      connectionSpeed: 'fast' | 'slow';
      prefersReducedMotion: boolean;
    }
  ) => {
    return optimizer.selectRenderingStrategy(userAgent, options);
  }, [optimizer]);

  const shouldRenderOnServer = useCallback((headers: Record<string, string>) => {
    if (isClient) return false;
    return optimizer.shouldRenderOnServer(headers);
  }, [isClient, optimizer]);

  return {
    preloadData,
    loadServerData,
    selectRenderingStrategy,
    shouldRenderOnServer
  };
}

// 서버 사이드 렌더링 컴포넌트
export function OptimizedServerComponent<T>({
  dataKey,
  fetcher,
  renderer,
  fallback,
  ssr = true
}: {
  dataKey: string;
  fetcher: () => Promise<T>;
  renderer: (data: T) => React.ReactNode;
  fallback?: React.ReactNode;
  ssr?: boolean;
}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(ssr);
  const [error, setError] = useState<Error | null>(null);
  const { loadServerData } = useSsrOptimizer();

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await loadServerData(dataKey, fetcher);
        setData(result);
        setLoading(false);
      } catch (err) {
        setError(err as Error);
        setLoading(false);
      }
    };

    loadData();
  }, [dataKey, fetcher, loadServerData]);

  if (loading) {
    return fallback || <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return <>{renderer(data!)}</>;
}

// 데이터 사전 로딩 HOC
export function withServerData<T, P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  dataKey: string,
  fetcher: () => Promise<T>
) {
  return function ServerDataWrapper(props: Omit<P, 'serverData'>) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const { loadServerData } = useSsrOptimizer();

    useEffect(() => {
      loadServerData(dataKey, fetcher).then(setData).finally(() => setLoading(false));
    }, [dataKey, fetcher, loadServerData]);

    if (loading) {
      return <div>Loading...</div>;
    }

    return <Component {...(props as P)} serverData={data} />;
  };
}

// SSR 최적화 컨텍스트
import { createContext, useContext } from 'react';

interface SsrOptimizationContextType {
  preloadData: <T>(key: string, fetcher: () => Promise<T>, ttl?: number) => Promise<T>;
  loadServerData: <T>(key: string, fetcher: () => Promise<T>, options?: { revalidate?: number; cache?: boolean; timeout?: number }) => Promise<T>;
  selectRenderingStrategy: (userAgent: string, options: { isBot: boolean; isMobile: boolean; connectionSpeed: 'fast' | 'slow'; prefersReducedMotion: boolean }) => 'ssr' | 'csr' | 'isr' | 'ssg';
  shouldRenderOnServer: (headers: Record<string, string>) => boolean;
}

const SsrOptimizationContext = createContext<SsrOptimizationContextType | undefined>(undefined);

export function SsrOptimizationProvider({ children }: { children: React.ReactNode }) {
  const ssrOptimizer = useSsrOptimizer();

  return (
    <SsrOptimizationContext.Provider value={ssrOptimizer}>
      {children}
    </SsrOptimizationContext.Provider>
  );
}

export function useSsrOptimization() {
  const context = useContext(SsrOptimizationContext);
  if (!context) {
    throw new Error('useSsrOptimization must be used within a SsrOptimizationProvider');
  }
  return context;
}

// 서버 사이드 전용 유틸리티
export const serverSideUtilities = {
  // 서버에서 데이터 사전 로딩
  preloadData: async <T,>(key: string, fetcher: () => Promise<T>, ttl: number = 5 * 60 * 1000): Promise<T> => {
    const optimizer = SsrOptimizer.getInstance();
    return optimizer.preloadData(key, fetcher, ttl);
  },

  // 서버에서 렌더링 전략 선택
  selectStrategy: (
    userAgent: string,
    options: {
      isBot: boolean;
      isMobile: boolean;
      connectionSpeed: 'fast' | 'slow';
      prefersReducedMotion: boolean;
    }
  ): 'ssr' | 'csr' | 'isr' | 'ssg' => {
    const optimizer = SsrOptimizer.getInstance();
    return optimizer.selectRenderingStrategy(userAgent, options);
  },

  // 서버에서 캐시 키 생성
  generateCacheKey: (url: string, params: Record<string, any>, userAgent?: string): string => {
    const optimizer = SsrOptimizer.getInstance();
    return optimizer.generateCacheKey(url, params, userAgent);
  }
};

// 레이아웃 우선 렌더링 훅
export function useLayoutFirstRendering() {
  const [layoutRendered, setLayoutRendered] = useState(false);
  const [contentData, setContentData] = useState<Record<string, any>>({});

  const renderLayoutFirst = useCallback(async (
    layoutRenderer: () => string,
    contentFetchers: Array<{ key: string; fetcher: () => Promise<any> }>
  ) => {
    const optimizer = SsrOptimizer.getInstance();
    const { layoutHtml, contentData } = await optimizer.renderLayoutFirst(layoutRenderer, contentFetchers);
    
    setLayoutRendered(true);
    setContentData(contentData);
    
    return layoutHtml;
  }, []);

  return {
    renderLayoutFirst,
    layoutRendered,
    contentData
  };
}

// 조건부 SSR 훅
export function useConditionalSsr() {
  const [shouldSsr, setShouldSsr] = useState(false);

  useEffect(() => {
    // 클라이언트에서 실행될 때 SSR 필요 여부 판단
    const userAgent = navigator.userAgent;
    const isBot = /bot|crawl|spider|slurp|duckduckbot/i.test(userAgent);
    const isMobile = /mobile|android|iphone|ipad/i.test(userAgent);
    
    // 모바일 또는 봇이면 SSR
    setShouldSsr(isBot || isMobile);
  }, []);

  return shouldSsr;
}