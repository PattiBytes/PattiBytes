const CACHE_NAME = 'pattibytes-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/index.css',
  '/index.js',
  '/style.css',
  '/script.js',
  '/manifest.webmanifest',
  '/icons/pwab-192.jpg',
  '/icons/pwab-512.jpg',
  '/news/index.html',
  '/news/news.css',
  '/news/news.js',
  '/places/index.html',
  '/places/places.css',
  '/places/places.js',
  '/shop/index.html',
  '/shop/shop.css',
  '/shop/shop.js',
  '/privacy-policy/index.html'
];

// Pre-cache on install (static app shell)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Cleanup outdated caches on activate
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Response logic: network-first for HTML, cache-first for others
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Network-first for HTML navigation
  if (event.request.mode === 'navigate' || /\.(html)$/.test(url.pathname)) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for assets (CSS, JS, icons)
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached ||
      fetch(event.request).then(response => {
        if (response.ok) {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
        }
        return response;
      }).catch(() => undefined)
    )
  );
});
