/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Bell, X, Trash2, CheckCheck, BellRing, BellOff } from 'lucide-react';
import { toast } from 'react-toastify';
import { formatDistanceToNow } from 'date-fns';
import { getPushPermission, requestPushPermission } from '@/lib/onesignal';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Constants (module-level — never recreated)
// ─────────────────────────────────────────────────────────────────────────────

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
  approval:          '👤',
  refund:            '↩️',
  review:            '⭐',
};

// Keys must match what /api/notify stores in notifData.sound
// Files must exist under /public/sounds/
const SOUND_MAP: Record<string, string> = {
  order:   '/sounds/order.mp3',     // new_order → 'order' key
  success: '/sounds/success.mp3',   // delivered, payment
  notify:  '/sounds/notify.mp3',    // everything else
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function NotificationBell() {
  const { user, loading: authLoading } = useAuth();

  const [notifications, setNotifications]   = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount]       = useState(0);
  const [showDropdown, setShowDropdown]     = useState(false);
  const [loading, setLoading]               = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [requestingPush, setRequestingPush] = useState(false);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const toastedIds   = useRef<Set<string>>(new Set());
  const loadedUidRef = useRef<string | null>(null);   // last completed load uid
  const loadingRef   = useRef(false);                  // prevents concurrent fetches
  const primedRef    = useRef(false);                  // autoplay policy: primed?

  // ✅ One Audio instance per sound key — created once, reused on every play
  const audioCache = useRef<Record<string, HTMLAudioElement>>({});

  // ─────────────────────────────────────────────────────────────────────────
  // Audio helpers
  // ─────────────────────────────────────────────────────────────────────────

  // Pre-load all sound files once on mount so they play instantly
  useEffect(() => {
    if (typeof window === 'undefined') return;
    Object.entries(SOUND_MAP).forEach(([key, src]) => {
      const audio = new Audio(src);
      audio.volume = 0.6;
      audio.preload = 'auto';
      audio.load();
      audioCache.current[key] = audio;
    });
  }, []);

  // Play a sound by its SOUND_MAP key
  // Falls back to 'notify' if the key is missing
  const playSound = useCallback((soundKey: string) => {
    const key   = audioCache.current[soundKey] ? soundKey : 'notify';
    const audio = audioCache.current[key];
    if (!audio) return;

    // Reset to start if still playing from a previous notification
    audio.pause();
    audio.currentTime = 0;
    audio.play().catch(err => {
      // DOMException: play() failed — user hasn't interacted yet
      // Will be unblocked after first bell click (see primedRef below)
      console.warn('[NotificationBell] audio blocked:', err.message);
    });
  }, []);

  // Prime on first bell click — satisfies browser autoplay policy
  // A silent play+pause counts as user-gesture interaction
  const primeAudio = useCallback(() => {
    if (primedRef.current || typeof window === 'undefined') return;
    const audio = audioCache.current['notify'];
    if (!audio) return;
    audio.play()
      .then(() => { audio.pause(); audio.currentTime = 0; primedRef.current = true; })
      .catch(() => {});
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Push permission
  // ─────────────────────────────────────────────────────────────────────────

  const canUseBrowserNotifications = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return 'Notification' in window;
  }, []);

  useEffect(() => {
    if (!canUseBrowserNotifications) return;
    getPushPermission().then(setPushPermission);
  }, [canUseBrowserNotifications]);

  // ─────────────────────────────────────────────────────────────────────────
  // Data loader
  // ─────────────────────────────────────────────────────────────────────────

 const loadNotifications = useCallback(async (uid: string, force = false) => {
  if (!force && loadedUidRef.current === uid) return;
  if (loadingRef.current) return;

  loadingRef.current = true;
  setLoading(true);

  // ✅ Mounted guard — prevents setState after unmount
  let mounted = true;

  try {
    const { data: sessionResult } = await supabase.auth.getSession();

    if (!mounted) return;

    if (!sessionResult?.session) {
      console.warn('[NotificationBell] No session — retrying in 2s');
      setTimeout(() => {
        if (!mounted) return;
        loadingRef.current = false;
        loadNotifications(uid, true);
      }, 2000);
      return;
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!mounted) return;

    // ✅ Silently ignore AbortError — caused by unmount / StrictMode cleanup
    if (error) {
      if (error.message?.includes('AbortError') || error.code === '20') {
        console.log('[NotificationBell] query aborted (unmount) — ignored');
        return;
      }
      console.error('[NotificationBell] load error:', error.message);
      loadingRef.current = false;
      return;
    }

    const rows = (data as NotificationRow[]) ?? [];
    setNotifications(rows);
    setUnreadCount(rows.filter(n => !n.is_read).length);
    loadedUidRef.current = uid;
    console.log('[NotificationBell] loaded:', rows.length);
  } catch (e: any) {
    // ✅ AbortError from Supabase JS client — not a real error
    if (e?.name === 'AbortError') {
      console.log('[NotificationBell] fetch aborted (unmount) — ignored');
      return;
    }
    console.error('[NotificationBell] unexpected error:', e?.message ?? e);
  } finally {
    if (mounted) {
      setLoading(false);
      loadingRef.current = false;
    }
  }

  // Return cleanup — called when uid changes or component unmounts
   
  return () => { mounted = false; };
}, []);

  // ✅ Reset refs when user changes — prevents stale loads
useEffect(() => {
  return () => {
    loadedUidRef.current = null;
    loadingRef.current   = false;
  };
}, [user?.id]);

  // ─────────────────────────────────────────────────────────────────────────
  // Realtime subscription
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (authLoading || !user?.id) return;
    const uid = user.id;

    void loadNotifications(uid);

    const channel = supabase
      .channel(`notif-bell:${uid}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` },
        (payload) => {
          const n = payload.new as NotificationRow;
          console.log('[NotificationBell] INSERT:', n.type, n.title);

          // Deduplicate
          setNotifications(prev => {
            if (prev.some(x => x.id === n.id)) return prev;
            return [n, ...prev].slice(0, 50);
          });
          setUnreadCount(c => c + 1);

          // ✅ Sound — /api/notify stores the sound key in n.data.sound
          // e.g. new_order → 'order', delivered → 'success', rest → 'notify'
          const soundKey = (n.data as any)?.sound ?? 'notify';
          playSound(soundKey);

          // Toast
          if (!toastedIds.current.has(n.id)) {
            toastedIds.current.add(n.id);
            toast.info(
              <div className="flex items-start gap-2">
                <span className="text-xl shrink-0">{ICON_MAP[n.type] ?? '🔔'}</span>
                <div className="min-w-0">
                  <p className="font-bold text-sm leading-tight">{n.title}</p>
                  {(n.body ?? n.message) && (
                    <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                      {n.body ?? n.message}
                    </p>
                  )}
                </div>
              </div>,
              { position: 'top-right', autoClose: 6000 }
            );
          }

          // Native browser notification (tab in background)
          if (
            canUseBrowserNotifications &&
            Notification.permission === 'granted' &&
            document.visibilityState !== 'visible'
          ) {
            try {
              new Notification(n.title, {
                body:  n.body ?? n.message ?? '',
                icon:  '/icon-192.png',
                badge: '/icon-192.png',
                tag:   n.id,
              });
            } catch { /* SW handles it */ }
          }
        },
      )
      .subscribe((status, err) => {
        console.log(`[NotificationBell] channel: ${status}`, err ?? '');
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          loadedUidRef.current = null;
          void loadNotifications(uid, true);
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, authLoading, loadNotifications, canUseBrowserNotifications, playSound]);

  // ─────────────────────────────────────────────────────────────────────────
  // Page title badge
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    document.title = !showDropdown && unreadCount > 0
      ? `(${unreadCount}) PattiBytes Express`
      : 'PattiBytes Express';
  }, [showDropdown, unreadCount]);

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return;
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
      setPushPermission(granted ? 'granted' : 'denied');
      if (granted) toast.success('🔔 Push notifications enabled!');
      else         toast.warn('Push blocked — enable in browser Settings');
    } finally {
      setRequestingPush(false);
    }
  };

  if (!user) return null;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="relative">
      {/* Bell button — primes audio on first click */}
      <button
        onClick={() => {
          primeAudio();                        // ✅ satisfies browser autoplay policy
          setShowDropdown(v => !v);
        }}
        className="relative p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
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
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />

          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 max-h-[80vh] overflow-hidden flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-white sticky top-0 z-10">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
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

            {/* Push permission banners */}
            {canUseBrowserNotifications && pushPermission === 'default' && (
              <div className="bg-violet-50 border-b border-violet-100 px-3 py-2.5 flex items-center gap-2.5">
                <BellRing className="w-4 h-4 text-violet-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-violet-900">Enable push notifications</p>
                  <p className="text-xs text-violet-700">Get updates even when tab is closed</p>
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
                  <p className="text-sm">Loading…</p>
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
                                aria-label="Delete notification"
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
