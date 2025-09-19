const CACHE_NAME = 'pattibytes-app-v3';
const APP_VERSION = '2.0.0';

// Define what constitutes the app shell
const APP_SHELL_ASSETS = [
  // Core app files
  '/',
  '/app/',
  '/app/index.html',
  '/app/app.css', 
  '/app/app.js',
  
  // Navigation
  '/app/shared/navigation.js',
  '/app/shared/styles/navigation.css',
  
  // Main pages
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
  
  // Assets
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/icons/pwab-192.jpg',
  '/icons/pwab-512.jpg',
  '/icons/favicon.ico',
  
  // Offline fallback
  '/app/offline.html'
];

// Install event - cache app shell
self.addEventListener('install', event => {
  console.log('[SW] Install event');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Pre-caching app shell');
        return cache.addAll(APP_SHELL_ASSETS);
      })
      .then(() => {
        console.log('[SW] App shell cached successfully');
        // Force activation of new service worker
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Pre-caching failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        // Take control of all clients
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached content when offline
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
    event.respondWith(handleAppRequest(event.request));
    return;
  }
  
  // Redirect main site routes to app
  if (shouldRedirectToApp(url.pathname)) {
    event.respondWith(handleWebsiteRedirect(url.pathname));
    return;
  }
  
  // Handle other requests
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        
        return fetch(event.request)
          .then(fetchResponse => {
            // Don't cache non-successful responses
            if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
              return fetchResponse;
            }
            
            // Cache successful responses
            const responseToCache = fetchResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return fetchResponse;
          });
      })
  );
});

function shouldRedirectToApp(pathname) {
  const redirects = {
    '/': '/app/',
    '/index.html': '/app/',
    '/news/': '/app/news/',
    '/news/index.html': '/app/news/',
    '/places/': '/app/places/',
    '/places/index.html': '/app/places/',
    '/shop/': '/app/shop/',
    '/shop/index.html': '/app/shop/'
  };
  
  return redirects.hasOwnProperty(pathname);
}

async function handleWebsiteRedirect(pathname) {
  const redirects = {
    '/': '/app/',
    '/index.html': '/app/',
    '/news/': '/app/news/', 
    '/news/index.html': '/app/news/',
    '/places/': '/app/places/',
    '/places/index.html': '/app/places/',
    '/shop/': '/app/shop/',
    '/shop/index.html': '/app/shop/'
  };
  
  const appRoute = redirects[pathname];
  if (appRoute) {
    return Response.redirect(appRoute, 301);
  }
  
  return new Response('Not Found', { status: 404 });
}

async function handleAppRequest(request) {
  try {
    // Try network first for HTML pages
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
    
  } catch (error) {
    // Fall back to cache
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for HTML requests
    const url = new URL(request.url);
    if (url.pathname.endsWith('/') || url.pathname.endsWith('.html')) {
      return caches.match('/app/offline.html') || 
             new Response('Offline', { status: 503 });
    }
    
    return new Response('Resource not available offline', { 
      status: 503 
    });
  }
}

// Handle app updates
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log(`[SW] Service Worker version ${APP_VERSION} loaded`);
