"use client";
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

  // ?§Ìä∏?åÌÅ¨ ?ÅÌÉú Í∞êÏ?
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

  // Î°úÏª¨ ?∞Ïù¥???ÖÎç∞?¥Ìä∏ ?®Ïàò
  const updateData = useCallback((newData: T | ((prev: T) => T)) => {
    setLocalData(prev => {
      const updatedData = typeof newData === 'function' ? newData(prev) : newData;
      
      // ?ôÍ????ÖÎç∞?¥Ìä∏
      if (optimisticUpdate) {
        setLocalData(updatedData);
      }
      
      // ?ôÍ∏∞???àÏïΩ
      pendingChangesRef.current = true;
      
      // ?îÎ∞î?¥Ïã±???ôÍ∏∞??
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

  // ?§Ï†ú ?ôÍ∏∞???òÌñâ
  const performSync = useCallback(async (dataToSync: T) => {
    if (!syncWhenOnline && !syncStatus.isOnline) {
      // ?§ÌîÑ?ºÏù∏???åÎäî ?ôÍ∏∞???òÏ? ?äÏùå
      return;
    }

    setSyncStatus(prev => ({ ...prev, isSyncing: true, error: null, progress: 10 }));

    try {
      // ?§Ï†ú ?ôÍ∏∞???òÌñâ
      await syncFunction(dataToSync);
      
      // ?±Í≥µ ???ÅÌÉú ?ÖÎç∞?¥Ìä∏
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
      const errorMessage = error instanceof Error ? error.message : '?ôÍ∏∞?îÏóê ?§Ìå®?àÏäµ?àÎã§';
      
      // ?¨Ïãú??Î°úÏßÅ
      if (retryCountRef.current < retryAttempts) {
        retryCountRef.current += 1;
        setSyncStatus(prev => ({ ...prev, error: `?¨Ïãú??Ï§?.. (${retryCountRef.current}/${retryAttempts})` }));
        
        // ÏßÄ??Î∞±Ïò§??Î∞©Ïãù?ºÎ°ú ÏßÄ?????¨Ïãú??
        const delay = retryDelay * Math.pow(2, retryCountRef.current - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // ?¨Ïãú??
        await performSync(dataToSync);
      } else {
        // ÏµúÎ? ?¨Ïãú???üÏàò Ï¥àÍ≥º
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

  // Ïª¥Ìè¨?åÌä∏ ?∏Îßà?¥Ìä∏ ???ïÎ¶¨
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // ?òÎèô ?ôÍ∏∞???®Ïàò
  const manualSync = useCallback(async () => {
    if (syncStatus.isSyncing) return;
    
    setSyncStatus(prev => ({ ...prev, isSyncing: true, progress: 0 }));
    await performSync(localData);
  }, [localData, performSync, syncStatus.isSyncing]);

  // ?ôÍ∏∞???ÄÍ∏?Ï§ëÏù∏ Î≥ÄÍ≤??¨Ìï≠???àÎäîÏßÄ ?ïÏù∏
  const hasPendingChanges = pendingChangesRef.current;

  return {
    localData,
    updateData,
    syncStatus,
    manualSync,
    hasPendingChanges,
    // ?ÑÏû¨ ?ôÍ∏∞???ÅÌÉú???∞Îùº UI??Î∞òÏòÅ?????àÎäî Í≥ÑÏÇ∞??Í∞íÎì§
    isSynced: !hasPendingChanges && !syncStatus.isSyncing && !syncStatus.error,
    needsSync: hasPendingChanges || syncStatus.isSyncing,
  };
}

// ?§Îßà???ôÍ∏∞??Ïª®ÌÖç?§Ìä∏
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