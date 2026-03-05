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

// ── Roles that are web users → OneSignal
const WEB_ROLES = new Set(['admin', 'superadmin', 'merchant']);

// ── Core send function ────────────────────────────────────────────────────────
/**
 * Unified notification sender:
 * 1. Always writes to `notifications` DB table (in-app bell)
 * 2. Web users (admin/superadmin/merchant) → OneSignal via /api/push
 * 3. Mobile users (customers with expo tokens) → handled by Edge Function `notify`
 */
export async function sendNotification(
  userId: string,
  title: string,
  message: string,
  type: string,
  data: Record<string, any> = {},
  opts?: {
    url?: string;           // click-through URL for push
    forceWeb?: boolean;     // force web push even for customers
    forceMobile?: boolean;  // force expo push
  }
): Promise<boolean> {
  if (!userId || !title) return false;

  // 1. Write to DB
  const { data: inserted, error: dbErr } = await supabase
    .from('notifications')
    .insert({
      user_id:    userId,
      title,
      message,
      body:       message,
      type,
      data,
      is_read:    false,
      sent_push:  false,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (dbErr) console.warn('[notification] DB insert:', dbErr.message);

  const notifId = inserted?.id;

  // 2. Determine push channel
  // Look up user role to decide which channel
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  const role = profile?.role ?? 'customer';
  const isWebUser = WEB_ROLES.has(role) || opts?.forceWeb;

  if (isWebUser && !opts?.forceMobile) {
    // Web push via OneSignal
    sendWebPush(userId, title, message, type, data, opts?.url, notifId).catch(e =>
      console.warn('[notification] web push failed:', e?.message)
    );
  } else {
    // Mobile push via Edge Function (Expo)
    sendExpoPush(userId, title, message, type, data, notifId).catch(e =>
      console.warn('[notification] expo push failed:', e?.message)
    );
  }

  return !dbErr;
}

// ── Web push (OneSignal) ──────────────────────────────────────────────────────
async function sendWebPush(
  userId: string,
  title: string,
  message: string,
  type: string,
  data: Record<string, any>,
  url = '/admin/dashboard',
  notifId?: string,
): Promise<void> {
  await fetch('/api/push', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId, title, message, type, url,
      data: { ...data, notification_id: notifId },
    }),
  });
}

// ── Mobile push (Expo) via Edge Function ──────────────────────────────────────
async function sendExpoPush(
  userId: string,
  title: string,
  message: string,
  type: string,
  data: Record<string, any>,
  notifId?: string,
): Promise<void> {
  const { error } = await supabase.functions.invoke('notify', {
    body: {
      targetUserId: userId,
      title, message, body: message, type,
      data: { ...data, notification_id: notifId },
    },
  });
  if (error) throw error;
}

// ── Notification CRUD ─────────────────────────────────────────────────────────
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
        (payload) => onInsert(payload.new as NotificationRow)
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
    const title = `Order #${orderNum}`;

    const msgs: Record<string, { customer?: string; merchant?: string }> = {
      pending:    { customer: 'Your order has been placed!', merchant: 'New order received! Please confirm.' },
      confirmed:  { customer: 'Your order has been confirmed.', merchant: 'Order confirmed. Start preparing!' },
      preparing:  { customer: 'Your order is being prepared.' },
      ready:      { customer: 'Your order is ready for pickup!' },
      on_the_way: { customer: 'Your order is on the way!' },
      delivered:  { customer: 'Your order has been delivered. Enjoy!', merchant: 'Order delivered.' },
      cancelled:  { customer: 'Your order has been cancelled.', merchant: 'Order was cancelled.' },
    };

    const notifData = { order_id: orderId, order_number: orderNum, status };

    if (msgs[status]?.customer && order.customer_id) {
      await sendNotification(
        order.customer_id, title, msgs[status]!.customer!, 'order', notifData,
        { url: `/customer/orders/${orderId}` }
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
