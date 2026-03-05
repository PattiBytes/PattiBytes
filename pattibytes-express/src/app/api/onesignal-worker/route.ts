// Serves OneSignal SW at /OneSignalSDKWorker.js and /OneSignalSDK.sw.js
// Using a Route Handler guarantees a direct 200 — no redirect possible.
// Vercel CDN cannot redirect API routes the same way it can redirect static files.

const SW_CONTENT = `importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');`;

const SW_HEADERS = {
  'Content-Type':           'application/javascript; charset=utf-8',
  'Cache-Control':          'no-cache, no-store, must-revalidate',
  'Service-Worker-Allowed': '/',
  'X-Content-Type-Options': 'nosniff',
};

export async function GET() {
  return new Response(SW_CONTENT, { headers: SW_HEADERS });
}
