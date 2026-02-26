import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Linking,
} from 'react-native'
import { Stack, useRouter } from 'expo-router'
import * as Location from 'expo-location'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { COLORS } from '../../../lib/constants'
import {
  MapView, Marker, Polyline, PROVIDER_GOOGLE,
} from '../../../components/MapView'

type MerchantInfo = {
  business_name: string
  address: string | null
  latitude: number | null
  longitude: number | null
  phone: string | null
}

type Order = {
  id: string
  order_number: number
  status: string
  total_amount: number
  delivery_address: string
  delivery_latitude: number | null
  delivery_longitude: number | null
  customer_phone: string | null
  special_instructions: string | null
  items: any[]
  merchant_id: string
  customer_id: string
  merchants: MerchantInfo | null
  customerName?: string
  customerPhone?: string
}

const STATUS_STEPS = [
  { from: 'assigned',   to: 'pickedup',    label: 'Confirm Pickup',   emoji: '📦', color: '#3B82F6' },
  { from: 'pickedup',   to: 'on_the_way',  label: 'Start Delivery',   emoji: '🚀', color: '#F97316' },
  { from: 'on_the_way', to: 'delivered',   label: 'Mark Delivered',   emoji: '✅', color: '#10B981' },
]

const STATUS_COLORS: Record<string, string> = {
  assigned:   '#3B82F6',
  pickedup:   '#F97316',
  on_the_way: '#F97316',
  delivered:  '#10B981',
}

export default function ActiveDeliveryScreen() {
  const { user }  = useAuth()
  const router    = useRouter()
  const [order, setOrder]           = useState<Order | null>(null)
  const [loading, setLoading]       = useState(true)
  const [updating, setUpdating]     = useState(false)
  const [driverCoords, setDriverCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const watchRef = useRef<Location.LocationSubscription | null>(null)

  const loadOrder = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, order_number, status, total_amount,
          delivery_address, delivery_latitude, delivery_longitude,
          customer_phone, special_instructions, items,
          merchant_id, customer_id,
          merchants ( business_name, address, latitude, longitude, phone )
        `)
        .eq('driver_id', user.id)
        .in('status', ['assigned', 'pickedup', 'on_the_way'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      if (!data) { setOrder(null); return }

      // Fetch customer name/phone
      const { data: customer } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', data.customer_id)
        .maybeSingle()

      setOrder({
        ...data,
        merchants: (data.merchants as any) ?? null,
        customerName:  customer?.full_name  ?? undefined,
        customerPhone: customer?.phone      ?? undefined,
      } as Order)
    } catch (e: any) {
      console.warn('loadOrder:', e.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { loadOrder() }, [loadOrder])

  // Live location tracking while delivery is active
  useEffect(() => {
    if (!order || !user) return
    let active = true

    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== 'granted' || !active) return
      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 20 },
        async (pos) => {
          const { latitude, longitude } = pos.coords
          if (!active) return
          setDriverCoords({ latitude, longitude })
          await supabase.from('orders').update({
            driver_location: { lat: latitude, lng: longitude, updated_at: new Date().toISOString() },
          }).eq('id', order.id)
          await supabase.from('profiles').update({ latitude, longitude }).eq('id', user.id)
        }
      ).then((sub) => { watchRef.current = sub })
    })

    return () => {
      active = false
      watchRef.current?.remove()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id, user])

  async function updateStatus(nextStatus: string) {
    if (!order) return
    Alert.alert(
      'Confirm Update',
      `Mark order #${order.order_number} as "${nextStatus.replace(/_/g, ' ').toUpperCase()}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setUpdating(true)
            try {
              const updates: any = { status: nextStatus }
              if (nextStatus === 'delivered')
                updates.actual_delivery_time = new Date().toISOString()
              const { error } = await supabase.from('orders').update(updates).eq('id', order.id)
              if (error) throw error
              if (nextStatus === 'delivered') {
                watchRef.current?.remove()
                Alert.alert(
                  '🎉 Delivery Complete!',
                  `Order #${order.order_number} delivered!`,
                  [{ text: 'Back to Dashboard', onPress: () => router.replace('/(driver)/dashboard' as any) }]
                )
              } else {
                await loadOrder()
              }
            } catch (e: any) {
              Alert.alert('Update Failed', e.message)
            } finally {
              setUpdating(false)
            }
          },
        },
      ]
    )
  }

  function navigate(lat: number, lng: number) {
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`)
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ title: 'Active Delivery' }} />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  if (!order) {
    return (
      <View style={S.empty}>
        <Stack.Screen options={{ title: 'Active Delivery' }} />
        <Text style={S.emptyIcon}>🛵</Text>
        <Text style={S.emptyTitle}>No Active Delivery</Text>
        <Text style={S.emptySub}>Accept an order from the dashboard to start</Text>
        <TouchableOpacity
          style={S.dashBtn}
          onPress={() => router.replace('/(driver)/dashboard' as any)}
        >
          <Text style={S.dashBtnText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const nextStep      = STATUS_STEPS.find((s) => s.from === order.status)
  const merchantCoord = order.merchants?.latitude && order.merchants?.longitude
    ? { latitude: Number(order.merchants.latitude), longitude: Number(order.merchants.longitude) }
    : null
  const deliveryCoord = order.delivery_latitude && order.delivery_longitude
    ? { latitude: Number(order.delivery_latitude), longitude: Number(order.delivery_longitude) }
    : null
  const mapCenter = driverCoords ?? merchantCoord ?? deliveryCoord
  const mapRegion = mapCenter
    ? { ...mapCenter, latitudeDelta: 0.02, longitudeDelta: 0.02 }
    : null

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.backgroundLight }}>
      <Stack.Screen options={{ title: 'Active Delivery' }} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Map */}
        {mapRegion && (
          <MapView
            style={S.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={mapRegion}
            region={driverCoords ? { ...driverCoords, latitudeDelta: 0.02, longitudeDelta: 0.02 } : mapRegion}
            showsUserLocation
            showsMyLocationButton
          >
            {merchantCoord && (
              <Marker
                coordinate={merchantCoord}
                title={order.merchants?.business_name ?? 'Restaurant'}
                pinColor="#FF6B35"
              />
            )}
            {deliveryCoord && (
              <Marker
                coordinate={deliveryCoord}
                title="Delivery Location"
                pinColor="#10B981"
              />
            )}
            {driverCoords && deliveryCoord && (
              <Polyline
                coordinates={[driverCoords, deliveryCoord]}
                strokeColor={COLORS.primary}
                strokeWidth={3}
                lineDashPattern={[8, 4]}
              />
            )}
          </MapView>
        )}

        <View style={{ padding: 16, gap: 12 }}>
          {/* Status */}
          <View style={S.statusCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[S.dot, { backgroundColor: STATUS_COLORS[order.status] ?? COLORS.primary }]} />
              <Text style={S.statusLabel}>{order.status.replace(/_/g, ' ').toUpperCase()}</Text>
            </View>
            <Text style={S.orderNum}>#{order.order_number}</Text>
          </View>

          {/* Primary CTA */}
          {nextStep && (
            <TouchableOpacity
              style={[S.ctaBtn, { backgroundColor: nextStep.color }, updating && S.disabled]}
              onPress={() => updateStatus(nextStep.to)}
              disabled={updating}
              activeOpacity={0.85}
            >
              {updating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={S.ctaEmoji}>{nextStep.emoji}</Text>
                  <Text style={S.ctaText}>{nextStep.label}</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Restaurant */}
          <View style={S.card}>
            <Text style={S.cardTag}>🏪 PICKUP FROM</Text>
            <Text style={S.cardTitle}>{order.merchants?.business_name ?? 'Restaurant'}</Text>
            {order.merchants?.address && (
              <Text style={S.cardSub} numberOfLines={2}>{order.merchants.address}</Text>
            )}
            <View style={S.btnRow}>
              {merchantCoord && (
                <TouchableOpacity
                  style={S.outlineBtn}
                  onPress={() => navigate(merchantCoord.latitude, merchantCoord.longitude)}
                >
                  <Text style={S.outlineBtnText}>🗺️ Navigate</Text>
                </TouchableOpacity>
              )}
              {order.merchants?.phone && (
                <TouchableOpacity
                  style={S.outlineBtn}
                  onPress={() => Linking.openURL(`tel:${order.merchants!.phone}`)}
                >
                  <Text style={S.outlineBtnText}>📞 Call</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Delivery */}
          <View style={S.card}>
            <Text style={S.cardTag}>📍 DELIVER TO</Text>
            {order.customerName && <Text style={S.cardTitle}>{order.customerName}</Text>}
            <Text style={S.cardSub} numberOfLines={3}>{order.delivery_address}</Text>
            {order.special_instructions && (
              <View style={S.instructions}>
                <Text style={S.instructionsText}>📝 {order.special_instructions}</Text>
              </View>
            )}
            <View style={S.btnRow}>
              {deliveryCoord && (
                <TouchableOpacity
                  style={S.outlineBtn}
                  onPress={() => navigate(deliveryCoord.latitude, deliveryCoord.longitude)}
                >
                  <Text style={S.outlineBtnText}>🗺️ Navigate</Text>
                </TouchableOpacity>
              )}
              {(order.customer_phone ?? order.customerPhone) && (
                <TouchableOpacity
                  style={S.outlineBtn}
                  onPress={() =>
                    Linking.openURL(`tel:${order.customer_phone ?? order.customerPhone}`)
                  }
                >
                  <Text style={S.outlineBtnText}>📞 Call</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Items */}
          <View style={S.card}>
            <Text style={S.cardTag}>🛒 ITEMS ({order.items?.length ?? 0})</Text>
            {(order.items ?? []).map((item: any, i: number) => (
              <View key={item.id ?? i} style={S.itemRow}>
                <Text style={S.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={S.itemQty}>×{item.quantity}</Text>
              </View>
            ))}
            <View style={S.totalRow}>
              <Text style={S.totalLabel}>Order Total</Text>
              <Text style={S.totalValue}>₹{Number(order.total_amount).toFixed(2)}</Text>
            </View>
          </View>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

const S = StyleSheet.create({
  map: { height: 280, width: '100%' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 72, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  emptySub: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', marginBottom: 24 },
  dashBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 14,
  },
  dashBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  statusCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  statusLabel: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  orderNum: { fontSize: 14, color: COLORS.textLight, fontWeight: '600' },
  ctaBtn: {
    borderRadius: 16, padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    elevation: 4, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  ctaEmoji: { fontSize: 22 },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  cardTag: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 0.8, marginBottom: 6 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  cardSub: { fontSize: 14, color: COLORS.textLight, lineHeight: 20 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  outlineBtn: {
    borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  outlineBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  instructions: {
    backgroundColor: '#FFF7F4', borderRadius: 10, padding: 10,
    marginTop: 10, borderWidth: 1, borderColor: '#FFD5C2',
  },
  instructionsText: { fontSize: 13, color: COLORS.text, lineHeight: 18 },
  itemRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  itemName: { fontSize: 14, color: COLORS.text, fontWeight: '600', flex: 1 },
  itemQty: { fontSize: 14, color: COLORS.textLight, fontWeight: '600' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 },
  totalLabel: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  totalValue: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  disabled: { opacity: 0.55 },
})
