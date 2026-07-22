// 고급 필터링 및 정렬 기능
export interface FilterRule {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'in' | 'between' | 'isEmpty' | 'isNotEmpty';
  value: any;
  logic?: 'AND' | 'OR'; // 필터 간 논리 연산자
}

export interface SortRule {
  field: string;
  direction: 'asc' | 'desc';
  type?: 'string' | 'number' | 'date' | 'boolean'; // 정렬 타입
}

export interface AdvancedFilterOptions {
  caseSensitive?: boolean;
  deepFilter?: boolean; // 중첩 객체 필터링 여부
  fuzzyMatch?: boolean; // 퍼지 매칭 여부
  locale?: string; // 로케일 (정렬에 사용)
}

class AdvancedFilteringEngine {
  // 필터 조건에 따라 데이터 필터링
  filter<T>(data: T[], filters: FilterRule[], options: AdvancedFilterOptions = {}): T[] {
    const { caseSensitive = true, deepFilter = false, fuzzyMatch = false } = options;

    return data.filter(item => {
      if (filters.length === 0) return true;

      let result = true;
      let currentLogic: 'AND' | 'OR' = 'AND';

      for (const filter of filters) {
        const fieldValue = deepFilter 
          ? this.getNestedValue(item, filter.field) 
          : (item as any)[filter.field];

        const matches = this.evaluateFilter(fieldValue, filter, options);

        if (filter.logic) {
          currentLogic = filter.logic;
        }

        if (currentLogic === 'AND') {
          result = result && matches;
        } else { // OR
          result = result || matches;
        }
      }

      return result;
    });
  }

  // 정렬
  sort<T>(data: T[], sorts: SortRule[], options: AdvancedFilterOptions = {}): T[] {
    if (sorts.length === 0) return data;

    return [...data].sort((a, b) => {
      for (const sort of sorts) {
        const aValue = this.getNestedValue(a, sort.field);
        const bValue = this.getNestedValue(b, sort.field);

        const comparison = this.compareValues(aValue, bValue, sort, options);

        if (comparison !== 0) {
          return sort.direction === 'asc' ? comparison : -comparison;
        }
      }

      return 0;
    });
  }

  // 필터 및 정렬 조합
  filterAndSort<T>(data: T[], filters: FilterRule[], sorts: SortRule[], options: AdvancedFilterOptions = {}): T[] {
    const filtered = this.filter(data, filters, options);
    return this.sort(filtered, sorts, options);
  }

  // 필터 조건 평가
  private evaluateFilter(fieldValue: any, filter: FilterRule, options: AdvancedFilterOptions): boolean {
    const { caseSensitive = true } = options;
    const value = caseSensitive ? fieldValue : String(fieldValue).toLowerCase();
    const filterValue = caseSensitive ? filter.value : String(filter.value).toLowerCase();

    switch (filter.operator) {
      case 'equals':
        return value === filterValue;
      
      case 'contains':
        if (typeof value === 'string' && typeof filterValue === 'string') {
          return value.includes(filterValue);
        }
        return false;
      
      case 'startsWith':
        if (typeof value === 'string' && typeof filterValue === 'string') {
          return value.startsWith(filterValue);
        }
        return false;
      
      case 'endsWith':
        if (typeof value === 'string' && typeof filterValue === 'string') {
          return value.endsWith(filterValue);
        }
        return false;
      
      case 'greaterThan':
        return value > filterValue;
      
      case 'lessThan':
        return value < filterValue;
      
      case 'in':
        if (Array.isArray(filterValue)) {
          return filterValue.includes(value);
        }
        return false;
      
      case 'between':
        if (Array.isArray(filterValue) && filterValue.length === 2) {
          return value >= filterValue[0] && value <= filterValue[1];
        }
        return false;
      
      case 'isEmpty':
        return value == null || value === '';
      
      case 'isNotEmpty':
        return value != null && value !== '';
      
      default:
        return false;
    }
  }

  // 값 비교 (정렬용)
  private compareValues(a: any, b: any, sort: SortRule, options: AdvancedFilterOptions): number {
    const { locale = 'ko-KR' } = options;
    
    // null/undefined 처리
    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;

    const type = sort.type || this.inferType(a);

    switch (type) {
      case 'string':
        if (locale) {
          return a.localeCompare(b, locale, { numeric: true });
        }
        return String(a).localeCompare(String(b));
      
      case 'number':
        return Number(a) - Number(b);
      
      case 'date':
        const dateA = new Date(a);
        const dateB = new Date(b);
        return dateA.getTime() - dateB.getTime();
      
      case 'boolean':
        return Boolean(a) === Boolean(b) ? 0 : Boolean(a) ? -1 : 1;
      
      default:
        // 기본 비교
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
    }
  }

  // 값 타입 추론
  private inferType(value: any): 'string' | 'number' | 'date' | 'boolean' {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') {
      // 날짜 형식인지 확인
      if (this.isValidDate(value)) return 'date';
      return 'string';
    }
    return 'string';
  }

  // 날짜 형식 확인
  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  // 중첩된 객체 값 가져오기
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // 필터 조건 조합
  combineFilters(filters: FilterRule[]): FilterRule[] {
    // 필터 조건을 결합하거나 최적화하는 로직
    return filters;
  }

  // 필터 조건 검증
  validateFilter(filter: FilterRule): boolean {
    if (!filter.field || !filter.operator) {
      return false;
    }

    // 특정 연산자에 대해 값 요구
    const operatorsRequiringValue = ['equals', 'contains', 'startsWith', 'endsWith', 'greaterThan', 'lessThan', 'in', 'between'];
    if (operatorsRequiringValue.includes(filter.operator) && filter.value === undefined) {
      return false;
    }

    // between 연산자의 경우 배열 길이 검증
    if (filter.operator === 'between' && (!Array.isArray(filter.value) || filter.value.length !== 2)) {
      return false;
    }

    // in 연산자의 경우 배열 여부 검증
    if (filter.operator === 'in' && !Array.isArray(filter.value)) {
      return false;
    }

    return true;
  }

  // 정렬 조건 검증
  validateSort(sort: SortRule): boolean {
    return !!sort.field && (sort.direction === 'asc' || sort.direction === 'desc');
  }

  // 필터 조건 문자열 표현
  filterToString(filter: FilterRule): string {
    const operatorsMap: Record<string, string> = {
      equals: '=',
      contains: 'Contains',
      startsWith: 'Starts With',
      endsWith: 'Ends With',
      greaterThan: '>',
      lessThan: '<',
      in: 'In',
      between: 'Between',
      isEmpty: 'Is Empty',
      isNotEmpty: 'Is Not Empty'
    };

    const operatorStr = operatorsMap[filter.operator] || filter.operator;
    
    if (filter.operator === 'isEmpty' || filter.operator === 'isNotEmpty') {
      return `${filter.field} ${operatorStr}`;
    }

    if (filter.operator === 'between') {
      return `${filter.field} ${operatorStr} [${filter.value[0]}, ${filter.value[1]}]`;
    }

    if (filter.operator === 'in') {
      return `${filter.field} ${operatorStr} [${filter.value.join(', ')}]`;
    }

    return `${filter.field} ${operatorStr} "${filter.value}"`;
  }

  // 정렬 조건 문자열 표현
  sortToString(sort: SortRule): string {
    return `${sort.field} (${sort.direction.toUpperCase()})`;
  }
}

// 전역 고급 필터링 엔진 인스턴스
export const advancedFilteringEngine = new AdvancedFilteringEngine();

// React 훅 형태
export function useAdvancedFiltering<T>() {
  const [filteredData, setFilteredData] = useState<T[]>([]);
  const [sorts, setSorts] = useState<SortRule[]>([]);
  const [filters, setFilters] = useState<FilterRule[]>([]);

  const applyFiltering = useCallback((data: T[], options?: AdvancedFilterOptions) => {
    const result = advancedFilteringEngine.filterAndSort(data, filters, sorts, options);
    setFilteredData(result);
  }, [filters, sorts]);

  const addFilter = useCallback((filter: FilterRule) => {
    if (advancedFilteringEngine.validateFilter(filter)) {
      setFilters(prev => [...prev, filter]);
    }
  }, []);

  const removeFilter = useCallback((index: number) => {
    setFilters(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateFilter = useCallback((index: number, filter: FilterRule) => {
    if (advancedFilteringEngine.validateFilter(filter)) {
      setFilters(prev => prev.map((f, i) => i === index ? filter : f));
    }
  }, []);

  const addSort = useCallback((sort: SortRule) => {
    if (advancedFilteringEngine.validateSort(sort)) {
      setSorts(prev => [...prev, sort]);
    }
  }, []);

  const removeSort = useCallback((index: number) => {
    setSorts(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateSort = useCallback((index: number, sort: SortRule) => {
    if (advancedFilteringEngine.validateSort(sort)) {
      setSorts(prev => prev.map((s, i) => i === index ? sort : s));
    }
  }, []);

  const clearFilters = useCallback(() => {
    setFilters([]);
  }, []);

  const clearSorts = useCallback(() => {
    setSorts([]);
  }, []);

  const clearAll = useCallback(() => {
    setFilters([]);
    setSorts([]);
  }, []);

  return {
    filteredData,
    filters,
    sorts,
    applyFiltering,
    addFilter,
    removeFilter,
    updateFilter,
    addSort,
    removeSort,
    updateSort,
    clearFilters,
    clearSorts,
    clearAll
  };
}

// 필터 조건 빌더
export class FilterBuilder {
  private filters: FilterRule[] = [];

  field(fieldName: string) {
    return new FieldFilterBuilder(fieldName, this);
  }

  and() {
    // AND 조건으로 연결
    return this;
  }

  or() {
    // OR 조건으로 연결
    return this;
  }

  build(): FilterRule[] {
    return this.filters;
  }

  reset() {
    this.filters = [];
    return this;
  }
}

class FieldFilterBuilder {
  constructor(
    private fieldName: string,
    private builder: FilterBuilder
  ) {}

  equals(value: any) {
    this.builder.filters.push({
      field: this.fieldName,
      operator: 'equals',
      value
    });
    return this.builder;
  }

  contains(value: string) {
    this.builder.filters.push({
      field: this.fieldName,
      operator: 'contains',
      value
    });
    return this.builder;
  }

  startsWith(value: string) {
    this.builder.filters.push({
      field: this.fieldName,
      operator: 'startsWith',
      value
    });
    return this.builder;
  }

  endsWith(value: string) {
    this.builder.filters.push({
      field: this.fieldName,
      operator: 'endsWith',
      value
    });
    return this.builder;
  }

  greaterThan(value: number | Date) {
    this.builder.filters.push({
      field: this.fieldName,
      operator: 'greaterThan',
      value
    });
    return this.builder;
  }

  lessThan(value: number | Date) {
    this.builder.filters.push({
      field: this.fieldName,
      operator: 'lessThan',
      value
    });
    return this.builder;
  }

  in(values: any[]) {
    this.builder.filters.push({
      field: this.fieldName,
      operator: 'in',
      value: values
    });
    return this.builder;
  }

  between(start: number | Date, end: number | Date) {
    this.builder.filters.push({
      field: this.fieldName,
      operator: 'between',
      value: [start, end]
    });
    return this.builder;
  }

  isEmpty() {
    this.builder.filters.push({
      field: this.fieldName,
      operator: 'isEmpty',
      value: undefined
    });
    return this.builder;
  }

  isNotEmpty() {
    this.builder.filters.push({
      field: this.fieldName,
      operator: 'isNotEmpty',
      value: undefined
    });
    return this.builder;
  }
}

// 사용 예시:
// const filter = new FilterBuilder()
//   .field('name').contains('John')
//   .and()
//   .field('age').greaterThan(18)
//   .build();

// 정렬 빌더
export class SortBuilder {
  private sorts: SortRule[] = [];

  by(field: string, direction: 'asc' | 'desc' = 'asc', type?: 'string' | 'number' | 'date' | 'boolean') {
    this.sorts.push({
      field,
      direction,
      type
    });
    return this;
  }

  build(): SortRule[] {
    return this.sorts;
  }

  reset() {
    this.sorts = [];
    return this;
  }
}

// 사용 예시:
// const sort = new SortBuilder()
//   .by('createdAt', 'desc')
//   .by('name', 'asc')
//   .build();