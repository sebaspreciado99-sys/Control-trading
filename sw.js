const CACHE_NAME = 'trading-control-v5';
const APP_VERSION = '5.0.0';

// Archivos a cachear para funcionamiento offline
const urlsToCache = [
  './',
  './index.html',
  './app.js',
  './styles.css',
  './manifest.json',
  './icon-72.png',
  './icon-96.png',
  './icon-128.png',
  './icon-144.png',
  './icon-192.png',
  './icon-512.png'
];

// INSTALACIÓN: Cachear recursos
self.addEventListener('install', event => {
  console.log('🔄 Service Worker instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME + '-v' + APP_VERSION)
      .then(cache => {
        console.log('📦 Cache abierto, añadiendo recursos:', urlsToCache);
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ Todos los recursos cacheados');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Error al cachear:', error);
      })
  );
});

// ACTIVACIÓN: Limpiar caches viejas
self.addEventListener('activate', event => {
  console.log('🔄 Service Worker activando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME + '-v' + APP_VERSION) {
            console.log('🗑️ Borrando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker activado y listo');
      return self.clients.claim();
    })
  );
});

// INTERCEPTAR PETICIONES
self.addEventListener('fetch', event => {
  // NO cachear peticiones a Google Sheets (API)
  if (event.request.url.includes('script.google.com')) {
    // Para la API, siempre hacer fetch online
    return fetch(event.request)
      .catch(error => {
        console.log('🌐 Sin conexión para API, mostrando datos locales');
        // Puedes retornar una respuesta de respaldo aquí si quieres
      });
  }
  
  // Para recursos de la app, servir desde cache si es posible
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si está en cache, devolverlo
        if (response) {
          return response;
        }
        
        // Si no está en cache, hacer fetch
        return fetch(event.request)
          .then(response => {
            // Solo cachear si la respuesta es válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clonar la respuesta para cachear
            const responseToCache = response.clone();
            caches.open(CACHE_NAME + '-v' + APP_VERSION)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // Si es una página y falla, devolver la página principal
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
      })
  );
});

// MENSAJES (para actualizaciones)
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
