import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // flowType: 'pkce', // optional; fine to omit for email+password
    },
  }
);

// Get redirect URL based on environment
export const getRedirectUrl = () => {
  if (typeof window !== 'undefined') {
    const { hostname, port, protocol } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:${port}`;
    }
    return window.location.origin;
  }

  return process.env.NEXT_PUBLIC_SITE_URL || 'https://pbexpress.pattibytes.com';
};
