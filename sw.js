const CACHE_NAME = "trading-journal-v1";
const URLS_TO_CACHE = [
  "/Control-trading/",
  "/Control-trading/index.html",
  "/Control-trading/styles.css",
  "/Control-trading/app.js",
  "/Control-trading/manifest.json",
  "/Control-trading/icon-192.png",
  "/Control-trading/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
