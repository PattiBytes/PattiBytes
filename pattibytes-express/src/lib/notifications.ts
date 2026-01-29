import { supabase } from './supabase';

export const notificationService = {
  // Request notification permission
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  },

  // Send browser notification
  async sendBrowserNotification(title: string, options?: NotificationOptions) {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        ...options,
      });
    }
  },

  // Save notification to database
  async saveNotification(
    userId: string,
    title: string,
    message: string,
    type: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          is_read: false,
        },
      ]);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to save notification:', error);
    }
  },

  // Get user notifications
  async getUserNotifications(userId: string, unreadOnly: boolean = false) {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (unreadOnly) {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get notifications:', error);
      return [];
    }
  },

  // Mark notification as read
  async markAsRead(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  },

  // Mark all notifications as read
  async markAllAsRead(userId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  },

  // Delete notification
  async deleteNotification(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  },
};
