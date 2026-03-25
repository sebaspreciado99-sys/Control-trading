// sw.js - Service Worker PRO CORREGIDO
const CACHE_NAME = 'trading-app-v2';

const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './styles.css',
  './app.js',
  './icon-192.png',
  './icon-512.png'
];

// ===== INSTALAR =====
self.addEventListener('install', event => {
  console.log('📦 SW: Instalando...');
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 SW: Cacheando archivos');
        return cache.addAll(urlsToCache);
      })
  );
});

// ===== ACTIVAR =====
self.addEventListener('activate', event => {
  console.log('🚀 SW: Activando...');

  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('🗑 Eliminando cache vieja:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );

  self.clients.claim();
});

// ===== FETCH =====
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // 🔥 NO INTERFERIR con Google Apps Script
  if (
    url.includes('script.google.com') ||
    url.includes('docs.google.com')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        return fetch(event.request)
          .then(res => {
            if (!res || res.status !== 200) return res;

            const clone = res.clone();

            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, clone);
            });

            return res;
          })
          .catch(() => {
            return caches.match('./index.html');
          });
      })
  );
});
