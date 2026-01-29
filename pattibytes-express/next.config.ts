import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://pbexpress.pattibytes.com',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pbexpress.pattibytes.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'kheafofbofrimkkmjaiy.supabase.co',
      },
    ],
  },
};

export default nextConfig;
