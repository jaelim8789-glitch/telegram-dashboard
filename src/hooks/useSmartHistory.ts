import { useState, useEffect } from 'react';

interface HistoryEntry {
  id: string;
  action: string; // 수행된 작업
  timestamp: number; // 작업 시간
  data: any; // 작업 관련 데이터
  context: string; // 작업이 수행된 컨텍스트 (페이지, 컴포넌트 등)
  duration?: number; // 작업 소요 시간 (ms)
  result?: 'success' | 'failure' | 'partial'; // 작업 결과
}

interface HistoryOptions {
  maxSize?: number; // 히스토리 최대 크기
  autoTrack?: boolean; // 자동 추적 여부
  excludeActions?: string[]; // 추적에서 제외할 액션
}

export function useSmartHistory(options: HistoryOptions = {}) {
  const {
    maxSize = 100,
    autoTrack = true,
    excludeActions = []
  } = options;

  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem('smart-history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('히스토리를 불러오는 데 실패했습니다:', e);
      return [];
    }
  });

  // 히스토리 저장
  useEffect(() => {
    try {
      localStorage.setItem('smart-history', JSON.stringify(history));
    } catch (e) {
      console.error('히스토리를 저장하는 데 실패했습니다:', e);
    }
  }, [history]);

  // 히스토리에 항목 추가
  const addEntry = (entry: Omit<HistoryEntry, 'id'>) => {
    if (excludeActions.includes(entry.action)) {
      return;
    }

    const newEntry: HistoryEntry = {
      ...entry,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    };

    setHistory(prev => {
      const newHistory = [newEntry, ...prev];
      return newHistory.slice(0, maxSize);
    });
  };

  // 특정 컨텍스트의 히스토리 가져오기
  const getHistoryByContext = (context: string) => {
    return history.filter(entry => entry.context === context);
  };

  // 특정 액션의 히스토리 가져오기
  const getHistoryByAction = (action: string) => {
    return history.filter(entry => entry.action === action);
  };

  // 히스토리에서 항목 제거
  const removeEntry = (id: string) => {
    setHistory(prev => prev.filter(entry => entry.id !== id));
  };

  // 히스토리 전체 삭제
  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('smart-history');
    } catch (e) {
      console.error('히스토리를 삭제하는 데 실패했습니다:', e);
    }
  };

  // 특정 기간의 히스토리 가져오기 (ms 단위)
  const getHistorySince = (since: number) => {
    const sinceTime = Date.now() - since;
    return history.filter(entry => entry.timestamp >= sinceTime);
  };

  // 가장 최근 항목 가져오기
  const getLastEntry = () => {
    return history[0] || null;
  };

  // 특정 컨텍스트의 가장 최근 항목 가져오기
  const getLastEntryByContext = (context: string) => {
    return history.find(entry => entry.context === context) || null;
  };

  // 작업 통계 가져오기
  const getStatistics = () => {
    const total = history.length;
    const successful = history.filter(entry => entry.result === 'success').length;
    const failed = history.filter(entry => entry.result === 'failure').length;
    const partial = history.filter(entry => entry.result === 'partial').length;

    return {
      total,
      successful,
      failed,
      partial,
      successRate: total > 0 ? (successful / total) * 100 : 0
    };
  };

  // 자동 추적을 위한 함수들
  const trackAction = (action: string, context: string, data: any = {}) => {
    if (!autoTrack || excludeActions.includes(action)) {
      return;
    }

    addEntry({
      action,
      context,
      data,
      timestamp: Date.now()
    });
  };

  const trackSuccess = (action: string, context: string, data: any = {}, duration?: number) => {
    if (!autoTrack || excludeActions.includes(action)) {
      return;
    }

    addEntry({
      action,
      context,
      data,
      timestamp: Date.now(),
      duration,
      result: 'success'
    });
  };

  const trackFailure = (action: string, context: string, data: any = {}, duration?: number) => {
    if (!autoTrack || excludeActions.includes(action)) {
      return;
    }

    addEntry({
      action,
      context,
      data,
      timestamp: Date.now(),
      duration,
      result: 'failure'
    });
  };

  // 히스토리 검색
  const searchHistory = (query: string) => {
    const lowerQuery = query.toLowerCase();
    return history.filter(entry => 
      entry.action.toLowerCase().includes(lowerQuery) ||
      entry.context.toLowerCase().includes(lowerQuery) ||
      JSON.stringify(entry.data).toLowerCase().includes(lowerQuery)
    );
  };

  return {
    history,
    addEntry,
    getHistoryByContext,
    getHistoryByAction,
    getHistorySince,
    getLastEntry,
    getLastEntryByContext,
    removeEntry,
    clearHistory,
    getStatistics,
    trackAction,
    trackSuccess,
    trackFailure,
    searchHistory
  };
}

// 자동 히스토리 추적을 위한 HOC
export function withSmartHistory<T extends Record<string, any>>(
  WrappedComponent: React.ComponentType<T>,
  context: string
) {
  return function WithSmartHistory(props: T) {
    const history = useSmartHistory({ autoTrack: true });

    useEffect(() => {
      history.trackAction('component-mounted', context, { props });
      return () => {
        history.trackAction('component-unmounted', context, { props });
      };
    }, []);

    return <WrappedComponent {...props} history={history} />;
  };
}