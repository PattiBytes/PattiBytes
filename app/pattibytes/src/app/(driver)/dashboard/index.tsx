import React, { useCallback, useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, RefreshControl,
} from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { COLORS } from '../../../lib/constants'

type Order = {
  id: string
  order_number: number
  status: string
  total_amount: number
  delivery_address: string
  created_at: string
  merchant_id: string
  merchantName?: string
}

export default function DriverDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [pendingOrders, setPendingOrders] = useState<Order[]>([])
  const [myOrders, setMyOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isOnline, setIsOnline] = useState(false)

  const loadOrders = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data: pending } = await supabase
        .from('orders')
        .select('id,order_number,status,total_amount,delivery_address,created_at,merchant_id')
        .eq('status', 'ready')
        .is('driver_id', null)
        .order('created_at', { ascending: true })
        .limit(20)

      const { data: mine } = await supabase
        .from('orders')
        .select('id,order_number,status,total_amount,delivery_address,created_at,merchant_id')
        .eq('driver_id', user.id)
        .in('status', ['assigned', 'pickedup', 'on_the_way'])
        .order('created_at', { ascending: false })

      const allOrders = [...(pending || []), ...(mine || [])]
      if (allOrders.length) {
        const mIds = [...new Set(allOrders.map((o: any) => o.merchant_id))]
        const { data: merch } = await supabase.from('merchants').select('id,business_name').in('id', mIds)
        const map = new Map((merch || []).map((m: any) => [m.id, m.business_name]))
        setPendingOrders((pending || []).map((o: any) => ({ ...o, merchantName: map.get(o.merchant_id) || 'Restaurant' })))
        setMyOrders((mine || []).map((o: any) => ({ ...o, merchantName: map.get(o.merchant_id) || 'Restaurant' })))
      } else {
        setPendingOrders([])
        setMyOrders([])
      }
    } finally {
      setLoading(false)
    }
  }, [user])

  // Load online status from profile
  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('is_online').eq('id', user.id).maybeSingle().then(({ data }) => {
      if (data) setIsOnline(!!data.is_online)
    })
    loadOrders()
  }, [loadOrders, user])

  async function toggleOnline() {
    if (!user) return
    const next = !isOnline
    setIsOnline(next)
    await supabase.from('profiles').update({ is_online: next }).eq('id', user.id)
  }

  async function acceptOrder(orderId: string) {
    if (!user) return
    const { error } = await supabase
      .from('orders')
      .update({ driver_id: user.id, status: 'assigned' })
      .eq('id', orderId)
      .is('driver_id', null)
    if (!error) {
      loadOrders()
      router.push('/(driver)/active-delivery' as any)
    }
  }

  async function onRefresh() {
    setRefreshing(true)
    await loadOrders()
    setRefreshing(false)
  }

  const STATUS_COLORS: Record<string, string> = {
    ready: '#10B981', assigned: '#3B82F6',
    pickedup: '#F97316', on_the_way: '#F97316',
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.backgroundLight }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={S.header}>
        <View>
          <Text style={S.headerTitle}>Driver Dashboard 🛵</Text>
          <Text style={S.headerSub}>{user?.user_metadata?.full_name || user?.email || 'Driver'}</Text>
        </View>
        <TouchableOpacity
          style={[S.onlineBtn, isOnline && S.onlineBtnActive]}
          onPress={toggleOnline}
        >
          <Text style={[S.onlineBtnText, isOnline && S.onlineBtnTextActive]}>
            {isOnline ? '🟢 Online' : '⚫ Offline'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} />
      ) : (
        <FlatList
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={
            <View style={{ padding: 16 }}>
              {/* My Active Deliveries */}
              {myOrders.length > 0 && (
                <>
                  <Text style={S.sectionTitle}>My Active Deliveries ({myOrders.length})</Text>
                  {myOrders.map((order) => (
                    <TouchableOpacity
                      key={order.id}
                      style={[S.orderCard, S.myOrderCard]}
                      onPress={() => router.push('/(driver)/active-delivery' as any)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={S.orderNum}>#{order.order_number} · {order.merchantName}</Text>
                        <Text style={S.address} numberOfLines={1}>{order.delivery_address}</Text>
                        <Text style={S.amount}>₹{Number(order.total_amount).toFixed(2)}</Text>
                      </View>
                      <View>
                        <View style={[S.statusBadge, { backgroundColor: STATUS_COLORS[order.status] || COLORS.primary }]}>
                          <Text style={S.statusText}>{order.status.replace(/_/g, ' ').toUpperCase()}</Text>
                        </View>
                        <Text style={S.continueText}>Continue →</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Available Orders */}
              <Text style={S.sectionTitle}>Available Orders ({pendingOrders.length})</Text>

              {!isOnline && (
                <View style={S.offlineBanner}>
                  <Text style={S.offlineBannerText}>
                    ⚫ You are Offline. Go online to accept orders.
                  </Text>
                </View>
              )}

              {pendingOrders.length === 0 ? (
                <View style={S.empty}>
                  <Text style={S.emptyIcon}>🛵</Text>
                  <Text style={S.emptyTitle}>No orders available</Text>
                  <Text style={S.emptySub}>New orders will appear here automatically</Text>
                </View>
              ) : (
                pendingOrders.map((order) => (
                  <View key={order.id} style={S.orderCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={S.orderNum}>#{order.order_number}</Text>
                      <Text style={S.merchantName}>{order.merchantName}</Text>
                      <Text style={S.address} numberOfLines={2}>{order.delivery_address}</Text>
                      <Text style={S.amount}>₹{Number(order.total_amount).toFixed(2)}</Text>
                    </View>
                    <TouchableOpacity
                      style={[S.acceptBtn, !isOnline && S.acceptBtnDisabled]}
                      onPress={() => isOnline && acceptOrder(order.id)}
                    >
                      <Text style={S.acceptBtnText}>Accept</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        />
      )}
    </View>
  )
}

const S = StyleSheet.create({
  header: {
    backgroundColor: COLORS.primary, padding: 20, paddingTop: 56,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  onlineBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  onlineBtnActive: { backgroundColor: '#fff' },
  onlineBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  onlineBtnTextActive: { color: COLORS.primary },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 12, marginTop: 8 },
  offlineBanner: {
    backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12,
    marginBottom: 12, borderWidth: 1, borderColor: '#FCD34D',
  },
  offlineBannerText: { color: '#92400E', fontWeight: '600', textAlign: 'center' },
  orderCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  myOrderCard: { borderLeftWidth: 4, borderLeftColor: COLORS.primary },
  orderNum: { fontSize: 13, color: COLORS.textLight, fontWeight: '600' },
  merchantName: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginVertical: 2 },
  address: { fontSize: 13, color: COLORS.textLight },
  amount: { fontSize: 16, fontWeight: '800', color: COLORS.primary, marginTop: 4 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 6 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: '800', textAlign: 'center' },
  continueText: { color: COLORS.primary, fontWeight: '700', fontSize: 12, textAlign: 'center' },
  acceptBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  acceptBtnDisabled: { opacity: 0.4 },
  acceptBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 64, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  emptySub: { fontSize: 14, color: COLORS.textLight, marginTop: 4, textAlign: 'center' },
})
