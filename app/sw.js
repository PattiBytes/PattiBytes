// /app/sw.js — App-only Service Worker (scope: /app/)
const CACHE = 'pattibytes-app-v1';
const APP_HTML = [
  '/app/index.html',
  '/app/news/index.html',
  '/app/places/index.html',
  '/app/shop/index.html'
];
const APP_ASSETS = [
  '/app/app.css',
  '/app/app.js',
  '/app/shared/navigation.js',
  '/app/shared/styles/navigation.css',
  '/icons/pwab-192.jpg',
  '/icons/pwab-512.jpg',
  '/app/offline.html' // optional fallback page
];

// Install: pre-cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([...APP_HTML, ...APP_ASSETS]))
      .then(() => self.skipWaiting())
  );
});

// Activate: cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: only handle /app/ requests; ignore everything else
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only intercept within /app/
  if (!url.pathname.startsWith('/app/')) return;

  const isHTML = url.pathname.endsWith('.html') || url.pathname.endsWith('/');

  if (isHTML) {
    // Network-first for HTML (fresh content; fallback to cache/offline)
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(async () => (await caches.match(event.request)) ||
          (await caches.match('/app/offline.html')) ||
          new Response('<h1>App offline</h1>', { status: 503, headers: { 'Content-Type': 'text/html' } })
        )
    );
  } else {
    // Cache-first for static assets
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        });
      })
    );
  }
});
