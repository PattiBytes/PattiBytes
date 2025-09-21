/**
 * PattiBytes Service Worker
 * Version: 2.1.0
 * Handles caching, offline functionality, and PWA features
 */

const CACHE_VERSION = 'pattibytes-v2.1.0';
const STATIC_CACHE_NAME = 'pattibytes-static-v2.1.0';
const DYNAMIC_CACHE_NAME = 'pattibytes-dynamic-v2.1.0';
const RUNTIME_CACHE_NAME = 'pattibytes-runtime-v2.1.0';

// Assets to precache [web:201][web:46]
const STATIC_ASSETS = [
    '/app/',
    '/app/index.html',
    '/app/auth.html',
    '/app/manifest.webmanifest',
    
    // CSS Files
    '/app/assets/css/common.css',
    '/app/assets/css/dashboard.css',
    '/app/assets/css/auth.css',
    
    // JavaScript Files
    '/app/assets/js/app.js',
    '/app/assets/js/firebase-config.js',
    '/app/assets/js/auth-script.js',
    '/app/assets/js/dashboard-script.js',
    
    // External Dependencies
    'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js',
    'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js',
    
    // Logo/Icon
    'https://i.ibb.co/q3pGgxrZ/Whats-App-Image-2025-05-20-at-18-42-18-c8959cfa.jpg',
    
    // Fonts (if any)
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// API endpoints for dynamic caching
const API_ENDPOINTS = [
    '/app/data/news.json',
    '/app/data/places.json',
    '/app/data/shop.json'
];

// Install Event - Precache static assets [web:46][web:128]
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker v2.1.0');
    
    event.waitUntil(
        Promise.all([
            // Cache static assets
            caches.open(STATIC_CACHE_NAME)
                .then((cache) => {
                    console.log('[SW] Caching static assets');
                    return cache.addAll(STATIC_ASSETS);
                }),
            
            // Skip waiting to activate immediately
            self.skipWaiting()
        ])
        .catch((error) => {
            console.error('[SW] Error during install:', error);
        })
    );
});

// Activate Event - Clean up old caches [web:46][web:128]
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker v2.1.0');
    
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE_NAME && 
                            cacheName !== DYNAMIC_CACHE_NAME &&
                            cacheName !== RUNTIME_CACHE_NAME) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            
            // Take control of all clients
            self.clients.claim()
        ])
        .then(() => {
            console.log('[SW] Service Worker activated successfully');
            
            // Notify all clients of activation
            return self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                    client.postMessage({
                        type: 'SW_ACTIVATED',
                        version: CACHE_VERSION
                    });
                });
            });
        })
        .catch((error) => {
            console.error('[SW] Error during activation:', error);
        })
    );
});

// Fetch Event - Handle network requests with caching strategies [web:128][web:201]
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip Chrome extension requests
    if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') {
        return;
    }
    
    // Handle different types of requests
    if (STATIC_ASSETS.some(asset => url.href.includes(asset))) {
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
    } else if (url.origin.includes('fonts.googleapis.com') || url.origin.includes('fonts.gstatic.com')) {
        // Cache-first for fonts
        event.respondWith(cacheFirstStrategy(request));
    } else if (url.href.includes('i.ibb.co')) {
        // Cache-first for images from ibb.co (your logo)
        event.respondWith(cacheFirstStrategy(request));
    } else {
        // Network-first for everything else
        event.respondWith(networkFirstStrategy(request));
    }
});

// Cache-first Strategy
async function cacheFirstStrategy(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const cache = await caches.open(STATIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[SW] Cache-first strategy failed:', error);
        
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

// Network-first Strategy
async function networkFirstStrategy(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed, trying cache:', error);
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline fallback
        if (request.destination === 'document') {
            return caches.match('/app/index.html') || caches.match('/app/auth.html');
        }
        
        return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

// Stale-while-revalidate Strategy
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
    console.log('[SW] Background sync event:', event.tag);
    
    if (event.tag === 'background-sync') {
        event.waitUntil(handleBackgroundSync());
    }
});

async function handleBackgroundSync() {
    try {
        console.log('[SW] Handling background sync');
        
        // Notify clients of sync completion
        const clients = await self.clients.matchAll();
        clients.forEach((client) => {
            client.postMessage({
                type: 'SYNC_COMPLETE',
                message: 'Background sync completed'
            });
        });
    } catch (error) {
        console.error('[SW] Background sync failed:', error);
    }
}

// Push notification handling
self.addEventListener('push', (event) => {
    console.log('[SW] Push notification received');
    
    let data = {};
    if (event.data) {
        data = event.data.json();
    }
    
    const options = {
        body: data.body || 'New update from PattiBytes',
        icon: 'https://i.ibb.co/q3pGgxrZ/Whats-App-Image-2025-05-20-at-18-42-18-c8959cfa.jpg',
        badge: 'https://i.ibb.co/q3pGgxrZ/Whats-App-Image-2025-05-20-at-18-42-18-c8959cfa.jpg',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: data.primaryKey || '1',
            url: data.url || '/app/'
        },
        actions: [
            {
                action: 'explore',
                title: 'View',
                icon: 'https://i.ibb.co/q3pGgxrZ/Whats-App-Image-2025-05-20-at-18-42-18-c8959cfa.jpg'
            },
            {
                action: 'close',
                title: 'Close',
                icon: 'https://i.ibb.co/q3pGgxrZ/Whats-App-Image-2025-05-20-at-18-42-18-c8959cfa.jpg'
            }
        ],
        tag: 'pattibytes-notification',
        requireInteraction: false
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'PattiBytes', options)
    );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked');
    event.notification.close();
    
    const urlToOpen = event.notification.data?.url || '/app/';
    
    if (event.action === 'explore' || !event.action) {
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
                // Check if app is already open
                for (const client of clientList) {
                    if (client.url.includes('/app/') && 'focus' in client) {
                        return client.focus();
                    }
                }
                
                // Open new window if app is not open
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
        );
    }
});

// Message handling from clients
self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_VERSION });
    }
    
    if (event.data && event.data.type === 'CACHE_URLS') {
        event.waitUntil(
            caches.open(RUNTIME_CACHE_NAME).then((cache) => {
                return cache.addAll(event.data.urls);
            })
        );
    }
});

// Periodic background sync (if supported)
if ('periodicsync' in self.registration) {
    self.addEventListener('periodicsync', (event) => {
        if (event.tag === 'content-sync') {
            event.waitUntil(syncContent());
        }
    });
}

async function syncContent() {
    try {
        console.log('[SW] Syncing content...');
        
        // Sync API data
        const cache = await caches.open(DYNAMIC_CACHE_NAME);
        const apiPromises = API_ENDPOINTS.map(async (endpoint) => {
            try {
                const response = await fetch(endpoint);
                if (response.ok) {
                    cache.put(endpoint, response);
                }
            } catch (error) {
                console.log('[SW] Failed to sync:', endpoint);
            }
        });
        
        await Promise.all(apiPromises);
        
        // Notify clients of updated content
        const clients = await self.clients.matchAll();
        clients.forEach((client) => {
            client.postMessage({
                type: 'CONTENT_UPDATED',
                message: 'Content has been updated'
            });
        });
    } catch (error) {
        console.error('[SW] Content sync failed:', error);
    }
}

// Error handling
self.addEventListener('error', (event) => {
    console.error('[SW] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('[SW] Unhandled promise rejection:', event.reason);
});

console.log('[SW] Service Worker v2.1.0 loaded successfully');
