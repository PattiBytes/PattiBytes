'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Bell, X, Trash2, BellOff, BellRing, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { notificationService, type NotificationRow } from '@/services/notifications';
import { getPushPermission, requestPushPermission } from '@/lib/onesignal';
import { toast } from 'react-toastify';

const ICON_MAP: Record<string, string> = {
  new_order:         '📦',
  order_confirmed:   '✅',
  order_ready:       '🍽️',
  out_for_delivery:  '🚚',
  delivered:         '🎉',
  delivery_assigned: '🚚',
  access_approved:   '✅',
  access_rejected:   '❌',
  order:             '🛒',
  order_update:      '📦',
  delivery:          '🚗',
  system:            '🔔',
  quote:             '💬',
  custom:            '✦',
  payment:           '💰',
  approval:          '👤',
  refund:            '↩️',
};

export default function NotificationsPanel() {
  const { user } = useAuth();
  const [notifications, setNotifications]   = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount]       = useState(0);
  const [showPanel, setShowPanel]           = useState(false);
  const [loading, setLoading]               = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [requestingPush, setRequestingPush] = useState(false);

  // Prevent duplicate toasts on re-mount
  const toastedIds = useRef<Set<string>>(new Set());

  const loadAll = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [notifs, count] = await Promise.all([
        // ✅ Load all 50 — admins get fan-out rows for every order
        notificationService.getUserNotifications(user.id, 50),
        notificationService.getUnreadCount(user.id),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    getPushPermission().then(setPushPermission);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    loadAll();

    const channel = supabase
      .channel(`admin-notif:${user.id}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow;

          // Dedup guard
          setNotifications(prev => {
            if (prev.some(n => n.id === row.id)) return prev;
            return [row, ...prev].slice(0, 50);
          });
          setUnreadCount(c => c + 1);

          // Tab title badge
          document.title = `(${unreadCount + 1}) PattiBytes Express`;

          // Toast — once per ID
          if (!toastedIds.current.has(row.id)) {
            toastedIds.current.add(row.id);
            toast.info(
              <div>
                <p className="font-semibold text-sm">{row.title}</p>
                {(row.body ?? row.message) && (
                  <p className="text-xs text-gray-600 mt-0.5">{row.body ?? row.message}</p>
                )}
              </div>,
              {
                position:  'top-right',
                autoClose: 6000,
                icon: () => <span className="text-xl">{ICON_MAP[row.type] ?? '🔔'}</span>,
              }
            );
          }
        }
      )
      .subscribe((status) => {
        // ✅ Log subscription status — helps debug if realtime isn't connecting
        console.log(`[NotificationsPanel] realtime status for ${user.id}:`, status);
      });

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (showPanel) document.title = 'PattiBytes Express';
  }, [showPanel]);

  const handleMarkAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return;
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    await notificationService.markAllAsRead(user.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const wasUnread = notifications.find(n => n.id === id)?.is_read === false;
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (wasUnread) setUnreadCount(c => Math.max(0, c - 1));
  };

  const handleRequestPush = async () => {
    setRequestingPush(true);
    const granted = await requestPushPermission();
    setPushPermission(granted ? 'granted' : 'denied');
    if (granted) toast.success('Push notifications enabled!');
    else         toast.warn('Push blocked — enable in browser settings');
    setRequestingPush(false);
  };

  // ── Verify admin rows exist on mount — log to console ────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count, error }) => {
        console.log(`[NotificationsPanel] DB rows for admin ${user.id}:`, count, error?.message);
      });
  }, [user?.id]);

  if (!user) return null;

  return (
    <div className="relative">
      {/* Bell trigger */}
      <button
        onClick={() => setShowPanel(v => !v)}
        className="relative p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} className="sm:hidden" />
        <Bell size={24} className="hidden sm:block" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showPanel && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 sm:bg-transparent" onClick={() => setShowPanel(false)} />
          <div className="fixed sm:absolute left-0 right-0 sm:left-auto sm:right-0 bottom-0 sm:bottom-auto sm:top-full sm:mt-2 w-full sm:w-96 bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl z-50 max-h-[88vh] sm:max-h-[80vh] overflow-hidden flex flex-col border">

            {/* Header */}
            <div className="p-3 sm:p-4 border-b flex items-center justify-between bg-white sticky top-0 z-10">
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
                  <button onClick={handleMarkAllAsRead} className="flex items-center gap-1 text-xs text-primary hover:underline font-semibold">
                    <CheckCheck size={14} /> All read
                  </button>
                )}
                <button onClick={() => setShowPanel(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Push permission banner */}
            {pushPermission === 'default' && (
              <div className="bg-violet-50 border-b border-violet-100 px-4 py-3 flex items-center gap-3">
                <BellRing className="w-5 h-5 text-violet-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-violet-900">Enable push notifications</p>
                  <p className="text-xs text-violet-700">Get order alerts even when the tab is closed</p>
                </div>
                <button onClick={handleRequestPush} disabled={requestingPush}
                  className="shrink-0 bg-violet-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition">
                  {requestingPush ? 'Enabling…' : 'Enable'}
                </button>
              </div>
            )}
            {pushPermission === 'denied' && (
              <div className="bg-gray-50 border-b px-4 py-2 flex items-center gap-2">
                <BellOff className="w-4 h-4 text-gray-400 shrink-0" />
                <p className="text-xs text-gray-500">Push blocked — allow in browser Settings → Site settings</p>
              </div>
            )}
            {pushPermission === 'granted' && (
              <div className="bg-green-50 border-b px-4 py-2 flex items-center gap-2">
                <Bell className="w-4 h-4 text-green-600 shrink-0" />
                <p className="text-xs text-green-700 font-semibold">Push notifications active ✓</p>
              </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-400">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  Loading…
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-10 text-center">
                  <Bell size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-600 font-semibold text-sm">No notifications yet</p>
                  <p className="text-gray-400 text-xs mt-1">
                    Notifications appear here when orders are placed or updated
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map(n => (
                    <div key={n.id}
                      onClick={() => !n.is_read && handleMarkAsRead(n.id)}
                      className={`p-3 sm:p-4 transition cursor-pointer group relative hover:bg-gray-50 ${!n.is_read ? 'bg-blue-50/70' : ''}`}>
                      <div className="flex items-start gap-3">
                        <span className="text-2xl shrink-0 mt-0.5">{ICON_MAP[n.type] ?? '🔔'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-900 line-clamp-1">{n.title}</p>
                            {!n.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />}
                          </div>
                          {(n.body ?? n.message) && (
                            <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.body ?? n.message}</p>
                          )}
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[10px] text-gray-400">
                              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                              {n.sent_push && <span title="Push sent" className="text-[10px] text-violet-400">📤</span>}
                              <button onClick={e => handleDelete(n.id, e)}
                                className="text-red-400 hover:text-red-600 p-1 rounded transition" aria-label="Delete">
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
          </div>
        </>
      )}
    </div>
  );
}
