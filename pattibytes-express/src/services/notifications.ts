/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';

class NotificationService {
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
          message,
          type,
          data,
          read: false,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      // Send browser notification if permission granted
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

  async getUserNotifications(userId: string) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get notifications:', error);
      return [];
    }
  }

  async markAsRead(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
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
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

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
      // Get order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*, profiles!orders_user_id_fkey(full_name), merchants:profiles!orders_merchant_id_fkey(full_name)')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      const statusMessages: any = {
        pending: {
          customer: 'Your order has been placed successfully!',
          merchant: 'New order received! Please confirm.',
        },
        confirmed: {
          customer: 'Your order has been confirmed by the restaurant.',
          merchant: 'Order confirmed. Start preparing!',
        },
        preparing: {
          customer: 'Your order is being prepared.',
        },
        ready: {
          customer: 'Your order is ready for pickup!',
          driver: 'New delivery available!',
        },
        on_the_way: {
          customer: 'Your order is on the way!',
        },
        delivered: {
          customer: 'Your order has been delivered. Enjoy your meal!',
          merchant: 'Order delivered successfully.',
        },
        cancelled: {
          customer: 'Your order has been cancelled.',
          merchant: 'Order was cancelled.',
        },
      };

      // Notify customer
      if (statusMessages[status]?.customer) {
        await this.sendNotification(
          order.user_id,
          `Order #${orderId.slice(0, 8)}`,
          statusMessages[status].customer,
          'order',
          { order_id: orderId, status }
        );
      }

      // Notify merchant
      if (statusMessages[status]?.merchant) {
        await this.sendNotification(
          order.merchant_id,
          `Order #${orderId.slice(0, 8)}`,
          statusMessages[status].merchant,
          'order',
          { order_id: orderId, status }
        );
      }

      // Notify driver for ready status
      if (status === 'ready' && statusMessages[status]?.driver) {
        const { data: drivers } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'driver')
          .eq('approval_status', 'approved');

        if (drivers) {
          for (const driver of drivers) {
            await this.sendNotification(
              driver.id,
              'New Delivery Available',
              statusMessages[status].driver,
              'delivery',
              { order_id: orderId }
            );
          }
        }
      }
    } catch (error) {
      console.error('Failed to send order notification:', error);
    }
  }
}

export const notificationService = new NotificationService();
