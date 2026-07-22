// 스마트 검색 기능
export interface SearchResult<T> {
  item: T;
  score: number;
  matches: string[];
  highlight?: string;
}

export interface SearchOptions {
  fuzzy?: boolean;
  caseSensitive?: boolean;
  highlight?: boolean;
  threshold?: number; // 일치율 임계값 (0-1)
  tokenize?: boolean; // 단어 단위로 분리하여 검색
  fields?: string[]; // 검색할 필드 지정
}

class SmartSearchEngine {
  private stopwords: Set<string> = new Set([
    '의', '가', '이', '은', '는', '을', '를', '에', '에서', '와', '과', '의', '으로', '로', '하다', '있다', '없다', '이다', '하는', '한', '에', '의', '와', '을', '를', '이', '가', '은', '는'
  ]);

  // 간단한 퍼지 검색 (Levenshtein 거리 기반)
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(0).map(() => Array(str1.length + 1).fill(0));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // 삭제
          matrix[j - 1][i] + 1,     // 삽입
          matrix[j - 1][i - 1] + cost // 교체
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  // 검색 쿼리 전처리
  private preprocessQuery(query: string, options: SearchOptions): string[] {
    let processed = query;
    
    if (!options.caseSensitive) {
      processed = processed.toLowerCase();
    }

    // 불용어 제거 및 토큰화
    const tokens = processed
      .split(/\s+/)
      .filter(token => token.length > 0 && !this.stopwords.has(token));

    if (options.tokenize) {
      // 추가적인 토큰화 로직
      const additionalTokens: string[] = [];
      tokens.forEach(token => {
        // 하이픈이나 밑줄 기준으로 추가 분리
        const subTokens = token.split(/[-_]/);
        additionalTokens.push(...subTokens);
      });
      return [...tokens, ...additionalTokens];
    }

    return tokens;
  }

  // 검색 점수 계산
  private calculateScore(queryTokens: string[], text: string, options: SearchOptions): number {
    let score = 0;
    let totalMatches = 0;
    let exactMatches = 0;

    const searchText = options.caseSensitive ? text : text.toLowerCase();

    for (const queryToken of queryTokens) {
      if (searchText.includes(queryToken)) {
        exactMatches++;
        totalMatches++;
        // 정확한 일치에 더 높은 점수 부여
        score += 2;
      } else if (options.fuzzy) {
        // 퍼지 매칭
        const words = searchText.split(/\s+/);
        for (const word of words) {
          const distance = this.levenshteinDistance(queryToken, word);
          const similarity = 1 - (distance / Math.max(queryToken.length, word.length));
          
          if (similarity > 0.7) { // 70% 이상 유사도
            totalMatches++;
            score += similarity;
          }
        }
      }
    }

    // 정확한 일치 비율 기반 보너스
    if (exactMatches === queryTokens.length) {
      score *= 1.5; // 모든 단어가 정확히 일치하면 보너스
    }

    // 정규화된 점수 반환 (0-1 사이)
    return Math.min(1, score / (queryTokens.length * 2));
  }

  // 하이라이트 생성
  private createHighlight(text: string, queryTokens: string[], options: SearchOptions): string {
    if (!options.highlight) return text;

    let highlighted = text;
    const searchTokens = options.caseSensitive ? queryTokens : queryTokens.map(t => t.toLowerCase());

    for (const token of searchTokens) {
      const regex = new RegExp(`(${token})`, options.caseSensitive ? 'g' : 'gi');
      highlighted = highlighted.replace(regex, '<mark class="highlight">$1</mark>');
    }

    return highlighted;
  }

  // 검색 실행
  search<T>(
    data: T[],
    query: string,
    options: SearchOptions = {}
  ): SearchResult<T>[] {
    const {
      fuzzy = false,
      caseSensitive = false,
      highlight = false,
      threshold = 0.3,
      fields = []
    } = options;

    if (!query.trim()) {
      return data.map(item => ({
        item,
        score: 1,
        matches: [],
        highlight: highlight ? String(item) : undefined
      }));
    }

    const queryTokens = this.preprocessQuery(query, { ...options, fuzzy, caseSensitive });

    const results: SearchResult<T>[] = [];

    for (const item of data) {
      let textToSearch = '';
      const matches: string[] = [];

      if (fields.length > 0) {
        // 지정된 필드만 검색
        for (const field of fields) {
          const fieldValue = this.getNestedProperty(item, field);
          if (fieldValue !== undefined) {
            textToSearch += ' ' + String(fieldValue);
          }
        }
      } else {
        // 전체 객체를 문자열로 변환
        textToSearch = JSON.stringify(item, null, 0);
      }

      const score = this.calculateScore(queryTokens, textToSearch, options);

      if (score >= threshold) {
        // 일치하는 단어 찾기
        for (const token of queryTokens) {
          if (textToSearch.toLowerCase().includes(token.toLowerCase())) {
            matches.push(token);
          }
        }

        results.push({
          item,
          score,
          matches,
          highlight: highlight ? this.createHighlight(textToSearch, queryTokens, options) : undefined
        });
      }
    }

    // 점수 기준으로 정렬
    return results.sort((a, b) => b.score - a.score);
  }

  // 중첩된 객체 속성 접근
  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // 자동 완성 기능
  autocomplete<T>(
    data: T[],
    query: string,
    options: SearchOptions = {},
    maxSuggestions: number = 5
  ): string[] {
    const suggestions = new Set<string>();
    const queryLower = query.toLowerCase();

    for (const item of data) {
      const text = JSON.stringify(item, null, 0).toLowerCase();
      
      // 쿼리와 부분 일치하는 텍스트 추출
      const words = text.split(/\s+/);
      for (const word of words) {
        if (word.startsWith(queryLower) && word.length > queryLower.length) {
          suggestions.add(word);
          if (suggestions.size >= maxSuggestions) {
            break;
          }
        }
      }
      
      if (suggestions.size >= maxSuggestions) {
        break;
      }
    }

    return Array.from(suggestions).slice(0, maxSuggestions);
  }

  // 검색 인사이트 제공
  getSearchInsights(query: string, results: SearchResult<any>[]): {
    queryComplexity: number;
    resultQuality: number;
    suggestions: string[];
  } {
    return {
      queryComplexity: query.length,
      resultQuality: results.length > 0 ? results.reduce((sum, res) => sum + res.score, 0) / results.length : 0,
      suggestions: results.slice(0, 3).map(res => res.matches.join(' '))
    };
  }
}

// 전역 스마트 검색 인스턴스
export const smartSearchEngine = new SmartSearchEngine();

// React 훅 형태
export function useSmartSearch<T>(data: T[], options: SearchOptions = {}) {
  const [results, setResults] = useState<SearchResult<T>[]>([]);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const search = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
    
    if (searchQuery.trim()) {
      const searchResults = smartSearchEngine.search(data, searchQuery, options);
      setResults(searchResults);
      
      // 자동 완성 제안
      const autoCompleteSuggestions = smartSearchEngine.autocomplete(
        data, 
        searchQuery, 
        options, 
        5
      );
      setSuggestions(autoCompleteSuggestions);
    } else {
      setResults([]);
      setSuggestions([]);
    }
  }, [data, options]);

  return {
    results,
    query,
    suggestions,
    search,
    setSearch: setQuery
  };
}

// 검색 인덱스 관리
export class SearchIndex<T> {
  private index: Map<string, T[]> = new Map();
  private engine: SmartSearchEngine;

  constructor(engine?: SmartSearchEngine) {
    this.engine = engine || smartSearchEngine;
  }

  // 인덱스 생성
  buildIndex(data: T[], keyExtractor: (item: T) => string): void {
    this.index.clear();
    
    for (const item of data) {
      const key = keyExtractor(item);
      if (!this.index.has(key)) {
        this.index.set(key, []);
      }
      this.index.get(key)!.push(item);
    }
  }

  // 인덱스 기반 검색
  search(query: string, options: SearchOptions = {}): SearchResult<T>[] {
    const allData: T[] = [];
    for (const bucket of this.index.values()) {
      allData.push(...bucket);
    }
    
    return this.engine.search(allData, query, options);
  }

  // 인덱스 갱신
  updateIndex(items: T[], keyExtractor: (item: T) => string): void {
    for (const item of items) {
      const key = keyExtractor(item);
      if (!this.index.has(key)) {
        this.index.set(key, []);
      }
      this.index.get(key)!.push(item);
    }
  }

  // 인덱스 삭제
  removeIndex(keys: string[]): void {
    for (const key of keys) {
      this.index.delete(key);
    }
  }

  // 인덱스 통계
  getStats(): { buckets: number; totalItems: number } {
    let totalItems = 0;
    for (const bucket of this.index.values()) {
      totalItems += bucket.length;
    }
    
    return {
      buckets: this.index.size,
      totalItems
    };
  }
}