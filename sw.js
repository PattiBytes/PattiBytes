const CACHE_NAME = 'pattibytes-v6';
const APP_VERSION = '2.0.0';

// Website assets
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

// App assets  
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

// Fetch - smart routing
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
  
  // Handle app routes
  if (url.pathname.startsWith('/app/')) {
    event.respondWith(handleAppRoute(event.request));
    return;
  }
  
  // Handle website routes
  if (isWebsiteRoute(url.pathname)) {
    event.respondWith(handleWebsiteRoute(event.request));
    return;
  }
  
  // Handle shared assets
  event.respondWith(handleAssetRoute(event.request));
});

function isWebsiteRoute(pathname) {
  const websiteRoutes = ['/', '/index.html', '/news/', '/places/', '/shop/'];
  return websiteRoutes.some(route => pathname === route || pathname.startsWith(route));
}

async function handleAppRoute(request) {
  const url = new URL(request.url);
  
  try {
    // App-first strategy: try cache first for better performance
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Update cache in background
      fetch(request)
        .then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, response.clone()));
          }
        })
        .catch(() => {});
      
      return cachedResponse;
    }
    
    // Try network
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('[SW] App route failed:', url.pathname);
    
    // Return app offline page
    if (url.pathname.endsWith('/') || url.pathname.endsWith('.html')) {
      return caches.match('/app/offline.html') || 
             new Response(`
               <!DOCTYPE html>
               <html><head><title>App Offline</title></head>
               <body style="font-family:system-ui;text-align:center;padding:2rem;">
                 <h1>📱 ऐप ऑफलाइन</h1>
                 <p>इंटरनेट कनेक्शन चेक करें</p>
                 <button onclick="location.reload()">रिफ्रेश करें</button>
               </body></html>
             `, { headers: { 'Content-Type': 'text/html' }, status: 503 });
    }
    
    return new Response('App resource not available', { status: 503 });
  }
}

async function handleWebsiteRoute(request) {
  try {
    // Website: network-first strategy
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('[SW] Website route failed, trying cache');
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Website offline page
    return new Response(`
      <!DOCTYPE html>
      <html lang="pa">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ऑफलाइन - पट्टी बाइट्स</title>
        <style>
          body { font-family: system-ui; text-align: center; padding: 2rem; background: #f8fafc; }
          .offline { max-width: 400px; margin: 2rem auto; }
          h1 { color: #1f2937; margin-bottom: 1rem; }
          p { color: #6b7280; margin-bottom: 2rem; }
          button { background: #2563eb; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="offline">
          <h1>🌐 ऑफलाइन</h1>
          <p>इंटरनेट कनेक्शन चेक करें और फिर से कोशिश करें</p>
          <button onclick="location.reload()">रिफ्रेश करें</button>
          <br><br>
          <a href="/app/" style="color: #2563eb;">ऐप मोड देखें</a>
        </div>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' },
      status: 503
    });
  }
}

async function handleAssetRoute(request) {
  // Assets: cache-first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return new Response('Asset not available', { status: 404 });
  }
}

console.log(`[SW] Service Worker ${APP_VERSION} ready - Dual mode (Website + App)`);
