import withPWA from '@ducanh2912/next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'www.pattibytes.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
      },
    ],
    unoptimized: process.env.NODE_ENV === 'development',
  },

  eslint: {
    ignoreDuringBuilds: false,
  },

  experimental: {
    turbo: {
      root: process.cwd(),
    },
  },
};

export default withPWA({
  ...nextConfig,
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});
