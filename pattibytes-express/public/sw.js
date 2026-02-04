/* Service Worker for PattiBytes Express
   Key rule for Next.js: do NOT cache HTML ("/") with cache-first,
   and never cache "/_next/*" build assets (they change every deploy).  */

const CACHE_NAME = 'pattibytes-express-v3';

// Precache ONLY stable, versioned-by-you assets (icons). Do NOT include "/".
const PRECACHE_URLS = [
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.ico',
];

// Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((n) => (n !== CACHE_NAME ? caches.delete(n) : undefined)))
    )
  );
  self.clients.claim();
});

// Fetch
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1) Never intercept Next.js build assets
  if (url.pathname.startsWith('/_next/')) return;

  // 2) Network-first for navigations (HTML documents)
  // This avoids serving stale HTML that points to old chunk filenames.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req));
    return;
  }

  // 3) Cache-first only for precached assets (icons, etc.)
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});

// Push notification (keep ONLY ONE push listener)
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_) {}

  const title = data.title || 'PattiBytes Express';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'notification',
    data: data.data || {},
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
