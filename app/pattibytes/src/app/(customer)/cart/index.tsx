/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, TextInput, ActivityIndicator, Alert, RefreshControl, Modal, Platform,
} from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { useCart } from '../../../contexts/CartContext'
import { COLORS } from '../../../lib/constants'
import {
  getRoadDistanceKm, calculateDeliveryFee,
  getSavedAddresses, type SavedAddress,
} from '../../../services/location'
import { promoCodeService, type PromoCode } from '../../../services/promoCodes'

// ─── Types ────────────────────────────────────────────────────────────────────
type AppSettings = {
  delivery_fee_enabled: boolean
  base_delivery_radius_km: number
  per_km_fee_beyond_base: number
  delivery_fee_schedule: any
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
}

type BxGyGift = {
  menuItemId: string
  name: string
  qty: number
  price: number
  promoCode: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcDeliveryFeeFromPolicy(
  distKm: number,
  settings: AppSettings,
): { fee: number; breakdown: string } {
  const BASE_KM  = settings.base_delivery_radius_km ?? 3
  const BASE_FEE = 35
  const PER_KM   = settings.per_km_fee_beyond_base ?? 15
  if (distKm <= BASE_KM) {
    return { fee: BASE_FEE, breakdown: `Base ₹${BASE_FEE} (within ${BASE_KM} km)` }
  }
  const extra = Math.ceil((distKm - BASE_KM) * PER_KM)
  return {
    fee: BASE_FEE + extra,
    breakdown: `₹${BASE_FEE} + ₹${extra} (${(distKm - BASE_KM).toFixed(1)} km × ₹${PER_KM}/km)`,
  }
}

function formatAddr(a: SavedAddress): string {
  return [
    a.address,
    a.apartment_floor ? `Flat/Floor: ${a.apartment_floor}` : '',
    a.landmark        ? `Near: ${a.landmark}` : '',
    [a.city, a.state].filter(Boolean).join(', '),
    a.postal_code ?? '',
  ].filter(Boolean).join('\n')
}

// ─── Bill Row ─────────────────────────────────────────────────────────────────
function BillRow({ label, value, green, sub }: {
  label: string; value: string; green?: boolean; sub?: string
}) {
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

// ─── Address Picker Modal ─────────────────────────────────────────────────────
function AddressPickerModal({
  visible, addresses, selectedId, onSelect, onClose, onAddNew,
}: {
  visible: boolean
  addresses: SavedAddress[]
  selectedId: string | null
  onSelect: (a: SavedAddress) => void
  onClose: () => void
  onAddNew: () => void
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={AM.overlay}>
        <View style={AM.sheet}>
          {/* Handle */}
          <View style={AM.handle} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 17, fontWeight: '900', color: COLORS.text }}>
              Select Delivery Address
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 22, color: '#9CA3AF' }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
            {addresses.map(a => {
              const active = a.id === selectedId
              return (
                <TouchableOpacity
                  key={a.id}
                  style={[AM.addrRow, active && AM.addrRowActive]}
                  onPress={() => { onSelect(a); onClose() }}
                  activeOpacity={0.8}
                >
                  <View style={[AM.addrIcon, active && { backgroundColor: '#FFF3EE' }]}>
                    <Text style={{ fontSize: 18 }}>
                      {a.label === 'Home' ? '🏠' : a.label === 'Work' ? '🏢' : '📍'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '800', color: COLORS.text, fontSize: 14 }}>{a.label}</Text>
                    {!!a.recipient_name && (
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>
                        {a.recipient_name}{a.recipient_phone ? ` · ${a.recipient_phone}` : ''}
                      </Text>
                    )}
                    <Text style={{ fontSize: 12, color: '#4B5563', marginTop: 2, lineHeight: 18 }} numberOfLines={2}>
                      {formatAddr(a)}
                    </Text>
                    {a.is_default && (
                      <View style={AM.defaultBadge}>
                        <Text style={{ color: COLORS.primary, fontSize: 9, fontWeight: '800' }}>DEFAULT</Text>
                      </View>
                    )}
                  </View>
                  {active && (
                    <View style={AM.checkCircle}>
                      <Text style={{ color: '#fff', fontSize: 13 }}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </ScrollView>
          <TouchableOpacity style={AM.addBtn} onPress={onAddNew} activeOpacity={0.8}>
            <Text style={{ fontSize: 18, marginRight: 8 }}>＋</Text>
            <Text style={{ color: COLORS.primary, fontWeight: '800', fontSize: 14 }}>Add New Address</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const AM = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  handle:       { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  addrRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: 'transparent', marginBottom: 8, backgroundColor: '#F9FAFB' },
  addrRowActive:{ borderColor: COLORS.primary, backgroundColor: '#FFF3EE' },
  addrIcon:     { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  defaultBadge: { marginTop: 4, alignSelf: 'flex-start', backgroundColor: '#FFF3EE', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: COLORS.primary },
  checkCircle:  { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  addBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF3EE', borderRadius: 14, padding: 14, marginTop: 12, borderWidth: 1.5, borderColor: COLORS.primary },
})

// ─── Main: Cart Page ──────────────────────────────────────────────────────────
export default function CartPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { cart, updateQuantity, removeFromCart, clearCart } = useCart()

  const [addresses,         setAddresses]        = useState<SavedAddress[]>([])
  const [selectedAddr,      setSelectedAddr]     = useState<SavedAddress | null>(null)
  const [showAddrModal,     setShowAddrModal]    = useState(false)
  const [deliveryFee,       setDeliveryFee]      = useState(35)
  const [deliveryKm,        setDeliveryKm]       = useState(0)
  const [deliveryBreakdown, setDeliveryBreakdown]= useState('')
  const [showDeliveryFee,   setShowDeliveryFee]  = useState(true)

  // Promo
  const [promoInput,      setPromoInput]      = useState('')
  const [appliedPromo,    setAppliedPromo]    = useState<PromoCode | null>(null)
  const [promoDiscount,   setPromoDiscount]   = useState(0)
  const [applyingPromo,   setApplyingPromo]   = useState(false)
  const [availablePromos, setAvailablePromos] = useState<PromoCode[]>([])
  const [showPromoList,   setShowPromoList]   = useState(false)
  const [bxgyGifts,       setBxgyGifts]       = useState<BxGyGift[]>([])

  // GST
  const [gstEnabled, setGstEnabled] = useState(false)
  const [gstPct,     setGstPct]     = useState(0)

  const [appSettings,    setAppSettings]    = useState<AppSettings | null>(null)
  const [merchantGeo,    setMerchantGeo]    = useState<MerchantGeo | null>(null)
  const [loading,        setLoading]        = useState(true)
  const [showClearModal, setShowClearModal] = useState(false)

  // ── Subtotal ──────────────────────────────────────────────────────────────
  const subtotal = useMemo(() => {
    if (!cart?.items?.length) return 0
    return cart.items.reduce((sum, item) => {
      const disc = (item.discount_percentage ?? 0) > 0
        ? item.price * (item.discount_percentage! / 100) : 0
      return sum + (item.price - disc) * item.quantity
    }, 0)
  }, [cart?.items])

  // ── Load settings + addresses + merchant geo ──────────────────────────────
  const loadSettings = useCallback(async () => {
    try {
      const [{ data: appRow }, addrList] = await Promise.all([
        supabase.from('app_settings').select(
          'delivery_fee_enabled,base_delivery_radius_km,per_km_fee_beyond_base,delivery_fee_schedule,hub_latitude,hub_longitude'
        ).limit(1).maybeSingle(),
        user ? getSavedAddresses(user.id) : Promise.resolve([] as SavedAddress[]),
      ])

      const settings = (appRow ?? {
        delivery_fee_enabled: true,
        base_delivery_radius_km: 3,
        per_km_fee_beyond_base: 15,
        delivery_fee_schedule: null,
      }) as AppSettings

      setAppSettings(settings)
      setShowDeliveryFee(settings.delivery_fee_enabled !== false)

      const list = addrList ?? []
      setAddresses(list)

      // ✅ Auto-select default address (or first available)
      const def = list.find(a => a.is_default) ?? list[0] ?? null
      setSelectedAddr(def)

      if (cart?.merchant_id) {
        const { data: merch } = await supabase.from('merchants')
          .select('latitude,longitude,gst_enabled,gst_percentage')
          .eq('id', cart.merchant_id).maybeSingle()
        if (merch) {
          setMerchantGeo(merch as MerchantGeo)
          setGstEnabled(!!merch.gst_enabled)
          setGstPct(Number(merch.gst_percentage ?? 0))
        }

        // Load promos + auto-apply
        const promos = await promoCodeService.getActivePromos(cart.merchant_id)
        setAvailablePromos(promos ?? [])
        const auto = (promos ?? []).find((p: any) => p.auto_apply)
        if (auto && !appliedPromo) applyPromoObject(auto, subtotal)
      }
    } catch (e: any) {
      console.warn('cart loadSettings', e.message)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, cart?.merchant_id])

  useEffect(() => { loadSettings() }, [loadSettings])

  // ── Recalculate delivery fee when address/geo changes ─────────────────────
  useEffect(() => {
    if (!selectedAddr || !merchantGeo || !appSettings) return
    if (!merchantGeo.latitude || !merchantGeo.longitude) return
    if (!selectedAddr.latitude || !selectedAddr.longitude) return
    ;(async () => {
      try {
        const hubLat = appSettings.hub_latitude ?? merchantGeo.latitude!
        const hubLng = appSettings.hub_longitude ?? merchantGeo.longitude!
        const [, legB] = await Promise.all([
          getRoadDistanceKm(hubLat, hubLng, merchantGeo.latitude!, merchantGeo.longitude!),
          getRoadDistanceKm(merchantGeo.latitude!, merchantGeo.longitude!, selectedAddr.latitude!, selectedAddr.longitude!),
        ])
        const { fee, breakdown } = calcDeliveryFeeFromPolicy(legB, appSettings)
        setDeliveryFee(fee)
        setDeliveryKm(legB)
        setDeliveryBreakdown(breakdown)
      } catch {
        const { fee, breakdown } = calcDeliveryFeeFromPolicy(0, appSettings)
        setDeliveryFee(fee)
        setDeliveryBreakdown(breakdown)
      }
    })()
  }, [selectedAddr, merchantGeo, appSettings])

  // ── BxGy gifts ────────────────────────────────────────────────────────────
  const computeBxGyGifts = useCallback((promo: PromoCode | null) => {
    if (!promo || promo.deal_type !== 'bxgy' || !cart?.items?.length) {
      setBxgyGifts([]); return
    }
    const dj = promo.deal_json
    const buyQty: number   = dj?.buy?.qty ?? 1
    const getQty: number   = dj?.get?.qty ?? 1
    const maxSets: number  = dj?.max_sets_per_order ?? 1
    const totalQty = cart.items.reduce((s, i) => s + i.quantity, 0)
    const sets = Math.min(Math.floor(totalQty / buyQty), maxSets)
    if (sets <= 0) { setBxgyGifts([]); return }

    const sorted = [...cart.items].sort((a, b) => a.price - b.price)
    const gifts: BxGyGift[] = []
    let remaining = sets * getQty
    for (const item of sorted) {
      if (remaining <= 0) break
      const giftable = Math.min(item.quantity, remaining)
      gifts.push({ menuItemId: item.id, name: item.name, qty: giftable, price: item.price, promoCode: promo.code })
      remaining -= giftable
    }
    setBxgyGifts(gifts)
  }, [cart?.items])

  const applyPromoObject = useCallback((promo: PromoCode, base: number) => {
    if (promo.deal_type === 'bxgy') {
      setAppliedPromo(promo); setPromoDiscount(0); computeBxGyGifts(promo); return
    }
    let disc = promo.discount_type === 'percentage'
      ? base * (promo.discount_value / 100)
      : promo.discount_value
    if ((promo as any).max_discount_amount) disc = Math.min(disc, (promo as any).max_discount_amount)
    setAppliedPromo(promo)
    setPromoDiscount(Math.round(disc * 100) / 100)
    setBxgyGifts([])
  }, [computeBxGyGifts])

  useEffect(() => {
    if (appliedPromo?.deal_type === 'bxgy') {
      const freeValue = bxgyGifts.reduce((s, g) => s + g.price * g.qty, 0)
      setPromoDiscount(Math.round(freeValue * 100) / 100)
    }
  }, [bxgyGifts, appliedPromo])

  const handleApplyPromo = async () => {
    if (!promoInput.trim() || !cart?.merchant_id || !user) return
    setApplyingPromo(true)
    try {
      const result = await promoCodeService.validatePromoCode(
        promoInput.trim(), subtotal, user.id, { merchantId: cart.merchant_id }
      )
      if (!result.valid) { Alert.alert('Invalid Promo', result.message); return }
      applyPromoObject(result.promoCode!, subtotal)
      setPromoInput('')
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setApplyingPromo(false)
    }
  }

  // ── Totals ────────────────────────────────────────────────────────────────
  const taxAmount = useMemo(() => {
    if (!gstEnabled || gstPct <= 0) return 0
    return Math.round((subtotal - promoDiscount) * (gstPct / 100) * 100) / 100
  }, [subtotal, promoDiscount, gstEnabled, gstPct])

  const finalTotal = useMemo(() => {
    const base = subtotal - promoDiscount + (showDeliveryFee ? deliveryFee : 0) + taxAmount
    return Math.max(0, Math.round(base * 100) / 100)
  }, [subtotal, promoDiscount, deliveryFee, showDeliveryFee, taxAmount])

  const totalSavings = useMemo(() => {
    const itemSavings = (cart?.items ?? []).reduce((s, item) => {
      const d = (item.discount_percentage ?? 0) > 0
        ? item.price * (item.discount_percentage! / 100) * item.quantity : 0
      return s + d
    }, 0)
    return Math.round((itemSavings + promoDiscount) * 100) / 100
  }, [cart?.items, promoDiscount])

  // ── Item discounts (for bill row) ─────────────────────────────────────────
  const itemDiscountTotal = useMemo(() => (cart?.items ?? []).reduce((s, i) => {
    const d = (i.discount_percentage ?? 0) > 0
      ? i.price * (i.discount_percentage! / 100) * i.quantity : 0
    return s + d
  }, 0), [cart?.items])

  // ── Empty state ───────────────────────────────────────────────────────────
  if (loading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <Stack.Screen options={{ title: 'Cart' }} />
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  )

  if (!cart?.items?.length) return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Stack.Screen options={{ title: 'Cart' }} />
      <Text style={{ fontSize: 72, marginBottom: 16 }}>🛒</Text>
      <Text style={{ fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 8 }}>
        Your cart is empty
      </Text>
      <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 28, textAlign: 'center' }}>
        Add items from a restaurant to get started
      </Text>
      <TouchableOpacity
        style={{ backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 }}
        onPress={() => router.push('/(customer)/dashboard' as any)}
      >
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Browse Restaurants</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <Stack.Screen options={{
        title: 'Cart',
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
        headerRight: () => (
          <TouchableOpacity onPress={() => setShowClearModal(true)} style={{ marginRight: 14 }}>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '700', fontSize: 13 }}>Clear 🗑️</Text>
          </TouchableOpacity>
        ),
      }} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }}>

        {/* ── Restaurant Header ───────────────────────────────────────── */}
        <View style={S.restHeader}>
          <Text style={{ fontSize: 18, marginRight: 10 }}>🏪</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', color: COLORS.text, fontSize: 15 }}>
              {cart.merchant_name}
            </Text>
            {deliveryKm > 0 && (
              <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                {deliveryKm.toFixed(1)} km from you
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={() => router.push(`/(customer)/restaurant/${cart.merchant_id}` as any)}>
            <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 13 }}>+ Add Items</Text>
          </TouchableOpacity>
        </View>

        {/* ── Cart Items ──────────────────────────────────────────────── */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>
            {`${cart.items.length} Item${cart.items.length !== 1 ? 's' : ''}`}
          </Text>

          {cart.items.map(item => {
            const hasDisc        = (item.discount_percentage ?? 0) > 0
            const effectivePrice = hasDisc
              ? item.price * (1 - item.discount_percentage! / 100)
              : item.price
            const lineTotal = effectivePrice * item.quantity

            return (
              <View key={item.id} style={S.cartItem}>
                {/* Image */}
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={S.cartItemImg} resizeMode="cover" />
                ) : (
                  <View style={[S.cartItemImg, { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ fontSize: 22 }}>🍽️</Text>
                  </View>
                )}

                {/* Info */}
                <View style={{ flex: 1 }}>
                  {/* Name row */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 5 }}>
                    <View style={{
                      width: 10, height: 10, borderRadius: 2, marginTop: 4, flexShrink: 0,
                      backgroundColor: item.is_veg ? '#16A34A' : '#DC2626',
                    }} />
                    <Text style={{ fontWeight: '800', fontSize: 14, color: COLORS.text, flex: 1 }}>
                      {item.name}
                    </Text>
                    <TouchableOpacity onPress={() => removeFromCart(item.id)} style={{ paddingLeft: 8 }}>
                      <Text style={{ color: '#EF4444', fontSize: 16 }}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {!!item.category && (
                    <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{item.category}</Text>
                  )}

                  {/* Price */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <Text style={{ fontWeight: '800', color: COLORS.primary, fontSize: 14 }}>
                      ₹{effectivePrice.toFixed(0)}
                    </Text>
                    {hasDisc && (
                      <>
                        <Text style={{ textDecorationLine: 'line-through', color: '#9CA3AF', fontSize: 12 }}>
                          ₹{item.price.toFixed(0)}
                        </Text>
                        <View style={{ backgroundColor: '#EF4444', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 }}>
                          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>
                            {item.discount_percentage!.toFixed(0)}% OFF
                          </Text>
                        </View>
                      </>
                    )}
                  </View>

                  {/* Qty stepper + line total */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <View style={S.qtyRow}>
                      <TouchableOpacity style={S.qtyBtn} onPress={() => updateQuantity(item.id, item.quantity - 1)}>
                        <Text style={S.qtyBtnTxt}>−</Text>
                      </TouchableOpacity>
                      <Text style={S.qtyTxt}>{item.quantity}</Text>
                      <TouchableOpacity style={S.qtyBtn} onPress={() => updateQuantity(item.id, item.quantity + 1)}>
                        <Text style={S.qtyBtnTxt}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={{ fontWeight: '800', color: COLORS.text, fontSize: 14 }}>
                      ₹{lineTotal.toFixed(0)}
                    </Text>
                  </View>
                </View>
              </View>
            )
          })}

          {/* BxGy banner */}
          {bxgyGifts.length > 0 && (
            <View style={S.bxgyBanner}>
              <Text style={{ fontSize: 18, marginRight: 10 }}>🎁</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', color: '#065F46', fontSize: 13 }}>Free items!</Text>
                {bxgyGifts.map((g, i) => (
                  <Text key={i} style={{ fontSize: 12, color: '#047857', marginTop: 2 }}>
                    {g.name} × {g.qty} (FREE)
                  </Text>
                ))}
                <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>via {bxgyGifts[0].promoCode}</Text>
              </View>
              <Text style={{ fontWeight: '800', color: '#065F46' }}>−₹{promoDiscount.toFixed(0)}</Text>
            </View>
          )}
        </View>

        {/* ── Delivery Address ────────────────────────────────────────── */}
        <View style={S.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={S.sectionTitle}>Delivery Address</Text>
            <TouchableOpacity
              onPress={() => addresses.length > 0 ? setShowAddrModal(true) : router.push('/(customer)/addresses' as any)}
              style={S.changeAddrBtn}
            >
              <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 12 }}>
                {addresses.length === 0 ? '+ Add' : addresses.length > 1 ? '⇄ Change' : '✎ Edit'}
              </Text>
            </TouchableOpacity>
          </View>

          {selectedAddr ? (
            <>
              {/* ✅ Selected address card */}
              <View style={S.addrCard}>
                <View style={S.addrIconBox}>
                  <Text style={{ fontSize: 20 }}>
                    {selectedAddr.label === 'Home' ? '🏠' : selectedAddr.label === 'Work' ? '🏢' : '📍'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontWeight: '800', color: COLORS.text, fontSize: 15 }}>{selectedAddr.label}</Text>
                    {selectedAddr.is_default && (
                      <View style={S.defaultTag}>
                        <Text style={{ color: COLORS.primary, fontSize: 9, fontWeight: '800' }}>DEFAULT</Text>
                      </View>
                    )}
                  </View>
                  {!!selectedAddr.recipient_name && (
                    <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
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
                        📋 {selectedAddr.delivery_instructions}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Delivery fee info */}
              {showDeliveryFee && !!deliveryBreakdown && (
                <View style={S.feeInfo}>
                  <Text style={{ fontSize: 11, color: '#0369A1' }}>📦 {deliveryBreakdown}</Text>
                </View>
              )}

              {/* ✅ Quick address switcher chips (if multiple) */}
              {addresses.length > 1 && (
                <ScrollView
                  horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, marginTop: 12 }}
                >
                  {addresses.map(a => (
                    <TouchableOpacity
                      key={a.id}
                      style={[S.addrChip, selectedAddr.id === a.id && S.addrChipActive]}
                      onPress={() => setSelectedAddr(a)}
                      activeOpacity={0.8}
                    >
                      <Text style={{
                        fontSize: 12, fontWeight: '700',
                        color: selectedAddr.id === a.id ? '#fff' : COLORS.text,
                      }}>
                        {a.label === 'Home' ? '🏠 ' : a.label === 'Work' ? '🏢 ' : '📍 '}{a.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[S.addrChip, { borderStyle: 'dashed', borderColor: COLORS.primary }]}
                    onPress={() => router.push('/(customer)/addresses' as any)}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.primary }}>＋ Add</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </>
          ) : (
            /* No address yet */
            <TouchableOpacity
              style={S.addAddrBanner}
              onPress={() => router.push('/(customer)/addresses' as any)}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 28 }}>📍</Text>
              <View style={{ marginLeft: 14 }}>
                <Text style={{ fontWeight: '800', color: COLORS.primary, fontSize: 14 }}>
                  Add delivery address
                </Text>
                <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                  Required to place the order
                </Text>
              </View>
              <Text style={{ color: COLORS.primary, marginLeft: 'auto', fontSize: 18 }}>›</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Promo Code ──────────────────────────────────────────────── */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Promo Code</Text>

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
                  style={[S.applyBtn, (!promoInput.trim() || applyingPromo) && { opacity: 0.45 }]}
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
                        : `View ${availablePromos.length} available offer${availablePromos.length !== 1 ? 's' : ''}`}
                    </Text>
                  </TouchableOpacity>
                  {showPromoList && availablePromos.map(p => {
                    const isBxgy = p.deal_type === 'bxgy'
                    const label = isBxgy
                      ? `Buy ${(p.deal_json as any)?.buy?.qty ?? 1} Get ${(p.deal_json as any)?.get?.qty ?? 1} FREE`
                      : p.discount_type === 'percentage' ? `${p.discount_value}% OFF` : `₹${p.discount_value} OFF`
                    return (
                      <TouchableOpacity key={p.id} style={S.promoItem} onPress={() => applyPromoObject(p, subtotal)}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: '800', color: COLORS.primary }}>{p.code}</Text>
                          {!!p.description && (
                            <Text style={{ fontSize: 12, color: '#4B5563' }}>{p.description}</Text>
                          )}
                          {((p as any).min_order_amount ?? 0) > 0 && (
                            <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
                              Min order ₹{(p as any).min_order_amount}
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
                    : `🏷️ ${appliedPromo.code}`}
                </Text>
                {promoDiscount > 0 && (
                  <Text style={{ fontSize: 12, color: '#047857' }}>
                    Saving ₹{promoDiscount.toFixed(2)}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => { setAppliedPromo(null); setPromoDiscount(0); setBxgyGifts([]) }}>
                <Text style={{ color: '#EF4444', fontWeight: '700' }}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Bill Summary ────────────────────────────────────────────── */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Bill Summary</Text>
          <BillRow label="Item Total" value={`₹${subtotal.toFixed(2)}`} />
          {itemDiscountTotal > 0 && (
            <BillRow label="Item Discounts" value={`-₹${itemDiscountTotal.toFixed(2)}`} green />
          )}
          {promoDiscount > 0 && (
            <BillRow
              label={`Promo (${appliedPromo?.code ?? ''})`}
              value={`-₹${promoDiscount.toFixed(2)}`}
              green
              sub={appliedPromo?.deal_type === 'bxgy' ? 'Buy & Get Free items offer' : undefined}
            />
          )}
          {showDeliveryFee && (
            <BillRow label="Delivery Fee" value={`₹${deliveryFee.toFixed(2)}`} sub={deliveryBreakdown || undefined} />
          )}
          {gstEnabled && gstPct > 0 && (
            <BillRow label={`GST (${gstPct}%)`} value={`₹${taxAmount.toFixed(2)}`} />
          )}

          <View style={S.totalRow}>
            <Text style={{ fontSize: 17, fontWeight: '900', color: COLORS.text }}>Total</Text>
            <Text style={{ fontSize: 20, fontWeight: '900', color: COLORS.primary }}>
              ₹{finalTotal.toFixed(2)}
            </Text>
          </View>

          {totalSavings > 0 && (
            <View style={{ backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10, marginTop: 12 }}>
              <Text style={{ color: '#15803D', fontWeight: '700', fontSize: 13, textAlign: 'center' }}>
                🎉 Total savings: ₹{totalSavings.toFixed(2)}
              </Text>
            </View>
          )}
        </View>

        {/* Cancellation policy notice */}
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <Text style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 16 }}>
            Review your order before proceeding. Cancellation charges may apply once confirmed.
          </Text>
        </View>
      </ScrollView>

      {/* ── Checkout Bar ────────────────────────────────────────────────── */}
      <View style={S.checkoutBar}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={{ color: '#6B7280', fontSize: 12 }}>
            {cart.items.reduce((s, i) => s + i.quantity, 0)} items
            {selectedAddr ? ` · ${selectedAddr.label}` : ''}
          </Text>
          <Text style={{ fontWeight: '900', color: COLORS.text, fontSize: 18 }}>
            ₹{finalTotal.toFixed(2)}
          </Text>
          {totalSavings > 0 && (
            <Text style={{ fontSize: 11, color: '#15803D' }}>Saved ₹{totalSavings.toFixed(0)}</Text>
          )}
        </View>
        <TouchableOpacity
          style={[S.checkoutBtn, !selectedAddr && { opacity: 0.5 }]}
          disabled={!selectedAddr}
          onPress={() => {
            if (!selectedAddr) {
              Alert.alert('No Address', 'Please add or select a delivery address.')
              return
            }
            router.push({
              pathname: '/(customer)/checkout' as any,
              params: {
                delivery_fee:      String(showDeliveryFee ? deliveryFee : 0),
                delivery_distance: String(deliveryKm.toFixed(2)),
                tax:               String(taxAmount.toFixed(2)),
                promo_code:        appliedPromo?.code ?? '',
                promo_discount:    String(promoDiscount.toFixed(2)),
                final_total:       String(finalTotal.toFixed(2)),
                address_id:        selectedAddr.id,           // ✅ passes selected addr
                bxgy_gifts:        JSON.stringify(bxgyGifts),
              },
            })
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
            {selectedAddr ? 'Proceed to Checkout →' : 'Add Address'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Address Picker Modal ──────────────────────────────────────── */}
      <AddressPickerModal
        visible={showAddrModal}
        addresses={addresses}
        selectedId={selectedAddr?.id ?? null}
        onSelect={setSelectedAddr}
        onClose={() => setShowAddrModal(false)}
        onAddNew={() => { setShowAddrModal(false); router.push('/(customer)/addresses' as any) }}
      />

      {/* ── Clear Cart Modal ──────────────────────────────────────────── */}
      {showClearModal && (
        <View style={S.modalOverlay}>
          <View style={S.modal}>
            <Text style={{ fontSize: 42, marginBottom: 12, textAlign: 'center' }}>🗑️</Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.text, textAlign: 'center' }}>
              Clear Cart?
            </Text>
            <Text style={{ color: '#6B7280', textAlign: 'center', marginVertical: 8, lineHeight: 20 }}>
              Remove all {cart.items.length} item{cart.items.length !== 1 ? 's' : ''} from {cart.merchant_name}?
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <TouchableOpacity
                style={[S.modalBtn, { borderWidth: 2, borderColor: '#E5E7EB' }]}
                onPress={() => setShowClearModal(false)}
              >
                <Text style={{ fontWeight: '700', color: COLORS.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[S.modalBtn, { backgroundColor: '#EF4444' }]}
                onPress={() => { clearCart(); setShowClearModal(false) }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

const S = StyleSheet.create({
  restHeader:    { backgroundColor: '#fff', padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  section:       { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  sectionTitle:  { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
  cartItem:      { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  cartItemImg:   { width: 70, height: 65, borderRadius: 10, flexShrink: 0 },
  qtyRow:        { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 8 },
  qtyBtn:        { width: 30, height: 32, alignItems: 'center', justifyContent: 'center' },
  qtyBtnTxt:     { color: COLORS.primary, fontWeight: '800', fontSize: 18 },
  qtyTxt:        { width: 28, textAlign: 'center', fontWeight: '800', color: COLORS.text, fontSize: 14 },
  bxgyBanner:    { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#ECFDF5', borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1.5, borderColor: '#A7F3D0' },
  // Address
  addrCard:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: COLORS.primary + '30' },
  addrIconBox:   { width: 40, height: 40, borderRadius: 10, backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  defaultTag:    { backgroundColor: '#FFF3EE', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: COLORS.primary },
  instrBox:      { backgroundColor: '#FFFBEB', borderRadius: 8, padding: 8, marginTop: 6, borderWidth: 1, borderColor: '#FDE68A' },
  feeInfo:       { backgroundColor: '#EFF6FF', borderRadius: 10, padding: 10, marginTop: 10, borderWidth: 1, borderColor: '#BFDBFE' },
  addrChip:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: 'transparent' },
  addrChipActive:{ backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  changeAddrBtn: { backgroundColor: '#FFF3EE', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: COLORS.primary + '50' },
  addAddrBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3EE', borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: '#FED7AA' },
  // Promo
  input:         { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: COLORS.text },
  applyBtn:      { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  promoItem:     { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, marginTop: 8 },
  promoBadge:    { backgroundColor: '#ECFDF5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  appliedPromo:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: '#BBF7D0' },
  // Bill
  totalRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTopWidth: 2, borderTopColor: '#F3F4F6', marginTop: 6 },
  // Checkout bar
  checkoutBar:   { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, paddingBottom: Platform.OS === 'ios' ? 34 : 14, borderTopWidth: 1, borderTopColor: '#F3F4F6', elevation: 10 },
  checkoutBtn:   { backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 13, alignItems: 'center' },
  // Modals
  modalOverlay:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal:         { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '84%', alignItems: 'center', elevation: 20 },
  modalBtn:      { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 12 },
})
