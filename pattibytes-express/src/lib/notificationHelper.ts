/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * ✅ Routes through /api/notify (NOT direct DB insert)
 * This ensures:
 *   - OneSignal web push fires (via API route → DB insert → trigger)
 *   - Expo push fires (via existing DB trigger)
 *   - Admin fan-out works
 *   - Walk-in orders (null userId) are silently skipped
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
    console.log('[sendNotification] Skipping — walk-in order (no user_id)');
    return true;
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Server-side: use internal secret
    const secret = process.env.NOTIFY_INTERNAL_SECRET;
    if (secret) {
      headers['x-internal-secret'] = secret;
    } else {
      // Client-side: use Supabase session JWT
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: s } = await supabase.auth.getSession();
        const jwt = s?.session?.access_token;
        if (jwt) headers['Authorization'] = `Bearer ${jwt}`;
      } catch { /* no session */ }
    }

    if (!headers['Authorization'] && !headers['x-internal-secret']) {
      console.error('[sendNotification] No auth available');
      return false;
    }

    const base = typeof window !== 'undefined'
      ? ''
      : (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pbexpress.pattibytes.com');

    const res = await fetch(`${base}/api/notify`, {
      method: 'POST',
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
