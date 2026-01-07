const CACHE_NAME = 'trading-control-pwa-v1';
const API_URL = 'https://script.google.com';

// Archivos de la APP para cachear
const APP_FILES = [
  './',
  './index.html',
  './app.js', 
  './styles.css',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ===== INSTALAR =====
self.addEventListener('install', event => {
  console.log('📦 Service Worker: INSTALANDO...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Cacheando archivos de la app:', APP_FILES);
        return cache.addAll(APP_FILES);
      })
      .then(() => self.skipWaiting())
  );
});

// ===== ACTIVAR =====
self.addEventListener('activate', event => {
  console.log('🔄 Service Worker: ACTIVANDO...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('🗑️ Borrando cache vieja:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ===== INTERCEPTAR PETICIONES =====
self.addEventListener('fetch', event => {
  const url = event.request.url;
  
  // 🔥 REGLA CRÍTICA: NO INTERCEPTAR peticiones a Google Apps Script
  if (url.includes('script.google.com')) {
    console.log('🌐 Petición a Google Script: PASANDO DIRECTO');
    // Dejar pasar la petición SIN INTERFERIR
    return fetch(event.request)
      .catch(error => {
        console.error('❌ Error en petición a Google Sheets:', error);
        // Puedes retornar una respuesta de fallback si quieres
        return new Response(JSON.stringify({ 
          status: 'error', 
          message: 'Sin conexión a Google Sheets' 
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      });
  }
  
  // Para archivos de la APP, usar cache primero
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 1. Si está en cache, devolverlo
        if (response) {
          console.log('📂 Sirviendo desde cache:', url);
          return response;
        }
        
        // 2. Si NO está en cache, hacer fetch online
        console.log('🌐 Haciendo fetch online:', url);
        return fetch(event.request)
          .then(response => {
            // Solo cachear si es exitoso y es de nuestro dominio
            if (response && response.status === 200 && 
                response.type === 'basic' &&
                url.includes('sebaspreciado99-sys.github.io')) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseClone);
                });
            }
            return response;
          })
          .catch(() => {
            // Si falla y es una página HTML, devolver la offline
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
      })
  );
});
