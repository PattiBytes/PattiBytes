/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Bell, X } from 'lucide-react';
import { toast } from 'react-toastify';

interface NotificationRow {
  id: string;
  title: string;
  body?: string | null;
  message?: string | null; // some of your code stores message, some stores body
  type: string;
  data?: any;
  is_read: boolean;
  created_at: string;
  read_at?: string | null;
}

export default function NotificationBell() {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  const canUseBrowserNotifications = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return 'Notification' in window;
  }, []);

  const requestBrowserPermission = async () => {
    if (!canUseBrowserNotifications) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const p = await Notification.requestPermission();
    return p === 'granted';
  };

  const showBrowserPopup = async (n: NotificationRow) => {
    if (!canUseBrowserNotifications) return;
    if (document.visibilityState === 'visible') return; // optional: avoid spam when user is already looking
    const ok = await requestBrowserPermission();
    if (!ok) return;

    new Notification(n.title, {
      body: n.body ?? n.message ?? '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    });
  };

  useEffect(() => {
    if (!user) return;

    void loadNotifications();
    void loadUnreadCount();

    const channel = supabase
      .channel(`user-notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const newNotif = payload.new as NotificationRow;

          setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
          setUnreadCount((prev) => prev + 1);

          toast.info(newNotif.title, { position: 'top-right', autoClose: 5000 });

          // Browser notification for the logged-in user only
          await showBrowserPopup(newNotif);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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

      if (error) {
        console.error('Notification load error:', error);
        return;
      }

      setNotifications((data as NotificationRow[]) || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    if (!user) return;

    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      setUnreadCount(count ?? 0);
    } catch (error) {
      console.error('Failed to load unread count:', error);
      setUnreadCount(0);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        console.error('Mark as read error:', error);
        return;
      }

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Mark all as read error:', error);
        toast.error('Failed to mark all as read');
        return;
      }

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      order: '📦',
      delivery: '🚚',
      system: '🔔',
      payment: '💰',
      restaurant: '🍽️',
      order_admin: '🛡️',
    };
    return icons[type] || '🔔';
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown((v) => !v)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Notifications"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />

          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-lg text-gray-900">Notifications</h3>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-xs text-primary hover:text-orange-600 font-semibold">
                    Mark all read
                  </button>
                )}
                <button onClick={() => setShowDropdown(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                        !notification.is_read ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => {
                        if (!notification.is_read) markAsRead(notification.id);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{getNotificationIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-gray-900 text-sm">{notification.title}</p>
                            {!notification.is_read && <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />}
                          </div>

                          <p className="text-sm text-gray-600 mt-1">
                            {notification.body ?? notification.message ?? ''}
                          </p>

                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-3 border-t bg-gray-50">
                <button
                  onClick={() => setShowDropdown(false)}
                  className="w-full text-center text-sm text-primary hover:text-orange-600 font-semibold"
                >
                  View All Notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
