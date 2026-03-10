/* pattibytes-express service worker v9 */

// ✅ MUST be ABSOLUTE FIRST — before any importScripts
// Chrome throws "Event handler of 'message' event must be added on the initial
// evaluation of worker script" when this comes after importScripts.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// OneSignal: push + notificationclick handlers
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

/* ── Config ───────────────────────────────────────────────────────────────── */
const CACHE_NAME        = 'pattibytes-express-v9';
const NETWORK_TIMEOUT   = 4000; // ms — fall back to cache after this long
const APP_SHELL_URLS    = ['/', '/icon-192.png', '/icon-512.png', '/favicon.ico'];

/* ── Route matchers ───────────────────────────────────────────────────────── */
const isSameOrigin  = (url) => url.origin === self.location.origin;
const isApiRequest  = (url) => isSameOrigin(url) && url.pathname.startsWith('/api/');
const isAuthPage    = (url) => isSameOrigin(url) && (
  url.pathname.startsWith('/login') ||
  url.pathname.startsWith('/signup') ||
  url.pathname.startsWith('/auth/')
);
const isNextStatic  = (url) => isSameOrigin(url) && (
  url.pathname.startsWith('/_next/static/') ||
  url.pathname.startsWith('/assets/')
);
const isStaticAsset = (url) => isSameOrigin(url) && (
  url.pathname.startsWith('/icon-') ||
  url.pathname === '/favicon.ico'   ||
  /\.(png|jpe?g|webp|svg|gif|ico)$/.test(url.pathname)
);
// ✅ Audio: DO NOT call event.respondWith at all — let browser handle range
// requests natively. SW interception breaks streaming + Edge range requests.
const isAudio       = (url) =>
  url.pathname.startsWith('/sounds/') || /\.mp3$/.test(url.pathname);
const isThirdParty  = (url) => !isSameOrigin(url);

/* ── Helpers ──────────────────────────────────────────────────────────────── */

/** Resolves with the Response or null on timeout/network error. */
function fetchWithTimeout(request, ms = NETWORK_TIMEOUT) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    fetch(request)
      .then((r)  => { clearTimeout(timer); resolve(r); })
      .catch(()  => { clearTimeout(timer); resolve(null); });
  });
}

/* ── Cache strategies ─────────────────────────────────────────────────────── */

// Cache-first: static assets that rarely change
async function cacheFirst(request) {
  try {
    const cached = await caches.match(request);
    if (cached) return cached;
    const resp = await fetch(request);
    if (resp?.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, resp.clone()).catch(() => {});
    }
    return resp;
  } catch {
    const cached = await caches.match(request);
    return cached ?? new Response('', { status: 204 });
  }
}

// Stale-while-revalidate: returns cached immediately, updates in background.
// Ideal for Next.js JS/CSS chunks — instant repeat loads.
async function staleWhileRevalidate(request) {
  const cache  = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((resp) => {
      if (resp?.ok) cache.put(request, resp.clone()).catch(() => {});
      return resp;
    })
    .catch(() => null);

  // Return cache instantly if available; otherwise wait for network
  if (cached) {
    // Kick off background update but don't await
    networkPromise.catch(() => {});
    return cached;
  }
  return (await networkPromise) ?? new Response('', { status: 204 });
}

// Network-first with timeout → falls back to cache on slow/no network
async function networkFirstNavigation(request) {
  try {
    const resp = await fetchWithTimeout(request, NETWORK_TIMEOUT);
    if (resp?.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put('/', resp.clone()).catch(() => {});
      return resp;
    }
    throw new Error('no-ok');
  } catch {
    const cached = await caches.match(request) ?? await caches.match('/');
    return cached ?? new Response('Offline — check your connection', {
      status  : 503,
      headers : { 'Content-Type': 'text/plain' },
    });
  }
}

async function networkOnly(request) {
  try   { return await fetch(request); }
  catch { return new Response('', { status: 204 }); }
}

/* ── Lifecycle ────────────────────────────────────────────────────────────── */

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      await Promise.allSettled(APP_SHELL_URLS.map(u => cache.add(u)));
    } catch { /* ignore offline during install */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null));
    await self.clients.claim();
  })());
});

/* ── Fetch handler ────────────────────────────────────────────────────────── */

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch { return; }

  // Never intercept third-party (Supabase, OneSignal, Cloudinary…)
  if (isThirdParty(url)) return;

  // API — always live
  if (isApiRequest(url))  { event.respondWith(networkOnly(req)); return; }

  // Auth — always live
  if (isAuthPage(url))    { event.respondWith(networkOnly(req)); return; }

  // ✅ Audio — do NOT intercept at all.
  // Letting the browser handle .mp3 natively supports range requests (seek/progress).
  // SW interception of audio causes ERR_FAILED in Edge + Chrome.
  if (isAudio(url)) return;

  // Page navigation — network-first with 4 s timeout fallback
  if (req.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(req));
    return;
  }

  // Next.js JS/CSS chunks — stale-while-revalidate (instant repeat loads ⚡)
  if (isNextStatic(url)) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Static images/icons — cache-first (long-lived)
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Everything else same-origin — network with cache fallback
  event.respondWith((async () => {
    try {
      return await fetch(req);
    } catch {
      const cached = await caches.match(req);
      return cached ?? new Response('Network error', {
        status  : 502,
        headers : { 'Content-Type': 'text/plain' },
      });
    }
  })());
});

// push + notificationclick → OneSignalSDK.sw.js (imported above)
