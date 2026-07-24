"use client";
// BundleOptimizer: dead code / unused import / chunk optimization
class BundleOptimizer {
  private static instance: BundleOptimizer;
  private deadCodeMap: Map<string, boolean> = new Map();
  private unusedImports: Set<string> = new Set();
  private optimizedChunks: Map<string, string> = new Map();

  public static getInstance(): BundleOptimizer {
    if (!BundleOptimizer.instance) {
      BundleOptimizer.instance = new BundleOptimizer();
    }
    return BundleOptimizer.instance;
  }

  // ?¬ì©?ì? ?ë ì½ë ?ì?
  public detectDeadCode(code: string, usedSymbols: string[]): string[] {
    const unusedSymbols: string[] = [];
    
    // ê°ë¨???¬ë³¼ ë¶ì (?¤ì  êµ¬í?ì??AST ê¸°ë° ë¶ì ?ì)
    for (const symbol of this.extractSymbols(code)) {
      if (!usedSymbols.includes(symbol)) {
        unusedSymbols.push(symbol);
        this.deadCodeMap.set(symbol, true);
      }
    }
    
    return unusedSymbols;
  }

  // ?¬ë³¼ ì¶ì¶ (ê°ë¨??êµ¬í)
  private extractSymbols(code: string): string[] {
    const symbols: string[] = [];
    
    // ë³??? ì¸ ì¶ì¶
    const varMatches = code.match(/(?:const|let|var)\s+(\w+)/g);
    if (varMatches) {
      for (const match of varMatches) {
        const name = match.split(/\s+/)[1];
        if (name) symbols.push(name);
      }
    }
    
    // ?¨ì ? ì¸ ì¶ì¶
    const funcMatches = code.match(/(?:function|const|let)\s+(\w+)\s*(?:=|\()/g);
    if (funcMatches) {
      for (const match of funcMatches) {
        const parts = match.trim().split(/\s+/);
        if (parts.length >= 2) {
          const name = parts[1].replace(/[=(]/g, '');
          if (name) symbols.push(name);
        }
      }
    }
    
    // ?´ë??? ì¸ ì¶ì¶
    const classMatches = code.match(/class\s+(\w+)/g);
    if (classMatches) {
      for (const match of classMatches) {
        const name = match.split(/\s+/)[1];
        if (name) symbols.push(name);
      }
    }
    
    return [...new Set(symbols)]; // ì¤ë³µ ?ê±°
  }

  // ?¬ì©?ì? ?ë import ?ì?
  public detectUnusedImports(code: string, usedImports: string[]): string[] {
    const unusedImports: string[] = [];
    
    // Import ë¬?ì¶ì¶
    const importMatches = code.match(/import\s+[{*]\s*([^}]+)\s*[}]\s+from\s+['"][^'"]+['"]/g);
    if (importMatches) {
      for (const importStmt of importMatches) {
        const importedItems = importStmt
          .replace(/import\s+[{*]\s*/, '')
          .replace(/\s*[}]\s+from\s+.*/, '')
          .split(',')
          .map(item => item.trim())
          .map(item => item.replace(/^(\w+)(?:\s+as\s+\w+)?$/, '$1'));
        
        for (const item of importedItems) {
          if (!usedImports.includes(item)) {
            unusedImports.push(item);
            this.unusedImports.add(item);
          }
        }
      }
    }
    
    return unusedImports;
  }

  // ì½ë ìµì ??  public optimizeCode(code: string, options: { removeDeadCode?: boolean; minify?: boolean; treeshake?: boolean } = {}): string {
    let optimized = code;
    
    if (options.removeDeadCode) {
      optimized = this.removeDeadCode(optimized);
    }
    
    if (options.treeshake) {
      optimized = this.treeShake(optimized);
    }
    
    if (options.minify) {
      optimized = this.minify(optimized);
    }
    
    return optimized;
  }

  // ?¬ì©?ì? ?ë ì½ë ?ê±°
  private removeDeadCode(code: string): string {
    // ?¤ì  êµ¬í?ì??ASTë¥??¬ì©?ì¬ ?í??ë¶ì ?ì
    // ???ì ?ì??ê°ë¨???ê·??ê¸°ë° ?ê±°
    let result = code;
    
    // ?¬ì©?ì? ?ë ë³???ê±°
    for (const [symbol, isDead] of this.deadCodeMap) {
      if (isDead) {
        // ë³??? ì¸ ?ê±° (?í???ê±°ë¥??í´?ë AST ë¶ì ?ì)
        const varPattern = new RegExp(`(?:const|let|var)\\s+${symbol}\\s*=[^;]+;?`, 'g');
        result = result.replace(varPattern, '');
      }
    }
    
    return result;
  }

  // Tree Shaking (ê¸°ë³¸ êµ¬í)
  private treeShake(code: string): string {
    // ?¬ì©?ì? ?ë export ?ê±°
    const exportPattern = /export\s+(?:const|let|var|function|class)\s+(\w+)/g;
    const usedExports = new Set<string>();
    
    // ?¬ì© ì¤ì¸ ?¬ë³¼??ê¸°ë°?¼ë¡ ?ì??exportë§?? ì?
    // ??ë¶ë¶ì? ?¤ì  êµ¬í?ì ??ë³µì¡??ë¶ì???ì
    
    return code;
  }

  // ì½ë ìµì??  private minify(code: string): string {
    return code
      .replace(/\s+/g, ' ')           // ê³µë°± ?¬ë¬ ê°ë? ?ëë¡?      .replace(/;\s+/g, ';')          // ?¸ë?ì½ë¡  ??ê³µë°± ?ê±°
      .replace(/:\s+/g, ':')          // ì½ë¡  ??ê³µë°± ?ê±°
      .replace(/{\s+/g, '{')          // ?¬ë ê´í¸ ??ê³µë°± ?ê±°
      .replace(/\s+}/g, '}')          // ?«ë ê´í¸ ??ê³µë°± ?ê±°
      .replace(/,\s+/g, ',')          // ì½ë¡  ??ê³µë°± ?ê±°
      .replace(/\s*>\s*/g, '>')       // ?ê·¸ ê³µë°± ?ê±°
      .replace(/\/\*[\s\S]*?\*\//g, '') // ì£¼ì ?ê±°
      .replace(/\/\/[^\n\r]*/g, '')    // ??ì¤?ì£¼ì ?ê±°
      .trim();
  }

  // ë²ë¤ ë¶í 
  public splitBundle(code: string, maxSize: number = 1024 * 1024): string[] { // ê¸°ë³¸ 1MB
    if (code.length <= maxSize) {
      return [code];
    }
    
    // ê°ë¨??ë¶í  ?ëµ - ê¸°ë¥ë³ë¡ ?ëê¸?    const chunks: string[] = [];
    let currentChunk = '';
    
    // ì½ëë¥??¼ë¦¬???¨ìë¡?ë¶í  (?¤ì  êµ¬í?ì??AST ê¸°ë° ë¶í  ?ì)
    const lines = code.split('\n');
    for (const line of lines) {
      if (currentChunk.length + line.length > maxSize && currentChunk) {
        chunks.push(currentChunk);
        currentChunk = line + '\n';
      } else {
        currentChunk += line + '\n';
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }

  // ì½ë ë¶ì
  public analyzeCode(code: string): BundleAnalysis {
    const analysis: BundleAnalysis = {
      size: code.length,
      gzipSize: 0, // ?¤ì  êµ¬í?ì??gzip ?ì¶ ?¬ê¸° ê³ì°
      dependencies: this.extractDependencies(code),
      exports: this.extractExports(code),
      imports: this.extractImports(code),
      symbols: this.extractSymbols(code),
      duplicateSymbols: this.findDuplicates(code),
      treeShakable: true // ê¸°ë³¸?ì¼ë¡?tree shakable?¼ë¡ ê°??    };
    
    return analysis;
  }

  // ?ì¡´??ì¶ì¶
  private extractDependencies(code: string): string[] {
    const deps: string[] = [];
    const importMatches = code.match(/from\s+['"]([^'"]+)['"]/g);
    
    if (importMatches) {
      for (const match of importMatches) {
        const dep = match.replace(/from\s+['"]/, '').replace(/['"]/, '');
        if (dep) deps.push(dep);
      }
    }
    
    return [...new Set(deps)];
  }

  // exports ì¶ì¶
  private extractExports(code: string): string[] {
    const exports: string[] = [];
    const exportMatches = code.match(/export\s+(?:const|let|var|function|class)\s+(\w+)/g);
    
    if (exportMatches) {
      for (const match of exportMatches) {
        const exp = match.split(/\s+/)[1];
        if (exp) exports.push(exp);
      }
    }
    
    return exports;
  }

  // imports ì¶ì¶
  private extractImports(code: string): string[] {
    const imports: string[] = [];
    const importMatches = code.match(/import\s+[{*]\s*([^}]+)\s*[}]\s+from\s+['"][^'"]+['"]/g);
    
    if (importMatches) {
      for (const match of importMatches) {
        const importedItems = match
          .replace(/import\s+[{*]\s*/, '')
          .replace(/\s*[}]\s+from\s+.*/, '')
          .split(',')
          .map(item => item.trim())
          .map(item => item.replace(/^(\w+)(?:\s+as\s+\w+)?$/, '$1'));
        
        imports.push(...importedItems);
      }
    }
    
    return imports;
  }

  // ì¤ë³µ ?¬ë³¼ ?ì?
  private findDuplicates(code: string): string[] {
    const symbols = this.extractSymbols(code);
    const duplicates: string[] = [];
    const seen = new Set<string>();
    
    for (const symbol of symbols) {
      if (seen.has(symbol)) {
        duplicates.push(symbol);
      } else {
        seen.add(symbol);
      }
    }
    
    return duplicates;
  }

  // ë²ë¤ ìµì ???µê³
  public getBundleStats(originalCode: string, optimizedCode: string): BundleStats {
    return {
      originalSize: originalCode.length,
      optimizedSize: optimizedCode.length,
      reductionPercentage: ((originalCode.length - optimizedCode.length) / originalCode.length) * 100,
      originalGzipSize: 0, // ?¤ì  êµ¬í?ì??gzip ?¬ê¸° ê³ì°
      optimizedGzipSize: 0,
      savings: originalCode.length - optimizedCode.length
    };
  }

  // ì½ë ë¶í  ?ëµ
  public determineSplitStrategy(dependencies: string[]): SplitStrategy {
    // ì£¼ì ?ì¡´??ê¸°ë° ë¶í  ?ëµ ê²°ì 
    const vendorDeps = dependencies.filter(dep => 
      dep.includes('node_modules') || 
      ['react', 'lodash', 'moment', 'axios', '@mui', '@emotion'].some(vendor => dep.includes(vendor))
    );
    
    const appDeps = dependencies.filter(dep => !vendorDeps.includes(dep));
    
    return {
      vendorChunk: vendorDeps,
      appChunk: appDeps,
      commonChunk: this.findCommonDependencies(dependencies)
    };
  }

  private findCommonDependencies(dependencies: string[]): string[] {
    // ê³µíµ ?ì¡´???ì? (ê°ë¨??êµ¬í)
    const dependencyCount: Record<string, number> = {};
    
    for (const dep of dependencies) {
      dependencyCount[dep] = (dependencyCount[dep] || 0) + 1;
    }
    
    return Object.entries(dependencyCount)
      .filter(([_, count]) => count > 1)
      .map(([dep, _]) => dep);
  }
}

interface BundleAnalysis {
  size: number;
  gzipSize: number;
  dependencies: string[];
  exports: string[];
  imports: string[];
  symbols: string[];
  duplicateSymbols: string[];
  treeShakable: boolean;
}

interface BundleStats {
  originalSize: number;
  optimizedSize: number;
  reductionPercentage: number;
  originalGzipSize: number;
  optimizedGzipSize: number;
  savings: number;
}

interface SplitStrategy {
  vendorChunk: string[];
  appChunk: string[];
  commonChunk: string[];
}

// ë²ë¤ ìµì ????import { useState, useEffect, useCallback } from 'react';

export function useBundleOptimizer() {
  const [optimizer] = useState(() => BundleOptimizer.getInstance());
  const [analysis, setAnalysis] = useState<BundleAnalysis | null>(null);
  const [stats, setStats] = useState<BundleStats | null>(null);

  const optimizeCode = useCallback((code: string, options = {}) => {
    return optimizer.optimizeCode(code, options);
  }, [optimizer]);

  const analyzeCode = useCallback((code: string) => {
    const result = optimizer.analyzeCode(code);
    setAnalysis(result);
    return result;
  }, [optimizer]);

  const splitBundle = useCallback((code: string, maxSize: number = 1024 * 1024) => {
    return optimizer.splitBundle(code, maxSize);
  }, [optimizer]);

  const getBundleStats = useCallback((originalCode: string, optimizedCode: string) => {
    const bundleStats = optimizer.getBundleStats(originalCode, optimizedCode);
    setStats(bundleStats);
    return bundleStats;
  }, [optimizer]);

  return {
    optimizeCode,
    analyzeCode,
    splitBundle,
    getBundleStats,
    analysis,
    stats
  };
}

// ë²ë¤ ìµì ??ì»´í¬?í¸
export function BundleOptimizerComponent({
  children,
  onOptimize,
  enabled = true
}: {
  children: React.ReactNode;
  onOptimize?: (optimizedCode: string) => void;
  enabled?: boolean;
}) {
  const [optimized, setOptimized] = useState(false);
  const { optimizeCode } = useBundleOptimizer();

  useEffect(() => {
    if (enabled && onOptimize) {
      // ?¤ì  êµ¬í?ì???ì¬ ì»´í¬?í¸??ì½ëë¥?ìµì ??      // ?¬ê¸°?ë ?ì ë¡??ë? ì½ë ?¬ì©
      const dummyCode = `
        import React from 'react';
        import { useState } from 'react';
        import { useEffect } from 'react';
        
        // ?¬ì©?ì? ?ë ë³??        const unusedVar = 'unused';
        function unusedFunction() { return 'unused'; }
        
        export function OptimizedComponent() {
          const [state, setState] = useState(0);
          
          useEffect(() => {
          }, []);
          
          return <div>Hello World</div>;
        }
      `;
      
      const optimizedCode = optimizeCode(dummyCode, { 
        removeDeadCode: true, 
        minify: true, 
        treeshake: true 
      });
      
      onOptimize(optimizedCode);
      setOptimized(true);
    }
  }, [enabled, onOptimize, optimizeCode]);

  return <>{children}</>;
}

// ë²ë¤ ë¶í  ì»´í¬?í¸
export function CodeSplitter({
  children,
  maxSize = 1024 * 1024,
  onSplit
}: {
  children: React.ReactNode;
  maxSize?: number;
  onSplit?: (chunks: string[]) => void;
}) {
  const { splitBundle } = useBundleOptimizer();

  useEffect(() => {
    if (onSplit) {
      // ?¤ì  êµ¬í?ì???ì¬ ?ì´ì§/ëª¨ë??ì½ëë¥?ë¶í 
      const dummyCode = `
        // ê¸?ì½ë ë¸ë¡
        function function1() { /* ... */ }
        function function2() { /* ... */ }
        function function3() { /* ... */ }
        // ... ??ë§ì? ì½ë
      `;
      
      const chunks = splitBundle(dummyCode, maxSize);
      onSplit(chunks);
    }
  }, [maxSize, onSplit, splitBundle]);

  return <>{children}</>;
}

// ë²ë¤ ìµì ??ì»¨í?¤í¸
import { createContext, useContext } from 'react';

interface BundleOptimizationContextType {
  optimizeCode: (code: string, options?: any) => string;
  analyzeCode: (code: string) => BundleAnalysis;
  splitBundle: (code: string, maxSize?: number) => string[];
  getBundleStats: (originalCode: string, optimizedCode: string) => BundleStats;
  analysis: BundleAnalysis | null;
  stats: BundleStats | null;
}

const BundleOptimizationContext = createContext<BundleOptimizationContextType | undefined>(undefined);

export function BundleOptimizationProvider({ children }: { children: React.ReactNode }) {
  const bundleOptimizer = useBundleOptimizer();

  return (
    <BundleOptimizationContext.Provider value={bundleOptimizer}>
      {children}
    </BundleOptimizationContext.Provider>
  );
}

export function useBundleOptimization() {
  const context = useContext(BundleOptimizationContext);
  if (!context) {
    throw new Error('useBundleOptimization must be used within a BundleOptimizationProvider');
  }
  return context;
}

// ?ë² ?¬ì´??ë²ë¤ ìµì ??? í¸ë¦¬í°
export const serverSideBundleOptimization = {
  // ?ë²?ì ì½ë ìµì ??  optimize: (code: string, options: { removeDeadCode?: boolean; minify?: boolean; treeshake?: boolean } = {}) => {
    const optimizer = BundleOptimizer.getInstance();
    return optimizer.optimizeCode(code, options);
  },

  // ?ë²?ì ì½ë ë¶ì
  analyze: (code: string) => {
    const optimizer = BundleOptimizer.getInstance();
    return optimizer.analyzeCode(code);
  },

  // ?ë²?ì ë²ë¤ ë¶í 
  split: (code: string, maxSize: number = 1024 * 1024) => {
    const optimizer = BundleOptimizer.getInstance();
    return optimizer.splitBundle(code, maxSize);
  }
};

// ë²ë¤ ìµì ???ëµ
export const BundleOptimizationStrategies = {
  // ë¹ë ?ê° ìµì ??  buildTime: {
    treeshaking: true,
    minification: true,
    scopeHoisting: true,
    codeSplitting: true
  },

  // ?°í???ìµì ??  runtime: {
    lazyLoading: true,
    prefetching: true,
    caching: true,
    compression: true
  },

  // ?¬ì©??ê²½í ìµì ??  ux: {
    criticalChunk: true,
    progressiveLoading: true,
    preloadImportant: true
  }
};

// ë²ë¤ ?¬ê¸° ?í ? í¸ë¦¬í°
export function checkBundleSize(code: string, maxSize: number): boolean {
  return code.length <= maxSize;
}

// ë²ë¤ ê²½ê³  ? í¸ë¦¬í°
export function getBundleWarnings(analysis: BundleAnalysis, thresholds: { size?: number; duplicateSymbols?: number } = {}) {
  const warnings: string[] = [];
  
  if (thresholds.size && analysis.size > thresholds.size) {
    warnings.push(`ë²ë¤ ?¬ê¸°ê° ${analysis.size}ë°ì´?¸ë¡, ê¶ì¥ ?¬ê¸°(${thresholds.size}ë°ì´??ë¥?ì´ê³¼?ìµ?ë¤.`);
  }
  
  if (thresholds.duplicateSymbols && analysis.duplicateSymbols.length > thresholds.duplicateSymbols) {
    warnings.push(`${analysis.duplicateSymbols.length}ê°ì ì¤ë³µ ?¬ë³¼??ë°ê²¬?ì?µë??`);
  }
  
  return warnings;
}