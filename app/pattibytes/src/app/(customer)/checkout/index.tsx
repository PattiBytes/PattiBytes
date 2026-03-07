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

// ── Components ────────────────────────────────────────────────────────────────
import CheckoutBanner          from '../../../components/checkout/CheckoutBanner'
import CheckoutAddressSection  from '../../../components/checkout/CheckoutAddressSection'
import LiveLocationSection     from '../../../components/checkout/LiveLocationSection'
import OrderItemsSection       from '../../../components/checkout/OrderItemsSection'
import PromoSection            from '../../../components/checkout/PromoSection'
import NotesSection            from '../../../components/checkout/NotesSection'
import PaymentSection, { type PayMethod } from '../../../components/checkout/PaymentSection'
import CheckoutBillSummary     from '../../../components/checkout/CheckoutBillSummary'
import PlaceOrderBar           from '../../../components/checkout/PlaceOrderBar'

// ── Types ─────────────────────────────────────────────────────────────────────
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
async function sendOrderNotification(
  userId: string,
  orderNumber: number | string,
  orderId: string,
  orderType: OrderType,
) {
  const typeLabel = orderType === 'custom' ? 'Custom order' : 'Your order'
  await supabase.from('notifications').insert({
    user_id:    userId,
    title:      '🎉 Order Placed Successfully!',
    message:    `${typeLabel} #${orderNumber} has been placed and is being processed.`,
    type:       'order',
    data:       { order_id: orderId, order_number: String(orderNumber), status: 'pending' },
    body:       `${typeLabel} #${orderNumber} has been placed and is being processed.`,
    is_read:    false,
    sent_push:  false,
    created_at: new Date().toISOString(),
  })
}

async function notifyOrderPlaced(
  userId: string,
  orderId: string,
  orderNum: string | null,
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const jwt = session?.access_token
    if (!jwt) return

    await fetch(`${API_BASE}/api/notify`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        targetUserId: userId,
        title:        '🎉 Order Placed!',
        message:      `Your order #${orderNum ?? orderId.slice(0, 8)} has been placed. We'll confirm it shortly.`,
        type:         'new_order',
        data: {
          order_id:     orderId,
          order_number: orderNum ?? orderId.slice(0, 8),
          status:       'pending',
        },
      }),
    })
  } catch (e) {
    console.warn('[notifyOrderPlaced]', e)
  }
}
// ─────────────────────────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const router              = useRouter()
  const { user }            = useAuth()
  const { cart, clearCart } = useCart()
  const params              = useLocalSearchParams<{
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
  }>()

  const { settings: appSettings, loading: settingsLoading } = useAppSettings()

  // ── Order type (passed from cart, never derived here) ─────────────────────
  const orderType: OrderType = (params.order_type as OrderType) ?? 'restaurant'
  const isStoreOrCustom      = orderType === 'store' || orderType === 'custom'

  // ── Address state ──────────────────────────────────────────────────────────
  const [addresses,     setAddresses]     = useState<SavedAddress[]>([])
  const [selectedAddr,  setSelectedAddr]  = useState<SavedAddress | null>(null)
  const [showAddrModal, setShowAddrModal] = useState(false)

  // ── Delivery ──────────────────────────────────────────────────────────────
  const [deliveryFee,       setDeliveryFee]       = useState(Number(params.delivery_fee ?? 35))
  const [deliveryKm,        setDeliveryKm]         = useState(Number(params.delivery_distance ?? 0))
  const [deliveryBreakdown, setDeliveryBreakdown]  = useState('')
  const [showDeliveryFee,   setShowDeliveryFee]    = useState(true)
  const [isFreeDelivery,    setIsFreeDelivery]     = useState(params.is_free_delivery === 'true')
  const [calcingDelivery,   setCalcingDelivery]    = useState(false)

  // ── Promo ─────────────────────────────────────────────────────────────────
  const [promoInput,               setPromoInput]               = useState('')
  const [appliedPromo,             setAppliedPromo]             = useState<PromoCode | null>(null)
  const [promoDiscount,            setPromoDiscount]            = useState(Number(params.promo_discount ?? 0))
  const [applyingPromo,            setApplyingPromo]            = useState(false)
  const [availablePromos,          setAvailablePromos]          = useState<PromoCode[]>([])
  const [showPromoList,            setShowPromoList]            = useState(false)
  const [bxgyGifts,                setBxgyGifts]                = useState<BxGyGift[]>(() =>
    params.bxgy_gifts ? JSON.parse(params.bxgy_gifts) : []
  )
  const [freeDeliveryPromoApplied, setFreeDeliveryPromoApplied] = useState(params.is_free_delivery === 'true')

  // ── Item notes ────────────────────────────────────────────────────────────
  const [itemNotes, setItemNotes] = useState<Record<string, string>>(() =>
    params.item_notes ? JSON.parse(params.item_notes) : {}
  )
  const handleNoteChange = useCallback((id: string, note: string) =>
    setItemNotes(prev => ({ ...prev, [id]: note })), [])

  // ── Notes & payment ───────────────────────────────────────────────────────
  const [specialInst, setSpecialInst] = useState('')
  const [notes,       setNotes]       = useState('')
  const [payMethod,   setPayMethod]   = useState<PayMethod>('cod')

  // ── Live location ─────────────────────────────────────────────────────────
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locLoading,   setLocLoading]   = useState(false)
  const [locRequired,  setLocRequired]  = useState(false)
  const watchRef    = useRef<Location.LocationSubscription | null>(null)
  const orderIdRef  = useRef<string | null>(null)

  // ── Merchant geo ──────────────────────────────────────────────────────────
  const [merchantGeo, setMerchantGeo] = useState<{
    latitude?: number | null; longitude?: number | null;
    gst_enabled?: boolean; gst_percentage?: number | null; phone?: string | null
  } | null>(null)
  const [gstEnabled, setGstEnabled] = useState(false)
  const [gstPct,     setGstPct]     = useState(0)

  // ── Page state ────────────────────────────────────────────────────────────
  const [loading,  setLoading]  = useState(true)
  const [placing,  setPlacing]  = useState(false)

  // ── Subtotal ──────────────────────────────────────────────────────────────
  const subtotal = useMemo(() => {
    if (!cart?.items?.length) return 0
    return cart.items.reduce((sum, item) => {
      const disc = (item.discount_percentage ?? 0) > 0
        ? item.price * (item.discount_percentage! / 100) : 0
      return sum + (item.price - disc) * item.quantity
    }, 0)
  }, [cart?.items])

  // ── Load page data ────────────────────────────────────────────────────────
  const loadCheckout = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const addrList = await getSavedAddresses(user.id)
      const list     = addrList ?? []
      setAddresses(list)
      const found = params.address_id
        ? list.find(a => a.id === params.address_id)
        : list.find(a => a.is_default) ?? list[0]
      setSelectedAddr(found ?? null)

      setShowDeliveryFee(appSettings.delivery_fee_enabled !== false)

      if (!isStoreOrCustom && cart?.merchant_id) {
        const { data: merch } = await supabase
          .from('merchants')
          .select('latitude,longitude,gst_enabled,gst_percentage,phone')
          .eq('id', cart.merchant_id)
          .maybeSingle()

        if (merch) {
          setMerchantGeo(merch as any)
          setGstEnabled(!!(merch as any).gst_enabled)
          setGstPct(Number((merch as any).gst_percentage ?? 0))
        }

        const promos = await promoCodeService.getActivePromos(cart.merchant_id)
        setAvailablePromos(promos ?? [])
      }

      // Re-validate promo passed from cart
      if (params.promo_code && user) {
        const res: PromoValidationResult = await promoCodeService.validatePromoCode(
          params.promo_code, subtotal, user.id,
          { merchantId: cart?.merchant_id,
            cartItems: cart?.items?.map(i => ({
              menu_item_id: (i as any).menu_item_id ?? i.id,
              merchant_id:  cart.merchant_id,
              category_id:  (i as any).category_id ?? null,
              qty:          i.quantity,
              unit_price:   i.price,
            })) }
        )
        if (res.valid && res.promoCode) {
          setAppliedPromo(res.promoCode)
          setPromoDiscount(Number(params.promo_discount) || res.discount)
          if (res.isFreeDelivery) {
            setFreeDeliveryPromoApplied(true)
            setIsFreeDelivery(true)
            setDeliveryFee(0)
          }
          if (res.bxgyGifts?.length) setBxgyGifts(res.bxgyGifts)
        }
      }
    } catch (e: any) {
      console.warn('[CheckoutPage] loadCheckout', e.message)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, cart?.merchant_id, params.address_id, params.promo_code, isStoreOrCustom])

  useEffect(() => { loadCheckout() }, [loadCheckout])

  // ── Auto-detect live location on mount ────────────────────────────────────
  useEffect(() => { detectLocation() }, [])

  const detectLocation = async () => {
    setLocLoading(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setLocRequired(true)
        Alert.alert(
          'Location Required',
          'Live location is needed so our driver can find you.',
          [{ text: 'OK' }]
        )
        return
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
      setLiveLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      setLocRequired(false)
    } catch (e: any) {
      Alert.alert('Location Error', e.message)
    } finally {
      setLocLoading(false)
    }
  }

  // ── Continuous location watch (after order placed) ────────────────────────
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
      }
    )
  }, [])

  useEffect(() => () => { watchRef.current?.remove() }, [])

  // ── Recalculate delivery fee when address changes ─────────────────────────
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
              selectedAddr.latitude!, selectedAddr.longitude!,
              subtotal,
            )
          : null

        if (!result) return

        if (freeDeliveryPromoApplied) {
          setDeliveryFee(0)
          setDeliveryKm(result.displayDistanceKm)
          setDeliveryBreakdown('🚚 Free delivery (promo applied)')
          setIsFreeDelivery(true)
        } else {
          setDeliveryFee(result.fee)
          setDeliveryKm(result.displayDistanceKm)
          setDeliveryBreakdown(result.breakdown)
          setIsFreeDelivery(result.isFreeDelivery)
        }
      } catch (e: any) {
        console.warn('[CheckoutPage] recalcDelivery', e.message)
      } finally {
        setCalcingDelivery(false)
      }
    })()
  }, [selectedAddr, merchantGeo, subtotal, isStoreOrCustom, freeDeliveryPromoApplied, settingsLoading])

  // ── Promo handlers ────────────────────────────────────────────────────────
  const handleApplyPromo = async () => {
    if (!promoInput.trim() || !user) return
    setApplyingPromo(true)
    try {
      const result: PromoValidationResult = await promoCodeService.validatePromoCode(
        promoInput.trim(), subtotal, user.id,
        {
          merchantId: cart?.merchant_id,
          cartItems:  cart?.items?.map(i => ({
            menu_item_id: (i as any).menu_item_id ?? i.id,
            merchant_id:  cart!.merchant_id,
            category_id:  (i as any).category_id ?? null,
            qty:          i.quantity,
            unit_price:   i.price,
          })),
        }
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
      } else {
        setFreeDeliveryPromoApplied(false)
        setPromoDiscount(result.discount)
        if (result.bxgyGifts?.length) setBxgyGifts(result.bxgyGifts)
      }
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setApplyingPromo(false)
    }
  }

  const handleSelectPromo = (p: PromoCode) => {
    setPromoInput(p.code)
    void handleApplyPromo()
  }

  const handleRemovePromo = () => {
    setAppliedPromo(null)
    setPromoDiscount(0)
    setBxgyGifts([])
    setFreeDeliveryPromoApplied(false)
    setIsFreeDelivery(false)
  }

  // ── Totals ────────────────────────────────────────────────────────────────
  const taxAmount = useMemo(() => {
    if (!gstEnabled || gstPct <= 0) return 0
    return Math.round((subtotal - promoDiscount) * (gstPct / 100) * 100) / 100
  }, [subtotal, promoDiscount, gstEnabled, gstPct])

  const effectiveDeliveryFee = showDeliveryFee && !isFreeDelivery ? deliveryFee : 0

  const finalTotal = useMemo(() =>
    Math.max(0, Math.round((subtotal - promoDiscount + effectiveDeliveryFee + taxAmount) * 100) / 100),
    [subtotal, promoDiscount, effectiveDeliveryFee, taxAmount]
  )

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

  // ── Custom order tag ──────────────────────────────────────────────────────
  // Generated deterministically from cart items so it's stable during session
  // ── Custom order ref — stable for session, generated once ─────────────────
const customOrderRef = useMemo<string | undefined>(() => {
  if (orderType !== 'custom' && orderType !== 'store') return undefined
  // PBX-CUST-XXXX  (4 chars = 36^4 = ~1.7M combos, good enough per-session)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const suffix = Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('')
  return orderType === 'custom' ? `PBX-CUST-${suffix}` : `PBX-STORE-${suffix}`
   
}, [orderType])    // stable: only recalculate if order type changes

const handlePlaceOrder = async () => {
  if (!user || !cart?.items?.length || !selectedAddr) {
    Alert.alert('Incomplete', 'Please select a delivery address.')
    return
  }
  if (!liveLocation) {
    Alert.alert(
      'Location Required',
      'Live location is mandatory to track your delivery.',
      [
        { text: 'Allow Now', onPress: detectLocation },
        { text: 'Cancel', style: 'cancel' },
      ]
    )
    return
  }

  setPlacing(true)
  try {
    const eta = new Date(Date.now() + 45 * 60 * 1000).toISOString()

    // ── Build items ──────────────────────────────────────────────────────────
    const orderItems = [
      ...cart.items.map(i => ({
        id:                  i.id,
        menu_item_id:        (i as any).menu_item_id ?? i.id,
        name:                i.name,
        price:               i.price,
        quantity:            i.quantity,
        discount_percentage: i.discount_percentage ?? 0,
        image_url:           i.image_url ?? null,
        category:            i.category ?? null,
        is_veg:              i.is_veg ?? null,
        // Only set merchant_id for restaurant orders
        merchant_id:         orderType === 'restaurant' ? cart.merchant_id : null,
        note:                itemNotes[i.id] ?? null,
        is_free:             false,
        is_custom_product:   orderType !== 'restaurant',
      })),
      ...bxgyGifts.map(g => ({
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

    // ── Order payload ────────────────────────────────────────────────────────
    const orderPayload: Record<string, any> = {
      customer_id:            user.id,
      // ✅ merchant_id is now nullable — only set for restaurant orders
      merchant_id:            orderType === 'restaurant' ? (cart.merchant_id ?? null) : null,
      order_type:             orderType,
      status:                 'pending',
      subtotal,
      delivery_fee:           effectiveDeliveryFee,
      tax:                    taxAmount,
      discount:               promoDiscount,
      total_amount:           finalTotal,
      payment_method:         payMethod,
      payment_status:         'pending',
      // Address
      delivery_address:       formatAddr(selectedAddr),
      delivery_address_label: selectedAddr.label,
      delivery_address_id:    selectedAddr.id,
      delivery_latitude:      selectedAddr.latitude  ?? null,
      delivery_longitude:     selectedAddr.longitude ?? null,
      delivery_distance_km:   deliveryKm > 0 ? parseFloat(deliveryKm.toFixed(2)) : null,
      // Recipient
      customer_phone:         selectedAddr.recipient_phone ?? null,
      recipient_name:         selectedAddr.recipient_name  ?? null,
      // Notes
      special_instructions:   specialInst.trim() || null,
      customer_notes:         notes.trim() || null,
      delivery_instructions:  selectedAddr.delivery_instructions ?? null,
      // Promo
      promo_code:             appliedPromo?.code ?? null,
      promo_id:               appliedPromo?.id   ?? null,
      // Location
      customer_location:      { lat: liveLocation.lat, lng: liveLocation.lng },
      // Items
      items:                  orderItems,
      // Timing
      preparation_time:       orderType === 'custom' ? 60 : orderType === 'store' ? 20 : 30,
      estimated_delivery_time: eta,
      created_at:             new Date().toISOString(),
      updated_at:             new Date().toISOString(),
      // Platform flags
      platform_handled:       orderType !== 'restaurant',
      // Custom order fields
      ...(orderType === 'custom' || orderType === 'store'
        ? {
            custom_order_ref:    customOrderRef,
            custom_order_status: 'pending',  // Custom flow begins here
            hub_origin: {
              lat:   31.2837165,
              lng:   74.847114,
              label: 'Patti, Punjab 143416',
            },
          }
        : {}),
    }

    // ── Insert order ─────────────────────────────────────────────────────────
   const { data: order, error } = await supabase
      .from('orders')
      .insert(orderPayload)
      .select()
      .single()

    if (error) throw error

    // ✅ ADD THIS — fire-and-forget, doesn't block navigation
    notifyOrderPlaced(
      user.id,
      order.id,
      (order as any).order_number ?? null,
    )

    // ── custom_order_requests table — full custom flow record ─────────────────
    if (orderType === 'custom' && order) {
      await supabase.from('custom_order_requests').insert({
        order_id:         order.id,
        customer_id:      user.id,
        custom_order_ref: customOrderRef!,
        category:         (cart as any).customCategory ?? 'custom',
        description:      specialInst.trim() || null,
        image_url:        (cart as any).customImageUrl ?? null,
        items:            orderItems,
        status:           'pending',
        delivery_address: formatAddr(selectedAddr),
        delivery_lat:     selectedAddr.latitude  ?? null,
        delivery_lng:     selectedAddr.longitude ?? null,
        total_amount:     finalTotal,
        delivery_fee:     effectiveDeliveryFee,
        payment_method:   payMethod,
        customer_phone:   selectedAddr.recipient_phone ?? null,
        created_at:       new Date().toISOString(),
        updated_at:       new Date().toISOString(),
      })
    }

    // ── Store orders — customproductorders table ───────────────────────────────
    if (orderType === 'store' && order) {
      await supabase.from('customproductorders').insert({
        order_id:            order.id,
        customer_id:         user.id,
        items:               orderItems,
        total_amount:        finalTotal,
        delivery_fee:        effectiveDeliveryFee,
        delivery_distance_km: deliveryKm > 0 ? parseFloat(deliveryKm.toFixed(2)) : null,
        delivery_address:    formatAddr(selectedAddr),
        delivery_latitude:   selectedAddr.latitude  ?? null,
        delivery_longitude:  selectedAddr.longitude ?? null,
        customer_location:   orderPayload.customer_location,
        status:              'pending',
        payment_method:      payMethod,
        special_instructions: specialInst.trim() || null,
        customer_notes:      notes.trim() || null,
        custom_order_ref:    customOrderRef,
        created_at:          new Date().toISOString(),
      })
    }

    // ── Record promo usage ────────────────────────────────────────────────────
    if (appliedPromo && order) {
      await Promise.allSettled([
        supabase.from('promo_usage').insert({
          promo_code_id: appliedPromo.id,
          order_id:      order.id,
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

    // ── In-app notification ───────────────────────────────────────────────────
    const notifTitle = orderType === 'custom'
      ? `✏️ Custom Order Placed — ${customOrderRef}`
      : '🎉 Order Placed Successfully!'
    const notifMsg = orderType === 'custom'
      ? `Ref: ${customOrderRef} — Our team will review your request and get back to you soon.`
      : `Your order #${order.order_number} has been placed and is being processed.`

    await supabase.from('notifications').insert({
      user_id:    user.id,
      title:      notifTitle,
      message:    notifMsg,
      type:       'order',
      data:       {
        order_id:         order.id,
        order_number:     String(order.order_number),
        custom_order_ref: customOrderRef ?? null,
        status:           'pending',
        order_type:       orderType,
      },
      body:       notifMsg,
      is_read:    false,
      sent_push:  false,
      created_at: new Date().toISOString(),
    })

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


  // ── Guard ─────────────────────────────────────────────────────────────────
  if (loading || settingsLoading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <Stack.Screen options={{ title: 'Checkout' }} />
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  )

  if (!cart?.items?.length) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F9FA', padding: 24 }}>
      <Stack.Screen options={{ title: 'Checkout' }} />
      <Text style={{ fontSize: 72, marginBottom: 16 }}>🛒</Text>
      <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8 }}>
        Cart is empty
      </Text>
      <TouchableOpacity
        style={{ backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 }}
        onPress={() => router.replace('/(customer)/dashboard' as any)}
      >
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Browse</Text>
      </TouchableOpacity>
    </View>
  )

  const titleMap: Record<OrderType, string> = {
    restaurant: 'Checkout',
    store:      'Store Checkout',
    custom:     'Custom Order Checkout',
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <Stack.Screen options={{
        title:            titleMap[orderType],
        headerStyle:      { backgroundColor: COLORS.primary },
        headerTintColor:  '#fff',
        headerTitleStyle: { fontWeight: '800' },
      }} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 150 }}
        >
          {/* ── Order type banner ──────────────────────────────────── */}
          <CheckoutBanner
            orderType={orderType}
            merchantName={cart.merchant_name}
            customOrderTag={customOrderRef}
          />

          {/* ── Delivery address ───────────────────────────────────── */}
          <View style={{ marginTop: 10 }}>
            <CheckoutAddressSection
              addresses={addresses}
              selectedAddr={selectedAddr}
              deliveryFee={deliveryFee}
              deliveryKm={deliveryKm}
              deliveryBreakdown={deliveryBreakdown}
              showDeliveryFee={showDeliveryFee}
              isFreeDelivery={isFreeDelivery}
              orderType={orderType}
              onChangeAddr={() => setShowAddrModal(true)}
              onSelectAddr={addr => { setSelectedAddr(addr); setShowAddrModal(false) }}
            />
          </View>

          {/* ── Live location ──────────────────────────────────────── */}
          <LiveLocationSection
            liveLocation={liveLocation}
            locLoading={locLoading}
            locRequired={locRequired}
            onDetect={detectLocation}
          />

          {/* ── Order items + per-item notes ───────────────────────── */}
          <OrderItemsSection
            items={cart.items as any}
            itemNotes={itemNotes}
            bxgyGifts={bxgyGifts}
            appliedPromo={appliedPromo}
            onNoteChange={handleNoteChange}
          />

          {/* ── Promo code ─────────────────────────────────────────── */}
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

          {/* ── Notes ──────────────────────────────────────────────── */}
          <NotesSection
            specialInst={specialInst}
            notes={notes}
            orderType={orderType}
            onSpecialInstChange={setSpecialInst}
            onNotesChange={setNotes}
          />

          {/* ── Payment method ─────────────────────────────────────── */}
          <PaymentSection payMethod={payMethod} onSelect={setPayMethod} />

          {/* ── Bill summary ───────────────────────────────────────── */}
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
          />

          <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
            <Text style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 16 }}>
              By placing this order you agree to our terms.
              Cancellation charges may apply once order is confirmed.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Place order bar ────────────────────────────────────────── */}
      <PlaceOrderBar
        finalTotal={finalTotal}
        totalSavings={totalSavings}
        payMethod={payMethod}
        hasLocation={!!liveLocation}
        placing={placing}
        disabled={!selectedAddr || !liveLocation}
        onPress={handlePlaceOrder}
      />

      {/* ── Address picker modal ───────────────────────────────────── */}
      <Modal
        visible={showAddrModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddrModal(false)}
      >
        <View style={MS.overlay}>
          <View style={MS.sheet}>
            <View style={MS.handle} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 17, fontWeight: '900', color: '#111827' }}>Select Address</Text>
              <TouchableOpacity onPress={() => setShowAddrModal(false)}>
                <Text style={{ fontSize: 22, color: '#9CA3AF' }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              {addresses.map(a => (
                <TouchableOpacity
                  key={a.id}
                  style={[MS.addrRow, selectedAddr?.id === a.id && MS.addrRowActive]}
                  onPress={() => { setSelectedAddr(a); setShowAddrModal(false) }}
                  activeOpacity={0.8}
                >
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
              <TouchableOpacity
                style={MS.addBtn}
                onPress={() => { setShowAddrModal(false); router.push('/(customer)/addresses' as any) }}
              >
                <Text style={{ color: COLORS.primary, fontWeight: '700' }}>+ Add New Address</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ alignItems: 'center', paddingVertical: 14, marginTop: 4 }}
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

const MS = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  handle:      { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  addrRow:     { flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderRadius: 14, borderWidth: 2, borderColor: 'transparent', marginBottom: 8, backgroundColor: '#F9FAFB' },
  addrRowActive:{ borderColor: COLORS.primary, backgroundColor: '#FFF3EE' },
  addrIcon:    { width: 38, height: 38, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  checkCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  addBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF3EE', borderRadius: 14, padding: 14, marginTop: 8, borderWidth: 1.5, borderColor: COLORS.primary },
})
