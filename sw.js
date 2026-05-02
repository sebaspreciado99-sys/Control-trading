const CACHE_NAME = 'trading-app-v3';

const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './styles.css',
  './app.js'
];

self.addEventListener('install', event => {
  console.log('📦 Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  if (event.request.url.includes('script.google.com')) {
    return;
  }
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
