'use client';

import { useState, useEffect } from 'react';
import { notificationService } from '@/services/notifications';
import { Notification } from '@/types';
import { toast } from 'react-toastify';

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const loadNotifications = async () => {
      try {
        const [notifs, count] = await Promise.all([
          notificationService.getNotifications(userId),
          notificationService.getUnreadCount(userId),
        ]);
        setNotifications(notifs);
        setUnreadCount(count);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();

    // Subscribe to real-time notifications
    const channel = notificationService.subscribeToNotifications(
      userId,
      (newNotification) => {
        setNotifications((prev) => [newNotification, ...prev]);
        setUnreadCount((prev) => prev + 1);
        
        // Show toast notification
        toast.info(newNotification.title, {
          position: 'top-right',
          autoClose: 5000,
        });
      }
    );

    return () => {
      notificationService.unsubscribe(channel);
    };
  }, [userId]);

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    
    try {
      await notificationService.markAllAsRead(userId);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  };
}
