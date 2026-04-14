import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, TextInput, Pressable, Image,
  Animated, FlatList, LayoutAnimation, Alert,
} from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { COLORS } from '../../../../lib/constants'
import { supabase } from '../../../../lib/supabase'
import { appCache } from '../../../../lib/appCache'
import { useCart } from '../../../../contexts/CartContext'
import { isDishAvailableNow, formatDishTiming, minutesUntilAvailable } from '../../../../lib/dishTiming'

type SortKey    = 'recommended' | 'name' | 'price_low' | 'price_high'
type LayoutMode = 'grid' | 'list'

const TTL_FULL_MENU = 5 * 60 * 1000  // 5 min

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const str = (v: any, fallback = '') => (v != null ? String(v) : fallback)
const num = (v: any, fallback = 0): number => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}
const bool        = (v: any) => v === true
const isVegOf     = (x: any) => bool(x?.is_veg ?? x?.isveg ?? x?.isVeg)
const isFeaturedOf = (x: any) => {
  const d = x?.is_featured ?? x?.isfeatured ?? x?.featured ?? x?.isFeatured
  if (d !== undefined) return bool(d)
  const t = x?.tags
  if (Array.isArray(t)) return t.map(String).includes('featured')
  if (typeof t === 'string') return t.toLowerCase().includes('featured')
  return false
}
const isAvailableOf = (x: any) => {
  const v = x?.is_available ?? x?.isavailable ?? x?.isAvailable
  return v === undefined ? true : v !== false
}
const imageUrlOf   = (x: any) => x?.image_url ?? x?.imageurl ?? x?.imageUrl ?? null
const finalPriceOf = (x: any) => {
  const mrp = num(x?.price, 0)
  const dp  = num(x?.discount_percentage ?? x?.discountpercentage, 0)
  return dp > 0 ? mrp * (1 - dp / 100) : mrp
}
const dishTimingOf = (x: any) => x?.dish_timing ?? x?.dishtiming ?? null

function normalizeMenuItem(row: any) {
  if (!row) return row
  return {
    ...row,
    merchant_id:         row.merchant_id         ?? row.merchantid         ?? null,
    category_id:         row.category_id         ?? row.categoryid         ?? null,
    image_url:           row.image_url           ?? row.imageurl           ?? null,
    is_available:        row.is_available        ?? row.isavailable        ?? null,
    is_veg:              row.is_veg              ?? row.isveg              ?? null,
    discount_percentage: row.discount_percentage ?? row.discountpercentage ?? 0,
    preparation_time:    row.preparation_time    ?? row.preparationtime    ?? null,
    dish_timing:         row.dish_timing         ?? row.dishtiming         ?? null,
  }
}

function normalizeMerchant(row: any) {
  if (!row) return row
  return {
    ...row,
    business_name:  row.business_name  ?? row.businessname  ?? null,
    logo_url:       row.logo_url       ?? row.logourl       ?? null,
    banner_url:     row.banner_url     ?? row.bannerurl     ?? null,
    average_rating: row.average_rating ?? row.averagerating ?? null,
    is_featured:    row.is_featured    ?? row.isfeatured    ?? null,
  }
}

function opensInLabel(mins: number | null): string {
  if (mins == null || mins <= 0) return ''
  if (mins < 60) return `opens in ${mins}m`
  return `opens in ${Math.floor(mins / 60)}h ${mins % 60}m`
}

/** Forces re-render every minute so timing badges stay accurate. */
function useMinuteTick() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const now = new Date();
    const msUntilNext =
      (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    const timeout = setTimeout(() => {
      setTick(t => t + 1);

      const interval = setInterval(
        () => setTick(t => t + 1),
        60_000,
      );

      // when we hit the timeout, we also need to clean up interval later
      return () => clearInterval(interval);
    }, msUntilNext);

    return () => clearTimeout(timeout);
  }, []); // ← no dependency on tick

  return tick;
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────
function FullMenuSkeleton() {
  const anim = useRef(new Animated.Value(0.6)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1,   duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [anim])

  const Box = ({ style }: { style: any }) => (
    <Animated.View style={[{ backgroundColor: '#E5E7EB', borderRadius: 8 }, style, { opacity: anim }]} />
  )

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA', padding: 12 }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Box style={{ width: 42, height: 42, borderRadius: 14 }} />
        <View style={{ flex: 1, gap: 6 }}>
          <Box style={{ height: 16, width: '55%' }} />
          <Box style={{ height: 12, width: '35%' }} />
        </View>
        <Box style={{ width: 76, height: 38, borderRadius: 14 }} />
      </View>

      {/* Search */}
      <Box style={{ height: 46, borderRadius: 14, marginBottom: 12 }} />

      {/* Filter chips */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {[72, 58, 88, 64, 78].map((w, i) => <Box key={i} style={{ height: 34, width: w, borderRadius: 999 }} />)}
      </View>

      {/* Category chips */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
        {[90, 70, 80, 60].map((w, i) => <Box key={i} style={{ height: 30, width: w, borderRadius: 999 }} />)}
      </View>

      {/* 2-column grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={{ width: '47.5%', backgroundColor: '#FFF', borderRadius: 18, overflow: 'hidden', elevation: 1 }}>
            <Box style={{ height: 120, borderRadius: 0 }} />
            <View style={{ padding: 10, gap: 7 }}>
              <Box style={{ height: 13, width: '80%' }} />
              <Box style={{ height: 11, width: '55%' }} />
              <Box style={{ height: 16, width: '38%' }} />
              <Box style={{ height: 34, width: '100%', borderRadius: 10, marginTop: 4 }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function FullMenuPage() {
  const router  = useRouter()
  const params  = useLocalSearchParams()
  const id      = str((params as any)?.id)
  const { addToCart, updateQuantity, cart } = useCart()
  const tick    = useMinuteTick()

  const [loading,        setLoading]        = useState(true)
  const [error_text,     setErrorText]      = useState<string | null>(null)
  const [merchant,       setMerchant]       = useState<any>(null)
  const [menu_items,     setMenuItems]      = useState<any[]>([])
  const [q,              setQ]              = useState('')
  const [veg_only,       setVegOnly]        = useState(false)
  const [featured_only,  setFeaturedOnly]   = useState(false)
  const [avail_now,      setAvailNow]       = useState(false)
  const [sort_key,       setSortKey]        = useState<SortKey>('recommended')
  const [layout_mode,    setLayoutMode]     = useState<LayoutMode>('grid')

  

  // ── Load (cache-first) ─────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setErrorText(null)
    try {
      const cKey   = `full_menu_${id}`
      const cached = appCache.get<{ merchant: any; items: any[] }>(cKey)
      if (cached) {
        setMerchant(cached.merchant)
        setMenuItems(cached.items)
        setLoading(false)
        return
      }

      const [{ data: m, error: mErr }, { data: items, error: iErr }] = await Promise.all([
        supabase.from('merchants').select('*').eq('id', id).maybeSingle(),
        supabase
          .from('menu_items')
          .select(
            'id,merchant_id,name,description,price,category,image_url,' +
            'is_available,is_veg,preparation_time,created_at,updated_at,' +
            'category_id,discount_percentage,dish_timing',
          )
          .eq('merchant_id', id)
          .order('category', { ascending: true })
          .order('name',     { ascending: true }),
      ])

      if (mErr) throw mErr
      if (iErr) throw iErr

      const normMerchant = normalizeMerchant(m ?? null)
      const normItems    = Array.isArray(items) ? items.map(normalizeMenuItem) : []

      setMerchant(normMerchant)
      setMenuItems(normItems)
      appCache.set(cKey, { merchant: normMerchant, items: normItems }, TTL_FULL_MENU)
    } catch (e: any) {
      setErrorText(e?.message ? String(e.message) : 'Failed to load menu')
      setMerchant(null)
      setMenuItems([])
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  // ── Categories ─────────────────────────────────────────────────────────────
  const categories = useMemo(() => {
    const set = new Set<string>()
    menu_items.forEach(x => set.add(str(x?.category, 'Other')))
    return Array.from(set)
  }, [menu_items])

  const timing_unavail_by_cat = useMemo(() => {
    void tick
    const map: Record<string, number> = {}
    menu_items.forEach(x => {
      const cat = str(x?.category, 'Other')
      const dt  = dishTimingOf(x)
      if (dt && !isDishAvailableNow(dt)) map[cat] = (map[cat] ?? 0) + 1
    })
    return map
  }, [menu_items, tick])

  const total_timing_unavail = useMemo(
    () => Object.values(timing_unavail_by_cat).reduce((a, b) => a + b, 0),
    [timing_unavail_by_cat],
  )

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    void tick
    const query = q.trim().toLowerCase()
    let list    = menu_items.slice()
    if (veg_only)      list = list.filter(x => isVegOf(x))
    if (featured_only) list = list.filter(x => isFeaturedOf(x))
    if (avail_now)     list = list.filter(x => isDishAvailableNow(dishTimingOf(x)))
    if (query)         list = list.filter(x => {
      const n = str(x?.name).toLowerCase()
      const d = str(x?.description).toLowerCase()
      const c = str(x?.category).toLowerCase()
      return n.includes(query) || d.includes(query) || c.includes(query)
    })
    if (sort_key === 'name')       list.sort((a, b) => str(a?.name).localeCompare(str(b?.name)))
    if (sort_key === 'price_low')  list.sort((a, b) => finalPriceOf(a) - finalPriceOf(b))
    if (sort_key === 'price_high') list.sort((a, b) => finalPriceOf(b) - finalPriceOf(a))
    return list
  }, [menu_items, q, veg_only, featured_only, avail_now, sort_key, tick])

  // ── Cart helpers ───────────────────────────────────────────────────────────
  const qtyOf = useCallback((menuitemid: string) => {
    const it = cart?.items?.find?.((x: any) => str(x?.id) === menuitemid)
    return num(it?.quantity, 0)
  }, [cart])

  const onAdd = useCallback((item: any) => {
    if (!isAvailableOf(item)) return
    const timing = dishTimingOf(item)
    if (!isDishAvailableNow(timing)) {
      const label  = formatDishTiming(timing)
      const mins   = minutesUntilAvailable(timing)
      const suffix = mins && mins > 0 ? (mins < 60 ? ` ${mins}m` : ` ${Math.floor(mins / 60)}h ${mins % 60}m`) : ''
      Alert.alert(
        'Not Available Now',
        label
          ? `${str(item?.name)} is only available ${label}.${suffix}`
          : `${str(item?.name)} is not available at this time.`,
        [{ text: 'OK' }],
      )
      return
    }
    addToCart(
      {
        id:                  str(item?.id),
        name:                str(item?.name, 'Item'),
        price:               num(item?.price, 0),
        quantity:            1,
        image_url:           imageUrlOf(item),
        discount_percentage: num(item?.discount_percentage ?? item?.discountpercentage, 0),
        is_veg:              isVegOf(item),
        category:            str(item?.category, 'Other'),
        merchant_id:         str(item?.merchant_id ?? item?.merchantid ?? id),
      } as any,
      str(item?.merchant_id ?? item?.merchantid ?? id),
      str(merchant?.business_name ?? merchant?.businessname, 'Restaurant'),
    )
  }, [addToCart, id, merchant])

  const onInc = useCallback((item: any) => {
    const timing = dishTimingOf(item)
    if (!isDishAvailableNow(timing)) {
      const label = formatDishTiming(timing)
      Alert.alert(
        'Not Available Now',
        label ? `${str(item?.name)} is only available ${label}.` : `${str(item?.name)} is not available at this time.`,
        [{ text: 'OK' }],
      )
      return
    }
    const idd = str(item?.id)
    updateQuantity(idd, qtyOf(idd) + 1)
  }, [qtyOf, updateQuantity])

  const onDec = useCallback((item: any) => {
    const idd = str(item?.id)
    updateQuantity(idd, Math.max(0, qtyOf(idd) - 1))
  }, [qtyOf, updateQuantity])

  const toggleLayout = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setLayoutMode(m => m === 'grid' ? 'list' : 'grid')
  }

  const cycleSort = () =>
    setSortKey(s =>
      s === 'recommended' ? 'name' :
      s === 'name'        ? 'price_low' :
      s === 'price_low'   ? 'price_high' :
      'recommended',
    )

  const sortLabel =
    sort_key === 'recommended' ? '↕ Recommended' :
    sort_key === 'name'        ? '🔤 Name'        :
    sort_key === 'price_low'   ? '💰 Low→High'    :
    '💰 High→Low'

  // ── List header ────────────────────────────────────────────────────────────
  const ListHeader = (
    <View style={S.header_wrap}>
      {/* Top row */}
      <View style={S.top_row}>
        <Pressable style={S.back_btn} onPress={() => router.back()}>
          <Text style={S.back_txt}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={S.title} numberOfLines={1}>
            {str(merchant?.business_name ?? merchant?.businessname, 'Full Menu')}
          </Text>
          <Text style={S.sub_title}>
            {filtered.length} items
            {error_text ? ' · Error' : ''}
            {total_timing_unavail > 0 && !avail_now ? ` · ${total_timing_unavail} unavailable now` : ''}
          </Text>
        </View>
        <Pressable style={S.layout_btn} onPress={toggleLayout}>
          <Text style={S.layout_btn_txt}>{layout_mode === 'grid' ? '⊞ Grid' : '☰ List'}</Text>
        </Pressable>
      </View>

      {/* Error banner */}
      {!!error_text && (
        <View style={S.err_box}>
          <Text style={S.err_txt} numberOfLines={3}>{error_text}</Text>
          <Pressable style={S.retry_btn} onPress={load}>
            <Text style={S.retry_txt}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* Search */}
      <View style={S.search_row}>
        <Text style={{ fontSize: 16 }}>🔍</Text>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search dishes..."
          placeholderTextColor="#9CA3AF"
          style={S.search_input}
        />
        {!!q && (
          <Pressable onPress={() => setQ('')}>
            <Text style={{ fontSize: 16, color: '#9CA3AF' }}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Filter chips */}
      <View style={S.filters}>
        <Pressable onPress={() => setVegOnly(v => !v)} style={[S.chip, veg_only && S.chip_active]}>
          <Text style={[S.chip_txt, veg_only && S.chip_txt_active]}>🌿 Veg</Text>
        </Pressable>
        <Pressable onPress={() => setFeaturedOnly(v => !v)} style={[S.chip, featured_only && S.chip_active]}>
          <Text style={[S.chip_txt, featured_only && S.chip_txt_active]}>⭐ Featured</Text>
        </Pressable>
        <Pressable onPress={() => setAvailNow(v => !v)} style={[S.chip, avail_now && S.chip_active]}>
          <Text style={[S.chip_txt, avail_now && S.chip_txt_active]}>
            🕐 Now{total_timing_unavail > 0 && !avail_now ? ` (${total_timing_unavail})` : ''}
          </Text>
        </Pressable>
        <Pressable onPress={cycleSort} style={S.chip}>
          <Text style={S.chip_txt}>{sortLabel}</Text>
        </Pressable>
      </View>

      {/* Category chips */}
      {categories.length > 0 && (
        <FlatList
          horizontal
          data={categories}
          keyExtractor={x => x}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingVertical: 10 }}
          renderItem={({ item: cat }) => {
            const unavail = timing_unavail_by_cat[cat] ?? 0
            return (
              <View style={S.cat_chip}>
                <Text style={S.cat_chip_txt}>{cat}</Text>
                {unavail > 0 && (
                  <View style={S.cat_unavail_badge}>
                    <Text style={S.cat_unavail_txt}>{unavail}</Text>
                  </View>
                )}
              </View>
            )
          }}
        />
      )}
    </View>
  )

  // ── Item card ──────────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: any }) => {
    void tick
    const dp             = num(item?.discount_percentage ?? item?.discountpercentage, 0)
    const mrp            = num(item?.price, 0)
    const price          = finalPriceOf(item)
    const qty            = qtyOf(str(item?.id))
    const available      = isAvailableOf(item)
    const img            = imageUrlOf(item)
    const is_featured    = isFeaturedOf(item)
    const timing         = dishTimingOf(item)
    const dish_avail_now = isDishAvailableNow(timing)
    const timing_label   = formatDishTiming(timing)
    const mins_until     = !dish_avail_now ? minutesUntilAvailable(timing) : null
    const item_disabled  = !available || !dish_avail_now

    return (
      <View style={[
        S.card,
        layout_mode === 'grid' ? S.card_grid : S.card_list,
        item_disabled && S.card_disabled,
      ]}>
        {/* Image */}
        <View style={[
          S.card_img_wrap,
          layout_mode === 'list' && S.card_img_wrap_list,
        ]}>
          {img ? (
            <Image
              source={{ uri: img }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          ) : (
            <View style={S.card_img_fallback}>
              <Text style={{ fontSize: 26 }}>🍽️</Text>
            </View>
          )}

          {is_featured && (
            <View style={S.badge_featured}>
              <Text style={S.badge_featured_txt}>FEATURED</Text>
            </View>
          )}

          <View style={[S.badge_veg, { backgroundColor: isVegOf(item) ? '#16A34A' : '#DC2626' }]} />

          {!dish_avail_now && available && (
            <View style={S.img_overlay}>
              <Text style={S.img_overlay_icon}>🕐</Text>
              <Text style={S.img_overlay_txt}>Not now</Text>
            </View>
          )}
          {!available && (
            <View style={[S.img_overlay, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
              <Text style={S.img_overlay_icon}>🚫</Text>
              <Text style={S.img_overlay_txt}>Unavailable</Text>
            </View>
          )}
          {timing && timing_label && dish_avail_now && (
            <View style={S.timing_chip_on_img}>
              <Text style={S.timing_chip_txt}>{timing_label}</Text>
            </View>
          )}
        </View>

        {/* Body */}
        <View style={S.card_body}>
          <Text style={S.item_name} numberOfLines={1}>{str(item?.name, 'Item')}</Text>
          <Text style={S.item_cat}  numberOfLines={1}>{str(item?.category, 'Other')}</Text>
          {!!item?.description && (
            <Text style={S.item_desc} numberOfLines={layout_mode === 'grid' ? 2 : 3}>
              {str(item.description)}
            </Text>
          )}

          {/* Price row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <Text style={S.price}>₹{price.toFixed(0)}</Text>
            {dp > 0 && <Text style={S.mrp}>₹{mrp.toFixed(0)}</Text>}
            {dp > 0 && (
              <View style={S.disc}>
                <Text style={S.disc_txt}>{dp.toFixed(0)}% OFF</Text>
              </View>
            )}
          </View>

          {/* Availability badges */}
          {!available && (
            <Text style={S.not_avail}>Unavailable</Text>
          )}
          {available && !dish_avail_now && timing_label && (
            <View style={S.timing_hint_row}>
              <Text style={S.timing_hint_txt}>
                Available {timing_label}
                {mins_until != null && mins_until > 0 ? ` · ${opensInLabel(mins_until)}` : ''}
              </Text>
            </View>
          )}
          {available && dish_avail_now && timing_label && (
            <View style={S.timing_badge_active}>
              <Text style={S.timing_badge_active_txt}>{timing_label}</Text>
            </View>
          )}

          {/* Action */}
          <View style={S.action_row}>
            {qty === 0 ? (
              <Pressable
                style={[S.add_btn, item_disabled && S.add_btn_disabled]}
                onPress={() => onAdd(item)}
                disabled={item_disabled}
              >
                <Text style={[S.add_btn_txt, item_disabled && S.add_btn_txt_disabled]}>
                  {!available ? 'N/A' : !dish_avail_now ? '—' : 'ADD'}
                </Text>
              </Pressable>
            ) : (
              <View style={S.qty_row}>
                <Pressable style={S.qty_btn} onPress={() => onDec(item)}>
                  <Text style={S.qty_btn_txt}>−</Text>
                </Pressable>
                <Text style={S.qty_count}>{qty}</Text>
                <Pressable
                  style={[S.qty_btn, !dish_avail_now && { opacity: 0.4 }]}
                  onPress={() => onInc(item)}
                  disabled={!dish_avail_now}
                >
                  <Text style={S.qty_btn_txt}>+</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>
    )
  }

  // ── Skeleton on first load (no cached data yet) ────────────────────────────
  if (loading && !menu_items.length) return <FullMenuSkeleton />

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <FlatList
        data={filtered}
        key={layout_mode}
        numColumns={layout_mode === 'grid' ? 2 : 1}
        keyExtractor={x => str(x?.id)}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 12 }}
        columnWrapperStyle={layout_mode === 'grid' ? { gap: 12 } : undefined}
        ItemSeparatorComponent={layout_mode === 'list' ? () => <View style={{ height: 12 }} /> : undefined}
        ListEmptyComponent={
          <View style={{ padding: 32, alignItems: 'center' }}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>🍽️</Text>
            <Text style={{ fontWeight: '900', color: COLORS.text, fontSize: 16 }}>No items found</Text>
            <Text style={{ color: COLORS.textLight, marginTop: 4, fontWeight: '700', textAlign: 'center' }}>
              Try clearing your search or filters.
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  // ── Header ────────────────────────────────────────────────────────────────
  header_wrap:     { paddingTop: 12, paddingBottom: 8 },
  top_row:         { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, paddingHorizontal: 4 },
  back_btn:        { width: 42, height: 42, borderRadius: 14, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', elevation: 1, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  back_txt:        { fontSize: 24, color: COLORS.text, fontWeight: '700', lineHeight: 28, marginTop: -2 },
  title:           { fontSize: 17, fontWeight: '900', color: COLORS.text },
  sub_title:       { fontSize: 12, color: COLORS.textLight, fontWeight: '700', marginTop: 2 },
  layout_btn:      { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FFF', borderRadius: 14, elevation: 1, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  layout_btn_txt:  { fontSize: 13, fontWeight: '800', color: COLORS.primary },

  // ── Error ─────────────────────────────────────────────────────────────────
  err_box:         { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  err_txt:         { flex: 1, color: '#DC2626', fontSize: 13, fontWeight: '600' },
  retry_btn:       { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#DC2626', borderRadius: 10 },
  retry_txt:       { color: '#FFF', fontWeight: '800', fontSize: 13 },

  // ── Search ────────────────────────────────────────────────────────────────
  search_row:      { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  search_input:    { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text },

  // ── Filter chips ──────────────────────────────────────────────────────────
  filters:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip:            { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E5E7EB' },
  chip_active:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chip_txt:        { fontSize: 13, fontWeight: '700', color: COLORS.text },
  chip_txt_active: { color: '#FFF' },

  // ── Category chips ────────────────────────────────────────────────────────
  cat_chip:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', gap: 6 },
  cat_chip_txt:      { fontSize: 13, fontWeight: '700', color: COLORS.text },
  cat_unavail_badge: { backgroundColor: '#F59E0B', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2, minWidth: 18, alignItems: 'center' },
  cat_unavail_txt:   { fontSize: 10, fontWeight: '900', color: '#FFF' },

  // ── Cards ─────────────────────────────────────────────────────────────────
  card:              { backgroundColor: '#FFF', borderRadius: 18, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, marginBottom: 12 },
  card_grid:         { flex: 1 },
  card_list:         { flexDirection: 'row' },
  card_disabled:     { opacity: 0.58 },
  card_img_wrap:     { width: '100%', aspectRatio: 4 / 3, backgroundColor: '#F3F4F6', position: 'relative' },
  card_img_wrap_list:{ width: 120, height: 120, aspectRatio: undefined },
  card_img_fallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // ── Image badges ──────────────────────────────────────────────────────────
  badge_featured:     { position: 'absolute', top: 8, left: 8, backgroundColor: '#F59E0B', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  badge_featured_txt: { fontSize: 9, fontWeight: '900', color: '#FFF', letterSpacing: 0.5 },
  badge_veg:          { position: 'absolute', top: 8, right: 8, width: 16, height: 16, borderRadius: 4, borderWidth: 2, borderColor: '#FFF' },
  img_overlay:        { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.42)', alignItems: 'center', justifyContent: 'center' },
  img_overlay_icon:   { fontSize: 28 },
  img_overlay_txt:    { color: '#FFF', fontSize: 12, fontWeight: '800', marginTop: 4 },
  timing_chip_on_img: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.62)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  timing_chip_txt:    { fontSize: 11, fontWeight: '700', color: '#FFF' },

  // ── Card body ─────────────────────────────────────────────────────────────
  card_body:  { padding: 12, flex: 1 },
  item_name:  { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 2 },
  item_cat:   { fontSize: 12, color: COLORS.textLight, fontWeight: '600', marginBottom: 2 },
  item_desc:  { fontSize: 12, color: '#6B7280', fontWeight: '500', marginBottom: 2 },
  price:      { fontSize: 15, fontWeight: '900', color: COLORS.text },
  mrp:        { fontSize: 13, color: '#9CA3AF', textDecorationLine: 'line-through', fontWeight: '600' },
  disc:       { backgroundColor: '#DCFCE7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  disc_txt:   { fontSize: 11, fontWeight: '800', color: '#16A34A' },
  not_avail:  { fontSize: 12, color: '#DC2626', fontWeight: '700', marginTop: 6 },

  // ── Timing badges ─────────────────────────────────────────────────────────
  timing_hint_row:          { marginTop: 6, backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  timing_hint_txt:          { fontSize: 11, fontWeight: '700', color: '#B45309' },
  timing_badge_active:      { marginTop: 6, backgroundColor: '#DCFCE7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  timing_badge_active_txt:  { fontSize: 11, fontWeight: '700', color: '#16A34A' },

  // ── Action / qty ──────────────────────────────────────────────────────────
  action_row:          { marginTop: 10 },
  add_btn:             { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  add_btn_disabled:    { backgroundColor: '#E5E7EB' },
  add_btn_txt:         { fontSize: 14, fontWeight: '900', color: '#FFF', letterSpacing: 0.5 },
  add_btn_txt_disabled:{ color: '#9CA3AF' },
  qty_row:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 3 },
  qty_btn:             { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  qty_btn_txt:         { fontSize: 22, color: '#FFF', fontWeight: '600', lineHeight: 26 },
  qty_count:           { fontSize: 16, fontWeight: '900', color: COLORS.text, minWidth: 28, textAlign: 'center' },
})