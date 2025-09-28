// /app-next/next.config.mjs
import withPWA from '@ducanh2912/next-pwa';

const basePath = process.env.APP_BASE_PATH || '';

const config = {
  reactStrictMode: true,
  basePath,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  pwa: { dest: 'public', register: true, skipWaiting: true },
  experimental: { turbo: { root: new URL('.', import.meta.url).pathname } }
};

export default withPWA(config);
