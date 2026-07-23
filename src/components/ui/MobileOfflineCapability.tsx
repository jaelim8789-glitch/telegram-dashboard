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
          await navigator.serviceWorker.register('/sw.js');
        } catch {
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
      };
    };

    if (window.matchMedia('(max-width: 768px)').matches) {
      registerServiceWorker();
      initLocalDatabase();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center p-2 z-50">
        <span className="text-sm font-medium">?¤í”„?¼ì¸ ëª¨ë“œ - ?¼ë? ê¸°ëŠ¥???œí•œ?????ˆìŠµ?ˆë‹¤</span>
      </div>
    );
  }

  if (swError || dbError) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-red-500 text-white text-center p-2 z-50">
        <span className="text-sm font-medium">?¤í”„?¼ì¸ ìºì‹œ ì´ˆê¸°?”ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤</span>
      </div>
    );
  }

  return null;
}
