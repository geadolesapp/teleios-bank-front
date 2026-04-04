const APP_CACHE_VERSION = "teleios-bank-v4";
const APP_PREFIX = "/teleios-bank-front";

const urlsToCache = [
  `${APP_PREFIX}/`,
  `${APP_PREFIX}/index.html`,
  `${APP_PREFIX}/manifest.json`,
  `${APP_PREFIX}/iconeTeleios192.png`,
  `${APP_PREFIX}/iconeTeleios512.png`,
];

self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(APP_CACHE_VERSION).then((cache) => {
      return cache.addAll(urlsToCache);
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== APP_CACHE_VERSION) {
              return caches.delete(cacheName);
            }
            return null;
          }),
        ),
      ),
    ]),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(APP_CACHE_VERSION).then((cache) => {
            cache.put(`${APP_PREFIX}/index.html`, responseClone);
          });
          return response;
        })
        .catch(() => caches.match(`${APP_PREFIX}/index.html`)),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          url.pathname.startsWith(APP_PREFIX)
        ) {
          const responseClone = networkResponse.clone();
          caches.open(APP_CACHE_VERSION).then((cache) => {
            cache.put(request, responseClone);
          });
        }

        return networkResponse;
      });
    }),
  );
});
