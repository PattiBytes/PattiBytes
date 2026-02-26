// src/services/notifications.ts
import { supabase } from '../lib/supabase'
import { router } from 'expo-router'

// ─── Types ────────────────────────────────────────────────────────────────────
export type NotifType =
  | 'order' | 'store_order' | 'driver'
  | 'promo' | 'announcement' | 'review' | 'general'

export type NotifRow = {
  id: string
  user_id: string
  title: string
  message: string
  body?: string | null
  type: NotifType
  data: Record<string, any>
  is_read: boolean
  created_at: string
  read_at: string | null
}

export { registerForPushNotifications as registerPushToken } from '../lib/notificationHandler'

// ─── Navigate from notification ───────────────────────────────────────────────
export function navigateFromNotification(notif: NotifRow | any) {
  let data: Record<string, any> = {}
  let type: NotifType = 'general'

  if ('request' in notif) {
    data = (notif.request.content.data ?? {}) as Record<string, any>
    type = (data.type ?? 'general') as NotifType
  } else {
    data = notif.data ?? {}
    type = notif.type ?? 'general'
  }

  const orderId = data.order_id as string | undefined

  switch (type) {
    case 'order':
    case 'store_order':
    case 'driver':
    case 'review':
      router.push(orderId
        ? `/(customer)/orders/${orderId}` as any
        : '/(customer)/orders' as any)
      break
    case 'promo':
      router.push(data.merchant_id
        ? `/(customer)/restaurant/${data.merchant_id}` as any
        : '/(customer)/dashboard' as any)
      break
    case 'announcement':
    default:
      router.push('/(customer)/dashboard' as any)
  }
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────
export async function markNotificationRead(notifId: string): Promise<void> {
  await supabase.from('notifications').update({
    is_read: true,
    read_at: new Date().toISOString(),
  }).eq('id', notifId)
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await supabase.from('notifications').update({
    is_read: true,
    read_at: new Date().toISOString(),
  }).eq('user_id', userId).eq('is_read', false)
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)
  return count ?? 0
}

export async function sendNotificationToUser(payload: {
  user_id: string
  title: string
  message: string
  type: NotifType
  data?: Record<string, any>
}): Promise<void> {
  await supabase.from('notifications').insert({
    user_id:    payload.user_id,
    title:      payload.title,
    message:    payload.message,
    body:       payload.message,
    type:       payload.type,
    data:       payload.data ?? {},
    is_read:    false,
    created_at: new Date().toISOString(),
  })
}

export function getNotifIcon(type: NotifType): string {
  switch (type) {
    case 'order':        return '📦'
    case 'store_order':  return '🛍️'
    case 'driver':       return '🛵'
    case 'promo':        return '🏷️'
    case 'announcement': return '📢'
    case 'review':       return '⭐'
    default:             return '🔔'
  }
}
