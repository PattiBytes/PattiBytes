import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://pbexpress.pattibytes.com',
  },

  images: {
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
    remotePatterns: [
      { protocol: 'https', hostname: 'pbexpress.pattibytes.com',             pathname: '/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com',            pathname: '/**' },
      { protocol: 'https', hostname: 'i.ibb.co',                             pathname: '/**' },
      { protocol: 'https', hostname: 'res.cloudinary.com',                   pathname: '/**' },
      { protocol: 'https', hostname: 'kheafofbofrimkkmjaiy.supabase.co',     pathname: '/**' },
      { protocol: 'https', hostname: 'i.pinimg.com',                         pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com',                  pathname: '/**' },
      { protocol: 'https', hostname: 'i.imgur.com',                          pathname: '/**' },
    ],
  },

  async headers() {
    const swHeaders = [
      { key: 'Content-Type',           value: 'application/javascript; charset=utf-8' },
      { key: 'Cache-Control',          value: 'no-cache, no-store, must-revalidate'   },
      { key: 'Service-Worker-Allowed', value: '/'                                     },
      { key: 'X-Content-Type-Options', value: 'nosniff'                               },
    ];

    return [
      { source: '/sw.js',                  headers: swHeaders },
      { source: '/OneSignalSDKWorker.js',  headers: swHeaders },
      { source: '/OneSignalSDK.sw.js',     headers: swHeaders },
    ];
  },
};

export default nextConfig;