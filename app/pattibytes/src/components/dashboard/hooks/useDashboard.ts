// src/components/dashboard/hooks/useDashboard.ts

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as Location from 'expo-location'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { appCache, TTL } from '../../../lib/appCache'
import type { RestaurantResult, CustomProductResult } from '../../../types/search'
import {
  AppSettings, Merchant, ActiveOrder, TrendingDish,
  GlobalDeal, MenuResult, ShopCategory,
} from '../types'
import { haversine, merchantIsOpen, isAnnouncementActive } from '../helpers'
import { ACTIVE_STATUSES } from '../constants'
import { fuzzyFilter } from '../../../lib/fuzzy'

// ── Category meta ─────────────────────────────────────────────────────────────
const CATEGORY_META: Record<string, { emoji: string; bg: string; text: string }> = {
  food:          { emoji: '🍱', bg: '#FFF3EE', text: '#EA580C' },
  dairy:         { emoji: '🥛', bg: '#DBEAFE', text: '#1D4ED8' },
  grocery:       { emoji: '🛒', bg: '#D1FAE5', text: '#065F46' },
  groceries:     { emoji: '🛒', bg: '#D1FAE5', text: '#065F46' },
  medicines:     { emoji: '💊', bg: '#FEE2E2', text: '#991B1B' },
  medicine:      { emoji: '💊', bg: '#FEE2E2', text: '#991B1B' },
  bakery:        { emoji: '🎂', bg: '#FCE7F3', text: '#9D174D' },
  beverages:     { emoji: '🥤', bg: '#E0F2FE', text: '#0369A1' },
  snacks:        { emoji: '🍿', bg: '#FEF9C3', text: '#854D0E' },
  fruits:        { emoji: '🍎', bg: '#DCFCE7', text: '#166534' },
  vegetables:    { emoji: '🥦', bg: '#D1FAE5', text: '#065F46' },
  personal_care: { emoji: '🧴', bg: '#F3E8FF', text: '#6B21A8' },
  household:     { emoji: '🧹', bg: '#FEF3C7', text: '#B45309' },
}
const DEFAULT_META = { emoji: '📦', bg: '#F3F4F6', text: '#374151' }

function toLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ── Settings columns ──────────────────────────────────────────────────────────
const SETTINGS_COLS =
  'app_name,app_logo_url,announcement,show_menu_images,delivery_fee,' +
  'customer_search_radius_km,facebook_url,instagram_url,youtube_url,' +
  'twitter_url,website_url,custom_links,support_phone,support_email,' +
  'business_address,free_delivery_above,delivery_fee_enabled,min_order_amount'

// ── Module-level cached fetchers ──────────────────────────────────────────────
async function fetchAppSettings(): Promise<AppSettings | null> {
  const cached = appCache.get<AppSettings>('app_settings')
  if (cached) return cached
  const { data } = await supabase
    .from('app_settings').select(SETTINGS_COLS).limit(1).maybeSingle()
  if (data) appCache.set('app_settings', data as AppSettings, TTL.APP_SETTINGS)
  return (data as AppSettings) ?? null
}

async function fetchGlobalDeals(): Promise<GlobalDeal[]> {
  const cached = appCache.get<GlobalDeal[]>('global_deals')
  if (cached) return cached
  const now = new Date().toISOString()
  const { data } = await supabase
    .from('promo_codes')
    .select('id,code,description,discount_type,discount_value,min_order_amount,valid_until,deal_type,deal_json')
    .eq('is_active', true)
    .eq('scope', 'global')
    .or(`valid_until.is.null,valid_until.gte.${now}`)
    .order('priority', { ascending: false })
    .limit(6)
  const result = (data ?? []) as GlobalDeal[]
  appCache.set('global_deals', result, TTL.OFFERS)
  return result
}

async function fetchShopCategories(): Promise<ShopCategory[]> {
  const cached = appCache.get<ShopCategory[]>('shop_categories')
  if (cached) return cached
  const { data } = await supabase
    .from('customproducts').select('category,id').eq('isactive', true)
  if (!data?.length) return []
  const countMap = new Map<string, number>()
  for (const row of data as any[]) {
    const cat = (row.category as string | null)?.trim().toLowerCase()
    if (!cat) continue
    countMap.set(cat, (countMap.get(cat) ?? 0) + 1)
  }
  const cats: ShopCategory[] = [...countMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => {
      const meta = CATEGORY_META[key] ?? DEFAULT_META
      return {
        key, label: toLabel(key),
        emoji: meta.emoji, bg: meta.bg, text: meta.text,
        route: `/(customer)/shop?cat=${key}`, count,
      }
    })
  appCache.set('shop_categories', cats, 5 * 60 * 1000)
  return cats
}

async function fetchTrending(): Promise<{ dishes: TrendingDish[]; isFeatured: boolean }> {
  const CACHE_KEY = 'trending_dishes'
  const cached = appCache.get<{ dishes: TrendingDish[]; isFeatured: boolean }>(CACHE_KEY)
  if (cached) return cached

  try {
    // Tier 1: order frequency last 7 days
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString()
    const { data: orders } = await supabase
      .from('orders')
      .select('items,merchant_id')
      .gte('created_at', since)
      .not('status', 'in', '(cancelled,rejected)')
      .not('items', 'is', null)
      .limit(400)

    const counts = new Map<string, { count: number; merchant_id: string }>()
    for (const o of (orders ?? []) as any[]) {
      const arr = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items ?? [])
      for (const item of arr) {
        if (item.is_custom_product) continue
        const key = String(
          item.menu_item_id ?? item.menuItemId ?? item.menu_item?.id ?? item.id ?? ''
        ).trim()
        if (!key) continue
        const ex = counts.get(key)
        if (ex) ex.count += item.quantity ?? 1
        else counts.set(key, { count: item.quantity ?? 1, merchant_id: item.merchant_id || o.merchant_id })
      }
    }

    const topKeys = [...counts.keys()]
      .sort((a, b) => counts.get(b)!.count - counts.get(a)!.count)
      .slice(0, 12)

    if (topKeys.length >= 2) {
      const { data: menuItems } = await supabase
        .from('menu_items')
        .select('id,name,price,image_url,discount_percentage,merchant_id,is_veg,category')
        .in('id', topKeys)
        .eq('is_available', true)
      if (menuItems?.length) {
        const mIds = [...new Set(menuItems.map((m: any) => m.merchant_id as string))]
        const { data: merch } = await supabase.from('merchants').select('id,business_name').in('id', mIds)
        const mMap = new Map((merch ?? []).map((m: any) => [m.id as string, m.business_name as string]))
        const dishes: TrendingDish[] = menuItems
          .map((m: any) => ({
            id: m.id, name: m.name, price: m.price,
            discount_percentage: m.discount_percentage ?? null,
            image_url: m.image_url ?? null,
            is_veg: m.is_veg ?? false,
            merchant_id: m.merchant_id,
            merchant_name: mMap.get(m.merchant_id) ?? 'Restaurant',
            count: counts.get(m.id)?.count ?? 0,
          }))
          .sort((a: any, b: any) => b.count - a.count)
        const result = { dishes, isFeatured: false }
        appCache.set(CACHE_KEY, result, TTL.TRENDING)
        return result
      }
    }

    // Tier 2: discounted items
    const { data: discounted } = await supabase
      .from('menu_items')
      .select('id,name,price,image_url,discount_percentage,merchant_id,is_veg,category')
      .eq('is_available', true)
      .gt('discount_percentage', 0)
      .order('discount_percentage', { ascending: false })
      .limit(12)
    if (discounted?.length) {
      const mIds = [...new Set(discounted.map((m: any) => m.merchant_id as string))]
      const { data: merch } = await supabase.from('merchants').select('id,business_name').in('id', mIds)
      const mMap = new Map((merch ?? []).map((m: any) => [m.id as string, m.business_name as string]))
      const dishes: TrendingDish[] = discounted.map((m: any) => ({
        id: m.id, name: m.name, price: m.price,
        discount_percentage: m.discount_percentage ?? null,
        image_url: m.image_url ?? null,
        is_veg: m.is_veg ?? false,
        merchant_id: m.merchant_id,
        merchant_name: mMap.get(m.merchant_id) ?? 'Restaurant',
        count: 0,
      }))
      const result = { dishes, isFeatured: true }
      appCache.set(CACHE_KEY, result, TTL.TRENDING)
      return result
    }

    // Tier 3: most recently added
    const { data: recent } = await supabase
      .from('menu_items')
      .select('id,name,price,image_url,discount_percentage,merchant_id,is_veg,category')
      .eq('is_available', true)
      .order('created_at', { ascending: false })
      .limit(12)
    if (recent?.length) {
      const mIds = [...new Set(recent.map((m: any) => m.merchant_id as string))]
      const { data: merch } = await supabase.from('merchants').select('id,business_name').in('id', mIds)
      const mMap = new Map((merch ?? []).map((m: any) => [m.id as string, m.business_name as string]))
      const dishes: TrendingDish[] = recent.map((m: any) => ({
        id: m.id, name: m.name, price: m.price,
        discount_percentage: m.discount_percentage ?? null,
        image_url: m.image_url ?? null,
        is_veg: m.is_veg ?? false,
        merchant_id: m.merchant_id,
        merchant_name: mMap.get(m.merchant_id) ?? 'Restaurant',
        count: 0,
      }))
      const result = { dishes, isFeatured: true }
      appCache.set(CACHE_KEY, result, TTL.TRENDING)
      return result
    }

    return { dishes: [], isFeatured: false }
  } catch (e: any) {
    console.warn('[fetchTrending]', e.message)
    return { dishes: [], isFeatured: false }
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useDashboard() {
  const { user } = useAuth()

  // ── Core state ────────────────────────────────────────────────────────────
  const [loading,            setLoading]            = useState(true)
  const [appSettings,        setAppSettings]        = useState<AppSettings | null>(null)
  const [locationText,       setLocationText]       = useState('Detecting…')
  const [coords,             setCoords]             = useState<{ lat: number; lng: number } | null>(null)
  const [showLocModal,       setShowLocModal]       = useState(false)
  const [restaurants,        setRestaurants]        = useState<Merchant[]>([])
  const [loadingR,           setLoadingR]           = useState(false)
  const [activeOrders,       setActiveOrders]       = useState<ActiveOrder[]>([])
  const [trending,           setTrending]           = useState<TrendingDish[]>([])
  const [isFeaturedTrending, setIsFeaturedTrending] = useState(false)
  const [globalDeals,        setGlobalDeals]        = useState<GlobalDeal[]>([])
  const [shopCategories,     setShopCategories]     = useState<ShopCategory[]>([])
  const [loadingCategories,  setLoadingCategories]  = useState(true)

  // ── Search state ──────────────────────────────────────────────────────────
  const [search,               setSearch]               = useState('')
  const [menuResults,          setMenuResults]          = useState<MenuResult[]>([])
  const [restaurantResults,    setRestaurantResults]    = useState<RestaurantResult[]>([])
  const [customProductResults, setCustomProductResults] = useState<CustomProductResult[]>([])
  const [searchingMenu,        setSearchingMenu]        = useState(false)
  // ── Suggestions & recent ──────────────────────────────────────────────────
  const [searchFocused,    setSearchFocused]    = useState(false)
  const [recentSearches,   setRecentSearches]   = useState<string[]>([])
  const [suggestionPool,   setSuggestionPool]   = useState<string[]>([])
  // Debounce ref — cancels in-flight search on rapid typing
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── UI state ──────────────────────────────────────────────────────────────
  const [refreshing,    setRefreshing]    = useState(false)
  const [showPopup,     setShowPopup]     = useState(false)
  const [dismissed,     setDismissed]     = useState(false)
  const [unreadCount,   setUnreadCount]   = useState(0)
  const [activeTab,     setActiveTab]     = useState<'all' | 'open' | 'featured'>('all')
  const [cuisineFilter, setCuisineFilter] = useState<string | null>(null)

  // ── Derived: announcement ─────────────────────────────────────────────────
  const announcement = useMemo(() => {
    const a = (appSettings as any)?.announcement
    return a && isAnnouncementActive(a) ? a : null
  }, [appSettings])

  // ── Derived: unique cuisines ──────────────────────────────────────────────
  const allCuisines = useMemo(() => {
    const set = new Set<string>()
    restaurants.forEach(r => (r.cuisine_types ?? []).forEach(c => set.add(c)))
    return [...set].slice(0, 10)
  }, [restaurants])

  // ── Derived: fuzzy suggestions ────────────────────────────────────────────
  // Shows fuzzy matches when typing, shows full pool top-6 when query is empty
  const searchSuggestions = useMemo(() => {
    const q = search.trim()
    if (!q) return suggestionPool.slice(0, 6)
    return fuzzyFilter(q, suggestionPool, 30)
  }, [search, suggestionPool])

  // ── Derived: filtered restaurants ────────────────────────────────────────
  const displayRestaurants = useMemo(() => {
    let r = restaurants
    if (activeTab === 'open')     r = r.filter(m => m.is_open)
    if (activeTab === 'featured') r = r.filter(m => m.is_featured)
    if (cuisineFilter) {
      r = r.filter(m =>
        m.cuisine_types?.some(c => c.toLowerCase() === cuisineFilter!.toLowerCase()),
      )
    }
    return r
  }, [restaurants, activeTab, cuisineFilter])

  // ── Helper: grow suggestion pool ─────────────────────────────────────────
  // Deduplicates across all sources: restaurant names, cuisines, menu item names
  const growPool = useCallback((terms: string[]) => {
    setSuggestionPool(prev => {
      const set = new Set(prev)
      for (const t of terms) {
        const trimmed = t?.trim()
        if (trimmed && trimmed.length > 1) set.add(trimmed)
      }
      // Cap pool at 300 terms to avoid memory bloat
      return [...set].slice(0, 300)
    })
  }, [])

  // ── loadInitialData ───────────────────────────────────────────────────────
  const loadInitialData = useCallback(async () => {
    setLoading(true)
    try {
      const [settingsRes, trendingRes, dealsRes, categoriesRes] =
        await Promise.allSettled([
          fetchAppSettings(),
          fetchTrending(),
          fetchGlobalDeals(),
          fetchShopCategories(),
        ])
      if (settingsRes.status === 'fulfilled' && settingsRes.value)
        setAppSettings(settingsRes.value)
      if (trendingRes.status === 'fulfilled') {
        setTrending(trendingRes.value.dishes)
        setIsFeaturedTrending(trendingRes.value.isFeatured)
        // Seed pool with trending dish names
        growPool(trendingRes.value.dishes.map(d => d.name))
      } else {
        console.warn('[useDashboard] trending failed:', (trendingRes as any).reason?.message)
      }
      if (dealsRes.status === 'fulfilled')
        setGlobalDeals(dealsRes.value)
      if (categoriesRes.status === 'fulfilled') {
        setShopCategories(categoriesRes.value)
        // Seed pool with category labels
        growPool(categoriesRes.value.map(c => c.label))
      }
    } finally {
      setLoading(false)
      setLoadingCategories(false)
    }
  }, [growPool])

  // ── loadActiveOrders ──────────────────────────────────────────────────────
  const loadActiveOrders = useCallback(async () => {
    if (!user) return
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id,order_number,status,total_amount,merchant_id')
        .eq('customer_id', user.id)
        .in('status', ACTIVE_STATUSES)
        .order('created_at', { ascending: false })
        .limit(3)
      if (error || !orders?.length) { setActiveOrders([]); return }
      const mIds = [...new Set(orders.map((o: any) => o.merchant_id as string).filter(Boolean))]
      const { data: merch } = mIds.length
        ? await supabase.from('merchants').select('id,business_name').in('id', mIds)
        : { data: [] }
      const map = new Map((merch ?? []).map((m: any) => [m.id as string, m.business_name as string]))
      setActiveOrders(
        orders.map((o: any) => ({
          ...o, merchant_name: map.get(o.merchant_id) ?? 'Restaurant',
        })) as ActiveOrder[],
      )
    } catch (e: any) {
      console.warn('[loadActiveOrders]', e.message)
      setActiveOrders([])
    }
  }, [user])

  // ── loadUnreadCount ───────────────────────────────────────────────────────
  const loadUnreadCount = useCallback(async () => {
    if (!user) return
    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      setUnreadCount(count ?? 0)
    } catch {}
  }, [user])

  // ── detectLocation ────────────────────────────────────────────────────────
  const detectLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      const fallback   = { lat: 31.2797, lng: 74.8597 }
      if (status !== 'granted') {
        setLocationText('Patti, Punjab')
        setCoords(fallback)
        return
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const { latitude, longitude } = pos.coords
      setCoords({ lat: latitude, lng: longitude })
      const key = process.env.EXPO_PUBLIC_LOCATIONIQ_KEY
      if (key) {
        try {
          const r = await fetch(
            `https://us1.locationiq.com/v1/reverse?key=${key}&lat=${latitude}&lon=${longitude}&format=json`,
          )
          const g = await r.json()
          const city = g?.address?.city ?? g?.address?.town ?? g?.address?.village
          setLocationText(city ? `${city}, ${g?.address?.state ?? ''}` : 'Location detected')
        } catch {
          setLocationText('Location detected')
        }
      } else {
        setLocationText('Location detected')
      }
    } catch {
      setLocationText('Patti, Punjab')
      setCoords({ lat: 31.2797, lng: 74.8597 })
    }
  }, [])

  const handleLocationPick = useCallback((label: string, lat: number, lng: number) => {
    setLocationText(label)
    setCoords({ lat, lng })
  }, [])

  // ── loadRestaurants ───────────────────────────────────────────────────────
  const loadRestaurants = useCallback(async () => {
    if (!coords) return
    setLoadingR(true)
    try {
      const [merchantsResult, promosResult] = await Promise.all([
        supabase
          .from('merchants')
          .select(
            'id,business_name,logo_url,banner_url,average_rating,total_reviews,' +
            'estimated_prep_time,min_order_amount,latitude,longitude,opening_time,' +
            'closing_time,is_featured,city,cuisine_types',
          )
          .eq('is_active', true)
          .limit(80),
        supabase
          .from('promo_codes')
          .select('merchant_id,code,discount_type,discount_value,deal_type,deal_json,valid_from,valid_until')
          .eq('is_active', true)
          .eq('scope', 'merchant')
          .limit(200),
      ])

      const offerMap = new Map<string, string>()
      const now = new Date()
      for (const p of (promosResult.data ?? []) as any[]) {
        if (p.valid_from  && new Date(p.valid_from)  > now) continue
        if (p.valid_until && new Date(p.valid_until) < now) continue
        if (!offerMap.has(p.merchant_id)) {
          offerMap.set(
            p.merchant_id,
            p.deal_type === 'bxgy'
              ? `Buy ${p.deal_json?.buy?.qty ?? 1} Get ${p.deal_json?.get?.qty ?? 1} FREE`
              : p.discount_type === 'percentage'
              ? `${p.discount_value}% OFF`
              : `₹${p.discount_value} OFF`,
          )
        }
      }

      const list: Merchant[] = (merchantsResult.data ?? [])
        .map((m: any) => ({
          ...m,
          cuisine_types: Array.isArray(m.cuisine_types) ? m.cuisine_types : [],
          distance_km:
            m.latitude && m.longitude
              ? haversine(coords.lat, coords.lng, +m.latitude, +m.longitude)
              : 999,
          is_open:     merchantIsOpen(m as Merchant),
          offer_label: offerMap.get(m.id) ?? null,
        }))
        .sort((a: Merchant, b: Merchant) => {
          if (a.is_open && !b.is_open)         return -1
          if (!a.is_open && b.is_open)         return  1
          if (a.is_featured && !b.is_featured) return -1
          if (!a.is_featured && b.is_featured) return  1
          return (a.distance_km ?? 999) - (b.distance_km ?? 999)
        })

      setRestaurants(list)

      // Grow suggestion pool: merchant names + all cuisine tags
      growPool([
        ...list.map(m => m.business_name),
        ...list.flatMap(m => m.cuisine_types ?? []),
      ])
    } catch (e: any) {
      console.warn('[loadRestaurants]', e.message)
    } finally {
      setLoadingR(false)
    }
  }, [coords, growPool])

  // ── searchMenuItems ───────────────────────────────────────────────────────
  const searchMenuItems = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setMenuResults([])
      setRestaurantResults([])
      setCustomProductResults([])
      return
    }
    setSearchingMenu(true)
    try {
      const like = `%${q}%`
      const [menuRes, merchantRes, productRes] = await Promise.allSettled([
        supabase
          .from('menu_items')
          .select('id,name,price,discount_percentage,image_url,merchant_id,category,is_available,is_veg,dish_timing')
          .ilike('name', `%${q}%`)
          .eq('is_available', true)
          .limit(20),
        supabase
          .from('merchants')
          .select(
            'id,business_name,business_type,cuisine_types,logo_url,banner_url,' +
            'average_rating,total_reviews,is_active,is_verified,opening_time,' +
            'closing_time,avg_delivery_time,min_order_amount,city,address',
          )
          .eq('is_active', true)
          .or(`business_name.ilike.${like},city.ilike.${like}`)
          .limit(10),
        supabase
          .from('customproducts')
          .select('id,name,category,price,unit,imageurl,description,isactive,stock_qty,available_from,available_to,available_days')
          .eq('isactive', true)
          .or(`name.ilike.${like},category.ilike.${like},description.ilike.${like}`)
          .limit(10),
      ])

      // Menu items — enrich with merchant name
      if (menuRes.status === 'fulfilled' && menuRes.value.data?.length) {
        const data = menuRes.value.data as any[]
        const mIds = [...new Set(data.map(i => i.merchant_id as string))]
        const { data: merch } = await supabase
          .from('merchants').select('id,business_name').in('id', mIds)
        const mMap = new Map((merch ?? []).map((m: any) => [m.id as string, m.business_name as string]))
        setMenuResults(
          data.map(i => ({ ...i, merchant_name: mMap.get(i.merchant_id) ?? 'Restaurant' })) as MenuResult[],
        )
        // Grow suggestion pool with matched item names
        growPool(data.map(i => i.name))
      } else {
        setMenuResults([])
      }

      setRestaurantResults(
        merchantRes.status === 'fulfilled'
          ? (merchantRes.value.data ?? []) as unknown as RestaurantResult[]
          : [],
      )
      setCustomProductResults(
        productRes.status === 'fulfilled'
          ? (productRes.value.data ?? []) as unknown as CustomProductResult[]
          : [],
      )
    } catch {
      setMenuResults([])
      setRestaurantResults([])
      setCustomProductResults([])
    } finally {
      setSearchingMenu(false)
    }
  }, [growPool])

  // ── Recent search helpers ─────────────────────────────────────────────────
  const addRecentSearch = useCallback((term: string) => {
    const t = term.trim()
    if (!t || t.length < 2) return
    setRecentSearches(prev => {
      const filtered = prev.filter(r => r.toLowerCase() !== t.toLowerCase())
      return [t, ...filtered].slice(0, 8)
    })
  }, [])

  const clearRecentSearches = useCallback(() => setRecentSearches([]), [])

  const removeRecentSearch = useCallback((term: string) => {
    setRecentSearches(prev => prev.filter(r => r.toLowerCase() !== term.toLowerCase()))
  }, [])

  // ── Effects ───────────────────────────────────────────────────────────────

  // 1. Non-location initial data — runs once
  useEffect(() => { loadInitialData() }, [loadInitialData])

  // 2. User-dependent data
  useEffect(() => {
    if (!user) return
    loadActiveOrders()
    loadUnreadCount()
  }, [user, loadActiveOrders, loadUnreadCount])

  // 3. Location — runs once
  useEffect(() => { detectLocation() }, [detectLocation])

  // 4. Restaurants — triggered by GPS coords
  useEffect(() => { if (coords) loadRestaurants() }, [coords, loadRestaurants])

  // 5. Search debounce — 350ms, cancels on rapid typing
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => searchMenuItems(search), 350)
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current)
    }
  }, [search, searchMenuItems])

  // 6. Announcement popup — 1.5s delay after mount
  useEffect(() => {
    if (!announcement || dismissed) return
    const t = setTimeout(() => setShowPopup(true), 1500)
    return () => clearTimeout(t)
  }, [announcement, dismissed])

  // 7. Real-time active order updates
  useEffect(() => {
    if (!user) return
    const sub = supabase
      .channel('dash-orders-rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `customer_id=eq.${user.id}` },
        () => loadActiveOrders(),
      )
      .subscribe()
    return () => { sub.unsubscribe() }
  }, [user, loadActiveOrders])

  // 8. Real-time notification badge
  useEffect(() => {
    if (!user) return
    loadUnreadCount()
    const sub = supabase
      .channel('dash-notif-badge-rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => loadUnreadCount(),
      )
      .subscribe()
    return () => { sub.unsubscribe() }
  }, [user, loadUnreadCount])

  // ── Pull-to-refresh ───────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    appCache.delete('app_settings')
    appCache.delete('trending_dishes')
    appCache.delete('global_deals')
    appCache.delete('shop_categories')
    await Promise.allSettled([
      loadInitialData(),
      loadRestaurants(),
      loadActiveOrders(),
    ])
    setRefreshing(false)
  }, [loadInitialData, loadRestaurants, loadActiveOrders])

  // ── Return ────────────────────────────────────────────────────────────────
  return {
    // Auth
    user,
    // Loading flags
    loading,
    loadingR,
    loadingCategories,
    refreshing,
    // App settings
    appSettings,
    // Location
    locationText,
    coords,
    showLocModal,
    setShowLocModal,
    handleLocationPick,
    // Content
    restaurants,
    displayRestaurants,
    activeOrders,
    trending,
    isFeaturedTrending,
    globalDeals,
    shopCategories,
    // Search
    search,
    setSearch,
    menuResults,
    restaurantResults,
    customProductResults,
    searchingMenu,
    // Suggestions
    searchFocused,
    setSearchFocused,
    searchSuggestions,
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
    // UI toggles
    onRefresh,
    showPopup,
    setShowPopup,
    dismissed,
    setDismissed,
    unreadCount,
    // Filters
    activeTab,
    setActiveTab,
    cuisineFilter,
    setCuisineFilter,
    // Derived
    announcement,
    allCuisines,
  }
}