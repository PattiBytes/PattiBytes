/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native'
import { Stack, useRouter } from 'expo-router'
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import { supabase }                    from '../../../lib/supabase'
import { useAuth }                     from '../../../contexts/AuthContext'
import { COLORS }                      from '../../../lib/constants'
import { navigateFromNotification }    from '../../../services/notifications'
import ReviewsTab                      from '../../../components/orders/ReviewsTab'
import OrderCard                       from '../../../components/orders/OrderCard'
import CustomOrderCard                 from '../../../components/orders/CustomOrderCard'
import { AppStatusBar } from '../../../components/ui/AppStatusBar'
import {
  registerForPushNotifications,
  addResponseListener,
  canUsePush,
} from '../../../lib/notificationHandler'
import {
  ACTIVE_STATUSES, COMPLETED_STATUSES, CANCELLED_STATUSES,
  TRACKABLE_STATUSES,
} from '../../../components/orders/constants'
import type { OrderRow } from '../../../components/orders/types'
import { ScreenLoader } from '../../../components/ui/ScreenLoader';

// ── Types ─────────────────────────────────────────────────────────────────────
type TabKey = 'active' | 'completed' | 'cancelled' | 'reviews'

// ── Helpers ───────────────────────────────────────────────────────────────────
function isCustomOrder(o: OrderRow) { return o.order_type === 'custom' }
function isStoreOrder(o: OrderRow)  { return o.order_type === 'store' || o.merchant_id === null }

// ── Tabs config (stable outside component) ────────────────────────────────────
const TABS: { key: TabKey; label: string; emoji: string }[] = [
  { key: 'active',    label: 'Active',    emoji: '🔄' },
  { key: 'completed', label: 'Done',      emoji: '✅' },
  { key: 'cancelled', label: 'Cancelled', emoji: '❌' },
  { key: 'reviews',   label: 'Reviews',   emoji: '⭐' },
]

// ── Main ──────────────────────────────────────────────────────────────────────
export default function OrdersScreen() {
  const { user } = useAuth()
  const router   = useRouter()

  const [orders,       setOrders]       = useState<OrderRow[]>([])
  const [loading,      setLoading]      = useState(true)
  const [refreshing,   setRefreshing]   = useState(false)
  const [activeTab,    setActiveTab]    = useState<TabKey>('active')
  const [unreadNotifs, setUnreadNotifs] = useState(0)
  const notifiedDriverRef = useRef<Set<string>>(new Set())

  // ── Load orders ─────────────────────────────────────────────────────────────
  const loadOrders = useCallback(async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, order_number, status, order_type, platform_handled,
          total_amount, subtotal, discount, delivery_fee,
          items, created_at, merchant_id, driver_id,
          payment_method, payment_status,
          rating, review, promo_code, delivery_distance_km,
          custom_order_ref, custom_order_status,
          custom_category, quoted_amount, quote_message
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(150)

      if (error) throw error
      const all = (data ?? []) as OrderRow[]

      // Batch-load merchant names (restaurant orders only)
      const merchantIds = [...new Set(
        all
          .filter(o => !isStoreOrder(o) && !isCustomOrder(o) && o.merchant_id)
          .map(o => o.merchant_id!),
      )]
      let mMap = new Map<string, string>()
      if (merchantIds.length) {
        const { data: merch } = await supabase
          .from('merchants')
          .select('id,businessname:business_name')
          .in('id', merchantIds)
        mMap = new Map((merch ?? []).map((m: any) => [m.id, m.businessname]))
      }

      const mapped = all.map(o => ({
        ...o,
        merchant_name: isCustomOrder(o)
          ? 'PBExpress Custom'
          : isStoreOrder(o)
            ? 'PBExpress Store'
            : mMap.get(o.merchant_id!) ?? 'Restaurant',
      }))

      // Driver-assigned push notification
      for (const order of mapped) {
        if (
          TRACKABLE_STATUSES.includes(order.status) &&
          order.driver_id &&
          !notifiedDriverRef.current.has(order.id) &&
          canUsePush
        ) {
          notifiedDriverRef.current.add(order.id)
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const N = require('expo-notifications')
            await N.scheduleNotificationAsync({
              content: {
                title: '🛵 Driver Assigned!',
                body:  `Your order #${order.order_number} is on the way!`,
                data:  { order_id: order.id, type: 'driver' },
                sound: 'default',
              },
              trigger: null,
            })
          } catch { /* silently skip */ }
        }
      }

      setOrders(mapped)
    } catch (e: any) {
      console.warn('[OrdersScreen]', e?.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { loadOrders() }, [loadOrders])

  // ── Real-time orders ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const sub = supabase
      .channel('orders-list-rt')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: `customer_id=eq.${user.id}`,
      }, loadOrders)
      .subscribe()
    return () => { sub.unsubscribe() }
  }, [user, loadOrders])

  // ── Push registration ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    registerForPushNotifications(user.id)
    const sub = addResponseListener(r => navigateFromNotification(r.notification))
    return () => sub.remove()
  }, [user])

  // ── Notification badge ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      setUnreadNotifs(count ?? 0)
    }
    fetchUnread()
    const sub = supabase
      .channel('notif-badge-rt')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, fetchUnread)
      .subscribe()
    return () => { sub.unsubscribe() }
  }, [user])

  const onRefresh = async () => {
    setRefreshing(true)
    await loadOrders()
    setRefreshing(false)
  }

  // ── Derived tab data ────────────────────────────────────────────────────────
  const activeOrders    = orders.filter(o => ACTIVE_STATUSES.includes(o.status))
  const completedOrders = orders.filter(o => COMPLETED_STATUSES.includes(o.status))
  const cancelledOrders = orders.filter(o => CANCELLED_STATUSES.includes(o.status))
  const needsReview     = completedOrders.filter(o => !o.rating)

  const counts: Record<TabKey, number> = {
    active:    activeOrders.length,
    completed: completedOrders.length,
    cancelled: cancelledOrders.length,
    reviews:   needsReview.length,
  }

  const filteredOrders =
    activeTab === 'active'     ? activeOrders
    : activeTab === 'completed' ? completedOrders
    : cancelledOrders

  // ── Render item ─────────────────────────────────────────────────────────────
  // Custom orders → CustomOrderCard (rich card with categories, quote banner)
  // All others    → OrderCard (restaurant / store card)
  const renderItem = useCallback(({ item }: { item: OrderRow }) => {
    if (isCustomOrder(item)) {
      return (
        <CustomOrderCard
          item={item}
          onPress={() => router.push(`/(customer)/orders/${item.id}` as any)}
        />
      )
    }
    return (
      <OrderCard
        order={item}
        onPress={() => router.push(`/(customer)/orders/${item.id}` as any)}
        onTrack={
          TRACKABLE_STATUSES.includes(item.status) && item.driver_id
            ? () => router.push(`/(customer)/orders/${item.id}` as any)
            : undefined
        }
        onRate={
          item.status === 'delivered' && !item.rating
            ? () => router.push(`/(customer)/orders/${item.id}` as any)
            : undefined
        }
      />
    )
  }, [router])

  // ── Empty state ─────────────────────────────────────────────────────────────
  const EmptyState = () => {
    const cfg: Record<TabKey, { emoji: string; title: string; sub: string; cta: boolean }> = {
      active:    { emoji: '🛵', title: 'No active orders',    sub: 'Your active orders will appear here',     cta: true  },
      completed: { emoji: '✅', title: 'No completed orders', sub: 'Delivered orders will appear here',       cta: false },
      cancelled: { emoji: '❌', title: 'No cancelled orders', sub: 'Cancelled orders will appear here',       cta: false },
      reviews:   { emoji: '⭐', title: 'All caught up!',      sub: "You've reviewed all your recent orders.", cta: false },
    }
    const { emoji, title, sub, cta } = cfg[activeTab]
    return (
      <View style={S.emptyWrap}>
        <Text style={{ fontSize: 52, marginBottom: 14 }}>{emoji}</Text>
        <Text style={S.emptyTitle}>{title}</Text>
        <Text style={S.emptySub}>{sub}</Text>
        {cta && (
          <TouchableOpacity
            style={S.shopBtn}
            onPress={() => router.push('/(customer)/dashboard' as any)}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Order Now</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────
 return (
  <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
    {/* Status bar matches the Stack header color */}
    <AppStatusBar backgroundColor={COLORS.primary} style="light" />
    <Stack.Screen
      options={{
        title:            'My Orders',
        headerStyle:      { backgroundColor: COLORS.primary },
        headerTintColor:  '#fff',
          headerTitleStyle: { fontWeight: '800' },
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/(customer)/notifications' as any)}
              style={{ marginRight: 14 }}
            >
              <Text style={{ fontSize: 22 }}>🔔</Text>
              {unreadNotifs > 0 && (
                <View style={S.notifBadge}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>
                    {unreadNotifs > 9 ? '9+' : unreadNotifs}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ),
        }}
      />

      {/* ── Tab Bar ── */}
      <View style={S.tabRow}>
        {TABS.map(t => {
          const isActive   = activeTab === t.key
          const isReview   = t.key === 'reviews'
          const badgeCount = counts[t.key]
          return (
            <TouchableOpacity
              key={t.key}
              style={[
                S.tab,
                isActive && S.tabActive,
                isActive && isReview && { borderBottomColor: '#F97316' },
              ]}
              onPress={() => setActiveTab(t.key)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 12 }}>{t.emoji}</Text>
              <Text style={[
                S.tabTxt,
                isActive && S.tabTxtActive,
                isActive && isReview && { color: '#F97316' },
              ]}>
                {t.label}
              </Text>
              {badgeCount > 0 && (
                <View style={[
                  S.tabBadge,
                  isActive
                    ? { backgroundColor: isReview ? '#F97316' : COLORS.primary }
                    : undefined,
                  !isActive && isReview
                    ? { backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA' }
                    : undefined,
                ]}>
                  <Text style={{
                    color: isActive ? '#fff' : isReview ? '#F97316' : '#6B7280',
                    fontSize: 10, fontWeight: '800',
                  }}>
                    {badgeCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      {/* ── Pending reviews banner ── */}
      {activeTab === 'reviews' && needsReview.length > 0 && (
        <View style={S.reviewBanner}>
          <Text style={{ fontSize: 16 }}>⭐</Text>
          <Text style={{ flex: 1, fontSize: 13, color: '#92400E', fontWeight: '700', marginLeft: 8 }}>
            {needsReview.length} order{needsReview.length !== 1 ? 's' : ''} waiting for your review
          </Text>
        </View>
      )}

      {/* ── Content ── */}
     {loading ? (
  <ScreenLoader variant="orders" />
) : activeTab === 'reviews' ? (
        <ReviewsTab
          userId={user!.id}
          deliveredOrders={completedOrders}
          onRefresh={loadOrders}
        />
      ) : (
        <FlatList
    data={filteredOrders}
    keyExtractor={item => item.id}
    renderItem={renderItem}
    initialNumToRender={8}
    maxToRenderPerBatch={8}
    windowSize={5}
    updateCellsBatchingPeriod={50}
    removeClippedSubviews={true}
          contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={<EmptyState />}
        />
      )}
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  // Tab bar
  tabRow:       { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tab:          { flex: 1, paddingVertical: 11, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 },
  tabActive:    { borderBottomWidth: 2.5, borderBottomColor: COLORS.primary },
  tabTxt:       { fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
  tabTxtActive: { color: COLORS.primary, fontWeight: '800' },
  tabBadge:     { backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1, minWidth: 16, alignItems: 'center' },

  reviewBanner: { backgroundColor: '#FFFBEB', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#FDE68A' },

  // Empty state
  emptyWrap:  { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 30 },
  emptyTitle: { fontWeight: '800', fontSize: 18, color: '#1F2937', marginBottom: 6, textAlign: 'center' },
  emptySub:   { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginBottom: 20 },
  shopBtn:    { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },

  // Notification badge
  notifBadge: { position: 'absolute', top: -4, right: -6, backgroundColor: '#EF4444', borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1, minWidth: 16, alignItems: 'center' },
})
