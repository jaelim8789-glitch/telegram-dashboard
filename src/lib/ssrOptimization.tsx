"use client";
// SSR ìµì ??? í¸ë¦¬í°
class SsrOptimizer {
  private static instance: SsrOptimizer;
  private dataCache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private componentCache: Map<string, string> = new Map();
  private readonly DEFAULT_TTL: number = 5 * 60 * 1000; // 5ë¶?ê¸°ë³¸ TTL

  public static getInstance(): SsrOptimizer {
    if (!SsrOptimizer.instance) {
      SsrOptimizer.instance = new SsrOptimizer();
    }
    return SsrOptimizer.instance;
  }

  // ?°ì´???¬ì  ë¡ë©
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

  // ?¬ë¬ ?°ì´???ì???¬ì  ë¡ë©
  public async preloadMultipleData(dataFetchers: Array<{ key: string; fetcher: () => Promise<any>; ttl?: number }>): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    
    const promises = dataFetchers.map(async ({ key, fetcher, ttl }) => {
      results[key] = await this.preloadData(key, fetcher, ttl);
    });

    await Promise.all(promises);
    return results;
  }

  // ìºì???°ì´??ê°?¸ì¤ê¸?
  public getCachedData<T>(key: string): T | null {
    const cached = this.dataCache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.dataCache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  // ?°ì´??ìºì ë¬´í¨??
  public invalidateDataCache(key: string): void {
    this.dataCache.delete(key);
  }

  // ì»´í¬?í¸ ?¬ì  ?ëë§?
  public prerenderComponent(componentKey: string, renderer: () => string): string {
    const cached = this.componentCache.get(componentKey);
    if (cached) {
      return cached;
    }

    const rendered = renderer();
    this.componentCache.set(componentKey, rendered);
    return rendered;
  }

  // ?ë² ?¬ì´?ì???¬ì©???°ì´??ë¡ë© ???ë??ì´??
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

    // ??ì??ì²ë¦¬
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

  // ?ë² ?¬ì´???ëë§??±ë¥ ì¸¡ì 
  public async measureRenderTime(renderFn: () => any): Promise<{ result: any; duration: number }> {
    const startTime = performance.now();
    const result = await renderFn();
    const endTime = performance.now();
    
    return {
      result,
      duration: endTime - startTime
    };
  }

  // ?ëë§??ëµ ? í
  public selectRenderingStrategy(
    userAgent: string,
    options: {
      isBot: boolean;
      isMobile: boolean;
      connectionSpeed: 'fast' | 'slow';
      prefersReducedMotion: boolean;
    }
  ): 'ssr' | 'csr' | 'isr' | 'ssg' {
    // ê²???ì§ ë´ì´ë©??? SSR
    if (options.isBot) {
      return 'ssr';
    }

    // ?ë¦° ?°ê²°?´ë©´ SSG ?ë CSR
    if (options.connectionSpeed === 'slow') {
      return 'ssg'; // ?ì  ?ì±?¼ë¡ ë¹ ë¥¸ ë¡ë©
    }

    // ëª¨ë°?¼ì´ë©´ì ?ë¦° ?°ê²°?´ë©´ ISR (Incremental Static Regeneration)
    if (options.isMobile && options.connectionSpeed === 'slow') {
      return 'isr';
    }

    // ê·??¸ì??ê¸°ë³¸ SSR
    return 'ssr';
  }

  // ?ë² ?¬ì´??ìºì ???ì±
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

  // HTML ?¤í¸ë¦¬ë° ?ëë§?
  public async * streamRender(components: Array<{ key: string; renderer: () => string; priority: number }>): AsyncGenerator<string, void, unknown> {
    // ?°ì ?ì???°ë¼ ì»´í¬?í¸ ?ë ¬
    const sortedComponents = [...components].sort((a, b) => b.priority - a.priority);
    
    for (const component of sortedComponents) {
      yield component.renderer();
      // ê°?ì»´í¬?í¸ ?ëë§???? ì ?ê¸°í???¤í¸ë¦¬ë° ?¨ê³¼
      await new Promise(resolve => setImmediate(resolve));
    }
  }

  // ?ì´?ì ?°ì  ?ëë§?
  public async renderLayoutFirst(
    layoutRenderer: () => string,
    contentFetchers: Array<{ key: string; fetcher: () => Promise<any> }>
  ): Promise<{ layoutHtml: string; contentData: Record<string, any> }> {
    // ?ì´?ì ë¨¼ì? ?ëë§?
    const layoutHtml = layoutRenderer();
    
    // ì½íì¸??°ì´??ë³ë ¬ë¡?ê°?¸ì¤ê¸?
    const contentData: Record<string, any> = {};
    const fetchPromises = contentFetchers.map(async (fetcher) => {
      contentData[fetcher.key] = await fetcher.fetcher();
    });
    
    await Promise.all(fetchPromises);
    
    return { layoutHtml, contentData };
  }

  // ì¡°ê±´ë¶ SSR
  public shouldRenderOnServer(headers: Record<string, string>): boolean {
    // ëª¨ë°???¬ì©???ì´?í¸ ê°ì?
    const userAgent = headers['user-agent'];
    if (!userAgent) return true;

    // ê²???ì§ ë´?ê°ì?
    const botAgents = ['googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider', 'yandexbot'];
    const isBot = botAgents.some(bot => userAgent.toLowerCase().includes(bot));

    // ë´ì´ê±°ë JS ë¯¸ì???ë¸ë¼?°ì?ë©?SSR
    if (isBot) return true;

    // JS ?¬ì© ê°???¬ë? ?ì¸ (?¼ë? ?ëë§??ì§?ì ?ì¸ ê°??
    const acceptsJs = headers['accept']?.includes('text/html');
    const isLegacyBrowser = /MSIE|Trident/.test(userAgent);

    return acceptsJs || isLegacyBrowser;
  }

  // ?°ì´???¨í´ ê¸°ë° ?¬ì  ë¡ë©
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

// SSR ìµì ????
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
      // ?´ë¼?´ì¸?¸ì?ë ìºì???°ì´???¬ì©
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

// ?ë² ?¬ì´???ëë§?ì»´í¬?í¸
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

// ?°ì´???¬ì  ë¡ë© HOC
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

// SSR ìµì ??ì»¨í?¤í¸
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

// ?ë² ?¬ì´???ì© ? í¸ë¦¬í°
export const serverSideUtilities = {
  // ?ë²?ì ?°ì´???¬ì  ë¡ë©
  preloadData: async <T,>(key: string, fetcher: () => Promise<T>, ttl: number = 5 * 60 * 1000): Promise<T> => {
    const optimizer = SsrOptimizer.getInstance();
    return optimizer.preloadData(key, fetcher, ttl);
  },

  // ?ë²?ì ?ëë§??ëµ ? í
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

  // ?ë²?ì ìºì ???ì±
  generateCacheKey: (url: string, params: Record<string, any>, userAgent?: string): string => {
    const optimizer = SsrOptimizer.getInstance();
    return optimizer.generateCacheKey(url, params, userAgent);
  }
};

// ?ì´?ì ?°ì  ?ëë§???
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

// ì¡°ê±´ë¶ SSR ??
export function useConditionalSsr() {
  const [shouldSsr, setShouldSsr] = useState(false);

  useEffect(() => {
    // ?´ë¼?´ì¸?¸ì???¤í????SSR ?ì ?¬ë? ?ë¨
    const userAgent = navigator.userAgent;
    const isBot = /bot|crawl|spider|slurp|duckduckbot/i.test(userAgent);
    const isMobile = /mobile|android|iphone|ipad/i.test(userAgent);
    
    // ëª¨ë°???ë ë´ì´ë©?SSR
    setShouldSsr(isBot || isMobile);
  }, []);

  return shouldSsr;
}