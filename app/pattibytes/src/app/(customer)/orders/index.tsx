import React, { useCallback, useEffect, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { COLORS } from '../../../lib/constants'

// Defined locally — no import needed
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

const ACTIVE_STATUSES    = ['pending','confirmed','preparing','ready','assigned','pickedup','on_the_way','outfordelivery']
const COMPLETED_STATUSES = ['delivered']
const CANCELLED_STATUSES = ['cancelled','rejected']

type OrderRow = {
  id: string; order_number: number; status: string
  total_amount: number; subtotal: number; discount: number
  items: any[]; created_at: string; merchant_id: string
  payment_method: string; payment_status: string
  rating: number | null; review: string | null
  merchant_name?: string
}

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d < 1) return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
}

export default function OrdersScreen() {
  const { user } = useAuth()
  const router   = useRouter()
  const [orders,      setOrders]      = useState<OrderRow[]>([])
  const [loading,     setLoading]     = useState(true)
  const [refreshing,  setRefreshing]  = useState(false)
  const [activeTab,   setActiveTab]   = useState<'active' | 'completed' | 'cancelled'>('active')

  const loadOrders = useCallback(async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id,order_number,status,total_amount,subtotal,discount,items,created_at,merchant_id,payment_method,payment_status,rating,review')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error

      const all = data ?? []
      if (all.length) {
        const mIds = [...new Set(all.map((o: any) => o.merchant_id))]
        const { data: merch } = await supabase.from('merchants').select('id,business_name').in('id', mIds)
        const mMap = new Map((merch ?? []).map((m: any) => [m.id, m.business_name]))
        setOrders(all.map((o: any) => ({ ...o, merchant_name: mMap.get(o.merchant_id) ?? 'Restaurant' })) as OrderRow[])
      } else {
        setOrders([])
      }
    } catch (e: any) {
      console.warn('loadOrders', e.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { loadOrders() }, [loadOrders])

  // Real-time updates for active orders
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

  const renderItem = ({ item }: { item: OrderRow }) => {
    const itemCount = (item.items ?? []).reduce((s: number, i: any) => s + (i.quantity ?? 1), 0)
    const needsReview = item.status === 'delivered' && !item.rating

    return (
      <TouchableOpacity
        style={S.orderCard}
        onPress={() => router.push(`/(customer)/orders/${item.id}` as any)}
        activeOpacity={0.8}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={S.orderNum}>Order #{item.order_number}</Text>
            <Text style={S.orderTime}>{timeAgo(item.created_at)}</Text>
          </View>
          <View style={[S.statusBadge, { backgroundColor: STATUS_COLORS[item.status] ?? '#888' }]}>
            <Text style={S.statusTxt}>{item.status.replace(/_/g, ' ').toUpperCase()}</Text>
          </View>
        </View>

        <Text style={S.merchantName}>{item.merchant_name}</Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <Text style={S.itemCountTxt}>{itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
          <Text style={S.totalTxt}>₹{Number(item.total_amount).toFixed(2)}</Text>
        </View>

        {Number(item.discount) > 0 && (
          <Text style={S.savedTxt}>🎉 You saved ₹{Number(item.discount).toFixed(2)}</Text>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <Text style={{ fontSize: 11, color: COLORS.textLight }}>
            {item.payment_method?.toUpperCase()} · {item.payment_status?.toUpperCase()}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
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
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
      }} />

      {/* Tabs */}
      <View style={S.tabRow}>
        {([
          { key: 'active',    label: `Active (${counts.active})` },
          { key: 'completed', label: `Done (${counts.completed})` },
          { key: 'cancelled', label: `Cancelled (${counts.cancelled})` },
        ] as const).map(t => (
          <TouchableOpacity
            key={t.key}
            style={[S.tab, activeTab === t.key && S.tabActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Text style={[S.tabTxt, activeTab === t.key && S.tabTxtActive]}>{t.label}</Text>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 56 }}>
              <Text style={{ fontSize: 52, marginBottom: 14 }}>📦</Text>
              <Text style={{ fontWeight: '800', fontSize: 18, color: COLORS.text }}>No {activeTab} orders</Text>
              {activeTab === 'active' && (
                <TouchableOpacity style={S.shopBtn} onPress={() => router.push('/(customer)/dashboard' as any)}>
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
  tabRow:       { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tab:          { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive:    { borderBottomWidth: 2.5, borderBottomColor: COLORS.primary },
  tabTxt:       { fontSize: 11, fontWeight: '600', color: COLORS.textLight },
  tabTxtActive: { color: COLORS.primary, fontWeight: '800' },
  orderCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  orderNum:     { fontSize: 16, fontWeight: '800', color: COLORS.text },
  orderTime:    { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  statusBadge:  { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  statusTxt:    { color: '#fff', fontSize: 10, fontWeight: '800' },
  merchantName: { fontSize: 14, color: '#4B5563', fontWeight: '600' },
  itemCountTxt: { fontSize: 13, color: COLORS.textLight },
  totalTxt:     { fontSize: 16, fontWeight: '900', color: COLORS.primary },
  savedTxt:     { fontSize: 12, color: '#16A34A', fontWeight: '600', marginTop: 2 },
  reviewCta:    { backgroundColor: '#FFF7F0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#FED7AA' },
  shopBtn:      { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12, marginTop: 20 },
})
