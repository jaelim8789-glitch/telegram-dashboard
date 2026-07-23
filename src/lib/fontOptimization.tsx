"use client";
// ?°íŠ¸ ë¡œë”© ?„ëµ ?´ë˜??class FontOptimizer {
  private static instance: FontOptimizer;
  private loadedFonts: Set<string> = new Set();
  private fontStatus: Map<string, 'loading' | 'loaded' | 'error'> = new Map();
  private observers: Array<(fontFamily: string, status: 'loading' | 'loaded' | 'error') => void> = [];

  // ?±ê????¸ìŠ¤?´ìŠ¤ ê°€?¸ì˜¤ê¸?  public static getInstance(): FontOptimizer {
    if (!FontOptimizer.instance) {
      FontOptimizer.instance = new FontOptimizer();
    }
    return FontOptimizer.instance;
  }

  // ?°íŠ¸ ë¡œë“œ ?íƒœ ë³€ê²?ê´€ì°?  public addObserver(observer: (fontFamily: string, status: 'loading' | 'loaded' | 'error') => void): () => void {
    this.observers.push(observer);
    
    return () => {
      this.observers = this.observers.filter(obs => obs !== observer);
    };
  }

  // ?°íŠ¸ ë¡œë“œ
  public async loadFont(fontFamily: string, fontSource: string, fontDisplay: 'auto' | 'block' | 'swap' | 'fallback' | 'optional' = 'swap'): Promise<boolean> {
    if (this.loadedFonts.has(fontFamily)) {
      return true;
    }

    if (this.fontStatus.has(fontFamily) && this.fontStatus.get(fontFamily) === 'loading') {
      // ?´ë? ë¡œë”© ì¤‘ì¸ ?°íŠ¸??ê¸°ë‹¤ë¦?      return new Promise((resolve) => {
        const unsubscribe = this.addObserver((observedFont, status) => {
          if (observedFont === fontFamily && status === 'loaded') {
            unsubscribe();
            resolve(true);
          } else if (observedFont === fontFamily && status === 'error') {
            unsubscribe();
            resolve(false);
          }
        });
      });
    }

    this.fontStatus.set(fontFamily, 'loading');
    this.notifyObservers(fontFamily, 'loading');

    try {
      // CSS Font Loading API ?¬ìš©
      const fontFace = new FontFace(fontFamily, fontSource, { display: fontDisplay });
      document.fonts.add(fontFace);
      
      await fontFace.load();
      
      this.loadedFonts.add(fontFamily);
      this.fontStatus.set(fontFamily, 'loaded');
      this.notifyObservers(fontFamily, 'loaded');
      
      return true;
    } catch (error) {
      console.error(`Font loading failed for ${fontFamily}:`, error);
      this.fontStatus.set(fontFamily, 'error');
      this.notifyObservers(fontFamily, 'error');
      
      return false;
    }
  }

  // ?¬ëŸ¬ ?°íŠ¸ ?™ì‹œ??ë¡œë“œ
  public async loadFonts(fonts: Array<{ fontFamily: string; fontSource: string; fontDisplay?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional' }>): Promise<boolean[]> {
    const results = await Promise.all(
      fonts.map(font => this.loadFont(font.fontFamily, font.fontSource, font.fontDisplay || 'swap'))
    );
    
    return results;
  }

  // ?°íŠ¸ ë¡œë“œ ?íƒœ ?•ì¸
  public isFontLoaded(fontFamily: string): boolean {
    return this.loadedFonts.has(fontFamily);
  }

  // ?°íŠ¸ ë¡œë“œ ?€ê¸?  public waitForFont(fontFamily: string): Promise<boolean> {
    if (this.isFontLoaded(fontFamily)) {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      const unsubscribe = this.addObserver((observedFont, status) => {
        if (observedFont === fontFamily) {
          unsubscribe();
          resolve(status === 'loaded');
        }
      });
    });
  }

  // ?°íŠ¸ ë¡œë“œ ?œê°„ ì¸¡ì •
  public async measureFontLoadTime(fontFamily: string, fontSource: string): Promise<number> {
    const startTime = performance.now();
    const success = await this.loadFont(fontFamily, fontSource);
    const endTime = performance.now();
    
    return success ? endTime - startTime : -1;
  }

  // FOIT/FOUT ë°©ì?ë¥??„í•œ ?°íŠ¸ ?„ëµ
  public applyFontStrategy(strategy: 'swap' | 'fallback' | 'optional' = 'swap'): void {
    // ?°íŠ¸ ?”ìŠ¤?Œë ˆ???„ëµ ?ìš©
    const style = document.createElement('style');
    style.textContent = `
      html {
        font-display: ${strategy};
      }
      
      @media (prefers-reduced-motion: no-preference) {
        * {
          font-display: ${strategy};
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  // ?°íŠ¸ ?„ë¦¬ë¡œë“œ
  public preloadFont(fontFamily: string, fontSource: string): void {
    if (this.loadedFonts.has(fontFamily)) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.type = 'font/woff2';
    link.href = fontSource;
    link.crossOrigin = 'anonymous';
    
    document.head.appendChild(link);
  }

  // ?°íŠ¸ ë¡œë“œ ?„ë£Œ ???¤í–‰??ì½œë°± ?±ë¡
  public onFontReady(fontFamily: string, callback: () => void): void {
    if (this.isFontLoaded(fontFamily)) {
      callback();
      return;
    }

    const unsubscribe = this.addObserver((observedFont, status) => {
      if (observedFont === fontFamily && status === 'loaded') {
        unsubscribe();
        callback();
      }
    });
  }

  private notifyObservers(fontFamily: string, status: 'loading' | 'loaded' | 'error'): void {
    this.observers.forEach(observer => observer(fontFamily, status));
  }
}

// ?°íŠ¸ ë¡œë”© ?„ëµ ??import { useState, useEffect, useCallback } from 'react';

export function useFontOptimizer() {
  const [optimizer] = useState(() => FontOptimizer.getInstance());
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());
  const [loadingStatus, setLoadingStatus] = useState<Map<string, 'loading' | 'loaded' | 'error'>>(new Map());

  useEffect(() => {
    const unsubscribe = optimizer.addObserver((fontFamily, status) => {
      setLoadedFonts(prev => {
        const newSet = new Set(prev);
        if (status === 'loaded') {
          newSet.add(fontFamily);
        } else if (status === 'error') {
          newSet.delete(fontFamily);
        }
        return newSet;
      });

      setLoadingStatus(prev => {
        const newMap = new Map(prev);
        newMap.set(fontFamily, status);
        return newMap;
      });
    });

    return unsubscribe;
  }, [optimizer]);

  const loadFont = useCallback(async (
    fontFamily: string,
    fontSource: string,
    fontDisplay: 'auto' | 'block' | 'swap' | 'fallback' | 'optional' = 'swap'
  ) => {
    return optimizer.loadFont(fontFamily, fontSource, fontDisplay);
  }, [optimizer]);

  const loadFonts = useCallback(async (
    fonts: Array<{ fontFamily: string; fontSource: string; fontDisplay?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional' }>
  ) => {
    return optimizer.loadFonts(fonts);
  }, [optimizer]);

  const isFontLoaded = useCallback((fontFamily: string) => {
    return optimizer.isFontLoaded(fontFamily);
  }, [optimizer]);

  const waitForFont = useCallback((fontFamily: string) => {
    return optimizer.waitForFont(fontFamily);
  }, [optimizer]);

  const measureFontLoadTime = useCallback(async (fontFamily: string, fontSource: string) => {
    return optimizer.measureFontLoadTime(fontFamily, fontSource);
  }, [optimizer]);

  const preloadFont = useCallback((fontFamily: string, fontSource: string) => {
    optimizer.preloadFont(fontFamily, fontSource);
  }, [optimizer]);

  return {
    loadFont,
    loadFonts,
    isFontLoaded,
    waitForFont,
    measureFontLoadTime,
    preloadFont,
    loadedFonts: Array.from(loadedFonts),
    loadingStatus: Object.fromEntries(loadingStatus)
  };
}

// ?°íŠ¸ ë¡œë”© ?„ëµ ì»´í¬?ŒíŠ¸
export function FontLoader({
  fonts,
  fallbackFont = 'sans-serif',
  children
}: {
  fonts: Array<{ fontFamily: string; fontSource: string; fontDisplay?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional' }>;
  fallbackFont?: string;
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const { loadFonts, loadedFonts } = useFontOptimizer();

  useEffect(() => {
    const loadAllFonts = async () => {
      await loadFonts(fonts);
      setReady(true);
    };

    loadAllFonts();
  }, [fonts, loadFonts]);

  // ëª¨ë“  ?°íŠ¸ê°€ ë¡œë“œ?˜ì—ˆ?”ì? ?•ì¸
  const allFontsLoaded = fonts.every(font => loadedFonts.includes(font.fontFamily));

  return (
    <div 
      className={allFontsLoaded ? 'font-loaded' : 'font-loading'}
      style={{
        fontFamily: allFontsLoaded ? fonts.map(f => f.fontFamily).join(', ') : fallbackFont
      }}
    >
      {children}
    </div>
  );
}

// FOIT/FOUT ë°©ì?ë¥??„í•œ CSS ?´ë˜???ì„±ê¸?export function createFontSwapCSS(fontFamily: string, fallbackFont: string = 'sans-serif'): string {
  return `
    @font-face {
      font-family: '${fontFamily}';
      src: local('${fontFamily}');
      font-display: swap;
    }
    
    .font-loaded {
      font-family: '${fontFamily}', ${fallbackFont};
    }
    
    .font-loading {
      font-family: ${fallbackFont};
    }
    
    /* ? ë‹ˆë©”ì´?˜ìœ¼ë¡??°íŠ¸ ?„í™˜ ë¶€?œëŸ½ê²??˜ê¸° */
    .font-loaded, .font-loading {
      transition: font-family 0.1s ease-in-out;
    }
  `;
}

// ?°íŠ¸ ë¡œë”© ?íƒœ ê´€ë¦?ì»¨í…?¤íŠ¸
import { createContext, useContext } from 'react';

interface FontOptimizationContextType {
  loadFont: (fontFamily: string, fontSource: string, fontDisplay?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional') => Promise<boolean>;
  loadFonts: (fonts: Array<{ fontFamily: string; fontSource: string; fontDisplay?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional' }>) => Promise<boolean[]>;
  isFontLoaded: (fontFamily: string) => boolean;
  waitForFont: (fontFamily: string) => Promise<boolean>;
  preloadFont: (fontFamily: string, fontSource: string) => void;
  loadedFonts: string[];
  loadingStatus: Record<string, 'loading' | 'loaded' | 'error'>;
}

const FontOptimizationContext = createContext<FontOptimizationContextType | undefined>(undefined);

export function FontOptimizationProvider({ children }: { children: React.ReactNode }) {
  const fontOptimizer = useFontOptimizer();

  return (
    <FontOptimizationContext.Provider value={fontOptimizer}>
      {children}
    </FontOptimizationContext.Provider>
  );
}

export function useFontOptimization() {
  const context = useContext(FontOptimizationContext);
  if (!context) {
    throw new Error('useFontOptimization must be used within a FontOptimizationProvider');
  }
  return context;
}

// ?°íŠ¸ ë¡œë”© ?„ëµ ? í‹¸ë¦¬í‹°
export const FontLoadingStrategies = {
  // Swap ?„ëµ: FOUT (Flash of Unstyled Text) ?ˆìš©
  swap: (fontFamily: string) => ({
    fontFamily,
    fontDisplay: 'swap' as const
  }),

  // Block ?„ëµ: FOIT (Flash of Invisible Text) - ì§§ì? ë¸”ë¡ ?œê°„ ??FOUT
  block: (fontFamily: string) => ({
    fontFamily,
    fontDisplay: 'block' as const
  }),

  // Fallback ?„ëµ: ë§¤ìš° ì§§ì? ë¸”ë¡ ?œê°„ ??ì¦‰ì‹œ fallback
  fallback: (fontFamily: string) => ({
    fontFamily,
    fontDisplay: 'fallback' as const
  }),

  // Optional ?„ëµ: ?°íŠ¸ ë¡œë“œ ?¤íŒ¨ ??fallback ?¬ìš©
  optional: (fontFamily: string) => ({
    fontFamily,
    fontDisplay: 'optional' as const
  })
};

// ?°íŠ¸ ?¬ê¸° ì¡°ì • ? í‹¸ë¦¬í‹° (?°íŠ¸ ë¡œë”© ?„í›„ ?¼ê????ˆì´?„ì›ƒ ? ì?)
export function useFontSizeAdjustment(fontSize: number, fontFamily: string) {
  const [isFontLoaded, setIsFontLoaded] = useState(false);
  const { waitForFont } = useFontOptimization();

  useEffect(() => {
    if (fontFamily) {
      waitForFont(fontFamily).then(() => setIsFontLoaded(true));
    }
  }, [fontFamily, waitForFont]);

  // ?°íŠ¸ ë¡œë”© ?„ì—??fallback ?°íŠ¸?€ ? ì‚¬???¬ê¸° ì¡°ì •
  const adjustedSize = isFontLoaded ? fontSize : fontSize * 0.95; // ?°íŠ¸???°ë¼ ì¡°ì • ?„ìš”

  return { fontSize: adjustedSize, isFontLoaded };
}