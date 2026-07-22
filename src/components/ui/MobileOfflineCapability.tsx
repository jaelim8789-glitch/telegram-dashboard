'use client';

import { useEffect, useState } from 'react';

export function MobileOfflineCapability() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // 네트워크 상태 변경 감지
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Service Worker 등록으로 오프라인 기능 향상
    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/sw.js');
          console.log('서비스 워커 등록 성공');
        } catch (error) {
          console.error('서비스 워커 등록 실패:', error);
        }
      }
    };

    // IndexedDB를 사용한 로컬 데이터 저장
    const initLocalDatabase = async () => {
      if (!('indexedDB' in window)) {
        console.log('IndexedDB가 지원되지 않습니다.');
        return;
      }

      const request = indexedDB.open('TeleMonLocalDB', 1);

      request.onerror = () => {
        console.error('데이터베이스 열기 실패');
      };

      request.onsuccess = () => {
        console.log('데이터베이스 열기 성공');
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 오프라인 시 필요한 데이터 저장을 위한 객체 저장소 생성
        if (!db.objectStoreNames.contains('cachedData')) {
          const objectStore = db.createObjectStore('cachedData', { keyPath: 'id' });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    };

    // 모바일 환경에서만 실행
    if (window.matchMedia('(max-width: 768px)').matches) {
      registerServiceWorker();
      initLocalDatabase();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 네트워크 상태 표시
  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center p-2 z-50">
        <span className="text-sm font-medium">오프라인 모드 - 일부 기능이 제한될 수 있습니다</span>
      </div>
    );
  }

  return null;
}