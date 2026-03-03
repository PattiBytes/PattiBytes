 
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { useCart } from '../../../contexts/CartContext'
import { COLORS } from '../../../lib/constants'
import { getSavedAddresses, type SavedAddress } from '../../../services/location'
import {
  promoCodeService,
  type PromoCode,
  type BxGyGift,
  type PromoValidationResult,
} from '../../../services/promoCodes'
import {
  calcDeliveryForRestaurant,
  calcDeliveryForStore,
  type DeliveryResult,
} from '../../../services/deliveryService'

// ── Components ────────────────────────────────────────────────────────────────
import CartHeader             from '../../../components/cart/CartHeader'
import FreeDeliveryBar        from '../../../components/cart/FreeDeliveryBar'
import CartItemsList          from '../../../components/cart/CartItemsList'
import DeliveryAddressSection from '../../../components/cart/DeliveryAddressSection'
import PromoSection           from '../../../components/cart/PromoSection'
import BillSummaryTable       from '../../../components/cart/BillSummaryTable'
import CheckoutBar            from '../../../components/cart/CheckoutBar'
import AddressPickerModal     from '../../../components/cart/AddressPickerModal'
import ClearCartModal         from '../../../components/cart/ClearCartModal'
import { useAppSettings }     from '../../../hooks/useAppSettings'

// ── Types & utils ─────────────────────────────────────────────────────────────
import {
  type MerchantGeo,
  type OrderType,
} from '../../../components/cart/types'
import { estimatedDeliveryLabel } from '../../../components/cart/utils'

// ─────────────────────────────────────────────────────────────────────────────

export default function CartPage() {
  const router = useRouter()
  const { user }                                    = useAuth()
  const { cart, updateQuantity, removeFromCart, clearCart } = useCart()

  // ── App settings (from hook — single source of truth) ─────────────────────
  // `appSettings` is used directly; no separate useState needed
  const { settings: appSettings, loading: settingsLoading } = useAppSettings()

  // ── Address state ──────────────────────────────────────────────────────────
  const [addresses,     setAddresses]     = useState<SavedAddress[]>([])
  const [selectedAddr,  setSelectedAddr]  = useState<SavedAddress | null>(null)
  const [showAddrModal, setShowAddrModal] = useState(false)

  // ── Delivery state ─────────────────────────────────────────────────────────
  const [deliveryFee,        setDeliveryFee]        = useState(35)
  const [deliveryKm,         setDeliveryKm]          = useState(0)   // display (restaurant→customer)
  const [feeDistKm,          setFeeDistKm]           = useState(0)   // full chain (hub→merch→customer)
  const [deliveryBreakdown,  setDeliveryBreakdown]   = useState('')
  const [showDeliveryFee,    setShowDeliveryFee]     = useState(true)
  const [isFreeDelivery,     setIsFreeDelivery]      = useState(false)
  const [calcingDelivery,    setCalcingDelivery]     = useState(false)

  // ── Promo state ────────────────────────────────────────────────────────────
  const [promoInput,               setPromoInput]               = useState('')
  const [appliedPromo,             setAppliedPromo]             = useState<PromoCode | null>(null)
  const [promoDiscount,            setPromoDiscount]            = useState(0)
  const [applyingPromo,            setApplyingPromo]            = useState(false)
  const [availablePromos,          setAvailablePromos]          = useState<PromoCode[]>([])
  const [showPromoList,            setShowPromoList]            = useState(false)
  const [bxgyGifts,                setBxgyGifts]                = useState<BxGyGift[]>([])
  const [freeDeliveryPromoApplied, setFreeDeliveryPromoApplied] = useState(false)

  // ── GST state ──────────────────────────────────────────────────────────────
  const [gstEnabled, setGstEnabled] = useState(false)
  const [gstPct,     setGstPct]     = useState(0)

  // ── Item notes (per-item special instructions) ─────────────────────────────
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({})

  // ── Merchant + page state ──────────────────────────────────────────────────
  const [merchantGeo,    setMerchantGeo]   = useState<MerchantGeo | null>(null)
  const [loading,        setLoading]       = useState(true)
  const [showClearModal, setShowClearModal] = useState(false)

  // ── Sync showDeliveryFee from settings ────────────────────────────────────
  useEffect(() => {
    if (!settingsLoading) {
      setShowDeliveryFee(appSettings.delivery_fee_enabled !== false)
    }
  }, [appSettings.delivery_fee_enabled, settingsLoading])

  // ── Derive order type ─────────────────────────────────────────────────────
  const orderType: OrderType = useMemo(() => {
    if (!cart?.merchant_id) return 'store'
    const storeCats = ['dairy', 'grocery', 'medicines', 'custom']
    const allStore  = cart.items?.every(i =>
      storeCats.includes((i.category ?? '').toLowerCase())
    )
    return allStore ? 'custom' : 'restaurant'
  }, [cart?.merchant_id, cart?.items])

  // ── Subtotal ──────────────────────────────────────────────────────────────
  const subtotal = useMemo(() => {
    if (!cart?.items?.length) return 0
    return cart.items.reduce((sum, item) => {
      const disc = (item.discount_percentage ?? 0) > 0
        ? item.price * (item.discount_percentage! / 100) : 0
      return sum + (item.price - disc) * item.quantity
    }, 0)
  }, [cart?.items])

  // ── Min-order guard ───────────────────────────────────────────────────────
  const minOrder = appSettings?.min_order_amount ?? merchantGeo?.min_order_amount ?? 0
  const belowMin = minOrder > 0 && subtotal < minOrder

  // ── Load addresses + merchant geo + promos ────────────────────────────────
  // Does NOT fetch app_settings (hook handles that)
  const loadPageData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      // 1. Addresses
      const addrList = await getSavedAddresses(user.id)
      const list     = addrList ?? []
      setAddresses(list)
      const def = list.find(a => a.is_default) ?? list[0] ?? null
      setSelectedAddr(def)

      // 2. Merchant geo + GST (restaurant orders only)
      if (cart?.merchant_id && orderType === 'restaurant') {
        const { data: merch } = await supabase
          .from('merchants')
          .select('latitude,longitude,gst_enabled,gst_percentage,min_order_amount,estimated_prep_time,phone')
          .eq('id', cart.merchant_id)
          .maybeSingle()

        if (merch) {
          setMerchantGeo(merch as MerchantGeo)
          setGstEnabled(!!(merch as any).gst_enabled)
          setGstPct(Number((merch as any).gst_percentage ?? 0))
        }

        // 3. Available promos
        const promos = await promoCodeService.getActivePromos(cart.merchant_id)
        setAvailablePromos(promos ?? [])

        // Auto-apply first matching auto-apply promo
        const auto = (promos ?? []).find(p => p.auto_apply)
        if (auto && !appliedPromo) {
          void applyPromoSilent(auto)
        }
      } else if (cart?.merchant_id) {
        // Store/custom — still load promos (no merchant filter)
        const promos = await promoCodeService.getActivePromos(null)
        setAvailablePromos(promos ?? [])
      }
    } catch (e: any) {
      console.warn('[CartPage] loadPageData', e.message)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, cart?.merchant_id, orderType])

  useEffect(() => { loadPageData() }, [loadPageData])

  // ── Recalculate delivery fee ──────────────────────────────────────────────
  // Runs whenever: address / merchant geo / settings / subtotal / order type change
  const recalcDelivery = useCallback(async () => {
    if (!selectedAddr?.latitude || !selectedAddr?.longitude) return
    if (settingsLoading) return

    setCalcingDelivery(true)
    try {
      let result: DeliveryResult

      if (orderType === 'restaurant' && merchantGeo?.latitude && merchantGeo?.longitude) {
        // Fee = Hub→Merchant + Merchant→Customer (full chain)
        // Display = Merchant→Customer only
        result = await calcDeliveryForRestaurant(
          merchantGeo.latitude!,
          merchantGeo.longitude!,
          selectedAddr.latitude!,
          selectedAddr.longitude!,
          subtotal,
        )
      } else {
        // Store / Custom: Hub→Customer for both fee and display
        result = await calcDeliveryForStore(
          selectedAddr.latitude!,
          selectedAddr.longitude!,
          subtotal,
        )
      }

      // If a free delivery promo is already applied, keep fee = 0
      // but still update the distance display
      if (freeDeliveryPromoApplied) {
        setDeliveryFee(0)
        setDeliveryKm(result.displayDistanceKm)
        setFeeDistKm(result.feeDistanceKm)
        setDeliveryBreakdown('🚚 Free delivery (promo applied)')
        setIsFreeDelivery(true)
      } else {
        setDeliveryFee(result.fee)
        setDeliveryKm(result.displayDistanceKm)
        setFeeDistKm(result.feeDistanceKm)
        setDeliveryBreakdown(result.breakdown)
        setIsFreeDelivery(result.isFreeDelivery)
      }
    } catch (e: any) {
      console.warn('[CartPage] recalcDelivery', e.message)
      // Keep previous values on error
    } finally {
      setCalcingDelivery(false)
    }
  }, [
    selectedAddr,
    merchantGeo,
    subtotal,
    orderType,
    freeDeliveryPromoApplied,
    settingsLoading,
  ])

  useEffect(() => { recalcDelivery() }, [recalcDelivery])

  // ── BxGy: recompute gifts when cart items change ──────────────────────────
  const computeBxGyGifts = useCallback((promo: PromoCode | null) => {
    if (!promo || promo.deal_type !== 'bxgy' || !cart?.items?.length) {
      setBxgyGifts([])
      return
    }
    const dj      = promo.deal_json
    const buyQty  = Number(dj?.buy?.qty ?? 1)
    const getQty  = Number(dj?.get?.qty ?? 1)
    const maxSets = Number(dj?.max_sets_per_order ?? 999)
    const total   = cart.items.reduce((s, i) => s + i.quantity, 0)
    const sets    = Math.min(Math.floor(total / buyQty), maxSets)

    if (sets <= 0) { setBxgyGifts([]); return }

    const sorted = [...cart.items].sort((a, b) => a.price - b.price)
    const gifts: BxGyGift[] = []
    let remaining = sets * getQty

    for (const item of sorted) {
      if (remaining <= 0) break
      const giftable = Math.min(item.quantity, remaining)
      gifts.push({
        menuItemId: item.id,
        name:       item.name,
        qty:        giftable,
        price:      item.price,
        promoCode:  promo.code,
      })
      remaining -= giftable
    }
    setBxgyGifts(gifts)
  }, [cart?.items])

  // Recompute BxGy discount whenever gifts change
  useEffect(() => {
    if (appliedPromo?.deal_type === 'bxgy') {
      computeBxGyGifts(appliedPromo)
    }
  }, [cart?.items, appliedPromo, computeBxGyGifts])

  useEffect(() => {
    if (appliedPromo?.deal_type === 'bxgy') {
      const freeValue = bxgyGifts.reduce((s, g) => s + g.price * g.qty, 0)
      setPromoDiscount(Math.round(freeValue * 100) / 100)
    }
  }, [bxgyGifts, appliedPromo])

  // ── Apply promo object directly (auto-apply / list tap) ───────────────────
  const applyPromoSilent = useCallback(async (promo: PromoCode) => {
    if (!user) return
    try {
      const result: PromoValidationResult = await promoCodeService.validatePromoCode(
        promo.code,
        subtotal,
        user.id,
        {
          merchantId: cart?.merchant_id,
          cartItems:  cart?.items?.map(i => ({
            menu_item_id: (i as any).menu_item_id ?? i.id,
            merchant_id:  cart!.merchant_id,
            category_id:  (i as any).category_id ?? null,
            qty:          i.quantity,
            unit_price:   i.price,
          })),
        },
      )

      if (!result.valid || !result.promoCode) return

      setAppliedPromo(result.promoCode)

      if (result.isFreeDelivery) {
        setFreeDeliveryPromoApplied(true)
        setDeliveryFee(0)
        setPromoDiscount(0)
        setBxgyGifts([])
      } else if (result.bxgyGifts?.length) {
        setBxgyGifts(result.bxgyGifts)
        setPromoDiscount(result.discount)
        setFreeDeliveryPromoApplied(false)
      } else {
        setPromoDiscount(result.discount)
        setBxgyGifts([])
        setFreeDeliveryPromoApplied(false)
      }
    } catch (e: any) {
      console.warn('[applyPromoSilent]', e.message)
    }
  }, [user, subtotal, cart])

  // ── Handle manual promo input ─────────────────────────────────────────────
  const handleApplyPromo = async () => {
    if (!promoInput.trim() || !user) return
    setApplyingPromo(true)
    try {
      const result: PromoValidationResult = await promoCodeService.validatePromoCode(
        promoInput.trim(),
        subtotal,
        user.id,
        {
          merchantId: cart?.merchant_id,
          cartItems:  cart?.items?.map(i => ({
            menu_item_id: (i as any).menu_item_id ?? i.id,
            merchant_id:  cart!.merchant_id,
            category_id:  (i as any).category_id ?? null,
            qty:          i.quantity,
            unit_price:   i.price,
          })),
        },
      )

      if (!result.valid || !result.promoCode) {
        Alert.alert('Invalid Promo', result.message)
        return
      }

      setAppliedPromo(result.promoCode)
      setPromoInput('')
      setShowPromoList(false)

      if (result.isFreeDelivery) {
        setFreeDeliveryPromoApplied(true)
        setDeliveryFee(0)
        setDeliveryBreakdown('🚚 Free delivery (promo applied)')
        setIsFreeDelivery(true)
        setPromoDiscount(0)
        setBxgyGifts([])
      } else if (result.bxgyGifts?.length) {
        setBxgyGifts(result.bxgyGifts)
        setPromoDiscount(result.discount)
        setFreeDeliveryPromoApplied(false)
      } else {
        setPromoDiscount(result.discount)
        setBxgyGifts([])
        setFreeDeliveryPromoApplied(false)
      }
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setApplyingPromo(false)
    }
  }

  // ── Remove promo ──────────────────────────────────────────────────────────
  const handleRemovePromo = useCallback(() => {
    setAppliedPromo(null)
    setPromoDiscount(0)
    setBxgyGifts([])
    setFreeDeliveryPromoApplied(false)
    // Re-run delivery calc without promo override
    recalcDelivery()
  }, [recalcDelivery])

  // ── Totals ────────────────────────────────────────────────────────────────
  const taxAmount = useMemo(() => {
    if (!gstEnabled || gstPct <= 0) return 0
    return Math.round((subtotal - promoDiscount) * (gstPct / 100) * 100) / 100
  }, [subtotal, promoDiscount, gstEnabled, gstPct])

  const finalTotal = useMemo(() => {
    const effectiveDelivery = (showDeliveryFee && !isFreeDelivery) ? deliveryFee : 0
    return Math.max(0, Math.round((subtotal - promoDiscount + effectiveDelivery + taxAmount) * 100) / 100)
  }, [subtotal, promoDiscount, deliveryFee, showDeliveryFee, isFreeDelivery, taxAmount])

  const totalSavings = useMemo(() => {
    const itemSavings = (cart?.items ?? []).reduce((s, item) => {
      const d = (item.discount_percentage ?? 0) > 0
        ? item.price * (item.discount_percentage! / 100) * item.quantity : 0
      return s + d
    }, 0)
    return Math.round((itemSavings + promoDiscount) * 100) / 100
  }, [cart?.items, promoDiscount])

  const itemDiscountTotal = useMemo(() =>
    (cart?.items ?? []).reduce((s, i) => {
      const d = (i.discount_percentage ?? 0) > 0
        ? i.price * (i.discount_percentage! / 100) * i.quantity : 0
      return s + d
    }, 0), [cart?.items])

  const estimatedTime = useMemo(
    () => estimatedDeliveryLabel(merchantGeo?.estimated_prep_time, deliveryKm),
    [merchantGeo?.estimated_prep_time, deliveryKm],
  )

  // ── Item note handler ─────────────────────────────────────────────────────
  const handleNoteChange = useCallback((itemId: string, note: string) => {
    setItemNotes(prev => ({ ...prev, [itemId]: note }))
  }, [])

  // ── Checkout ──────────────────────────────────────────────────────────────
  const handleCheckout = () => {
    if (!selectedAddr) {
      Alert.alert('No Address', 'Please add or select a delivery address.')
      return
    }
    if (belowMin) {
      Alert.alert(
        'Minimum Order',
        `Minimum order amount is ₹${minOrder.toFixed(0)}. Add ₹${(minOrder - subtotal).toFixed(0)} more.`,
      )
      return
    }
    router.push({
      pathname: '/(customer)/checkout' as any,
      params: {
        delivery_fee:       String(showDeliveryFee && !isFreeDelivery ? deliveryFee : 0),
        delivery_distance:  String(deliveryKm.toFixed(2)),
        fee_distance:       String(feeDistKm.toFixed(2)),
        tax:                String(taxAmount.toFixed(2)),
        promo_code:         appliedPromo?.code ?? '',
        promo_discount:     String(promoDiscount.toFixed(2)),
        is_free_delivery:   String(isFreeDelivery),
        final_total:        String(finalTotal.toFixed(2)),
        address_id:         selectedAddr.id,
        bxgy_gifts:         JSON.stringify(bxgyGifts),
        order_type:         orderType,
        item_notes:         JSON.stringify(itemNotes),
      },
    })
  }

  // ── Empty / loading states ─────────────────────────────────────────────────
  if (loading || settingsLoading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <Stack.Screen options={{ title: 'Cart' }} />
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  )

  if (!cart?.items?.length) return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Stack.Screen options={{ title: 'Cart' }} />
      <Text style={{ fontSize: 72, marginBottom: 16 }}>🛒</Text>
      <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 }}>
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <Stack.Screen options={{
        title: orderType === 'restaurant' ? 'Cart'
          : orderType === 'store'      ? 'Store Cart'
          :                              'Custom Order Cart',
        headerStyle:      { backgroundColor: COLORS.primary },
        headerTintColor:  '#fff',
        headerTitleStyle: { fontWeight: '800' },
        headerRight: () => (
          <TouchableOpacity onPress={() => setShowClearModal(true)} style={{ marginRight: 14 }}>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '700', fontSize: 13 }}>
              Clear 🗑️
            </Text>
          </TouchableOpacity>
        ),
      }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        {/* ── Restaurant / Store Header ──────────────────────────────── */}
        <CartHeader
          merchantName={cart.merchant_name}
          merchantId={orderType === 'restaurant' ? cart.merchant_id : null}
          displayDistKm={deliveryKm}           // restaurant→customer (shown to user)
          feeDistKm={feeDistKm}                // hub→restaurant→customer (shown as note)
          orderType={orderType}
          estimatedTime={estimatedTime}
          isFreeDelivery={isFreeDelivery || freeDeliveryPromoApplied}
        />

        {/* ── Free Delivery Progress Bar ────────────────────────────── */}
        <FreeDeliveryBar
          subtotal={subtotal}
          threshold={appSettings?.free_delivery_above}
          freeDeliveryPromoApplied={freeDeliveryPromoApplied}
          freeDeliveryPromoCode={freeDeliveryPromoApplied ? appliedPromo?.code : undefined}
        />

        {/* ── Minimum Order Warning ─────────────────────────────────── */}
        {belowMin && (
          <View style={{
            marginHorizontal: 16, marginBottom: 10,
            backgroundColor: '#FEF2F2', borderRadius: 12,
            padding: 12, borderWidth: 1, borderColor: '#FCA5A5',
          }}>
            <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '600' }}>
              ⚠️ Minimum order is ₹{minOrder.toFixed(0)}.
              {' '}Add ₹{(minOrder - subtotal).toFixed(0)} more to proceed.
            </Text>
          </View>
        )}

        {/* ── Delivery fee calculating indicator ───────────────────── */}
        {calcingDelivery && (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 6, gap: 8 }}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Calculating delivery…</Text>
          </View>
        )}

        {/* ── Cart Items ────────────────────────────────────────────── */}
        <CartItemsList
          items={cart.items}
          itemNotes={itemNotes}
          bxgyGifts={bxgyGifts}
          promoDiscount={promoDiscount}
          onUpdateQty={updateQuantity}
          onRemove={removeFromCart}
          onNoteChange={handleNoteChange}
        />

        {/* ── Delivery Address ──────────────────────────────────────── */}
        <DeliveryAddressSection
          addresses={addresses}
          selectedAddr={selectedAddr}
          deliveryBreakdown={deliveryBreakdown}
          showDeliveryFee={showDeliveryFee && !isFreeDelivery}
          onChangeAddr={() => setShowAddrModal(true)}
          onSelectAddr={(a) => {
            setSelectedAddr(a)
            // recalcDelivery fires via useEffect dependency on selectedAddr
          }}
        />

        {/* ── Promo Code ────────────────────────────────────────────── */}
        <PromoSection
          promoInput={promoInput}
          onPromoInputChange={setPromoInput}
          appliedPromo={appliedPromo}
          promoDiscount={promoDiscount}
          applyingPromo={applyingPromo}
          availablePromos={availablePromos}
          showPromoList={showPromoList}
          onTogglePromoList={() => setShowPromoList(v => !v)}
          onApply={handleApplyPromo}
          onSelectPromo={p => applyPromoSilent(p)}
          onRemovePromo={handleRemovePromo}
          subtotal={subtotal}
        />

        {/* ── Bill Summary Table ────────────────────────────────────── */}
        <BillSummaryTable
          subtotal={subtotal}
          itemDiscountTotal={itemDiscountTotal}
          promoDiscount={promoDiscount}
          promoCode={appliedPromo?.code}
          promoIsBxgy={appliedPromo?.deal_type === 'bxgy'}
          deliveryFee={isFreeDelivery ? 0 : deliveryFee}
          showDeliveryFee={showDeliveryFee}
          deliveryBreakdown={deliveryBreakdown}
          gstEnabled={gstEnabled}
          gstPct={gstPct}
          taxAmount={taxAmount}
          finalTotal={finalTotal}
          totalSavings={totalSavings}
        />

        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <Text style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 16 }}>
            Review your order before proceeding.
            Cancellation charges may apply once confirmed.
          </Text>
        </View>
      </ScrollView>

      {/* ── Checkout Bar ──────────────────────────────────────────────── */}
      <CheckoutBar
        itemCount={cart.items.reduce((s, i) => s + i.quantity, 0)}
        finalTotal={finalTotal}
        totalSavings={totalSavings}
        addressLabel={selectedAddr?.label ?? null}
        disabled={!selectedAddr || belowMin}
        onPress={handleCheckout}
      />

      {/* ── Modals ────────────────────────────────────────────────────── */}
      <AddressPickerModal
        visible={showAddrModal}
        addresses={addresses}
        selectedId={selectedAddr?.id ?? null}
        onSelect={setSelectedAddr}
        onClose={() => setShowAddrModal(false)}
        onAddNew={() => {
          setShowAddrModal(false)
          router.push('/(customer)/addresses' as any)
        }}
      />

      <ClearCartModal
        visible={showClearModal}
        itemCount={cart.items.length}
        merchantName={cart.merchant_name}
        onCancel={() => setShowClearModal(false)}
        onConfirm={() => { clearCart(); setShowClearModal(false) }}
      />
    </View>
  )
}
