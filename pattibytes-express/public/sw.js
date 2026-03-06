/* pattibytes-express service worker v6 — merged with OneSignal */

// ✅ MUST be first line
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// ✅ FIX: message handler MUST be at top level (not inside install/activate)
// This resolves: "Event handler of 'message' event must be added on initial evaluation"
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

const CACHE_NAME     = 'pattibytes-express-v6';
const APP_SHELL_URLS = ['/', '/icon-192.png', '/icon-512.png', '/favicon.ico'];

const isSameOrigin   = (url) => url.origin === self.location.origin;
const isSupabaseLike = (url) => {
  const h = url.hostname;
  return h.endsWith('.supabase.co') || h.endsWith('.workers.dev');
};
const isApiRequest   = (url) => isSameOrigin(url) && url.pathname.startsWith('/api/');
const isAuthPage     = (url) => isSameOrigin(url) && (
  url.pathname.startsWith('/login')  ||
  url.pathname.startsWith('/signup') ||
  url.pathname.startsWith('/auth/')
);
const isNextStatic   = (url) => isSameOrigin(url) && (
  url.pathname.startsWith('/_next/static/') ||
  url.pathname.startsWith('/assets/')
);
const isStaticAsset  = (url) => isSameOrigin(url) && (
  url.pathname.startsWith('/icon-') ||
  url.pathname === '/favicon.ico'   ||
  /\.(png|jpe?g|webp|svg|gif|ico)$/.test(url.pathname)
);
const isAudio        = (url) =>
  url.pathname.startsWith('/sounds/') || url.pathname.endsWith('.mp3');

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const resp = await fetch(request);
  if (request.method === 'GET' && resp?.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, resp.clone());
  }
  return resp;
}

async function networkFirstNavigation(request) {
  try {
    const resp = await fetch(request);
    if (resp?.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put('/', resp.clone());
    }
    return resp;
  } catch {
    const cached = await caches.match('/');
    return cached ?? new Response('Offline', {
      status: 503, headers: { 'Content-Type': 'text/plain' },
    });
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(APP_SHELL_URLS.map(u => cache.add(u)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.map(k => k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (
    !isSameOrigin(url) ||
    isAudio(url)       ||
    isApiRequest(url)  ||
    isAuthPage(url)
  ) {
    event.respondWith(
      fetch(req).catch(() => new Response('', { status: 204 }))
    );
    return;
  }

  if (isSupabaseLike(url)) {
    event.respondWith(fetch(req));
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(req));
    return;
  }

  if (isNextStatic(url) || isStaticAsset(url)) {
    event.respondWith(cacheFirst(req));
    return;
  }

  event.respondWith((async () => {
    try { return await fetch(req); }
    catch {
      const cached = await caches.match(req);
      return cached ?? new Response('Network error', {
        status: 502, headers: { 'Content-Type': 'text/plain' },
      });
    }
  })());
});

// push + notificationclick handled by OneSignalSDK.sw.js (imported above)
