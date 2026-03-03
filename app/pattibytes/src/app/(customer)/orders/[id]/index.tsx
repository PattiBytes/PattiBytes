/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, RefreshControl,
  Platform, Linking,
} from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import { supabase } from '../../../../lib/supabase'
import { useAuth } from '../../../../contexts/AuthContext'
import { COLORS } from '../../../../lib/constants'
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, canUseMapLibre } from '../../../../components/MapView'
import type { Region } from '../../../../components/MapView'

// ── Order sub-components ──────────────────────────────────────────────────────
import StatusHero      from '../../../../components/orders/StatusHero'
import OrderTimeline   from '../../../../components/orders/OrderTimeline'
import CustomOrderFlow from '../../../../components/orders/CustomOrderFlow'
import OrderItems      from '../../../../components/orders/OrderItems'
import BillSection     from '../../../../components/orders/BillSection'
import DeliverySection from '../../../../components/orders/DeliverySection'
import MerchantSection from '../../../../components/orders/MerchantSection'
import ReviewSection   from '../../../../components/orders/ReviewSection'
import CancelModal     from '../../../../components/orders/CancelModal'
import {
  ACTIVE_STATUSES, CANCELLABLE_STATUSES,
  RESTAURANT_TIMELINE, STORE_TIMELINE, CUSTOM_TIMELINE,
  STATUS_ORDER, TRACKABLE_STATUSES,
} from '../../../../components/orders/constants'
import type { OrderDetail, DriverInfo, LatLng } from '../../../../components/orders/types'
import { useAppSettings , getSupportWhatsApp } from '../../../../hooks/useAppSettings'


// ── MerchantInfo — defined at module level (not inside the component) ─────────
type MerchantInfo = {
  id:            string
  business_name: string        // ✅ snake_case — matches Supabase column
  logo_url:      string | null
  phone:         string | null
  address:       string | null
  latitude:      number | null
  longitude:     number | null
}

// ── Push safety guard ─────────────────────────────────────────────────────────
const canUsePush =
  Device.isDevice &&
  !(Platform.OS === 'android' && Constants.appOwnership === 'expo')

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseLocation(v: unknown): { lat: number; lng: number } | null {
  if (!v) return null
  if (typeof v === 'object' && v !== null) {
    const o = v as any
    if (typeof o.lat === 'number' && typeof o.lng === 'number') return o
  }
  if (typeof v === 'string') {
    try {
      const o = JSON.parse(v)
      if (typeof o.lat === 'number' && typeof o.lng === 'number') return o
    } catch { /* ignore */ }
  }
  return null
}

function toLatLng(lat?: number | null, lng?: number | null): LatLng | null {
  return typeof lat === 'number' && typeof lng === 'number'
    ? { latitude: lat, longitude: lng }
    : null
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function OrderDetailPage() {
  const { id }   = useLocalSearchParams<{ id: string }>()
  const router   = useRouter()
  const { user } = useAuth()
  const { settings } = useAppSettings()

  const [order,         setOrder]         = useState<OrderDetail | null>(null)
  const [merchant,      setMerchant]      = useState<MerchantInfo | null>(null)
  const [driver,        setDriver]        = useState<DriverInfo | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [refreshing,    setRefreshing]    = useState(false)
  const [driverCoords,  setDriverCoords]  = useState<LatLng | null>(null)
  const [showCancel,    setShowCancel]    = useState(false)
  const [cancelling,    setCancelling]    = useState(false)
  const [acceptingQuote,setAcceptingQuote]= useState(false)

  const orderIdRef = useRef<string | null>(null)

  // ── Load order ────────────────────────────────────────────────────────────
  const loadOrder = useCallback(async () => {
    if (!id || !user) return
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, order_number, status, order_type, platform_handled,
          subtotal, delivery_fee, tax, discount, total_amount,
          payment_method, payment_status,
          delivery_address, delivery_address_label,
          customer_notes, special_instructions, delivery_instructions,
          created_at, updated_at,
          estimated_delivery_time, actual_delivery_time, preparation_time,
          cancellation_reason, cancelled_by,
          rating, review,
          delivery_distance_km,
          customer_phone, recipient_name,
          delivery_latitude, delivery_longitude,
          customer_location, driver_location,
          promo_code, promo_id,
          merchant_id, driver_id,
          hub_origin, items,
          custom_order_ref, custom_order_status,
          quoted_amount, quote_message,
          custom_category, custom_image_url
        `)
        .eq('id', id)
        .eq('customer_id', user.id)
        .single()

      if (error) throw error
      const o = data as OrderDetail
      setOrder(o)
      orderIdRef.current = o.id

      // Parse driver location
      const dl = parseLocation(o.driver_location)
      if (dl) setDriverCoords({ latitude: dl.lat, longitude: dl.lng })
      else    setDriverCoords(null)

      // Load merchant (restaurant orders only)
      if (o.merchant_id && o.order_type === 'restaurant') {
        const { data: m } = await supabase
          .from('merchants')
          .select('id,business_name,logo_url,phone,address,latitude,longitude') // ✅ snake_case
          .eq('id', o.merchant_id)
          .maybeSingle()
        setMerchant(m ? (m as MerchantInfo) : null)
      } else {
        setMerchant(null)
      }

      // Load driver
      if (o.driver_id) {
        const { data: d } = await supabase
          .from('profiles')
          .select('id,full_name,phone,avatar_url')
          .eq('id', o.driver_id)
          .maybeSingle()
        setDriver(d ? (d as DriverInfo) : null)
      } else {
        setDriver(null)
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load order', [
        { text: 'Back', onPress: () => router.back() },
      ])
    } finally {
      setLoading(false)
    }
  }, [id, user, router])

  useEffect(() => { loadOrder() }, [loadOrder])

  // ── Real-time updates ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return
    const sub = supabase
      .channel(`order-detail-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}`,
      }, payload => {
        const u = payload.new as Partial<OrderDetail>
        setOrder(prev => prev ? { ...prev, ...u } : null)
        const dl = parseLocation(u.driver_location)
        if (dl) setDriverCoords({ latitude: dl.lat, longitude: dl.lng })
      })
      .subscribe()
    return () => { sub.unsubscribe() }
  }, [id])

  // ── Push notification tap ─────────────────────────────────────────────────
  useEffect(() => {
    if (!canUsePush) return
    let sub: any = null
    import('expo-notifications').then(N => {
      sub = N.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data as any
        if (data?.order_id === id) loadOrder()
        else if (data?.order_id) router.push(`/(customer)/orders/${data.order_id}` as any)
      })
    })
    return () => { sub?.remove?.() }
  }, [id, loadOrder, router])

  const onRefresh = async () => { setRefreshing(true); await loadOrder(); setRefreshing(false) }

  // ── Cancel order ──────────────────────────────────────────────────────────
  const handleCancelOrder = async (reason: string) => {
    if (!order || !user) return

    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      const phone = (settings?.support_phone ?? '+918400009045').replace(/\D/g, '')
      Alert.alert(
        'Cannot Cancel',
        `Your order is already being ${order.status}. Please contact support.`,
        [
          {
            text: '💬 Contact Support',
            onPress: () => Linking.openURL(
              `https://wa.me/${phone}?text=Hi! Help cancelling order %23${order.order_number}`
            ),
          },
          { text: 'OK', style: 'cancel' },
        ]
      )
      return
    }

    setCancelling(true)
    try {
      await supabase.from('order_cancellations').insert({
        order_id: order.id, customer_id: user.id,
        reason, cancelled_at: new Date().toISOString(),
      })
      const { error } = await supabase.from('orders').update({
        status: 'cancelled', cancellation_reason: reason,
        cancelled_by: 'customer', updated_at: new Date().toISOString(),
      }).eq('id', order.id)
      if (error) throw error

      await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Order Cancelled',
        message: `Your order #${order.order_number} has been cancelled.`,
        type: 'order',
        data: { order_id: order.id, status: 'cancelled' },
        body: `Your order #${order.order_number} has been cancelled.`,
        is_read: false, sent_push: false,
        created_at: new Date().toISOString(),
      })

      setShowCancel(false)
      Alert.alert('Cancelled', 'Your order has been cancelled.', [
        { text: 'OK', onPress: () => router.push('/(customer)/orders' as any) },
      ])
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to cancel')
    } finally {
      setCancelling(false)
    }
  }

  // ── Accept quote ──────────────────────────────────────────────────────────
  const handleAcceptQuote = async () => {
    if (!order) return
    Alert.alert(
      'Accept Quote?',
      `Confirm order for ₹${Number(order.quoted_amount).toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Accept',
          onPress: async () => {
            setAcceptingQuote(true)
            try {
              const { error } = await supabase.from('orders').update({
                custom_order_status: 'confirmed',
                total_amount: order.quoted_amount,
                updated_at: new Date().toISOString(),
              }).eq('id', order.id)
              if (error) throw error
              await loadOrder()
              Alert.alert('✅ Confirmed!', 'Your custom order has been confirmed.')
            } catch (e: any) {
              Alert.alert('Error', e?.message)
            } finally {
              setAcceptingQuote(false)
            }
          },
        },
      ]
    )
  }

  // ── Reorder ───────────────────────────────────────────────────────────────
  const handleReorder = () => {
    if (!order?.items?.length) return
    Alert.alert(
      'Reorder',
      `Add ${order.items.length} item${order.items.length !== 1 ? 's' : ''} to cart?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reorder',
          onPress: () => {
            if (order.order_type === 'restaurant' && order.merchant_id) {
              router.push(`/(customer)/restaurant/${order.merchant_id}` as any)
            } else {
              router.push('/(customer)/store' as any)
            }
          },
        },
      ]
    )
  }

  // ── Guards ────────────────────────────────────────────────────────────────
  if (loading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <Stack.Screen options={{ title: 'Order Details' }} />
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  )
  if (!order) return null

  // ── Derived state ─────────────────────────────────────────────────────────
  const isStore    = order.order_type === 'store'
  const isCustom   = order.order_type === 'custom'
  const isPlatform = isStore || isCustom || order.platform_handled === true
  const isActive   = ACTIVE_STATUSES.includes(order.status)
  const canCancel  = CANCELLABLE_STATUSES.includes(order.status)
  const isDelivered = order.status === 'delivered'
  const isCancelled = order.status === 'cancelled' || order.status === 'rejected'
  const canReorder  = isDelivered || isCancelled

  const timeline = isCustom ? CUSTOM_TIMELINE : isStore ? STORE_TIMELINE : RESTAURANT_TIMELINE

  // ── Map coords ────────────────────────────────────────────────────────────
  const deliveryCoords = toLatLng(
    order.delivery_latitude  ?? (order as any).deliverylatitude,
    order.delivery_longitude ?? (order as any).deliverylongitude,
  )
  const merchantCoords = toLatLng(merchant?.latitude, merchant?.longitude)
  const hubLat    = order.hub_origin?.lat ?? (order as any).huborigin?.lat ?? null
  const hubLng    = order.hub_origin?.lng ?? (order as any).huborigin?.lng ?? null
  const hubCoords = toLatLng(hubLat, hubLng)
  const originCoords = isPlatform ? hubCoords : merchantCoords

  const mapCenter: LatLng | null = driverCoords ?? originCoords ?? deliveryCoords
  const initialRegion: Region | undefined = mapCenter
    ? { ...mapCenter, latitudeDelta: 0.025, longitudeDelta: 0.025 }
    : undefined
  const liveRegion: Region | undefined = driverCoords
    ? { ...driverCoords, latitudeDelta: 0.015, longitudeDelta: 0.015 }
    : initialRegion

  // Map visibility conditions
  const driverAssigned = !!order.driver_id && TRACKABLE_STATUSES.includes(order.status)
  const hasLiveLocation = !!driverCoords

  const headerColor = isCancelled ? '#EF4444'
    : isDelivered ? '#10B981'
    : isCustom    ? '#065F46'
    : isStore     ? '#5B21B6'
    : COLORS.primary

  const supportUrl = getSupportWhatsApp(settings, order.order_number)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <Stack.Screen options={{
        title:            `Order #${order.order_number}`,
        headerStyle:      { backgroundColor: headerColor },
        headerTintColor:  '#fff',
        headerTitleStyle: { fontWeight: '800' },
        headerRight: () => (
          <TouchableOpacity
            onPress={() => router.push('/(customer)/notifications' as any)}
            style={{ marginRight: 14 }}
          >
            <Text style={{ fontSize: 20 }}>🔔</Text>
          </TouchableOpacity>
        ),
      }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        contentContainerStyle={{ paddingBottom: 50 }}
      >
        {/* ── Status Hero ─────────────────────────────────────────────── */}
        <StatusHero order={order} />

        {/* ── Custom Order Flow ────────────────────────────────────────── */}
        {isCustom && (
          <CustomOrderFlow
            order={order}
            onAcceptQuote={
              (order.custom_order_status ?? order.status) === 'quoted' && order.quoted_amount
                ? handleAcceptQuote
                : undefined
            }
          />
        )}

        {/* ── Live Map ─────────────────────────────────────────────────── */}
        {!driverAssigned ? (
          // Not yet assigned
          isActive && (
            <View style={S.mapPlaceholder}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>🛵</Text>
              <Text style={{ fontWeight: '700', color: '#1F2937', fontSize: 14 }}>
                Live tracking coming soon
              </Text>
              <Text style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 4 }}>
                Map will appear once a driver is assigned to your order.
              </Text>
            </View>
          )
        ) : !hasLiveLocation ? (
          // Assigned but no location yet
          <View style={[S.mapPlaceholder, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>📡</Text>
            <Text style={{ fontWeight: '700', color: '#92400E', fontSize: 14 }}>
              Driver assigned — waiting for location
            </Text>
            <Text style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 4 }}>
              Live map will appear once your driver shares their location.
            </Text>
            {driver && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 }}>
                <Text style={{ fontSize: 13, color: '#92400E', fontWeight: '700' }}>
                  🛵 {driver.full_name ?? 'Driver'}
                </Text>
                {driver.phone && (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`tel:${driver.phone}`)}
                    style={{ backgroundColor: '#F97316', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>📞 Call</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        ) : (
          // ✅ Driver + live location → full map
          <View style={S.mapWrap}>
            <MapView
              style={S.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={liveRegion ?? initialRegion}
              region={liveRegion}
              showsUserLocation
              fallbackLatitude={driverCoords?.latitude}
              fallbackLongitude={driverCoords?.longitude}
              fallbackLabel="Driver Location"
            >
              {originCoords && (
                <Marker
                  coordinate={originCoords}
                  title={isPlatform
                    ? (order.hub_origin?.label ?? 'PBExpress Hub')
                    : (merchant?.business_name ?? 'Restaurant')}
                  pinColor={isPlatform ? '#7C3AED' : '#FF6B35'}
                />
              )}
              {deliveryCoords && (
                <Marker coordinate={deliveryCoords} title="Your Address" pinColor="#10B981" />
              )}
              <Marker
                coordinate={driverCoords!}
                title={`🛵 ${driver?.full_name ?? 'Driver'}`}
                pinColor="#3B82F6"
              />
              {deliveryCoords && (
                <Polyline
                  coordinates={[driverCoords!, deliveryCoords]}
                  strokeColor={COLORS.primary}
                  strokeWidth={3}
                />
              )}
            </MapView>

            <View style={S.livePill}>
              <View style={S.liveDot} />
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
                {driver?.full_name ?? 'Driver'} is on the way
              </Text>
            </View>

            {deliveryCoords && (
              <View style={S.distancePill}>
                <Text style={{ color: '#1F2937', fontSize: 11, fontWeight: '700' }}>
                  📍 {order.delivery_distance_km
                    ? `${Number(order.delivery_distance_km).toFixed(1)} km away`
                    : 'Tracking live'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Order Timeline ───────────────────────────────────────────── */}
        {!isCancelled && !isCustom && (
          <OrderTimeline timeline={timeline} status={order.status} />
        )}

        {/* ── Cancelled Banner ─────────────────────────────────────────── */}
        {isCancelled && (
          <View style={S.cancelBanner}>
            <Text style={S.cancelTitle}>
              {order.status === 'rejected' ? '🚫 Order Rejected' : '❌ Order Cancelled'}
            </Text>
            {order.cancellation_reason && (
              <Text style={S.cancelReason}>Reason: {order.cancellation_reason}</Text>
            )}
            {order.cancelled_by && (
              <Text style={S.cancelBy}>
                Cancelled by: {order.cancelled_by === 'customer' ? 'You' : order.cancelled_by}
              </Text>
            )}
          </View>
        )}

        {/* ── Custom Category ──────────────────────────────────────────── */}
        {isCustom && order.custom_category && (
          <View style={[S.infoCard, { backgroundColor: '#F0FDF4', borderColor: '#A7F3D0' }]}>
            <Text style={{ fontSize: 13, color: '#065F46', fontWeight: '700' }}>
              📂 Category:{' '}
              {order.custom_category.charAt(0).toUpperCase() + order.custom_category.slice(1)}
            </Text>
          </View>
        )}

        {/* ── Items ────────────────────────────────────────────────────── */}
        <OrderItems items={order.items ?? []} isStore={isStore || isCustom} />

        {/* ── Bill ─────────────────────────────────────────────────────── */}
        <BillSection order={order} isStore={isStore || isCustom} />

        {/* ── Delivery Address ─────────────────────────────────────────── */}
        <DeliverySection order={order} />

        {/* ── Order Dates ──────────────────────────────────────────────── */}
        <OrderMeta order={order} />

        {/* ── Merchant / Driver ────────────────────────────────────────── */}
        <MerchantSection
          order={order}
          merchant={merchant}
          driver={driver}
          isStore={isStore || isCustom}
          isActive={isActive}
          isDelivered={isDelivered}
        />

        {/* ── Review Section ────────────────────────────────────────────── */}
        {isDelivered && (
          <ReviewSection
            orderId={order.id}
            customerId={user!.id}
            merchantId={order.merchant_id}
            driverId={order.driver_id}
            orderItems={order.items ?? []}
            isStore={isStore}
            isCustom={isCustom}
            onDone={rev =>
              setOrder(prev =>
                prev ? { ...prev, rating: rev.overall_rating ?? rev.rating } : prev
              )
            }
          />
        )}

        {/* ── Action Buttons ────────────────────────────────────────────── */}
        <View style={S.actions}>
          {canCancel && (
            <TouchableOpacity style={S.cancelBtn} onPress={() => setShowCancel(true)}>
              <Text style={{ color: '#DC2626', fontWeight: '800', fontSize: 14 }}>❌ Cancel Order</Text>
            </TouchableOpacity>
          )}
          {canReorder && (
            <TouchableOpacity style={S.reorderBtn} onPress={handleReorder}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>🔁 Reorder</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={S.helpBtn}
            onPress={() => Linking.openURL(supportUrl)}
          >
            <Text style={{ color: '#15803D', fontWeight: '700', fontSize: 14 }}>💬 Need Help?</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Cancel Modal ─────────────────────────────────────────────────── */}
      <CancelModal
        visible={showCancel}
        orderNumber={order.order_number}
        cancelling={cancelling}
        onConfirm={handleCancelOrder}
        onDismiss={() => setShowCancel(false)}
      />

      {/* ── Quote accepting overlay ───────────────────────────────────────── */}
      {acceptingQuote && (
        <View style={S.quoteOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ marginTop: 10, color: '#fff', fontWeight: '700' }}>Confirming quote…</Text>
        </View>
      )}
    </View>
  )
}

// ── OrderMeta sub-component ───────────────────────────────────────────────────
function OrderMeta({ order }: { order: OrderDetail }) {
  const rows = [
    { label: '🕐 Placed',        value: fmtDateTime(order.created_at) },
    { label: '🔄 Last Updated',  value: fmtDateTime(order.updated_at) },
    { label: '⏱️ Est. Delivery', value: fmtDateTime(order.estimated_delivery_time) },
    ...(order.actual_delivery_time
      ? [{ label: '✅ Delivered At', value: fmtDateTime(order.actual_delivery_time) }]
      : []),
    ...(order.preparation_time
      ? [{ label: '🍳 Prep Time',   value: `${order.preparation_time} min` }]
      : []),
  ]

  return (
    <View style={S2.section}>
      <Text style={S2.title}>🗓️ Order Timeline</Text>
      {rows.map(r => (
        <View key={r.label} style={S2.row}>
          <Text style={S2.lbl}>{r.label}</Text>
          <Text style={S2.val}>{r.value}</Text>
        </View>
      ))}
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  mapWrap:       { marginHorizontal: 16, marginTop: 10, borderRadius: 16, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  map:           { width: '100%', height: 240 },
  livePill:      { position: 'absolute', top: 10, left: 10, backgroundColor: '#16A34A', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  distancePill:  { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  mapPlaceholder:{ margin: 16, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', minHeight: 110 },

  cancelBanner:  { marginHorizontal: 16, marginTop: 10, backgroundColor: '#FEF2F2', borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: '#FECACA' },
  cancelTitle:   { fontSize: 16, fontWeight: '900', color: '#991B1B', marginBottom: 6 },
  cancelReason:  { color: '#7F1D1D', fontSize: 13, marginBottom: 3 },
  cancelBy:      { color: '#B91C1C', fontSize: 12 },

  infoCard:      { marginHorizontal: 16, marginTop: 8, borderRadius: 12, padding: 12, borderWidth: 1 },

  actions:       { marginHorizontal: 16, marginTop: 12, gap: 10 },
  cancelBtn:     { borderWidth: 2, borderColor: '#DC2626', borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: '#FEF2F2' },
  reorderBtn:    { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  helpBtn:       { borderWidth: 1.5, borderColor: '#15803D', borderRadius: 14, paddingVertical: 13, alignItems: 'center', backgroundColor: '#F0FDF4' },

  quoteOverlay:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
})

const S2 = StyleSheet.create({
  section: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 10, borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  title:   { fontSize: 15, fontWeight: '800', color: '#1F2937', marginBottom: 12 },
  row:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  lbl:     { fontSize: 13, color: '#6B7280', flex: 1 },
  val:     { fontSize: 13, color: '#1F2937', fontWeight: '600', flex: 1.4, textAlign: 'right' },
})
