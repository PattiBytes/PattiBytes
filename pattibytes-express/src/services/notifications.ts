/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  data?: any;
  is_read: boolean;
  created_at: string;
}

class NotificationService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  sendOrderNotifications(id: any, merchant_id: any, id1: string) {
    throw new Error('Method not implemented.');
  }
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Failed to get unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  async requestPermission() {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  async sendNotification(
    userId: string,
    title: string,
    message: string,
    type: string,
    data?: any
  ) {
    try {
      const { error } = await supabase.from('notifications').insert([
        {
          user_id: userId,
          title,
          body: message,
          type,
          data,
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      // Browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body: message,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
        });
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data as Notification[]) || [];
    } catch (error) {
      console.error('Failed to get notifications:', error);
      return [];
    }
  }

  async markAsRead(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to mark as read:', error);
      throw error;
    }
  }

  async markAllAsRead(userId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      throw error;
    }
  }

  subscribeToNotifications(userId: string, callback: (notification: any) => void) {
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
        (payload) => {
          console.log('New notification received:', payload);
          callback(payload.new);
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
      .select(
        'id, customer_id, merchant_id, delivery_address, created_at, customer:profiles!orders_customer_id_fkey(full_name), merchant:merchants!orders_merchant_id_fkey(business_name)'
      )
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    const statusMessages: any = {
      pending: { customer: 'Your order has been placed successfully!', merchant: 'New order received! Please confirm.' },
      confirmed: { customer: 'Your order has been confirmed by the restaurant.', merchant: 'Order confirmed. Start preparing!' },
      preparing: { customer: 'Your order is being prepared.' },
      ready: { customer: 'Your order is ready for pickup!', driver: 'New delivery available!' },
      on_the_way: { customer: 'Your order is on the way!' },
      delivered: { customer: 'Your order has been delivered. Enjoy your meal!', merchant: 'Order delivered successfully.' },
      cancelled: { customer: 'Your order has been cancelled.', merchant: 'Order was cancelled.' },
    };

    const title = `Order #${orderId.slice(0, 8)}`;

    // Customer
    if (statusMessages[status]?.customer && order.customer_id) {
      await this.sendNotification(order.customer_id, title, statusMessages[status].customer, 'order', { order_id: orderId, status });
    }

    // Merchant (lookup merchant user_id)
    if (statusMessages[status]?.merchant && order.merchant_id) {
      const { data: merchant } = await supabase
        .from('merchants')
        .select('user_id')
        .eq('id', order.merchant_id)
        .single();

      if (merchant?.user_id) {
        await this.sendNotification(merchant.user_id, title, statusMessages[status].merchant, 'order', { order_id: orderId, status });
      }
    }

    // Drivers on ready
   // ✅ Superadmins on every status change
const { data: superadmins, error: saErr } = await supabase
  .from('profiles')
  .select('id')
  .eq('role', 'superadmin')
  .eq('approval_status', 'approved');

if (!saErr) {
 const merchantObj = Array.isArray(order.merchant) ? order.merchant[0] : order.merchant;
const merchantName = merchantObj?.business_name;


  const msg = `Order ${orderId.slice(0, 8)} status → ${status}${merchantName ? ` (${merchantName})` : ''}`;

  for (const sa of superadmins || []) {
    await this.sendNotification(sa.id, `Order #${orderId.slice(0, 8)}`, msg, 'order_admin', {
      order_id: orderId,
      status,
      merchant_id: order.merchant_id,
      customer_id: order.customer_id,
    });
  }
}

  } catch (error) {
    console.error('Failed to send order notification:', error);
  }
}


  async getNotificationById(notificationId: string) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', notificationId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to get notification:', error);
      return null;
    }
  }

  async deleteNotification(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw error;
    }
  }

  async deleteAllNotifications(userId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to delete all notifications:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
