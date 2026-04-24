// src/app/(customer)/cart/index.tsx
/* eslint-disable @typescript-eslint/no-unused-vars */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, StyleSheet,
} from 'react-native'
import { Stack, useRouter, useFocusEffect } from 'expo-router'
import { supabase }          from '../../../lib/supabase'
import { useAuth }           from '../../../contexts/AuthContext'
import { useCart }           from '../../../contexts/CartContext'
import { COLORS }            from '../../../lib/constants'
import { appCache, TTL }     from '../../../lib/appCache'
import { ScreenLoader }      from '../../../components/ui/ScreenLoader'
import { AppStatusBar }      from '../../../components/ui/AppStatusBar'
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
import AuthRequiredSheet      from '../../../components/auth/AuthRequiredSheet'
import { useRequireAuthAction } from '../../../hooks/useRequireAuthAction'
import { type MerchantGeo, type OrderType } from '../../../components/cart/types'
import { estimatedDeliveryLabel }           from '../../../components/cart/utils'

// ─── Per-merchant metadata type ───────────────────────────────────────────────

type MerchantMeta = {
  latitude?:           number | null
  longitude?:          number | null
  min_order_amount?:   number | null
  estimated_prep_time?: number | null
  phone?:              string | null
  delivery_fee:        number
  delivery_km:         number
  fee_dist_km:         number
  breakdown:           string
  is_free_delivery:    boolean
  gst_enabled:         boolean
  gst_pct:             number
  promos:              PromoCode[]
  applied_promo:       PromoCode | null
  promo_discount:      number
  bxgy_gifts:          BxGyGift[]
  free_delivery_promo: boolean
}

function emptyMeta(): MerchantMeta {
  return {
    delivery_fee: 35, delivery_km: 0, fee_dist_km: 0, breakdown: '',
    is_free_delivery: false, gst_enabled: false, gst_pct: 0,
    promos: [], applied_promo: null, promo_discount: 0,
    bxgy_gifts: [], free_delivery_promo: false,
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CartPage() {
  const router  = useRouter()
  const { user } = useAuth()
  const {
    cart,
    multiCart,
    allCarts,
    merchantCount,
    totalItemCount,
    updateQuantity,
    removeFromCart,
    clearCart,
    clearMerchantCart,
    setMode,
    getMerchantSubtotal,
  } = useCart()

  // ── isMulti: true when 2+ restaurants are in the cart ─────────────────────
  const isMulti = allCarts.length > 1

  const { settings: appSettings, loading: settingsLoading } = useAppSettings()
  const { showAuthSheet, setShowAuthSheet, requireAuth } = useRequireAuthAction()

  // ── Address ────────────────────────────────────────────────────────────────
  const [addresses,     setAddresses]    = useState<SavedAddress[]>([])
  const [selectedAddr,  setSelectedAddr] = useState<SavedAddress | null>(null)
  const [showAddrModal, setShowAddrModal] = useState(false)

  // ── UI flags ───────────────────────────────────────────────────────────────
  const [loading,         setLoading]         = useState(true)
  const [showClearModal,  setShowClearModal]   = useState(false)
  const [calcingDelivery, setCalcingDelivery]  = useState(false)
  const [showDeliveryFee, setShowDeliveryFee]  = useState(true)

  // ── Single-merchant legacy state (used when !isMulti) ─────────────────────
  const [deliveryFee,        setDeliveryFee]        = useState(35)
  const [deliveryKm,         setDeliveryKm]         = useState(0)
  const [feeDistKm,          setFeeDistKm]          = useState(0)
  const [deliveryBreakdown,  setDeliveryBreakdown]  = useState('')
  const [isFreeDelivery,     setIsFreeDelivery]     = useState(false)

  const [promoInput,               setPromoInput]               = useState('')
  const [appliedPromo,             setAppliedPromo]             = useState<PromoCode | null>(null)
  const [promoDiscount,            setPromoDiscount]            = useState(0)
  const [applyingPromo,            setApplyingPromo]            = useState(false)
  const [availablePromos,          setAvailablePromos]          = useState<PromoCode[]>([])
  const [showPromoList,            setShowPromoList]            = useState(false)
  const [bxgyGifts,                setBxgyGifts]               = useState<BxGyGift[]>([])
  const [freeDeliveryPromoApplied, setFreeDeliveryPromoApplied] = useState(false)
  const [gstEnabled,               setGstEnabled]              = useState(false)
  const [gstPct,                   setGstPct]                  = useState(0)
  const [merchantGeo,              setMerchantGeo]             = useState<MerchantGeo | null>(null)
  const [itemNotes,                setItemNotes]               = useState<Record<string, string>>({})

  // ── Per-merchant metadata (used when isMulti) ─────────────────────────────
  const [merchantMetas, setMerchantMetas] = useState<Record<string, MerchantMeta>>({})

  // Stable key for detecting merchant set changes
  const merchantIdsKey = allCarts.map(c => c.merchant_id).sort().join('|')

  // ── Sync delivery fee toggle ───────────────────────────────────────────────
  useEffect(() => {
    if (!settingsLoading)
      setShowDeliveryFee(appSettings.delivery_fee_enabled !== false)
  }, [appSettings.delivery_fee_enabled, settingsLoading])

  // ── Order type (single mode) ───────────────────────────────────────────────
  const orderType: OrderType = useMemo(() => {
    if (!cart?.merchant_id) return 'store'
    const storeCats = ['dairy', 'grocery', 'medicines', 'custom']
    const allStore  = cart.items?.every(i =>
      storeCats.includes((i.category ?? '').toLowerCase()))
    return allStore ? 'custom' : 'restaurant'
  }, [cart?.merchant_id, cart?.items])

  // ── Grand subtotal (all carts combined) ───────────────────────────────────
  const subtotal = useMemo(() =>
    allCarts.reduce((total, c) =>
      total + c.items.reduce((s, item) => {
        const disc = (item.discount_percentage ?? 0) > 0
          ? item.price * (item.discount_percentage! / 100) : 0
        return s + (item.price - disc) * item.quantity
      }, 0), 0),
  [allCarts])

  // ── grandTotals — sums all merchant delivery/tax/discount ─────────────────
  // Used for multi-cart checkout params & grand total display
  const grandTotals = useMemo(() => {
    let sub = 0, del = 0, tax = 0, disc = 0
    allCarts.forEach(c => {
      const meta  = merchantMetas[c.merchant_id]
      const s     = c.subtotal
      const d     = meta?.promo_discount ?? 0
      const f     = showDeliveryFee && !meta?.is_free_delivery
        ? (meta?.delivery_fee ?? 35) : 0
      const g     = meta?.gst_enabled && (meta?.gst_pct ?? 0) > 0
        ? Math.round((s - d) * (meta.gst_pct / 100) * 100) / 100 : 0
      sub  += s
      del  += f
      tax  += g
      disc += d
    })
    return {
      subtotal: sub,
      delivery: del,
      tax,
      discount: disc,
      total: Math.max(0, Math.round((sub - disc + del + tax) * 100) / 100),
    }
  }, [allCarts, merchantMetas, showDeliveryFee])

  // ── Min-order guard ────────────────────────────────────────────────────────
  const minOrder = appSettings?.min_order_amount
    ?? merchantGeo?.min_order_amount ?? 0
  const belowMin = minOrder > 0 && subtotal < minOrder

  // ── Load addresses ─────────────────────────────────────────────────────────
  const loadAddresses = useCallback(async () => {
    if (!user?.id) return
    try {
      const list = (await getSavedAddresses(user.id)) ?? []
      setAddresses(list)
      setSelectedAddr(prev => {
        if (!prev) return list.find(a => a.is_default) ?? list[0] ?? null
        return list.find(a => a.id === prev.id)
          ?? list.find(a => a.is_default)
          ?? list[0] ?? null
      })
    } catch (e: any) { console.warn('[CartPage] loadAddresses', e.message) }
  }, [user?.id])

  useFocusEffect(useCallback(() => { loadAddresses() }, [loadAddresses]))

  // ── Load merchant data ─────────────────────────────────────────────────────
  // Single mode: loads geo+promos for the one active merchant
  // Multi mode:  loads geo+promos for ALL merchants in parallel
  const loadMerchantData = useCallback(async () => {
    if (!user || allCarts.length === 0) { setLoading(false); return }
    setLoading(true)
    try {
      if (!isMulti) {
        // ── Single merchant ────────────────────────────────────────────────
        const c         = allCarts[0]
        const cacheKey  = `merchant_geo_${c.merchant_id}`
        const cached    = appCache.get<MerchantGeo>(cacheKey)
        const isRestaurant = orderType === 'restaurant'

        const [geoRaw, promos] = await Promise.all([
          isRestaurant
            ? cached
              ? Promise.resolve(cached)
              : supabase
                  .from('merchants')
                  .select('latitude,longitude,gst_enabled,gst_percentage,min_order_amount,estimated_prep_time,phone')
                  .eq('id', c.merchant_id)
                  .maybeSingle()
                  .then(({ data }) => {
                    if (data) appCache.set(cacheKey, data, TTL.MERCHANT_GEO)
                    return data as MerchantGeo | null
                  })
            : Promise.resolve(null),
          promoCodeService.getActivePromos(isRestaurant ? c.merchant_id : null),
        ])

        if (geoRaw) {
          setMerchantGeo(geoRaw)
          setGstEnabled(!!(geoRaw as any).gst_enabled)
          setGstPct(Number((geoRaw as any).gst_percentage ?? 0))
        }
        setAvailablePromos(promos ?? [])
        const auto = (promos ?? []).find(p => p.auto_apply)
        if (auto && !appliedPromo) void applyPromoSilent(auto)

      } else {
        // ── Multi merchant: load all in parallel ───────────────────────────
        await Promise.all(allCarts.map(async (c) => {
          const cacheKey = `merchant_geo_${c.merchant_id}`
          const cached   = appCache.get<MerchantGeo>(cacheKey)

          const [geo, promos] = await Promise.all([
            cached
              ? Promise.resolve(cached)
              : supabase
                  .from('merchants')
                  .select('latitude,longitude,gst_enabled,gst_percentage,min_order_amount,estimated_prep_time,phone')
                  .eq('id', c.merchant_id)
                  .maybeSingle()
                  .then(({ data }) => {
                    if (data) appCache.set(cacheKey, data, TTL.MERCHANT_GEO)
                    return data as MerchantGeo | null
                  }),
            promoCodeService.getActivePromos(c.merchant_id),
          ])

          setMerchantMetas(prev => ({
            ...prev,
            [c.merchant_id]: {
              ...emptyMeta(),
              ...(prev[c.merchant_id] ?? {}),
              latitude:            (geo as any)?.latitude   ?? null,
              longitude:           (geo as any)?.longitude  ?? null,
              min_order_amount:    (geo as any)?.min_order_amount ?? null,
              estimated_prep_time: (geo as any)?.estimated_prep_time ?? null,
              phone:               (geo as any)?.phone ?? null,
              gst_enabled:         !!(geo as any)?.gst_enabled,
              gst_pct:             Number((geo as any)?.gst_percentage ?? 0),
              promos:              promos ?? [],
            },
          }))

          // Auto-apply per-merchant promo
          const auto = (promos ?? []).find(p => p.auto_apply)
          if (auto) void applyPromoForMerchant(c.merchant_id, auto, c)
        }))
      }
    } catch (e: any) { console.warn('[CartPage] loadMerchantData', e.message) }
    finally { setLoading(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, merchantIdsKey, isMulti, orderType])

  useEffect(() => { loadMerchantData() }, [loadMerchantData])

  // ── Recalculate delivery (single mode) ────────────────────────────────────
  const recalcDelivery = useCallback(async () => {
    if (isMulti) return  // multi mode handled separately
    if (!selectedAddr?.latitude || !selectedAddr?.longitude) return
    if (settingsLoading) return
    setCalcingDelivery(true)
    try {
      let result: DeliveryResult
      if (orderType === 'restaurant' && merchantGeo?.latitude && merchantGeo?.longitude) {
        result = await calcDeliveryForRestaurant(
          merchantGeo.latitude!, merchantGeo.longitude!,
          selectedAddr.latitude!, selectedAddr.longitude!,
          subtotal,
        )
      } else {
        result = await calcDeliveryForStore(
          selectedAddr.latitude!, selectedAddr.longitude!,
          subtotal,
        )
      }
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
    } catch (e: any) { console.warn('[CartPage] recalcDelivery', e.message) }
    finally { setCalcingDelivery(false) }
  }, [isMulti, selectedAddr, merchantGeo, subtotal, orderType,
      freeDeliveryPromoApplied, settingsLoading])

  useEffect(() => { recalcDelivery() }, [recalcDelivery])

  // ── Recalculate delivery (multi mode) — per merchant ─────────────────────
  useEffect(() => {
    if (!isMulti) return
    if (!selectedAddr?.latitude || !selectedAddr?.longitude) return
    if (settingsLoading || allCarts.length === 0) return
    setCalcingDelivery(true)

    Promise.all(allCarts.map(async (c) => {
      const meta = merchantMetas[c.merchant_id]
      try {
        let result: DeliveryResult
        if (meta?.latitude && meta?.longitude) {
          result = await calcDeliveryForRestaurant(
            meta.latitude!, meta.longitude!,
            selectedAddr.latitude!, selectedAddr.longitude!,
            c.subtotal,
          )
        } else {
          result = await calcDeliveryForStore(
            selectedAddr.latitude!, selectedAddr.longitude!,
            c.subtotal,
          )
        }
        setMerchantMetas(prev => ({
          ...prev,
          [c.merchant_id]: {
            ...(prev[c.merchant_id] ?? emptyMeta()),
            delivery_fee:     prev[c.merchant_id]?.free_delivery_promo ? 0 : result.fee,
            delivery_km:      result.displayDistanceKm,
            fee_dist_km:      result.feeDistanceKm,
            breakdown:        prev[c.merchant_id]?.free_delivery_promo
              ? '🚚 Free delivery (promo applied)' : result.breakdown,
            is_free_delivery: result.isFreeDelivery
              || !!prev[c.merchant_id]?.free_delivery_promo,
          },
        }))
      } catch {}
    })).finally(() => setCalcingDelivery(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMulti, selectedAddr, settingsLoading, merchantIdsKey])

  // ── Per-merchant promo apply ───────────────────────────────────────────────
  const applyPromoForMerchant = useCallback(async (
    merchantId: string,
    promo: PromoCode,
    cartOverride?: typeof allCarts[0],
  ) => {
    if (!user) return
    const c = cartOverride ?? allCarts.find(x => x.merchant_id === merchantId)
    if (!c) return
    try {
      const result: PromoValidationResult = await promoCodeService.validatePromoCode(
        promo.code, c.subtotal, user.id, {
          merchantId,
          cartItems: c.items.map(i => ({
            menu_item_id: (i as any).menu_item_id ?? i.id,
            merchant_id:  merchantId,
            category_id:  (i as any).category_id ?? null,
            qty:          i.quantity,
            unit_price:   i.price,
          })),
        },
      )
      if (!result.valid || !result.promoCode) return
      setMerchantMetas(prev => ({
        ...prev,
        [merchantId]: {
          ...(prev[merchantId] ?? emptyMeta()),
          applied_promo:       result.promoCode!,
          promo_discount:      result.discount,
          bxgy_gifts:          result.bxgyGifts ?? [],
          free_delivery_promo: result.isFreeDelivery ?? false,
          delivery_fee:        result.isFreeDelivery
            ? 0 : (prev[merchantId]?.delivery_fee ?? 35),
          is_free_delivery:    result.isFreeDelivery
            ? true : (prev[merchantId]?.is_free_delivery ?? false),
        },
      }))
    } catch (e: any) { console.warn('[CartPage] applyPromoForMerchant', e.message) }
  }, [user, allCarts])

  const removePromoForMerchant = useCallback((merchantId: string) => {
    setMerchantMetas(prev => ({
      ...prev,
      [merchantId]: {
        ...(prev[merchantId] ?? emptyMeta()),
        applied_promo: null, promo_discount: 0,
        bxgy_gifts: [], free_delivery_promo: false,
      },
    }))
  }, [])

  // ── Single-merchant promo helpers ─────────────────────────────────────────
  const applyPromoSilent = useCallback(async (promo: PromoCode) => {
    if (!user || !cart) return
    try {
      const result: PromoValidationResult = await promoCodeService.validatePromoCode(
        promo.code, subtotal, user.id, {
          merchantId: cart.merchant_id,
          cartItems:  cart.items?.map(i => ({
            menu_item_id: (i as any).menu_item_id ?? i.id,
            merchant_id:  cart.merchant_id,
            category_id:  (i as any).category_id ?? null,
            qty:          i.quantity,
            unit_price:   i.price,
          })),
        },
      )
      if (!result.valid || !result.promoCode) return
      setAppliedPromo(result.promoCode)
      if (result.isFreeDelivery) {
        setFreeDeliveryPromoApplied(true); setDeliveryFee(0)
        setPromoDiscount(0); setBxgyGifts([])
      } else if (result.bxgyGifts?.length) {
        setBxgyGifts(result.bxgyGifts); setPromoDiscount(result.discount)
        setFreeDeliveryPromoApplied(false)
      } else {
        setPromoDiscount(result.discount); setBxgyGifts([])
        setFreeDeliveryPromoApplied(false)
      }
    } catch (e: any) { console.warn('[applyPromoSilent]', e.message) }
  }, [user, subtotal, cart])

  const handleApplyPromo = async () => {
    if (!promoInput.trim() || !user || !cart) return
    setApplyingPromo(true)
    try {
      const result: PromoValidationResult = await promoCodeService.validatePromoCode(
        promoInput.trim(), subtotal, user.id, {
          merchantId: cart.merchant_id,
          cartItems:  cart.items?.map(i => ({
            menu_item_id: (i as any).menu_item_id ?? i.id,
            merchant_id:  cart.merchant_id,
            category_id:  (i as any).category_id ?? null,
            qty:          i.quantity,
            unit_price:   i.price,
          })),
        },
      )
      if (!result.valid || !result.promoCode) {
        Alert.alert('Invalid Promo', result.message); return
      }
      setAppliedPromo(result.promoCode)
      setPromoInput(''); setShowPromoList(false)
      if (result.isFreeDelivery) {
        setFreeDeliveryPromoApplied(true); setDeliveryFee(0)
        setDeliveryBreakdown('🚚 Free delivery (promo applied)')
        setIsFreeDelivery(true); setPromoDiscount(0); setBxgyGifts([])
      } else if (result.bxgyGifts?.length) {
        setBxgyGifts(result.bxgyGifts); setPromoDiscount(result.discount)
        setFreeDeliveryPromoApplied(false)
      } else {
        setPromoDiscount(result.discount); setBxgyGifts([])
        setFreeDeliveryPromoApplied(false)
      }
    } catch (e: any) { Alert.alert('Error', e.message) }
    finally { setApplyingPromo(false) }
  }

  const handleRemovePromo = useCallback(() => {
    setAppliedPromo(null); setPromoDiscount(0)
    setBxgyGifts([]); setFreeDeliveryPromoApplied(false)
    recalcDelivery()
  }, [recalcDelivery])

  // ── BxGy (single mode) ────────────────────────────────────────────────────
  const computeBxGyGifts = useCallback((promo: PromoCode | null) => {
    if (!promo || promo.deal_type !== 'bxgy' || !cart?.items?.length) {
      setBxgyGifts([]); return
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
      gifts.push({ menuItemId: item.id, name: item.name, qty: giftable,
        price: item.price, promoCode: promo.code })
      remaining -= giftable
    }
    setBxgyGifts(gifts)
  }, [cart?.items])

  useEffect(() => {
    if (appliedPromo?.deal_type === 'bxgy') computeBxGyGifts(appliedPromo)
  }, [cart?.items, appliedPromo, computeBxGyGifts])

  useEffect(() => {
    if (appliedPromo?.deal_type === 'bxgy') {
      const freeValue = bxgyGifts.reduce((s, g) => s + g.price * g.qty, 0)
      setPromoDiscount(Math.round(freeValue * 100) / 100)
    }
  }, [bxgyGifts, appliedPromo])

  // ── Single-mode derived totals ─────────────────────────────────────────────
  const taxAmount = useMemo(() => {
    if (!gstEnabled || gstPct <= 0) return 0
    return Math.round((subtotal - promoDiscount) * (gstPct / 100) * 100) / 100
  }, [subtotal, promoDiscount, gstEnabled, gstPct])

  const finalTotal = useMemo(() => {
    const effectiveDel = showDeliveryFee && !isFreeDelivery ? deliveryFee : 0
    return Math.max(0, Math.round(
      (subtotal - promoDiscount + effectiveDel + taxAmount) * 100) / 100)
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

  const estimatedTime = useMemo(() =>
    estimatedDeliveryLabel(merchantGeo?.estimated_prep_time, deliveryKm),
    [merchantGeo?.estimated_prep_time, deliveryKm])

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
      Alert.alert('Minimum Order',
        `Minimum order is ₹${minOrder.toFixed(0)}. ` +
        `Add ₹${(minOrder - subtotal).toFixed(0)} more.`)
      return
    }

    requireAuth(() => {
      if (isMulti) {
        // ── Multi: pass per-merchant billing snapshot ──────────────────────
        const merchantMetasParam = allCarts.map(c => {
          const meta = merchantMetas[c.merchant_id]
          const sub  = c.subtotal
          const disc = meta?.promo_discount ?? 0
          const fee  = showDeliveryFee && !meta?.is_free_delivery
            ? (meta?.delivery_fee ?? 35) : 0
          const gst  = meta?.gst_enabled && (meta?.gst_pct ?? 0) > 0
            ? Math.round((sub - disc) * (meta.gst_pct / 100) * 100) / 100 : 0
          return {
            merchant_id:      c.merchant_id,
            merchant_name:    c.merchant_name,
            subtotal:         sub,
            delivery_fee:     fee,
            tax:              gst,
            discount:         disc,
            promo_code:       meta?.applied_promo?.code ?? null,
            promo_id:         meta?.applied_promo?.id ?? null,
            bxgy_gifts:       meta?.bxgy_gifts ?? [],
            is_free_delivery: meta?.is_free_delivery ?? false,
            delivery_km:      meta?.delivery_km ?? 0,
            fee_dist_km:      meta?.fee_dist_km ?? 0,
            total:            Math.max(0, Math.round((sub - disc + fee + gst) * 100) / 100),
          }
        })

        router.push({
          pathname: '/(customer)/checkout' as any,
          params: {
            is_multi_cart:  'true',
            grand_total:    String(grandTotals.total),
            grand_delivery: String(grandTotals.delivery),
            grand_tax:      String(grandTotals.tax),
            grand_discount: String(grandTotals.discount),
            grand_subtotal: String(grandTotals.subtotal),
            merchant_metas: JSON.stringify(merchantMetasParam),
            address_id:     selectedAddr.id,
            order_type:     'restaurant',
            item_notes:     JSON.stringify(itemNotes),
          },
        })
      } else {
        // ── Single: existing param signature ──────────────────────────────
        router.push({
          pathname: '/(customer)/checkout' as any,
          params: {
            delivery_fee:      String(showDeliveryFee && !isFreeDelivery ? deliveryFee : 0),
            delivery_distance: String(deliveryKm.toFixed(2)),
            fee_distance:      String(feeDistKm.toFixed(2)),
            tax:               String(taxAmount.toFixed(2)),
            promo_code:        appliedPromo?.code ?? '',
            promo_discount:    String(promoDiscount.toFixed(2)),
            is_free_delivery:  String(isFreeDelivery),
            final_total:       String(finalTotal.toFixed(2)),
            address_id:        selectedAddr.id,
            bxgy_gifts:        JSON.stringify(bxgyGifts),
            order_type:        orderType,
            item_notes:        JSON.stringify(itemNotes),
            is_multi_cart:     'false',
          },
        })
      }
    })
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading || settingsLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
        <Stack.Screen options={{ title: 'Cart', statusBarStyle: 'light' }} />
        <AppStatusBar backgroundColor={COLORS.primary} style="light" />
        <ScreenLoader variant="cart" />
      </View>
    )
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (allCarts.length === 0 || !allCarts.some(c => c.items.length > 0)) {
    return (
      <View style={S.emptyWrap}>
        <Stack.Screen options={{ title: 'Cart', statusBarStyle: 'light' }} />
        <AppStatusBar backgroundColor={COLORS.primary} style="light" />
        <Text style={{ fontSize: 72, marginBottom: 16 }}>🛒</Text>
        <Text style={S.emptyTitle}>Your cart is empty</Text>
        <Text style={S.emptySub}>Add items from any restaurant to get started</Text>
        <TouchableOpacity
          style={S.browseBtn}
          onPress={() => router.push('/(customer)/dashboard' as any)}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
            Browse Restaurants
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  // ── Resolved safe values for single-merchant CartHeader ───────────────────
  // cart may be null in multi mode — use first cart as fallback
  const headerCart = cart ?? allCarts[0]

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <Stack.Screen
        options={{
          title: isMulti
            ? `Cart · ${allCarts.length} Restaurants`
            : orderType === 'restaurant' ? 'Cart'
            : orderType === 'store'      ? 'Store Cart'
            : 'Custom Order Cart',
          headerStyle:      { backgroundColor: COLORS.primary },
          headerTintColor:  '#fff',
          headerTitleStyle: { fontWeight: '800' },
          statusBarStyle:   'light',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => setShowClearModal(true)}
              style={{ marginRight: 14 }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '700', fontSize: 13 }}>
                Clear
              </Text>
            </TouchableOpacity>
          ),
        }}
      />
      <AppStatusBar backgroundColor={COLORS.primary} style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160 }}
      >

        {/* ── Multi-restaurant info banner ───────────────────────────── */}
        {isMulti && (
          <View style={S.multiBanner}>
            <Text style={{ fontSize: 22 }}>🛒</Text>
            <View style={{ flex: 1 }}>
              <Text style={S.multiBannerTitle}>
                Multi-Restaurant Order · {allCarts.length} Restaurants
              </Text>
              <Text style={S.multiBannerSub}>
                {totalItemCount} items · One checkout · Separate deliveries
              </Text>
            </View>
          </View>
        )}

        {/* ── CartHeader — single mode: restaurant info strip ────────── */}
        {/* FIX: only render in single mode, uses headerCart (never null) */}
        {!isMulti && (
          <CartHeader
            merchantName={headerCart.merchant_name}
            merchantId={orderType === 'restaurant' ? headerCart.merchant_id : null}
            displayDistKm={deliveryKm}
            feeDistKm={feeDistKm}
            orderType={orderType}
            estimatedTime={estimatedTime}
            isFreeDelivery={isFreeDelivery || freeDeliveryPromoApplied}
          />
        )}

        {/* ── Free Delivery Progress Bar ─────────────────────────────── */}
        {!isMulti && (
          <FreeDeliveryBar
            subtotal={subtotal}
            threshold={appSettings?.free_delivery_above}
            deliveryFeeEnabled={appSettings?.delivery_fee_enabled !== false}
            freeDeliveryPromoApplied={freeDeliveryPromoApplied}
            freeDeliveryPromoCode={freeDeliveryPromoApplied ? appliedPromo?.code : undefined}
          />
        )}

        {/* ── Min order warning ─────────────────────────────────────── */}
        {belowMin && (
          <View style={S.minWarn}>
            <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '600' }}>
              ⚠️ Minimum order is ₹{minOrder.toFixed(0)}.
              {' '}Add ₹{(minOrder - subtotal).toFixed(0)} more to proceed.
            </Text>
          </View>
        )}

        {/* ── Delivery calculating indicator ─────────────────────────── */}
        {calcingDelivery && (
          <View style={S.calcRow}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={S.calcText}>Calculating delivery…</Text>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════
            CART ITEMS
            Multi mode:  one card per restaurant with its own promo,
                         delivery, and subtotal
            Single mode: existing CartItemsList + promo + bill
        ════════════════════════════════════════════════════════════════ */}

        {isMulti ? (
          allCarts.map((merchantCart, idx) => {
            const meta     = merchantMetas[merchantCart.merchant_id] ?? emptyMeta()
            const mSub     = merchantCart.subtotal
            const mDisc    = meta.promo_discount
            const mFee     = showDeliveryFee && !meta.is_free_delivery
              ? meta.delivery_fee : 0
            const mGst     = meta.gst_enabled && meta.gst_pct > 0
              ? Math.round((mSub - mDisc) * (meta.gst_pct / 100) * 100) / 100 : 0
            const mTotal   = Math.max(0,
              Math.round((mSub - mDisc + mFee + mGst) * 100) / 100)
            const accentColors = [
              COLORS.primary, '#7C3AED', '#DC2626', '#0891B2', '#D97706',
            ]
            const accent = accentColors[idx % accentColors.length]

            return (
              <View key={merchantCart.merchant_id}
                style={[S.merchantCard, { borderTopColor: accent, borderTopWidth: 3 }]}
              >
                {/* Merchant header row */}
                <View style={S.merchantHeaderRow}>
                  <View style={[S.accentDot, { backgroundColor: accent }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={S.merchantName}>{merchantCart.merchant_name}</Text>
                    <Text style={S.merchantSub}>
                      {merchantCart.items.reduce((s, i) => s + i.quantity, 0)} items
                      {meta.delivery_km > 0 ? ` · ${meta.delivery_km.toFixed(1)} km` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => clearMerchantCart(merchantCart.merchant_id)}
                    style={S.removeBtn}
                  >
                    <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>
                      Remove
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Items */}
                <CartItemsList
                  items={merchantCart.items}
                  itemNotes={itemNotes}
                  bxgyGifts={meta.bxgy_gifts}
                  promoDiscount={meta.promo_discount}
                  onUpdateQty={(id, qty) =>
                    updateQuantity(id, qty, merchantCart.merchant_id)}
                  onRemove={(id) =>
                    removeFromCart(id, merchantCart.merchant_id)}
                  onNoteChange={handleNoteChange}
                />

                {/* Per-merchant free delivery bar */}
                {appSettings?.free_delivery_above && (
                  <FreeDeliveryBar
                    subtotal={mSub}
                    threshold={appSettings.free_delivery_above}
                    deliveryFeeEnabled={showDeliveryFee}
                    freeDeliveryPromoApplied={meta.free_delivery_promo}
                    freeDeliveryPromoCode={meta.applied_promo?.code}
                  />
                )}

                {/* Per-merchant promo */}
                <PromoSection
                  promoInput={promoInput}
                  onPromoInputChange={setPromoInput}
                  appliedPromo={meta.applied_promo}
                  promoDiscount={meta.promo_discount}
                  applyingPromo={applyingPromo}
                  availablePromos={meta.promos}
                  showPromoList={showPromoList}
                  onTogglePromoList={() => setShowPromoList(v => !v)}
                  onApply={() => {
                    const found = meta.promos.find(
                      p => p.code.toLowerCase() === promoInput.trim().toLowerCase())
                    if (found) {
                      setApplyingPromo(true)
                      applyPromoForMerchant(merchantCart.merchant_id, found)
                        .finally(() => setApplyingPromo(false))
                    } else {
                      Alert.alert('Invalid Promo', 'Promo not found for this restaurant.')
                    }
                  }}
                  onSelectPromo={p =>
                    applyPromoForMerchant(merchantCart.merchant_id, p)}
                  onRemovePromo={() =>
                    removePromoForMerchant(merchantCart.merchant_id)}
                  subtotal={mSub}
                />

                {/* Per-merchant bill */}
                <BillSummaryTable
                  subtotal={mSub}
                  itemDiscountTotal={0}
                  promoDiscount={mDisc}
                  promoCode={meta.applied_promo?.code}
                  promoIsBxgy={meta.applied_promo?.deal_type === 'bxgy'}
                  deliveryFee={mFee}
                  showDeliveryFee={showDeliveryFee}
                  deliveryBreakdown={meta.breakdown}
                  gstEnabled={meta.gst_enabled}
                  gstPct={meta.gst_pct}
                  taxAmount={mGst}
                  finalTotal={mTotal}
                  totalSavings={mDisc}
                />

                {/* Merchant total accent row */}
                <View style={[S.merchantTotalRow, { borderColor: accent }]}>
                  <Text style={S.merchantTotalLabel}>
                    {merchantCart.merchant_name} total
                  </Text>
                  <Text style={[S.merchantTotalValue, { color: accent }]}>
                    ₹{mTotal.toFixed(2)}
                  </Text>
                </View>
              </View>
            )
          })
        ) : (
          // ── Single-restaurant existing layout ──────────────────────────────
          cart && (
            <CartItemsList
              items={cart.items}
              itemNotes={itemNotes}
              bxgyGifts={bxgyGifts}
              promoDiscount={promoDiscount}
              onUpdateQty={updateQuantity}
              onRemove={removeFromCart}
              onNoteChange={handleNoteChange}
            />
          )
        )}

        {/* ── Delivery Address ───────────────────────────────────────── */}
        <DeliveryAddressSection
          addresses={addresses}
          selectedAddr={selectedAddr}
          deliveryBreakdown={
            isMulti
              ? `${allCarts.length} deliveries · ₹${grandTotals.delivery.toFixed(0)} total`
              : deliveryBreakdown
          }
          showDeliveryFee={
            isMulti ? showDeliveryFee : (showDeliveryFee && !isFreeDelivery)
          }
          onChangeAddr={() => setShowAddrModal(true)}
          onSelectAddr={setSelectedAddr}
        />

        {/* ── Single-mode promo ──────────────────────────────────────── */}
        {!isMulti && (
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
        )}

        {/* ── Single-mode bill summary ───────────────────────────────── */}
        {!isMulti && (
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
        )}

        {/* ── Grand total card (multi only) ──────────────────────────── */}
        {isMulti && (
          <View style={S.grandCard}>
            <Text style={S.grandTitle}>🧾 Grand Total</Text>
            <GrandRow label="Items subtotal"
              value={`₹${grandTotals.subtotal.toFixed(2)}`} />
            {grandTotals.discount > 0 && (
              <GrandRow label="Total discounts"
                value={`-₹${grandTotals.discount.toFixed(2)}`} green />
            )}
            {showDeliveryFee && (
              <GrandRow
                label={`Delivery (${allCarts.length} restaurants)`}
                value={`₹${grandTotals.delivery.toFixed(2)}`}
              />
            )}
            {grandTotals.tax > 0 && (
              <GrandRow label="Tax / GST" value={`₹${grandTotals.tax.toFixed(2)}`} />
            )}
            <View style={S.grandDivider} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={S.grandPayLabel}>Total to pay</Text>
              <Text style={S.grandPayValue}>₹{grandTotals.total.toFixed(2)}</Text>
            </View>
            <Text style={S.grandNote}>
              {allCarts.length} separate orders · Each restaurant prepares independently
            </Text>
          </View>
        )}

        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <Text style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 16 }}>
            Review your order before proceeding.
            Cancellation charges may apply once confirmed.
          </Text>
        </View>
      </ScrollView>

      {/* ── Checkout Bar ────────────────────────────────────────────── */}
      <CheckoutBar
        itemCount={totalItemCount}
        finalTotal={isMulti ? grandTotals.total : finalTotal}
        totalSavings={isMulti ? grandTotals.discount : totalSavings}
        addressLabel={selectedAddr?.label ?? null}
        disabled={!selectedAddr || belowMin}
        onPress={handleCheckout}
      />

      {/* ── Modals ──────────────────────────────────────────────────── */}
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
        itemCount={totalItemCount}
        merchantName={isMulti
          ? `${allCarts.length} restaurants`
          : (allCarts[0]?.merchant_name ?? '')}
        onCancel={() => setShowClearModal(false)}
        onConfirm={() => { clearCart(); setShowClearModal(false) }}
      />

      <AuthRequiredSheet
        visible={showAuthSheet}
        onClose={() => setShowAuthSheet(false)}
        title="Sign in to place your order"
        message="Browsing is free — but an account is needed for addresses, payments, and order tracking."
      />
    </View>
  )
}

// ─── Small helper component ───────────────────────────────────────────────────

function GrandRow({
  label, value, green,
}: { label: string; value: string; green?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
      <Text style={{ fontSize: 13, color: '#6B7280' }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '600',
        color: green ? '#16A34A' : '#1F2937' }}>{value}</Text>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  // Empty state
  emptyWrap:  { flex: 1, backgroundColor: '#F8F9FA', alignItems: 'center',
                justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  emptySub:   { fontSize: 14, color: '#6B7280', marginBottom: 28, textAlign: 'center' },
  browseBtn:  { backgroundColor: COLORS.primary, borderRadius: 14,
                paddingHorizontal: 28, paddingVertical: 14 },

  // Multi banner
  multiBanner:     { flexDirection: 'row', alignItems: 'center', gap: 10,
                     backgroundColor: '#FFF7ED', margin: 16, borderRadius: 14,
                     padding: 14, borderWidth: 1.5, borderColor: COLORS.primary },
  multiBannerTitle: { fontSize: 14, fontWeight: '800', color: '#92400E' },
  multiBannerSub:   { fontSize: 11, color: '#B45309', marginTop: 2 },

  // Merchant card (multi mode)
  merchantCard:      { backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 8,
                       borderRadius: 16, overflow: 'hidden', elevation: 2,
                       shadowColor: '#000', shadowOpacity: 0.06,
                       shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  merchantHeaderRow: { flexDirection: 'row', alignItems: 'center',
                       padding: 14, gap: 10, backgroundColor: '#FAFAFA',
                       borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  accentDot:         { width: 12, height: 12, borderRadius: 6 },
  merchantName:      { fontSize: 15, fontWeight: '800', color: '#111827' },
  merchantSub:       { fontSize: 12, color: '#6B7280', marginTop: 1 },
  removeBtn:         { paddingHorizontal: 10, paddingVertical: 6 },
  merchantTotalRow:  { flexDirection: 'row', justifyContent: 'space-between',
                       alignItems: 'center', margin: 12, marginTop: 0,
                       padding: 12, backgroundColor: '#F9FAFB',
                       borderRadius: 10, borderWidth: 1.5 },
  merchantTotalLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },
  merchantTotalValue: { fontSize: 16, fontWeight: '900' },

  // Grand total card (multi)
  grandCard:     { backgroundColor: '#fff', margin: 16, borderRadius: 16,
                   padding: 16, elevation: 2, shadowColor: '#000',
                   shadowOpacity: 0.06, shadowRadius: 6,
                   shadowOffset: { width: 0, height: 2 } },
  grandTitle:    { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 12 },
  grandDivider:  { height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 },
  grandPayLabel: { fontSize: 15, fontWeight: '900', color: '#111827' },
  grandPayValue: { fontSize: 17, fontWeight: '900', color: COLORS.primary },
  grandNote:     { marginTop: 10, fontSize: 11, color: '#9CA3AF',
                   lineHeight: 16, textAlign: 'center' },

  // Misc
  minWarn:  { marginHorizontal: 16, marginBottom: 10, backgroundColor: '#FEF2F2',
              borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FCA5A5' },
  calcRow:  { flexDirection: 'row', alignItems: 'center',
              paddingHorizontal: 16, marginBottom: 6, gap: 8 },
  calcText: { fontSize: 11, color: '#9CA3AF' },
})