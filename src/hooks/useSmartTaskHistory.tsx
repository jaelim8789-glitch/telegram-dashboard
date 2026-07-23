"use client";
import { useState, useEffect } from 'react';

interface TaskHistoryItem {
  id: string;
  taskId: string;
  action: string; // ?˜í–‰???‘ì—… (create, update, delete ??
  timestamp: number; // ?‘ì—… ?œê°„
  data: any; // ?‘ì—… ?¹ì‹œ???°ì´??  context: string; // ?‘ì—…???˜í–‰??ì»¨í…?¤íŠ¸
  userId?: string; // ?‘ì—…???˜í–‰???¬ìš©??ID
  reverted?: boolean; // ?˜ëŒ?¤ì¡Œ?”ì? ?¬ë?
  revertId?: string; // ?˜ëŒë¦??‘ì—… ID
  metadata?: Record<string, any>; // ì¶”ê? ë©”í??°ì´??}

interface TaskHistoryOptions {
  maxHistorySize?: number; // ?ˆìŠ¤? ë¦¬ ìµœë? ?¬ê¸°
  enableRevert?: boolean; // ?˜ëŒë¦¬ê¸° ê¸°ëŠ¥ ?œì„±???¬ë?
  autoSave?: boolean; // ?ë™ ?€???¬ë?
}

export function useSmartTaskHistory(taskId: string, options: TaskHistoryOptions = {}) {
  const {
    maxHistorySize = 50,
    enableRevert = true,
    autoSave = true
  } = options;

  const [history, setHistory] = useState<TaskHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(`task-history-${taskId}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('?‘ì—… ?ˆìŠ¤? ë¦¬ë¥?ë¶ˆëŸ¬?¤ëŠ” ???¤íŒ¨?ˆìŠµ?ˆë‹¤:', e);
      return [];
    }
  });

  // ?ˆìŠ¤? ë¦¬ ?€??  useEffect(() => {
    if (autoSave) {
      try {
        localStorage.setItem(`task-history-${taskId}`, JSON.stringify(history));
      } catch (e) {
        console.error('?‘ì—… ?ˆìŠ¤? ë¦¬ë¥??€?¥í•˜?????¤íŒ¨?ˆìŠµ?ˆë‹¤:', e);
      }
    }
  }, [history, taskId, autoSave]);

  // ?ˆìŠ¤? ë¦¬????ª© ì¶”ê?
  const addHistoryItem = (action: string, data: any, context: string, metadata?: Record<string, any>) => {
    const newItem: TaskHistoryItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      taskId,
      action,
      timestamp: Date.now(),
      data,
      context,
      metadata,
      reverted: false
    };

    setHistory(prev => {
      const newHistory = [newItem, ...prev];
      return newHistory.slice(0, maxHistorySize);
    });

    return newItem;
  };

  // ?˜ëŒë¦¬ê¸° ê¸°ëŠ¥
  const revertTo = (itemId: string) => {
    if (!enableRevert) {
      throw new Error('?˜ëŒë¦¬ê¸° ê¸°ëŠ¥??ë¹„í™œ?±í™”?˜ì–´ ?ˆìŠµ?ˆë‹¤.');
    }

    const itemIndex = history.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      throw new Error('ì§€?•ëœ ?ˆìŠ¤? ë¦¬ ??ª©??ì°¾ì„ ???†ìŠµ?ˆë‹¤.');
    }

    // ?´ë‹¹ ??ª©???°ì´?°ë¡œ ?˜ëŒë¦¬ê¸°
    const itemToRevert = history[itemIndex];
    
    // ?˜ëŒë¦¬ê¸° ê¸°ë¡ ì¶”ê?
    const revertItem: TaskHistoryItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      taskId,
      action: 'revert',
      timestamp: Date.now(),
      data: itemToRevert.data,
      context: `${itemToRevert.context}-reverted`,
      reverted: false,
      revertId: itemToRevert.id,
      metadata: {
        revertedFrom: itemToRevert.id,
        originalAction: itemToRevert.action
      }
    };

    setHistory(prev => {
      // ?ë˜ ??ª©???˜ëŒ?¸ë‹¤ê³??œì‹œ
      const updatedHistory = prev.map(item => 
        item.id === itemId ? { ...item, reverted: true } : item
      );
      return [revertItem, ...updatedHistory];
    });

    return itemToRevert.data;
  };

  // ë§ˆì?ë§?ë³€ê²??¬í•­ ?˜ëŒë¦¬ê¸°
  const undoLastChange = () => {
    if (!enableRevert || history.length === 0) {
      return null;
    }

    // ê°€??ìµœê·¼???˜ëŒë¦¬ì? ?Šì? ??ª© ì°¾ê¸°
    const lastNonReverted = history.find(item => !item.reverted && item.action !== 'revert');
    if (!lastNonReverted) {
      return null;
    }

    return revertTo(lastNonReverted.id);
  };

  // ?¹ì • ?‘ì—… ?´í›„???ˆìŠ¤? ë¦¬ ê°€?¸ì˜¤ê¸?  const getHistorySince = (timestamp: number) => {
    return history.filter(item => item.timestamp >= timestamp);
  };

  // ?¹ì • ?‘ì—… ?€?…ì˜ ?ˆìŠ¤? ë¦¬ ê°€?¸ì˜¤ê¸?  const getHistoryByAction = (action: string) => {
    return history.filter(item => item.action === action);
  };

  // ?ˆìŠ¤? ë¦¬ ê²€??  const searchHistory = (query: string) => {
    const lowerQuery = query.toLowerCase();
    return history.filter(item => 
      item.action.toLowerCase().includes(lowerQuery) ||
      item.context.toLowerCase().includes(lowerQuery) ||
      JSON.stringify(item.data).toLowerCase().includes(lowerQuery) ||
      (item.metadata && JSON.stringify(item.metadata).toLowerCase().includes(lowerQuery))
    );
  };

  // ?ˆìŠ¤? ë¦¬?ì„œ ??ª© ?œê±°
  const removeHistoryItem = (itemId: string) => {
    setHistory(prev => prev.filter(item => item.id !== itemId));
  };

  // ?ˆìŠ¤? ë¦¬ ?„ì²´ ?? œ
  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(`task-history-${taskId}`);
    } catch (e) {
      console.error('?‘ì—… ?ˆìŠ¤? ë¦¬ë¥??? œ?˜ëŠ” ???¤íŒ¨?ˆìŠµ?ˆë‹¤:', e);
    }
  };

  // ?„ì¬ ?íƒœ?ì„œ ?´ì „ ?íƒœë¡??˜ëŒë¦????ˆëŠ”ì§€ ?•ì¸
  const canUndo = () => {
    if (!enableRevert) return false;
    return history.some(item => !item.reverted && item.action !== 'revert');
  };

  // ?¹ì • ?¬ìš©?ì˜ ?ˆìŠ¤? ë¦¬ ê°€?¸ì˜¤ê¸?  const getHistoryByUser = (userId: string) => {
    return history.filter(item => item.userId === userId);
  };

  // ?ˆìŠ¤? ë¦¬ ?µê³„
  const getHistoryStats = () => {
    const total = history.length;
    const reverted = history.filter(item => item.reverted).length;
    const actions = history.reduce((acc, item) => {
      acc[item.action] = (acc[item.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      reverted,
      nonReverted: total - reverted,
      actions,
      revertRate: total > 0 ? (reverted / total) * 100 : 0
    };
  };

  // ?ˆìŠ¤? ë¦¬ ì§ë ¬??  const exportHistory = () => {
    return JSON.stringify(history);
  };

  // ?ˆìŠ¤? ë¦¬ ë¶ˆëŸ¬?¤ê¸°
  const importHistory = (serializedHistory: string) => {
    try {
      const parsed = JSON.parse(serializedHistory);
      if (Array.isArray(parsed)) {
        setHistory(parsed);
        return true;
      }
      return false;
    } catch (e) {
      console.error('?ˆìŠ¤? ë¦¬ ê°€?¸ì˜¤ê¸??¤íŒ¨:', e);
      return false;
    }
  };

  return {
    history,
    addHistoryItem,
    revertTo,
    undoLastChange,
    getHistorySince,
    getHistoryByAction,
    getHistoryByUser,
    searchHistory,
    removeHistoryItem,
    clearHistory,
    canUndo,
    getHistoryStats,
    exportHistory,
    importHistory
  };
}

// ?‘ì—… ?ˆìŠ¤? ë¦¬ ì»¨í…?¤íŠ¸
export const TaskHistoryContext = React.createContext<ReturnType<typeof useSmartTaskHistory> | null>(null);

// ?ˆìŠ¤? ë¦¬ ?œê³µ ì»´í¬?ŒíŠ¸
export const TaskHistoryProvider: React.FC<{
  taskId: string;
  children: React.ReactNode;
  options?: TaskHistoryOptions;
}> = ({ taskId, children, options }) => {
  const history = useSmartTaskHistory(taskId, options);

  return (
    <TaskHistoryContext.Provider value={history}>
      {children}
    </TaskHistoryContext.Provider>
  );
};

// ?ˆìŠ¤? ë¦¬ ?¬ìš© ??export const useTaskHistory = () => {
  const context = React.useContext(TaskHistoryContext);
  if (!context) {
    throw new Error('useTaskHistory must be used within a TaskHistoryProvider');
  }
  return context;
};