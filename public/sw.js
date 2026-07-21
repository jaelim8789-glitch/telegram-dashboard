// TeleMon PWA Service Worker
// Cache-first for static assets, network-first for API calls.
// Supports push notifications + IndexedDB offline data layer.

const CACHE_NAME = "telemon-v6";
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
        const entry = request.result;
        if (!entry) return resolve(null);
        if (entry.expiry && Date.now() > entry.expiry) {
          db.transaction(storeName, "readwrite").objectStore(storeName).delete(key);
          return resolve(null);
        }
        resolve(entry.data);
      };
      request.onerror = () => resolve(null);
    });
  });
}

// Install: cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Push event: show notification
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body ?? "",
      icon: data.icon ?? "/icons/icon-192.svg",
      badge: "/icons/icon-192.svg",
      tag: data.tag ?? "telemon-default",
      data: {
        url: data.url ?? "/",
      },
      vibrate: data.vibrate ?? [10, 30, 10],
      requireInteraction: data.requireInteraction ?? false,
      actions: data.actions ?? [],
    };

    event.waitUntil(
      self.registration.showNotification(
        data.title ?? "TeleMon",
        options
      )
    );
  } catch {
    event.waitUntil(
      self.registration.showNotification("TeleMon", {
        body: event.data.text(),
        icon: "/icons/icon-192.svg",
      })
    );
  }
});

// Notification click: navigate to URL or focus existing client
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url ?? "/";
  const action = event.action;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      if (action && event.notification.data?.actions) {
        const actionConfig = event.notification.data.actions.find(
          (a) => a.action === action
        );
        if (actionConfig?.url) {
          return openOrFocus(actionConfig.url);
        }
      }

      return openOrFocus(url);
    })
  );

  function openOrFocus(targetUrl) {
    return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    });
  }
});

// Fetch: network-first for API (IndexedDB + Cache Storage fallback),
// cache-first for static, offline fallback for navigation
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  // API routes: network-first, fall back to Cache Storage then IndexedDB
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
          clone.json().then((json) => {
            idbPut("api-responses", request.url, json, 5 * 60 * 1000);
          }).catch(() => {});
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          const idbData = await idbGet("api-responses", request.url);
          if (idbData) {
            return new Response(JSON.stringify(idbData), {
              headers: { "Content-Type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ error: "offline" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        })
    );
    return;
  }

  // Static Next.js assets: cache-first with network update
  if (url.pathname.startsWith("/_next/static")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return (
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
            return response;
          })
        );
      })
    );
    return;
  }

  // All other requests: network-first, offline fallback for navigation
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, clone);
        });
        return response;
      })
      .catch(() => {
        if (request.mode === "navigate") {
          return caches.match("/offline").then((cachedOfflinePage) => {
            if (cachedOfflinePage) return cachedOfflinePage;
            return new Response(OFFLINE_HTML, {
              headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "no-store",
              },
            });
          });
        }
        return caches.match(request);
      })
  );
});
