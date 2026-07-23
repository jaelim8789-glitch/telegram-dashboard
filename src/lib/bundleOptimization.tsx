"use client";
// 번들 최적???�래??class BundleOptimizer {
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

  // ?�용?��? ?�는 코드 ?��?
  public detectDeadCode(code: string, usedSymbols: string[]): string[] {
    const unusedSymbols: string[] = [];
    
    // 간단???�볼 분석 (?�제 구현?�서??AST 기반 분석 ?�요)
    for (const symbol of this.extractSymbols(code)) {
      if (!usedSymbols.includes(symbol)) {
        unusedSymbols.push(symbol);
        this.deadCodeMap.set(symbol, true);
      }
    }
    
    return unusedSymbols;
  }

  // ?�볼 추출 (간단??구현)
  private extractSymbols(code: string): string[] {
    const symbols: string[] = [];
    
    // 변???�언 추출
    const varMatches = code.match(/(?:const|let|var)\s+(\w+)/g);
    if (varMatches) {
      for (const match of varMatches) {
        const name = match.split(/\s+/)[1];
        if (name) symbols.push(name);
      }
    }
    
    // ?�수 ?�언 추출
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
    
    // ?�래???�언 추출
    const classMatches = code.match(/class\s+(\w+)/g);
    if (classMatches) {
      for (const match of classMatches) {
        const name = match.split(/\s+/)[1];
        if (name) symbols.push(name);
      }
    }
    
    return [...new Set(symbols)]; // 중복 ?�거
  }

  // ?�용?��? ?�는 import ?��?
  public detectUnusedImports(code: string, usedImports: string[]): string[] {
    const unusedImports: string[] = [];
    
    // Import �?추출
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

  // 코드 최적??  public optimizeCode(code: string, options: { removeDeadCode?: boolean; minify?: boolean; treeshake?: boolean } = {}): string {
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

  // ?�용?��? ?�는 코드 ?�거
  private removeDeadCode(code: string): string {
    // ?�제 구현?�서??AST�??�용?�여 ?�확??분석 ?�요
    // ???�제?�서??간단???�규??기반 ?�거
    let result = code;
    
    // ?�용?��? ?�는 변???�거
    for (const [symbol, isDead] of this.deadCodeMap) {
      if (isDead) {
        // 변???�언 ?�거 (?�확???�거�??�해?�는 AST 분석 ?�요)
        const varPattern = new RegExp(`(?:const|let|var)\\s+${symbol}\\s*=[^;]+;?`, 'g');
        result = result.replace(varPattern, '');
      }
    }
    
    return result;
  }

  // Tree Shaking (기본 구현)
  private treeShake(code: string): string {
    // ?�용?��? ?�는 export ?�거
    const exportPattern = /export\s+(?:const|let|var|function|class)\s+(\w+)/g;
    const usedExports = new Set<string>();
    
    // ?�용 중인 ?�볼??기반?�로 ?�요??export�??��?
    // ??부분�? ?�제 구현?�서 ??복잡??분석???�요
    
    return code;
  }

  // 코드 최소??  private minify(code: string): string {
    return code
      .replace(/\s+/g, ' ')           // 공백 ?�러 개�? ?�나�?      .replace(/;\s+/g, ';')          // ?��?콜론 ??공백 ?�거
      .replace(/:\s+/g, ':')          // 콜론 ??공백 ?�거
      .replace(/{\s+/g, '{')          // ?�는 괄호 ??공백 ?�거
      .replace(/\s+}/g, '}')          // ?�는 괄호 ??공백 ?�거
      .replace(/,\s+/g, ',')          // 콜론 ??공백 ?�거
      .replace(/\s*>\s*/g, '>')       // ?�그 공백 ?�거
      .replace(/\/\*[\s\S]*?\*\//g, '') // 주석 ?�거
      .replace(/\/\/[^\n\r]*/g, '')    // ??�?주석 ?�거
      .trim();
  }

  // 번들 분할
  public splitBundle(code: string, maxSize: number = 1024 * 1024): string[] { // 기본 1MB
    if (code.length <= maxSize) {
      return [code];
    }
    
    // 간단??분할 ?�략 - 기능별로 ?�누�?    const chunks: string[] = [];
    let currentChunk = '';
    
    // 코드�??�리???�위�?분할 (?�제 구현?�서??AST 기반 분할 ?�요)
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

  // 코드 분석
  public analyzeCode(code: string): BundleAnalysis {
    const analysis: BundleAnalysis = {
      size: code.length,
      gzipSize: 0, // ?�제 구현?�서??gzip ?�축 ?�기 계산
      dependencies: this.extractDependencies(code),
      exports: this.extractExports(code),
      imports: this.extractImports(code),
      symbols: this.extractSymbols(code),
      duplicateSymbols: this.findDuplicates(code),
      treeShakable: true // 기본?�으�?tree shakable?�로 가??    };
    
    return analysis;
  }

  // ?�존??추출
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

  // exports 추출
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

  // imports 추출
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

  // 중복 ?�볼 ?��?
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

  // 번들 최적???�계
  public getBundleStats(originalCode: string, optimizedCode: string): BundleStats {
    return {
      originalSize: originalCode.length,
      optimizedSize: optimizedCode.length,
      reductionPercentage: ((originalCode.length - optimizedCode.length) / originalCode.length) * 100,
      originalGzipSize: 0, // ?�제 구현?�서??gzip ?�기 계산
      optimizedGzipSize: 0,
      savings: originalCode.length - optimizedCode.length
    };
  }

  // 코드 분할 ?�략
  public determineSplitStrategy(dependencies: string[]): SplitStrategy {
    // 주요 ?�존??기반 분할 ?�략 결정
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
    // 공통 ?�존???��? (간단??구현)
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

// 번들 최적????import { useState, useEffect, useCallback } from 'react';

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

// 번들 최적??컴포?�트
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
      // ?�제 구현?�서???�재 컴포?�트??코드�?최적??      // ?�기?�는 ?�제�??��? 코드 ?�용
      const dummyCode = `
        import React from 'react';
        import { useState } from 'react';
        import { useEffect } from 'react';
        
        // ?�용?��? ?�는 변??        const unusedVar = 'unused';
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

// 번들 분할 컴포?�트
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
      // ?�제 구현?�서???�재 ?�이지/모듈??코드�?분할
      const dummyCode = `
        // �?코드 블록
        function function1() { /* ... */ }
        function function2() { /* ... */ }
        function function3() { /* ... */ }
        // ... ??많�? 코드
      `;
      
      const chunks = splitBundle(dummyCode, maxSize);
      onSplit(chunks);
    }
  }, [maxSize, onSplit, splitBundle]);

  return <>{children}</>;
}

// 번들 최적??컨텍?�트
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

// ?�버 ?�이??번들 최적???�틸리티
export const serverSideBundleOptimization = {
  // ?�버?�서 코드 최적??  optimize: (code: string, options: { removeDeadCode?: boolean; minify?: boolean; treeshake?: boolean } = {}) => {
    const optimizer = BundleOptimizer.getInstance();
    return optimizer.optimizeCode(code, options);
  },

  // ?�버?�서 코드 분석
  analyze: (code: string) => {
    const optimizer = BundleOptimizer.getInstance();
    return optimizer.analyzeCode(code);
  },

  // ?�버?�서 번들 분할
  split: (code: string, maxSize: number = 1024 * 1024) => {
    const optimizer = BundleOptimizer.getInstance();
    return optimizer.splitBundle(code, maxSize);
  }
};

// 번들 최적???�략
export const BundleOptimizationStrategies = {
  // 빌드 ?�간 최적??  buildTime: {
    treeshaking: true,
    minification: true,
    scopeHoisting: true,
    codeSplitting: true
  },

  // ?��???최적??  runtime: {
    lazyLoading: true,
    prefetching: true,
    caching: true,
    compression: true
  },

  // ?�용??경험 최적??  ux: {
    criticalChunk: true,
    progressiveLoading: true,
    preloadImportant: true
  }
};

// 번들 ?�기 ?�한 ?�틸리티
export function checkBundleSize(code: string, maxSize: number): boolean {
  return code.length <= maxSize;
}

// 번들 경고 ?�틸리티
export function getBundleWarnings(analysis: BundleAnalysis, thresholds: { size?: number; duplicateSymbols?: number } = {}) {
  const warnings: string[] = [];
  
  if (thresholds.size && analysis.size > thresholds.size) {
    warnings.push(`번들 ?�기가 ${analysis.size}바이?�로, 권장 ?�기(${thresholds.size}바이??�?초과?�습?�다.`);
  }
  
  if (thresholds.duplicateSymbols && analysis.duplicateSymbols.length > thresholds.duplicateSymbols) {
    warnings.push(`${analysis.duplicateSymbols.length}개의 중복 ?�볼??발견?�었?�니??`);
  }
  
  return warnings;
}