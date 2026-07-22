// CSS 최적화 유틸리티 클래스
class CssOptimizer {
  private static instance: CssOptimizer;
  private criticalCssCache: Map<string, string> = new Map();
  private cssBundleCache: Map<string, string> = new Map();
  private processedSelectors: Set<string> = new Set();

  public static getInstance(): CssOptimizer {
    if (!CssOptimizer.instance) {
      CssOptimizer.instance = new CssOptimizer();
    }
    return CssOptimizer.instance;
  }

  // 중요 CSS 추출 (Critical CSS)
  public extractCriticalCss(html: string, stylesheets: string[]): string {
    const criticalCss = [];
    
    // HTML에서 사용되는 선택자 추출
    const usedSelectors = this.extractUsedSelectors(html);
    
    // 스타일시트에서 중요 CSS만 추출
    for (const stylesheet of stylesheets) {
      const sheetCss = this.loadStylesheet(stylesheet);
      const criticalPart = this.filterCriticalCss(sheetCss, usedSelectors);
      criticalCss.push(criticalPart);
    }
    
    return this.minifyCss(criticalCss.join('\n'));
  }

  // HTML에서 사용되는 CSS 선택자 추출
  private extractUsedSelectors(html: string): Set<string> {
    const selectors = new Set<string>();
    
    // 클래스 추출
    const classMatches = html.match(/class="([^"]*)"/gi) || [];
    for (const match of classMatches) {
      const classes = match.substring(7, match.length - 1).split(/\s+/);
      for (const cls of classes) {
        if (cls) {
          selectors.add(`.${cls}`);
        }
      }
    }
    
    // ID 추출
    const idMatches = html.match(/id="([^"]*)"/gi) || [];
    for (const match of idMatches) {
      const id = match.substring(4, match.length - 1);
      if (id) {
        selectors.add(`#${id}`);
      }
    }
    
    // 태그 추출
    const tagMatches = html.match(/<([a-zA-Z]+)/g) || [];
    for (const match of tagMatches) {
      const tag = match.substring(1).toLowerCase();
      if (tag) {
        selectors.add(tag);
      }
    }
    
    return selectors;
  }

  // 중요 CSS 필터링
  private filterCriticalCss(css: string, usedSelectors: Set<string>): string {
    const rules = this.parseCssRules(css);
    const criticalRules = [];
    
    for (const rule of rules) {
      if (this.isCriticalRule(rule, usedSelectors)) {
        criticalRules.push(rule);
      }
    }
    
    return criticalRules.join('\n');
  }

  // CSS 규칙 파싱
  private parseCssRules(css: string): string[] {
    // 간단한 CSS 파서 - 실제 구현에서는 더 복잡한 파서를 사용해야 함
    const ruleRegex = /[^{}]*{[^{}]*}/g;
    return css.match(ruleRegex) || [];
  }

  // 중요 규칙인지 확인
  private isCriticalRule(rule: string, usedSelectors: Set<string>): boolean {
    for (const selector of usedSelectors) {
      if (rule.includes(selector)) {
        return true;
      }
    }
    return false;
  }

  // CSS 최소화
  public minifyCss(css: string): string {
    return css
      .replace(/\s+/g, ' ')           // 공백 여러 개를 하나로
      .replace(/;\s+/g, ';')          // 세미콜론 뒤 공백 제거
      .replace(/:\s+/g, ':')          // 콜론 뒤 공백 제거
      .replace(/{\s+/g, '{')          // 여는 괄호 앞 공백 제거
      .replace(/\s+}/g, '}')          // 닫는 괄호 뒤 공백 제거
      .replace(/,\s+/g, ',')          // 콤마 뒤 공백 제거
      .replace(/\s*>\s*/g, '>')       // 자식 셀렉터 공백 제거
      .replace(/\s+\+\s+/g, '+')      // 인접 형제 셀렉터 공백 제거
      .replace(/\s~\s/g, '~')         // 일반 형제 셀렉터 공백 제거
      .replace(/\/\*[\s\S]*?\*\//g, '') // 주석 제거
      .trim();
  }

  // 스타일시트 로드
  private loadStylesheet(href: string): string {
    if (this.cssBundleCache.has(href)) {
      return this.cssBundleCache.get(href)!;
    }

    // 실제 구현에서는 네트워크 요청 또는 파일 시스템 접근이 필요
    // 여기서는 예제로 빈 문자열 반환
    const cssContent = ''; // 실제 구현에서는 CSS 내용 로드
    this.cssBundleCache.set(href, cssContent);
    return cssContent;
  }

  // 중요 CSS 캐시
  public getCachedCriticalCss(key: string): string | null {
    return this.criticalCssCache.get(key) || null;
  }

  public setCachedCriticalCss(key: string, css: string): void {
    this.criticalCssCache.set(key, css);
  }

  // CSS 번들 최적화
  public optimizeCssBundle(css: string): string {
    // 중복 규칙 제거
    const deduplicated = this.removeDuplicateRules(css);
    
    // 불필요한 규칙 제거
    const cleaned = this.removeEmptyRules(deduplicated);
    
    // 최소화
    return this.minifyCss(cleaned);
  }

  // 중복 규칙 제거
  private removeDuplicateRules(css: string): string {
    const rules = this.parseCssRules(css);
    const uniqueRules = new Set<string>();
    
    for (const rule of rules) {
      const normalized = this.normalizeRule(rule);
      if (!uniqueRules.has(normalized)) {
        uniqueRules.add(normalized);
      }
    }
    
    return Array.from(uniqueRules).join('\n');
  }

  // 규칙 정규화
  private normalizeRule(rule: string): string {
    return rule
      .replace(/\s+/g, ' ')
      .replace(/:\s+/g, ':')
      .replace(/{\s+/g, '{')
      .replace(/\s+}/g, '}')
      .trim();
  }

  // 빈 규칙 제거
  private removeEmptyRules(css: string): string {
    return css
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return trimmed && !trimmed.match(/^\s*{\s*}\s*$/);
      })
      .join('\n');
  }

  // CSS 스프라이트 생성 (이미지 최적화)
  public createCssSprite(imagePaths: string[]): string {
    let spriteCss = '';
    let yPos = 0;
    
    for (const imagePath of imagePaths) {
      spriteCss += `
.sprite-${this.slugify(imagePath)} {
  background-image: url('/sprite.png');
  background-position: 0 -${yPos}px;
  width: 100px; /* 실제 이미지 너비로 변경해야 함 */
  height: 100px; /* 실제 이미지 높이로 변경해야 함 */
}
`;
      yPos += 100; // 실제 이미지 높이로 변경해야 함
    }
    
    return spriteCss;
  }

  private slugify(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // 미디어 쿼리 최적화
  public optimizeMediaQueries(css: string): string {
    // 미디어 쿼리를 한 곳으로 모으고 중복 제거
    const mediaQueries: { query: string; rules: string[] }[] = [];
    let currentMediaQuery: string | null = null;
    let currentRules: string[] = [];
    
    const lines = css.split('\n');
    
    for (const line of lines) {
      if (line.trim().startsWith('@media')) {
        if (currentMediaQuery && currentRules.length > 0) {
          mediaQueries.push({ query: currentMediaQuery, rules: currentRules });
        }
        currentMediaQuery = line.trim();
        currentRules = [];
      } else if (currentMediaQuery && line.trim().endsWith('}')) {
        currentRules.push(line.trim());
        mediaQueries.push({ query: currentMediaQuery, rules: currentRules });
        currentMediaQuery = null;
        currentRules = [];
      } else if (currentMediaQuery) {
        currentRules.push(line.trim());
      }
    }
    
    // 중복 미디어 쿼리 병합
    const mergedQueries = this.mergeMediaQueries(mediaQueries);
    
    // 최적화된 CSS 생성
    let optimizedCss = '';
    for (const mq of mergedQueries) {
      optimizedCss += `\n${mq.query} {\n${mq.rules.join('\n')}\n}`;
    }
    
    return optimizedCss;
  }

  private mergeMediaQueries(queries: { query: string; rules: string[] }[]): { query: string; rules: string[] }[] {
    const grouped = new Map<string, string[]>();
    
    for (const query of queries) {
      if (!grouped.has(query.query)) {
        grouped.set(query.query, []);
      }
      grouped.get(query.query)!.push(...query.rules);
    }
    
    return Array.from(grouped.entries()).map(([query, rules]) => ({
      query,
      rules: [...new Set(rules)] // 중복 규칙 제거
    }));
  }

  // CSS 변수 최적화
  public optimizeCssVariables(css: string): string {
    // CSS 변수를 실제 값으로 치환 (사용 빈도가 높은 변수만)
    const varPattern = /var\(--([\w-]+)\)/g;
    const matches = css.match(varPattern);
    
    if (!matches) return css;
    
    // 변수 정의 추출
    const varDefinitions: Record<string, string> = {};
    const varDefPattern = /--([\w-]+):\s*([^;}]+)/g;
    let defMatch;
    
    while ((defMatch = varDefPattern.exec(css)) !== null) {
      varDefinitions[defMatch[1]] = defMatch[2].trim();
    }
    
    // 자주 사용되는 변수 식별 및 치환
    const varUsage: Record<string, number> = {};
    for (const match of matches) {
      const varName = match.match(/--([\w-]+)/)![1];
      varUsage[varName] = (varUsage[varName] || 0) + 1;
    }
    
    // 사용 빈도가 높은 변수는 직접 치환
    let optimizedCss = css;
    for (const [varName, count] of Object.entries(varUsage)) {
      if (count > 2 && varDefinitions[varName]) { // 2번 이상 사용된 변수만 치환
        const varRegex = new RegExp(`var\\(--${varName}\\)`, 'g');
        optimizedCss = optimizedCss.replace(varRegex, varDefinitions[varName]);
      }
    }
    
    return optimizedCss;
  }
}

// CSS 최적화 훅
import { useState, useEffect, useCallback } from 'react';

export function useCssOptimizer() {
  const [optimizer] = useState(() => CssOptimizer.getInstance());
  const [criticalCss, setCriticalCss] = useState<string>('');

  const extractAndApplyCriticalCss = useCallback(async (html: string, stylesheets: string[]) => {
    const cssKey = `${html.substring(0, 100)}-${stylesheets.join('-')}`;
    let critical = optimizer.getCachedCriticalCss(cssKey);
    
    if (!critical) {
      critical = optimizer.extractCriticalCss(html, stylesheets);
      optimizer.setCachedCriticalCss(cssKey, critical);
    }
    
    setCriticalCss(critical);
    
    // 추출된 중요 CSS를 스타일 태그로 삽입
    const styleTag = document.createElement('style');
    styleTag.id = 'critical-css';
    styleTag.innerHTML = critical;
    document.head.insertBefore(styleTag, document.head.firstChild);
    
    return critical;
  }, [optimizer]);

  const optimizeCssBundle = useCallback((css: string) => {
    return optimizer.optimizeCssBundle(css);
  }, [optimizer]);

  const minifyCss = useCallback((css: string) => {
    return optimizer.minifyCss(css);
  }, [optimizer]);

  return {
    extractAndApplyCriticalCss,
    optimizeCssBundle,
    minifyCss,
    criticalCss
  };
}

// CSS 최적화 컴포넌트
export function OptimizedStyleInjector({
  children,
  stylesheets = [],
  inlineCritical = true
}: {
  children: React.ReactNode;
  stylesheets?: string[];
  inlineCritical?: boolean;
}) {
  const [injected, setInjected] = useState(false);
  const { extractAndApplyCriticalCss } = useCssOptimizer();

  useEffect(() => {
    if (!injected && inlineCritical) {
      // 현재 DOM에서 중요 CSS 추출 및 인라인
      const html = document.documentElement.outerHTML;
      extractAndApplyCriticalCss(html, stylesheets).then(() => {
        setInjected(true);
      });
    }
  }, [injected, inlineCritical, stylesheets, extractAndApplyCriticalCss]);

  return <>{children}</>;
}

// 인라인 스타일 최적화 훅
export function useInlineStyleOptimization() {
  const [optimizedStyles, setOptimizedStyles] = useState<Record<string, React.CSSProperties>>({});

  const optimizeStyle = useCallback((style: React.CSSProperties): React.CSSProperties => {
    const optimized: React.CSSProperties = {};
    
    // 불필요한 속성 제거
    for (const [key, value] of Object.entries(style)) {
      if (value !== undefined && value !== null && value !== '') {
        // 기본값과 동일한 속성 제거 (예: display: block for div)
        if (!(key === 'display' && value === 'block')) {
          optimized[key as keyof React.CSSProperties] = value;
        }
      }
    }
    
    return optimized;
  }, []);

  const getOptimizedStyle = useCallback((key: string, style: React.CSSProperties) => {
    if (optimizedStyles[key]) {
      return optimizedStyles[key];
    }
    
    const optimized = optimizeStyle(style);
    setOptimizedStyles(prev => ({ ...prev, [key]: optimized }));
    return optimized;
  }, [optimizeStyle, optimizedStyles]);

  return {
    optimizeStyle,
    getOptimizedStyle
  };
}

// CSS 최적화 컨텍스트
import { createContext, useContext } from 'react';

interface CssOptimizationContextType {
  extractAndApplyCriticalCss: (html: string, stylesheets: string[]) => Promise<string>;
  optimizeCssBundle: (css: string) => string;
  minifyCss: (css: string) => string;
  criticalCss: string;
}

const CssOptimizationContext = createContext<CssOptimizationContextType | undefined>(undefined);

export function CssOptimizationProvider({ children }: { children: React.ReactNode }) {
  const cssOptimizer = useCssOptimizer();

  return (
    <CssOptimizationContext.Provider value={cssOptimizer}>
      {children}
    </CssOptimizationContext.Provider>
  );
}

export function useCssOptimization() {
  const context = useContext(CssOptimizationContext);
  if (!context) {
    throw new Error('useCssOptimization must be used within a CssOptimizationProvider');
  }
  return context;
}

// 서버 사이드에서 사용할 CSS 최적화 유틸리티
export const serverSideCssOptimization = {
  // 서버에서 중요 CSS 추출
  extractCriticalCss: (html: string, stylesheets: string[]): string => {
    const optimizer = CssOptimizer.getInstance();
    return optimizer.extractCriticalCss(html, stylesheets);
  },

  // CSS 번들 최적화
  optimizeBundle: (css: string): string => {
    const optimizer = CssOptimizer.getInstance();
    return optimizer.optimizeCssBundle(css);
  },

  // CSS 최소화
  minify: (css: string): string => {
    const optimizer = CssOptimizer.getInstance();
    return optimizer.minifyCss(css);
  }
};

// CSS 클래스네임 최적화
export function useOptimizedClassnames() {
  const [classMap] = useState(() => new Map<string, string>());
  const [counter] = useState(() => ({ value: 0 }));

  const optimizeClassname = useCallback((classname: string): string => {
    if (classMap.has(classname)) {
      return classMap.get(classname)!;
    }

    // 간단한 해시 함수로 짧은 클래스명 생성
    let hash = 0;
    for (let i = 0; i < classname.length; i++) {
      hash = ((hash << 5) - hash) + classname.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    
    const optimizedName = `c${Math.abs(hash).toString(36)}${counter.value++}`;
    classMap.set(classname, optimizedName);
    
    return optimizedName;
  }, [classMap, counter]);

  return { optimizeClassname };
}