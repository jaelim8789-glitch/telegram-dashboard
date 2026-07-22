import { useState, useEffect, useCallback, useRef } from 'react';

interface SyncStatus {
  isSyncing: boolean;
  lastSync: Date | null;
  error: string | null;
  progress: number;
  isOnline: boolean;
}

interface SyncOptions {
  debounceMs?: number;
  retryAttempts?: number;
  retryDelay?: number;
  syncWhenOnline?: boolean;
  optimisticUpdate?: boolean;
}

export function useSmartSync<T>(
  initialData: T,
  syncFunction: (data: T) => Promise<void>,
  options: SyncOptions = {}
) {
  const {
    debounceMs = 1000,
    retryAttempts = 3,
    retryDelay = 1000,
    syncWhenOnline = true,
    optimisticUpdate = true,
  } = options;

  const [localData, setLocalData] = useState<T>(initialData);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSync: null,
    error: null,
    progress: 0,
    isOnline: navigator.onLine,
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const pendingChangesRef = useRef(false);

  // 네트워크 상태 감지
  useEffect(() => {
    const handleOnline = () => setSyncStatus(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setSyncStatus(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 로컬 데이터 업데이트 함수
  const updateData = useCallback((newData: T | ((prev: T) => T)) => {
    setLocalData(prev => {
      const updatedData = typeof newData === 'function' ? newData(prev) : newData;
      
      // 낙관적 업데이트
      if (optimisticUpdate) {
        setLocalData(updatedData);
      }
      
      // 동기화 예약
      pendingChangesRef.current = true;
      
      // 디바운싱된 동기화
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        if (pendingChangesRef.current) {
          performSync(updatedData);
        }
      }, debounceMs);

      return updatedData;
    });
  }, [debounceMs, optimisticUpdate]);

  // 실제 동기화 수행
  const performSync = useCallback(async (dataToSync: T) => {
    if (!syncWhenOnline && !syncStatus.isOnline) {
      // 오프라인일 때는 동기화 하지 않음
      return;
    }

    setSyncStatus(prev => ({ ...prev, isSyncing: true, error: null, progress: 10 }));

    try {
      // 실제 동기화 수행
      await syncFunction(dataToSync);
      
      // 성공 시 상태 업데이트
      setSyncStatus({
        isSyncing: false,
        lastSync: new Date(),
        error: null,
        progress: 100,
        isOnline: navigator.onLine,
      });
      
      retryCountRef.current = 0;
      pendingChangesRef.current = false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '동기화에 실패했습니다';
      
      // 재시도 로직
      if (retryCountRef.current < retryAttempts) {
        retryCountRef.current += 1;
        setSyncStatus(prev => ({ ...prev, error: `재시도 중... (${retryCountRef.current}/${retryAttempts})` }));
        
        // 지수 백오프 방식으로 지연 후 재시도
        const delay = retryDelay * Math.pow(2, retryCountRef.current - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // 재시도
        await performSync(dataToSync);
      } else {
        // 최대 재시도 횟수 초과
        setSyncStatus({
          isSyncing: false,
          lastSync: syncStatus.lastSync,
          error: errorMessage,
          progress: 0,
          isOnline: navigator.onLine,
        });
      }
    }
  }, [syncFunction, syncWhenOnline, syncStatus.isOnline, retryAttempts, retryDelay]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // 수동 동기화 함수
  const manualSync = useCallback(async () => {
    if (syncStatus.isSyncing) return;
    
    setSyncStatus(prev => ({ ...prev, isSyncing: true, progress: 0 }));
    await performSync(localData);
  }, [localData, performSync, syncStatus.isSyncing]);

  // 동기화 대기 중인 변경 사항이 있는지 확인
  const hasPendingChanges = pendingChangesRef.current;

  return {
    localData,
    updateData,
    syncStatus,
    manualSync,
    hasPendingChanges,
    // 현재 동기화 상태에 따라 UI에 반영할 수 있는 계산된 값들
    isSynced: !hasPendingChanges && !syncStatus.isSyncing && !syncStatus.error,
    needsSync: hasPendingChanges || syncStatus.isSyncing,
  };
}

// 스마트 동기화 컨텍스트
import { createContext, useContext } from 'react';

interface SmartSyncContextType {
  isOnline: boolean;
  syncPriority: 'immediate' | 'normal' | 'deferred';
  setSyncPriority: (priority: 'immediate' | 'normal' | 'deferred') => void;
}

const SmartSyncContext = createContext<SmartSyncContextType | undefined>(undefined);

export function SmartSyncProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncPriority, setSyncPriority] = useState<'immediate' | 'normal' | 'deferred'>('normal');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <SmartSyncContext.Provider value={{ 
      isOnline, 
      syncPriority, 
      setSyncPriority 
    }}>
      {children}
    </SmartSyncContext.Provider>
  );
}

export function useSmartSyncContext() {
  const context = useContext(SmartSyncContext);
  if (!context) {
    throw new Error('useSmartSyncContext must be used within a SmartSyncProvider');
  }
  return context;
}