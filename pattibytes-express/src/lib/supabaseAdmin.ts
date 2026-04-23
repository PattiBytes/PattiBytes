import { createClient } from '@supabase/supabase-js';

// ── Safety guard ─────────────────────────────────────────────────────────────
// SUPABASE_SERVICE_ROLE_KEY is server-only (no NEXT_PUBLIC_ prefix).
// Importing this file in a 'use client' component will throw here at runtime.
if (typeof window !== 'undefined') {
  throw new Error(
    '[supabaseAdmin] Must only be used in Server Components, Server Actions, or API Routes.\n' +
    'Use @/lib/supabase in client components instead.'
  );
}

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

