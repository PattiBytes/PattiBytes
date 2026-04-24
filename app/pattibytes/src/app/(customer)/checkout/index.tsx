/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View, Text, ScrollView, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert, Modal, TouchableOpacity, StyleSheet,
} from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import * as Location from 'expo-location'
import { supabase }            from '../../../lib/supabase'
import { useAuth }             from '../../../contexts/AuthContext'
import { useCart }             from '../../../contexts/CartContext'
import { COLORS }              from '../../../lib/constants'
import { getSavedAddresses, type SavedAddress } from '../../../services/location'
import { promoCodeService, type PromoCode, type PromoValidationResult } from '../../../services/promoCodes'
import { calcDeliveryForRestaurant, calcDeliveryForStore } from '../../../services/deliveryService'
import { useAppSettings }      from '../../../hooks/useAppSettings'
import { ScreenLoader }        from '../../../components/ui/ScreenLoader'

import CheckoutBanner          from '../../../components/checkout/CheckoutBanner'
import CheckoutAddressSection  from '../../../components/checkout/CheckoutAddressSection'
import LiveLocationSection     from '../../../components/checkout/LiveLocationSection'
import OrderItemsSection       from '../../../components/checkout/OrderItemsSection'
import PromoSection            from '../../../components/checkout/PromoSection'
import NotesSection            from '../../../components/checkout/NotesSection'
import PaymentSection, { type PayMethod } from '../../../components/checkout/PaymentSection'
import CheckoutBillSummary     from '../../../components/checkout/CheckoutBillSummary'
import PlaceOrderBar           from '../../../components/checkout/PlaceOrderBar'
import {
  notifyOrderPlaced,
  createAndSendNotification,
} from '../../../lib/notificationHandler'
import type { OrderType, BxGyGift } from '../../../components/checkout/types'

// ─────────────────────────────────────────────────────────────────────────────

function formatAddr(a: SavedAddress): string {
  return [
    a.address,
    a.apartment_floor ? `Flat/Floor: ${a.apartment_floor}` : '',
    a.landmark        ? `Near ${a.landmark}` : '',
    a.city, a.state,
    a.postal_code ?? '',
  ].filter(Boolean).join(', ')
}

const API_BASE = 'https://pbexpress.pattibytes.com'

function isValidUUID(v: string | null | undefined): boolean {
  if (!v) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

// ─── Notification helpers ─────────────────────────────────────────────────────
// ─── Multi-cart session notification (client-side, uses notificationHandler) ─
async function notifyMultiCartSessionLocal(
  userId:       string,
  sessionId:    string,
  orderCount:   number,
  merchantNames: string[],
  totalAmount:   number,
  orderNums:     (string | number | null)[],
): Promise<void> {
  const namesStr = merchantNames.slice(0, 3).join(', ') +
    (merchantNames.length > 3 ? ` +${merchantNames.length - 3} more` : '')

  await createAndSendNotification({
    userId,
    title:     `🎉 ${orderCount} Orders Placed!`,
    body:      `From ${namesStr}. Total ₹${totalAmount.toFixed(2)}. All orders are being confirmed.`,
    type:      'new_order',
    channelId: 'orders',
    data: {
      cart_session_id: sessionId,
      order_count:     orderCount,
      order_numbers:   orderNums,
      total_amount:    totalAmount,
      status:          'pending',
      is_multi:        true,
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { cart, allCarts, multiCart, clearCart } = useCart()

  const params = useLocalSearchParams<{
    delivery_fee?:      string
    delivery_distance?: string
    fee_distance?:      string
    tax?:               string
    promo_code?:        string
    promo_discount?:    string
    is_free_delivery?:  string
    final_total?:       string
    address_id?:        string
    bxgy_gifts?:        string
    order_type?:        string
    item_notes?:        string
    is_multi_cart?:     string
    // ── New params passed from the updated cart screen ──
    grand_total?:       string
    grand_delivery?:    string
    grand_tax?:         string
    grand_discount?:    string
    grand_subtotal?:    string
    merchant_metas?:    string   // JSON: MerchantMetaParam[]
  }>()

  const { settings: appSettings, loading: settingsLoading } = useAppSettings()

  const isMultiCart = params.is_multi_cart === 'true' || allCarts.length > 1
  const orderType: OrderType = (params.order_type as OrderType) ?? 'restaurant'
  const isStoreOrCustom = orderType === 'store' || orderType === 'custom'

  // ── Merchant metas passed from cart (pre-computed per-merchant bills) ──────
  type MerchantMetaParam = {
    merchant_id:      string
    merchant_name:    string
    subtotal:         number
    delivery_fee:     number
    tax:              number
    discount:         number
    promo_code?:      string | null
    promo_id?:        string | null
    bxgy_gifts?:      BxGyGift[]
    is_free_delivery: boolean
    delivery_km?:     number
    fee_dist_km?:     number
  }

  const merchantMetas = useMemo<MerchantMetaParam[]>(() => {
    if (!params.merchant_metas) return []
    try { return JSON.parse(params.merchant_metas) } catch { return [] }
  }, [params.merchant_metas])

  // ── State ──────────────────────────────────────────────────────────────────
  const [addresses,     setAddresses]     = useState<SavedAddress[]>([])
  const [selectedAddr,  setSelectedAddr]  = useState<SavedAddress | null>(null)
  const [showAddrModal, setShowAddrModal] = useState(false)

  const [deliveryFee,       setDeliveryFee]       = useState(Number(params.delivery_fee ?? 35))
  const [deliveryKm,        setDeliveryKm]        = useState(Number(params.delivery_distance ?? 0))
  const [deliveryBreakdown, setDeliveryBreakdown] = useState('')
  const [showDeliveryFee,   setShowDeliveryFee]   = useState(true)
  const [isFreeDelivery,    setIsFreeDelivery]    = useState(params.is_free_delivery === 'true')
  const [calcingDelivery,   setCalcingDelivery]   = useState(false)

  const [promoInput,               setPromoInput]               = useState('')
  const [appliedPromo,             setAppliedPromo]             = useState<PromoCode | null>(null)
  const [promoDiscount,            setPromoDiscount]            = useState(Number(params.promo_discount ?? 0))
  const [applyingPromo,            setApplyingPromo]            = useState(false)
  const [availablePromos,          setAvailablePromos]          = useState<PromoCode[]>([])
  const [showPromoList,            setShowPromoList]            = useState(false)
  const [bxgyGifts,                setBxgyGifts]                = useState<BxGyGift[]>(() =>
    params.bxgy_gifts ? JSON.parse(params.bxgy_gifts) : []
  )
  const [freeDeliveryPromoApplied, setFreeDeliveryPromoApplied] = useState(
    params.is_free_delivery === 'true',
  )

  const [itemNotes,   setItemNotes]   = useState<Record<string, string>>(() =>
    params.item_notes ? JSON.parse(params.item_notes) : {}
  )
  const handleNoteChange = useCallback(
    (id: string, note: string) => setItemNotes(prev => ({ ...prev, [id]: note })),
    [],
  )

  const [specialInst, setSpecialInst] = useState('')
  const [notes,       setNotes]       = useState('')
  const [payMethod,   setPayMethod]   = useState<PayMethod>('cod')

  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locLoading,   setLocLoading]   = useState(false)
  const [locRequired,  setLocRequired]  = useState(false)
  const watchRef   = useRef<Location.LocationSubscription | null>(null)
  const orderIdRef = useRef<string | null>(null)

  const [merchantGeo, setMerchantGeo] = useState<{
    latitude?: number | null; longitude?: number | null;
    gst_enabled?: boolean; gst_percentage?: number | null; phone?: string | null
  } | null>(null)
  const [gstEnabled, setGstEnabled] = useState(false)
  const [gstPct,     setGstPct]     = useState(0)

  const [loading,  setLoading]  = useState(true)
  const [placing,  setPlacing]  = useState(false)

  // ── Carts to process ──────────────────────────────────────────────────────
  const cartsToProcess = useMemo(
    () => isMultiCart ? allCarts : (cart ? [cart] : []),
    [isMultiCart, allCarts, cart],
  )

  // ── Subtotal (grand across all carts) ────────────────────────────────────
  const subtotal = useMemo(() =>
    cartsToProcess.reduce((sum, c) => sum + c.subtotal, 0),
    [cartsToProcess],
  )

  // ── Custom order ref ──────────────────────────────────────────────────────
  const customOrderRef = useMemo<string | undefined>(() => {
    if (orderType !== 'custom' && orderType !== 'store') return undefined
    const chars  = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const suffix = Array.from({ length: 4 }, () =>
      chars[Math.floor(Math.random() * chars.length)]).join('')
    return orderType === 'custom' ? `PBX-CUST-${suffix}` : `PBX-STORE-${suffix}`
  }, [orderType])

  // ── Load page data ────────────────────────────────────────────────────────
  const loadCheckout = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const primaryMerchantId = cart?.merchant_id ?? allCarts[0]?.merchant_id

      const [addrList, merchData] = await Promise.all([
        getSavedAddresses(user.id),
        !isStoreOrCustom && primaryMerchantId
          ? supabase
              .from('merchants')
              .select('latitude, longitude, gst_enabled, gst_percentage, phone')
              .eq('id', primaryMerchantId)
              .maybeSingle()
              .then(({ data }) => data)
          : Promise.resolve(null),
      ])

      const list  = addrList ?? []
      setAddresses(list)
      const found = params.address_id
        ? list.find(a => a.id === params.address_id)
        : list.find(a => a.is_default) ?? list[0]
      setSelectedAddr(found ?? null)
      setShowDeliveryFee(appSettings.delivery_fee_enabled !== false)

      if (merchData) {
        setMerchantGeo(merchData as any)
        setGstEnabled(!!(merchData as any).gst_enabled)
        setGstPct(Number((merchData as any).gst_percentage ?? 0))
      }

      if (primaryMerchantId) {
        const promos = await promoCodeService.getActivePromos(
          isStoreOrCustom ? null : primaryMerchantId,
        )
        setAvailablePromos(promos ?? [])
      }

      if (params.promo_code && user) {
        try {
          const activeCart = cart ?? allCarts[0]
          const res: PromoValidationResult = await promoCodeService.validatePromoCode(
            params.promo_code, subtotal, user.id,
            {
              merchantId: activeCart?.merchant_id,
              cartItems: activeCart?.items?.map(i => ({
                menu_item_id: (i as any).menu_item_id ?? i.id,
                merchant_id:  activeCart.merchant_id,
                category_id:  (i as any).category_id ?? null,
                qty:          i.quantity,
                unit_price:   i.price,
              })),
            },
          )
          if (res.valid && res.promoCode) {
            setAppliedPromo(res.promoCode)
            setPromoDiscount(Number(params.promo_discount) || res.discount)
            if (res.isFreeDelivery) {
              setFreeDeliveryPromoApplied(true); setIsFreeDelivery(true); setDeliveryFee(0)
            }
            if (res.bxgyGifts?.length) setBxgyGifts(res.bxgyGifts)
          }
        } catch (e: any) { console.warn('[CheckoutPage] promo re-validate', e.message) }
      }
    } catch (e: any) { console.warn('[CheckoutPage] loadCheckout', e.message) }
    finally { setLoading(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, cart?.merchant_id, params.address_id, params.promo_code, isStoreOrCustom])

  useEffect(() => { loadCheckout() }, [loadCheckout])
  useEffect(() => { detectLocation() }, [])

  const detectLocation = async () => {
    setLocLoading(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setLocRequired(true)
        Alert.alert('Location Required', 'Live location is needed so our driver can find you.', [{ text: 'OK' }])
        return
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      setLiveLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      setLocRequired(false)
    } catch (e: any) { Alert.alert('Location Error', e.message) }
    finally { setLocLoading(false) }
  }

  const startWatch = useCallback(async () => {
    if (watchRef.current || !orderIdRef.current) return
    watchRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 8000, distanceInterval: 20 },
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        setLiveLocation({ lat, lng })
        if (orderIdRef.current) {
          await supabase.from('orders').update({
            customer_location: { lat, lng },
            updated_at: new Date().toISOString(),
          }).eq('id', orderIdRef.current)
        }
      },
    )
  }, [])

  useEffect(() => () => { watchRef.current?.remove() }, [])

  // ── Recalc delivery on address change ────────────────────────────────────
  useEffect(() => {
    if (!selectedAddr?.latitude || !selectedAddr?.longitude || settingsLoading) return
    ;(async () => {
      setCalcingDelivery(true)
      try {
        const result = isStoreOrCustom
          ? await calcDeliveryForStore(selectedAddr.latitude!, selectedAddr.longitude!, subtotal)
          : merchantGeo?.latitude && merchantGeo?.longitude
            ? await calcDeliveryForRestaurant(
                merchantGeo.latitude!, merchantGeo.longitude!,
                selectedAddr.latitude!, selectedAddr.longitude!, subtotal,
              )
            : null
        if (!result) return
        if (freeDeliveryPromoApplied) {
          setDeliveryFee(0); setDeliveryKm(result.displayDistanceKm)
          setDeliveryBreakdown('🚚 Free delivery (promo applied)'); setIsFreeDelivery(true)
        } else {
          setDeliveryFee(result.fee); setDeliveryKm(result.displayDistanceKm)
          setDeliveryBreakdown(result.breakdown); setIsFreeDelivery(result.isFreeDelivery)
        }
      } catch (e: any) { console.warn('[CheckoutPage] recalcDelivery', e.message) }
      finally { setCalcingDelivery(false) }
    })()
  }, [selectedAddr, merchantGeo, subtotal, isStoreOrCustom, freeDeliveryPromoApplied, settingsLoading])

  // ── Promo handlers ────────────────────────────────────────────────────────
  const handleApplyPromo = async () => {
    if (!promoInput.trim() || !user) return
    setApplyingPromo(true)
    try {
      const activeCart = cart ?? allCarts[0]
      const result: PromoValidationResult = await promoCodeService.validatePromoCode(
        promoInput.trim(), subtotal, user.id,
        {
          merchantId: activeCart?.merchant_id,
          cartItems: activeCart?.items?.map(i => ({
            menu_item_id: (i as any).menu_item_id ?? i.id,
            merchant_id:  activeCart!.merchant_id,
            category_id:  (i as any).category_id ?? null,
            qty:          i.quantity,
            unit_price:   i.price,
          })),
        }
      )
      if (!result.valid || !result.promoCode) { Alert.alert('Invalid Promo', result.message); return }
      setAppliedPromo(result.promoCode); setPromoInput(''); setShowPromoList(false)
      if (result.isFreeDelivery) {
        setFreeDeliveryPromoApplied(true); setDeliveryFee(0)
        setDeliveryBreakdown('🚚 Free delivery (promo applied)'); setIsFreeDelivery(true); setPromoDiscount(0)
      } else {
        setFreeDeliveryPromoApplied(false); setPromoDiscount(result.discount)
        if (result.bxgyGifts?.length) setBxgyGifts(result.bxgyGifts)
      }
    } catch (e: any) { Alert.alert('Error', e.message) }
    finally { setApplyingPromo(false) }
  }

  const handleRemovePromo = () => {
    setAppliedPromo(null); setPromoDiscount(0); setBxgyGifts([])
    setFreeDeliveryPromoApplied(false); setIsFreeDelivery(false)
  }

  // ── Totals ────────────────────────────────────────────────────────────────
  const taxAmount = useMemo(() => {
    if (!gstEnabled || gstPct <= 0) return 0
    return Math.round((subtotal - promoDiscount) * (gstPct / 100) * 100) / 100
  }, [subtotal, promoDiscount, gstEnabled, gstPct])

  const effectiveDeliveryFee = showDeliveryFee && !isFreeDelivery ? deliveryFee : 0

  const finalTotal = useMemo(() => {
    // In multi-cart mode: use grand totals passed from cart screen if available
    if (isMultiCart && params.grand_total) return Number(params.grand_total)
    return Math.max(
      0,
      Math.round((subtotal - promoDiscount + effectiveDeliveryFee + taxAmount) * 100) / 100,
    )
  }, [subtotal, promoDiscount, effectiveDeliveryFee, taxAmount, isMultiCart, params.grand_total])

  const totalSavings = useMemo(() => {
    const itemSavings = cartsToProcess.reduce((sum, c) =>
      sum + c.items.reduce((s, item) => {
        const d = (item.discount_percentage ?? 0) > 0
          ? item.price * (item.discount_percentage! / 100) * item.quantity : 0
        return s + d
      }, 0), 0)
    return Math.round((itemSavings + promoDiscount) * 100) / 100
  }, [cartsToProcess, promoDiscount])

  const itemDiscountTotal = useMemo(() =>
    cartsToProcess.reduce((sum, c) =>
      sum + c.items.reduce((s, i) => {
        const d = (i.discount_percentage ?? 0) > 0
          ? i.price * (i.discount_percentage! / 100) * i.quantity : 0
        return s + d
      }, 0), 0),
    [cartsToProcess],
  )

  // ─────────────────────────────────────────────────────────────────────────
  // ── handlePlaceOrder ──────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (!user || !selectedAddr) {
      Alert.alert('Incomplete', 'Please select a delivery address.')
      return
    }
    if (!liveLocation) {
      Alert.alert('Location Required', 'Live location is mandatory to track your delivery.', [
        { text: 'Allow Now', onPress: detectLocation },
        { text: 'Cancel', style: 'cancel' },
      ])
      return
    }
    if (!cartsToProcess.length) {
      Alert.alert('Empty Cart', 'Add items before placing an order.')
      return
    }

    setPlacing(true)
    try {
      const eta     = new Date(Date.now() + 45 * 60 * 1000).toISOString()
      const addrStr = formatAddr(selectedAddr)

      // ── Step 1: Create multi_cart_session ─────────────────────────────────
      const grandTotal     = Number((params.grand_total    ?? finalTotal).toString())
      const grandSubtotal  = Number((params.grand_subtotal ?? subtotal).toString())
      const grandDelivery  = Number((params.grand_delivery ?? effectiveDeliveryFee).toString())
      const grandTax       = Number((params.grand_tax      ?? taxAmount).toString())
      const grandDiscount  = Number((params.grand_discount ?? promoDiscount).toString())

      const { data: session, error: sessionError } = await supabase
        .from('multi_cart_sessions')
        .insert({
          customer_id:         user.id,
          merchant_ids:        cartsToProcess.map(c => c.merchant_id).filter(isValidUUID),
          order_ids:           [],
          total_amount:        grandTotal,
          subtotal:            grandSubtotal,
          total_delivery_fee:  grandDelivery,
          total_tax:           grandTax,
          delivery_address:    addrStr,
          delivery_latitude:   selectedAddr.latitude  ?? null,
          delivery_longitude:  selectedAddr.longitude ?? null,
          delivery_address_id: selectedAddr.id        ?? null,
          payment_method:      payMethod,
          payment_status:      'pending',
          status:              'pending',
          promo_code:          appliedPromo?.code ?? null,
          promo_id:            appliedPromo?.id   ?? null,
          discount:            grandDiscount,
          notes:               notes.trim() || null,
        })
        .select()
        .single()

      if (sessionError) throw sessionError

      // ── Step 2: One order per cart entry ──────────────────────────────────
      const placedOrders: any[] = []

      for (let idx = 0; idx < cartsToProcess.length; idx++) {
        const merchantCart = cartsToProcess[idx]
        const isStorCart   = !isValidUUID(merchantCart.merchant_id)

        // Use pre-computed meta if available (passed from multi-cart screen)
        const meta = merchantMetas.find(m => m.merchant_id === merchantCart.merchant_id)

        const merchantSubtotal  = meta?.subtotal  ?? merchantCart.subtotal
        const discountShare     = meta?.discount  ?? (subtotal > 0
          ? Math.round((promoDiscount * merchantSubtotal / subtotal) * 100) / 100
          : promoDiscount)
        const merchantTax       = meta?.tax       ?? (subtotal > 0 && gstEnabled && gstPct > 0
          ? Math.round((taxAmount * merchantSubtotal / subtotal) * 100) / 100
          : (idx === 0 ? taxAmount : 0))
        const merchantDeliveryFee = meta?.delivery_fee ?? (
          isMultiCart
            ? (showDeliveryFee && !isFreeDelivery ? deliveryFee : 0)
            : effectiveDeliveryFee
        )
        const merchantTotal = Math.max(
          0,
          Math.round((merchantSubtotal - discountShare + merchantDeliveryFee + merchantTax) * 100) / 100,
        )

        // BxGy gifts: use meta's if available, else assign to first order only
        const giftsForThisOrder = meta?.bxgy_gifts?.length
          ? meta.bxgy_gifts
          : (idx === 0 ? bxgyGifts : [])

        const orderItems = [
          ...merchantCart.items.map((i: any) => ({
            id:                  i.id,
            menu_item_id:        (i as any).menu_item_id ?? i.id,
            name:                i.name,
            price:               i.price,
            quantity:            i.quantity,
            discount_percentage: i.discount_percentage ?? 0,
            image_url:           i.image_url ?? null,
            category:            i.category ?? null,
            is_veg:              i.is_veg ?? null,
            merchant_id:         isValidUUID(merchantCart.merchant_id) ? merchantCart.merchant_id : null,
            note:                itemNotes[i.id] ?? (i as any).note ?? null,
            is_free:             false,
            is_custom_product:   isStorCart,
          })),
          ...giftsForThisOrder.map(g => ({
            id:                  `${g.menuItemId}_free`,
            menu_item_id:        g.menuItemId,
            name:                `${g.name} (FREE)`,
            price:               0,
            quantity:            g.qty,
            discount_percentage: 100,
            image_url:           null,
            category:            'Promo Gift',
            is_veg:              null,
            merchant_id:         null,
            note:                null,
            is_free:             true,
            is_custom_product:   false,
          })),
        ]

        const resolvedOrderType: OrderType = isStorCart
          ? (orderType ?? 'store')
          : 'restaurant'

        const orderPayload: Record<string, any> = {
          customer_id:             user.id,
          merchant_id:             isValidUUID(merchantCart.merchant_id) ? merchantCart.merchant_id : null,
          order_type:              resolvedOrderType,
          status:                  'pending',
          subtotal:                merchantSubtotal,
          delivery_fee:            merchantDeliveryFee,
          tax:                     merchantTax,
          discount:                discountShare,
          total_amount:            merchantTotal,
          payment_method:          payMethod,
          payment_status:          'pending',
          delivery_address:        addrStr,
          delivery_address_label:  selectedAddr.label,
          delivery_address_id:     selectedAddr.id,
          delivery_latitude:       selectedAddr.latitude  ?? null,
          delivery_longitude:      selectedAddr.longitude ?? null,
          delivery_distance_km:    (meta?.delivery_km ?? deliveryKm) > 0
                                     ? parseFloat((meta?.delivery_km ?? deliveryKm).toFixed(2))
                                     : null,
          customer_phone:          selectedAddr.recipient_phone ?? null,
          recipient_name:          selectedAddr.recipient_name  ?? null,
          special_instructions:    specialInst.trim() || null,
          customer_notes:          notes.trim() || null,
          delivery_instructions:   selectedAddr.delivery_instructions ?? null,
          promo_code:              idx === 0 ? (appliedPromo?.code ?? meta?.promo_code ?? null) : null,
          promo_id:                idx === 0 ? (appliedPromo?.id   ?? meta?.promo_id   ?? null) : null,
          customer_location:       { lat: liveLocation.lat, lng: liveLocation.lng },
          items:                   orderItems,
          preparation_time:        resolvedOrderType === 'custom' ? 60 : resolvedOrderType === 'store' ? 20 : 30,
          estimated_delivery_time: eta,
          platform_handled:        isStorCart,
          // ── Multi-cart session linkage ────────────────────────────────────
          cart_session_id:         session.id,
          session_order_index:     idx,
          merchant_ids:            cartsToProcess.map(c => c.merchant_id).filter(isValidUUID),
          ...(resolvedOrderType === 'custom' || resolvedOrderType === 'store'
            ? {
                custom_order_ref:    customOrderRef,
                custom_order_status: 'pending',
                hub_origin: { lat: 31.2837165, lng: 74.847114, label: 'Patti, Punjab 143416' },
              }
            : {}),
        }

        const { data: order, error: orderError } = await supabase
          .from('orders').insert(orderPayload).select().single()
        if (orderError) throw orderError
        placedOrders.push(order)

        if (resolvedOrderType === 'custom' && order) {
          await supabase.from('custom_order_requests').insert({
            order_id:         order.id,
            customer_id:      user.id,
            custom_order_ref: customOrderRef!,
            category:         (merchantCart as any).customCategory ?? 'custom',
            description:      specialInst.trim() || null,
            image_url:        (merchantCart as any).customImageUrl ?? null,
            items:            orderItems,
            status:           'pending',
            delivery_address: addrStr,
            delivery_lat:     selectedAddr.latitude  ?? null,
            delivery_lng:     selectedAddr.longitude ?? null,
            total_amount:     merchantTotal,
            delivery_fee:     merchantDeliveryFee,
            payment_method:   payMethod,
            customer_phone:   selectedAddr.recipient_phone ?? null,
            created_at:       new Date().toISOString(),
            updated_at:       new Date().toISOString(),
          })
        }

        if (resolvedOrderType === 'store' && order) {
          await supabase.from('customproductorders').insert({
            order_id:             order.id,
            customer_id:          user.id,
            items:                orderItems,
            total_amount:         merchantTotal,
            delivery_fee:         merchantDeliveryFee,
            delivery_distance_km: deliveryKm > 0 ? parseFloat(deliveryKm.toFixed(2)) : null,
            delivery_address:     addrStr,
            delivery_latitude:    selectedAddr.latitude  ?? null,
            delivery_longitude:   selectedAddr.longitude ?? null,
            customer_location:    orderPayload.customer_location,
            status:               'pending',
            payment_method:       payMethod,
            special_instructions: specialInst.trim() || null,
            customer_notes:       notes.trim() || null,
            custom_order_ref:     customOrderRef,
            created_at:           new Date().toISOString(),
          })
        }
      }

      // ── Step 3: Update session with complete merchant bills ───────────────
      await supabase
        .from('multi_cart_sessions')
        .update({
          order_ids: placedOrders.map(o => o.id),
          merchant_bills: cartsToProcess.map((c, idx) => {
            const meta      = merchantMetas.find(m => m.merchant_id === c.merchant_id)
            const discShare = meta?.discount ?? (subtotal > 0
              ? Math.round((promoDiscount * c.subtotal / subtotal) * 100) / 100 : 0)
            const taxShare  = meta?.tax ?? (subtotal > 0
              ? Math.round((taxAmount * c.subtotal / subtotal) * 100) / 100 : 0)
            const delivFee  = meta?.delivery_fee ?? (
              isMultiCart ? (showDeliveryFee && !isFreeDelivery ? deliveryFee : 0) : effectiveDeliveryFee
            )
            return {
              merchant_id:   isValidUUID(c.merchant_id) ? c.merchant_id : null,
              merchant_name: c.merchant_name,
              order_id:      placedOrders[idx]?.id,
              order_number:  placedOrders[idx]?.order_number,
              subtotal:      c.subtotal,
              discount:      discShare,
              delivery_fee:  delivFee,
              tax:           taxShare,
              total:         Math.max(
                0,
                Math.round((c.subtotal - discShare + delivFee + taxShare) * 100) / 100,
              ),
            }
          }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.id)

      // ── Step 4: Promo usage (once for whole session) ──────────────────────
      if (appliedPromo && placedOrders[0]) {
        await Promise.allSettled([
          supabase.from('promo_usage').insert({
            promo_code_id: appliedPromo.id,
            order_id:      placedOrders[0].id,
            user_id:       user.id,
            discount:      promoDiscount,
            used_at:       new Date().toISOString(),
          }),
          supabase
            .from('promo_codes')
            .update({ used_count: (appliedPromo.used_count ?? 0) + 1 })
            .eq('id', appliedPromo.id),
        ])
      }

      // ─── Step 5: Push notifications ──────────────────────────────────────────────
if (isMultiCart && placedOrders.length > 1) {
  // 5a. ONE consolidated push + in-app row to customer (via createAndSendNotification)
  await notifyMultiCartSessionLocal(
    user.id,
    session.id,
    placedOrders.length,
    cartsToProcess.map(c => c.merchant_name),
    grandTotal,
    placedOrders.map(o => o.order_number ?? null),
  )

  // 5b. Per-merchant + admin pushes (NOT customer — they got 5a)
  await Promise.allSettled(
    placedOrders.map(async (o) => {
      try {
        const num = o.order_number ?? o.id?.slice(0, 8)

        // Merchant owner
        if (isValidUUID(o.merchant_id)) {
          const { data: m } = await supabase
            .from('merchants')
            .select('user_id')
            .eq('id', o.merchant_id)
            .maybeSingle()

          if (m?.user_id) {
            await createAndSendNotification({
              userId:    m.user_id,
              title:     `🔔 New Order #${num}`,
              body:      `Part of a multi-restaurant order. Please confirm it.`,
              type:      'new_order',
              channelId: 'orders',
              data: {
                order_id:        o.id,
                order_number:    num,
                cart_session_id: session.id,
                is_multi:        true,
                status:          'pending',
              },
            })
          }
        }

        // Admins / superadmins
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .in('role', ['admin', 'superadmin'])
          .eq('is_active', true)

        if (admins?.length) {
          await Promise.allSettled(
            admins.map(({ id: adminId }) =>
              createAndSendNotification({
                userId:    adminId,
                title:     `📋 Multi-Order #${num} (${placedOrders.length} restaurants)`,
                body:      `Session ${session.id.slice(0, 8)} — order #${num} from ${o.merchant_id ? 'restaurant' : 'store'}.`,
                type:      'new_order',
                channelId: 'orders',
                data: {
                  order_id:        o.id,
                  order_number:    num,
                  cart_session_id: session.id,
                  is_multi:        true,
                  forwarded_from:  user.id,
                },
              }),
            ),
          )
        }
      } catch (e: any) {
        console.warn('[checkout] multi-cart per-order notify:', e?.message)
      }
    }),
  )
} else {
  // Single-cart: notifyOrderPlaced handles customer + merchant + admins in one call
  // This function is from lib/notificationHandler.ts — uses createAndSendNotification internally
  await Promise.allSettled(
    placedOrders.map(o =>
      notifyOrderPlaced(
        user.id,
        o.id,
        o.order_number ?? null,
        o.merchant_id ?? null,
      ),
    ),
  )
}

// ─── Step 6: In-app notification row (bell icon) ─────────────────────────────
// NOTE: For single-cart, notifyOrderPlaced already calls createAndSendNotification
// which inserts the row + fires the push atomically. No duplicate insert needed.
// For multi-cart, notifyMultiCartSessionLocal already did it in Step 5a.
// This block is now ONLY for a session-level summary row (multi-cart only).
if (isMultiCart && placedOrders.length > 1) {
  // Already handled in Step 5a via createAndSendNotification — skip to avoid duplicate
  // If you want an extra "summary" row with session link, uncomment below:
  /*
  await supabase.from('notifications').insert({
    user_id:    user.id,
    title:      `${placedOrders.length} Orders Placed!`,
    message:    `${placedOrders.length} orders from ${cartsToProcess.map(c => c.merchant_name).join(', ')} placed. Total ₹${grandTotal.toFixed(2)}`,
    type:       'order',
    data: {
      cart_session_id: session.id,
      order_ids:       placedOrders.map(o => o.id),
      order_numbers:   placedOrders.map(o => o.order_number),
      status:          'pending',
      is_multi:        true,
    },
    body:       `Total ₹${grandTotal.toFixed(2)}`,
    is_read:    false,
    sent_push:  true,   // ← already sent in Step 5a
    created_at: new Date().toISOString(),
  })
  */
}

      // ── Step 7: Finalise ──────────────────────────────────────────────────
      orderIdRef.current = placedOrders[0].id
      startWatch()
      clearCart()

      if (isMultiCart && placedOrders.length > 1) {
        router.replace(`/(customer)/orders/session/${session.id}` as any)
      } else {
        router.replace(`/(customer)/orders/${placedOrders[0].id}` as any)
      }

    } catch (e: any) {
      Alert.alert('Order Failed', e.message ?? 'Please try again.')
    } finally {
      setPlacing(false)
    }
  }

  // ── Guards ────────────────────────────────────────────────────────────────
  if (loading || settingsLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
        <Stack.Screen options={{ title: 'Checkout', statusBarTranslucent: true, statusBarStyle: 'light' }} />
        <ScreenLoader variant="checkout" />
      </View>
    )
  }

  if (!cartsToProcess.length || !cartsToProcess.some(c => c.items.length > 0)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#F8F9FA', padding: 24 }}>
        <Stack.Screen options={{ title: 'Checkout', statusBarTranslucent: true, statusBarStyle: 'light' }} />
        <Text style={{ fontSize: 72, marginBottom: 16 }}>🛒</Text>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8 }}>
          Cart is empty
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: COLORS.primary, borderRadius: 14,
            paddingHorizontal: 28, paddingVertical: 14 }}
          onPress={() => router.replace('/(customer)/dashboard' as any)}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Browse</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const titleMap: Record<OrderType, string> = {
    restaurant: isMultiCart ? `Checkout (${cartsToProcess.length} restaurants)` : 'Checkout',
    store:      'Store Checkout',
    custom:     'Custom Order Checkout',
  }

  const displayCart = cart ?? allCarts[0]

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <Stack.Screen options={{
        title: titleMap[orderType],
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
        statusBarTranslucent: true,
        statusBarStyle: 'light',
      }} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>

          <CheckoutBanner
            orderType={orderType}
            merchantName={isMultiCart
              ? cartsToProcess.map(c => c.merchant_name).join(' + ')
              : (displayCart?.merchant_name ?? '')}
            customOrderTag={customOrderRef}
            isMultiCart={isMultiCart}
            merchantCount={cartsToProcess.length}
          />

          <View style={{ marginTop: 10 }}>
            <CheckoutAddressSection
              addresses={addresses}
              selectedAddr={selectedAddr}
              deliveryFee={deliveryFee}
              deliveryKm={deliveryKm}
              deliveryBreakdown={isMultiCart
                ? `${cartsToProcess.length} separate deliveries · ₹${effectiveDeliveryFee.toFixed(0)} each`
                : deliveryBreakdown}
              showDeliveryFee={showDeliveryFee}
              isFreeDelivery={isFreeDelivery}
              orderType={orderType}
              onChangeAddr={() => setShowAddrModal(true)}
              onSelectAddr={addr => { setSelectedAddr(addr); setShowAddrModal(false) }}
            />
          </View>

          <LiveLocationSection
            liveLocation={liveLocation}
            locLoading={locLoading}
            locRequired={locRequired}
            onDetect={detectLocation}
          />

          {isMultiCart
            ? cartsToProcess.map(c => (
                <View key={c.merchant_id} style={S.merchantCard}>
                  <View style={S.merchantCardHeader}>
                    <Text style={S.merchantCardTitle}>🍽️ {c.merchant_name}</Text>
                    <Text style={S.merchantCardSub}>
                      {c.items.reduce((s, i) => s + i.quantity, 0)} items · ₹{c.subtotal.toFixed(2)}
                    </Text>
                  </View>
                  <OrderItemsSection
                    items={c.items as any}
                    itemNotes={itemNotes}
                    bxgyGifts={[]}
                    appliedPromo={null}
                    onNoteChange={handleNoteChange}
                  />
                </View>
              ))
            : (
                <OrderItemsSection
                  items={(displayCart?.items ?? []) as any}
                  itemNotes={itemNotes}
                  bxgyGifts={bxgyGifts}
                  appliedPromo={appliedPromo}
                  onNoteChange={handleNoteChange}
                />
              )
          }

          {/* Promo is global in single-cart; per-merchant promos are handled in cart screen for multi */}
          {!isMultiCart && (
            <PromoSection
              promoInput={promoInput}
              appliedPromo={appliedPromo}
              promoDiscount={promoDiscount}
              applyingPromo={applyingPromo}
              availablePromos={availablePromos}
              showPromoList={showPromoList}
              onPromoChange={setPromoInput}
              onToggleList={() => setShowPromoList(v => !v)}
              onApply={handleApplyPromo}
              onSelectPromo={p => { setPromoInput(p.code); setTimeout(handleApplyPromo, 50) }}
              onRemove={handleRemovePromo}
              subtotal={subtotal}
            />
          )}

          {isMultiCart && merchantMetas.some(m => m.discount > 0) && (
            <View style={S.multiPromoInfo}>
              <Text style={S.multiPromoText}>
                🎟️ Promo discounts applied per restaurant in your cart
              </Text>
            </View>
          )}

          <NotesSection
            specialInst={specialInst}
            notes={notes}
            orderType={orderType}
            onSpecialInstChange={setSpecialInst}
            onNotesChange={setNotes}
          />

          <PaymentSection payMethod={payMethod} onSelect={setPayMethod} />

          <CheckoutBillSummary
            subtotal={subtotal}
            itemDiscountTotal={itemDiscountTotal}
            promoDiscount={promoDiscount}
            promoCode={appliedPromo?.code}
            promoIsBxgy={appliedPromo?.deal_type === 'bxgy'}
            bxgyGiftCount={bxgyGifts.reduce((s, g) => s + g.qty, 0)}
            deliveryFee={deliveryFee}
            showDeliveryFee={showDeliveryFee}
            isFreeDelivery={isFreeDelivery}
            deliveryBreakdown={deliveryBreakdown}
            gstEnabled={gstEnabled}
            gstPct={gstPct}
            taxAmount={taxAmount}
            finalTotal={finalTotal}
            totalSavings={totalSavings}
            isMultiCart={isMultiCart}
            merchantCount={cartsToProcess.length}
          />

          <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
            <Text style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 16 }}>
              By placing this order you agree to our terms.{' '}
              {isMultiCart
                ? `${cartsToProcess.length} separate orders will be placed simultaneously.`
                : 'Cancellation charges may apply once confirmed.'}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <PlaceOrderBar
        finalTotal={finalTotal}
        totalSavings={totalSavings}
        payMethod={payMethod}
        hasLocation={!!liveLocation}
        placing={placing}
        disabled={!selectedAddr || !liveLocation}
        onPress={handlePlaceOrder}
      />

      <Modal visible={showAddrModal} transparent animationType="slide"
        onRequestClose={() => setShowAddrModal(false)}>
        <View style={MS.overlay}>
          <View style={MS.sheet}>
            <View style={MS.handle} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 17, fontWeight: '900', color: '#111827' }}>Select Address</Text>
              <TouchableOpacity onPress={() => setShowAddrModal(false)}>
                <Text style={{ fontSize: 22, color: '#9CA3AF' }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              {addresses.map(a => (
                <TouchableOpacity key={a.id}
                  style={[MS.addrRow, selectedAddr?.id === a.id && MS.addrRowActive]}
                  onPress={() => { setSelectedAddr(a); setShowAddrModal(false) }}
                  activeOpacity={0.8}>
                  <View style={MS.addrIcon}>
                    <Text style={{ fontSize: 18 }}>
                      {a.label === 'Home' ? '🏠' : a.label === 'Work' ? '💼' : '📌'}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ fontWeight: '800', color: '#111827' }}>{a.label}</Text>
                    {!!a.recipient_name && (
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>{a.recipient_name}</Text>
                    )}
                    <Text style={{ fontSize: 12, color: '#4B5563', marginTop: 2 }} numberOfLines={2}>
                      {a.address}
                    </Text>
                  </View>
                  {selectedAddr?.id === a.id && (
                    <View style={MS.checkCircle}>
                      <Text style={{ color: '#fff', fontSize: 13 }}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={MS.addBtn}
                onPress={() => { setShowAddrModal(false); router.push('/(customer)/addresses' as any) }}>
                <Text style={{ color: COLORS.primary, fontWeight: '700' }}>+ Add New Address</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 14, marginTop: 4 }}
                onPress={() => setShowAddrModal(false)}>
                <Text style={{ color: '#6B7280', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const S = StyleSheet.create({
  merchantCard: {
    marginHorizontal: 16, marginTop: 10,
    backgroundColor: '#fff', borderRadius: 16,
    overflow: 'hidden', elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  merchantCardHeader: {
    backgroundColor: '#F9FAFB', padding: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  merchantCardTitle: { fontSize: 14, fontWeight: '800', color: '#111827' },
  merchantCardSub:   { fontSize: 12, color: '#6B7280', marginTop: 2 },
  multiPromoInfo: {
    marginHorizontal: 16, marginTop: 6, marginBottom: 2,
    backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  multiPromoText: { fontSize: 12, color: '#166534', fontWeight: '600', textAlign: 'center' },
})

const MS = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:         { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
                   padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  handle:        { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2,
                   alignSelf: 'center', marginBottom: 16 },
  addrRow:       { flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderRadius: 14,
                   borderWidth: 2, borderColor: 'transparent', marginBottom: 8, backgroundColor: '#F9FAFB' },
  addrRowActive: { borderColor: COLORS.primary, backgroundColor: '#FFF3EE' },
  addrIcon:      { width: 38, height: 38, borderRadius: 10, backgroundColor: '#F3F4F6',
                   alignItems: 'center', justifyContent: 'center' },
  checkCircle:   { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary,
                   alignItems: 'center', justifyContent: 'center' },
  addBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                   backgroundColor: '#FFF3EE', borderRadius: 14, padding: 14, marginTop: 8,
                   borderWidth: 1.5, borderColor: COLORS.primary },
})