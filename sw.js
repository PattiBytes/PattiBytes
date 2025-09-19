const CACHE_NAME = 'pattibytes-v4';
const APP_VERSION = '2.0.0';

// Separate caching strategies for website vs app
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
  '/app/auth/',
  '/app/offline.html'
];

const SHARED_ASSETS = [
  '/manifest.json',
  '/icons/pwab-192.jpg',
  '/icons/pwab-512.jpg',
  '/icons/favicon.ico'
];

// Install event
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell');
        return cache.addAll([...APP_ASSETS, ...SHARED_ASSETS]);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  
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

// Fetch event - Smart routing without forced redirects
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
  
  // Handle app routes with app-first strategy
  if (url.pathname.startsWith('/app/')) {
    event.respondWith(handleAppRoute(event.request));
    return;
  }
  
  // Handle website routes with network-first strategy
  if (isWebsiteRoute(url.pathname)) {
    event.respondWith(handleWebsiteRoute(event.request));
    return;
  }
  
  // Handle shared assets
  if (isSharedAsset(url.pathname)) {
    event.respondWith(handleAssetRoute(event.request));
    return;
  }
  
  // Default handling
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});

function isWebsiteRoute(pathname) {
  const websiteRoutes = ['/', '/index.html', '/news/', '/places/', '/shop/'];
  return websiteRoutes.some(route => pathname === route || pathname.startsWith(route));
}

function isSharedAsset(pathname) {
  return pathname.includes('/icons/') || 
         pathname.includes('/manifest.json') || 
         pathname.includes('/style.css') ||
         pathname.includes('/script.js');
}

async function handleAppRoute(request) {
  try {
    // For app routes, try cache first for better performance
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Fetch in background to update cache
      fetch(request)
        .then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, response));
          }
        })
        .catch(() => {});
      
      return cachedResponse;
    }
    
    // If not in cache, fetch from network
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    // Return offline fallback for app routes
    const url = new URL(request.url);
    if (url.pathname.endsWith('/') || url.pathname.endsWith('.html')) {
      return caches.match('/app/offline.html') || 
             new Response('App offline', { status: 503 });
    }
    
    return new Response('Resource not available', { status: 503 });
  }
}

async function handleWebsiteRoute(request) {
  try {
    // For website routes, always try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    // Fall back to cache for website routes
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return basic offline page for website
    return new Response(
      '<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>ਔਫਲਾਈਨ</h1><p>ਇੰਟਰਨੈਟ ਕਨੈਕਸ਼ਨ ਚੈਕ ਕਰੋ</p></body></html>',
      { 
        headers: { 'Content-Type': 'text/html' },
        status: 503 
      }
    );
  }
}

async function handleAssetRoute(request) {
  // Cache first for assets
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

console.log(`[SW] Service Worker ${APP_VERSION} ready - No auto-redirects`);
