import { useCallback, useEffect, useMemo, useState } from 'react'
import * as Location from 'expo-location'
import { supabase } from '../lib/supabase'
import type {
  AppSettings, Merchant, ActiveOrder, TrendingDish,
  GlobalDeal, MenuResult, Coords,
} from '../types/dashboard'
import { ACTIVE_STATUSES } from '../types/dashboard'

// ─── Helpers (exported so components can use them) ───────────────────────────
export function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const a =
    Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(toRad(lon2 - lon1) / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function merchantIsOpen(m: Merchant): boolean {
  if (!m.openingtime || !m.closingtime) return true
  const now   = new Date()
  const cur   = now.getHours() * 60 + now.getMinutes()
  const [oh, om] = m.openingtime.split(':').map(Number)
  const [ch, cm] = m.closingtime.split(':').map(Number)
  let close   = ch * 60 + cm
  const open  = oh * 60 + om
  if (close <= open) close += 1440
  return cur >= open && cur <= close
}

export function openTimeLabel(m: Merchant): string {
  if (!m.openingtime) return ''
  const [h, min] = m.openingtime.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hh   = h % 12 || 12
  return `Opens at ${hh}:${String(min).padStart(2, '0')} ${ampm}`
}

export function isAnnouncementActive(a: any): boolean {
  if (!a?.enabled) return false
  const now = Date.now()
  const s   = a.startat ? new Date(a.startat).getTime() : NaN
  const e   = a.endat   ? new Date(a.endat).getTime()   : NaN
  if (Number.isFinite(s) && now < s) return false
  if (Number.isFinite(e) && now > e) return false
  return !!(String(a.title ?? '').trim() || String(a.message ?? '').trim())
}

// ─── Main hook ───────────────────────────────────────────────────────────────
export function useDashboardData(userId: string | undefined) {
  const [appSettings,   setAppSettings]   = useState<AppSettings | null>(null)
  const [locationText,  setLocationText]  = useState('Detecting...')
  const [coords,        setCoords]        = useState<Coords | null>(null)
  const [restaurants,   setRestaurants]   = useState<Merchant[]>([])
  const [loadingR,      setLoadingR]      = useState(true)
  const [activeOrders,  setActiveOrders]  = useState<ActiveOrder[]>([])
  const [trending,      setTrending]      = useState<TrendingDish[]>([])
  const [globalDeals,   setGlobalDeals]   = useState<GlobalDeal[]>([])
  const [menuResults,   setMenuResults]   = useState<MenuResult[]>([])
  const [searchingMenu, setSearchingMenu] = useState(false)
  const [refreshing,    setRefreshing]    = useState(false)
  const [unreadCount,   setUnreadCount]   = useState(0)

  // App Settings ───────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from('appsettings')
      .select('appname,applogourl,announcement,showmenuimages,deliveryfee,' +
              'customersearchradiuskm,facebookurl,instagramurl,youtubeurl,' +
              'twitterurl,customlinks,supportphone,supportemail')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { if (data) setAppSettings(data as unknown as AppSettings) })
  }, [])

  // Unread notifications ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('userid', userId)
      .eq('isread', false)
      .then(({ count }) => setUnreadCount(count ?? 0))
  }, [userId])

  // Location ───────────────────────────────────────────────────────────────────
  const detectLocation = useCallback(async () => {
    const fallback: Coords = { lat: 31.2797, lng: 74.8597 }
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setLocationText('Patti, Punjab')
        setCoords(fallback)
        return
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
      const { latitude, longitude } = pos.coords
      setCoords({ lat: latitude, lng: longitude })

      const key = process.env.EXPO_PUBLIC_LOCATIONIQ_KEY
      if (key) {
        try {
          const r = await fetch(
            `https://us1.locationiq.com/v1/reverse?key=${key}&lat=${latitude}&lon=${longitude}&format=json`
          )
          const g = await r.json()
          const city =
            g?.address?.city ?? g?.address?.town ?? g?.address?.village
          setLocationText(city ? `${city}, ${g?.address?.state ?? ''}` : 'Location detected')
        } catch {
          setLocationText('Location detected')
        }
      } else {
        setLocationText('Location detected')
      }
    } catch {
      setLocationText('Patti, Punjab')
      setCoords(fallback)
    }
  }, [])

  const handleLocationPick = useCallback(
    (label: string, lat: number, lng: number) => {
      setLocationText(label)
      setCoords({ lat, lng })
    },
    []
  )

  // Restaurants ────────────────────────────────────────────────────────────────
  const loadRestaurants = useCallback(async () => {
    setLoadingR(true)
    try {
      const { data: raw } = await supabase
        .from('merchants')
        .select(
          'id,businessname,logourl,bannerurl,averagerating,totalreviews,' +
          'estimatedpreptime,minorderamount,latitude,longitude,' +
          'openingtime,closingtime,isfeatured,city,cuisinetypes'
        )
        .eq('isactive', true)
        .limit(80)

      const list: Merchant[] = (raw ?? []).map((m: any) => ({
        ...m,
        cuisinetypes: Array.isArray(m.cuisinetypes) ? m.cuisinetypes : [],
        distancekm:
          coords && m.latitude && m.longitude
            ? haversine(coords.lat, coords.lng, m.latitude, m.longitude)
            : 999,
        isopen: merchantIsOpen(m as Merchant),
      })).sort((a, b) => {
        if (a.isopen && !b.isopen) return -1
        if (!a.isopen && b.isopen) return 1
        if (a.isfeatured && !b.isfeatured) return -1
        if (!a.isfeatured && b.isfeatured) return 1
        return (a.distancekm ?? 999) - (b.distancekm ?? 999)
      })

      // Best promo label per merchant
      const mIds = list.map(m => m.id)
      if (mIds.length) {
        const { data: promos } = await supabase
          .from('promocodes')
          .select('merchantid,code,discounttype,discountvalue,dealtype,dealjson,validfrom,validuntil')
          .eq('isactive', true)
          .eq('scope', 'merchant')
          .in('merchantid', mIds)

        const offerMap = new Map<string, string>()
        const now = new Date()
        for (const p of (promos ?? []) as any[]) {
          if (p.validfrom && new Date(p.validfrom) > now) continue
          if (p.validuntil && new Date(p.validuntil) < now) continue
          if (!offerMap.has(p.merchantid)) {
            const label =
              p.dealtype === 'bxgy'
                ? `Buy ${p.dealjson?.buy?.qty ?? 1} Get ${p.dealjson?.get?.qty ?? 1} FREE`
                : p.discounttype === 'percentage'
                ? `${p.discountvalue}% OFF`
                : `₹${p.discountvalue} OFF`
            offerMap.set(p.merchantid, label)
          }
        }
        list.forEach(m => { m.offerlabel = offerMap.get(m.id) ?? null })
      }
      setRestaurants(list)
    } catch (e: any) {
      console.warn('loadRestaurants', e.message)
    } finally {
      setLoadingR(false)
    }
  }, [coords])

  // Active orders ──────────────────────────────────────────────────────────────
  const loadActiveOrders = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('orders')
      .select('id,ordernumber,status,totalamount,merchantid')
      .eq('customerid', userId)
      .in('status', ACTIVE_STATUSES as unknown as string[])
      .order('createdat', { ascending: false })
      .limit(3)

    if (!data?.length) { setActiveOrders([]); return }
    const mIds = [...new Set(data.map((o: any) => o.merchantid))]
    const { data: merch } = await supabase
      .from('merchants').select('id,businessname').in('id', mIds)
    const map = new Map((merch ?? []).map((m: any) => [m.id, m.businessname]))
    setActiveOrders(
      data.map((o: any) => ({ ...o, merchantname: map.get(o.merchantid) }) as ActiveOrder)
    )
  }, [userId])

  // Trending dishes ────────────────────────────────────────────────────────────
  const loadTrending = useCallback(async () => {
    try {
      const since = new Date(Date.now() - 7 * 86_400_000).toISOString()
      const { data: orders } = await supabase
        .from('orders')
        .select('items,merchantid')
        .gte('createdat', since)
        .eq('status', 'delivered')
        .limit(300)

      if (!orders?.length) return
      const counts = new Map<string, any>()
      for (const o of orders as any[]) {
        for (const item of o.items ?? []) {
          const key = item.menuitemid || item.id
          if (!key) continue
          const ex = counts.get(key)
          if (ex) { ex.count += item.quantity ?? 1 }
          else counts.set(key, { ...item, count: item.quantity ?? 1, merchantid: o.merchantid })
        }
      }
      const top = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 8)
      if (!top.length) return

      const mIds = [...new Set(top.map((d: any) => d.merchantid))]
      const { data: merch } = await supabase
        .from('merchants').select('id,businessname').in('id', mIds)
      const mMap = new Map((merch ?? []).map((m: any) => [m.id, m.businessname]))
      setTrending(
        top.map((d: any) => ({
          id:                 d.menuitemid || d.id,
          name:               d.name,
          price:              d.price,
          discountpercentage: d.discountpercentage ?? null,
          imageurl:           d.imageurl ?? null,
          merchantid:         d.merchantid,
          merchantname:       mMap.get(d.merchantid) ?? 'Restaurant',
          count:              d.count,
        }))
      )
    } catch (e: any) {
      console.warn('loadTrending', e.message)
    }
  }, [])

  // Global deals ───────────────────────────────────────────────────────────────
  const loadGlobalDeals = useCallback(async () => {
    const now = new Date().toISOString()
    const { data } = await supabase
      .from('promocodes')
      .select('id,code,description,discounttype,discountvalue,minorderamount,validuntil,dealtype,dealjson')
      .eq('isactive', true)
      .eq('scope', 'global')
      .or(`validuntil.is.null,validuntil.gte.${now}`)
      .limit(6)
    setGlobalDeals((data ?? []) as GlobalDeal[])
  }, [])

  // Menu search ────────────────────────────────────────────────────────────────
  const searchMenuItems = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setMenuResults([]); return }
    setSearchingMenu(true)
    try {
      const { data } = await supabase
        .from('menuitems')
        .select('id,name,price,discountpercentage,imageurl,merchantid,category')
        .ilike('name', `%${q}%`)
        .eq('isavailable', true)
        .limit(20)

      if (!data?.length) { setMenuResults([]); return }
      const mIds = [...new Set(data.map((i: any) => i.merchantid))]
      const { data: merch } = await supabase
        .from('merchants').select('id,businessname').in('id', mIds)
      const mMap = new Map((merch ?? []).map((m: any) => [m.id, m.businessname]))
      setMenuResults(
        data.map((i: any) => ({ ...i, merchantname: mMap.get(i.merchantid) }) as MenuResult)
      )
    } catch {
      setMenuResults([])
    } finally {
      setSearchingMenu(false)
    }
  }, [])

  // Effects ────────────────────────────────────────────────────────────────────
  useEffect(() => { detectLocation() }, [detectLocation])
  useEffect(() => { if (coords) loadRestaurants() }, [coords, loadRestaurants])
  useEffect(() => {
    loadActiveOrders(); loadTrending(); loadGlobalDeals()
  }, [loadActiveOrders, loadTrending, loadGlobalDeals])

  // Realtime active-order updates
  useEffect(() => {
    if (!userId) return
    const sub = supabase
      .channel('dash-orders')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: `customerid=eq.${userId}`,
      }, loadActiveOrders)
      .subscribe()
    return () => { sub.unsubscribe() }
  }, [userId, loadActiveOrders])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([loadRestaurants(), loadActiveOrders(), loadTrending(), loadGlobalDeals()])
    setRefreshing(false)
  }, [loadRestaurants, loadActiveOrders, loadTrending, loadGlobalDeals])

  const announcement = useMemo(() => {
    const a = (appSettings as any)?.announcement
    return a && isAnnouncementActive(a) ? a : null
  }, [appSettings])

  return {
    appSettings,
    locationText, setLocationText,
    coords,
    handleLocationPick, detectLocation,
    restaurants,  loadingR,
    activeOrders,
    trending,
    globalDeals,
    menuResults,  setMenuResults, searchingMenu,
    refreshing,   onRefresh,
    unreadCount,
    announcement,
    searchMenuItems,
    loadActiveOrders,
  }
}