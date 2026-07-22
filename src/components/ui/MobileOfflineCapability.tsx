'use client';

import { useEffect, useState } from 'react';

export function MobileOfflineCapability() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [swError, setSwError] = useState(false);
  const [dbError, setDbError] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          // 모바일에서만 등록
          if (window.matchMedia('(max-width: 768px)').matches) {
            await navigator.serviceWorker.register('/sw.js');
          }
        } catch (error) {
          console.error('Service Worker registration failed:', error);
          setSwError(true);
        }
      }
    };

    const initLocalDatabase = async () => {
      if (!('indexedDB' in window)) {
        return;
      }

      const request = indexedDB.open('TeleMonLocalDB', 1);

      request.onerror = () => {
        setDbError(true);
      };

      request.onsuccess = () => {};

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('cachedData')) {
          const objectStore = db.createObjectStore('cachedData', { keyPath: 'id' });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // 오프라인 캐시를 위한 추가 스토어
        if (!db.objectStoreNames.contains('offlineQueue')) {
          const queueStore = db.createObjectStore('offlineQueue', { keyPath: 'id', autoIncrement: true });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
          queueStore.createIndex('type', 'type', { unique: false });
        }
      };
    };

    if (window.matchMedia('(max-width: 768px)').matches) {
      registerServiceWorker();
      initLocalDatabase();
    }

    // 네트워크 상태 변경 시 캐시 동기화
    const syncOfflineQueue = async () => {
      if (isOnline && 'indexedDB' in window) {
        const request = indexedDB.open('TeleMonLocalDB', 1);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction(['offlineQueue'], 'readonly');
          const store = tx.objectStore('offlineQueue');
          const getAll = store.getAll();
          
          getAll.onsuccess = () => {
            if (getAll.result.length > 0) {
              // 오프라인 큐에 있는 데이터를 서버로 전송
              // 실제 구현은 앱 로직에 따라 달라짐
              console.log('Syncing offline data:', getAll.result);
            }
          };
        };
      }
    };

    syncOfflineQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOnline]);

  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center p-2 z-50">
        <span className="text-sm font-medium">오프라인 모드 - 일부 기능이 제한될 수 있습니다</span>
      </div>
    );
  }

  if (swError || dbError) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-red-500 text-white text-center p-2 z-50">
        <span className="text-sm font-medium">오프라인 캐시 초기화에 실패했습니다</span>
      </div>
    );
  }

  return null;
}