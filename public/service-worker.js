/**
 * Service Worker para Sanos y Salvos
 * 
 * Proporciona capacidades offline y caching inteligente de recursos.
 * Implementa estrategias de cache-first y network-first según el tipo de recurso.
 */

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAMES = {
  static: `static-${CACHE_VERSION}`,
  dynamic: `dynamic-${CACHE_VERSION}`,
  api: `api-${CACHE_VERSION}`,
};

// Recursos estáticos que siempre cachear en la instalación
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.json',
];

/**
 * Evento: Instalación del Service Worker
 * Cachea recursos estáticos críticos para funcionamiento offline
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAMES.static).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

/**
 * Evento: Activación del Service Worker
 * Limpia versiones antiguas de cachés para liberar espacio
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !Object.values(CACHE_NAMES).includes(name))
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

/**
 * Evento: Intercepción de requests
 * Implementa estrategias inteligentes según el tipo de recurso:
 * - Estáticos: cache-first (caché primero, red de fallback)
 * - API: network-first (red primero, caché de fallback para offline)
 * - Dinámicos: network-first con update-on-success
 */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // No cachear solicitudes no-GET ni del mismo origen en algunos casos
  if (event.request.method !== 'GET') {
    return;
  }

  // Estrategia para APIs: network-first (siempre intenta red primero)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(event.request));
    return;
  }

  // Estrategia para assets estáticos: cache-first
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|webp|woff2?)$/i) ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(cacheFirstStrategy(event.request));
    return;
  }

  // Fallback: network-first para HTML y otros
  event.respondWith(networkFirstStrategy(event.request));
});

/**
 * Cache-first strategy: intenta caché primero, usa red como fallback
 * Ideal para assets que no cambian frecuentemente
 */
async function cacheFirstStrategy(request) {
  try {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    const response = await fetch(request);
    if (!response || response.status !== 200 || response.type === 'error') {
      return response;
    }

    // Clona la respuesta para guardar en caché
    const responseToCache = response.clone();
    const cacheName = request.url.includes('/api/') ? CACHE_NAMES.api : CACHE_NAMES.dynamic;
    
    caches.open(cacheName).then((cache) => {
      cache.put(request, responseToCache);
    });

    return response;
  } catch (error) {
    console.error('[ServiceWorker] Cache-first error:', error);
    const cached = await caches.match(request);
    return cached || new Response('Offline - Recurso no disponible', { status: 503 });
  }
}

/**
 * Network-first strategy: intenta red primero, usa caché como fallback
 * Ideal para contenido dinámico y datos que cambian frecuentemente
 */
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    
    if (response && response.status === 200) {
      // Si es éxito, cachea para acceso offline
      const responseToCache = response.clone();
      const cacheName = request.url.includes('/api/') ? CACHE_NAMES.api : CACHE_NAMES.dynamic;
      
      caches.open(cacheName).then((cache) => {
        cache.put(request, responseToCache);
      });
    }

    return response;
  } catch (error) {
    console.error('[ServiceWorker] Network-first error:', error);
    // Si la red falla, intenta caché como fallback
    const cached = await caches.match(request);
    return cached || new Response('Offline - No hay conexión disponible', { status: 503 });
  }
}

/**
 * Manejo de mensajes desde el cliente
 * Permite comunicación bidireccional con la app
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
