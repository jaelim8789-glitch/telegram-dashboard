// 폰트 로딩 전략 클래스
class FontOptimizer {
  private static instance: FontOptimizer;
  private loadedFonts: Set<string> = new Set();
  private fontStatus: Map<string, 'loading' | 'loaded' | 'error'> = new Map();
  private observers: Array<(fontFamily: string, status: 'loading' | 'loaded' | 'error') => void> = [];

  // 싱글톤 인스턴스 가져오기
  public static getInstance(): FontOptimizer {
    if (!FontOptimizer.instance) {
      FontOptimizer.instance = new FontOptimizer();
    }
    return FontOptimizer.instance;
  }

  // 폰트 로드 상태 변경 관찰
  public addObserver(observer: (fontFamily: string, status: 'loading' | 'loaded' | 'error') => void): () => void {
    this.observers.push(observer);
    
    return () => {
      this.observers = this.observers.filter(obs => obs !== observer);
    };
  }

  // 폰트 로드
  public async loadFont(fontFamily: string, fontSource: string, fontDisplay: 'auto' | 'block' | 'swap' | 'fallback' | 'optional' = 'swap'): Promise<boolean> {
    if (this.loadedFonts.has(fontFamily)) {
      return true;
    }

    if (this.fontStatus.has(fontFamily) && this.fontStatus.get(fontFamily) === 'loading') {
      // 이미 로딩 중인 폰트는 기다림
      return new Promise((resolve) => {
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
      // CSS Font Loading API 사용
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

  // 여러 폰트 동시에 로드
  public async loadFonts(fonts: Array<{ fontFamily: string; fontSource: string; fontDisplay?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional' }>): Promise<boolean[]> {
    const results = await Promise.all(
      fonts.map(font => this.loadFont(font.fontFamily, font.fontSource, font.fontDisplay || 'swap'))
    );
    
    return results;
  }

  // 폰트 로드 상태 확인
  public isFontLoaded(fontFamily: string): boolean {
    return this.loadedFonts.has(fontFamily);
  }

  // 폰트 로드 대기
  public waitForFont(fontFamily: string): Promise<boolean> {
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

  // 폰트 로드 시간 측정
  public async measureFontLoadTime(fontFamily: string, fontSource: string): Promise<number> {
    const startTime = performance.now();
    const success = await this.loadFont(fontFamily, fontSource);
    const endTime = performance.now();
    
    return success ? endTime - startTime : -1;
  }

  // FOIT/FOUT 방지를 위한 폰트 전략
  public applyFontStrategy(strategy: 'swap' | 'fallback' | 'optional' = 'swap'): void {
    // 폰트 디스플레이 전략 적용
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

  // 폰트 프리로드
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

  // 폰트 로드 완료 시 실행할 콜백 등록
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

// 폰트 로딩 전략 훅
import { useState, useEffect, useCallback } from 'react';

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

// 폰트 로딩 전략 컴포넌트
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

  // 모든 폰트가 로드되었는지 확인
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

// FOIT/FOUT 방지를 위한 CSS 클래스 생성기
export function createFontSwapCSS(fontFamily: string, fallbackFont: string = 'sans-serif'): string {
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
    
    /* 애니메이션으로 폰트 전환 부드럽게 하기 */
    .font-loaded, .font-loading {
      transition: font-family 0.1s ease-in-out;
    }
  `;
}

// 폰트 로딩 상태 관리 컨텍스트
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

// 폰트 로딩 전략 유틸리티
export const FontLoadingStrategies = {
  // Swap 전략: FOUT (Flash of Unstyled Text) 허용
  swap: (fontFamily: string) => ({
    fontFamily,
    fontDisplay: 'swap' as const
  }),

  // Block 전략: FOIT (Flash of Invisible Text) - 짧은 블록 시간 후 FOUT
  block: (fontFamily: string) => ({
    fontFamily,
    fontDisplay: 'block' as const
  }),

  // Fallback 전략: 매우 짧은 블록 시간 후 즉시 fallback
  fallback: (fontFamily: string) => ({
    fontFamily,
    fontDisplay: 'fallback' as const
  }),

  // Optional 전략: 폰트 로드 실패 시 fallback 사용
  optional: (fontFamily: string) => ({
    fontFamily,
    fontDisplay: 'optional' as const
  })
};

// 폰트 크기 조정 유틸리티 (폰트 로딩 전후 일관된 레이아웃 유지)
export function useFontSizeAdjustment(fontSize: number, fontFamily: string) {
  const [isFontLoaded, setIsFontLoaded] = useState(false);
  const { waitForFont } = useFontOptimization();

  useEffect(() => {
    if (fontFamily) {
      waitForFont(fontFamily).then(() => setIsFontLoaded(true));
    }
  }, [fontFamily, waitForFont]);

  // 폰트 로딩 전에는 fallback 폰트와 유사한 크기 조정
  const adjustedSize = isFontLoaded ? fontSize : fontSize * 0.95; // 폰트에 따라 조정 필요

  return { fontSize: adjustedSize, isFontLoaded };
}