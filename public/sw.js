// TeleMon PWA Service Worker
// Cache-first for static assets, network-first for API calls.
//
// IMPORTANT: CACHE_NAME must change on any deploy that should invalidate
// old clients' caches. It was hardcoded as "telemon-v1" forever, so the
// activate handler's cleanup (which deletes any cache key != CACHE_NAME)
// never actually fired — old caches (including the pre-cached "/" shell)
// stuck around indefinitely and kept serving stale UI to already-visited
// browsers no matter how many times the site was redeployed or how hard
// the user refreshed (a service worker sits in front of the HTTP cache
// entirely). Bump this string whenever a deploy needs to force a clean
// cache for returning users.

const CACHE_NAME = "telemon-v2";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/favicon.svg",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
];

// Install: cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Silently skip assets that fail to cache (e.g. on first load)
      });
    })
  );
  // Activate immediately without waiting for page reload
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
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch: cache-first for static, network-first for API
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls — network first, fall back to cache
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

  // Next.js static assets (_next/static) — cache-first
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

  // Everything else — network first
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
});
