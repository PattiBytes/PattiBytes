// /app-next/next.config.mjs
import withPWA from '@ducanh2912/next-pwa';

// If the app is mounted under a subpath (e.g., https://domain.com/app), set APP_BASE_PATH=/app at build time.
const basePath = process.env.APP_BASE_PATH || '';

export default withPWA({
  reactStrictMode: true,
  // Make all routes and static assets resolve under the base path when present.
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,

  // PWA/Workbox settings (next-pwa wraps Workbox and generates the SW+precache).
  pwa: {
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development'
  },

  // Optional: silence monorepo/turbopack root warnings if you see them locally.
  experimental: {
    turbo: { root: new URL('.', import.meta.url).pathname }
  }
});
