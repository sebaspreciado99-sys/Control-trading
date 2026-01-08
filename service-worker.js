const CACHE_NAME = 'control-trading-pwa-v1';
const urlsToCache = [
  '/Control-trading/',
  '/Control-trading/index.html',
  '/Control-trading/manifest.json',
  '/Control-trading/icon-192.png',
  '/Control-trading/icon-512.png'
  // AÑADE AQUÍ LA RUTA DE TODOS TUS ARCHIVOS (CSS, JS, IMÁGENES)
  // EJEMPLO: '/Control-trading/style.css',
];

self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Almacenando archivos en caché');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] Instalación completada');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[Service Worker] Error en instalación:', error);
      })
  );
});

self.addEventListener('activate', event => {
  console.log('[Service Worker] Activando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Borrando caché antigua:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Activación completada. Listo para controlar peticiones.');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(response => {
          if(!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          return response;
        }).catch(() => {
          // Opcional: Puedes crear una página offline.html
          // return caches.match('/Control-trading/offline.html');
        });
      })
  );
});
