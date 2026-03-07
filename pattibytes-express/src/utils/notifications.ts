/* eslint-disable @typescript-eslint/no-explicit-any */

// ✅ Static top-level import — same module instance as AuthContext, no race condition
import { supabase } from '@/lib/supabase';

/**
 * CANONICAL sendNotification — import ONLY from here across the entire app.
 * Routes through /api/notify which handles:
 *   - DB insert (service role — bypasses RLS)
 *   - OneSignal web push for ALL roles including customer
 *   - Expo mobile push via DB webhook
 *   - Admin fan-out
 *   - Walk-in orders (null userId) silently skipped
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
    console.log('[notify] Skipping — no userId (walk-in)');
    return true;
  }
  if (!title || !message) {
    console.warn('[notify] Skipping — missing title or message');
    return false;
  }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (typeof window === 'undefined') {
      // ── Server-side: API routes, Server Actions ──────────────────────────
      const secret = process.env.NOTIFY_INTERNAL_SECRET;
      if (!secret) {
        console.error('[notify] NOTIFY_INTERNAL_SECRET not set — cannot send server-side');
        return false;
      }
      headers['x-internal-secret'] = secret;
    } else {
      // ── Client-side: browser ─────────────────────────────────────────────
      // ✅ Static import guarantees same Supabase instance as AuthContext
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData?.session?.access_token;
      if (!jwt) {
        console.error('[notify] No session JWT — user not logged in or session expired');
        return false;
      }
      headers['Authorization'] = `Bearer ${jwt}`;
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
    console.log('[notify] ✅ sent:', {
      userId,
      type,
      notifId: result?.notification_id,
      push:    result?.sent_push,
      role:    result?.role,
    });
    return true;
  } catch (e: any) {
    console.error('[notify] failed:', e?.message);
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
