/**
 * PattiBytes Service Worker
 * Version: 2.2.0
 */
const VERSION = 'pattibytes-v2.2.0';
const STATIC = 'pattibytes-static-v2.2.0';
const DYNAMIC = 'pattibytes-dynamic-v2.2.0';
const RUNTIME = 'pattibytes-runtime-v2.2.0';

// Precache only same-origin assets that won't go opaque
const PRECACHE_URLS = [
  '/app/',
  '/app/index.html',
  '/app/auth.html',
  '/app/manifest.webmanifest',
  // CSS
  '/app/assets/css/common.css',
  '/app/assets/css/dashboard.css',
  '/app/assets/css/auth.css',
  // JS (local)
  '/app/assets/js/app.js',
  '/app/assets/js/firebase-config.js',
  '/app/assets/js/auth-script.js',
  '/app/assets/js/dashboard-script.js'
];

// External assets cached at runtime (avoid addAll with opaque)
const EXTERNAL_ALLOWLIST = [
  'https://www.gstatic.com/firebasejs/',
  'https://fonts.googleapis.com/',
  'https://fonts.gstatic.com/',
  'https://i.ibb.co/'
];

// JSON/data endpoints
const DATA_URLS = [
  '/app/data/news.json',
  '/app/data/places.json',
  '/app/data/shop.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.map((n) => (n === STATIC || n === DYNAMIC || n === RUNTIME ? null : caches.delete(n)))
      );
      await self.clients.claim();
      const clients = await self.clients.matchAll();
      clients.forEach((c) => c.postMessage({ type: 'SW_ACTIVATED', version: VERSION }));
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only GET
  if (req.method !== 'GET') return;

  // Navigation requests: network-first with HTML fallback
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, '/app/index.html'));
    return;
  }

  // Same-origin static files we precached: cache-first
  if (url.origin === location.origin && PRECACHE_URLS.includes(url.pathname)) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // App data: stale-while-revalidate
  if (url.origin === location.origin && DATA_URLS.some((p) => url.pathname.includes(p))) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // External allowlist: runtime caching with cautious strategy
  if (EXTERNAL_ALLOWLIST.some((prefix) => url.href.startsWith(prefix))) {
    // Use cache-first for fonts/logo; tolerate opaque responses
    event.respondWith(cacheFirstExternal(req));
    return;
  }

  // Default inside /app/: network-first; otherwise passthrough
  if (url.origin === location.origin && url.pathname.startsWith('/app/')) {
    event.respondWith(networkFirst(req, '/app/index.html'));
  }
});

// Strategies
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res && res.ok) {
    const cache = await caches.open(STATIC);
    cache.put(request, res.clone());
  }
  return res;
}

async function cacheFirstExternal(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const res = await fetch(request);
    // Cache even if opaque (status 0)
    const cache = await caches.open(RUNTIME);
    cache.put(request, res.clone());
    return res;
  } catch (e) {
    return cached || Response.error();
  }
}

async function networkFirst(request, htmlFallbackPath = '/app/index.html') {
  try {
    const res = await fetch(request);
    if (res && (res.ok || res.type === 'opaqueredirect')) {
      const cache = await caches.open(DYNAMIC);
      cache.put(request, res.clone());
    }
    return res;
  } catch (e) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.destination === 'document') {
      const fallback = await caches.match(htmlFallbackPath);
      if (fallback) return fallback;
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

// Optional listeners (sync, push, message) can stay as in your file
