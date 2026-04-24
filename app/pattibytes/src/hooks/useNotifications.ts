import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter }  from 'expo-router'
import { useAuth }    from '../contexts/AuthContext'
import { supabase }   from '../lib/supabase'
import {
  addReceivedListener,
  addResponseListener,
  notifyUser,
} from '../lib/notificationHandler'

export type AppNotification = {
  id:         string
  user_id:    string
  title:      string | null
  message:    string | null
  body:       string | null
  type:       string | null
  data:       any
  is_read:    boolean
  created_at: string
  read_at:    string | null
  sent_push:  boolean
}

export function useNotifications() {
  const { user }  = useAuth()
  const router    = useRouter()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount,   setUnreadCount]   = useState(0)
  const [loading,       setLoading]       = useState(true)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  // Tracks notification IDs where push failed so we can retry
  const retryQueueRef = useRef<Set<string>>(new Set())

  // ── Load notifications ────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!user?.id) return
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      const rows = (data ?? []) as AppNotification[]
      setNotifications(rows)
      setUnreadCount(rows.filter(n => !n.is_read).length)

      // Collect any rows where push was never sent (sent_push = false)
      rows
        .filter(n => !n.sent_push && !n.is_read)
        .forEach(n => retryQueueRef.current.add(n.id))
    } catch (e: any) {
      console.error('[notifications] load error:', e?.message)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  // ── Retry unsent pushes (runs once after initial load) ───────────────────
  const retryUnsentPushes = useCallback(async () => {
    if (!user?.id || retryQueueRef.current.size === 0) return

    const ids = [...retryQueueRef.current]
    retryQueueRef.current.clear()

    // Fetch the full rows for these IDs
    const { data: rows } = await supabase
      .from('notifications')
      .select('id, title, body, message, data, type')
      .in('id', ids)
      .eq('user_id', user.id)
      .eq('sent_push', false)

    if (!rows?.length) return

    for (const row of rows as AppNotification[]) {
      try {
        await notifyUser(
          user.id,
          row.title  ?? 'PB Express',
          row.body   ?? row.message ?? '',
          { ...(row.data ?? {}), notificationId: row.id },
          { notificationId: row.id, channelId: 'orders' },
        )
      } catch (e: any) {
        console.warn('[notifications] retry push failed:', row.id, e?.message)
      }
    }
  }, [user?.id])

  // ── Main effect ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return

    load().then(() => retryUnsentPushes())

    // Realtime: INSERT
    channelRef.current = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as AppNotification
          setNotifications(prev => [n, ...prev])
          setUnreadCount(c => c + 1)

          // If the new row has sent_push: false, fire the push now from client side
          // This covers the case where server-side push dispatch failed
         
        },
      )
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as AppNotification
          setNotifications(prev => {
            const next = prev.map(n => n.id === updated.id ? updated : n)
            setUnreadCount(next.filter(n => !n.is_read).length)
            return next
          })
        },
      )
      .subscribe()

    // Foreground push received → refresh
    const recSub = addReceivedListener(() => load())

    // Notification tapped → navigate
    const resSub = addResponseListener((response) => {
      const data = response?.notification?.request?.content?.data as any
      if (!data) return

      // Mark as read
      if (data.notificationId) void markAsRead(data.notificationId)

      // Navigate based on type
      const orderId = data.orderId ?? data.order_id
      if (data.type === 'new_order' || data.type === 'order_update' || data.type === 'order' || orderId) {
        if (orderId) router.push(`/(customer)/orders/${orderId}` as any)
        return
      }
      if (data.type === 'announcement' && data.link_url) {
        // optionally open URL
        return
      }
    })

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      recSub.remove()
      resSub.remove()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // ── Mark as read ──────────────────────────────────────────────────────────
  const markAsRead = useCallback(async (notifId: string) => {
    const now = new Date().toISOString()
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: now })
      .eq('id', notifId)
    setNotifications(prev =>
      prev.map(n => n.id === notifId ? { ...n, is_read: true, read_at: now } : n),
    )
    setUnreadCount(c => Math.max(0, c - 1))
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return
    const now = new Date().toISOString()
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: now })
      .eq('user_id', user.id)
      .eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: now })))
    setUnreadCount(0)
  }, [user?.id])

  // ── Delete a single notification ──────────────────────────────────────────
  const deleteNotification = useCallback(async (notifId: string) => {
    await supabase.from('notifications').delete().eq('id', notifId)
    setNotifications(prev => {
      const next = prev.filter(n => n.id !== notifId)
      setUnreadCount(next.filter(n => !n.is_read).length)
      return next
    })
  }, [])

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: load,
  }
}