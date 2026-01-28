import { supabase } from '@/lib/supabase';
import { Notification } from '@/types';

export const notificationService = {
  // Get notifications for a user
  async getNotifications(userId: string): Promise<Notification[]> {
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
  },

  // Send notification when customer places order
  async notifyNewOrder(orderId: string, customerId: string, merchantId: string) {
    try {
      const notifications = [];

      // Notify merchant
      notifications.push({
        user_id: merchantId,
        title: '🔔 New Order Received',
        body: `You have received a new order #${orderId.slice(0, 8)}`,
        type: 'new_order',
        data: { order_id: orderId, customer_id: customerId },
      });

      // Notify all admins
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'superadmin']);

      if (admins) {
        admins.forEach((admin) => {
          notifications.push({
            user_id: admin.id,
            title: '📦 New Order Placed',
            body: `New order #${orderId.slice(0, 8)} has been placed`,
            type: 'new_order_admin',
            data: { order_id: orderId, merchant_id: merchantId },
          });
        });
      }

      // Insert all notifications
      const { error } = await supabase.from('notifications').insert(notifications);
      if (error) throw error;

      console.log('✅ Order notifications sent successfully');
    } catch (error) {
      console.error('❌ Failed to send order notifications:', error);
    }
  },

  // Send notification when merchant approves order
  async notifyOrderApproved(orderId: string, customerId: string, merchantId: string, driverId?: string) {
    try {
      const notifications = [];

      // Notify customer
      notifications.push({
        user_id: customerId,
        title: '✅ Order Confirmed',
        body: `Your order #${orderId.slice(0, 8)} has been confirmed and is being prepared`,
        type: 'order_confirmed',
        data: { order_id: orderId },
      });

      // Notify admins
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'superadmin']);

      if (admins) {
        admins.forEach((admin) => {
          notifications.push({
            user_id: admin.id,
            title: '✅ Order Confirmed',
            body: `Order #${orderId.slice(0, 8)} has been confirmed by merchant`,
            type: 'order_confirmed_admin',
            data: { order_id: orderId, merchant_id: merchantId },
          });
        });
      }

      // Notify delivery driver if assigned
      if (driverId) {
        notifications.push({
          user_id: driverId,
          title: '🚚 New Delivery Assignment',
          body: `You have been assigned to deliver order #${orderId.slice(0, 8)}`,
          type: 'delivery_assigned',
          data: { order_id: orderId, merchant_id: merchantId },
        });
      }

      // Insert all notifications
      const { error } = await supabase.from('notifications').insert(notifications);
      if (error) throw error;

      console.log('✅ Approval notifications sent successfully');
    } catch (error) {
      console.error('❌ Failed to send approval notifications:', error);
    }
  },

  // Send notification when order is ready
  async notifyOrderReady(orderId: string, customerId: string, driverId?: string) {
    try {
      const notifications = [];

      // Notify customer
      notifications.push({
        user_id: customerId,
        title: '🍽️ Order Ready',
        body: `Your order #${orderId.slice(0, 8)} is ready for pickup`,
        type: 'order_ready',
        data: { order_id: orderId },
      });

      // Notify driver if assigned
      if (driverId) {
        notifications.push({
          user_id: driverId,
          title: '📦 Ready for Pickup',
          body: `Order #${orderId.slice(0, 8)} is ready for pickup`,
          type: 'ready_for_pickup',
          data: { order_id: orderId },
        });
      }

      const { error } = await supabase.from('notifications').insert(notifications);
      if (error) throw error;
    } catch (error) {
      console.error('Failed to send ready notifications:', error);
    }
  },

  // Send notification when delivery starts
  async notifyDeliveryStarted(orderId: string, customerId: string, driverName: string) {
    try {
      await supabase.from('notifications').insert([
        {
          user_id: customerId,
          title: '🚚 Out for Delivery',
          body: `${driverName} is on the way with your order #${orderId.slice(0, 8)}`,
          type: 'out_for_delivery',
          data: { order_id: orderId },
        },
      ]);
    } catch (error) {
      console.error('Failed to send delivery notification:', error);
    }
  },

  // Send notification when order is delivered
  async notifyDelivered(orderId: string, customerId: string, merchantId: string) {
    try {
      const notifications = [
        {
          user_id: customerId,
          title: '🎉 Order Delivered',
          body: `Your order #${orderId.slice(0, 8)} has been delivered. Enjoy your meal!`,
          type: 'delivered',
          data: { order_id: orderId },
        },
        {
          user_id: merchantId,
          title: '✅ Order Completed',
          body: `Order #${orderId.slice(0, 8)} has been successfully delivered`,
          type: 'order_completed',
          data: { order_id: orderId },
        },
      ];

      await supabase.from('notifications').insert(notifications);
    } catch (error) {
      console.error('Failed to send delivered notification:', error);
    }
  },

  // Mark notification as read
  async markAsRead(notificationId: string) {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  },

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string) {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  },

  // Get unread count
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  },
};
