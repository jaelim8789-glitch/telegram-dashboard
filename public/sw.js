// TeleMon PWA Service Worker
// Cache-first for static assets, network-first for API calls.
// Supports push notifications.

const CACHE_NAME = "telemon-v3";
const STATIC_ASSETS = [
  "/",
  "/offline",
  "/manifest.json",
  "/favicon.svg",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
];

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
    // If JSON parsing fails, show raw text
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
      // Check if action was provided
      if (action && event.notification.data?.actions) {
        const actionConfig = event.notification.data.actions.find(
          (a: { action: string }) => a.action === action
        );
        if (actionConfig?.url) {
          return openOrFocus(actionConfig.url);
        }
      }

      return openOrFocus(url);
    })
  );

  function openOrFocus(targetUrl: string) {
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

// Fetch: cache-first for static, network-first for API
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

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
          return caches.match("/offline");
        }
        return caches.match(request);
      })
  );
});
