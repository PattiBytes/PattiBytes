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
}

class NotificationService {
  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }

    return count ?? 0;
  }

  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (!('Notification' in window)) return false;

    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  /**
   * Creates DB notifications for:
   * - target user (userId)
   * - all admins + superadmins (handled inside Edge Function "notify")
   */
  async sendNotification(userId: string, title: string, message: string, type: string, data?: any): Promise<void> {
    try {
      // Supabase docs indicate Edge Functions use the Authorization header, and
      // supabase-js generally handles auth automatically for the signed-in user. [web:176][web:183]
      const { error } = await supabase.functions.invoke('notify', {
        body: {
          targetUserId: userId,
          title,
          message,
          type,
          data: data ?? {},
          body: message,
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  async getUserNotifications(userId: string): Promise<NotificationRow[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data as NotificationRow[]) || [];
    } catch (error) {
      console.error('Failed to get notifications:', error);
      return [];
    }
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

  // ✅ FIX: this is what your build is complaining about
  async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
  }

  /**
   * Realtime subscription for current logged-in user.
   * Put browser popups HERE (correct place).
   */
  subscribeToNotifications(userId: string, onInsert: (row: NotificationRow) => void) {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const row = payload.new as NotificationRow;
          onInsert(row);

          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(row.title, {
              body: row.body ?? row.message ?? '',
              icon: '/icon-192.png',
              badge: '/icon-192.png',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  async sendOrderNotification(orderId: string, status: string) {
    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, customer_id, merchant_id')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      const statusMessages: Record<string, { customer?: string; merchant?: string }> = {
        pending: { customer: 'Your order has been placed successfully!', merchant: 'New order received! Please confirm.' },
        confirmed: { customer: 'Your order has been confirmed by the restaurant.', merchant: 'Order confirmed. Start preparing!' },
        preparing: { customer: 'Your order is being prepared.' },
        ready: { customer: 'Your order is ready for pickup!' },
        on_the_way: { customer: 'Your order is on the way!' },
        delivered: { customer: 'Your order has been delivered. Enjoy your meal!', merchant: 'Order delivered successfully.' },
        cancelled: { customer: 'Your order has been cancelled.', merchant: 'Order was cancelled.' },
      };

      const title = `Order #${orderId.slice(0, 8)}`;

      // Customer (admins/superadmins will also get it via fanout)
      if (statusMessages[status]?.customer && order.customer_id) {
        await this.sendNotification(order.customer_id, title, statusMessages[status]!.customer!, 'order', {
          order_id: orderId,
          status,
        });
      }

      // Merchant (lookup merchant user_id, admins/superadmins also get it via fanout)
      if (statusMessages[status]?.merchant && order.merchant_id) {
        const { data: merchant } = await supabase
          .from('merchants')
          .select('user_id')
          .eq('id', order.merchant_id)
          .single();

        if (merchant?.user_id) {
          await this.sendNotification(merchant.user_id, title, statusMessages[status]!.merchant!, 'order', {
            order_id: orderId,
            status,
            merchant_id: order.merchant_id,
          });
        }
      }
    } catch (error) {
      console.error('Failed to send order notification:', error);
    }
  }
}

export const notificationService = new NotificationService();
