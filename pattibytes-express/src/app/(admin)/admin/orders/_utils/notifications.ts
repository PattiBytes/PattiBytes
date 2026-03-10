/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';

/** Get current user's access token for the API route's JWT auth. */
async function getJWT(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/**
 * Core helper — calls your existing /api/notify route.
 * That route handles: DB insert, OneSignal push, AND admin fan-out automatically.
 */
export async function notify(
  targetUserId : string | null,
  title        : string,
  message      : string,
  type         : string,
  data?        : Record<string, unknown>,
  url?         : string,
): Promise<boolean> {
  if (!targetUserId) return true; // walk-in order — skip silently

  try {
    const jwt = await getJWT();
    if (!jwt) {
      console.warn('[notify] No JWT — skipping push (user not logged in?)');
      return false;
    }

    const res = await fetch('/api/notify', {
      method : 'POST',
      headers: {
        'Content-Type' : 'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
      body: JSON.stringify({ targetUserId, title, message, type, data, url }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('[notify] API error:', err);
      return false;
    }

    const result = await res.json();
    console.log('[notify] ✅', result);
    return true;
  } catch (e: any) {
    console.error('[notify] threw:', e?.message);
    return false;
  }
}

/** Notify a customer about an order status change. */
export async function notifyStatusChange(
  userId    : string | null,
  orderId   : string,
  orderNum  : string | number | null | undefined,
  newStatus : string,
) {
  if (!userId) return;
  const shortId  = String(orderNum ?? orderId.slice(0, 8));
  const readable = newStatus.replace(/_/g, ' ');
  await notify(
    userId,
    'Order Status Updated',
    `Your order #${shortId} is now ${readable}.`,
    'order_update',
    { order_id: orderId, orderId, status: newStatus },
  );
}

/** Notify a single driver about a new delivery request. */
export async function notifyDriver(
  driverId  : string,
  orderId   : string,
  merchantId: string,
  total     : number,
): Promise<boolean> {
  return notify(
    driverId,
    '🚀 New Delivery Request',
    `Order #${orderId.slice(0, 8)} ready for pickup — ₹${total.toFixed(2)}`,
    'new_order',
    { order_id: orderId, orderId, merchant_id: merchantId, total_amount: total },
  );
}

/** Notify customer/driver about a custom order update. */
export async function notifyCustomOrder(
  userId        : string,
  customOrderId : string,
  customOrderRef: string | null | undefined,
  title         : string,
  message       : string,
) {
  await notify(userId, title, message, 'custom_order', {
    custom_order_id: customOrderId,
    custom_order_ref: customOrderRef,
  });
}
