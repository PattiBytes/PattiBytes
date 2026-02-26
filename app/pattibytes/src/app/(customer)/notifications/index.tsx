import React, { useCallback, useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { COLORS } from '../../../lib/constants'

type Notification = {
  id: string; title: string; body: string | null; type: string | null
  is_read: boolean; created_at: string; data: any
  order_id: string | null
}

const TYPE_CONFIG: Record<string, { emoji: string; color: string }> = {
  order_confirmed:   { emoji: '✅', color: '#3B82F6' },
  order_preparing:   { emoji: '👨‍🍳', color: '#8B5CF6' },
  order_ready:       { emoji: '📦', color: '#10B981' },
  order_assigned:    { emoji: '🛵', color: '#06B6D4' },
  order_delivered:   { emoji: '🎉', color: '#22C55E' },
  order_cancelled:   { emoji: '❌', color: '#EF4444' },
  promo:             { emoji: '🏷️', color: '#F59E0B' },
  announcement:      { emoji: '📢', color: '#6366F1' },
  default:           { emoji: '🔔', color: '#9CA3AF' },
}

export default function NotificationsScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [marking, setMarking] = useState(false)

  const loadNotifications = useCallback(async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id,title,body,type,is_read,created_at,data,order_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(60)
      if (error) throw error
      setNotifications((data ?? []) as Notification[])
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { loadNotifications() }, [loadNotifications])

  // Real-time new notifications
  useEffect(() => {
    if (!user) return
    const sub = supabase.channel('notifs')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'notifications', filter: `user_id=eq.${user.id}`,
      }, payload => {
        setNotifications(prev => [payload.new as Notification, ...prev])
      })
      .subscribe()
    return () => { sub.unsubscribe() }
  }, [user])

  const onRefresh = async () => {
    setRefreshing(true); await loadNotifications(); setRefreshing(false)
  }

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  }

  const markAllRead = async () => {
    if (!user) return
    setMarking(true)
    await supabase.from('notifications').update({ is_read: true })
      .eq('user_id', user.id).eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setMarking(false)
  }

  const handleTap = async (notif: Notification) => {
    if (!notif.is_read) await markAsRead(notif.id)
    if (notif.order_id) {
      router.push(`/(customer)/orders/${notif.order_id}` as any)
    } else if (notif.data?.merchant_id) {
      router.push(`/(customer)/restaurant/${notif.data.merchant_id}` as any)
    }
  }

  const deleteNotif = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  const renderItem = ({ item }: { item: Notification }) => {
    const cfg = TYPE_CONFIG[item.type ?? 'default'] ?? TYPE_CONFIG.default
    const timeAgo = (d: string) => {
      const diff = Date.now() - new Date(d).getTime()
      if (diff < 60000) return 'Just now'
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
      return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    }

    return (
      <TouchableOpacity
        style={[S.notifCard, !item.is_read && S.notifUnread]}
        onPress={() => handleTap(item)}
        onLongPress={() => Alert.alert('Delete', 'Remove this notification?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => deleteNotif(item.id) },
        ])}
        activeOpacity={0.75}
      >
        <View style={[S.notifIcon, { backgroundColor: cfg.color + '20' }]}>
          <Text style={{ fontSize: 22 }}>{cfg.emoji}</Text>
          {!item.is_read && <View style={S.unreadDot} />}
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text style={[S.notifTitle, !item.is_read && { fontWeight: '900' }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={S.notifTime}>{timeAgo(item.created_at)}</Text>
          </View>
          {item.body ? (
            <Text style={S.notifBody} numberOfLines={2}>{item.body}</Text>
          ) : null}
          {item.order_id && (
            <Text style={{ fontSize: 11, color: COLORS.primary, fontWeight: '600', marginTop: 4 }}>
              Tap to view order →
            </Text>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <Stack.Screen options={{
        title: '🔔 Notifications',
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
        headerRight: () =>
          unreadCount > 0 ? (
            <TouchableOpacity onPress={markAllRead} style={{ marginRight: 14 }} disabled={marking}>
              {marking
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Mark all read</Text>
              }
            </TouchableOpacity>
          ) : null,
      }} />

      {unreadCount > 0 && (
        <View style={S.unreadBanner}>
          <Text style={S.unreadBannerTxt}>{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Text style={{ fontSize: 56, marginBottom: 14 }}>🔔</Text>
              <Text style={{ fontWeight: '800', fontSize: 18, color: COLORS.text }}>No notifications yet</Text>
              <Text style={{ color: COLORS.textLight, fontSize: 13, marginTop: 6, textAlign: 'center' }}>
                Order updates and offers will appear here
              </Text>
            </View>
          }
        />
      )}
    </View>
  )
}

const S = StyleSheet.create({
  unreadBanner: { backgroundColor: COLORS.primary + '15', padding: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.primary + '30' },
  unreadBannerTxt: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  notifCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'flex-start',
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  notifUnread: { backgroundColor: '#FEFCE8', borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  notifIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 },
  unreadDot: { position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#fff' },
  notifTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, flex: 1, marginRight: 8 },
  notifTime: { fontSize: 11, color: COLORS.textLight, flexShrink: 0 },
  notifBody: { fontSize: 12, color: '#6B7280', marginTop: 3, lineHeight: 18 },
})
