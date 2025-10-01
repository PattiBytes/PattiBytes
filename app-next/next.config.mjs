import withPWA from '@ducanh2912/next-pwa';

// Remove basePath for subdomain deployment
export default withPWA({
  reactStrictMode: true,
  
  pwa: {
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development'
  }
  
  // Remove experimental turbo config that causes warnings
});
