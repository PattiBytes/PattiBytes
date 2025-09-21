/**
 * PattiBytes Service Worker
 * Handles caching, offline functionality, and PWA features
 */

const CACHE_NAME = 'pattibytes-v1.1.0';
const STATIC_CACHE_NAME = 'pattibytes-static-v1.1.0';
const DYNAMIC_CACHE_NAME = 'pattibytes-dynamic-v1.1.0';

// Assets to precache
const STATIC_ASSETS = [
    '/app/',
    '/app/index.html',
    '/app/auth.html',
    '/app/manifest.webmanifest',
    '/app/assets/css/common.css',
    '/app/assets/css/dashboard.css',
    '/app/assets/css/auth.css',
    '/app/assets/js/app.js',
    '/app/assets/js/firebase-config.js',
    '/app/assets/js/auth-script.js',
    '/app/assets/js/dashboard-script.js',
    'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js',
    'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js'
];

// API endpoints to cache dynamically
const API_ENDPOINTS = [
    '/app/data/news.json',
    '/app/data/places.json',
    '/app/data/shop.json'
];

// Install event - precache static assets
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then((cache) => {
                console.log('Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Error caching static assets:', error);
            })
    );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE_NAME && 
                            cacheName !== DYNAMIC_CACHE_NAME &&
                            cacheName !== CACHE_NAME) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                return self.clients.claim();
            })
            .then(() => {
                // Notify clients of activation
                return self.clients.matchAll().then((clients) => {
                    clients.forEach((client) => {
                        client.postMessage({
                            type: 'SW_ACTIVATED',
                            message: 'Service Worker activated successfully'
                        });
                    });
                });
            })
    );
});

// Fetch event - handle requests with caching strategies
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip Chrome extension requests
    if (url.protocol === 'chrome-extension:') {
        return;
    }
    
    // Handle different types of requests
    if (STATIC_ASSETS.includes(url.pathname) || url.pathname === '/app/') {
        // Cache-first for static assets
        event.respondWith(cacheFirstStrategy(request));
    } else if (API_ENDPOINTS.some(endpoint => url.pathname.includes(endpoint))) {
        // Stale-while-revalidate for API data
        event.respondWith(staleWhileRevalidateStrategy(request));
    } else if (url.origin === location.origin && url.pathname.startsWith('/app/')) {
        // Network-first for app pages
        event.respondWith(networkFirstStrategy(request));
    } else if (url.origin.includes('firebase') || url.origin.includes('gstatic')) {
        // Cache-first for Firebase assets
        event.respondWith(cacheFirstStrategy(request));
    } else {
        // Network-first for everything else
        event.respondWith(networkFirstStrategy(request));
    }
});

// Cache-first strategy
async function cacheFirstStrategy(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(STATIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Cache-first strategy failed:', error);
        return caches.match('/app/index.html') || new Response('Offline');
    }
}

// Network-first strategy
async function networkFirstStrategy(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('Network failed, trying cache:', error);
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline fallback
        if (request.destination === 'document') {
            return caches.match('/app/index.html');
        }
        
        return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidateStrategy(request) {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(() => cachedResponse);
    
    return cachedResponse || fetchPromise;
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    console.log('Background sync event:', event.tag);
    
    if (event.tag === 'background-sync') {
        event.waitUntil(handleBackgroundSync());
    }
});

async function handleBackgroundSync() {
    try {
        // Handle any queued offline actions
        console.log('Handling background sync');
        
        // Notify clients
        const clients = await self.clients.matchAll();
        clients.forEach((client) => {
            client.postMessage({
                type: 'SYNC_COMPLETE',
                message: 'Background sync completed'
            });
        });
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// Push notification handling
self.addEventListener('push', (event) => {
    console.log('Push notification received');
    
    const options = {
        body: event.data?.text() || 'New update from PattiBytes',
        icon: '/app/assets/images/icons/icon-192x192.png',
        badge: '/app/assets/images/icons/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: '1'
        },
        actions: [
            {
                action: 'explore',
                title: 'View',
                icon: '/app/assets/images/icons/action-explore.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/app/assets/images/icons/action-close.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('PattiBytes', options)
    );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked');
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/app/')
        );
    }
});

// Message handling from clients
self.addEventListener('message', (event) => {
    console.log('Service Worker received message:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'content-sync') {
        event.waitUntil(syncContent());
    }
});

async function syncContent() {
    try {
        console.log('Syncing content...');
        
        // Sync news data
        const newsResponse = await fetch('/app/data/news.json');
        if (newsResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put('/app/data/news.json', newsResponse);
        }
        
        // Notify clients of updated content
        const clients = await self.clients.matchAll();
        clients.forEach((client) => {
            client.postMessage({
                type: 'CONTENT_UPDATED',
                message: 'Content has been updated'
            });
        });
    } catch (error) {
        console.error('Content sync failed:', error);
    }
}
