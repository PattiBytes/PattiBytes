import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Get redirect URL based on environment
export const getRedirectUrl = () => {
  if (typeof window !== 'undefined') {
    const { hostname, port, protocol } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:${port}`;
    }
    // Use current origin for production
    return window.location.origin;
  }
  
  // Fallback for SSR
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://pbexpress.pattibytes.com';
};
