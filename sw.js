const CACHE_NAME = 'trading-app-v6';
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
  console.log('📦 SW: Instalando y cacheando archivos de la APP');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

// ===== ACTIVAR =====  
self.addEventListener('activate', event => {
  console.log('🔄 SW: Activando y limpiando cache vieja');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// ===== INTERCEPTAR PETICIONES =====
self.addEventListener('fetch', event => {
  const url = event.request.url;
  
  // 🔥 REGLA CRÍTICA: NO TOCAR peticiones a Google Script
  // Esto incluye tanto "script.google.com" como "docs.google.com"
  if (url.includes('script.google.com') || url.includes('docs.google.com')) {
    console.log('🌐 Petición a Google: PASANDO DIRECTO (sin cache)');
    return fetch(event.request); // Fetch directo, sin cachear
  }
  
  // Para TODO lo demás (archivos de tu app), usar cache
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          console.log('📂 Sirviendo desde cache:', url);
          return response;
        }
        
        console.log('🌐 Haciendo fetch online:', url);
        return fetch(event.request).then(response => {
          // Solo cachear archivos de nuestro dominio
          if (response.ok && url.includes('github.io')) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, clone);
            });
          }
          return response;
        });
      })
  );
});
