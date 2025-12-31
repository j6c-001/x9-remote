const CACHE_NAME = 'device-remote-v64';
const CORE_ASSETS = [
  '/',
  'index.html',
  'style.css',
  'app.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'icon-180.png',
  'vu_0.webp', 'vu_1.webp', 'vu_2.webp', 'vu_3.webp', 'vu_4.webp',
  'vu_5.webp', 'vu_6.webp', 'vu_7.webp', 'vu_8.webp', 'vu_9.webp',
  'vu_10.webp', 'vu_11.webp', 'vu_12.webp', 'vu_13.webp', 'vu_14.webp'
];

self.addEventListener('install', (event) => {
  console.log('SW: Install Event starting');
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        console.log('SW: Cache opened:', CACHE_NAME);
        for (const url of CORE_ASSETS) {
          try {
            await cache.add(url);
            console.log('SW: Successfully cached:', url);
          } catch (err) {
            console.warn('SW: Failed to cache:', url, err);
          }
        }
      } catch (err) {
        console.error('SW: Install failed critically:', err);
      } finally {
        console.log('SW: Install logic finished, skipping waiting');
        self.skipWaiting();
      }
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
      caches.keys().then(cacheNames =>
          Promise.all(
              cacheNames.map(name => name !== CACHE_NAME ? caches.delete(name) : null)
          )
      ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Skip SW entirely for APIs (don't cache, pass through)
  if (event.request.url.includes('/dev/info.cgi') ||
      event.request.url.includes('/proxy') ||
      event.request.url.includes('/httpapi.asp')) {
    return;  // Let browser handle directly
  }

  event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
          caches.match(event.request, { ignoreSearch: true })
              .then(cached => cached || fetchWithCache(event.request, cache))
      )
  );
});

async function fetchWithCache(request, cache) {
  try {
    const response = await fetch(request);

    // Cache images (local + external/opaque) for offline
    if (request.destination === 'image' ||
        request.url.match(/\.(webp|png|jpg|jpeg|svg)$/i) ||
        request.url.includes('icons8.com')) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (err) {
    // Offline fallback: try cache again or basic error
    return caches.match(request) ||
        new Response('Offline', { status: 503 });
  }
}
