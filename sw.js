const CACHE_NAME = 'cali-catalog-v2'; // Cambiamos a v2 para forzar la limpieza

const urlsToCache = [
    './',
    './index.html',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@500;700&family=Montserrat:wght@400;600;700;900&family=Bebas+Neue&display=swap'
];

// Instalación: Guarda los archivos iniciales
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting()) // Fuerza al nuevo Service Worker a activarse de inmediato
    );
});

// Activación: Elimina cachés viejos automáticamente
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Toma el control de la página inmediatamente
    );
});

// ESTRATEGIA NUEVA: Network First (Primero Internet, ideal para datos dinámicos)
self.addEventListener('fetch', event => {
    // Solo manejamos peticiones de tipo GET (para páginas, estilos, etc.)
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                // Si va a internet y todo está bien, guardamos una copia fresca en la caché
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                // 🛠️ MODO OFFLINE: Si internet falla (sin señal), busca en la caché
                return caches.match(event.request).then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // Si no está en caché y no hay internet, muestra un error básico
                    return new Response('No estás conectado a internet y este archivo no está respaldado.', {
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
                });
            })
    );
});