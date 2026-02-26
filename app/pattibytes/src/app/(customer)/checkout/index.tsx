 
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import * as Location from 'expo-location'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { useCart } from '../../../contexts/CartContext'
import { COLORS } from '../../../lib/constants'
import {
  getSavedAddresses, type SavedAddress,
  getRoadDistanceKm,
} from '../../../services/location'
import { promoCodeService, type PromoCode } from '../../../services/promoCodes'

// ─── Types ────────────────────────────────────────────────────────────────────
type AppSettings = {
  delivery_fee_enabled: boolean
  base_delivery_radius_km: number
  per_km_fee_beyond_base: number
  gst_enabled?: boolean
  gst_percentage?: number
  hub_latitude?: number | null
  hub_longitude?: number | null
}

type MerchantGeo = {
  latitude: number | null
  longitude: number | null
  gst_enabled: boolean
  gst_percentage: number | null
  phone?: string | null
}

type BxGyGift = {
  menuItemId: string
  name: string
  qty: number
  price: number
  promoCode?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatAddr(a: SavedAddress): string {
  const parts: string[] = [a.address]
  if (a.apartment_floor) parts.push(`Flat/Floor: ${a.apartment_floor}`)
  if (a.landmark) parts.push(`Landmark: ${a.landmark}`)
  if (a.city) parts.push(a.city + (a.state ? `, ${a.state}` : ''))
  if (a.postal_code) parts.push(a.postal_code)
  return parts.filter(Boolean).join('\n')
}

function calcFee(distKm: number, settings: AppSettings): { fee: number; breakdown: string } {
  const BASE_KM  = settings.base_delivery_radius_km ?? 3
  const BASE_FEE = 35
  const PER_KM   = settings.per_km_fee_beyond_base ?? 15
  if (distKm <= BASE_KM) {
    return { fee: BASE_FEE, breakdown: `Base ₹${BASE_FEE} (≤${BASE_KM} km)` }
  }
  const extra = Math.ceil((distKm - BASE_KM) * PER_KM)
  return {
    fee: BASE_FEE + extra,
    breakdown: `₹${BASE_FEE} + ₹${extra} (${(distKm - BASE_KM).toFixed(1)} km × ₹${PER_KM}/km)`,
  }
}

// ─── BillRow ──────────────────────────────────────────────────────────────────
function BillRow({
  label, value, green, sub,
}: { label: string; value: string; green?: boolean; sub?: string }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: '#6B7280', fontSize: 14 }}>{label}</Text>
        <Text style={{ fontWeight: '700', color: green ? '#15803D' : COLORS.text, fontSize: 14 }}>
          {value}
        </Text>
      </View>
      {!!sub && <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{sub}</Text>}
    </View>
  )
}

// ─── PayMethodCard ────────────────────────────────────────────────────────────
function PayMethodCard({
  selected, emoji, label, sub, onPress, disabled,
}: {
  selected: boolean; emoji: string; label: string
  sub?: string; onPress: () => void; disabled?: boolean
}) {
  return (
    <TouchableOpacity
      style={[S.payCard, selected && S.payCardActive, disabled && { opacity: 0.4 }]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={{ fontSize: 24, marginRight: 12 }}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '800', color: COLORS.text, fontSize: 14 }}>{label}</Text>
        {!!sub && <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{sub}</Text>}
      </View>
      <View style={[S.radio, selected && S.radioActive]}>
        {selected && <View style={S.radioDot} />}
      </View>
    </TouchableOpacity>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const { user }        = useAuth()
  const router          = useRouter()
  const { cart, clearCart } = useCart()
  const params = useLocalSearchParams<{
    delivery_fee: string; delivery_distance: string; tax: string
    promo_code: string; promo_discount: string; final_total: string
    address_id: string; bxgy_gifts: string
  }>()

  // ── State ──────────────────────────────────────────────────────────────────
  const [addresses,      setAddresses]      = useState<SavedAddress[]>([])
  const [selectedAddr,   setSelectedAddr]   = useState<SavedAddress | null>(null)
  const [showAddrModal,  setShowAddrModal]  = useState(false)

  const [deliveryFee,       setDeliveryFee]       = useState(Number(params.delivery_fee ?? 35))
  const [deliveryKm,        setDeliveryKm]        = useState(Number(params.delivery_distance ?? 0))
  const [deliveryBreakdown, setDeliveryBreakdown] = useState('')
  const [showDeliveryFee,   setShowDeliveryFee]   = useState(true)

  const [appliedPromo,    setAppliedPromo]    = useState<PromoCode | null>(null)
  const [promoDiscount,   setPromoDiscount]   = useState(Number(params.promo_discount ?? 0))
  const [promoInput,      setPromoInput]      = useState('')
  const [applyingPromo,   setApplyingPromo]   = useState(false)
  const [availablePromos, setAvailablePromos] = useState<PromoCode[]>([])
  const [showPromoList,   setShowPromoList]   = useState(false)
  const [bxgyGifts,       setBxgyGifts]       = useState<BxGyGift[]>(
    params.bxgy_gifts ? JSON.parse(params.bxgy_gifts) : []
  )

  const [notes,        setNotes]       = useState('')
  const [specialInst,  setSpecialInst] = useState('')
  const [payMethod,    setPayMethod]   = useState<'cod' | 'online'>('cod')

  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locLoading,   setLocLoading]   = useState(false)

  const [appSettings,  setAppSettings]  = useState<AppSettings | null>(null)
  const [merchantGeo,  setMerchantGeo]  = useState<MerchantGeo | null>(null)
  const [gstEnabled,   setGstEnabled]   = useState(false)
  const [gstPct,       setGstPct]       = useState(0)
  const [placing,      setPlacing]      = useState(false)
  const [loading,      setLoading]      = useState(true)

  const watchRef   = useRef<Location.LocationSubscription | null>(null)
  const orderIdRef = useRef<string | null>(null)

  // ── Subtotal ───────────────────────────────────────────────────────────────
  const subtotal = useMemo(() => {
    if (!cart?.items?.length) return 0
    return cart.items.reduce((sum, item) => {
      const disc = (item.discount_percentage ?? 0) > 0
        ? item.price * (item.discount_percentage! / 100) : 0
      return sum + (item.price - disc) * item.quantity
    }, 0)
  }, [cart?.items])

  // ── Load ───────────────────────────────────────────────────────────────────
  const loadCheckout = useCallback(async () => {
    if (!user || !cart?.merchant_id) return
    setLoading(true)
    try {
      const [{ data: appRow }, addrList, { data: merch }, promos] = await Promise.all([
        supabase.from('app_settings')
          .select('delivery_fee_enabled,base_delivery_radius_km,per_km_fee_beyond_base,hub_latitude,hub_longitude')
          .limit(1).maybeSingle(),
        getSavedAddresses(user.id),
        supabase.from('merchants')
          .select('latitude,longitude,gst_enabled,gst_percentage,phone')
          .eq('id', cart.merchant_id).maybeSingle(),
        promoCodeService.getActivePromos(cart.merchant_id),
      ])

      const settings = (appRow ?? {
        delivery_fee_enabled: true,
        base_delivery_radius_km: 3,
        per_km_fee_beyond_base: 15,
      }) as AppSettings
      setAppSettings(settings)
      setShowDeliveryFee(settings.delivery_fee_enabled !== false)

      setAddresses(addrList ?? [])
      const addrId = params.address_id
      const found  = addrId
        ? addrList?.find(a => a.id === addrId)
        : addrList?.find(a => a.is_default) ?? addrList?.[0]
      setSelectedAddr(found ?? null)

      if (merch) {
        setMerchantGeo(merch as MerchantGeo)
        setGstEnabled(!!merch.gst_enabled)
        setGstPct(Number(merch.gst_percentage ?? 0))
      }

      setAvailablePromos(promos ?? [])

      // Re-validate promo passed from cart
      if (params.promo_code && user) {
        const res = await promoCodeService.validatePromoCode(
          params.promo_code, subtotal, user.id, { merchantId: cart.merchant_id }
        )
        if (res.valid && res.promoCode) {
          setAppliedPromo(res.promoCode)
          setPromoDiscount(Number(params.promo_discount ?? res.discount))
          if (res.promoCode.deal_type === 'bxgy' && params.bxgy_gifts) {
            setBxgyGifts(JSON.parse(params.bxgy_gifts))
          }
        }
      }
    } catch (e: any) {
      console.warn('checkout load', e.message)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, cart?.merchant_id, params.address_id, params.promo_code])

  useEffect(() => { loadCheckout() }, [loadCheckout])

  // ── Recompute delivery fee when address changes ────────────────────────────
  useEffect(() => {
    if (!selectedAddr || !merchantGeo || !appSettings) return
    if (!merchantGeo.latitude || !merchantGeo.longitude) return
    if (!selectedAddr.latitude || !selectedAddr.longitude) return
    ;(async () => {
      try {
        const dist = await getRoadDistanceKm(
          merchantGeo.latitude!, merchantGeo.longitude!,
          selectedAddr.latitude!, selectedAddr.longitude!
        )
        setDeliveryKm(dist)
        const { fee, breakdown } = calcFee(dist, appSettings)
        setDeliveryFee(showDeliveryFee ? fee : 0)
        setDeliveryBreakdown(breakdown)
      } catch {
        const { fee, breakdown } = calcFee(0, appSettings)
        setDeliveryFee(fee); setDeliveryBreakdown(breakdown)
      }
    })()
  }, [selectedAddr, merchantGeo, appSettings, showDeliveryFee])

  // ── Totals ─────────────────────────────────────────────────────────────────
  const taxAmount = useMemo(() => {
    if (!gstEnabled || gstPct <= 0) return 0
    return Math.round((subtotal - promoDiscount) * (gstPct / 100) * 100) / 100
  }, [subtotal, promoDiscount, gstEnabled, gstPct])

  const finalTotal = useMemo(() => {
    const base = subtotal - promoDiscount + (showDeliveryFee ? deliveryFee : 0) + taxAmount
    return Math.max(0, Math.round(base * 100) / 100)
  }, [subtotal, promoDiscount, deliveryFee, showDeliveryFee, taxAmount])

  const totalSavings = useMemo(() => {
    const itemSavings = (cart?.items ?? []).reduce((s, i) => {
      const d = (i.discount_percentage ?? 0) > 0
        ? i.price * (i.discount_percentage! / 100) * i.quantity : 0
      return s + d
    }, 0)
    return Math.round((itemSavings + promoDiscount) * 100) / 100
  }, [cart?.items, promoDiscount])

  // ── Promo helpers ──────────────────────────────────────────────────────────
  const applyPromoObj = (promo: PromoCode) => {
    if (promo.deal_type === 'bxgy') {
      setAppliedPromo(promo)
      const freeVal = bxgyGifts.reduce((s, g) => s + g.price * g.qty, 0)
      setPromoDiscount(Math.round(freeVal * 100) / 100)
      return
    }
    let disc = 0
    if (promo.discount_type === 'percentage') {
      disc = subtotal * (promo.discount_value / 100)
      if ((promo.max_discount_amount ?? 0) > 0)
        disc = Math.min(disc, promo.max_discount_amount!)
    } else {
      disc = promo.discount_value
    }
    setAppliedPromo(promo)
    setPromoDiscount(Math.round(disc * 100) / 100)
    setBxgyGifts([])
  }

  const handleApplyPromo = async () => {
    if (!promoInput.trim() || !cart?.merchant_id || !user) return
    setApplyingPromo(true)
    try {
      const result = await promoCodeService.validatePromoCode(
        promoInput.trim(), subtotal, user.id, { merchantId: cart.merchant_id }
      )
      if (!result.valid) { Alert.alert('Invalid Promo', result.message); return }
      applyPromoObj(result.promoCode!)
      setPromoInput('')
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setApplyingPromo(false)
    }
  }

  // ── Live location ──────────────────────────────────────────────────────────
  const detectLocation = async () => {
    setLocLoading(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission required.')
        return
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      setLiveLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
    } catch (e: any) {
      Alert.alert('Location Error', e.message)
    } finally {
      setLocLoading(false)
    }
  }

  const startWatch = useCallback(async () => {
    if (watchRef.current || !orderIdRef.current) return
    watchRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 8000, distanceInterval: 20 },
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        setLiveLocation({ lat, lng })
        if (orderIdRef.current) {
          await supabase.from('orders').update({
            customer_location: { lat, lng, updated_at: new Date().toISOString() },
          }).eq('id', orderIdRef.current)
        }
      }
    )
  }, [])

  useEffect(() => () => { watchRef.current?.remove() }, [])

  // ── Place Order ────────────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (!user || !cart?.items?.length || !selectedAddr) {
      Alert.alert('Incomplete', 'Please add a delivery address.')
      return
    }
    if (payMethod === 'online') {
      Alert.alert('Coming Soon', 'Online payments coming soon. Please use Cash on Delivery.')
      return
    }

    setPlacing(true)
    try {
      const { count } = await supabase.from('orders')
        .select('*', { count: 'exact', head: true })
      const orderNum = (count ?? 0) + 1
      const eta = new Date(Date.now() + 40 * 60 * 1000)

      // ── Build base items ──────────────────────────────────────────────────
      const orderItems = cart.items.map(i => ({
        id:                  i.id,
        menu_item_id:        i.id,
        name:                i.name,
        price:               i.price,
        quantity:            i.quantity,
        discount_percentage: i.discount_percentage ?? 0,
        image_url:           i.image_url ?? null,
        category:            i.category ?? null,
        is_veg:              i.is_veg ?? null,
        merchant_id:         cart.merchant_id,
        is_free:             false,
        free_qty:            0,
      }))

      // ── Inject BxGy free items properly ──────────────────────────────────
      // Rules:
      //   - If item already in cart: add a separate "FREE" line-item at ₹0
      //   - If item not in cart: push new line-item with price ₹0
      for (const gift of bxgyGifts) {
        // Always add as a separate FREE line so merchant sees it clearly
        orderItems.push({
          id:                  `${gift.menuItemId}_free`,
          menu_item_id:        gift.menuItemId,
          name:                `${gift.name} 🎁 FREE`,
          price:               0,           // ← ₹0 so total reduces correctly
          quantity:            gift.qty,
          discount_percentage: 100,
          image_url:           null,
          category:            'Promo Gift',
          is_veg:              null,
          merchant_id:         cart.merchant_id,
          is_free:             true,
          free_qty:            gift.qty,
        })
      }

      const { data: order, error } = await supabase.from('orders').insert({
        customer_id:             user.id,
        merchant_id:             cart.merchant_id,
        order_number:            orderNum,
        status:                  'pending',
        subtotal:                subtotal,
        delivery_fee:            showDeliveryFee ? deliveryFee : 0,
        tax:                     taxAmount,
        discount:                promoDiscount,
        total_amount:            finalTotal,
        payment_method:          payMethod,
        payment_status:          'pending',
        delivery_address:        formatAddr(selectedAddr),
        delivery_latitude:       selectedAddr.latitude ?? null,
        delivery_longitude:      selectedAddr.longitude ?? null,
        delivery_distance_km:    deliveryKm > 0 ? parseFloat(deliveryKm.toFixed(2)) : null,
        customer_phone:          selectedAddr.recipient_phone ?? null,
        special_instructions:    specialInst.trim() || null,
        customer_notes:          notes.trim() || null,
        promo_code:              appliedPromo?.code ?? null,
        customer_location:       liveLocation
          ? { ...liveLocation, updated_at: new Date().toISOString() } : null,
        items:                   orderItems,
        preparation_time:        30,
        estimated_delivery_time: eta.toISOString(),
        created_at:              new Date().toISOString(),
      }).select().single()

      if (error) throw error

      // ── Record promo usage ─────────────────────────────────────────────
      if (appliedPromo && order) {
        await supabase.from('promo_usage').insert({
          promo_code_id: appliedPromo.id,
          order_id:      order.id,
          user_id:       user.id,
          discount:      promoDiscount,
          used_at:       new Date().toISOString(),
        })
        // Increment used_count
        await supabase.from('promo_codes')
          .update({ used_count: (appliedPromo.used_count ?? 0) + 1 })
          .eq('id', appliedPromo.id)
      }

      orderIdRef.current = order.id
      startWatch()
      clearCart()
      router.replace(`/(customer)/orders/${order.id}` as any)

    } catch (e: any) {
      Alert.alert('Order Failed', e.message ?? 'Please try again.')
    } finally {
      setPlacing(false)
    }
  }

  // ── Guard ──────────────────────────────────────────────────────────────────
  if (loading || !cart) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <Stack.Screen options={{ title: 'Checkout' }} />
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <Stack.Screen options={{ title: 'Checkout' }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>

          {/* ── Step 1: Delivery Address ────────────────────────────── */}
          <View style={S.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={S.secTitle}>📍 Delivery Address</Text>
              <TouchableOpacity onPress={() => setShowAddrModal(true)}>
                <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 13 }}>
                  {addresses.length === 0 ? 'Add' : 'Change'}
                </Text>
              </TouchableOpacity>
            </View>

            {selectedAddr ? (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <View style={S.addrIcon}>
                    <Text style={{ fontSize: 18 }}>
                      {selectedAddr.label === 'Home' ? '🏠'
                        : selectedAddr.label === 'Work' ? '🏢' : '📍'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '800', color: COLORS.text, fontSize: 15 }}>
                      {selectedAddr.label}
                    </Text>
                    {!!selectedAddr.recipient_name && (
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>
                        {selectedAddr.recipient_name}
                        {selectedAddr.recipient_phone ? ` · ${selectedAddr.recipient_phone}` : ''}
                      </Text>
                    )}
                    <Text style={{ fontSize: 13, color: '#4B5563', marginTop: 4, lineHeight: 20 }}>
                      {formatAddr(selectedAddr)}
                    </Text>
                    {!!selectedAddr.delivery_instructions && (
                      <View style={S.instrBox}>
                        <Text style={{ fontSize: 12, color: '#92400E' }}>
                          {`📋 ${selectedAddr.delivery_instructions}`}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                {showDeliveryFee && !!deliveryBreakdown && (
                  <View style={{ backgroundColor: '#F0F9FF', borderRadius: 8, padding: 10, marginTop: 10 }}>
                    <Text style={{ fontSize: 12, color: '#0369A1', fontWeight: '600' }}>
                      {`🚚 Delivery: ${deliveryBreakdown}`}
                    </Text>
                    {deliveryKm > 0 && (
                      <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                        {`Distance: ${deliveryKm.toFixed(1)} km`}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={S.addAddrBanner}
                onPress={() => router.push('/(customer)/addresses' as any)}
              >
                <Text style={{ fontSize: 24 }}>📍</Text>
                <Text style={{ fontWeight: '700', color: COLORS.primary, marginLeft: 12 }}>
                  Add a delivery address
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Step 2: Live Location ───────────────────────────────── */}
          <View style={S.section}>
            <Text style={S.secTitle}>📡 Live Location (optional)</Text>
            <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>
              Share your real-time location so the driver finds you easily.
            </Text>
            <TouchableOpacity
              style={[S.locBtn, !!liveLocation && { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}
              onPress={detectLocation}
              disabled={locLoading}
            >
              {locLoading
                ? <ActivityIndicator color={COLORS.primary} size="small" />
                : <Text style={{ fontSize: 18 }}>{liveLocation ? '✅' : '📍'}</Text>
              }
              <Text style={{
                marginLeft: 10, fontWeight: '700',
                color: liveLocation ? '#065F46' : COLORS.primary, fontSize: 14,
              }}>
                {liveLocation
                  ? `Location shared (${liveLocation.lat.toFixed(4)}, ${liveLocation.lng.toFixed(4)})`
                  : 'Share my location'
                }
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Step 3: Order Items ─────────────────────────────────── */}
          <View style={S.section}>
            <Text style={S.secTitle}>
              {`🧾 Order Items (${cart.items.length})`}
            </Text>

            {/* Regular items */}
            {cart.items.map((item, idx) => {
              const hasDisc  = (item.discount_percentage ?? 0) > 0
              const effPrice = hasDisc
                ? item.price * (1 - item.discount_percentage! / 100)
                : item.price
              return (
                <View key={item.id ?? idx}
                  style={S.orderItemRow}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ fontWeight: '700', color: COLORS.text, fontSize: 13 }}>
                      {item.name}
                    </Text>
                    {hasDisc && (
                      <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
                        {`₹${item.price} → ₹${effPrice.toFixed(0)} (${item.discount_percentage}% off)`}
                      </Text>
                    )}
                  </View>
                  <Text style={{ color: '#6B7280', marginHorizontal: 8, fontSize: 13 }}>
                    {`×${item.quantity}`}
                  </Text>
                  <Text style={{ fontWeight: '700', color: COLORS.text, fontSize: 13 }}>
                    {`₹${(effPrice * item.quantity).toFixed(0)}`}
                  </Text>
                </View>
              )
            })}

            {/* ✅ BxGy FREE items — shown clearly with ₹0 and green FREE badge */}
            {bxgyGifts.length > 0 && (
              <View style={S.freeItemsBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 18, marginRight: 6 }}>🎁</Text>
                  <Text style={{ fontWeight: '800', color: '#065F46', fontSize: 13 }}>
                    Free Items Applied
                  </Text>
                  {appliedPromo && (
                    <View style={{ marginLeft: 8, backgroundColor: '#ECFDF5', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#065F46' }}>
                        {appliedPromo.code}
                      </Text>
                    </View>
                  )}
                </View>
                {bxgyGifts.map((g, i) => (
                  <View key={i} style={S.freeItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700', color: '#047857', fontSize: 13 }}>
                        {g.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#6B7280' }}>
                        {`Original price: ₹${g.price.toFixed(0)}`}
                      </Text>
                    </View>
                    <Text style={{ color: '#6B7280', marginHorizontal: 8 }}>
                      {`×${g.qty}`}
                    </Text>
                    <View style={S.freeBadge}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>FREE</Text>
                    </View>
                  </View>
                ))}
                <View style={{ borderTopWidth: 1, borderTopColor: '#A7F3D0', marginTop: 8, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#065F46', fontWeight: '700', fontSize: 13 }}>
                    Free items value
                  </Text>
                  <Text style={{ color: '#065F46', fontWeight: '800', fontSize: 13 }}>
                    {`-₹${bxgyGifts.reduce((s, g) => s + g.price * g.qty, 0).toFixed(0)}`}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* ── Step 4: Promo Code ──────────────────────────────────── */}
          <View style={S.section}>
            <Text style={S.secTitle}>🏷️ Promo Code</Text>

            {!appliedPromo ? (
              <>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  <TextInput
                    style={[S.input, { flex: 1 }]}
                    placeholder="Enter promo code"
                    value={promoInput}
                    onChangeText={t => setPromoInput(t.toUpperCase())}
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity
                    style={[S.applyBtn, (!promoInput.trim() || applyingPromo) && { opacity: 0.5 }]}
                    onPress={handleApplyPromo}
                    disabled={!promoInput.trim() || applyingPromo}
                  >
                    {applyingPromo
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={{ color: '#fff', fontWeight: '700' }}>Apply</Text>
                    }
                  </TouchableOpacity>
                </View>

                {availablePromos.length > 0 && (
                  <>
                    <TouchableOpacity onPress={() => setShowPromoList(v => !v)}>
                      <Text style={{ color: COLORS.primary, fontWeight: '600', fontSize: 13 }}>
                        {showPromoList
                          ? 'Hide offers'
                          : `${availablePromos.length} offer${availablePromos.length !== 1 ? 's' : ''} available`
                        }
                      </Text>
                    </TouchableOpacity>
                    {showPromoList && availablePromos.map(p => {
                      const label = p.deal_type === 'bxgy'
                        ? `Buy ${(p.deal_json as any)?.buy?.qty ?? 1} Get ${(p.deal_json as any)?.get?.qty ?? 1} FREE`
                        : p.discount_type === 'percentage'
                          ? `${p.discount_value}% OFF`
                          : `₹${p.discount_value} OFF`
                      return (
                        <TouchableOpacity
                          key={p.id} style={S.promoItem}
                          onPress={() => applyPromoObj(p)}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: '800', color: COLORS.primary }}>{p.code}</Text>
                            {!!p.description && (
                              <Text style={{ fontSize: 12, color: '#4B5563' }}>{p.description}</Text>
                            )}
                            {(p.min_order_amount ?? 0) > 0 && (
                              <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
                                {`Min order ₹${p.min_order_amount}`}
                              </Text>
                            )}
                          </View>
                          <View style={S.promoBadge}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#065F46' }}>{label}</Text>
                          </View>
                        </TouchableOpacity>
                      )
                    })}
                  </>
                )}
              </>
            ) : (
              <View style={S.appliedPromo}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '800', color: '#065F46' }}>
                    {appliedPromo.deal_type === 'bxgy'
                      ? `🎁 ${appliedPromo.code} — Buy ${(appliedPromo.deal_json as any)?.buy?.qty ?? 1} Get ${(appliedPromo.deal_json as any)?.get?.qty ?? 1} FREE`
                      : `🏷️ ${appliedPromo.code}`
                    }
                  </Text>
                  {promoDiscount > 0 && (
                    <Text style={{ fontSize: 12, color: '#047857' }}>
                      {`Saving ₹${promoDiscount.toFixed(2)}`}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => {
                  setAppliedPromo(null); setPromoDiscount(0); setBxgyGifts([])
                }}>
                  <Text style={{ color: '#EF4444', fontWeight: '700' }}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ── Step 5: Notes ──────────────────────────────────────── */}
          <View style={S.section}>
            <Text style={S.secTitle}>📝 Notes</Text>
            <TextInput
              style={S.input}
              placeholder="Special instructions for the restaurant?"
              value={specialInst}
              onChangeText={setSpecialInst}
              multiline numberOfLines={2}
              placeholderTextColor="#9CA3AF"
              textAlignVertical="top"
            />
            <TextInput
              style={[S.input, { marginTop: 10 }]}
              placeholder="Note for delivery partner (optional)"
              value={notes}
              onChangeText={setNotes}
              multiline numberOfLines={2}
              placeholderTextColor="#9CA3AF"
              textAlignVertical="top"
            />
          </View>

          {/* ── Step 6: Payment Method ─────────────────────────────── */}
          <View style={S.section}>
            <Text style={S.secTitle}>💳 Payment Method</Text>
            <PayMethodCard
              selected={payMethod === 'cod'}
              emoji="💵" label="Cash on Delivery"
              sub="Pay when your order arrives"
              onPress={() => setPayMethod('cod')}
            />
            <PayMethodCard
              selected={payMethod === 'online'}
              emoji="📱" label="Online Payment"
              sub="UPI / Card / Net Banking — Coming Soon"
              onPress={() => Alert.alert('Coming Soon', 'Online payments will be available soon!')}
              disabled
            />
          </View>

          {/* ── Step 7: Bill Summary ───────────────────────────────── */}
          <View style={S.section}>
            <Text style={S.secTitle}>🧾 Bill Summary</Text>

            <BillRow label="Item Total" value={`₹${subtotal.toFixed(2)}`} />

            {/* Item-level discounts */}
            {(() => {
              const saved = (cart.items ?? []).reduce((s, i) => {
                const d = (i.discount_percentage ?? 0) > 0
                  ? i.price * (i.discount_percentage! / 100) * i.quantity : 0
                return s + d
              }, 0)
              return saved > 0
                ? <BillRow label="Item Discounts" value={`-₹${saved.toFixed(2)}`} green />
                : null
            })()}

            {/* Promo discount */}
            {promoDiscount > 0 && (
              <BillRow
                label={`Promo (${appliedPromo?.code ?? ''})`}
                value={`-₹${promoDiscount.toFixed(2)}`}
                green
                sub={appliedPromo?.deal_type === 'bxgy'
                  ? `🎁 ${bxgyGifts.length} free item${bxgyGifts.length !== 1 ? 's' : ''} deducted`
                  : undefined
                }
              />
            )}

            {showDeliveryFee && (
              <BillRow
                label="Delivery Fee"
                value={`₹${deliveryFee.toFixed(2)}`}
                sub={deliveryBreakdown || undefined}
              />
            )}

            {gstEnabled && gstPct > 0 && (
              <BillRow label={`GST (${gstPct}%)`} value={`₹${taxAmount.toFixed(2)}`} />
            )}

            <View style={S.totalRow}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: COLORS.text }}>Total</Text>
              <Text style={{ fontSize: 22, fontWeight: '900', color: COLORS.primary }}>
                {`₹${finalTotal.toFixed(2)}`}
              </Text>
            </View>

            {totalSavings > 0 && (
              <View style={{ backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10, marginTop: 12 }}>
                <Text style={{ color: '#15803D', fontWeight: '700', fontSize: 13, textAlign: 'center' }}>
                  {`🎉 You saved ₹${totalSavings.toFixed(2)} on this order!`}
                </Text>
              </View>
            )}
          </View>

          <View style={{ height: 10 }} />
        </ScrollView>

        {/* ── Place Order Bar ───────────────────────────────────────── */}
        <View style={S.placeBar}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ color: '#6B7280', fontSize: 12 }}>
              {payMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
            </Text>
            <Text style={{ fontWeight: '900', color: COLORS.text, fontSize: 18 }}>
              {`₹${finalTotal.toFixed(2)}`}
            </Text>
            {totalSavings > 0 && (
              <Text style={{ fontSize: 11, color: '#15803D' }}>
                {`Saved ₹${totalSavings.toFixed(0)}`}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={[S.placeBtn, (placing || !selectedAddr) && { opacity: 0.6 }]}
            onPress={handlePlaceOrder}
            disabled={placing || !selectedAddr}
          >
            {placing
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                  {`Place Order ₹${finalTotal.toFixed(0)}`}
                </Text>
            }
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>

      {/* ── Address Select Modal ──────────────────────────────────── */}
      <Modal visible={showAddrModal} transparent animationType="slide">
        <View style={S.modalOverlay}>
          <View style={S.addrModal}>
            <Text style={{ fontSize: 17, fontWeight: '900', color: COLORS.text, marginBottom: 16 }}>
              Select Address
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {addresses.map(a => (
                <TouchableOpacity
                  key={a.id}
                  style={[S.addrRow, selectedAddr?.id === a.id && S.addrRowActive]}
                  onPress={() => { setSelectedAddr(a); setShowAddrModal(false) }}
                >
                  <Text style={{ fontSize: 20, marginRight: 10 }}>
                    {a.label === 'Home' ? '🏠' : a.label === 'Work' ? '🏢' : '📍'}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '800', color: COLORS.text }}>{a.label}</Text>
                    {!!a.recipient_name && (
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>{a.recipient_name}</Text>
                    )}
                    <Text style={{ fontSize: 12, color: '#4B5563', marginTop: 2 }} numberOfLines={2}>
                      {a.address}
                    </Text>
                  </View>
                  {selectedAddr?.id === a.id && (
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={{ backgroundColor: '#F3F4F6', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 }}
                onPress={() => { setShowAddrModal(false); router.push('/(customer)/addresses' as any) }}
              >
                <Text style={{ color: COLORS.primary, fontWeight: '700' }}>+ Add New Address</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ alignItems: 'center', paddingVertical: 12, marginTop: 4 }}
                onPress={() => setShowAddrModal(false)}
              >
                <Text style={{ color: '#6B7280', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  section:       { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  secTitle:      { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
  addrIcon:      { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  instrBox:      { backgroundColor: '#FFFBEB', borderRadius: 8, padding: 8, marginTop: 6, borderWidth: 1, borderColor: '#FDE68A' },
  addAddrBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3EE', borderRadius: 12, padding: 16, borderWidth: 1.5, borderColor: '#FED7AA' },
  locBtn:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3EE', borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: '#FED7AA' },
  orderItemRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  // ✅ Free items box
  freeItemsBox:  { backgroundColor: '#ECFDF5', borderRadius: 12, padding: 12, marginTop: 10, borderWidth: 1.5, borderColor: '#A7F3D0' },
  freeItemRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#D1FAE5' },
  freeBadge:     { backgroundColor: '#16A34A', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  input:         { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: COLORS.text },
  applyBtn:      { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  promoItem:     { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, marginTop: 8 },
  promoBadge:    { backgroundColor: '#ECFDF5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  appliedPromo:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: '#BBF7D0' },
  payCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 2, borderColor: 'transparent' },
  payCardActive: { borderColor: COLORS.primary, backgroundColor: '#FFF3EE' },
  radio:         { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  radioActive:   { borderColor: COLORS.primary },
  radioDot:      { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  totalRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTopWidth: 2, borderTopColor: '#F3F4F6', marginTop: 6 },
  placeBar:      { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, paddingBottom: Platform.OS === 'ios' ? 34 : 14, borderTopWidth: 1, borderTopColor: '#F3F4F6', elevation: 10 },
  placeBtn:      { backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14, alignItems: 'center' },
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  addrModal:     { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36, maxHeight: '80%' },
  addrRow:       { flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderRadius: 14, borderWidth: 2, borderColor: 'transparent', marginBottom: 8, backgroundColor: '#F9FAFB' },
  addrRowActive: { borderColor: COLORS.primary, backgroundColor: '#FFF3EE' },
})
