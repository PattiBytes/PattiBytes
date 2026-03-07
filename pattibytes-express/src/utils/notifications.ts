/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * ✅ CANONICAL sendNotification — import ONLY from here.
 * Delete or replace all imports from:
 *   - @/lib/notificationHelper
 *   - @/services/notifications
 *   - @/services/notificationService
 *   - @/lib/sendDbNotification
 *   - @/lib/notificationService
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

    // ── Auth header ──────────────────────────────────────────────────────────
    // Server-side: NOTIFY_INTERNAL_SECRET is available as env var
    // Client-side: use Supabase session JWT
    const secret = typeof process !== 'undefined' ? process.env?.NOTIFY_INTERNAL_SECRET : undefined;

    if (secret) {
      headers['x-internal-secret'] = secret;
    } else {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: s }  = await supabase.auth.getSession();
        const jwt = s?.session?.access_token;
        if (jwt) headers['Authorization'] = `Bearer ${jwt}`;
      } catch { /* no session */ }
    }

    if (!headers['Authorization'] && !headers['x-internal-secret']) {
      console.error('[notify] No auth — cannot call /api/notify');
      return false;
    }

    const base = typeof window !== 'undefined'
      ? ''
      : (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pbexpress.pattibytes.com');

    const res = await fetch(`${base}/api/notify`, {
      method:  'POST',
      headers,
      body:    JSON.stringify({
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
    console.log('[notify] ✅ sent:', { userId, type, notifId: result?.notification_id, push: result?.sent_push });
    return true;
  } catch (e: any) {
    console.error('[notify] failed:', e?.message);
    return false;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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
