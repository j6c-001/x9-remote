const CACHE_NAME = 'device-remote-v9';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://img.icons8.com/ios-filled/192/ffffff/amplifier.png',
  'https://img.icons8.com/ios-filled/512/ffffff/amplifier.png',
  'https://img.icons8.com/ios-filled/50/ffffff/tv.png',
  'https://img.icons8.com/ios-filled/50/ffffff/music.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(ASSETS.map(url => cache.add(url)));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing Old Cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Don't cache proxy or device API calls
  if (event.request.url.includes('/dev/info.cgi') || event.request.url.includes('/proxy')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});