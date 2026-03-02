/* eslint-disable @typescript-eslint/no-unused-vars */
/* pattibytes-express service worker (safe caching) */

const CACHE_NAME = 'pattibytes-express-v4'; // bump to force update
const APP_SHELL_CACHE = CACHE_NAME;

const APP_SHELL_URLS = ['/', '/icon-192.png', '/icon-512.png', '/favicon.ico'];

// ---- helpers ----
const isSameOrigin = (url) => url.origin === self.location.origin;

const isSupabaseLike = (url) => {
  const host = url.hostname;
  return (
    host.endsWith('.supabase.co') ||
    host.endsWith('.workers.dev') ||
    host === 'supabase-proxy.sbpbexpresspattibytescom.workers.dev'
  );
};

const isApiRequest = (url) => isSameOrigin(url) && url.pathname.startsWith('/api/');

const isAuthPage = (url) =>
  isSameOrigin(url) &&
  (url.pathname.startsWith('/login') ||
    url.pathname.startsWith('/signup') ||
    url.pathname.startsWith('/auth/'));

const isNextStaticAsset = (url) =>
  isSameOrigin(url) &&
  (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/assets/'));

const isStaticPublicAsset = (url) =>
  isSameOrigin(url) &&
  (url.pathname.startsWith('/icon-') ||
    url.pathname === '/favicon.ico' ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.gif'));

const isAudio = (url) => url.pathname.startsWith('/sounds/') || url.pathname.endsWith('.mp3');

// Cache-first for static assets (safe)
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const resp = await fetch(request);

  // Cache only ok GET responses
  if (request.method === 'GET' && resp && resp.ok) {
    const copy = resp.clone();
    const cache = await caches.open(APP_SHELL_CACHE);
    await cache.put(request, copy);
  }
  return resp;
}

// Network-first for navigations (prevents stale app shell after deployments)
async function networkFirstNavigation(request) {
  try {
    const resp = await fetch(request);

    // Keep "/" fresh for offline fallback
    if (resp && resp.ok) {
      const cache = await caches.open(APP_SHELL_CACHE);
      await cache.put('/', resp.clone());
    }

    return resp;
  } catch (e) {
    const cached = await caches.match('/');
    if (cached) return cached;

    // IMPORTANT: do not throw inside respondWith chain
    return new Response('Offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

// ---- lifecycle ----
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_SHELL_CACHE);

      // cache.addAll() fails if any single request fails; use settled adds instead. [web:401]
      await Promise.allSettled(APP_SHELL_URLS.map((u) => cache.add(u)));

      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
      await self.clients.claim();
    })()
  );
});

// ---- fetch ----
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET; never interfere with POST/PUT/DELETE (important for checkout)
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // ✅ NEVER intercept Supabase / proxy traffic (keep headers intact, avoid caching)
  // This prevents SW from ever causing auth/data failures when proxy is flaky.
  if (!isSameOrigin(url) && isSupabaseLike(url)) {
    event.respondWith(fetch(req));
    return;
  }

  // Don’t cache audio
  if (isAudio(url)) {
    event.respondWith(fetch(req));
    return;
  }

  // ✅ NEVER cache API routes (prevents stale cart/menu/merchant data)
  if (isApiRequest(url)) {
    event.respondWith(fetch(req));
    return;
  }

  // ✅ NEVER cache auth pages (prevents stale login screens / redirect loops)
  if (isAuthPage(url)) {
    event.respondWith(fetch(req));
    return;
  }

  // ✅ Navigations: network-first, offline fallback
  if (req.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(req));
    return;
  }

  // Static assets: cache-first
  if (isNextStaticAsset(url) || isStaticPublicAsset(url)) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Default: network-first-ish (try network, fallback cache, else return Response)
  event.respondWith(
    (async () => {
      try {
        return await fetch(req);
      } catch (e) {
        const cached = await caches.match(req);
        if (cached) return cached;

        // IMPORTANT: do not throw -> return a valid Response instead. [web:394]
        return new Response('Network error', {
          status: 502,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    })()
  );
});

// ---- push notifications (single listener) ----
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {}

  const title = payload.title || 'PattiBytes Express';
  const options = {
    body: payload.body || 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: payload.tag || 'notification',
    data: payload.data || {},
    requireInteraction: Boolean(payload.requireInteraction),
    actions: Array.isArray(payload.actions) ? payload.actions : [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';

  event.waitUntil(
    (async () => {
      const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });

      for (const client of clientList) {
        if ('focus' in client) {
          try {
            await client.focus();
            if ('navigate' in client) await client.navigate(targetUrl);
          } catch (_) {}
          return;
        }
      }

      await clients.openWindow(targetUrl);
    })()
  );
});
