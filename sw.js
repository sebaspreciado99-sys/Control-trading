// sw.js - Service Worker Corregido para PWA
const CACHE_NAME = 'trading-app-v5';

const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './styles.css',
  './app.js',
  './icon-192.png',
  './icon-512.png'
];

// INSTALACIÓN
self.addEventListener('install', event => {
  console.log('📦 SW: Instalando...');
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 SW: Cacheando archivos principales');
        return cache.addAll(urlsToCache);
      })
      .catch(error => console.log('Error al cachear:', error))
  );
});

// ACTIVACIÓN
self.addEventListener('activate', event => {
  console.log('🚀 SW: Activando...');

  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('🗑 Eliminando caché antigua:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );

  self.clients.claim();
});

// FETCH (manejo de peticiones)
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // NO cachear ni interferir con Google Sheets / Apps Script
  if (url.includes('script.google.com') || url.includes('docs.google.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si está en caché, devolverlo
        if (response) {
          return response;
        }

        // Si no está en caché, buscar en internet
        return fetch(event.request)
          .then(res => {
            if (!res || res.status !== 200) {
              return res;
            }

            // Clonar y guardar en caché
            const resClone = res.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, resClone);
            });

            return res;
          })
          .catch(() => {
            // Si no hay internet, devolver la página principal (offline)
            return caches.match('./index.html');
          });
      })
  );
});
