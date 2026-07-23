import { useState, useEffect } from 'react';

interface TaskHistoryItem {
  id: string;
  taskId: string;
  action: string; // 수행된 작업 (create, update, delete 등)
  timestamp: number; // 작업 시간
  data: any; // 작업 당시의 데이터
  context: string; // 작업이 수행된 컨텍스트
  userId?: string; // 작업을 수행한 사용자 ID
  reverted?: boolean; // 되돌려졌는지 여부
  revertId?: string; // 되돌린 작업 ID
  metadata?: Record<string, any>; // 추가 메타데이터
}

interface TaskHistoryOptions {
  maxHistorySize?: number; // 히스토리 최대 크기
  enableRevert?: boolean; // 되돌리기 기능 활성화 여부
  autoSave?: boolean; // 자동 저장 여부
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
      console.error('작업 히스토리를 불러오는 데 실패했습니다:', e);
      return [];
    }
  });

  // 히스토리 저장
  useEffect(() => {
    if (autoSave) {
      try {
        localStorage.setItem(`task-history-${taskId}`, JSON.stringify(history));
      } catch (e) {
        console.error('작업 히스토리를 저장하는 데 실패했습니다:', e);
      }
    }
  }, [history, taskId, autoSave]);

  // 히스토리에 항목 추가
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

  // 되돌리기 기능
  const revertTo = (itemId: string) => {
    if (!enableRevert) {
      throw new Error('되돌리기 기능이 비활성화되어 있습니다.');
    }

    const itemIndex = history.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      throw new Error('지정된 히스토리 항목을 찾을 수 없습니다.');
    }

    // 해당 항목의 데이터로 되돌리기
    const itemToRevert = history[itemIndex];
    
    // 되돌리기 기록 추가
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
      // 원래 항목을 되돌렸다고 표시
      const updatedHistory = prev.map(item => 
        item.id === itemId ? { ...item, reverted: true } : item
      );
      return [revertItem, ...updatedHistory];
    });

    return itemToRevert.data;
  };

  // 마지막 변경 사항 되돌리기
  const undoLastChange = () => {
    if (!enableRevert || history.length === 0) {
      return null;
    }

    // 가장 최근의 되돌리지 않은 항목 찾기
    const lastNonReverted = history.find(item => !item.reverted && item.action !== 'revert');
    if (!lastNonReverted) {
      return null;
    }

    return revertTo(lastNonReverted.id);
  };

  // 특정 작업 이후의 히스토리 가져오기
  const getHistorySince = (timestamp: number) => {
    return history.filter(item => item.timestamp >= timestamp);
  };

  // 특정 작업 타입의 히스토리 가져오기
  const getHistoryByAction = (action: string) => {
    return history.filter(item => item.action === action);
  };

  // 히스토리 검색
  const searchHistory = (query: string) => {
    const lowerQuery = query.toLowerCase();
    return history.filter(item => 
      item.action.toLowerCase().includes(lowerQuery) ||
      item.context.toLowerCase().includes(lowerQuery) ||
      JSON.stringify(item.data).toLowerCase().includes(lowerQuery) ||
      (item.metadata && JSON.stringify(item.metadata).toLowerCase().includes(lowerQuery))
    );
  };

  // 히스토리에서 항목 제거
  const removeHistoryItem = (itemId: string) => {
    setHistory(prev => prev.filter(item => item.id !== itemId));
  };

  // 히스토리 전체 삭제
  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(`task-history-${taskId}`);
    } catch (e) {
      console.error('작업 히스토리를 삭제하는 데 실패했습니다:', e);
    }
  };

  // 현재 상태에서 이전 상태로 되돌릴 수 있는지 확인
  const canUndo = () => {
    if (!enableRevert) return false;
    return history.some(item => !item.reverted && item.action !== 'revert');
  };

  // 특정 사용자의 히스토리 가져오기
  const getHistoryByUser = (userId: string) => {
    return history.filter(item => item.userId === userId);
  };

  // 히스토리 통계
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

  // 히스토리 직렬화
  const exportHistory = () => {
    return JSON.stringify(history);
  };

  // 히스토리 불러오기
  const importHistory = (serializedHistory: string) => {
    try {
      const parsed = JSON.parse(serializedHistory);
      if (Array.isArray(parsed)) {
        setHistory(parsed);
        return true;
      }
      return false;
    } catch (e) {
      console.error('히스토리 가져오기 실패:', e);
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

// 작업 히스토리 컨텍스트
export const TaskHistoryContext = React.createContext<ReturnType<typeof useSmartTaskHistory> | null>(null);

// 히스토리 제공 컴포넌트
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

// 히스토리 사용 훅
export const useTaskHistory = () => {
  const context = React.useContext(TaskHistoryContext);
  if (!context) {
    throw new Error('useTaskHistory must be used within a TaskHistoryProvider');
  }
  return context;
};