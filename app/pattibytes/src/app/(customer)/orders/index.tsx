 
import React, { useCallback, useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { COLORS } from '../../../lib/constants'
import { navigateFromNotification } from '../../../services/notifications'
import {
  registerForPushNotifications,
  addResponseListener,
  canUsePush,
} from '../../../lib/notificationHandler'

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  pending:        '#F59E0B',
  confirmed:      '#3B82F6',
  preparing:      '#8B5CF6',
  ready:          '#10B981',
  assigned:       '#06B6D4',
  pickedup:       '#F97316',
  on_the_way:     '#F97316',
  outfordelivery: '#84CC16',
  delivered:      '#22C55E',
  cancelled:      '#EF4444',
  rejected:       '#EF4444',
}

const STATUS_LABELS: Record<string, string> = {
  pending:        'Pending',
  confirmed:      'Confirmed',
  preparing:      'Preparing',
  ready:          'Ready',
  assigned:       'Driver Assigned',
  pickedup:       'Picked Up',
  on_the_way:     'On the Way',
  outfordelivery: 'Out for Delivery',
  delivered:      'Delivered',
  cancelled:      'Cancelled',
  rejected:       'Rejected',
}

const ACTIVE_STATUSES    = ['pending','confirmed','preparing','ready','assigned','pickedup','on_the_way','outfordelivery']
const COMPLETED_STATUSES = ['delivered']
const CANCELLED_STATUSES = ['cancelled','rejected']
// Statuses where driver tracking makes sense
const TRACKABLE_STATUSES = ['assigned','pickedup','on_the_way','outfordelivery']

// ─── Types ────────────────────────────────────────────────────────────────────
type OrderRow = {
  id: string
  order_number: number
  status: string
  order_type: string | null
  total_amount: number
  subtotal: number
  discount: number
  delivery_fee: number
  items: any[]
  created_at: string
  merchant_id: string | null
  driver_id: string | null           // ✅ needed to show Track button
  payment_method: string
  payment_status: string
  rating: number | null
  review: string | null
  promo_code: string | null
  delivery_distance_km: number | null
  merchant_name?: string
}
 
// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d < 1) return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
}

function isStoreOrder(o: OrderRow): boolean {
  return o.order_type === 'store' || o.merchant_id === null
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function OrdersScreen() {
  const { user } = useAuth()
  const router   = useRouter()

  const [orders,       setOrders]      = useState<OrderRow[]>([])
  const [loading,      setLoading]     = useState(true)
  const [refreshing,   setRefreshing]  = useState(false)
  const [activeTab,    setActiveTab]   = useState<'active' | 'completed' | 'cancelled'>('active')
  const [unreadNotifs, setUnreadNotifs]= useState(0)

  // Track which order IDs already had driver-assigned notification sent
  const notifiedDriverRef = React.useRef<Set<string>>(new Set())

  // ── Load orders ────────────────────────────────────────────────────────────
  const loadOrders = useCallback(async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, order_number, status, order_type, total_amount, subtotal, discount,
          delivery_fee, items, created_at, merchant_id, driver_id, payment_method,
          payment_status, rating, review, promo_code, delivery_distance_km
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error

      const all = (data ?? []) as OrderRow[]

      // Batch load merchant names
      const merchantIds = [...new Set(
        all.filter(o => !isStoreOrder(o) && o.merchant_id).map(o => o.merchant_id!)
      )]
      let mMap = new Map<string, string>()
      if (merchantIds.length) {
        const { data: merch } = await supabase
          .from('merchants').select('id,business_name').in('id', merchantIds)
        mMap = new Map((merch ?? []).map((m: any) => [m.id, m.business_name]))
      }

      const mapped = all.map(o => ({
        ...o,
        merchant_name: isStoreOrder(o)
          ? '🛍️ PBExpress Store'
          : mMap.get(o.merchant_id!) ?? 'Restaurant',
      }))

      // ✅ Send local notification when driver first gets assigned
      for (const order of mapped) {
        if (
          TRACKABLE_STATUSES.includes(order.status) &&
          order.driver_id &&
          !notifiedDriverRef.current.has(order.id)
        ) {
          notifiedDriverRef.current.add(order.id)
        if (canUsePush) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const N = require('expo-notifications')
  await N.scheduleNotificationAsync({
    content: {
      title: '🛵 Driver Assigned!',
      body:  `Your order #${order.order_number} has been picked up. Tap to track live.`,
      data:  { order_id: order.id, type: 'driver' },
      sound: 'default',
    },
    trigger: null,
  })
}
        }
      }

      setOrders(mapped)
    } catch (e: any) {
      console.warn('loadOrders', e.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { loadOrders() }, [loadOrders])

  // ── Real-time ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const sub = supabase.channel('orders-list-rt')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: `customer_id=eq.${user.id}`,
      }, () => loadOrders())
      .subscribe()
    return () => { sub.unsubscribe() }
  }, [user, loadOrders])

  // ── Push token + notification tap ──────────────────────────────────────────
  useEffect(() => {
    if (!user) return
  registerForPushNotifications(user.id)
const sub = addResponseListener(response => {
  navigateFromNotification(response.notification)
})
return () => sub.remove()
  }, [user])

  // ── Unread badge ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const fetch = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('is_read', false)
      setUnreadNotifs(count ?? 0)
    }
    fetch()
    const sub = supabase.channel('notif-badge-rt')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, fetch)
      .subscribe()
    return () => { sub.unsubscribe() }
  }, [user])

  const onRefresh = async () => { setRefreshing(true); await loadOrders(); setRefreshing(false) }

  const filtered = orders.filter(o =>
    activeTab === 'active'    ? ACTIVE_STATUSES.includes(o.status)    :
    activeTab === 'completed' ? COMPLETED_STATUSES.includes(o.status) :
    CANCELLED_STATUSES.includes(o.status)
  )

  const counts = {
    active:    orders.filter(o => ACTIVE_STATUSES.includes(o.status)).length,
    completed: orders.filter(o => COMPLETED_STATUSES.includes(o.status)).length,
    cancelled: orders.filter(o => CANCELLED_STATUSES.includes(o.status)).length,
  }

  // ── Render item ────────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: OrderRow }) => {
    const itemCount   = (item.items ?? []).reduce((s: number, i: any) => s + (i.quantity ?? 1), 0)
    const needsReview = item.status === 'delivered' && !item.rating
    const isStore     = isStoreOrder(item)
    // ✅ Show Track button when driver is assigned and status is trackable
    const canTrack    = TRACKABLE_STATUSES.includes(item.status) && !!item.driver_id

    return (
      <TouchableOpacity
        style={[S.orderCard, isStore && S.orderCardStore]}
        onPress={() => router.push(`/(customer)/orders/${item.id}` as any)}
        activeOpacity={0.85}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={S.orderNum}>#{item.order_number}</Text>
              {isStore && (
                <View style={S.storeBadge}>
                  <Text style={{ color: '#5B21B6', fontSize: 9, fontWeight: '800' }}>STORE</Text>
                </View>
              )}
              {canTrack && (
                <View style={S.liveBadge}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>● LIVE</Text>
                </View>
              )}
            </View>
            <Text style={S.orderTime}>{timeAgo(item.created_at)}</Text>
          </View>
          <View style={[S.statusBadge, { backgroundColor: STATUS_COLORS[item.status] ?? '#888' }]}>
            <Text style={S.statusTxt}>
              {STATUS_LABELS[item.status] ?? item.status.replace(/_/g, ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Source */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <Text style={{ fontSize: 15 }}>{isStore ? '🛍️' : '🏪'}</Text>
          <Text style={S.merchantName}>{item.merchant_name}</Text>
        </View>

        {/* Items preview */}
        <Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 6 }} numberOfLines={1}>
          {(item.items ?? []).slice(0, 3).map((i: any) => i.name).join(', ')}
          {(item.items ?? []).length > 3 ? ` +${(item.items ?? []).length - 3} more` : ''}
        </Text>

        {/* Totals */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={S.itemCountTxt}>
            {itemCount} item{itemCount !== 1 ? 's' : ''}
            {item.delivery_distance_km
              ? `  ·  📏 ${Number(item.delivery_distance_km).toFixed(1)} km`
              : ''}
          </Text>
          <Text style={S.totalTxt}>₹{Number(item.total_amount).toFixed(2)}</Text>
        </View>

        {Number(item.discount) > 0 && (
          <Text style={S.savedTxt}>🎉 Saved ₹{Number(item.discount).toFixed(2)}</Text>
        )}

        {/* Footer */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
            {item.payment_method?.toUpperCase()} · {item.payment_status?.toUpperCase()}
            {item.promo_code ? `  🏷️ ${item.promo_code}` : ''}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* ✅ Track Driver button */}
            {canTrack && (
              <TouchableOpacity
                style={S.trackBtn}
                onPress={() => router.push(`/(customer)/orders/${item.id}` as any)}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>
                  🗺️ Track
                </Text>
              </TouchableOpacity>
            )}
            {needsReview && (
              <View style={S.reviewCta}>
                <Text style={{ fontSize: 11, color: COLORS.primary, fontWeight: '700' }}>⭐ Rate</Text>
              </View>
            )}
            {item.status === 'delivered' && item.rating ? (
              <Text style={{ fontSize: 13 }}>{'⭐'.repeat(item.rating)}</Text>
            ) : null}
            <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 13 }}>View →</Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <Stack.Screen options={{
        title: 'My Orders',
        headerStyle:      { backgroundColor: COLORS.primary },
        headerTintColor:  '#fff',
        headerTitleStyle: { fontWeight: '800' },
        headerRight: () => unreadNotifs > 0 ? (
          <TouchableOpacity
            onPress={() => router.push('/(customer)/notifications' as any)}
            style={{ marginRight: 14 }}
          >
            <Text style={{ fontSize: 22 }}>🔔</Text>
            <View style={S.notifBadge}>
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>
                {unreadNotifs > 9 ? '9+' : unreadNotifs}
              </Text>
            </View>
          </TouchableOpacity>
        ) : null,
      }} />

      {/* Tabs */}
      <View style={S.tabRow}>
        {([
          { key: 'active',    label: 'Active',    count: counts.active },
          { key: 'completed', label: 'Done',      count: counts.completed },
          { key: 'cancelled', label: 'Cancelled', count: counts.cancelled },
        ] as const).map(t => (
          <TouchableOpacity
            key={t.key}
            style={[S.tab, activeTab === t.key && S.tabActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Text style={[S.tabTxt, activeTab === t.key && S.tabTxtActive]}>{t.label}</Text>
            {t.count > 0 && (
              <View style={[S.tabBadge, activeTab === t.key && { backgroundColor: COLORS.primary }]}>
                <Text style={{ color: activeTab === t.key ? '#fff' : '#6B7280', fontSize: 10, fontWeight: '800' }}>
                  {t.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 56 }}>
              <Text style={{ fontSize: 52, marginBottom: 14 }}>
                {activeTab === 'active' ? '📦' : activeTab === 'completed' ? '✅' : '❌'}
              </Text>
              <Text style={{ fontWeight: '800', fontSize: 18, color: COLORS.text, marginBottom: 6 }}>
                No {activeTab} orders
              </Text>
              <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginBottom: 20 }}>
                {activeTab === 'active'
                  ? 'Your active orders will appear here'
                  : activeTab === 'completed'
                    ? 'Delivered orders will appear here'
                    : 'Cancelled orders will appear here'}
              </Text>
              {activeTab === 'active' && (
                <TouchableOpacity
                  style={S.shopBtn}
                  onPress={() => router.push('/(customer)/dashboard' as any)}
                >
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Order Now</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  )
}

const S = StyleSheet.create({
  tabRow:        { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tab:           { flex: 1, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 5 },
  tabActive:     { borderBottomWidth: 2.5, borderBottomColor: COLORS.primary },
  tabTxt:        { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  tabTxtActive:  { color: COLORS.primary, fontWeight: '800' },
  tabBadge:      { backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  orderCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  orderCardStore: { borderLeftWidth: 3, borderLeftColor: '#7C3AED' },
  storeBadge:    { backgroundColor: '#EDE9FE', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  // ✅ Green "● LIVE" badge
  liveBadge:     { backgroundColor: '#16A34A', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  orderNum:      { fontSize: 16, fontWeight: '800', color: COLORS.text },
  orderTime:     { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  statusBadge:   { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  statusTxt:     { color: '#fff', fontSize: 10, fontWeight: '800' },
  merchantName:  { fontSize: 14, color: '#4B5563', fontWeight: '700' },
  itemCountTxt:  { fontSize: 12, color: '#9CA3AF' },
  totalTxt:      { fontSize: 16, fontWeight: '900', color: COLORS.primary },
  savedTxt:      { fontSize: 12, color: '#16A34A', fontWeight: '600', marginTop: 3 },
  reviewCta:     { backgroundColor: '#FFF7F0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#FED7AA' },
  // ✅ Track button
  trackBtn: {
    backgroundColor: '#16A34A', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
    flexDirection: 'row', alignItems: 'center',
  },
  shopBtn:       { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
  notifBadge:    { position: 'absolute', top: -4, right: -6, backgroundColor: '#EF4444', borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1, minWidth: 16, alignItems: 'center' },
})
