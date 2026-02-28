/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useCallback, useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, Linking, RefreshControl, Platform,
} from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../../../lib/supabase'
import { useAuth } from '../../../../contexts/AuthContext'
import { COLORS } from '../../../../lib/constants'
import { MapView, Marker, Polyline, PROVIDER_GOOGLE } from "../../../../components/MapView";
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import type { Region } from "../../../../components/MapView";
// ✅ REMOVED: import * as Notifications from 'expo-notifications'
// ✅ REMOVED: import { navigateFromNotification, markNotificationRead } from '../../../../services/notifications'
// Notifications are lazy-loaded below only on real device builds

// ─── Types ────────────────────────────────────────────────────────────────────
type OrderDetail = {
  // camelCase coordinate fields used by the UI (nullable)
  deliverylatitude?: number | null
  deliverylongitude?: number | null
  // hub origin in camelCase (nullable) — keep flexible to match returned payloads
  huborigin?: { lat?: number | null; lng?: number | null; label?: string | null } | null
  id: string; order_number: number; status: string
  order_type: string | null
  subtotal: number; delivery_fee: number; tax: number; discount: number
  total_amount: number; payment_method: string; payment_status: string
  delivery_address: string; delivery_address_label: string | null
  customer_notes: string | null; special_instructions: string | null
  delivery_instructions: string | null
  created_at: string; updated_at: string
  estimated_delivery_time: string | null; actual_delivery_time: string | null
  promo_code: string | null; promo_id: string | null
  cancellation_reason: string | null; cancelled_by: string | null
  rating: number | null; review: string | null
  items: any[]
  merchant_id: string | null; driver_id: string | null
  customer_phone: string | null; recipient_name: string | null
  delivery_latitude: number | null; delivery_longitude: number | null
  delivery_distance_km: number | null
  customer_location: any; driver_location: any
  hub_origin: { lat: number; lng: number; label: string } | null
}

type MerchantInfo = {
  id: string; business_name: string; logo_url: string | null
  phone: string | null; address: string | null
  latitude: number | null; longitude: number | null
}

type DriverInfo = { full_name: string | null; phone: string | null }
 
type LatLng = { latitude: number; longitude: number }


// ─── Timeline ─────────────────────────────────────────────────────────────────
const TIMELINE = [
  { key: 'pending',    label: 'Order Placed',    emoji: '🕐' },
  { key: 'confirmed',  label: 'Confirmed',        emoji: '✅' },
  { key: 'preparing',  label: 'Preparing',        emoji: '👨‍🍳' },
  { key: 'ready',      label: 'Ready for Pickup', emoji: '📦' },
  { key: 'picked_up',   label: 'Picked Up',        emoji: '🛵' },
  { key: 'on_the_way', label: 'On the Way',       emoji: '🚀' },
  { key: 'delivered',  label: 'Delivered',        emoji: '🎉' },
]

const STORE_TIMELINE = [
  { key: 'pending',    label: 'Order Placed',    emoji: '🕐' },
  { key: 'confirmed',  label: 'Order Confirmed', emoji: '✅' },
  { key: 'preparing',  label: 'Packing Items',   emoji: '📦' },
  { key: 'ready',      label: 'Ready to Ship',   emoji: '🚚' },
  { key: 'picked_up',   label: 'Dispatched',      emoji: '🛵' },
  { key: 'on_the_way', label: 'On the Way',      emoji: '🚀' },
  { key: 'delivered',  label: 'Delivered',       emoji: '🎉' },
]

const STATUS_ORDER  = ['pending','confirmed','preparing','ready','picked_up','on_the_way','delivered']
const ACTIVE        = ['pending','confirmed','preparing','ready','assigned','picked_up','on_the_way','out_for_delivery', 'delivered']
const CANCELLABLE   = ['pending','confirmed']

const CANCEL_REASONS = [
  'Ordered by mistake', 'Delivery taking too long',
  'Found a better option', 'Payment issue',
  'Changed my mind', 'Restaurant not responding',
]

const STATUS_COLORS: Record<string, string> = {
  pending:   '#F59E0B', confirmed: '#3B82F6', preparing: '#8B5CF6',
  ready:     '#10B981', assigned:  '#06B6D4', pickedup:  '#F97316',
  on_the_way:'#F97316', delivered: '#22C55E', cancelled: '#EF4444', rejected: '#EF4444',
}

// ─── Check if we can use push notifications ───────────────────────────────────
// Expo Go on Android (SDK 53+) does NOT support push notifications
const canUsePush =
  Device.isDevice &&
  !(Platform.OS === 'android' && Constants.appOwnership === 'expo')

// ─── Sub-components ───────────────────────────────────────────────────────────
function BillRow({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
      <Text style={{ color: '#6B7280', fontSize: 14 }}>{label}</Text>
      <Text style={{ fontWeight: '700', color: green ? '#15803D' : COLORS.text, fontSize: 14 }}>
        {value}
      </Text>
    </View>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function OrderDetailPage() {
  const { id }   = useLocalSearchParams<{ id: string }>()
  const router   = useRouter()
  const { user } = useAuth()

  const [order,      setOrder]     = useState<OrderDetail | null>(null)
  const [merchant,   setMerchant]  = useState<MerchantInfo | null>(null)
  const [driver,     setDriver]    = useState<DriverInfo | null>(null)
  const [loading,    setLoading]   = useState(true)
  const [refreshing, setRefreshing]= useState(false)
  const [driverCoords, setDriverCoords] = useState<{ latitude: number; longitude: number } | null>(null)

  // Review
  const [showReviewForm,    setShowReviewForm]    = useState(false)
  const [starRating,        setStarRating]        = useState(5)
  const [reviewText,        setReviewText]        = useState('')
  const [submittingReview,  setSubmittingReview]  = useState(false)
  const [reviewDone,        setReviewDone]        = useState(false)

  // Cancel
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason,    setCancelReason]    = useState('')
  const [cancelling,      setCancelling]      = useState(false)

  // ── Load ───────────────────────────────────────────────────────────────────
  const loadOrder = useCallback(async () => {
    if (!id || !user) return
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .eq('customer_id', user.id)
        .single()
      if (error) throw error

      setOrder(data as OrderDetail)
      if (data.driver_location?.lat && data.driver_location?.lng)
        setDriverCoords({ latitude: +data.driver_location.lat, longitude: +data.driver_location.lng })

      // Load merchant (restaurant orders only)
      if (data.merchant_id && data.order_type !== 'store') {
        const { data: m } = await supabase
          .from('merchants')
          .select('id,business_name,logo_url,phone,address,latitude,longitude')
          .eq('id', data.merchant_id)
          .maybeSingle()
        if (m) setMerchant(m as MerchantInfo)
      }

      // Load driver
      if (data.driver_id) {
        const { data: d } = await supabase
          .from('profiles')
          .select('full_name,phone')
          .eq('id', data.driver_id)
          .maybeSingle()
        if (d) setDriver(d as DriverInfo)
      }

      // Check review
      const { data: rev } = await supabase
        .from('reviews')
        .select('id')
        .eq('order_id', id)
        .maybeSingle()
      if (rev) setReviewDone(true)

    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load order', [
        { text: 'Back', onPress: () => router.back() },
      ])
    } finally {
      setLoading(false)
    }
  }, [id, user, router])

  useEffect(() => { loadOrder() }, [loadOrder])

  // ── Real-time updates ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return
    const sub = supabase.channel(`order-detail-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}`,
      }, payload => {
        const u = payload.new as any
        setOrder(prev => prev ? { ...prev, ...u } : u)
        if (u.driver_location?.lat && u.driver_location?.lng)
          setDriverCoords({ latitude: +u.driver_location.lat, longitude: +u.driver_location.lng })
      })
      .subscribe()
    return () => { sub.unsubscribe() }
  }, [id])

  // ── Notification tap handler — SAFE: only runs on real device builds ────────
  useEffect(() => {
    // 🛡️ Skip entirely in Expo Go (SDK 53 removed push from Expo Go)
    if (!canUsePush) return

    let sub: any = null
    // Lazy import — module never loads in Expo Go
    import('expo-notifications').then(Notifications => {
      sub = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data as any
        if (data?.order_id === id) {
          // Notification is for this order — just refresh
          loadOrder()
        } else {
          // Different order — navigate there
          if (data?.order_id) {
            router.push(`/(customer)/orders/${data.order_id}` as any)
          }
        }
      })
    })

    return () => { sub?.remove?.() }
  }, [id, loadOrder, router])

  const onRefresh = async () => { setRefreshing(true); await loadOrder(); setRefreshing(false) }

  // ── Review ─────────────────────────────────────────────────────────────────
  const handleSubmitReview = async () => {
    if (!order || !user || starRating < 1) return
    setSubmittingReview(true)
    try {
      const { error } = await supabase.from('reviews').insert({
        order_id:    order.id,
        customer_id: user.id,
        merchant_id: order.merchant_id ?? null,
        driver_id:   order.driver_id ?? null,
        rating:      starRating,
        comment:     reviewText.trim() || null,
        created_at:  new Date().toISOString(),
      })
      if (error) throw error
      await supabase.from('orders').update({
        rating: starRating, review: reviewText.trim() || null,
      }).eq('id', order.id)
      setReviewDone(true)
      setShowReviewForm(false)
      Alert.alert('🎉 Thank You!', 'Your review has been submitted!')
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to submit review')
    } finally { setSubmittingReview(false) }
  }
  

  // ── Cancel ─────────────────────────────────────────────────────────────────
  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) { Alert.alert('Required', 'Please give a reason.'); return }
    if (!order || !user) return
    setCancelling(true)
    try {
      await supabase.from('order_cancellations').insert({
        order_id:     order.id,
        customer_id:  user.id,
        reason:       cancelReason.trim(),
        cancelled_at: new Date().toISOString(),
      })
      await supabase.from('orders').update({
        status:              'cancelled',
        cancellation_reason: cancelReason.trim(),
        cancelled_by:        'customer',
      }).eq('id', order.id)
      setShowCancelModal(false)
      Alert.alert('Order Cancelled', 'Your order has been cancelled.', [
        { text: 'OK', onPress: () => router.push('/(customer)/orders' as any) },
      ])
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to cancel')
    } finally { setCancelling(false) }
  }

  // ── Guard ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <Stack.Screen options={{ title: 'Order Details' }} />
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  )
  if (!order) return null

  const isStore    = order.order_type === 'store' || order.merchant_id === null
  const isActive   = ACTIVE.includes(order.status)
  const canCancel  = CANCELLABLE.includes(order.status)
  const isDelivered = order.status === 'delivered'
  const isCancelled = order.status === 'cancelled'
  const currentStep = STATUS_ORDER.indexOf(order.status)
  const timeline    = isStore ? STORE_TIMELINE : TIMELINE

 

const toLatLng = (lat?: number | null, lng?: number | null): LatLng | null =>
  typeof lat === 'number' && typeof lng === 'number'
    ? { latitude: lat, longitude: lng }
    : null

const deliveryCoords = toLatLng(order?.deliverylatitude, order?.deliverylongitude)
const merchantCoords = toLatLng(merchant?.latitude, merchant?.longitude)
const hubCoords = toLatLng(order?.huborigin?.lat, order?.huborigin?.lng)
// driverCoords already looks like LatLng in your state; ensure it is exactly LatLng|null

const mapCenter: LatLng | null =
  driverCoords ?? merchantCoords ?? hubCoords ?? deliveryCoords

const hasCenter = !!mapCenter

const initialRegion: Region | undefined = mapCenter
  ? { ...mapCenter, latitudeDelta: 0.02, longitudeDelta: 0.02 }
  : undefined

const liveRegion: Region | undefined = driverCoords
  ? { ...driverCoords, latitudeDelta: 0.015, longitudeDelta: 0.015 }
  : initialRegion

  const STAR_LABELS: Record<number, string> = {
    5: '🎉 Excellent!', 4: '😊 Good', 3: '😐 Okay', 2: '😕 Not great', 1: '😢 Poor',
  }
  

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <Stack.Screen options={{
        title: `Order #${order.order_number}`,
        headerStyle:      { backgroundColor: isStore ? '#5B21B6' : COLORS.primary },
        headerTintColor:  '#fff',
        headerTitleStyle: { fontWeight: '800' },
      }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* ── Status Hero ──────────────────────────────────────────────── */}
        <View style={[
          S.hero,
          isCancelled && { backgroundColor: '#EF4444' },
          isDelivered && { backgroundColor: '#10B981' },
          isStore && !isCancelled && !isDelivered && { backgroundColor: '#5B21B6' },
        ]}>
          <Text style={{ fontSize: 48, marginBottom: 8 }}>
            {isDelivered ? '🎉' : isCancelled ? '❌' : isStore ? '🛍️' : isActive ? '🔄' : '📋'}
          </Text>
          <Text style={S.heroStatus}>
            {order.status.replace(/_/g, ' ').toUpperCase()}
          </Text>
          <Text style={S.heroSub}>Order #{order.order_number}</Text>
          {isStore && (
            <View style={S.sourceChip}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                🛍️ PBExpress Store · Patti, Punjab
              </Text>
            </View>
          )}
          {isActive && order.estimated_delivery_time && (
            <View style={S.etaChip}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                🕐 ETA {new Date(order.estimated_delivery_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}
          {isDelivered && order.actual_delivery_time && (
            <View style={S.etaChip}>
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>
                Delivered at {new Date(order.actual_delivery_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}
        </View>

        {/* ── Live Map ──────────────────────────────────────────────────── */}
     {isActive && initialRegion ? (
 <MapView
  style={S.map}
  provider={PROVIDER_GOOGLE}
  initialRegion={initialRegion}
  region={liveRegion}
  showsUserLocation
>
            {merchantCoords && (
              <Marker coordinate={merchantCoords} title={merchant?.business_name ?? 'Restaurant'} pinColor="#FF6B35" />
            )}
            {isStore && hubCoords && (
              <Marker coordinate={hubCoords} title="PBExpress Hub — Patti" pinColor="#7C3AED" />
            )}
            {deliveryCoords && (
              <Marker coordinate={deliveryCoords} title="Your Location" pinColor="#10B981" />
            )}
            {driverCoords && (
              <Marker coordinate={driverCoords} title="Driver" pinColor="#3B82F6" />
            )}
            {driverCoords && deliveryCoords && (
              <Polyline
                coordinates={[driverCoords, deliveryCoords]}
                strokeColor={COLORS.primary} strokeWidth={3} lineDashPattern={[6, 3]}
              />
            )}
  </MapView>
) : isActive ? (
  <View style={{ padding: 12 }}>
    <Text style={{ color: COLORS.textMuted }}>Tracking will appear once location is available.</Text>
  </View>
) : null}

        {/* ── Status Timeline ───────────────────────────────────────────── */}
        {!isCancelled && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>📍 Order Progress</Text>
            {timeline.map((step, idx) => {
              const stepIdx   = STATUS_ORDER.indexOf(step.key)
              const done      = stepIdx <= currentStep
              const isCurrent = step.key === order.status ||
                (step.key === 'pickedup' && order.status === 'assigned')
              const nextDone  = idx < timeline.length - 1 &&
                STATUS_ORDER.indexOf(timeline[idx + 1].key) <= currentStep

              return (
                <View key={step.key} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{ alignItems: 'center', width: 38 }}>
                    <View style={[
                      S.dot,
                      done      && S.dotDone,
                      isCurrent && S.dotCurrent,
                      !done     && S.dotPending,
                    ]}>
                      {done
                        ? <Text style={{ fontSize: 13 }}>{step.emoji}</Text>
                        : <View style={S.dotEmpty} />
                      }
                    </View>
                    {idx < timeline.length - 1 && (
                      <View style={[S.line, nextDone && S.lineDone]} />
                    )}
                  </View>
                  <View style={{ flex: 1, paddingLeft: 12, paddingBottom: 22, paddingTop: 5 }}>
                    <Text style={[
                      S.stepLabel,
                      done      && { color: COLORS.text, fontWeight: '700' },
                      isCurrent && { color: COLORS.primary, fontWeight: '800' },
                    ]}>
                      {step.label}
                    </Text>
                    {isCurrent && (
                      <Text style={{ fontSize: 11, color: COLORS.primary, marginTop: 2, fontWeight: '600' }}>
                        ● Current status
                      </Text>
                    )}
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* ── Cancelled Banner ──────────────────────────────────────────── */}
        {isCancelled && (
          <View style={S.cancelBanner}>
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#991B1B', marginBottom: 4 }}>
              ❌ Order Cancelled
            </Text>
            {order.cancellation_reason && (
              <Text style={{ color: '#7F1D1D', fontSize: 13 }}>
                Reason: {order.cancellation_reason}
              </Text>
            )}
            {order.cancelled_by && (
              <Text style={{ color: '#B91C1C', fontSize: 12, marginTop: 3 }}>
                Cancelled by: {order.cancelled_by}
              </Text>
            )}
          </View>
        )}

        {/* ── Source / Merchant ─────────────────────────────────────────── */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>
            {isStore ? '🛍️ Order Source' : '🏪 Restaurant'}
          </Text>
          {isStore ? (
            <View style={S.storeOriginCard}>
              <Text style={{ fontSize: 28, marginRight: 12 }}>🏪</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', color: '#5B21B6', fontSize: 15 }}>
                  PBExpress Store
                </Text>
                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                  Patti, Punjab 143416
                </Text>
                {order.hub_origin && (
                  <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                    📍 {order.hub_origin.label}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={S.contactBtn}
                onPress={() => Linking.openURL('tel:+918400009045')}
              >
                <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 13 }}>📞 Help</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={{ fontWeight: '800', fontSize: 15, color: COLORS.text }}>
                {merchant?.business_name}
              </Text>
              {merchant?.address && (
                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 3, lineHeight: 18 }}>
                  {merchant.address}
                </Text>
              )}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                {merchant?.phone && (
                  <TouchableOpacity
                    style={S.contactBtn}
                    onPress={() => Linking.openURL(`tel:${merchant.phone}`)}
                  >
                    <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 13 }}>📞 Call</Text>
                  </TouchableOpacity>
                )}
                {merchant?.phone && (
                  <TouchableOpacity
                    style={S.contactBtn}
                    onPress={() => Linking.openURL(
                      `https://wa.me/${merchant.phone?.replace(/\D/g, '')}?text=Hi! My order is %23${order.order_number}`
                    )}
                  >
                    <Text style={{ color: '#15803D', fontWeight: '700', fontSize: 13 }}>💬 WhatsApp</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

          {/* Driver card */}
          {driver && (isActive || isDelivered) && (
            <View style={S.driverCard}>
              <Text style={{ fontSize: 28 }}>🛵</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontWeight: '800', color: COLORS.text, fontSize: 15 }}>
                  {driver.full_name || 'Your Driver'}
                </Text>
                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>Delivery Partner</Text>
              </View>
              {driver.phone && (
                <TouchableOpacity
                  style={S.callBtn}
                  onPress={() => Linking.openURL(`tel:${driver.phone}`)}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>📞 Call</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* ── Items ─────────────────────────────────────────────────────── */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>
            {isStore ? '🛍️ Ordered Products' : '🛒 Items'} ({(order.items ?? []).length})
          </Text>
          {(order.items ?? []).map((item: any, i: number) => {
            const isFreeItem = item.is_free || item.price === 0
            const disc       = item.discount_percentage ? item.price * item.discount_percentage / 100 : 0
            const effective  = (item.price - disc) * item.quantity
            return (
              <View key={item.id ?? i} style={[S.itemRow, isFreeItem && { backgroundColor: '#F0FDF4' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: isFreeItem ? '#065F46' : COLORS.text, fontSize: 14 }} numberOfLines={2}>
                    {item.name}
                  </Text>
                  {item.category && (
                    <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{item.category}</Text>
                  )}
                  {isFreeItem && (
                    <View style={{ alignSelf: 'flex-start', backgroundColor: '#16A34A', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, marginTop: 3 }}>
                      <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>FREE</Text>
                    </View>
                  )}
                </View>
                <Text style={{ color: '#6B7280', marginHorizontal: 14, fontSize: 13 }}>
                  ×{item.quantity}
                </Text>
                <Text style={{ fontWeight: '700', color: isFreeItem ? '#065F46' : COLORS.text }}>
                  {isFreeItem ? 'FREE' : `₹${effective.toFixed(0)}`}
                </Text>
              </View>
            )
          })}
        </View>

        {/* ── Bill ──────────────────────────────────────────────────────── */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>🧾 Bill Details</Text>
          <BillRow label="Subtotal" value={`₹${Number(order.subtotal).toFixed(2)}`} />
          {Number(order.discount) > 0 && (
            <BillRow
              label={`Promo${order.promo_code ? ` (${order.promo_code})` : ''}`}
              value={`-₹${Number(order.discount).toFixed(2)}`}
              green
            />
          )}
          <BillRow label="Delivery Fee" value={`₹${Number(order.delivery_fee).toFixed(2)}`} />
          {Number(order.tax) > 0 && (
            <BillRow label="Taxes & Fees" value={`₹${Number(order.tax).toFixed(2)}`} />
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 14, borderTopWidth: 2, borderTopColor: '#F3F4F6', marginTop: 6 }}>
            <Text style={{ fontSize: 17, fontWeight: '900', color: COLORS.text }}>Total Paid</Text>
            <Text style={{ fontSize: 18, fontWeight: '900', color: COLORS.primary }}>
              ₹{Number(order.total_amount).toFixed(2)}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>
            {order.payment_method?.toUpperCase()} · {order.payment_status?.toUpperCase()}
            {order.delivery_distance_km
              ? `  ·  📏 ${Number(order.delivery_distance_km).toFixed(1)} km${isStore ? ' from Patti' : ''}`
              : ''
            }
          </Text>
        </View>

        {/* ── Delivery Address ──────────────────────────────────────────── */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>📍 Delivery Address</Text>
          {order.delivery_address_label && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Text style={{ fontSize: 16 }}>
                {order.delivery_address_label === 'Home' ? '🏠'
                  : order.delivery_address_label === 'Work' ? '🏢' : '📍'}
              </Text>
              <Text style={{ fontWeight: '700', color: COLORS.text }}>{order.delivery_address_label}</Text>
            </View>
          )}
          {order.recipient_name && (
            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>
              👤 {order.recipient_name}
            </Text>
          )}
          <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 22 }}>
            {order.delivery_address}
          </Text>
          {order.delivery_instructions && (
            <View style={S.noteBox}>
              <Text style={{ fontSize: 13, color: '#92400E' }}>
                📋 {order.delivery_instructions}
              </Text>
            </View>
          )}
          {order.special_instructions && (
            <View style={S.noteBox}>
              <Text style={{ fontSize: 13, color: COLORS.text }}>
                📝 {order.special_instructions}
              </Text>
            </View>
          )}
          {order.customer_notes && (
            <View style={S.noteBox}>
              <Text style={{ fontSize: 13, color: COLORS.text }}>
                💬 {order.customer_notes}
              </Text>
            </View>
          )}
        </View>

        {/* ── Review ────────────────────────────────────────────────────── */}
        {isDelivered && !reviewDone && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>⭐ Rate Your Experience</Text>
            {!showReviewForm ? (
              <TouchableOpacity style={S.reviewCta} onPress={() => setShowReviewForm(true)}>
                <Text style={{ fontSize: 32 }}>⭐</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontWeight: '800', color: COLORS.text, fontSize: 15 }}>
                    How was your {isStore ? 'order' : 'food'}?
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                    Help others with your feedback
                  </Text>
                </View>
                <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 20 }}>→</Text>
              </TouchableOpacity>
            ) : (
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
                  {[1,2,3,4,5].map(s => (
                    <TouchableOpacity key={s} onPress={() => setStarRating(s)}>
                      <Text style={{ fontSize: 38, opacity: s <= starRating ? 1 : 0.25 }}>⭐</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={{ textAlign: 'center', fontWeight: '800', color: COLORS.text, marginBottom: 14, fontSize: 16 }}>
                  {STAR_LABELS[starRating]}
                </Text>
                <TextInput
                  style={S.reviewInput}
                  multiline numberOfLines={3}
                  placeholder="Share your experience (optional)..."
                  value={reviewText}
                  onChangeText={setReviewText}
                  placeholderTextColor="#9CA3AF"
                  textAlignVertical="top"
                />
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <TouchableOpacity style={S.reviewCancelBtn} onPress={() => setShowReviewForm(false)}>
                    <Text style={{ fontWeight: '700', color: '#6B7280' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[S.reviewSubmitBtn, submittingReview && { opacity: 0.6 }]}
                    onPress={handleSubmitReview}
                    disabled={submittingReview}
                  >
                    {submittingReview
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={{ color: '#fff', fontWeight: '800' }}>Submit Review</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Review done */}
        {isDelivered && reviewDone && (
          <View style={S.section}>
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>🙏</Text>
              <Text style={{ fontWeight: '800', color: COLORS.text, fontSize: 16 }}>Review Submitted</Text>
              <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                Thank you for your feedback!
              </Text>
              {order.rating && (
                <Text style={{ marginTop: 8, fontSize: 20 }}>{'⭐'.repeat(order.rating)}</Text>
              )}
            </View>
          </View>
        )}

        {/* ── Reorder (restaurant only) ─────────────────────────────────── */}
        {isDelivered && !isStore && (
          <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
            <TouchableOpacity
              style={S.reorderBtn}
              onPress={() => router.push(`/(customer)/restaurant/${order.merchant_id}` as any)}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
                🔄 Reorder from {merchant?.business_name}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Shop again (store orders) ──────────────────────────────────── */}
        {isDelivered && isStore && (
          <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
            <TouchableOpacity
              style={[S.reorderBtn, { backgroundColor: '#5B21B6' }]}
              onPress={() => router.push('/(customer)/store' as any)}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
                🛍️ Shop Again in PBExpress Store
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Cancel ───────────────────────────────────────────────────── */}
        {canCancel && (
          <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
            <TouchableOpacity style={S.cancelBtn} onPress={() => setShowCancelModal(true)}>
              <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 14 }}>❌ Cancel This Order</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>

      {/* ── Cancel Modal ──────────────────────────────────────────────── */}
      {showCancelModal && (
        <View style={S.overlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={S.modal}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: COLORS.text, marginBottom: 4, textAlign: 'center' }}>
                Cancel Order #{order.order_number}?
              </Text>
              <Text style={{ color: '#6B7280', textAlign: 'center', marginBottom: 16, fontSize: 13 }}>
                Select a reason or describe below
              </Text>
              {CANCEL_REASONS.map(r => (
                <TouchableOpacity
                  key={r}
                  style={[S.reasonBtn, cancelReason === r && S.reasonBtnActive]}
                  onPress={() => setCancelReason(r)}
                >
                  <Text style={[{ fontWeight: '600', color: '#4B5563', fontSize: 13 }, cancelReason === r && { color: COLORS.primary }]}>
                    {cancelReason === r ? '● ' : '○ '}{r}
                  </Text>
                </TouchableOpacity>
              ))}
              <TextInput
                style={S.reasonInput}
                placeholder="Or type your own reason..."
                value={cancelReason}
                onChangeText={setCancelReason}
                placeholderTextColor="#9CA3AF"
              />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity
                  style={[S.modalBtn, { backgroundColor: '#F3F4F6', flex: 1 }]}
                  onPress={() => { setShowCancelModal(false); setCancelReason('') }}
                >
                  <Text style={{ fontWeight: '700', color: '#6B7280' }}>Keep Order</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[S.modalBtn, { backgroundColor: '#EF4444', flex: 1 }, (!cancelReason.trim() || cancelling) && { opacity: 0.5 }]}
                  onPress={handleCancelOrder}
                  disabled={!cancelReason.trim() || cancelling}
                >
                  {cancelling
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={{ color: '#fff', fontWeight: '800' }}>Cancel Order</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  )
}

const S = StyleSheet.create({
  hero:         { backgroundColor: COLORS.primary, padding: 28, alignItems: 'center' },
  heroStatus:   { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 4 },
  heroSub:      { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  sourceChip:   { marginTop: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  etaChip:      { marginTop: 10, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  map:          { height: 210, width: '100%' },
  section:      { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 10, borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 14 },
  dot:          { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dotDone:      { backgroundColor: '#D1FAE5', borderWidth: 2, borderColor: '#10B981' },
  dotCurrent:   { backgroundColor: '#FFF3EE', borderWidth: 2.5, borderColor: COLORS.primary },
  dotPending:   { backgroundColor: '#F3F4F6', borderWidth: 2, borderColor: '#D1D5DB' },
  dotEmpty:     { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D1D5DB' },
  line:         { width: 2, height: 26, backgroundColor: '#E5E7EB', marginTop: 2 },
  lineDone:     { backgroundColor: '#10B981' },
  stepLabel:    { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
  cancelBanner: { marginHorizontal: 16, marginTop: 10, backgroundColor: '#FEF2F2', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#FECACA' },
  storeOriginCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F3FF', borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: '#DDD6FE' },
  contactBtn:   { borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  driverCard:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9FF', borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#BAE6FD' },
  callBtn:      { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  itemRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 4 },
  noteBox:      { backgroundColor: '#FFF7F4', borderRadius: 10, padding: 10, marginTop: 10, borderWidth: 1, borderColor: '#FFD5C2' },
  reviewCta:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7F4', borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: '#FED7AA' },
  reviewInput:  { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.text, minHeight: 80 },
  reviewCancelBtn:  { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: '#F3F4F6' },
  reviewSubmitBtn:  { flex: 2, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.primary },
  reorderBtn:   { backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
  cancelBtn:    { borderWidth: 1.5, borderColor: '#EF4444', borderRadius: 14, padding: 14, alignItems: 'center' },
  overlay:      { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100 },
  modal:        { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '90%', elevation: 16, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } },
  reasonBtn:    { paddingVertical: 11, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB', marginBottom: 8 },
  reasonBtnActive: { borderColor: COLORS.primary, backgroundColor: '#FFF3EE' },
  reasonInput:  { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 14, color: COLORS.text, marginTop: 6, minHeight: 70 },
  modalBtn:     { alignItems: 'center', paddingVertical: 13, borderRadius: 12 },
})
