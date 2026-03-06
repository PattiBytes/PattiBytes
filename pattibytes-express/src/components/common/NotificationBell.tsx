/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Bell, X, Trash2, CheckCheck, BellRing, BellOff } from 'lucide-react';
import { toast } from 'react-toastify';
import { formatDistanceToNow } from 'date-fns';
import { getPushPermission, requestPushPermission } from '@/lib/onesignal';

interface NotificationRow {
  id: string;
  title: string;
  body?: string | null;
  message?: string | null;
  type: string;
  data?: any;
  is_read: boolean;
  created_at: string;
  read_at?: string | null;
  sent_push?: boolean;
}

const ICON_MAP: Record<string, string> = {
  order:             '🛒',
  order_update:      '📦',
  new_order:         '📦',
  order_confirmed:   '✅',
  order_ready:       '🍽️',
  out_for_delivery:  '🚚',
  delivered:         '🎉',
  delivery:          '🚗',
  delivery_assigned: '🚚',
  access_approved:   '✅',
  access_rejected:   '❌',
  payment:           '💰',
  promo:             '🎁',
  system:            '🔔',
  order_admin:       '🛡️',
  quote:             '💬',
  custom:            '✦',
};

export default function NotificationBell() {
  const { user } = useAuth();

  const [notifications, setNotifications]   = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount]       = useState(0);
  const [showDropdown, setShowDropdown]     = useState(false);
  const [loading, setLoading]               = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [requestingPush, setRequestingPush] = useState(false);

  // Track notification IDs we've already toasted — prevents duplicate toasts on re-mount
  const toastedIds = useRef<Set<string>>(new Set());

  const canUseBrowserNotifications = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return 'Notification' in window;
  }, []);

  // Load push permission on mount
  useEffect(() => {
    if (!canUseBrowserNotifications) return;
    getPushPermission().then(setPushPermission);
  }, [canUseBrowserNotifications]);

  // ── Data loaders ─────────────────────────────────────────────────────────────
  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(25);
      if (error) { console.error('Notification load:', error); return; }
      setNotifications((data as NotificationRow[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const loadUnreadCount = useCallback(async () => {
    if (!user?.id) return;
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    if (!error) setUnreadCount(count ?? 0);
  }, [user?.id]);

  // ── Realtime subscription ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    void loadNotifications();
    void loadUnreadCount();

    const channel = supabase
      .channel(`user-notif:${user.id}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as NotificationRow;

          // Optimistic update
          setNotifications(prev => {
            if (prev.some(x => x.id === n.id)) return prev; // dedup
            return [n, ...prev].slice(0, 25);
          });
          setUnreadCount(c => c + 1);

          // Toast — only once per notification id
          if (!toastedIds.current.has(n.id)) {
            toastedIds.current.add(n.id);
            toast.info(
              <div>
                <p className="font-semibold text-sm">{n.title}</p>
                {(n.body ?? n.message) && (
                  <p className="text-xs text-gray-600 mt-0.5">{n.body ?? n.message}</p>
                )}
              </div>,
              {
                position:  'top-right',
                autoClose: 5000,
                icon: () => <span className="text-xl">{ICON_MAP[n.type] ?? '🔔'}</span>,
              }
            );
          }

          // Native browser popup only when tab is hidden
          // (OneSignal handles push when browser is fully closed)
          if (
            canUseBrowserNotifications &&
            Notification.permission === 'granted' &&
            document.visibilityState === 'hidden'
          ) {
            new Notification(n.title, {
              body:  n.body ?? n.message ?? '',
              icon:  '/icon-192.png',
              badge: '/icon-192.png',
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Reset page title when panel opens
  useEffect(() => {
    if (showDropdown) document.title = 'PattiBytes Express';
  }, [showDropdown]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { console.error('markAsRead:', error); return; }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('is_read', false);
    if (error) { toast.error('Failed to mark all as read'); return; }
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const wasUnread = notifications.find(n => n.id === id)?.is_read === false;
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (wasUnread) setUnreadCount(c => Math.max(0, c - 1));
  };

  const handleEnablePush = async () => {
    setRequestingPush(true);
    try {
      const granted = await requestPushPermission();
      const perm    = granted ? 'granted' : 'denied';
      setPushPermission(perm);
      if (granted) toast.success('Push notifications enabled!');
      else         toast.warn('Push permission denied — enable in browser settings');
    } finally {
      setRequestingPush(false);
    }
  };

  if (!user) return null;

  return (
    <div className="relative">
      {/* ── Bell button ──────────────────────────────────────────────────── */}
      <button
        onClick={() => setShowDropdown(v => !v)}
        className="relative p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} className="sm:hidden" />
        <Bell size={24} className="hidden sm:block" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 text-[10px] sm:text-xs font-black text-white bg-red-600 rounded-full animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />

          {/* Dropdown panel */}
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 max-h-[80vh] overflow-hidden flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-white sticky top-0 z-10">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                Notifications
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 text-xs text-primary hover:underline font-semibold"
                  >
                    <CheckCheck size={13} /> All read
                  </button>
                )}
                <button
                  onClick={() => setShowDropdown(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Push permission banner */}
            {canUseBrowserNotifications && pushPermission === 'default' && (
              <div className="bg-violet-50 border-b border-violet-100 px-3 py-2.5 flex items-center gap-2.5">
                <BellRing className="w-4 h-4 text-violet-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-violet-900">Enable push notifications</p>
                  <p className="text-xs text-violet-700">Get updates even when the tab is closed</p>
                </div>
                <button
                  onClick={handleEnablePush}
                  disabled={requestingPush}
                  className="shrink-0 bg-violet-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition"
                >
                  {requestingPush ? 'Enabling…' : 'Enable'}
                </button>
              </div>
            )}

            {canUseBrowserNotifications && pushPermission === 'denied' && (
              <div className="bg-gray-50 border-b px-3 py-2 flex items-center gap-2">
                <BellOff className="w-4 h-4 text-gray-400 shrink-0" />
                <p className="text-xs text-gray-500">
                  Push blocked — allow in browser Settings → Site Settings
                </p>
              </div>
            )}

            {canUseBrowserNotifications && pushPermission === 'granted' && (
              <div className="bg-green-50 border-b px-3 py-2 flex items-center gap-2">
                <Bell className="w-4 h-4 text-green-600 shrink-0" />
                <p className="text-xs text-green-700 font-semibold">Push notifications enabled ✓</p>
              </div>
            )}

            {/* Notification list */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-8 text-center text-gray-400">
                  <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading…
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-10 text-center">
                  <Bell size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-600 font-semibold text-sm">No notifications yet</p>
                  <p className="text-gray-400 text-xs mt-1">We&apos;ll notify you when something arrives</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => !n.is_read && markAsRead(n.id)}
                      className={`px-4 py-3 hover:bg-gray-50 transition cursor-pointer group relative ${
                        !n.is_read ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl shrink-0 mt-0.5">
                          {ICON_MAP[n.type] ?? '🔔'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-gray-900 text-sm line-clamp-1">
                              {n.title}
                            </p>
                            {!n.is_read && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />
                            )}
                          </div>
                          {(n.body ?? n.message) && (
                            <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                              {n.body ?? n.message}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[10px] text-gray-400">
                              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                            </span>
                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition">
                              {n.sent_push && (
                                <span title="Push sent" className="text-[10px] text-violet-400">📤</span>
                              )}
                              <button
                                onClick={e => deleteNotification(n.id, e)}
                                className="text-red-400 hover:text-red-600 p-0.5 rounded transition"
                                aria-label="Delete"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2.5 border-t bg-gray-50 text-center">
                <p className="text-xs text-gray-400">
                  Showing last {notifications.length} notifications
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
