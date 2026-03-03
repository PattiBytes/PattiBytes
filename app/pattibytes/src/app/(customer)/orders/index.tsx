/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native'
import { Stack, useRouter } from 'expo-router'
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { COLORS } from '../../../lib/constants'
import { navigateFromNotification } from '../../../services/notifications'
import ReviewsTab from '../../../components/orders/ReviewsTab'
import {
  registerForPushNotifications,
  addResponseListener,
  canUsePush,
} from '../../../lib/notificationHandler'
import {
  ACTIVE_STATUSES, COMPLETED_STATUSES, CANCELLED_STATUSES,
  TRACKABLE_STATUSES, STATUS_COLORS, STATUS_LABELS,
} from '../../../components/orders/constants'
import type { OrderRow } from '../../../components/orders/types'

// ── Types ─────────────────────────────────────────────────────────────────────
type TabKey = 'active' | 'completed' | 'cancelled' | 'reviews'

// ── Helpers ───────────────────────────────────────────────────────────────────
function isStoreOrder(o: OrderRow)  { return o.order_type === 'store'  || o.merchant_id === null }
function isCustomOrder(o: OrderRow) { return o.order_type === 'custom' }

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (d < 1) return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
}

// ── Tabs config (stable reference outside component) ─────────────────────────
const TABS: { key: TabKey; label: string; emoji: string }[] = [
  { key: 'active',    label: 'Active',    emoji: '🔄' },
  { key: 'completed', label: 'Done',      emoji: '✅' },
  { key: 'cancelled', label: 'Cancelled', emoji: '❌' },
  { key: 'reviews',   label: 'Reviews',   emoji: '⭐' },
]

// ── Main ──────────────────────────────────────────────────────────────────────
export default function OrdersScreen() {
  const { user }  = useAuth()
  const router    = useRouter()

  const [orders,       setOrders]       = useState<OrderRow[]>([])
  const [loading,      setLoading]      = useState(true)
  const [refreshing,   setRefreshing]   = useState(false)
  const [activeTab,    setActiveTab]    = useState<TabKey>('active')
  const [unreadNotifs, setUnreadNotifs] = useState(0)
  const notifiedDriverRef = useRef<Set<string>>(new Set())

  // ── Load orders ────────────────────────────────────────────────────────────
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
          custom_order_ref, custom_order_status
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(150)

      if (error) throw error
      const all = (data ?? []) as OrderRow[]

      // Batch-load merchant names (restaurant orders only)
      const merchantIds = [...new Set(
        all.filter(o => !isStoreOrder(o) && !isCustomOrder(o) && o.merchant_id)
          .map(o => o.merchant_id!),
      )]
      let mMap = new Map<string, string>()
      if (merchantIds.length) {
        const { data: merch } = await supabase
          .from('merchants').select('id,business_name').in('id', merchantIds)
        mMap = new Map((merch ?? []).map((m: any) => [m.id, m.business_name]))
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
                body: `Your order #${order.order_number} is on the way!`,
                data: { order_id: order.id, type: 'driver' },
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

  // ── Real-time orders ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const sub = supabase.channel('orders-list-rt')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: `customer_id=eq.${user.id}`,
      }, loadOrders)
      .subscribe()
    return () => { sub.unsubscribe() }
  }, [user, loadOrders])

  // ── Push registration ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    registerForPushNotifications(user.id)
    const sub = addResponseListener(r => navigateFromNotification(r.notification))
    return () => sub.remove()
  }, [user])

  // ── Notification badge ─────────────────────────────────────────────────────
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

  // ── Derived tab data ───────────────────────────────────────────────────────
  const activeOrders    = orders.filter(o => ACTIVE_STATUSES.includes(o.status))
  const completedOrders = orders.filter(o => COMPLETED_STATUSES.includes(o.status))
  const cancelledOrders = orders.filter(o => CANCELLED_STATUSES.includes(o.status))
  const needsReview     = completedOrders.filter(o => !o.rating)

  const counts: Record<TabKey, number> = {
    active:    activeOrders.length,
    completed: completedOrders.length,
    cancelled: cancelledOrders.length,
    reviews:   needsReview.length,  // badge = pending reviews only
  }

  const filteredOrders =
    activeTab === 'active'    ? activeOrders
    : activeTab === 'completed' ? completedOrders
    : cancelledOrders  // 'cancelled' — reviews tab uses ReviewsTab component directly

  // ── Order card ─────────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: OrderRow }) => {
    const isStore   = isStoreOrder(item)
    const isCustom  = isCustomOrder(item)
    const itemCount = (item.items ?? []).reduce((s: number, i: any) => s + (i.quantity ?? 1), 0)
    const needReview = item.status === 'delivered' && !item.rating
    const canTrack   = TRACKABLE_STATUSES.includes(item.status) && !!item.driver_id

    return (
      <TouchableOpacity
        style={[
          S.orderCard,
          isCustom ? { borderLeftWidth: 3, borderLeftColor: '#065F46' }
          : isStore ? { borderLeftWidth: 3, borderLeftColor: '#7C3AED' }
          : undefined,
        ]}
        onPress={() => router.push(`/(customer)/orders/${item.id}` as any)}
        activeOpacity={0.85}
      >
        {/* ── Header row ── */}
        <View style={S.cardHeaderRow}>
          <View style={{ flex: 1 }}>
            <View style={S.chipRow}>
              <Text style={S.orderNum}>#{item.order_number}</Text>
              {isStore  && <View style={[S.chip, { backgroundColor: '#EDE9FE' }]}><Text style={{ color: '#5B21B6', fontSize: 9, fontWeight: '800' }}>STORE</Text></View>}
              {isCustom && <View style={[S.chip, { backgroundColor: '#D1FAE5' }]}><Text style={{ color: '#065F46', fontSize: 9, fontWeight: '800' }}>CUSTOM</Text></View>}
              {canTrack && <View style={[S.chip, { backgroundColor: '#16A34A' }]}><Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>● LIVE</Text></View>}
              {needReview && (
                <View style={[S.chip, { backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA' }]}>
                  <Text style={{ color: '#F97316', fontSize: 9, fontWeight: '800' }}>⭐ RATE</Text>
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

        {/* ── Merchant ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <Text style={{ fontSize: 14 }}>{isCustom ? '✏️' : isStore ? '🛍️' : '🏪'}</Text>
          <Text style={S.merchantName} numberOfLines={1}>{item.merchant_name}</Text>
        </View>

        {/* ── Items preview ── */}
        <Text style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 6 }} numberOfLines={1}>
          {(item.items ?? []).slice(0, 3).map((i: any) => i.name).join(' · ')}
          {(item.items ?? []).length > 3 ? ` +${(item.items ?? []).length - 3} more` : ''}
        </Text>

        {/* ── Totals ── */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={S.itemCountTxt}>
            {itemCount} item{itemCount !== 1 ? 's' : ''}
            {item.delivery_distance_km ? `  ·  📏 ${Number(item.delivery_distance_km).toFixed(1)} km` : ''}
          </Text>
          <Text style={S.totalTxt}>₹{Number(item.total_amount).toFixed(2)}</Text>
        </View>
        {Number(item.discount) > 0 && (
          <Text style={S.savedTxt}>🎉 Saved ₹{Number(item.discount).toFixed(2)}</Text>
        )}

        {/* ── Footer ── */}
        <View style={S.cardFooter}>
          <Text style={{ fontSize: 11, color: '#9CA3AF', flex: 1 }} numberOfLines={1}>
            {item.payment_method?.toUpperCase()} · {item.payment_status?.toUpperCase()}
            {item.promo_code ? `  🏷️ ${item.promo_code}` : ''}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {canTrack && (
              <View style={S.trackBadge}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>🗺️ Track</Text>
              </View>
            )}
            {item.status === 'delivered' && item.rating
              ? <Text style={{ fontSize: 13 }}>{'⭐'.repeat(item.rating)}</Text>
              : null
            }
            <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 13 }}>View →</Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  const EmptyState = () => {
    const cfg: Record<TabKey, { emoji: string; title: string; sub: string; cta: boolean }> = {
      active:    { emoji: '🛵', title: 'No active orders',    sub: 'Your active orders will appear here',      cta: true  },
      completed: { emoji: '✅', title: 'No completed orders', sub: 'Delivered orders will appear here',        cta: false },
      cancelled: { emoji: '❌', title: 'No cancelled orders', sub: 'Cancelled orders will appear here',        cta: false },
      reviews:   { emoji: '⭐', title: 'All caught up!',      sub: "You've reviewed all your recent orders.", cta: false  },
    }
    const { emoji, title, sub, cta } = cfg[activeTab]
    return (
      <View style={S.emptyWrap}>
        <Text style={{ fontSize: 52, marginBottom: 14 }}>{emoji}</Text>
        <Text style={S.emptyTitle}>{title}</Text>
        <Text style={S.emptySub}>{sub}</Text>
        {cta && (
          <TouchableOpacity style={S.shopBtn} onPress={() => router.push('/(customer)/dashboard' as any)}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Order Now</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <Stack.Screen options={{
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
      }} />

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
                  isActive ? { backgroundColor: isReview ? '#F97316' : COLORS.primary } : undefined,
                  !isActive && isReview ? { backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA' } : undefined,
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

      {/* ── Pending reviews banner (reviews tab only) ── */}
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
        <ActivityIndicator color={COLORS.primary} style={{ flex: 1, marginTop: 40 }} />
      ) : activeTab === 'reviews' ? (
        // ✅ Reviews tab gets its own dedicated component
        <ReviewsTab
          userId={user!.id}
          deliveredOrders={completedOrders}
          onRefresh={loadOrders}
        />
      ) : (
        // ✅ All other tabs use the FlatList
        <FlatList
          data={filteredOrders}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
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

  // Cards
  orderCard:    { backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  cardHeaderRow:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  chipRow:      { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  orderNum:     { fontSize: 16, fontWeight: '800', color: '#1F2937' },
  orderTime:    { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  chip:         { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  statusBadge:  { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  statusTxt:    { color: '#fff', fontSize: 10, fontWeight: '800' },
  merchantName: { fontSize: 14, color: '#4B5563', fontWeight: '700', flex: 1 },
  itemCountTxt: { fontSize: 12, color: '#9CA3AF' },
  totalTxt:     { fontSize: 16, fontWeight: '900', color: COLORS.primary },
  savedTxt:     { fontSize: 12, color: '#16A34A', fontWeight: '600', marginTop: 3 },
  cardFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F9FAFB' },
  trackBadge:   { backgroundColor: '#16A34A', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },

  // Empty
  emptyWrap:  { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 30 },
  emptyTitle: { fontWeight: '800', fontSize: 18, color: '#1F2937', marginBottom: 6, textAlign: 'center' },
  emptySub:   { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginBottom: 20 },
  shopBtn:    { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },

  notifBadge: { position: 'absolute', top: -4, right: -6, backgroundColor: '#EF4444', borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1, minWidth: 16, alignItems: 'center' },
})
