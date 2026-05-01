/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';

// ✅ Single canonical re-export — no local duplicate function
export { sendNotification } from '@/utils/notifications';

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
    const { error } = await supabase.from('notifications').delete().eq('id', notificationId);
    if (error) throw error;
  }

  subscribeToNotifications(
    userId: string,
    onInsert: (row: NotificationRow) => void
  ): () => void {
    const channel = supabase
      .channel(`notif-service:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        payload => onInsert(payload.new as NotificationRow)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }

  async sendOrderNotification(orderId: string, status: string): Promise<void> {
    // ✅ Dynamic import here only — avoids circular dep at module level
    const { sendNotification } = await import('@/utils/notifications');

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
        order.customer_id, title, msgs[status]!.customer!, 'order',
        notifData, { url: `/orders/${orderId}` }
      );
    }

    if (msgs[status]?.merchant && order.merchant_id) {
      const { data: merchant } = await supabase
        .from('merchants').select('user_id').eq('id', order.merchant_id).maybeSingle();
      if (merchant?.user_id) {
        await sendNotification(
          merchant.user_id, title, msgs[status]!.merchant!, 'order',
          notifData, { url: `/merchant/orders/${orderId}` }
        );
      }
    }
  }
}

export const notificationService = new NotificationService();