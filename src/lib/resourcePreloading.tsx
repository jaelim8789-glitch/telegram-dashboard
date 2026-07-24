"use client";
// ë¦¬ì???ë¦¬ë¡ë©/?ë¦¬?ì¹­ ?´ë??class ResourcePreloader {
  private static instance: ResourcePreloader;
  private preloadedResources: Map<string, { status: 'pending' | 'loaded' | 'error'; resource: any }> = new Map();
  private preloadQueue: Array<{ url: string; type: ResourceType; priority: number }> = [];
  private ongoingRequests: Map<string, Promise<unknown>> = new Map();
  private readonly maxConcurrentRequests: number = 6;
  private activeRequests: number = 0;

  public static getInstance(): ResourcePreloader {
    if (!ResourcePreloader.instance) {
      ResourcePreloader.instance = new ResourcePreloader();
    }
    return ResourcePreloader.instance;
  }

  // ë¦¬ì??????ì
  public async preloadResource(url: string, type: ResourceType = 'auto', priority: number = 1): Promise<boolean> {
    if (this.preloadedResources.has(url)) {
      const status = this.preloadedResources.get(url)!.status;
      return status === 'loaded';
    }

    // ?ì¼???ì²­???´ë? ì§í ì¤ì¸ ê²½ì° ê¸°ë¤ë¦?    if (this.ongoingRequests.has(url)) {
      try {
        await this.ongoingRequests.get(url);
        return true;
      } catch {
        return false;
      }
    }

    // ë¦¬ì??ë¡ë ?ì²­
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

  // ë¦¬ì????ì ?°ë¥¸ ë¡ë
  private async loadResource(url: string, type: ResourceType): Promise<unknown> {
    if (this.activeRequests >= this.maxConcurrentRequests) {
      // ìµë? ?ì ?ì²­ ??ì´ê³¼ ???ê¸?      await new Promise(resolve => setTimeout(resolve, 100));
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
          // ?ë ???ê°ì?
          const detectedType = this.detectResourceType(url);
          return await this.loadResource(url, detectedType);
      }
    } finally {
      this.activeRequests--;
    }
  }

  // ?´ë?ì§ ë¡ë
  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  // ?¤í¬ë¦½í¸ ë¡ë
  private loadScript(src: string): Promise<HTMLScriptElement> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve(script);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // ?¤í??¼ì??ë¡ë
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

  // ?°í¸ ë¡ë
  private loadFont(src: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const fontFace = new FontFace('temp', `url(${src})`, { display: 'swap' });
      fontFace.load().then(() => {
        document.fonts.add(fontFace);
        resolve(fontFace);
      }).catch(reject);
    });
  }

  // ë¹ë??ë¡ë
  private loadVideo(src: string): Promise<HTMLVideoElement> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadeddata = () => resolve(video);
      video.onerror = reject;
      video.src = src;
    });
  }

  // ?¤ë??ë¡ë
  private loadAudio(src: string): Promise<HTMLAudioElement> {
    return new Promise((resolve, reject) => {
      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      audio.onloadeddata = () => resolve(audio);
      audio.onerror = reject;
      audio.src = src;
    });
  }

  // JSON ë¡ë
  private loadJson(url: string): Promise<unknown> {
    return fetch(url).then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    });
  }

  // Fetchë¥??´ì©??ë¡ë
  private loadWithFetch(url: string): Promise<Response> {
    return fetch(url, { method: 'HEAD' }); // HEAD ?ì²­?¼ë¡ ë¦¬ì??ì¡´ì¬ ?¬ë? ?ì¸
  }

  // ë¦¬ì??????ë ê°ì?
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

  // ?¬ë¬ ë¦¬ì???ì???ë¦¬ë¡ë
  public async preloadResources(resources: Array<{ url: string; type?: ResourceType; priority?: number }>): Promise<boolean[]> {
    const results = await Promise.all(
      resources.map(resource => 
        this.preloadResource(resource.url, resource.type || 'auto', resource.priority || 1)
      )
    );
    
    return results;
  }

  // ì¡°ê±´ë¶ ?ë¦¬ë¡ë
  public async conditionalPreload(condition: boolean, resources: Array<{ url: string; type?: ResourceType }>): Promise<boolean[]> {
    if (!condition) {
      return resources.map(() => false);
    }
    
    return this.preloadResources(resources);
  }

  // ë·°í¬??ê¸°ë° ?ë¦¬ë¡ë
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

  // ?¤í¸?í¬ ?í ê¸°ë° ?ë¦¬ë¡ë
  public async preloadBasedOnConnection(resources: Array<{ url: string; type?: ResourceType }>): Promise<boolean[]> {
    if (!('connection' in navigator)) {
      // ?°ê²° ?í ?ë³´ê° ?ì¼ë©?ê¸°ë³¸ ?ëµ ?¬ì©
      return this.preloadResources(resources);
    }

    const connection = (navigator as any).connection;
    const effectiveType = connection.effectiveType;

    // ?ë¦° ?°ê²°?ì??ì¤ì ë¦¬ì?¤ë§ ?ë¦¬ë¡ë
    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      return this.preloadResources(resources.slice(0, 3)); // ?ì 3ê°ë§
    } else if (effectiveType === '3g') {
      return this.preloadResources(resources.slice(0, 6)); // ?ì 6ê°ê¹ì§
    } else {
      // ë¹ ë¥¸ ?°ê²°?ì??ëª¨ë  ë¦¬ì???ë¦¬ë¡ë
      return this.preloadResources(resources);
    }
  }

  // ë¦¬ì??ë¡ë ?í ?ì¸
  public isResourceLoaded(url: string): boolean {
    const resource = this.preloadedResources.get(url);
    return resource?.status === 'loaded';
  }

  // ë¦¬ì??ë¡ë ?ê¸?  public waitForResource(url: string): Promise<boolean> {
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

      // ìµë? ?ê¸??ê° 10ì´?      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(this.isResourceLoaded(url));
      }, 10000);
    });
  }

  // ë¦¬ì???ê±°
  public evictResource(url: string): void {
    this.preloadedResources.delete(url);
  }

  // ëª¨ë  ë¦¬ì???ê±°
  public clearAll(): void {
    this.preloadedResources.clear();
  }

  // ë¦¬ì???ë³´ ê°?¸ì¤ê¸?  public getResourceInfo(url: string): { status: 'pending' | 'loaded' | 'error'; timestamp?: number } | null {
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

// ë¦¬ì???ë¦¬ë¡ë© ??import { useState, useEffect, useCallback } from 'react';

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
    
    // ?±ê³µ??ë¦¬ì?¤ë§ ì¶ê?
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

// ë¦¬ì???ë¦¬ë¡ë© ì»´í¬?í¸
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

// ?ë¦¬?ì¹ë§??ëµ ì»´í¬?í¸
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

// ë¦¬ì???ë¦¬ë¡ë© ì»¨í?¤í¸
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

// ?¼ì°??ê¸°ë° ?ë¦¬ë¡ë© ??export function useRouterPreloading() {
  const { preloadResources } = useResourcePreloading();
  const router = useRouter(); // Next.js ?¼ì°??ê°??
  // ?¤ì ?¼ì°?¸ë? ?í ë¦¬ì???ë¦¬ë¡ë
  const prefetchRouteResources = useCallback(async (route: string) => {
    // ?¼ì°?¸ì ?ì??ë¦¬ì??URL ?ì±
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

// ë¦¬ì???ë¦¬ë¡ë© ?ëµ
export const PreloadingStrategies = {
  // ì¦ì ?ë¦¬ë¡ë
  immediate: (resources: Array<{ url: string; type?: ResourceType }>) => ({
    resources,
    when: 'immediate' as const
  }),

  // ë·°í¬??ì§ì ???ë¦¬ë¡ë
  onView: (resources: Array<{ url: string; type?: ResourceType }>) => ({
    resources,
    when: 'onView' as const
  }),

  // ?¬ì©???í¸?ì© ???ë¦¬ë¡ë
  onInteraction: (resources: Array<{ url: string; type?: ResourceType }>) => ({
    resources,
    when: 'onInteraction' as const
  }),

  // ?¤í¸?í¬ ?í ê¸°ë° ?ë¦¬ë¡ë
  adaptive: (resources: Array<{ url: string; type?: ResourceType }>) => ({
    resources,
    when: 'adaptive' as const
  })
};

// ë¦¬ì???°ì ?ì ê¸°ë° ?ë¦¬ë¡ë
export function prioritizeResources(
  resources: Array<{ url: string; type?: ResourceType; priority: number }>,
  maxResources: number = 10
): Array<{ url: string; type?: ResourceType; priority: number }> {
  // ?°ì ?ì???°ë¼ ?ë ¬
  const sorted = [...resources].sort((a, b) => b.priority - a.priority);
  return sorted.slice(0, maxResources);
}