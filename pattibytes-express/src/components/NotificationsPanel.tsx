'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Bell, X, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { notificationService } from '@/services/notifications';

interface Notification {
  id: string;
  title: string;
  body?: string;
  type: string;
  is_read: boolean;
  created_at: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

export default function NotificationsPanel() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifications();
      loadUnreadCount();

      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadNotifications();
            loadUnreadCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications(data as Notification[]);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIX: Properly handle the async function
  const loadUnreadCount = async () => {
    if (!user) return;

    try {
      const count = await notificationService.getUnreadCount(user.id);
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
      setUnreadCount(0);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      await loadNotifications();
      await loadUnreadCount();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    try {
      await notificationService.markAllAsRead(user.id);
      await loadNotifications();
      await loadUnreadCount();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationService.deleteNotification(notificationId);
      await loadNotifications();
      await loadUnreadCount();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      new_order: '📦',
      order_confirmed: '✅',
      order_ready: '🍽️',
      out_for_delivery: '🚚',
      delivered: '🎉',
      delivery_assigned: '🚚',
      access_approved: '✅',
      access_rejected: '❌',
      order: '🛒',
      delivery: '🚗',
      system: '🔔',
    };
    return icons[type] || '🔔';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} className="sm:hidden" />
        <Bell size={24} className="hidden sm:block" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 sm:top-0 sm:right-0 bg-red-500 text-white text-[10px] sm:text-xs font-bold rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showPanel && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 sm:bg-transparent"
            onClick={() => setShowPanel(false)}
          />
          <div className="fixed sm:absolute left-0 right-0 sm:left-auto sm:right-0 bottom-0 sm:bottom-auto sm:top-full sm:mt-2 w-full sm:w-96 bg-white rounded-t-2xl sm:rounded-lg shadow-2xl z-50 max-h-[85vh] sm:max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-bold text-gray-900 text-base sm:text-lg">
                Notifications {unreadCount > 0 && `(${unreadCount})`}
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs sm:text-sm text-primary hover:underline font-medium"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setShowPanel(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-600">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mx-auto mb-2"></div>
                  Loading...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell size={48} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 text-sm sm:text-base font-medium">No notifications yet</p>
                  <p className="text-gray-500 text-xs sm:text-sm mt-1">We&apos;ll notify you when something arrives</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 sm:p-4 hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors relative group ${
                        !notification.is_read ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-2 sm:gap-3">
                        <span className="text-xl sm:text-2xl flex-shrink-0">{getNotificationIcon(notification.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <p className="font-medium text-gray-900 text-xs sm:text-sm pr-2">
                              {notification.title}
                            </p>
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1"></div>
                            )}
                          </div>
                          {notification.body && (
                            <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2 line-clamp-2">{notification.body}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] sm:text-xs text-gray-500">
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                              })}
                            </p>
                            <button
                              onClick={(e) => handleDeleteNotification(notification.id, e)}
                              className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1 transition-all"
                              aria-label="Delete notification"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
