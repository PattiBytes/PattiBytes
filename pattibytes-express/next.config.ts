import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://pbexpress.pattibytes.com',
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'pbexpress.pattibytes.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },

      // ✅ IBBC
      { protocol: 'https', hostname: 'i.ibb.co', pathname: '/**' },

      // ✅ Cloudinary
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },

      // ✅ Supabase (use your exact project host)
      { protocol: 'https', hostname: 'kheafofbofrimkkmjaiy.supabase.co', pathname: '/**' },

      // ✅ Pinterest images
      { protocol: 'https', hostname: 'i.pinimg.com', pathname: '/**' },

      // Optional common CDNs (only add what you use)
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'i.imgur.com', pathname: '/**' },
    ],
  },
};

export default nextConfig;
