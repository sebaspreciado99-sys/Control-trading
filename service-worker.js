// sw.js - Service Worker para PWA de Trading
const CACHE_NAME = 'trading-app-v1.0';
const urlsToCache = [
  '/Control-trading/',
  '/Control-trading/index.html',
  '/Control-trading/manifest.json',
  '/Control-trading/styles.css',
  '/Control-trading/app.js',
  '/Control-trading/icon-192.png',
  '/Control-trading/icon-512.png'
];

// INSTALACIÓN
self.addEventListener('install', event => {
  console.log('📦 [Service Worker] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 [Service Worker] Cacheando recursos esenciales');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ [Service Worker] Instalación completada');
        return self.skipWaiting();
      })
  );
});

// ACTIVACIÓN
self.addEventListener('activate', event => {
  console.log('🚀 [Service Worker] Activando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('🗑️ [Service Worker] Eliminando caché antigua:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      console.log('✅ [Service Worker] Activación completada');
      return self.clients.claim();
    })
  );
});

// FETCH - Manejo de solicitudes
self.addEventListener('fetch', event => {
  // Solo manejar solicitudes GET
  if (event.request.method !== 'GET') return;
  
  // Excluir Google Sheets y otros recursos externos del caché
  if (event.request.url.includes('docs.google.com') || 
      event.request.url.includes('script.google.com')) {
    return fetch(event.request);
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si está en caché, devolverlo
        if (response) {
          return response;
        }
        
        // Si no está en caché, buscar en red
        return fetch(event.request)
          .then(response => {
            // Validar respuesta
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clonar respuesta para caché
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            console.error('❌ Error de red:', error);
            
            // Para rutas específicas, devolver página offline
            if (event.request.mode === 'navigate') {
              return caches.match('/Control-trading/index.html');
            }
            
            return new Response('Modo offline - No hay conexión', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// SYNC BACKGROUND - Para sincronización con Google Sheets
self.addEventListener('sync', event => {
  if (event.tag === 'sync-trades') {
    console.log('🔄 [Service Worker] Sincronizando trades...');
    event.waitUntil(syncTradesWithGoogleSheets());
  }
});

// PUSH NOTIFICATIONS
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Nueva notificación de trading',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver detalles',
        icon: 'icon-192.png'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: 'icon-192.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('📈 TRADING', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/Control-trading/')
    );
  }
});

// Función para sincronizar con Google Sheets (pendiente)
async function syncTradesWithGoogleSheets() {
  // Aquí iría tu lógica de sincronización con Google Apps Script
  console.log('📤 Sincronizando trades con Google Sheets...');
  return Promise.resolve();
}
