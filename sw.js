// Enhanced Service Worker for App-Only Mode
const CACHE_NAME = 'pattibytes-app-v2';
const APP_SHELL_ASSETS = [
  // Core App Files
  '/app/',
  '/app/index.html',
  '/app/app.css',
  '/app/app.js',
  
  // Navigation & Shared Components
  '/app/shared/navigation.js',
  '/app/shared/styles/navigation.css',
  '/app/shared/cms-loader.js',
  '/app/shared/commenting.js',
  '/app/shared/api.js',
  '/app/shared/utils.js',
  
  // Main App Pages
  '/app/news/',
  '/app/news/index.html',
  '/app/news/news.css',
  '/app/news/news.js',
  '/app/news/article.html',
  
  '/app/places/',
  '/app/places/index.html',
  '/app/places/places.css',
  '/app/places/places.js',
  '/app/places/place.html',
  
  '/app/shop/',
  '/app/shop/index.html',
  '/app/shop/shop.css',
  '/app/shop/shop.js',
  '/app/shop/product.html',
  '/app/shop/cart/',
  
  '/app/dashboard/',
  '/app/dashboard/index.html',
  '/app/dashboard/dashboard.css',
  '/app/dashboard/dashboard.js',
  
  '/app/community/',
  '/app/community/index.html',
  '/app/community/community.css',
  '/app/community/community.js',
  '/app/community/chat/',
  '/app/community/forums/',
  
  // Authentication Pages
  '/app/auth/',
  '/app/auth/index.html',
  '/app/auth/auth.css',
  '/app/auth/auth.js',
  '/app/register/',
  '/app/profile/',
  
  // Global Assets
  '/style.css',
  '/script.js',
  '/app/manifest.json',
  '/icons/pwab-192.jpg',
  '/icons/pwab-512.jpg',
  '/icons/favicon.ico',
  
  // Offline fallback
  '/app/offline.html'
];

const WEBSITE_ROUTES = [
  '/',
  '/index.html',
  '/news/',
  '/news/index.html', 
  '/places/',
  '/places/index.html',
  '/shop/',
  '/shop/index.html'
];

// Install - Cache app shell
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Pre-caching app shell');
        return cache.addAll(APP_SHELL_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate - Clean old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
           .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - Handle requests
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
  
  // Redirect website routes to app
  if (shouldRedirectToApp(url.pathname)) {
    event.respondWith(handleWebsiteRedirect(url.pathname));
    return;
  }
  
  // Handle app routes
  if (url.pathname.startsWith('/app/')) {
    event.respondWith(handleAppRequest(event.request));
    return;
  }
  
  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(event.request));
    return;
  }
  
  // Handle assets (cache first)
  if (isAsset(url.pathname)) {
    event.respondWith(handleAssetRequest(event.request));
    return;
  }
  
  // Default handling
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

function shouldRedirectToApp(pathname) {
  // Redirect main website routes to app equivalents
  const redirectMap = {
    '/': '/app/',
    '/index.html': '/app/',
    '/news/': '/app/news/',
    '/news/index.html': '/app/news/',
    '/places/': '/app/places/', 
    '/places/index.html': '/app/places/',
    '/shop/': '/app/shop/',
    '/shop/index.html': '/app/shop/'
  };
  
  return redirectMap.hasOwnProperty(pathname);
}

async function handleWebsiteRedirect(pathname) {
  const redirectMap = {
    '/': '/app/',
    '/index.html': '/app/',
    '/news/': '/app/news/',
    '/news/index.html': '/app/news/',
    '/places/': '/app/places/', 
    '/places/index.html': '/app/places/',
    '/shop/': '/app/shop/',
    '/shop/index.html': '/app/shop/'
  };
  
  const appRoute = redirectMap[pathname];
  if (appRoute) {
    return Response.redirect(appRoute, 302);
  }
  
  return new Response('Route not found', { status: 404 });
}

async function handleAppRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first for app pages
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Update cache with fresh content
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
    
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', url.pathname);
    
    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return appropriate fallback
    if (url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
      return handleOfflineFallback(url.pathname);
    }
    
    return new Response('Resource not available offline', { 
      status: 503,
      statusText: 'Service Unavailable' 
    });
  }
}

async function handleAPIRequest(request) {
  try {
    // Always try network first for API calls
    const response = await fetch(request);
    
    if (response.ok) {
      // Cache successful API responses
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
    
  } catch (error) {
    // Return cached API response if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline data structure
    return new Response(JSON.stringify({ 
      error: 'Offline',
      message: 'No network connection',
      cached: false
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleAssetRequest(request) {
  // Cache first for assets (CSS, JS, images)
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

async function handleOfflineFallback(pathname) {
  // Determine which offline page to show
  if (pathname.includes('/news/')) {
    return await caches.match('/app/news/') || await caches.match('/app/offline.html');
  } else if (pathname.includes('/places/')) {
    return await caches.match('/app/places/') || await caches.match('/app/offline.html');
  } else if (pathname.includes('/shop/')) {
    return await caches.match('/app/shop/') || await caches.match('/app/offline.html');
  } else {
    return await caches.match('/app/') || await caches.match('/app/offline.html');
  }
}

function isAsset(pathname) {
  return pathname.match(/\.(css|js|jpg|jpeg|png|gif|webp|ico|svg|woff|woff2|ttf|eot)$/);
}

// Background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync());
  }
});

async function handleBackgroundSync() {
  console.log('[SW] Background sync triggered');
  
  // Send queued actions when back online
  const queuedActions = await getQueuedActions();
  for (const action of queuedActions) {
    try {
      await processQueuedAction(action);
    } catch (error) {
      console.error('[SW] Failed to process queued action:', error);
    }
  }
}

async function getQueuedActions() {
  // Retrieve from IndexedDB or localStorage
  return [];
}

async function processQueuedAction(action) {
  // Process queued offline actions
  console.log('[SW] Processing action:', action);
}

// Push notifications
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || '[translate:ਨਵੀਂ ਅਪਡੇਟ ਆਈ ਹੈ]',
      icon: '/icons/pwab-192.jpg',
      badge: '/icons/pwab-192.jpg',
      image: data.image,
      data: {
        url: data.url || '/app/'
      },
      actions: [
        {
          action: 'open',
          title: '[translate:ਖੋਲ੍ਹੋ]'
        },
        {
          action: 'close', 
          title: '[translate:ਬੰਦ ਕਰੋ]'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || '[translate:ਪੱਟੀ ਬਾਈਟਸ]', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    const url = event.notification.data.url || '/app/';
    event.waitUntil(
      clients.openWindow(url)
    );
  }
});
