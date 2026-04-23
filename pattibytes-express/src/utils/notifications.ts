/* eslint-disable @typescript-eslint/no-explicit-any */

// ✅ Static top-level import — same instance as AuthContext, no module race
import { supabase } from '@/lib/supabase';

/**
 * CANONICAL sendNotification — import ONLY from here across the entire app.
 */
export async function sendNotification(
  userId: string | null,
  title: string,
  message: string,
  type: string,
  data: any = {},
  opts?: { url?: string }
): Promise<boolean> {
  if (!userId) {
    console.log('[notify] skip — walk-in (no userId)');
    return true;
  }
  if (!title || !message) {
    console.warn('[notify] skip — missing title/message');
    return false;
  }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (typeof window === 'undefined') {
      // ── Server-side: API routes / Server Actions ───────────────────────
      const secret = process.env.NOTIFY_INTERNAL_SECRET;
      if (!secret) {
        console.error('[notify] NOTIFY_INTERNAL_SECRET not set on server');
        return false;
      }
      headers['x-internal-secret'] = secret;
    } else {
      // ── Client-side: browser ───────────────────────────────────────────
      // ✅ getUser() validates the token against Supabase Auth server
      //    AND triggers a silent refresh if the access_token is expired.
      //    getSession() alone just reads the cookie and can return stale tokens.
      const { error: userError } = await supabase.auth.getUser();

      if (userError) {
        // Token is fully invalid — try an explicit refresh before giving up
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshed.session) {
          console.error('[notify] Session invalid and refresh failed — user must re-login');
          return false;
        }
        // Use the freshly refreshed token directly
        headers['Authorization'] = `Bearer ${refreshed.session.access_token}`;
      } else {
        // getUser() succeeded — the session is valid, getSession() now has fresh token
        const { data: { session } } = await supabase.auth.getSession();
        const jwt = session?.access_token;
        if (!jwt) {
          console.error('[notify] No access token after getUser() — unexpected');
          return false;
        }
        headers['Authorization'] = `Bearer ${jwt}`;
      }
    }

    const base = typeof window !== 'undefined'
      ? ''
      : (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pbexpress.pattibytes.com');

    const res = await fetch(`${base}/api/notify`, {
      method:  'POST',
      headers,
      body: JSON.stringify({
        targetUserId: userId,
        title,
        message,
        type,
        data: { ...data, ...(opts?.url ? { url: opts.url } : {}) },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[notify] /api/notify error:', res.status, err);
      return false;
    }

    const result = await res.json().catch(() => ({}));
    console.log('[notify] ✅', {
      userId, type,
      id:   result?.notification_id,
      push: result?.sent_push,
      role: result?.role,
    });
    return true;
  } catch (e: any) {
    console.error('[notify] threw:', e?.message);
    return false;
  }
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

export function getCustomerDisplayName(
  order: { customer_notes?: string | null; customer_id?: string | null },
  customer?: { fullname?: string | null; full_name?: string | null } | null
): string {
  if (order.customer_id && customer) {
    return customer.fullname || customer.full_name || 'Customer';
  }
  if (order.customer_notes) {
    const notes = order.customer_notes;
    if (notes.includes('Walk-in:')) return notes.replace('Walk-in:', '').split('\n')[0].trim();
    return notes.split('\n')[0].trim() || 'Walk-in Customer';
  }
  return 'Walk-in Customer';
}

export function isWalkInOrder(order: { customer_id?: string | null }): boolean {
  return !order.customer_id;
}

