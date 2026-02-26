/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Image, ActivityIndicator, RefreshControl,
  Linking, Modal, Alert, Dimensions, Clipboard, Platform,
} from 'react-native'
import { Stack, useRouter } from 'expo-router'
import * as Location from 'expo-location'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { useCart } from '../../../contexts/CartContext'
import { COLORS } from '../../../lib/constants'

const { width: SW } = Dimensions.get('window')

const ACTIVE_STATUSES = [
  'pending','confirmed','preparing','ready',
  'assigned','pickedup','on_the_way','outfordelivery',
]
const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B', confirmed: '#3B82F6', preparing: '#8B5CF6',
  ready: '#10B981',   assigned: '#06B6D4',  pickedup: '#F97316',
  on_the_way: '#F97316', outfordelivery: '#84CC16',
}

// ─── Types ────────────────────────────────────────────────────────────────────
type AppSettings = {
  app_name: string | null; app_logo_url: string | null; announcement: any
  show_menu_images: boolean | null; delivery_fee: number | null
  customer_search_radius_km: number | null
  facebook_url: string | null; instagram_url: string | null
  youtube_url: string | null; twitter_url: string | null
  custom_links: any[] | null; support_phone: string | null; support_email: string | null
}
type Merchant = {
  id: string; business_name: string; logo_url: string | null; banner_url: string | null
  average_rating: number | null; total_reviews: number | null
  estimated_prep_time: number | null; min_order_amount: number | null
  latitude: number | null; longitude: number | null
  opening_time: string | null; closing_time: string | null
  is_featured: boolean | null; city: string | null; cuisine_types: string[]
  distance_km?: number; offer_label?: string | null; is_open?: boolean
}
type ActiveOrder  = { id: string; order_number: number; status: string; total_amount: number; merchant_name?: string }
type TrendingDish = { id: string; name: string; price: number; discount_percentage: number | null; image_url: string | null; merchant_id: string; merchant_name: string; count: number }
type GlobalDeal   = { id: string; code: string; description: string | null; discount_type: string; discount_value: number; min_order_amount: number | null; valid_until: string | null; deal_type?: string; deal_json?: any }
type MenuResult   = { id: string; name: string; price: number; discount_percentage: number | null; image_url: string | null; merchant_id: string; merchant_name?: string; category: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371, toRad = (d: number) => d * Math.PI / 180
  const a = Math.sin(toRad(lat2 - lat1) / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2 - lon1) / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function merchantIsOpen(m: Merchant): boolean {
  if (!m.opening_time || !m.closing_time) return true
  const now = new Date()
  const cur = now.getHours() * 60 + now.getMinutes()
  const [oh, om] = m.opening_time.split(':').map(Number)
  const [ch, cm] = m.closing_time.split(':').map(Number)
  let close = ch * 60 + cm
  const open  = oh * 60 + om
  if (close <= open) close += 1440
  return cur >= open && cur <= close
}

function openTimeLabel(m: Merchant): string {
  if (!m.opening_time) return ''
  const [h, min] = m.opening_time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hh = h % 12 || 12
  return `Opens at ${hh}:${String(min).padStart(2, '0')} ${ampm}`
}

function isAnnouncementActive(a: any) {
  if (!a?.enabled) return false
  const now = Date.now()
  const s = a.start_at ? new Date(a.start_at).getTime() : NaN
  const e = a.end_at   ? new Date(a.end_at).getTime()   : NaN
  if (Number.isFinite(s) && now < s) return false
  if (Number.isFinite(e) && now > e) return false
  return !!(String(a.title ?? '').trim() || String(a.message ?? '').trim())
}

// ─── ShopByCategory ───────────────────────────────────────────────────────────
function ShopByCategory({ onNav }: { onNav: (p: string) => void }) {
  const CATS = [
    { id: 'food',      label: 'Food',      emoji: '🍱', bg: '#FFF3EE', text: COLORS.primary,  route: '/(customer)/shop?cat=food'      },
    { id: 'dairy',     label: 'Dairy',     emoji: '🥛', bg: '#DBEAFE', text: '#1D4ED8',       route: '/(customer)/shop?cat=dairy'     },
    { id: 'grocery',   label: 'Grocery',   emoji: '🛒', bg: '#D1FAE5', text: '#065F46',       route: '/(customer)/shop?cat=grocery'   },
    { id: 'medicines', label: 'Medicine',  emoji: '💊', bg: '#FEE2E2', text: '#991B1B',       route: '/(customer)/shop?cat=medicines' },
    { id: 'bakery',    label: 'Bakery',    emoji: '🎂', bg: '#FCE7F3', text: '#9D174D',       route: '/(customer)/shop?cat=bakery'    },
    { id: 'custom',    label: 'Custom',    emoji: '📝', bg: '#F5F3FF', text: '#5B21B6',       route: '/(customer)/custom-order'       },
  ]
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={[S.sectionHeader, { paddingHorizontal: 16, marginBottom: 10 }]}>
        <Text style={S.secTitle}>Categories</Text>
        {/* "See All" → shop with no cat filter */}
        <TouchableOpacity onPress={() => onNav('/(customer)/shop')}>
          <Text style={S.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
        {CATS.map(c => (
          <TouchableOpacity
            key={c.id}
            style={{ backgroundColor: c.bg, borderRadius: 16, padding: 14, alignItems: 'center', minWidth: 70 }}
            onPress={() => onNav(c.route)}   // ✅ each category routes correctly
          >
            <Text style={{ fontSize: 26, marginBottom: 5 }}>{c.emoji}</Text>
            <Text style={{ fontSize: 11, fontWeight: '800', color: c.text, textAlign: 'center' }}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

// ─── SocialLinks ──────────────────────────────────────────────────────────────
function SocialLinks({ settings }: { settings: AppSettings }) {
  const socials = [
    { url: settings.instagram_url, emoji: '📸', label: 'Instagram', bg: '#E1306C', light: '#FFF0F5' },
    { url: settings.facebook_url,  emoji: '👥', label: 'Facebook',  bg: '#1877F2', light: '#EBF3FF' },
    { url: settings.youtube_url,   emoji: '▶️', label: 'YouTube',   bg: '#FF0000', light: '#FFF0F0' },
    { url: settings.twitter_url,   emoji: '🐦', label: 'Twitter',   bg: '#1DA1F2', light: '#E8F5FF' },
  ].filter(s => !!s.url)

  if (!socials.length && !settings.support_phone && !settings.support_email) return null

  return (
    <View style={{ paddingHorizontal: 16, marginTop: 8, marginBottom: 16 }}>
      <Text style={[S.secTitle, { marginBottom: 12 }]}>🌐 Connect With Us</Text>
      {socials.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          {socials.map(s => (
            <TouchableOpacity key={s.label}
              style={{ backgroundColor: s.light, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: s.bg + '33' }}
              onPress={() => s.url && Linking.openURL(s.url)}>
              <Text style={{ fontSize: 16 }}>{s.emoji}</Text>
              <Text style={{ fontWeight: '700', color: s.bg, fontSize: 13 }}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {!!settings.support_phone && (
          <TouchableOpacity
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#BBF7D0' }}
            onPress={() => Linking.openURL(`tel:${settings.support_phone}`)}>
            <Text style={{ fontSize: 18 }}>📞</Text>
            <View>
              <Text style={{ fontSize: 10, color: '#6B7280', fontWeight: '600' }}>Call Support</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#065F46' }}>
                {settings.support_phone}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        {!!settings.support_email && (
          <TouchableOpacity
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#BFDBFE' }}
            onPress={() => Linking.openURL(`mailto:${settings.support_email}`)}>
            <Text style={{ fontSize: 18 }}>✉️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: '#6B7280', fontWeight: '600' }}>Email Support</Text>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#1D4ED8' }} numberOfLines={1}>
                {settings.support_email}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

// ─── LocationModal ────────────────────────────────────────────────────────────
type LocSugg = { place_id: string; display_name: string; lat: string; lon: string; address?: any }

function LocationModal({
  visible, current, onClose, onPick,
}: {
  visible: boolean
  current: string
  onClose: () => void
  onPick: (label: string, lat: number, lng: number) => void
}) {
  const [query,      setQuery]      = useState('')
  const [suggs,      setSuggs]      = useState<LocSugg[]>([])
  const [searching,  setSearching]  = useState(false)
  const [detecting,  setDetecting]  = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const handleSearch = (q: string) => {
    setQuery(q)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (q.length < 3) { setSuggs([]); return }
    timerRef.current = setTimeout(async () => {
      const key = process.env.EXPO_PUBLIC_LOCATIONIQ_KEY
      if (!key) return
      setSearching(true)
      abortRef.current?.abort()
      abortRef.current = new AbortController()
      try {
        const res = await fetch(
          `https://us1.locationiq.com/v1/autocomplete?key=${key}&q=${encodeURIComponent(q)}&countrycodes=in&limit=7&format=json`,
          { signal: abortRef.current.signal }
        )
        const data = await res.json()
        setSuggs(Array.isArray(data) ? data : [])
      } catch { setSuggs([]) }
      finally { setSearching(false) }
    }, 500)
  }

  const detectGPS = async () => {
    setDetecting(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') { Alert.alert('Permission denied'); return }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const { latitude, longitude } = pos.coords
      const key = process.env.EXPO_PUBLIC_LOCATIONIQ_KEY
      let label = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
      if (key) {
        try {
          const r = await fetch(`https://us1.locationiq.com/v1/reverse?key=${key}&lat=${latitude}&lon=${longitude}&format=json`)
          const g = await r.json()
          const city = g?.address?.city ?? g?.address?.town ?? g?.address?.village
          if (city) label = `${city}, ${g?.address?.state ?? ''}`
        } catch { /**/ }
      }
      onPick(label, latitude, longitude)
      onClose()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setDetecting(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: COLORS.text }}>Change Location</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 22, color: '#9CA3AF' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Current location */}
          <View style={{ backgroundColor: '#FFF3EE', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, borderWidth: 1.5, borderColor: '#FED7AA' }}>
            <Text style={{ fontSize: 18 }}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '600' }}>Current Location</Text>
              <Text style={{ fontWeight: '800', color: COLORS.primary, fontSize: 14 }} numberOfLines={1}>
                {current}
              </Text>
            </View>
          </View>

          {/* GPS Button */}
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1.5, borderColor: '#BBF7D0' }}
            onPress={detectGPS} disabled={detecting}>
            {detecting
              ? <ActivityIndicator size="small" color={COLORS.primary} />
              : <Text style={{ fontSize: 20 }}>📡</Text>
            }
            <Text style={{ fontWeight: '700', color: '#065F46', fontSize: 14 }}>
              {detecting ? 'Detecting…' : 'Use my current location (GPS)'}
            </Text>
          </TouchableOpacity>

          {/* Search input */}
          <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, marginBottom: 8, backgroundColor: '#FAFAFA' }}>
            <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
            <TextInput
              style={{ flex: 1, paddingVertical: 12, fontSize: 14, color: COLORS.text }}
              placeholder="Search city, area…"
              value={query}
              onChangeText={handleSearch}
              placeholderTextColor="#9CA3AF"
              autoFocus
            />
            {searching && <ActivityIndicator size="small" color={COLORS.primary} />}
            {query.length > 0 && !searching && (
              <TouchableOpacity onPress={() => { setQuery(''); setSuggs([]) }}>
                <Text style={{ color: '#9CA3AF', fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Suggestions */}
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {suggs.map((s, i) => (
              <TouchableOpacity
                key={s.place_id ?? i}
                style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}
                onPress={() => {
                  onPick(s.display_name, Number(s.lat), Number(s.lon))
                  onClose()
                }}>
                <Text style={{ fontSize: 16, marginTop: 1 }}>📍</Text>
                <Text style={{ flex: 1, fontSize: 13, color: COLORS.text, lineHeight: 19 }}>
                  {s.display_name}
                </Text>
              </TouchableOpacity>
            ))}
            {query.length >= 3 && !searching && suggs.length === 0 && (
              <Text style={{ textAlign: 'center', color: '#9CA3AF', paddingVertical: 20 }}>
                No results found
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CustomerDashboard() {
  const { user }  = useAuth()
  const { cart }  = useCart()
  const router    = useRouter()
  const nav = (p: string) => router.push(p as any)

  const [appSettings,   setAppSettings]   = useState<AppSettings | null>(null)
  const [locationText,  setLocationText]  = useState('Detecting…')
  const [coords,        setCoords]        = useState<{ lat: number; lng: number } | null>(null)
  const [showLocModal,  setShowLocModal]  = useState(false)
  const [restaurants,   setRestaurants]   = useState<Merchant[]>([])
  const [loadingR,      setLoadingR]      = useState(true)
  const [activeOrders,  setActiveOrders]  = useState<ActiveOrder[]>([])
  const [trending,      setTrending]      = useState<TrendingDish[]>([])
  const [globalDeals,   setGlobalDeals]   = useState<GlobalDeal[]>([])
  const [search,        setSearch]        = useState('')
  const [menuResults,   setMenuResults]   = useState<MenuResult[]>([])
  const [searchingMenu, setSearchingMenu] = useState(false)
  const [refreshing,    setRefreshing]    = useState(false)
  const [showPopup,     setShowPopup]     = useState(false)
  const [dismissed,     setDismissed]     = useState(false)
  const [unreadCount,   setUnreadCount]   = useState(0)
  const [activeTab,     setActiveTab]     = useState<'all' | 'open' | 'featured'>('all')
  const [cuisineFilter, setCuisineFilter] = useState<string | null>(null)

  const cartCount = cart?.items?.reduce((s, i) => s + i.quantity, 0) ?? 0
  const firstName = (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0]
    ?? user?.email?.split('@')[0] ?? 'there'

  const announcement = useMemo(() => {
    const a = (appSettings as any)?.announcement
    return a && isAnnouncementActive(a) ? a : null
  }, [appSettings])

  // All cuisine types across restaurants (for filter chips)
  const allCuisines = useMemo(() => {
    const set = new Set<string>()
    restaurants.forEach(r => (r.cuisine_types ?? []).forEach(c => set.add(c)))
    return [...set].slice(0, 10)
  }, [restaurants])

  // ── App Settings ──────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.from('app_settings')
      .select('app_name,app_logo_url,announcement,show_menu_images,delivery_fee,customer_search_radius_km,facebook_url,instagram_url,youtube_url,twitter_url,custom_links,support_phone,support_email')
      .limit(1).maybeSingle()
      .then(({ data }) => { if (data) setAppSettings(data as AppSettings) })
  }, [])

  // ── Unread notifications ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    supabase.from('notifications').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('is_read', false)
      .then(({ count }) => setUnreadCount(count ?? 0))
  }, [user])

  // ── Announcement popup ────────────────────────────────────────────────────
  useEffect(() => {
    if (announcement && !dismissed) {
      const t = setTimeout(() => setShowPopup(true), 1500)
      return () => clearTimeout(t)
    }
  }, [announcement, dismissed])

  // ── Location (GPS auto-detect) ────────────────────────────────────────────
  const detectLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      const fallback = { lat: 31.2797, lng: 74.8597 }
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
        const r = await fetch(`https://us1.locationiq.com/v1/reverse?key=${key}&lat=${latitude}&lon=${longitude}&format=json`)
        const g = await r.json()
        const city = g?.address?.city ?? g?.address?.town ?? g?.address?.village
        setLocationText(city ? `${city}, ${g?.address?.state ?? ''}` : 'Location detected')
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

  // ── Load Restaurants ───────────────────────────────────────────────────────
  const loadRestaurants = useCallback(async () => {
    setLoadingR(true)
    try {
      const { data: raw } = await supabase.from('merchants')
        .select('id,business_name,logo_url,banner_url,average_rating,total_reviews,estimated_prep_time,min_order_amount,latitude,longitude,opening_time,closing_time,is_featured,city,cuisine_types')
        .eq('is_active', true).limit(80)

      const list: Merchant[] = (raw ?? []).map((m: any) => ({
        ...m,
        cuisine_types: Array.isArray(m.cuisine_types) ? m.cuisine_types : [],
        distance_km: coords && m.latitude && m.longitude
          ? haversine(coords.lat, coords.lng, +m.latitude, +m.longitude) : 999,
        is_open: merchantIsOpen(m as Merchant),
      })).sort((a: Merchant, b: Merchant) => {
        // Open first, then featured, then distance
        if (a.is_open && !b.is_open) return -1
        if (!a.is_open && b.is_open) return 1
        if (a.is_featured && !b.is_featured) return -1
        if (!a.is_featured && b.is_featured) return 1
        return (a.distance_km ?? 999) - (b.distance_km ?? 999)
      })

      // Best promo per merchant
      const mIds = list.map(m => m.id)
      if (mIds.length) {
        const { data: promos } = await supabase.from('promo_codes')
          .select('merchant_id,code,discount_type,discount_value,deal_type,deal_json,valid_from,valid_until')
          .eq('is_active', true).eq('scope', 'merchant').in('merchant_id', mIds)
        const offerMap = new Map<string, string>()
        const now = new Date()
        for (const p of (promos ?? []) as any[]) {
          if (p.valid_from  && new Date(p.valid_from)  > now) continue
          if (p.valid_until && new Date(p.valid_until) < now) continue
          if (!offerMap.has(p.merchant_id)) {
            const label = p.deal_type === 'bxgy'
              ? `Buy ${p.deal_json?.buy?.qty ?? 1} Get ${p.deal_json?.get?.qty ?? 1} FREE`
              : p.discount_type === 'percentage'
                ? `${p.discount_value}% OFF`
                : `₹${p.discount_value} OFF`
            offerMap.set(p.merchant_id, label)
          }
        }
        list.forEach(m => { m.offer_label = offerMap.get(m.id) ?? null })
      }
      setRestaurants(list)
    } catch (e: any) { console.warn('loadRestaurants', e.message) }
    finally { setLoadingR(false) }
  }, [coords])

  // ── Active Orders ──────────────────────────────────────────────────────────
  const loadActiveOrders = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('orders')
      .select('id,order_number,status,total_amount,merchant_id')
      .eq('customer_id', user.id).in('status', ACTIVE_STATUSES)
      .order('created_at', { ascending: false }).limit(3)
    if (!data?.length) { setActiveOrders([]); return }
    const mIds = [...new Set(data.map((o: any) => o.merchant_id))]
    const { data: merch } = await supabase.from('merchants').select('id,business_name').in('id', mIds)
    const map = new Map((merch ?? []).map((m: any) => [m.id, m.business_name]))
    setActiveOrders(data.map((o: any) => ({ ...o, merchant_name: map.get(o.merchant_id) })) as ActiveOrder[])
  }, [user])

  // ── Trending Dishes ────────────────────────────────────────────────────────
  const loadTrending = useCallback(async () => {
    try {
      const since = new Date(Date.now() - 7 * 86400000).toISOString()
      const { data: orders } = await supabase.from('orders')
        .select('items,merchant_id').gte('created_at', since).eq('status', 'delivered').limit(300)
      if (!orders?.length) return
      const counts = new Map<string, any>()
      for (const o of orders as any[]) {
        for (const item of o.items ?? []) {
          const key = item.menu_item_id || item.id
          if (!key) continue
          const ex = counts.get(key)
          if (ex) { ex.count += item.quantity ?? 1 }
          else counts.set(key, { ...item, count: item.quantity ?? 1, merchant_id: o.merchant_id })
        }
      }
      const top = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 8)
      if (!top.length) return
      const mIds = [...new Set(top.map(d => d.merchant_id))]
      const { data: merch } = await supabase.from('merchants').select('id,business_name').in('id', mIds)
      const mMap = new Map((merch ?? []).map((m: any) => [m.id, m.business_name]))
      setTrending(top.map(d => ({
        id: d.menu_item_id || d.id,
        name: d.name, price: d.price,
        discount_percentage: d.discount_percentage ?? null,
        image_url: d.image_url ?? null,
        merchant_id: d.merchant_id,
        merchant_name: mMap.get(d.merchant_id) ?? 'Restaurant',
        count: d.count,
      })) as TrendingDish[])
    } catch (e: any) { console.warn('loadTrending', e.message) }
  }, [])

  // ── Global Deals ───────────────────────────────────────────────────────────
  const loadGlobalDeals = useCallback(async () => {
    const now = new Date().toISOString()
    const { data } = await supabase.from('promo_codes')
      .select('id,code,description,discount_type,discount_value,min_order_amount,valid_until,deal_type,deal_json')
      .eq('is_active', true).eq('scope', 'global')
      .or(`valid_until.is.null,valid_until.gte.${now}`)
      .limit(6)
    setGlobalDeals((data ?? []) as GlobalDeal[])
  }, [])

  // ── Menu Search ────────────────────────────────────────────────────────────
  const searchMenuItems = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setMenuResults([]); return }
    setSearchingMenu(true)
    try {
      const { data } = await supabase.from('menu_items')
        .select('id,name,price,discount_percentage,image_url,merchant_id,category')
        .ilike('name', `%${q}%`).eq('is_available', true).limit(20)
      if (!data?.length) { setMenuResults([]); return }
      const mIds = [...new Set(data.map((i: any) => i.merchant_id))]
      const { data: merch } = await supabase.from('merchants').select('id,business_name').in('id', mIds)
      const mMap = new Map((merch ?? []).map((m: any) => [m.id, m.business_name]))
      setMenuResults(data.map((i: any) => ({ ...i, merchant_name: mMap.get(i.merchant_id) })) as MenuResult[])
    } catch { setMenuResults([]) }
    finally { setSearchingMenu(false) }
  }, [])

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => { detectLocation() }, [detectLocation])
  useEffect(() => { if (coords) loadRestaurants() }, [coords, loadRestaurants])
  useEffect(() => { loadActiveOrders(); loadTrending(); loadGlobalDeals() }, [loadActiveOrders, loadTrending, loadGlobalDeals])
  useEffect(() => {
    const t = setTimeout(() => searchMenuItems(search), 350)
    return () => clearTimeout(t)
  }, [search, searchMenuItems])

  // Real-time order updates
  useEffect(() => {
    if (!user) return
    const sub = supabase.channel('dash-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `customer_id=eq.${user.id}` },
        () => loadActiveOrders())
      .subscribe()
    return () => { sub.unsubscribe() }
  }, [user, loadActiveOrders])

  const onRefresh = async () => {
    setRefreshing(true)
    await Promise.all([loadRestaurants(), loadActiveOrders(), loadTrending(), loadGlobalDeals()])
    setRefreshing(false)
  }

  // ── Filtered restaurants ───────────────────────────────────────────────────
  const displayRestaurants = useMemo(() => {
    let r = restaurants
    if (search.trim() && !menuResults.length)
      r = r.filter(m => m.business_name.toLowerCase().includes(search.toLowerCase()))
    if (activeTab === 'open')     r = r.filter(m => m.is_open)
    if (activeTab === 'featured') r = r.filter(m => m.is_featured)
    if (cuisineFilter)
      r = r.filter(m => m.cuisine_types?.some(c => c.toLowerCase() === cuisineFilter.toLowerCase()))
    return r
  }, [restaurants, search, activeTab, menuResults, cuisineFilter])

  // ── Handle tap on closed restaurant ───────────────────────────────────────
  const handleRestaurantPress = (r: Merchant) => {
    if (!r.is_open) {
      const openLabel = openTimeLabel(r)
      Alert.alert(
        '🔒 Restaurant Closed',
        `${r.business_name} is currently closed.${openLabel ? `\n\n${openLabel}` : ''}`,
        [{ text: 'OK' }]
      )
      return
    }
    nav(`/(customer)/restaurant/${r.id}`)
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <View style={S.header}>
        {/* Top row: logo + greeting + icons */}
        <View style={S.headerTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
            {(appSettings as any)?.app_logo_url ? (
              <Image source={{ uri: (appSettings as any).app_logo_url }} style={S.logo} />
            ) : (
              <View style={S.logoPh}><Text style={{ fontSize: 20 }}>🍔</Text></View>
            )}
            <Text style={S.greeting} numberOfLines={1}>
              Hey {firstName} 👋
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={S.iconBtn} onPress={() => nav('/(customer)/notifications')}>
              <Text style={{ fontSize: 22 }}>🔔</Text>
              {unreadCount > 0 && (
                <View style={S.badge}>
                  <Text style={S.badgeTxt}>{unreadCount > 9 ? '9+' : `${unreadCount}`}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={S.iconBtn} onPress={() => nav('/(customer)/cart')}>
              <Text style={{ fontSize: 22 }}>🛒</Text>
              {cartCount > 0 && (
                <View style={S.badge}>
                  <Text style={S.badgeTxt}>{`${cartCount}`}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Location bar — always visible, always tappable */}
        <TouchableOpacity style={S.locationBar} onPress={() => setShowLocModal(true)} activeOpacity={0.85}>
          <Text style={{ fontSize: 16 }}>📍</Text>
          <View style={{ flex: 1, marginHorizontal: 8 }}>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '600', letterSpacing: 0.5 }}>
              DELIVER TO
            </Text>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }} numberOfLines={1}>
              {locationText}
            </Text>
          </View>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Change ▾</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ── SEARCH ───────────────────────────────────────────────────── */}
        <View style={S.searchRow}>
          <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
          <TextInput
            style={S.searchInput}
            placeholder="Search restaurants or dishes…"
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#9CA3AF"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); setMenuResults([]) }}>
              <Text style={{ color: '#9CA3AF', fontSize: 18, paddingHorizontal: 4 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── MENU SEARCH RESULTS ──────────────────────────────────────── */}
        {search.trim().length >= 2 && (
          <View style={{ marginHorizontal: 12, marginBottom: 12 }}>
            {searchingMenu ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 12 }} />
            ) : menuResults.length > 0 ? (
              <>
                <Text style={[S.secTitle, { marginBottom: 8, paddingHorizontal: 4 }]}>🍽️ Menu Results</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {menuResults.map(item => {
                    const disc = item.discount_percentage
                      ? item.price * (1 - item.discount_percentage / 100) : item.price
                    return (
                      <TouchableOpacity key={item.id} style={S.menuCard}
                        onPress={() => nav(`/(customer)/restaurant/${item.merchant_id}`)}>
                        <View style={{ width: 64, height: 64, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                          {item.image_url
                            ? <Image source={{ uri: item.image_url }} style={{ width: 64, height: 64, borderRadius: 10 }} />
                            : <Text style={{ fontSize: 28 }}>🍽️</Text>
                          }
                        </View>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.text }} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={{ fontSize: 11, color: COLORS.primary, fontWeight: '800', marginTop: 2 }}>
                          {`₹${disc.toFixed(0)}`}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#6B7280' }} numberOfLines={1}>
                          {item.merchant_name}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </ScrollView>
              </>
            ) : (
              <Text style={{ color: '#9CA3AF', textAlign: 'center', padding: 12, fontSize: 13 }}>
                {`No menu items found for "${search}"`}
              </Text>
            )}
          </View>
        )}

        {/* ── ANNOUNCEMENT BANNER ──────────────────────────────────────── */}
        {!!announcement && !dismissed && (
          <TouchableOpacity
            style={S.announceBanner}
            onPress={() => announcement.link_url && Linking.openURL(announcement.link_url)}>
            <Text style={{ fontSize: 16, marginRight: 8 }}>📢</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800', color: '#92400E', fontSize: 13 }}>
                {announcement.title}
              </Text>
              <Text style={{ color: '#92400E', fontSize: 12, marginTop: 2 }} numberOfLines={2}>
                {announcement.message}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setDismissed(true)} style={{ padding: 4 }}>
              <Text style={{ color: '#92400E', fontSize: 16, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* ── QUICK ACTIONS ────────────────────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingVertical: 14 }}>
          {[
            { emoji: '📦', label: 'My Orders',  route: '/(customer)/orders'      },
            { emoji: '📍', label: 'Addresses',  route: '/(customer)/addresses'   },
            { emoji: '🏷️', label: 'Offers',     route: '/(customer)/offers'      },
            { emoji: '✨', label: 'Custom',     route: '/(customer)/custom-order'},
            { emoji: '📋', label: 'Reorder',    route: '/(customer)/orders'      },
            { emoji: '👤', label: 'Profile',    route: '/(customer)/profile'     },
          ].map(q => (
            <TouchableOpacity key={q.label} style={S.quickAction} onPress={() => nav(q.route)}>
              <View style={S.quickIcon}><Text style={{ fontSize: 22 }}>{q.emoji}</Text></View>
              <Text style={S.quickLabel}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── CATEGORIES ───────────────────────────────────────────────── */}
        <ShopByCategory onNav={nav} />

        {/* ── GLOBAL DEALS ─────────────────────────────────────────────── */}
        {globalDeals.length > 0 && (
          <View style={{ marginTop: 8, marginBottom: 16 }}>
            <View style={[S.sectionHeader, { paddingHorizontal: 16, marginBottom: 12 }]}>
              <Text style={S.secTitle}>🏷️ Today&apos;s Deals</Text>
              <TouchableOpacity onPress={() => nav('/(customer)/offers')}>
                <Text style={S.seeAll}>All Offers →</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
              {globalDeals.map(deal => {
                const isBxgy = deal.deal_type === 'bxgy'
                const label = isBxgy
                  ? `Buy ${deal.deal_json?.buy?.qty ?? 1} Get ${deal.deal_json?.get?.qty ?? 1} FREE`
                  : deal.discount_type === 'percentage'
                    ? `${deal.discount_value}% OFF`
                    : `₹${deal.discount_value} OFF`
                const bgColor = isBxgy ? '#7C3AED' : COLORS.primary
                return (
                  <TouchableOpacity key={deal.id} style={[S.dealCard, { backgroundColor: bgColor }]}
                    onPress={() => nav('/(customer)/offers')}>
                    <Text style={{ fontSize: 20, marginBottom: 4 }}>{isBxgy ? '🎁' : '🏷️'}</Text>
                    <Text style={S.dealLabel}>{label}</Text>
                    <Text style={S.dealCode}>{deal.code}</Text>
                    {!!deal.min_order_amount && (
                      <Text style={S.dealMin}>{`Min ₹${deal.min_order_amount}`}</Text>
                    )}
                    {!!deal.valid_until && (
                      <Text style={S.dealExp}>
                        {`Ends ${new Date(deal.valid_until).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`}
                      </Text>
                    )}
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        )}

        {/* ── ACTIVE ORDERS ────────────────────────────────────────────── */}
        {activeOrders.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <View style={[S.sectionHeader, { marginBottom: 10 }]}>
              <Text style={S.secTitle}>🚀 Active Orders</Text>
              <TouchableOpacity onPress={() => nav('/(customer)/orders')}>
                <Text style={S.seeAll}>See All →</Text>
              </TouchableOpacity>
            </View>
            {activeOrders.map(o => (
              <TouchableOpacity key={o.id} style={S.activeCard}
                onPress={() => nav(`/(customer)/orders/${o.id}`)}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '800', fontSize: 14, color: COLORS.text }}>
                    {o.merchant_name ?? 'Restaurant'}
                  </Text>
                  <Text style={{ color: COLORS.primary, fontWeight: '700', marginTop: 2, fontSize: 13 }}>
                    {`₹${Number(o.total_amount).toFixed(2)}`}
                  </Text>
                  <Text style={{ color: '#9CA3AF', fontSize: 11, marginTop: 2 }}>
                    {`#${o.order_number}`}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <View style={[S.statusPill, { backgroundColor: STATUS_COLORS[o.status] ?? '#888' }]}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
                      {o.status.replace(/_/g, ' ').toUpperCase()}
                    </Text>
                  </View>
                  <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '700' }}>
                    Track →
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── TRENDING ─────────────────────────────────────────────────── */}
        {trending.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <View style={[S.sectionHeader, { paddingHorizontal: 16, marginBottom: 12 }]}>
              <Text style={S.secTitle}>🔥 Trending Now</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
              {trending.map(item => {
                const disc = item.discount_percentage
                  ? item.price * (1 - item.discount_percentage / 100) : item.price
                return (
                  <TouchableOpacity key={item.id} style={S.trendCard}
                    onPress={() => nav(`/(customer)/restaurant/${item.merchant_id}`)}>
                    <View style={S.trendImgBox}>
                      {item.image_url
                        ? <Image source={{ uri: item.image_url }} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
                        : <Text style={{ fontSize: 32 }}>🍽️</Text>
                      }
                      {!!item.discount_percentage && (
                        <View style={S.trendDisc}>
                          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>
                            {`${item.discount_percentage}% OFF`}
                          </Text>
                        </View>
                      )}
                      <View style={S.trendFireBadge}>
                        <Text style={{ fontSize: 8, fontWeight: '800', color: '#F97316' }}>
                          {`🔥 ${item.count}x`}
                        </Text>
                      </View>
                    </View>
                    <Text style={S.trendName} numberOfLines={1}>{item.name}</Text>
                    <Text style={S.trendMerch} numberOfLines={1}>{item.merchant_name}</Text>
                    <Text style={S.trendPrice}>{`₹${disc.toFixed(0)}`}</Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        )}

        {/* ── RESTAURANTS ──────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <View style={[S.sectionHeader, { marginBottom: 10 }]}>
            <Text style={S.secTitle}>
              {`🍽️ Restaurants${displayRestaurants.length > 0 ? ` (${displayRestaurants.length})` : ''}`}
            </Text>
          </View>

          {/* Status filter chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, marginBottom: 10 }}>
            {(['all', 'open', 'featured'] as const).map(t => (
              <TouchableOpacity key={t}
                style={[S.filterChip, activeTab === t && S.filterChipActive]}
                onPress={() => setActiveTab(t)}>
                <Text style={[S.filterChipTxt, activeTab === t && { color: '#fff' }]}>
                  {t === 'all' ? 'All' : t === 'open' ? '🟢 Open Now' : '⭐ Featured'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Cuisine type filter */}
          {allCuisines.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
              <TouchableOpacity
                style={[S.filterChip, !cuisineFilter && { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }]}
                onPress={() => setCuisineFilter(null)}>
                <Text style={[S.filterChipTxt, !cuisineFilter && { color: '#6B7280' }]}>
                  All Cuisines
                </Text>
              </TouchableOpacity>
              {allCuisines.map(c => (
                <TouchableOpacity key={c}
                  style={[S.filterChip, cuisineFilter === c && S.filterChipActive]}
                  onPress={() => setCuisineFilter(cuisineFilter === c ? null : c)}>
                  <Text style={[S.filterChipTxt, cuisineFilter === c && { color: '#fff' }]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Restaurant list */}
        <View style={{ paddingHorizontal: 16 }}>
          {loadingR ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 40 }} />
          ) : displayRestaurants.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Text style={{ fontSize: 52, marginBottom: 12 }}>🍽️</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text }}>
                No restaurants found
              </Text>
              {cuisineFilter && (
                <TouchableOpacity onPress={() => setCuisineFilter(null)} style={{ marginTop: 12 }}>
                  <Text style={{ color: COLORS.primary, fontWeight: '700' }}>
                    Clear cuisine filter
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            displayRestaurants.map(r => (
              <TouchableOpacity
                key={r.id}
                style={[S.restCard, !r.is_open && S.restCardClosed]}
                onPress={() => handleRestaurantPress(r)}
                activeOpacity={r.is_open ? 0.8 : 0.6}
              >
                {/* Logo */}
                <View style={S.restLogo}>
                  {r.logo_url
                    ? <Image source={{ uri: r.logo_url }} style={{ width: 68, height: 68, borderRadius: 12 }} resizeMode="cover" />
                    : <Text style={{ fontSize: 28 }}>🍴</Text>
                  }
                  {r.is_featured && r.is_open && (
                    <View style={S.featuredBadge}>
                      <Text style={{ color: '#fff', fontSize: 8, fontWeight: '900' }}>⭐TOP</Text>
                    </View>
                  )}
                  {!r.is_open && (
                    <View style={S.closedOverlay}>
                      <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>CLOSED</Text>
                    </View>
                  )}
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <Text style={[S.restName, !r.is_open && { color: '#9CA3AF' }]} numberOfLines={1}>
                    {r.business_name}
                  </Text>
                  {r.cuisine_types?.length > 0 && (
                    <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }} numberOfLines={1}>
                      {r.cuisine_types.join(' · ')}
                    </Text>
                  )}
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 5, flexWrap: 'wrap' }}>
                    {(r.average_rating ?? 0) > 0 && (
                      <Text style={S.star}>
                        {`⭐ ${Number(r.average_rating).toFixed(1)} (${r.total_reviews ?? 0})`}
                      </Text>
                    )}
                    {!!r.estimated_prep_time && (
                      <Text style={S.metaText}>{`🕐 ${r.estimated_prep_time} min`}</Text>
                    )}
                    {r.distance_km !== undefined && r.distance_km < 999 && (
                      <Text style={S.metaText}>{`📍 ${r.distance_km.toFixed(1)} km`}</Text>
                    )}
                  </View>

                  {/* Open/close status */}
                  {!r.is_open ? (
                    <Text style={{ fontSize: 11, color: '#EF4444', fontWeight: '700', marginTop: 3 }}>
                      {openTimeLabel(r) || 'Currently closed'}
                    </Text>
                  ) : (
                    !!r.min_order_amount && (
                      <Text style={S.minOrder}>{`Min ₹${r.min_order_amount}`}</Text>
                    )
                  )}

                  {!!r.offer_label && r.is_open && (
                    <View style={S.offerTag}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                        {`🏷️ ${r.offer_label}`}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 20, color: r.is_open ? '#9CA3AF' : '#D1D5DB' }}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* ── SOCIAL LINKS (above bottom nav padding) ──────────────────── */}
        {!!appSettings && <SocialLinks settings={appSettings} />}
        <View style={{ height: 16 }} />
      </ScrollView>

      {/* ── BOTTOM NAV ───────────────────────────────────────────────────── */}
      <View style={S.bottomNav}>
        {[
          { icon: '🏠', label: 'Home',    route: '/(customer)/dashboard', active: true },
          { icon: '📦', label: 'Orders',  route: '/(customer)/orders' },
          { icon: '🛒', label: 'Cart',    route: '/(customer)/cart',   badge: cartCount },
          { icon: '🏷️', label: 'Offers',  route: '/(customer)/offers' },
          { icon: '👤', label: 'Profile', route: '/(customer)/profile' },
        ].map(n => (
          <TouchableOpacity key={n.label} style={S.navItem} onPress={() => nav(n.route)}>
            <View style={{ position: 'relative' }}>
              <Text style={{ fontSize: 22 }}>{n.icon}</Text>
              {!!n.badge && n.badge > 0 && (
                <View style={S.navBadge}>
                  <Text style={S.navBadgeTxt}>{`${n.badge}`}</Text>
                </View>
              )}
            </View>
            <Text style={[S.navLabel, n.active && { color: COLORS.primary }]}>{n.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── LOCATION CHANGE MODAL ──────────────────────────────────────── */}
      <LocationModal
        visible={showLocModal}
        current={locationText}
        onClose={() => setShowLocModal(false)}
        onPick={handleLocationPick}
      />

      {/* ── ANNOUNCEMENT POPUP ───────────────────────────────────────────── */}
      {showPopup && !!announcement && (
        <Modal visible transparent animationType="fade">
          <View style={S.popupOverlay}>
            <View style={S.popup}>
              {!!announcement.image_url && (
                <Image source={{ uri: announcement.image_url }}
                  style={{ width: '100%', height: 160, borderRadius: 12, marginBottom: 12 }}
                  resizeMode="cover" />
              )}
              <Text style={{ fontWeight: '900', fontSize: 18, color: COLORS.text, marginBottom: 6, textAlign: 'center' }}>
                {announcement.title}
              </Text>
              <Text style={{ fontSize: 14, color: '#4B5563', textAlign: 'center', lineHeight: 22 }}>
                {announcement.message}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                {!!announcement.link_url && (
                  <TouchableOpacity style={[S.popupBtn, { backgroundColor: COLORS.primary, flex: 1 }]}
                    onPress={() => { Linking.openURL(announcement.link_url); setShowPopup(false); setDismissed(true) }}>
                    <Text style={{ color: '#fff', fontWeight: '800' }}>View More</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[S.popupBtn, { backgroundColor: '#F3F4F6', flex: 1 }]}
                  onPress={() => { setShowPopup(false); setDismissed(true) }}>
                  <Text style={{ color: '#374151', fontWeight: '700' }}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  header:       { backgroundColor: COLORS.primary, paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16 },
  headerTop:    { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  logo:         { width: 38, height: 38, borderRadius: 10 },
  logoPh:       { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  greeting:     { color: '#fff', fontSize: 17, fontWeight: '800', flex: 1 },
  locationBar:  { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  iconBtn:      { padding: 8, position: 'relative' },
  badge:        { position: 'absolute', top: 2, right: 2, backgroundColor: '#EF4444', width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  badgeTxt:     { color: '#fff', fontSize: 9, fontWeight: '800' },
  searchRow:    { flexDirection: 'row', alignItems: 'center', margin: 12, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  searchInput:  { flex: 1, paddingVertical: 14, fontSize: 15, color: COLORS.text },
  menuCard:     { backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center', width: 110, elevation: 1 },
  announceBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', padding: 12, margin: 12, borderRadius: 14, borderWidth: 1, borderColor: '#FCD34D' },
  quickAction:  { alignItems: 'center', gap: 5 },
  quickIcon:    { width: 58, height: 58, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  quickLabel:   { fontSize: 10, color: '#6B7280', fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  secTitle:     { fontSize: 17, fontWeight: '900', color: COLORS.text },
  seeAll:       { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  dealCard:     { borderRadius: 16, padding: 14, width: 140, alignItems: 'center' },
  dealLabel:    { fontSize: 17, fontWeight: '900', color: '#fff', textAlign: 'center' },
  dealCode:     { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '700', marginTop: 5, letterSpacing: 1.5, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  dealMin:      { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  dealExp:      { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  activeCard:   { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  statusPill:   { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  trendCard:    { width: 135, backgroundColor: '#fff', borderRadius: 16, padding: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  trendImgBox:  { width: '100%', height: 100, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden', position: 'relative' },
  trendDisc:    { position: 'absolute', top: 6, right: 6, backgroundColor: '#EF4444', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  trendFireBadge: { position: 'absolute', bottom: 6, left: 6, backgroundColor: '#FFF3EE', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  trendName:    { fontSize: 12, fontWeight: '700', color: COLORS.text },
  trendMerch:   { fontSize: 10, color: '#6B7280', marginTop: 2 },
  trendPrice:   { fontSize: 14, fontWeight: '800', color: COLORS.primary, marginTop: 4 },
  filterChip:   { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E7EB' },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipTxt: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  restCard:     { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  restCardClosed: { opacity: 0.6 },
  restLogo:     { width: 68, height: 68, borderRadius: 12, backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', flexShrink: 0 },
  featuredBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#F59E0B', borderRadius: 5, paddingHorizontal: 4, paddingVertical: 2 },
  closedOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 3, alignItems: 'center', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  restName:     { fontSize: 15, fontWeight: '800', color: COLORS.text },
  star:         { fontSize: 12, color: '#F59E0B', fontWeight: '600' },
  metaText:     { fontSize: 12, color: '#6B7280' },
  minOrder:     { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  offerTag:     { backgroundColor: COLORS.primary, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, marginTop: 5, alignSelf: 'flex-start' },
  bottomNav:    { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingBottom: Platform.OS === 'ios' ? 28 : 12, paddingTop: 10, elevation: 20, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: -2 } },
  navItem:      { flex: 1, alignItems: 'center' },
  navLabel:     { fontSize: 10, color: '#9CA3AF', marginTop: 3, fontWeight: '600' },
  navBadge:     { position: 'absolute', top: -3, right: -6, backgroundColor: COLORS.primary, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  navBadgeTxt:  { color: '#fff', fontSize: 9, fontWeight: '800' },
  popupOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  popup:        { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', elevation: 20 },
  popupBtn:     { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 12 },
})
