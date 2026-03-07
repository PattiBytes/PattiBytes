/* pattibytes-express service worker v8 */

// ✅ MUST be first — OneSignal push + notificationclick handlers
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// ✅ Top-level synchronous — required by spec
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

/* ── Config ───────────────────────────────────────────────────────────────── */
const CACHE_NAME     = 'pattibytes-express-v8';
const APP_SHELL_URLS = ['/', '/icon-192.png', '/icon-512.png', '/favicon.ico'];

/* ── Route matchers ───────────────────────────────────────────────────────── */
const isSameOrigin   = (url) => url.origin === self.location.origin;
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

// ✅ Never cache/intercept these — supabase, onesignal, cloudinary, etc.
const isThirdParty   = (url) => !isSameOrigin(url);

/* ── Cache strategies ─────────────────────────────────────────────────────── */

// ✅ Fixed: wrap fetch in try-catch so uncaught rejections don't spam console
async function cacheFirst(request) {
  try {
    const cached = await caches.match(request);
    if (cached) return cached;

    const resp = await fetch(request);
    if (resp && resp.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, resp.clone()).catch(() => {}); // fire-and-forget, don't block
    }
    return resp;
  } catch {
    // Offline — return cached fallback or empty 204
    const cached = await caches.match(request);
    return cached ?? new Response('', { status: 204 });
  }
}

async function networkFirstNavigation(request) {
  try {
    const resp = await fetch(request);
    if (resp && resp.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put('/', resp.clone()).catch(() => {});
    }
    return resp;
  } catch {
    const cached = await caches.match('/');
    return cached ?? new Response('Offline — check your connection', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch {
    return new Response('', { status: 204 });
  }
}

/* ── Lifecycle ────────────────────────────────────────────────────────────── */

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      // ✅ allSettled — one failing URL (e.g. offline) won't abort install
      await Promise.allSettled(APP_SHELL_URLS.map(u => cache.add(u)));
    } catch { /* ignore */ }
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

/* ── Fetch handler ────────────────────────────────────────────────────────── */

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only intercept GET
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return; // malformed URL — don't intercept
  }

  // ✅ Never intercept third-party requests (supabase, onesignal, cloudinary, etc.)
  // These caused "FetchEvent resulted in network error" when they failed
  if (isThirdParty(url)) return;

  // Pass through API routes — they handle their own auth, don't cache
  if (isApiRequest(url)) {
    event.respondWith(networkOnly(req));
    return;
  }

  // Pass through auth pages — always need fresh server response
  if (isAuthPage(url)) {
    event.respondWith(networkOnly(req));
    return;
  }

  // Audio — stream directly, never cache
  if (isAudio(url)) {
    event.respondWith(networkOnly(req));
    return;
  }

  // Navigation — network first, fallback to cached shell
  if (req.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(req));
    return;
  }

  // Next.js static chunks + image assets — cache first (long-lived)
  if (isNextStatic(url) || isStaticAsset(url)) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Everything else same-origin — network first, graceful fallback
  event.respondWith((async () => {
    try {
      return await fetch(req);
    } catch {
      const cached = await caches.match(req);
      return cached ?? new Response('Network error', {
        status: 502,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  })());
});

// push + notificationclick → handled by OneSignalSDK.sw.js (imported above)
