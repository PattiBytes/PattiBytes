/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, TextInput, ActivityIndicator, Alert, Dimensions,
  RefreshControl, Linking, Modal, KeyboardAvoidingView, Platform,
} from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../../../lib/supabase'
import { useAuth } from '../../../../contexts/AuthContext'
import { useCart } from '../../../../contexts/CartContext'
import { COLORS } from '../../../../lib/constants'

const { width: SW } = Dimensions.get('window')

// ─── Types ─────────────────────────────────────────────────────────────────────
type Merchant = {
  id: string; business_name: string; description: string | null
  logo_url: string | null; banner_url: string | null
  phone: string | null; email: string | null; address: string | null
  average_rating: number | null; total_reviews: number | null
  estimated_prep_time: number | null; avg_delivery_time: number | null
  min_order_amount: number | null; delivery_radius_km: number | null
  is_active: boolean; is_verified: boolean; is_featured: boolean | null
  opening_time: string | null; closing_time: string | null
  city: string | null; state: string | null; postal_code: string | null
  cuisine_types: string[]; gst_enabled: boolean; gst_percentage: number | null
  latitude: number | null; longitude: number | null; total_orders: number | null
}

// ✅ FIXED: uses actual DB columns — NO sort_order
type MenuItem = {
  id: string; name: string; description: string | null
  price: number
  discount_percentage: number | null  // ← can be 0.00, handle with > 0
  image_url: string | null; category: string; category_id: string | null
  is_available: boolean; is_veg: boolean; merchant_id: string
  preparation_time: number | null     // ← actual column name
}

type Review = {
  id: string; rating: number; comment: string | null
  created_at: string; customer_id: string; customer_name?: string
}

type PromoCode = {
  id: string; code: string; description: string | null
  discount_type: string; discount_value: number
  min_order_amount: number | null; max_discount_amount: number | null
  deal_type: string | null; deal_json: any
  valid_until: string | null
}

type RecommendedMerchant = {
  id: string; business_name: string; logo_url: string | null
  average_rating: number | null; estimated_prep_time: number | null
  cuisine_types: string[]; offer_label?: string | null
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function isOpen(opening_time: string | null, closing_time: string | null): boolean {
  if (!opening_time || !closing_time) return true
  const now = new Date()
  const cur = now.getHours() * 60 + now.getMinutes()
  const [oh, om] = opening_time.split(':').map(Number)
  const [ch, cm] = closing_time.split(':').map(Number)
  const open = oh * 60 + om
  let close = ch * 60 + cm
  if (close <= open) close += 1440
  return cur >= open && cur <= close
}

// ─── Qty Badge ─────────────────────────────────────────────────────────────────
function QtyBadge({
  count, onAdd, onRemove,
}: { count: number; onAdd: () => void; onRemove: () => void }) {
  if (count === 0) return (
    <TouchableOpacity style={S.addBtn} onPress={onAdd}>
      <Text style={S.addBtnTxt}>ADD</Text>
    </TouchableOpacity>
  )
  return (
    <View style={S.qtyRow}>
      <TouchableOpacity style={S.qtyBtn} onPress={onRemove}>
        <Text style={S.qtyBtnTxt}>−</Text>
      </TouchableOpacity>
      <Text style={S.qtyCount}>{count}</Text>
      <TouchableOpacity style={S.qtyBtn} onPress={onAdd}>
        <Text style={S.qtyBtnTxt}>+</Text>
      </TouchableOpacity>
    </View>
  )
}

// ─── Star Picker ───────────────────────────────────────────────────────────────
function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', paddingVertical: 8 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <TouchableOpacity key={s} onPress={() => onChange(s)}>
          <Text style={{ fontSize: 36, color: s <= value ? '#F59E0B' : '#D1D5DB' }}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function RestaurantPage() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const { cart, addToCart, updateQuantity, clearCart } = useCart()

  const [merchant,     setMerchant]    = useState<Merchant | null>(null)
  const [menuItems,    setMenuItems]   = useState<MenuItem[]>([])
  const [reviews,      setReviews]     = useState<Review[]>([])
  const [promos,       setPromos]      = useState<PromoCode[]>([])
  const [recommended,  setRecommended] = useState<RecommendedMerchant[]>([])
  const [loading,      setLoading]     = useState(true)
  const [refreshing,   setRefreshing]  = useState(false)
  const [activeTab,    setActiveTab]   = useState<'menu' | 'info' | 'reviews'>('menu')
  const [activeCategory, setActiveCategory] = useState('')
  const [searchItem,   setSearchItem]  = useState('')
  const [isFav,        setIsFav]       = useState(false)

  // Review states
  const [hasDeliveredOrder, setHasDeliveredOrder] = useState(false)
  const [deliveredOrderId,  setDeliveredOrderId]  = useState<string | null>(null)
  const [alreadyReviewed,   setAlreadyReviewed]   = useState(false)
  const [showReviewModal,   setShowReviewModal]    = useState(false)
  const [starRating,        setStarRating]         = useState(5)
  const [reviewText,        setReviewText]         = useState('')
  const [submittingReview,  setSubmittingReview]   = useState(false)

  const scrollRef    = useRef<ScrollView>(null)
  const sectionOffsets = useRef<Record<string, number>>({})

  // ── Load all data ───────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    if (!id) return
    try {
      const now = new Date().toISOString()

      const [
        { data: m },
        { data: items, error: itemErr },
        { data: revs },
        { data: promoData },
      ] = await Promise.all([
        supabase.from('merchants')
          .select('id,business_name,description,logo_url,banner_url,phone,email,address,average_rating,total_reviews,estimated_prep_time,avg_delivery_time,min_order_amount,delivery_radius_km,is_active,is_verified,is_featured,opening_time,closing_time,city,state,postal_code,cuisine_types,gst_enabled,gst_percentage,total_orders,latitude,longitude')
          .eq('id', id).maybeSingle(),

        // ✅ FIXED: removed sort_order, uses preparation_time
        supabase.from('menu_items')
          .select('id,name,description,price,discount_percentage,image_url,category,category_id,is_available,is_veg,merchant_id,preparation_time')
          .eq('merchant_id', id)
          .eq('is_available', true)
          .order('category', { ascending: true }),

        supabase.from('reviews')
          .select('id,rating,comment,created_at,customer_id')
          .eq('merchant_id', id)
          .order('created_at', { ascending: false })
          .limit(30),

        supabase.from('promo_codes')
          .select('id,code,description,discount_type,discount_value,min_order_amount,max_discount_amount,deal_type,deal_json,valid_until')
          .eq('is_active', true)
          .eq('scope', 'merchant')
          .eq('merchant_id', id)
          .or(`valid_until.is.null,valid_until.gte.${now}`)
          .order('priority', { ascending: false })
          .limit(5),
      ])

      if (itemErr) console.warn('menu_items error:', itemErr.message)

      if (m) {
        setMerchant({
          ...m,
          cuisine_types: Array.isArray(m.cuisine_types) ? m.cuisine_types : [],
        } as Merchant)
      }

      setMenuItems((items ?? []) as MenuItem[])
      setPromos((promoData ?? []) as PromoCode[])

      // Enrich reviews with customer names
      if (revs?.length) {
        const cIds = [...new Set(revs.map((r: any) => r.customer_id))]
        const { data: profiles } = await supabase.from('profiles')
          .select('id,full_name').in('id', cIds)
        const nameMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]))
        setReviews(revs.map((r: any) => ({
          ...r,
          customer_name: nameMap.get(r.customer_id) ?? 'Customer',
        })) as Review[])
      } else {
        setReviews([])
      }

      // Load recommended restaurants (same cuisine / same city, excluding current)
      if (m) {
        const cuisines: string[] = Array.isArray(m.cuisine_types) ? m.cuisine_types : []
        const cityVal = m.city
        const { data: recs } = await supabase.from('merchants')
          .select('id,business_name,logo_url,average_rating,estimated_prep_time,cuisine_types')
          .eq('is_active', true)
          .neq('id', id)
          .eq('city', cityVal ?? '')
          .limit(8)

        // Fetch best promo for each rec
        const recList = (recs ?? []) as RecommendedMerchant[]
        const recIds  = recList.map(r => r.id)
        if (recIds.length) {
          const { data: recPromos } = await supabase.from('promo_codes')
            .select('merchant_id,discount_type,discount_value,deal_type,deal_json')
            .eq('is_active', true).eq('scope', 'merchant').in('merchant_id', recIds)
            .or(`valid_until.is.null,valid_until.gte.${now}`)
          const promoMap = new Map<string, string>()
          for (const p of (recPromos ?? []) as any[]) {
            if (!promoMap.has(p.merchant_id)) {
              const lbl = p.deal_type === 'bxgy'
                ? `Buy ${p.deal_json?.buy?.qty ?? 1} Get ${p.deal_json?.get?.qty ?? 1} FREE`
                : p.discount_type === 'percentage' ? `${p.discount_value}% OFF` : `₹${p.discount_value} OFF`
              promoMap.set(p.merchant_id, lbl)
            }
          }
          recList.forEach(r => { r.offer_label = promoMap.get(r.id) ?? null })
        }
        setRecommended(recList)
      }
    } catch (e: any) {
      Alert.alert('Error loading restaurant', e.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadAll() }, [loadAll])

  // Check favourite
  useEffect(() => {
    if (!user || !id) return
    supabase.from('favorites').select('id')
      .eq('user_id', user.id).eq('merchant_id', id).maybeSingle()
      .then(({ data }) => setIsFav(!!data))
  }, [user, id])

  // ✅ Check if user has a delivered order from this merchant (for review)
  useEffect(() => {
    if (!user || !id) return
    ;(async () => {
      const { data: orders } = await supabase.from('orders')
        .select('id')
        .eq('customer_id', user.id)
        .eq('merchant_id', id)
        .eq('status', 'delivered')
        .limit(1)

      if (orders?.length) {
        setHasDeliveredOrder(true)
        setDeliveredOrderId(orders[0].id)

        // Check if already reviewed this merchant
        const { data: existing } = await supabase.from('reviews')
          .select('id')
          .eq('customer_id', user.id)
          .eq('merchant_id', id)
          .maybeSingle()
        setAlreadyReviewed(!!existing)
      }
    })()
  }, [user, id])

  const toggleFav = async () => {
    if (!user || !id) return
    if (isFav) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('merchant_id', id)
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, merchant_id: id })
    }
    setIsFav(!isFav)
  }

  const onRefresh = async () => {
    setRefreshing(true); await loadAll(); setRefreshing(false)
  }

  // ── Submit Review ────────────────────────────────────────────────────────────
  const handleSubmitReview = async () => {
    if (!user || !id || starRating < 1) return
    setSubmittingReview(true)
    try {
      const { error } = await supabase.from('reviews').insert({
        customer_id:  user.id,
        merchant_id:  id,
        order_id:     deliveredOrderId ?? null,
        rating:       starRating,
        comment:      reviewText.trim() || null,
        created_at:   new Date().toISOString(),
      })
      if (error) throw error

      // Update the order row for quick read
      if (deliveredOrderId) {
        await supabase.from('orders').update({
          rating: starRating, review: reviewText.trim() || null,
        }).eq('id', deliveredOrderId)
      }

      setAlreadyReviewed(true)
      setShowReviewModal(false)
      setReviewText('')
      await loadAll()
      Alert.alert('✅ Thank you!', 'Your review has been submitted.')
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setSubmittingReview(false)
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────────
  const categories = useMemo(
    () => [...new Set(menuItems.map(i => i.category))].filter(Boolean),
    [menuItems]
  )

  const filteredItems = useMemo(() => {
    if (!searchItem.trim()) return menuItems
    return menuItems.filter(i =>
      i.name.toLowerCase().includes(searchItem.toLowerCase()) ||
      (i.description ?? '').toLowerCase().includes(searchItem.toLowerCase())
    )
  }, [menuItems, searchItem])

  const groupedItems = useMemo(() => {
    const map = new Map<string, MenuItem[]>()
    for (const item of filteredItems) {
      const cat = item.category || 'Other'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(item)
    }
    return map
  }, [filteredItems])

  const itemCount = (itemId: string) =>
    cart?.items?.find(ci => ci.id === itemId)?.quantity ?? 0

  const cartCount    = cart?.items?.reduce((s, i) => s + i.quantity, 0) ?? 0
  const cartSubtotal = cart?.items?.reduce((s, i) => {
    // ✅ FIXED: use > 0 not truthy, so 0.00 is treated as no discount
    const eff = (i.discount_percentage ?? 0) > 0
      ? i.price * (1 - (i.discount_percentage! / 100)) : i.price
    return s + eff * i.quantity
  }, 0) ?? 0

  const open      = merchant ? isOpen(merchant.opening_time, merchant.closing_time) : true
  const avgRating = merchant
    ? Number(merchant.average_rating ?? 0).toFixed(1) : '0.0'

  const handleAddItem = (item: MenuItem) => {
    if (cart?.merchant_id && cart.merchant_id !== item.merchant_id && cart.items.length > 0) {
      Alert.alert(
        'Different Restaurant',
        'Your cart has items from another restaurant. Clear and add this item?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear & Add', style: 'destructive', onPress: () => {
              clearCart()
              addToCart(
                {
                  id: item.id, name: item.name, price: item.price,
                  discount_percentage: item.discount_percentage,
                  image_url: item.image_url, is_veg: item.is_veg,
                  category: item.category, merchant_id: item.merchant_id,
                },
                item.merchant_id, merchant?.business_name ?? ''
              )
            },
          },
        ]
      )
      return
    }
    addToCart(
      {
        id: item.id, name: item.name, price: item.price,
        discount_percentage: item.discount_percentage,
        image_url: item.image_url, is_veg: item.is_veg,
        category: item.category, merchant_id: item.merchant_id,
      },
      item.merchant_id, merchant?.business_name ?? ''
    )
  }

  // ── Loading / Not found ──────────────────────────────────────────────────────
  if (loading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={{ marginTop: 12, color: COLORS.textLight }}>Loading menu…</Text>
    </View>
  )

  if (!merchant) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Stack.Screen options={{ title: 'Restaurant' }} />
      <Text style={{ fontSize: 48, marginBottom: 12 }}>🏪</Text>
      <Text style={{ fontWeight: '800', fontSize: 18, color: COLORS.text }}>Restaurant not found</Text>
      <TouchableOpacity style={S.primaryBtn} onPress={() => router.back()}>
        <Text style={S.primaryBtnTxt}>Go Back</Text>
      </TouchableOpacity>
    </View>
  )

  // ── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        stickyHeaderIndices={[2]}
      >
        {/* ── 1. BANNER + HEADER INFO ─────────────────────────────────── */}
        <View>
          {/* Top action bar */}
          <View style={S.topBar}>
            <TouchableOpacity style={S.topBarBtn} onPress={() => router.back()}>
              <Text style={{ fontSize: 20, color: COLORS.text }}>←</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={S.topBarBtn} onPress={toggleFav}>
                <Text style={{ fontSize: 20 }}>{isFav ? '❤️' : '🤍'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.topBarBtn} onPress={() => router.push('/(customer)/cart' as any)}>
                <Text style={{ fontSize: 20 }}>🛒</Text>
                {cartCount > 0 && (
                  <View style={S.smallBadge}>
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{cartCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Banner image */}
          <View style={S.banner}>
            {merchant.banner_url ? (
              <Image source={{ uri: merchant.banner_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <View style={{ flex: 1, backgroundColor: COLORS.primary + '22', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 56 }}>🍽️</Text>
              </View>
            )}
            {/* Closed overlay on banner */}
            {!open && (
              <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900' }}>🔴 Currently Closed</Text>
              </View>
            )}
          </View>

          {/* Info Card */}
          <View style={S.infoCard}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={S.logoWrap}>
                {merchant.logo_url ? (
                  <Image source={{ uri: merchant.logo_url }} style={{ width: '100%', height: '100%', borderRadius: 14 }} resizeMode="cover" />
                ) : (
                  <Text style={{ fontSize: 32 }}>🍴</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={S.restName} numberOfLines={2}>{merchant.business_name}</Text>
                  {merchant.is_verified && <Text style={{ fontSize: 14 }}>✅</Text>}
                  {merchant.is_featured && <Text style={{ fontSize: 14 }}>⭐</Text>}
                </View>
                {merchant.cuisine_types?.length > 0 && (
                  <Text style={S.cuisineTxt} numberOfLines={1}>
                    {merchant.cuisine_types.join(' • ')}
                  </Text>
                )}
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  <View style={[S.openBadge, !open && { backgroundColor: '#FEE2E2' }]}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: open ? '#065F46' : '#DC2626' }}>
                      {open ? '🟢 Open Now' : '🔴 Closed'}
                    </Text>
                  </View>
                  {merchant.gst_enabled && (
                    <View style={{ backgroundColor: '#EFF6FF', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 10, color: '#1D4ED8', fontWeight: '700' }}>GST {merchant.gst_percentage ?? 0}%</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Stats row */}
            <View style={S.statsRow}>
              {[
                { emoji: '⭐', val: avgRating,  label: 'Rating' },
                { emoji: '🕐', val: `${merchant.estimated_prep_time ?? merchant.avg_delivery_time ?? '—'} min`, label: 'Prep Time' },
                { emoji: '🛒', val: merchant.min_order_amount ? `₹${merchant.min_order_amount}` : 'No min', label: 'Min Order' },
                { emoji: '💬', val: `${merchant.total_reviews ?? reviews.length}`, label: 'Reviews' },
              ].map(s => (
                <View key={s.label} style={S.statItem}>
                  <Text style={S.statVal}>{s.emoji} {s.val}</Text>
                  <Text style={S.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Description */}
            {merchant.description ? (
              <Text style={S.descTxt} numberOfLines={3}>{merchant.description}</Text>
            ) : null}

            {/* ✅ PROMO STRIP — all active offers for this restaurant */}
            {promos.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.textLight, marginBottom: 6 }}>
                  🏷️ AVAILABLE OFFERS
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {promos.map(p => {
                    // ✅ FIXED: check > 0 for discount_value
                    const label = p.deal_type === 'bxgy'
                      ? `Buy ${p.deal_json?.buy?.qty ?? 1} Get ${p.deal_json?.get?.qty ?? 1} FREE`
                      : p.discount_type === 'percentage'
                        ? `${p.discount_value}% OFF`
                        : `₹${p.discount_value} OFF`
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={S.promoChip}
                        onPress={() =>
                          Alert.alert(
                            `🏷️ ${p.code}`,
                            `${label}\n${p.description ?? ''}\n${p.min_order_amount ? `\nMin order ₹${p.min_order_amount}` : ''}${p.max_discount_amount ? `\nMax discount ₹${p.max_discount_amount}` : ''}${p.valid_until ? `\nValid till ${new Date(p.valid_until).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}`
                          )
                        }
                      >
                        <Text style={S.promoChipTxt}>🏷️ {label} · {p.code}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </ScrollView>
              </View>
            )}

            {/* Write a Review CTA — shown if user has delivered order */}
            {hasDeliveredOrder && !alreadyReviewed && (
              <TouchableOpacity
                style={S.reviewCta}
                onPress={() => setShowReviewModal(true)}
              >
                <Text style={{ fontSize: 22, marginRight: 10 }}>⭐</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '800', color: COLORS.text, fontSize: 14 }}>
                    How was your order?
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                    Share your experience with others
                  </Text>
                </View>
                <Text style={{ color: COLORS.primary, fontSize: 18 }}>›</Text>
              </TouchableOpacity>
            )}
            {hasDeliveredOrder && alreadyReviewed && (
              <View style={[S.reviewCta, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                <Text style={{ fontSize: 20, marginRight: 10 }}>✅</Text>
                <Text style={{ fontWeight: '700', color: '#065F46' }}>
                  You&apos;ve reviewed this restaurant
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── 2. TABS ─────────────────────────────────────────────────── */}
        <View style={S.tabs}>
          {(['menu', 'info', 'reviews'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[S.tab, activeTab === t && S.tabActive]}
              onPress={() => setActiveTab(t)}
            >
              <Text style={[S.tabTxt, activeTab === t && S.tabTxtActive]}>
                {t === 'menu' ? '🍽️ Menu' : t === 'info' ? 'ℹ️ Info' : `⭐ Reviews (${reviews.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── 3. STICKY CATEGORY NAV (only on menu tab) ───────────────── */}
        {activeTab === 'menu' && categories.length > 1 && (
          <View style={S.catBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[S.catChip, activeCategory === cat && S.catChipActive]}
                  onPress={() => {
                    setActiveCategory(cat)
                    const offset = sectionOffsets.current[cat]
                    if (offset !== undefined) {
                      scrollRef.current?.scrollTo({ y: offset + 260, animated: true })
                    }
                  }}
                >
                  <Text style={[S.catChipTxt, activeCategory === cat && { color: '#fff' }]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── 4. MENU TAB ─────────────────────────────────────────────── */}
        {activeTab === 'menu' && (
          <View style={{ paddingBottom: 140 }}>
            {/* Search */}
            <View style={S.itemSearch}>
              <Text style={{ fontSize: 15, marginRight: 8 }}>🔍</Text>
              <TextInput
                style={{ flex: 1, fontSize: 14, color: COLORS.text }}
                placeholder="Search menu items…"
                value={searchItem}
                onChangeText={setSearchItem}
                placeholderTextColor="#9CA3AF"
              />
              {searchItem ? (
                <TouchableOpacity onPress={() => setSearchItem('')}>
                  <Text style={{ color: '#9CA3AF', fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {groupedItems.size === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 56 }}>
                <Text style={{ fontSize: 52, marginBottom: 14 }}>🍽️</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text }}>
                  {searchItem ? `No items match "${searchItem}"` : 'Menu coming soon'}
                </Text>
                {searchItem ? (
                  <TouchableOpacity onPress={() => setSearchItem('')} style={{ marginTop: 14 }}>
                    <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Clear search</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              [...groupedItems.entries()].map(([cat, items]) => (
                <View
                  key={cat}
                  onLayout={e => { sectionOffsets.current[cat] = e.nativeEvent.layout.y }}
                >
                  {/* Category header */}
                  <View style={S.catHeader}>
                    <Text style={S.catHeaderTxt}>{cat}</Text>
                    <Text style={{ fontSize: 12, color: COLORS.textLight }}>{items.length} items</Text>
                  </View>

                  {items.map(item => {
                    // ✅ FIXED: check > 0, not truthy (0.00 is falsy in JS)
                    const hasDiscount = (item.discount_percentage ?? 0) > 0
                    const effectivePrice = hasDiscount
                      ? item.price * (1 - item.discount_percentage! / 100)
                      : item.price
                    const count = itemCount(item.id)

                    return (
                      <View key={item.id} style={S.menuItem}>
                        <View style={{ flex: 1, paddingRight: 12 }}>
                          {/* Veg indicator + name */}
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                            <View style={[
                              S.vegIndicator,
                              { backgroundColor: item.is_veg ? '#16A34A' : '#DC2626', marginTop: 3 },
                            ]} />
                            <Text style={S.itemName}>{item.name}</Text>
                          </View>

                          {item.description ? (
                            <Text style={S.itemDesc} numberOfLines={2}>{item.description}</Text>
                          ) : null}

                          {/* Prep time */}
                          {item.preparation_time ? (
                            <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 3 }}>
                              🕐 {item.preparation_time} min prep
                            </Text>
                          ) : null}

                          {/* Price row */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                            <Text style={S.itemPrice}>₹{effectivePrice.toFixed(0)}</Text>
                            {hasDiscount && (
                              <>
                                <Text style={S.itemMRP}>₹{item.price.toFixed(0)}</Text>
                                <View style={S.discBadge}>
                                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>
                                    {item.discount_percentage!.toFixed(0)}% OFF
                                  </Text>
                                </View>
                              </>
                            )}
                          </View>
                        </View>

                        {/* Image + cart controls */}
                        <View style={{ alignItems: 'center', gap: 6 }}>
                          {item.image_url ? (
                            <Image
                              source={{ uri: item.image_url }}
                              style={S.itemImg}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={[S.itemImg, {
                              backgroundColor: '#F3F4F6',
                              alignItems: 'center', justifyContent: 'center',
                            }]}>
                              <Text style={{ fontSize: 26 }}>🍽️</Text>
                            </View>
                          )}
                          <QtyBadge
                            count={count}
                            onAdd={() => handleAddItem(item)}
                            onRemove={() => updateQuantity(item.id, count - 1)}
                          />
                        </View>
                      </View>
                    )
                  })}
                </View>
              ))
            )}

            {/* ── RECOMMENDED RESTAURANTS ──────────────────────────── */}
            {recommended.length > 0 && (
              <View style={{ paddingTop: 20 }}>
                <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                  <Text style={S.catHeaderTxt}>🏪 More Restaurants Near You</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
                  {recommended.map(r => (
                    <TouchableOpacity
                      key={r.id}
                      style={S.recCard}
                      onPress={() => router.push(`/(customer)/restaurant/${r.id}` as any)}
                    >
                      <View style={S.recLogo}>
                        {r.logo_url ? (
                          <Image source={{ uri: r.logo_url }} style={{ width: '100%', height: '100%', borderRadius: 12 }} resizeMode="cover" />
                        ) : (
                          <Text style={{ fontSize: 24 }}>🍴</Text>
                        )}
                      </View>
                      <Text style={S.recName} numberOfLines={1}>{r.business_name}</Text>
                      {(r.average_rating ?? 0) > 0 && (
                        <Text style={S.recMeta}>⭐ {Number(r.average_rating).toFixed(1)}</Text>
                      )}
                      {r.estimated_prep_time ? (
                        <Text style={S.recMeta}>🕐 {r.estimated_prep_time} min</Text>
                      ) : null}
                      {r.offer_label && (
                        <View style={{ backgroundColor: '#ECFDF5', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 }}>
                          <Text style={{ fontSize: 9, fontWeight: '700', color: '#065F46' }}>
                            🏷️ {r.offer_label}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* ── 5. INFO TAB ─────────────────────────────────────────────── */}
        {activeTab === 'info' && (
          <View style={{ padding: 16, gap: 12, paddingBottom: 80 }}>
            {[
              merchant.address      && { icon: '📍', label: 'Address',  value: merchant.address },
              merchant.phone        && { icon: '📞', label: 'Phone',    value: merchant.phone,   action: () => Linking.openURL(`tel:${merchant.phone}`) },
              merchant.email        && { icon: '✉️',  label: 'Email',    value: merchant.email,   action: () => Linking.openURL(`mailto:${merchant.email}`) },
              merchant.opening_time && { icon: '🕐', label: 'Hours',    value: `${merchant.opening_time} – ${merchant.closing_time}` },
              merchant.city         && { icon: '🏙️', label: 'City',     value: [merchant.city, merchant.state, merchant.postal_code].filter(Boolean).join(', ') },
            ].filter(Boolean).map((row: any) => (
              <TouchableOpacity
                key={row.label}
                style={S.infoRow}
                onPress={row.action}
                activeOpacity={row.action ? 0.7 : 1}
              >
                <Text style={{ fontSize: 22, marginRight: 12 }}>{row.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: COLORS.textLight, fontWeight: '700', marginBottom: 2 }}>
                    {row.label.toUpperCase()}
                  </Text>
                  <Text style={{
                    fontSize: 14, fontWeight: '600',
                    color: row.action ? COLORS.primary : COLORS.text,
                  }}>
                    {row.value}
                  </Text>
                </View>
                {row.action && <Text style={{ color: COLORS.primary, fontSize: 18 }}>›</Text>}
              </TouchableOpacity>
            ))}

            {(merchant.phone || merchant.email) && (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                {merchant.phone && (
                  <TouchableOpacity
                    style={[S.contactBtn, { flex: 1 }]}
                    onPress={() => Linking.openURL(`tel:${merchant.phone}`)}>
                    <Text style={{ color: COLORS.primary, fontWeight: '700' }}>📞 Call</Text>
                  </TouchableOpacity>
                )}
                {merchant.phone && (
                  <TouchableOpacity
                    style={[S.contactBtn, { flex: 1, borderColor: '#25D366' }]}
                    onPress={() => Linking.openURL(`https://wa.me/${merchant.phone?.replace(/\D/g, '')}`)}>
                    <Text style={{ color: '#25D366', fontWeight: '700' }}>💬 WhatsApp</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* ── 6. REVIEWS TAB ──────────────────────────────────────────── */}
        {activeTab === 'reviews' && (
          <View style={{ padding: 16, gap: 12, paddingBottom: 80 }}>
            {/* Rating summary card */}
            <View style={S.ratingCard}>
              <Text style={{ fontSize: 52, fontWeight: '900', color: COLORS.text }}>{avgRating}</Text>
              <View style={{ marginLeft: 16, flex: 1 }}>
                <View style={{ flexDirection: 'row', gap: 3 }}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <Text key={s} style={{ fontSize: 22, color: s <= Math.round(+avgRating) ? '#F59E0B' : '#D1D5DB' }}>★</Text>
                  ))}
                </View>
                <Text style={{ color: COLORS.textLight, fontSize: 13, marginTop: 4 }}>
                  Based on {merchant.total_reviews ?? reviews.length} reviews
                </Text>
              </View>
            </View>

            {/* Write review prompt inside Reviews tab */}
            {hasDeliveredOrder && !alreadyReviewed && (
              <TouchableOpacity style={[S.reviewCta, { marginBottom: 4 }]} onPress={() => setShowReviewModal(true)}>
                <Text style={{ fontSize: 22, marginRight: 10 }}>✍️</Text>
                <Text style={{ fontWeight: '800', color: COLORS.primary, fontSize: 14 }}>
                  Write a Review
                </Text>
                <Text style={{ color: COLORS.primary, fontSize: 20, marginLeft: 'auto' }}>›</Text>
              </TouchableOpacity>
            )}

            {reviews.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ fontSize: 44, marginBottom: 10 }}>⭐</Text>
                <Text style={{ fontWeight: '700', fontSize: 16, color: COLORS.text }}>No reviews yet</Text>
                <Text style={{ color: COLORS.textLight, fontSize: 13, marginTop: 4, textAlign: 'center' }}>
                  Be the first to share your experience!
                </Text>
              </View>
            ) : (
              reviews.map(rev => (
                <View key={rev.id} style={S.reviewCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={S.avatarPlaceholder}>
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                          {(rev.customer_name ?? 'C')[0].toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={{ fontWeight: '700', color: COLORS.text, fontSize: 13 }}>
                          {rev.customer_name ?? 'Customer'}
                        </Text>
                        <Text style={{ fontSize: 11, color: COLORS.textLight }}>
                          {new Date(rev.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 2 }}>
                      {[1, 2, 3, 4, 5].map(s => (
                        <Text key={s} style={{ fontSize: 14, color: s <= rev.rating ? '#F59E0B' : '#D1D5DB' }}>★</Text>
                      ))}
                    </View>
                  </View>
                  {rev.comment ? (
                    <Text style={{ fontSize: 13, color: '#4B5563', lineHeight: 20 }}>{rev.comment}</Text>
                  ) : null}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* ── CART BAR ─────────────────────────────────────────────────── */}
      {cartCount > 0 && cart?.merchant_id === id && (
        <View style={S.cartBar}>
          <View>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
              {cartCount} item{cartCount !== 1 ? 's' : ''} · ₹{cartSubtotal.toFixed(2)}
            </Text>
            {promos.length > 0 && (
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10 }}>
                Offers available at checkout 🏷️
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={() => router.push('/(customer)/cart' as any)}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>View Cart →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── REVIEW MODAL ─────────────────────────────────────────────── */}
      <Modal visible={showReviewModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={S.modalOverlay}>
            <View style={S.reviewModal}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: COLORS.text, marginBottom: 4, textAlign: 'center' }}>
                Rate {merchant.business_name}
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.textLight, textAlign: 'center', marginBottom: 16 }}>
                How was your experience?
              </Text>

              <StarPicker value={starRating} onChange={setStarRating} />
              <Text style={{ textAlign: 'center', fontWeight: '800', fontSize: 14, color: COLORS.text, marginBottom: 14 }}>
                {['', '😞 Poor', '😕 Not great', '😐 Okay', '😊 Good', '🤩 Excellent!'][starRating]}
              </Text>

              <TextInput
                style={S.reviewInput}
                placeholder="Tell others what you loved (or didn't)… (optional)"
                value={reviewText}
                onChangeText={setReviewText}
                multiline
                numberOfLines={4}
                placeholderTextColor="#9CA3AF"
                textAlignVertical="top"
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity
                  style={[S.reviewBtn, { backgroundColor: '#F3F4F6', flex: 1 }]}
                  onPress={() => { setShowReviewModal(false); setReviewText('') }}
                >
                  <Text style={{ fontWeight: '700', color: '#374151' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[S.reviewBtn, { backgroundColor: COLORS.primary, flex: 2 }, submittingReview && { opacity: 0.6 }]}
                  onPress={handleSubmitReview}
                  disabled={submittingReview}
                >
                  {submittingReview
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={{ color: '#fff', fontWeight: '800' }}>Submit Review ★</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const S = StyleSheet.create({
  // ── Top bar
  topBar:        { position: 'absolute', top: 48, left: 0, right: 0, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14 },
  topBarBtn:     { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', elevation: 4, position: 'relative' },
  smallBadge:    { position: 'absolute', top: -3, right: -3, width: 16, height: 16, borderRadius: 8, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  // ── Banner
  banner:        { width: SW, height: 200, backgroundColor: '#F3F4F6', overflow: 'hidden' },
  // ── Info card
  infoCard:      { backgroundColor: '#fff', margin: 12, marginTop: -20, borderRadius: 20, padding: 16, elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
  logoWrap:      { width: 68, height: 68, borderRadius: 16, backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', elevation: 2, flexShrink: 0 },
  restName:      { fontSize: 18, fontWeight: '900', color: COLORS.text, flex: 1 },
  cuisineTxt:    { fontSize: 12, color: COLORS.textLight, marginTop: 3 },
  openBadge:     { backgroundColor: '#DCFCE7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statsRow:      { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginTop: 14 },
  statItem:      { alignItems: 'center', flex: 1 },
  statVal:       { fontSize: 11, fontWeight: '800', color: COLORS.text },
  statLabel:     { fontSize: 10, color: COLORS.textLight, marginTop: 2 },
  descTxt:       { fontSize: 13, color: '#4B5563', lineHeight: 20, marginTop: 10 },
  // ── Promos
  promoChip:     { backgroundColor: '#ECFDF5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1.5, borderColor: '#A7F3D0' },
  promoChipTxt:  { fontSize: 11, fontWeight: '700', color: '#065F46' },
  // ── Review CTA
  reviewCta:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7F0', borderRadius: 12, padding: 14, marginTop: 12, borderWidth: 1.5, borderColor: '#FED7AA' },
  // ── Tabs
  tabs:          { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tab:           { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive:     { borderBottomWidth: 2.5, borderBottomColor: COLORS.primary },
  tabTxt:        { fontSize: 12, fontWeight: '600', color: COLORS.textLight },
  tabTxtActive:  { color: COLORS.primary, fontWeight: '800' },
  // ── Category bar (sticky)
  catBar:        { backgroundColor: '#fff', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', elevation: 2 },
  catChip:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: 'transparent' },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catChipTxt:    { fontSize: 12, fontWeight: '700', color: '#374151' },
  // ── Menu
  itemSearch:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 12, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, elevation: 1 },
  catHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8F9FA', paddingHorizontal: 16, paddingVertical: 10, borderLeftWidth: 3, borderLeftColor: COLORS.primary, marginBottom: 2 },
  catHeaderTxt:  { fontSize: 14, fontWeight: '800', color: COLORS.text, letterSpacing: 0.3 },
  menuItem:      { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  vegIndicator:  { width: 10, height: 10, borderRadius: 2 },
  itemName:      { fontSize: 14, fontWeight: '700', color: COLORS.text, flex: 1 },
  itemDesc:      { fontSize: 12, color: '#6B7280', marginTop: 3, lineHeight: 18 },
  itemPrice:     { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  itemMRP:       { fontSize: 12, color: '#9CA3AF', textDecorationLine: 'line-through' },
  discBadge:     { backgroundColor: '#EF4444', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  itemImg:       { width: 88, height: 88, borderRadius: 12, marginBottom: 8 },
  addBtn:        { backgroundColor: '#fff', borderRadius: 8, borderWidth: 2, borderColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 6 },
  addBtnTxt:     { color: COLORS.primary, fontWeight: '800', fontSize: 13 },
  qtyRow:        { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: 8 },
  qtyBtn:        { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  qtyBtnTxt:     { color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 24 },
  qtyCount:      { color: '#fff', fontWeight: '800', fontSize: 14, minWidth: 24, textAlign: 'center' },
  // ── Info tab
  infoRow:       { backgroundColor: '#fff', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', elevation: 1 },
  contactBtn:    { borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 12, padding: 12, alignItems: 'center' },
  // ── Reviews tab
  ratingCard:    { backgroundColor: '#fff', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', elevation: 1 },
  reviewCard:    { backgroundColor: '#fff', borderRadius: 14, padding: 14, elevation: 1 },
  avatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  // ── Recommended
  recCard:       { width: 130, backgroundColor: '#fff', borderRadius: 16, padding: 12, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  recLogo:       { width: 60, height: 60, borderRadius: 12, backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 8 },
  recName:       { fontSize: 12, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  recMeta:       { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  // ── Cart bar
  cartBar:       { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.primary, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32, elevation: 8 },
  // ── Review modal
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  reviewModal:   { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36, elevation: 20 },
  reviewInput:   { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 13, fontSize: 14, color: COLORS.text, minHeight: 100, marginTop: 4 },
  reviewBtn:     { alignItems: 'center', paddingVertical: 13, borderRadius: 12 },
  // ── Misc
  primaryBtn:    { backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 20, paddingHorizontal: 32 },
  primaryBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
})
