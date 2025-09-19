// /sw.js — Root website Service Worker (scope: /)
const CACHE = 'pattibytes-web-v1'; // bump to v2 when you ship updates

// Core website HTML routes (not app)
const HTML_ROUTES = [
  '/', '/index.html',
  '/news/', '/news/index.html',
  '/places/', '/places/index.html',
  '/shop/', '/shop/index.html'
];

// Static assets to cache
const STATIC_ASSETS = [
  '/style.css',
  '/script.js',
  '/manifest.webmanifest',
  '/icons/pwab-192.jpg',
  '/icons/pwab-512.jpg'
];

// Install: pre-cache essential pages and assets (tolerate individual failures)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll([...HTML_ROUTES, ...STATIC_ASSETS]))
      .catch(err => console.warn('[SW] addAll warning:', err))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches and enable navigation preload
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    if (self.registration.navigationPreload) {
      await self.registration.navigationPreload.enable();
    }
    await self.clients.claim();
  })());
});

// Fetch: handle only website routes; let /app/ fall through to its own SW
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignore non-GET and cross-origin
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // IMPORTANT: do not touch the app; /app/ is handled by /app/sw.js
  if (url.pathname.startsWith('/app/')) return;

  const isHTMLNav = event.request.mode === 'navigate'
                 || url.pathname.endsWith('.html')
                 || url.pathname.endsWith('/');

  if (isHTMLNav) {
    event.respondWith(handleHTML(event));
  } else {
    event.respondWith(handleAsset(event));
  }
});

async function handleHTML(event) {
  try {
    const preload = await event.preloadResponse;
    if (preload) {
      caches.open(CACHE).then(c => c.put(event.request, preload.clone()));
      return preload;
    }
    const net = await fetch(event.request);
    caches.open(CACHE).then(c => c.put(event.request, net.clone()));
    return net;
  } catch (err) {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    // Minimal inline offline page to avoid requiring an extra file
    return new Response(`
      <!doctype html><meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Offline - Patti Bytes</title>
      <style>
        body{font-family:system-ui;margin:0;display:grid;place-items:center;min-height:100vh;background:#f8fafc;color:#1f2937}
        .b{max-width:460px;padding:24px;text-align:center}
        button{background:#2563eb;color:#fff;border:0;padding:10px 16px;border-radius:8px;cursor:pointer}
        a{display:inline-block;margin-top:12px;color:#2563eb;text-decoration:none}
      </style>
      <div class="b">
        <h1>🌐 Offline</h1>
        <p>ਇੰਟਰਨੈਟ ਕਨੈਕਸ਼ਨ ਚੈਕ ਕਰੋ ਅਤੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ</p>
        <button onclick="location.reload()">Refresh</button>
        <a href="/app/">Open App</a>
      </div>
    `, { status: 503, headers: { 'Content-Type': 'text/html' } });
  }
}

async function handleAsset(event) {
  const cached = await caches.match(event.request);
  if (cached) return cached;
  try {
    const net = await fetch(event.request);
    caches.open(CACHE).then(c => c.put(event.request, net.clone()));
    return net;
  } catch {
    return new Response('Asset not available', { status: 404 });
  }
}

// Optional: allow clients to activate updates immediately
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

console.log('[SW] Root website Service Worker ready');
