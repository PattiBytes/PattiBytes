// sw.js
const CACHE_NAME = 'pattibytes-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/index.css',
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
  '/shop/shop.js'
];

// Install: precache essential files
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null))))
  );
  self.clients.claim();
});

// Fetch: network-first for navigation, cache-first for others
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
  } else {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy));
        return res;
      }))
    );
  }
});
