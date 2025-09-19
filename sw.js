const CACHE_NAME = 'pattibytes-v6';
const APP_VERSION = '2.0.0';

// Website assets (browser pages)
const WEBSITE_ASSETS = [
  '/',
  '/index.html',
  '/news/',
  '/news/index.html',
  '/places/',
  '/places/index.html',
  '/shop/',
  '/shop/index.html',
  '/style.css',
  '/script.js'
];

// App assets (app-only pages)
const APP_ASSETS = [
  '/app/',
  '/app/index.html',
  '/app/app.css',
  '/app/app.js',
  '/app/shared/navigation.js',
  '/app/shared/styles/navigation.css',
  '/app/news/',
  '/app/news/index.html',
  '/app/places/',
  '/app/places/index.html',
  '/app/shop/',
  '/app/shop/index.html',
  '/app/community/',
  '/app/community/index.html',
  '/app/dashboard/',
  '/app/dashboard/index.html',
  '/app/profile/',
  '/app/profile/index.html',
  '/app/offline.html'
];

// Shared assets
const SHARED_ASSETS = [
  '/manifest.webmanifest',
  '/icons/pwab-192.jpg',
  '/icons/pwab-512.jpg',
  '/icons/favicon.ico'
];

// Install - cache everything
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching website, app, and shared assets');
        const allAssets = [...WEBSITE_ASSETS, ...APP_ASSETS, ...SHARED_ASSETS];
        return cache.addAll(allAssets);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate - clean old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => Promise.all(
        cacheNames.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch - smart routing (no redirects)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET and external
  if (event.request.method !== 'GET') return;
  if (url.origin !== location.origin) return;

  if (url.pathname.startsWith('/app/')) {
    event.respondWith(handleAppRoute(event.request));
    return;
  }

  if (isWebsiteRoute(url.pathname)) {
    event.respondWith(handleWebsiteRoute(event.request));
    return;
  }

  // Shared or other assets
  event.respondWith(handleAssetRoute(event.request));
});

function isWebsiteRoute(pathname) {
  const websiteRoutes = ['/', '/index.html', '/news/', '/places/', '/shop/'];
  return websiteRoutes.some(route => pathname === route || pathname.startsWith(route));
}

async function handleAppRoute(request) {
  const url = new URL(request.url);
  try {
    // Cache-first for app shell speed; update in background
    const cached = await caches.match(request);
    if (cached) {
      fetch(request).then(r => {
        if (r.ok) caches.open(CACHE_NAME).then(c => c.put(request, r.clone()));
      }).catch(() => {});
      return cached;
    }
    const net = await fetch(request);
    if (net.ok) (await caches.open(CACHE_NAME)).put(request, net.clone());
    return net;
  } catch (err) {
    // App offline fallback
    if (url.pathname.endsWith('/') || url.pathname.endsWith('.html')) {
      return (await caches.match('/app/offline.html')) || new Response(`
        <!DOCTYPE html><html><head><meta charset="utf-8"><title>App Offline</title></head>
        <body style="font-family:system-ui;text-align:center;padding:2rem;">
          <h1>📱 App Offline</h1>
          <p>Check connection and retry</p>
          <button onclick="location.reload()">Refresh</button>
        </body></html>
      `, { headers: { 'Content-Type': 'text/html' }, status: 503 });
    }
    return new Response('App resource not available', { status: 503 });
  }
}

async function handleWebsiteRoute(request) {
  try {
    // Network-first for live content
    const net = await fetch(request);
    if (net.ok) (await caches.open(CACHE_NAME)).put(request, net.clone());
    return net;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Simple offline page for website
    return new Response(`
      <!DOCTYPE html><html lang="pa"><head><meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Offline - Patti Bytes</title>
      <style>
        body{font-family:system-ui;text-align:center;padding:2rem;background:#f8fafc}
        .box{max-width:420px;margin:2rem auto}
        h1{color:#1f2937;margin-bottom:1rem}
        p{color:#6b7280;margin-bottom:1.5rem}
        button{background:#2563eb;color:#fff;border:none;padding:.75rem 1.5rem;border-radius:8px;cursor:pointer}
        a{color:#2563eb;display:inline-block;margin-top:1rem}
      </style></head>
      <body><div class="box">
        <h1>🌐 Offline</h1>
        <p>ਇੰਟਰਨੈਟ ਕਨੈਕਸ਼ਨ ਚੈਕ ਕਰੋ ਅਤੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ</p>
        <button onclick="location.reload()">Refresh</button>
        <a href="/app/">Try App</a>
      </div></body></html>
    `, { headers: { 'Content-Type': 'text/html' }, status: 503 });
  }
}

async function handleAssetRoute(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const net = await fetch(request);
    if (net.ok) (await caches.open(CACHE_NAME)).put(request, net.clone());
    return net;
  } catch {
    return new Response('Asset not available', { status: 404 });
  }
}

console.log(`[SW] Service Worker ${APP_VERSION} ready - Dual mode (Website + App)`);
