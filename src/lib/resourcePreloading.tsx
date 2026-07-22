// 리소스 프리로딩/프리페칭 클래스
class ResourcePreloader {
  private static instance: ResourcePreloader;
  private preloadedResources: Map<string, { status: 'pending' | 'loaded' | 'error'; resource: any }> = new Map();
  private preloadQueue: Array<{ url: string; type: ResourceType; priority: number }> = [];
  private ongoingRequests: Map<string, Promise<any>> = new Map();
  private readonly maxConcurrentRequests: number = 6;
  private activeRequests: number = 0;

  public static getInstance(): ResourcePreloader {
    if (!ResourcePreloader.instance) {
      ResourcePreloader.instance = new ResourcePreloader();
    }
    return ResourcePreloader.instance;
  }

  // 리소스 타입 정의
  public async preloadResource(url: string, type: ResourceType = 'auto', priority: number = 1): Promise<boolean> {
    if (this.preloadedResources.has(url)) {
      const status = this.preloadedResources.get(url)!.status;
      return status === 'loaded';
    }

    // 동일한 요청이 이미 진행 중인 경우 기다림
    if (this.ongoingRequests.has(url)) {
      try {
        await this.ongoingRequests.get(url);
        return true;
      } catch {
        return false;
      }
    }

    // 리소스 로드 요청
    const loadPromise = this.loadResource(url, type);
    this.ongoingRequests.set(url, loadPromise);

    try {
      const resource = await loadPromise;
      this.preloadedResources.set(url, { status: 'loaded', resource });
      this.ongoingRequests.delete(url);
      return true;
    } catch (error) {
      console.error(`Failed to preload resource: ${url}`, error);
      this.preloadedResources.set(url, { status: 'error', resource: null });
      this.ongoingRequests.delete(url);
      return false;
    }
  }

  // 리소스 타입에 따른 로드
  private async loadResource(url: string, type: ResourceType): Promise<any> {
    if (this.activeRequests >= this.maxConcurrentRequests) {
      // 최대 동시 요청 수 초과 시 대기
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.loadResource(url, type);
    }

    this.activeRequests++;

    try {
      switch (type) {
        case 'image':
          return await this.loadImage(url);
        case 'script':
          return await this.loadScript(url);
        case 'style':
          return await this.loadStylesheet(url);
        case 'font':
          return await this.loadFont(url);
        case 'video':
          return await this.loadVideo(url);
        case 'audio':
          return await this.loadAudio(url);
        case 'json':
          return await this.loadJson(url);
        case 'fetch':
          return await this.loadWithFetch(url);
        default:
          // 자동 타입 감지
          const detectedType = this.detectResourceType(url);
          return await this.loadResource(url, detectedType);
      }
    } finally {
      this.activeRequests--;
    }
  }

  // 이미지 로드
  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  // 스크립트 로드
  private loadScript(src: string): Promise<HTMLScriptElement> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve(script);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // 스타일시트 로드
  private loadStylesheet(href: string): Promise<HTMLLinkElement> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = () => resolve(link);
      link.onerror = reject;
      document.head.appendChild(link);
    });
  }

  // 폰트 로드
  private loadFont(src: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const fontFace = new FontFace('temp', `url(${src})`, { display: 'swap' });
      fontFace.load().then(() => {
        document.fonts.add(fontFace);
        resolve(fontFace);
      }).catch(reject);
    });
  }

  // 비디오 로드
  private loadVideo(src: string): Promise<HTMLVideoElement> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadeddata = () => resolve(video);
      video.onerror = reject;
      video.src = src;
    });
  }

  // 오디오 로드
  private loadAudio(src: string): Promise<HTMLAudioElement> {
    return new Promise((resolve, reject) => {
      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      audio.onloadeddata = () => resolve(audio);
      audio.onerror = reject;
      audio.src = src;
    });
  }

  // JSON 로드
  private loadJson(url: string): Promise<any> {
    return fetch(url).then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    });
  }

  // Fetch를 이용한 로드
  private loadWithFetch(url: string): Promise<Response> {
    return fetch(url, { method: 'HEAD' }); // HEAD 요청으로 리소스 존재 여부 확인
  }

  // 리소스 타입 자동 감지
  private detectResourceType(url: string): ResourceType {
    const extension = url.split('.').pop()?.toLowerCase();
    
    if (!extension) return 'fetch';
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
      case 'svg':
        return 'image';
      case 'js':
        return 'script';
      case 'css':
        return 'style';
      case 'woff':
      case 'woff2':
      case 'ttf':
      case 'otf':
        return 'font';
      case 'mp4':
      case 'webm':
      case 'ogg':
        return 'video';
      case 'mp3':
      case 'wav':
      case 'aac':
        return 'audio';
      case 'json':
        return 'json';
      default:
        return 'fetch';
    }
  }

  // 여러 리소스 동시에 프리로드
  public async preloadResources(resources: Array<{ url: string; type?: ResourceType; priority?: number }>): Promise<boolean[]> {
    const results = await Promise.all(
      resources.map(resource => 
        this.preloadResource(resource.url, resource.type || 'auto', resource.priority || 1)
      )
    );
    
    return results;
  }

  // 조건부 프리로드
  public async conditionalPreload(condition: boolean, resources: Array<{ url: string; type?: ResourceType }>): Promise<boolean[]> {
    if (!condition) {
      return resources.map(() => false);
    }
    
    return this.preloadResources(resources);
  }

  // 뷰포트 기반 프리로드
  public async preloadInViewport(selector: string, type: ResourceType = 'image'): Promise<boolean[]> {
    const elements = Array.from(document.querySelectorAll(selector));
    const resources = elements
      .map(el => {
        const url = el.getAttribute('data-src') || el.getAttribute('src') || el.getAttribute('href');
        return url ? { url, type } : null;
      })
      .filter(Boolean) as Array<{ url: string; type: ResourceType }>;
    
    return this.preloadResources(resources);
  }

  // 네트워크 상태 기반 프리로드
  public async preloadBasedOnConnection(resources: Array<{ url: string; type?: ResourceType }>): Promise<boolean[]> {
    if (!('connection' in navigator)) {
      // 연결 상태 정보가 없으면 기본 전략 사용
      return this.preloadResources(resources);
    }

    const connection = (navigator as any).connection;
    const effectiveType = connection.effectiveType;

    // 느린 연결에서는 중요 리소스만 프리로드
    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      return this.preloadResources(resources.slice(0, 3)); // 상위 3개만
    } else if (effectiveType === '3g') {
      return this.preloadResources(resources.slice(0, 6)); // 상위 6개까지
    } else {
      // 빠른 연결에서는 모든 리소스 프리로드
      return this.preloadResources(resources);
    }
  }

  // 리소스 로드 상태 확인
  public isResourceLoaded(url: string): boolean {
    const resource = this.preloadedResources.get(url);
    return resource?.status === 'loaded';
  }

  // 리소스 로드 대기
  public waitForResource(url: string): Promise<boolean> {
    if (this.isResourceLoaded(url)) {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.isResourceLoaded(url)) {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 100);

      // 최대 대기 시간 10초
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(this.isResourceLoaded(url));
      }, 10000);
    });
  }

  // 리소스 제거
  public evictResource(url: string): void {
    this.preloadedResources.delete(url);
  }

  // 모든 리소스 제거
  public clearAll(): void {
    this.preloadedResources.clear();
  }

  // 리소스 정보 가져오기
  public getResourceInfo(url: string): { status: 'pending' | 'loaded' | 'error'; timestamp?: number } | null {
    const resource = this.preloadedResources.get(url);
    if (!resource) return null;

    return {
      status: resource.status,
      timestamp: Date.now()
    };
  }
}

type ResourceType = 
  | 'image' 
  | 'script' 
  | 'style' 
  | 'font' 
  | 'video' 
  | 'audio' 
  | 'json' 
  | 'fetch' 
  | 'auto';

// 리소스 프리로딩 훅
import { useState, useEffect, useCallback } from 'react';

export function useResourcePreloader() {
  const [preloader] = useState(() => ResourcePreloader.getInstance());
  const [loadedResources, setLoadedResources] = useState<Set<string>>(new Set());
  const [loadingProgress, setLoadingProgress] = useState<Record<string, number>>({});

  const preloadResource = useCallback(async (
    url: string, 
    type: ResourceType = 'auto', 
    priority: number = 1
  ) => {
    const success = await preloader.preloadResource(url, type, priority);
    
    if (success) {
      setLoadedResources(prev => new Set(prev).add(url));
    }
    
    return success;
  }, [preloader]);

  const preloadResources = useCallback(async (
    resources: Array<{ url: string; type?: ResourceType; priority?: number }>
  ) => {
    const results = await preloader.preloadResources(resources);
    
    // 성공한 리소스만 추가
    const successfulUrls = resources
      .filter((_, index) => results[index])
      .map(r => r.url);
    
    setLoadedResources(prev => {
      const newSet = new Set(prev);
      successfulUrls.forEach(url => newSet.add(url));
      return newSet;
    });
    
    return results;
  }, [preloader]);

  const isResourceLoaded = useCallback((url: string) => {
    return preloader.isResourceLoaded(url);
  }, [preloader]);

  const waitForResource = useCallback((url: string) => {
    return preloader.waitForResource(url);
  }, [preloader]);

  return {
    preloadResource,
    preloadResources,
    isResourceLoaded,
    waitForResource,
    loadedResources: Array.from(loadedResources),
    loadingProgress
  };
}

// 리소스 프리로딩 컴포넌트
export function ResourcePreloaderComponent({
  resources,
  children
}: {
  resources: Array<{ url: string; type?: ResourceType; priority?: number }>;
  children: React.ReactNode;
}) {
  const [preloaded, setPreloaded] = useState<Record<string, boolean>>({});
  const { preloadResources } = useResourcePreloader();

  useEffect(() => {
    const loadResources = async () => {
      const results = await preloadResources(resources);
      const resultRecord: Record<string, boolean> = {};
      resources.forEach((resource, index) => {
        resultRecord[resource.url] = results[index];
      });
      setPreloaded(resultRecord);
    };

    loadResources();
  }, [resources, preloadResources]);

  const allLoaded = resources.every(resource => preloaded[resource.url] === true);

  return (
    <div className={allLoaded ? 'resources-loaded' : 'resources-loading'}>
      {children}
    </div>
  );
}

// 프리페치링 전략 컴포넌트
export function SmartPrefetcher({
  urls,
  triggerOnView = false,
  children
}: {
  urls: string[];
  triggerOnView?: boolean;
  children: React.ReactNode;
}) {
  const [ref, inView] = useInView({ triggerOnce: true });
  const { preloadResources } = useResourcePreloader();

  useEffect(() => {
    if (!triggerOnView || inView) {
      preloadResources(urls.map(url => ({ url })));
    }
  }, [urls, triggerOnView, inView, preloadResources]);

  return (
    <div ref={ref}>
      {children}
    </div>
  );
}

// 리소스 프리로딩 컨텍스트
import { createContext, useContext } from 'react';

interface ResourcePreloadingContextType {
  preloadResource: (url: string, type?: ResourceType, priority?: number) => Promise<boolean>;
  preloadResources: (resources: Array<{ url: string; type?: ResourceType; priority?: number }>) => Promise<boolean[]>;
  isResourceLoaded: (url: string) => boolean;
  waitForResource: (url: string) => Promise<boolean>;
  loadedResources: string[];
  loadingProgress: Record<string, number>;
}

const ResourcePreloadingContext = createContext<ResourcePreloadingContextType | undefined>(undefined);

export function ResourcePreloadingProvider({ children }: { children: React.ReactNode }) {
  const resourcePreloader = useResourcePreloader();

  return (
    <ResourcePreloadingContext.Provider value={resourcePreloader}>
      {children}
    </ResourcePreloadingContext.Provider>
  );
}

export function useResourcePreloading() {
  const context = useContext(ResourcePreloadingContext);
  if (!context) {
    throw new Error('useResourcePreloading must be used within a ResourcePreloadingProvider');
  }
  return context;
}

// 라우트 기반 프리로딩 훅
export function useRouterPreloading() {
  const { preloadResources } = useResourcePreloading();
  const router = useRouter(); // Next.js 라우터 가정

  // 다음 라우트를 위한 리소스 프리로드
  const prefetchRouteResources = useCallback(async (route: string) => {
    // 라우트에 필요한 리소스 URL 생성
    const routeResources = [
      { url: `${route}/data.json`, type: 'json' as ResourceType },
      { url: `${route}/style.css`, type: 'style' as ResourceType },
      { url: `${route}/image.jpg`, type: 'image' as ResourceType }
    ];

    return preloadResources(routeResources);
  }, [preloadResources]);

  return {
    prefetchRouteResources
  };
}

// 리소스 프리로딩 전략
export const PreloadingStrategies = {
  // 즉시 프리로드
  immediate: (resources: Array<{ url: string; type?: ResourceType }>) => ({
    resources,
    when: 'immediate' as const
  }),

  // 뷰포트 진입 시 프리로드
  onView: (resources: Array<{ url: string; type?: ResourceType }>) => ({
    resources,
    when: 'onView' as const
  }),

  // 사용자 상호작용 후 프리로드
  onInteraction: (resources: Array<{ url: string; type?: ResourceType }>) => ({
    resources,
    when: 'onInteraction' as const
  }),

  // 네트워크 상태 기반 프리로드
  adaptive: (resources: Array<{ url: string; type?: ResourceType }>) => ({
    resources,
    when: 'adaptive' as const
  })
};

// 리소스 우선순위 기반 프리로드
export function prioritizeResources(
  resources: Array<{ url: string; type?: ResourceType; priority: number }>,
  maxResources: number = 10
): Array<{ url: string; type?: ResourceType; priority: number }> {
  // 우선순위에 따라 정렬
  const sorted = [...resources].sort((a, b) => b.priority - a.priority);
  return sorted.slice(0, maxResources);
}