const CACHE_NAME = 'device-remote-v30';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  'https://img.icons8.com/ios-filled/180/ffffff/speaker.png',
  'https://img.icons8.com/ios-filled/100/ffffff/speaker.png',
  'https://img.icons8.com/ios-filled/500/ffffff/speaker.png',
  'https://img.icons8.com/ios-filled/50/ffffff/tv.png',
  'https://img.icons8.com/ios-filled/50/ffffff/music.png',
  'https://img.icons8.com/ios-filled/50/ffffff/play.png',
  'https://img.icons8.com/ios-filled/50/ffffff/pause.png',
  'https://img.icons8.com/ios-filled/50/ffffff/previous.png',
  'https://img.icons8.com/ios-filled/50/ffffff/next.png',
  '/vu_0.webp', '/vu_1.webp', '/vu_2.webp', '/vu_3.webp', '/vu_4.webp',
  '/vu_5.webp', '/vu_6.webp', '/vu_7.webp', '/vu_8.webp', '/vu_9.webp',
  '/vu_10.webp', '/vu_11.webp', '/vu_12.webp', '/vu_13.webp', '/vu_14.webp'
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
  // Don't cache proxy, device API calls, or WiiM API calls
  if (event.request.url.includes('/dev/info.cgi') || 
      event.request.url.includes('/proxy') || 
      event.request.url.includes('/httpapi.asp')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;
      return fetch(event.request).then(networkResponse => {
        // Cache local images on the fly for offline support
        if (event.request.url.startsWith(self.location.origin) && 
            (event.request.url.match(/\.(webp|png|jpg|jpeg|svg)$/) || event.request.url.includes('/icons8.com/'))) {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }
        return networkResponse;
      });
    })
  );
});