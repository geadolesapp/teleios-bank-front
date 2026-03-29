const CACHE_NAME = "teleios-bank-v1";
const urlsToCache = [
  "/teleios-bank-front/",
  "/teleios-bank-front/index.html",
  "/teleios-bank-front/manifest.json",
  "/teleios-bank-front/iconeTeleios192.png",
  "/teleios-bank-front/iconeTeleios512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
          return null;
        })
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
