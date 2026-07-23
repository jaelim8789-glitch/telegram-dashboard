// TeleMon PWA Service Worker
// Cache-first for static assets, network-first for API calls.
// Supports push notifications + IndexedDB offline data layer.

// 캐시 이름을 빌드 해시로 관리하여 자동 갱신
const CACHE_NAME = `telemon-vlufVuYLh8llbrcTCszzFr`;
const TEMP_CACHE_NAME = 'telemon-temp-v1';
const STATIC_ASSETS = [
  "/",
  "/app",
  "/offline",
  "/manifest.json",
  "/favicon.svg",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
  "/icons/icon-monochrome.svg",
];

const OFFLINE_HTML = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>TeleMon 오프라인</title>
    <style>
      :root { color-scheme: dark; }
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #0a0a0a;
        color: #f5f2e8;
        min-height: 100dvh;
        display: grid;
        place-items: center;
      }
      .card {
        width: min(92vw, 440px);
        border: 1px solid rgba(191, 162, 96, 0.32);
        background: linear-gradient(145deg, rgba(191, 162, 96, 0.08), rgba(20, 20, 20, 0.88));
        border-radius: 20px;
        padding: 24px;
        box-sizing: border-box;
      }
      h1 { margin: 0 0 8px; font-size: 20px; }
      p { margin: 0; color: #d0c7b2; line-height: 1.55; font-size: 14px; }
      .actions { display: flex; gap: 10px; margin-top: 18px; }
      button, a {
        border: 0;
        border-radius: 10px;
        padding: 10px 12px;
        font-weight: 600;
        font-size: 13px;
        text-decoration: none;
        cursor: pointer;
      }
      button { background: #bfa260; color: #141414; }
      a { background: rgba(255, 255, 255, 0.08); color: #f5f2e8; }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>오프라인 상태입니다</h1>
      <p>인터넷 연결이 복구되면 TeleMon 데이터가 자동으로 다시 동기화됩니다.</p>
      <div class="actions">
        <button onclick="location.reload()">다시 시도</button>
        <a href="/app">홈으로</a>
      </div>
    </main>
  </body>
</html>`;

const DB_NAME = "telemon-cache";
const DB_VERSION = 1;

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("api-responses")) {
        db.createObjectStore("api-responses");
      }
      if (!db.objectStoreNames.contains("notification-metrics")) {
        db.createObjectStore("notification-metrics");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbPut(storeName, key, data, ttl) {
  return openIndexedDB().then((db) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    store.put({ data, expiry: Date.now() + ttl }, key);
  });
}

function idbGet(storeName, key) {
  return openIndexedDB().then((db) => {
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.expiry > Date.now()) {
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  });
}

// 푸시 알림 메트릭스 저장 함수
function trackNotificationEvent(notificationId, eventType, data = {}) {
  return openIndexedDB().then((db) => {
    const tx = db.transaction("notification-metrics", "readwrite");
    const store = tx.objectStore("notification-metrics");
    
    return store.get(notificationId).then((existingRecord) => {
      const now = Date.now();
      const record = existingRecord || { 
        id: notificationId, 
        createdAt: now,
        events: []
      };
      
      record.events.push({
        type: eventType,
        timestamp: now,
        ...data
      });
      
      store.put(record);
    });
  });
}

// 이전 캐시 정리
function cleanupOldCaches() {
  return caches.keys().then((cacheNames) => {
    return Promise.all(
      cacheNames
        .filter((cacheName) => {
          return cacheName.startsWith('telemon-') && cacheName !== CACHE_NAME;
        })
        .map((cacheName) => {
          console.log(`Deleting old cache: ${cacheName}`);
          return caches.delete(cacheName);
        })
    );
  });
}

// SW 설치 시
self.addEventListener('install', (event) => {
  console.log(`Installing service worker with cache: ${CACHE_NAME}`);
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).then(() => {
        self.skipWaiting(); // 새로운 SW가 즉시 활성화되도록
      });
    })
  );
});

// SW 활성화 시
self.addEventListener('activate', (event) => {
  console.log(`Activating service worker with cache: ${CACHE_NAME}`);
  
  event.waitUntil(
    Promise.all([
      cleanupOldCaches(), // 이전 캐시 정리
      self.clients.claim() // 새 SW가 즉시 제어권 획득
    ])
  );
});

// 요청 처리
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 외부 리소스는 캐시하지 않음
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/offline');
      })
    );
    return;
  }
  
  // API 요청은 네트워크 우선
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 응답을 캐시에 저장 (특정 조건에 따라)
          if (response.ok && request.method === 'GET') {
            const responseClone = response.clone();
            caches.open(TEMP_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // 네트워크 실패 시 캐시에서 제공
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return new Response(OFFLINE_HTML, {
              headers: { 'Content-Type': 'text/html' }
            });
          });
        })
    );
    return;
  }
  
  // 정적 자산은 캐시 우선
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // 개발 환경에서는 최신 자산을 위해 네트워크 요청 시도
        if (process.env.NODE_ENV === 'development') {
          return fetch(request)
            .then((networkResponse) => {
              // 네트워크 응답이 더 최신이면 캐시 갱신
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse.clone());
              });
              return networkResponse;
            })
            .catch(() => cachedResponse); // 네트워크 실패 시 캐시 반환
        }
        return cachedResponse;
      }
      
      // 캐시에 없으면 네트워크에서 가져옴
      return fetch(request)
        .then((response) => {
          // 응답이 유효하면 캐시에 저장
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // 네트워크 실패 시 오프라인 페이지 반환
          if (request.destination === 'document') {
            return new Response(OFFLINE_HTML, {
              headers: { 'Content-Type': 'text/html' }
            });
          }
          return new Response(OFFLINE_HTML, {
            headers: { 'Content-Type': 'text/html' }
          });
        });
    })
  );
});

// 푸시 이벤트 처리
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const payload = event.data.json();
  const title = payload.title || 'TeleMon';
  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-monochrome.svg',
    tag: payload.tag || 'telemon-notification',
    data: {
      ...payload.data || {},
      notificationId: payload.notificationId || Date.now().toString()
    }
  };

  // 알림 전달 이벤트 기록
  const notificationId = options.data.notificationId;
  trackNotificationEvent(notificationId, 'delivered', {
    title: title,
    body: options.body
  }).catch(err => console.error('Failed to track notification delivery:', err));

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 알림 클릭 이벤트 처리
self.addEventListener('notificationclick', (event) => {
  const notificationId = event.notification.data?.notificationId;
  
  // 알림 클릭 이벤트 기록
  if (notificationId) {
    trackNotificationEvent(notificationId, 'clicked', {
      action: event.action || 'default'
    }).catch(err => console.error('Failed to track notification click:', err));
  }

  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// 알림 닫힘 이벤트 처리
self.addEventListener('notificationclose', (event) => {
  const notificationId = event.notification.data?.notificationId;
  
  // 알림 닫힘 이벤트 기록
  if (notificationId) {
    trackNotificationEvent(notificationId, 'closed', {
      wasClicked: false
    }).catch(err => console.error('Failed to track notification close:', err));
  }
});