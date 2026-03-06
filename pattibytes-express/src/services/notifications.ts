/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';

export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message?: string | null;
  body?: string | null;
  type: string;
  data?: any;
  is_read: boolean;
  created_at: string;
  read_at?: string | null;
  sent_push?: boolean;
}

// ── Core send — routes through /api/notify (server-side, bypasses RLS) ────────
export async function sendNotification(
  userId: string,
  title: string,
  message: string,
  type: string,
  data: Record<string, any> = {},
  opts?: { url?: string }
): Promise<boolean> {
  if (!userId || !title) return false;

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    // Client-side: use JWT from session
    if (typeof window !== 'undefined') {
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData?.session?.access_token;
      if (jwt) headers['Authorization'] = `Bearer ${jwt}`;
    }

    // Server-side: fall back to internal secret (no browser session available)
    if (!headers['Authorization']) {
      const secret = process.env.NOTIFY_INTERNAL_SECRET;
      if (secret) {
        headers['x-internal-secret'] = secret;
      } else {
        console.warn('[sendNotification] No session and no NOTIFY_INTERNAL_SECRET — skipping');
        return false;
      }
    }

    // Use absolute URL on server-side, relative on client
    const baseUrl = typeof window !== 'undefined'
      ? ''
      : (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pbexpress.pattibytes.com');

    const res = await fetch(`${baseUrl}/api/notify`, {
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
      console.error('[sendNotification] API error:', res.status, err);
      return false;
    }

    return true;
  } catch (e) {
    console.error('[sendNotification] failed:', e);
    return false;
  }
}

// ── NotificationService class (CRUD) ─────────────────────────────────────────
class NotificationService {
  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (error) { console.error('getUnreadCount:', error); return 0; }
    return count ?? 0;
  }

  async getUserNotifications(userId: string, limit = 50): Promise<NotificationRow[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) { console.error('getUserNotifications:', error); return []; }
    return (data as NotificationRow[]) ?? [];
  }

  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);
    if (error) throw error;
  }

  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (error) throw error;
  }

  async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);
    if (error) throw error;
  }

  subscribeToNotifications(userId: string, onInsert: (row: NotificationRow) => void) {
    const channel = supabase
      .channel(`notif:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        payload => onInsert(payload.new as NotificationRow)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }

  async sendOrderNotification(orderId: string, status: string) {
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, order_number, customer_id, merchant_id')
      .eq('id', orderId)
      .single();
    if (error || !order) return;

    const orderNum = order.order_number ?? orderId.slice(0, 8);
    const title    = `Order #${orderNum}`;

    const msgs: Record<string, { customer?: string; merchant?: string }> = {
      pending:    { customer: 'Your order has been placed!',           merchant: 'New order received! Please confirm.' },
      confirmed:  { customer: 'Your order has been confirmed.',        merchant: 'Order confirmed. Start preparing!' },
      preparing:  { customer: 'Your order is being prepared.' },
      ready:      { customer: 'Your order is ready for pickup!' },
      on_the_way: { customer: 'Your order is on the way!' },
      delivered:  { customer: 'Your order has been delivered. Enjoy!', merchant: 'Order delivered successfully.' },
      cancelled:  { customer: 'Your order has been cancelled.',        merchant: 'Order was cancelled.' },
    };

    const notifData = { order_id: orderId, order_number: orderNum, status };

    if (msgs[status]?.customer && order.customer_id) {
      await sendNotification(
        order.customer_id, title, msgs[status]!.customer!, 'order', notifData,
        { url: `/orders/${orderId}` }
      );
    }

    if (msgs[status]?.merchant && order.merchant_id) {
      const { data: merchant } = await supabase
        .from('merchants').select('user_id').eq('id', order.merchant_id).maybeSingle();
      if (merchant?.user_id) {
        await sendNotification(
          merchant.user_id, title, msgs[status]!.merchant!, 'order', notifData,
          { url: `/merchant/orders/${orderId}` }
        );
      }
    }
  }
}

export const notificationService = new NotificationService();
