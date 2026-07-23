"use client";
import { useState, useEffect } from 'react';

interface HistoryEntry {
  id: string;
  action: string; // ?˜í–‰???‘ì—…
  timestamp: number; // ?‘ì—… ?œê°„
  data: any; // ?‘ì—… ê´€???°ì´??  context: string; // ?‘ì—…???˜í–‰??ì»¨í…?¤íŠ¸ (?˜ì´ì§€, ì»´í¬?ŒíŠ¸ ??
  duration?: number; // ?‘ì—… ?Œìš” ?œê°„ (ms)
  result?: 'success' | 'failure' | 'partial'; // ?‘ì—… ê²°ê³¼
}

interface HistoryOptions {
  maxSize?: number; // ?ˆìŠ¤? ë¦¬ ìµœë? ?¬ê¸°
  autoTrack?: boolean; // ?ë™ ì¶”ì  ?¬ë?
  excludeActions?: string[]; // ì¶”ì ?ì„œ ?œì™¸???¡ì…˜
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
      console.error('?ˆìŠ¤? ë¦¬ë¥?ë¶ˆëŸ¬?¤ëŠ” ???¤íŒ¨?ˆìŠµ?ˆë‹¤:', e);
      return [];
    }
  });

  // ?ˆìŠ¤? ë¦¬ ?€??  useEffect(() => {
    try {
      localStorage.setItem('smart-history', JSON.stringify(history));
    } catch (e) {
      console.error('?ˆìŠ¤? ë¦¬ë¥??€?¥í•˜?????¤íŒ¨?ˆìŠµ?ˆë‹¤:', e);
    }
  }, [history]);

  // ?ˆìŠ¤? ë¦¬????ª© ì¶”ê?
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

  // ?¹ì • ì»¨í…?¤íŠ¸???ˆìŠ¤? ë¦¬ ê°€?¸ì˜¤ê¸?  const getHistoryByContext = (context: string) => {
    return history.filter(entry => entry.context === context);
  };

  // ?¹ì • ?¡ì…˜???ˆìŠ¤? ë¦¬ ê°€?¸ì˜¤ê¸?  const getHistoryByAction = (action: string) => {
    return history.filter(entry => entry.action === action);
  };

  // ?ˆìŠ¤? ë¦¬?ì„œ ??ª© ?œê±°
  const removeEntry = (id: string) => {
    setHistory(prev => prev.filter(entry => entry.id !== id));
  };

  // ?ˆìŠ¤? ë¦¬ ?„ì²´ ?? œ
  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('smart-history');
    } catch (e) {
      console.error('?ˆìŠ¤? ë¦¬ë¥??? œ?˜ëŠ” ???¤íŒ¨?ˆìŠµ?ˆë‹¤:', e);
    }
  };

  // ?¹ì • ê¸°ê°„???ˆìŠ¤? ë¦¬ ê°€?¸ì˜¤ê¸?(ms ?¨ìœ„)
  const getHistorySince = (since: number) => {
    const sinceTime = Date.now() - since;
    return history.filter(entry => entry.timestamp >= sinceTime);
  };

  // ê°€??ìµœê·¼ ??ª© ê°€?¸ì˜¤ê¸?  const getLastEntry = () => {
    return history[0] || null;
  };

  // ?¹ì • ì»¨í…?¤íŠ¸??ê°€??ìµœê·¼ ??ª© ê°€?¸ì˜¤ê¸?  const getLastEntryByContext = (context: string) => {
    return history.find(entry => entry.context === context) || null;
  };

  // ?‘ì—… ?µê³„ ê°€?¸ì˜¤ê¸?  const getStatistics = () => {
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

  // ?ë™ ì¶”ì ???„í•œ ?¨ìˆ˜??  const trackAction = (action: string, context: string, data: any = {}) => {
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

  // ?ˆìŠ¤? ë¦¬ ê²€??  const searchHistory = (query: string) => {
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

// ?ë™ ?ˆìŠ¤? ë¦¬ ì¶”ì ???„í•œ HOC
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