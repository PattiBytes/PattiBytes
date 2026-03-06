/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * THE single sendNotification used everywhere in the app.
 * Routes through /api/notify which handles:
 *   - DB insert
 *   - OneSignal push (web roles)
 *   - Expo push via webhook (mobile customers)
 *   - Admin fan-out
 */
export async function sendNotification(
  userId: string | null,
  title: string,
  message: string,
  type: string,
  data: any = {},
  opts?: { url?: string }
): Promise<boolean> {
  // Skip walk-in orders (no user_id)
  if (!userId) {
    console.log('[sendNotification] Skipping — walk-in order (no user_id)');
    return true;
  }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    // Server-side: use internal secret (no browser session)
    const secret = process.env.NOTIFY_INTERNAL_SECRET;
    if (secret) {
      headers['x-internal-secret'] = secret;
    } else {
      // Client-side fallback: try Supabase session JWT
      // Only runs in browser — dynamic import avoids SSR issues
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: s } = await supabase.auth.getSession();
        const jwt = s?.session?.access_token;
        if (jwt) headers['Authorization'] = `Bearer ${jwt}`;
      } catch { /* no session available */ }
    }

    if (!headers['Authorization'] && !headers['x-internal-secret']) {
      console.error('[sendNotification] No auth available — cannot call /api/notify');
      return false;
    }

    // Absolute URL required on server-side
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
        data: { ...data, url: opts?.url },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[sendNotification] /api/notify error:', res.status, err);
      return false;
    }

    return true;
  } catch (e: any) {
    console.error('[sendNotification] failed:', e?.message);
    return false;
  }
}

/**
 * Get customer display name from order
 */
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
