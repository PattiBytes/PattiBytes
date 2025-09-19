const CACHE_NAME = 'pattibytes-v5';
const APP_VERSION = '2.0.0';

// Cache website assets (no app-specific assets)
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
  '/script.js',
  '/index.css',
  '/manifest.webmanifest',
  '/icons/pwab-192.jpg',
  '/icons/pwab-512.jpg',
  '/icons/favicon.ico'
];

// Install event - cache website assets only
self.addEventListener('install', event => {
  console.log('[SW] Installing website service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching website assets');
        return cache.addAll(WEBSITE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating website service worker...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - handle requests WITHOUT redirects
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip external requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // Skip /app/ routes entirely (let them handle their own caching)
  if (url.pathname.startsWith('/app/')) {
    return;
  }
  
  // Handle website routes with network-first strategy
  event.respondWith(handleWebsiteRequest(event.request));
});

async function handleWebsiteRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Always try network first for fresh content
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', url.pathname);
    
    // Try cache as fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for HTML requests
    if (url.pathname.endsWith('/') || url.pathname.endsWith('.html')) {
      return new Response(`
        <!DOCTYPE html>
        <html lang="pa">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>ਔਫਲਾਈਨ - ਪੱਟੀ ਬਾਈਟਸ</title>
          <style>
            body { font-family: system-ui; text-align: center; padding: 2rem; background: #f8fafc; }
            .offline-container { max-width: 400px; margin: 2rem auto; }
            .offline-icon { font-size: 4rem; margin-bottom: 1rem; }
            .offline-title { font-size: 1.5rem; margin-bottom: 1rem; color: #1f2937; }
            .offline-message { color: #6b7280; margin-bottom: 2rem; }
            .retry-btn { background: #2563eb; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; }
          </style>
        </head>
        <body>
          <div class="offline-container">
            <div class="offline-icon">📡</div>
            <h1 class="offline-title">ਔਫਲਾਈਨ</h1>
            <p class="offline-message">ਇੰਟਰਨੈਟ ਕਨੈਕਸ਼ਨ ਚੈਕ ਕਰੋ ਅਤੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ</p>
            <button class="retry-btn" onclick="location.reload()">ਰਿਫਰੈਸ਼ ਕਰੋ</button>
          </div>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' },
        status: 503
      });
    }
    
    return new Response('Resource not available offline', { status: 503 });
  }
}

console.log(`[SW] Website Service Worker ${APP_VERSION} ready - No app redirects`);
