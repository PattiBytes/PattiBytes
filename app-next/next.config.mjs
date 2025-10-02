/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        pathname: '/**',
      }
    ],
    domains: [
      'lh3.googleusercontent.com',
      'res.cloudinary.com',
      'firebasestorage.googleapis.com'
    ]
  },
  // Disable type checking during build for faster builds
  typescript: {
    ignoreBuildErrors: false,
  },
  // Disable ESLint during builds
  eslint: {
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
