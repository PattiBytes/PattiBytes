/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://pbexpress.pattibytes.com',
  },
  images: {
    domains: ['pbexpress.pattibytes.com'],
  },
};

module.exports = nextConfig;
