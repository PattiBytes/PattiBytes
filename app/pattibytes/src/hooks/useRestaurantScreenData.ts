import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { isOpenNow } from '../utils/ratings';
import { useAuth } from '../contexts/AuthContext';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Types ────────────────────────────────────────────────────────────────────

export type MerchantRow = {
  id: string;
  user_id: string;
  business_name: string;
  cuisine_types?: any;
  description?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  phone?: string | null;
  email?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  average_rating?: number | null;
  total_reviews?: number | null;
  min_order_amount?: number | null;
  estimated_prep_time?: number | null;
  opening_time?: string | null;  // "HH:MM:SS" e.g. "10:00:00"
  closing_time?: string | null;
  opening_hours?: Record<string, { open: string; close: string }> | null; // day-specific
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  is_active?: boolean | null;
  is_verified?: boolean | null;
  is_featured?: boolean | null;
};

export type AppSettingsRow = {
  id: string;
  app_name?: string | null;
  show_menu_images?: boolean | null;
};

export type MenuItemRow = {
  id: string;
  merchant_id: string;
  name: string;
  description?: string | null;
  price: number;
  discount_percentage?: number | null;
  image_url?: string | null;
  category?: string | null;
  category_id?: string | null;
  is_available: boolean;
  is_veg: boolean;
  preparation_time?: number | null;
  dish_timing?: string | null;  // ← NEW: "HH:MM-HH:MM" e.g. "11:00-15:00"
};

export type ReviewRow = {
  id: string;
  order_id?: string | null;
  customer_id: string;
  merchant_id: string;
  rating: number | null;
  comment?: string | null;
  created_at: string;
  customer_name?: string;
};

export type NotificationPrefs = {
  promos?: boolean;
  system?: boolean;
  order_updates?: boolean;
  review_updates?: boolean;
  [k: string]: any;
};

export type OfferBadge = {
  label: string;
  subLabel?: string;
  promoCode?: string;
};

export type TrendingItem = {
  key: string;
  menu_item_id?: string | null;
  name: string;
  image_url?: string | null;
  price?: number | null;
  is_veg?: boolean | null;
  discount_percentage?: number | null;
  totalQty: number;
};

export type RecommendedMerchant = {
  id: string;
  business_name: string;
  logo_url?: string | null;
  cuisine_types?: string[];
  average_rating?: number | null;
  estimated_prep_time?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  distance_km?: number | null;
  is_open_now?: boolean;
};

// ── NEW: BXGY Auto-Apply type ────────────────────────────────────────────────
export type BxgyTarget = {
  id: string;
  promo_code_id: string;
  side: 'buy' | 'get';
  menu_item_id: string | null;
  category_id: string | null;
};

export type AutoApplyBxgyPromo = {
  promo: any;
  buyTargets: BxgyTarget[];
  getTargets: BxgyTarget[];
};

type OrderedItemMini = {
  id?: string;
  menu_item_id?: string;
  name?: string;
  quantity?: number;
  price?: number;
  is_veg?: boolean;
  image_url?: string | null;
  discount_percentage?: number;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function toNum(v: any, fallback = 0) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeCuisineTypes(v: any): string[] {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {}
    return v.split(',').map((x) => x.trim()).filter(Boolean);
  }
  return [];
}

function isPromoActiveNow(p: any, now: Date) {
  if (p?.is_active === false) return false;
  if (p?.valid_from) {
    const vf = new Date(p.valid_from);
    if (!Number.isNaN(vf.getTime()) && now < vf) return false;
  }
  if (p?.valid_until) {
    const vu = new Date(p.valid_until);
    if (!Number.isNaN(vu.getTime()) && now > vu) return false;
  }
  return true;
}

function promoLabel(p: any): string | null {
  const deal = String(p?.deal_type ?? '');
  if (deal === 'bxgy') {
    const buyQty = toNum(p?.deal_json?.buy?.qty, 1);
    const getQty = toNum(p?.deal_json?.get?.qty, 1);
    const discType = String(p?.deal_json?.get?.discount?.type ?? 'free');
    const discVal = toNum(p?.deal_json?.get?.discount?.value, 100);
    const disc = discType === 'free' ? 'FREE' : discType === 'percentage' ? `${discVal}% OFF` : `₹${discVal} OFF`;
    return `Buy ${buyQty} Get ${getQty} ${disc}`;
  }
  const dt = String(p?.discount_type ?? 'percentage');
  const dv = toNum(p?.discount_value, 0);
  if (!dv) return null;
  return dt === 'percentage' ? `${dv}% OFF` : `₹${dv} OFF`;
}

function getAuthIds(ctx: any) {
  const userId = ctx?.user?.id ?? ctx?.profile?.id ?? ctx?.authUser?.id ?? ctx?.id ?? null;
  return { userId: userId ? String(userId) : null };
}

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useRestaurantScreenData(merchantId: string) {
  const authCtx = useAuth();
  const { userId } = useMemo(() => getAuthIds(authCtx), [authCtx]);

  const [merchant, setMerchant] = useState<MerchantRow | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettingsRow | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItemRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [reviewItemsByReviewId, setReviewItemsByReviewId] = useState<Record<string, OrderedItemMini[]>>({});
  const [offerByMenuItemId, setOfferByMenuItemId] = useState<Record<string, OfferBadge | null>>({});
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [recommended, setRecommended] = useState<RecommendedMerchant[]>([]);
  const [recommendedLoading, setRecommendedLoading] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [hasDeliveredOrder, setHasDeliveredOrder] = useState(false);
  const [deliveredOrderId, setDeliveredOrderId] = useState<string | null>(null);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── NEW: BXGY auto-apply state ────────────────────────────────────────────
  const [autoApplyBxgyPromos, setAutoApplyBxgyPromos] = useState<AutoApplyBxgyPromo[]>([]);

  const reviewsReloadThrottle = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── openNow: supports both flat opening_time and day-specific opening_hours ─
  const openNow = useMemo(() => {
    if (!merchant) return true;
    // Day-specific hours take priority
    const oh = (merchant as any).opening_hours;
    if (oh && typeof oh === 'object') {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const day = days[new Date().getDay()];
      const todayHours = oh[day] ?? oh[day.slice(0, 3)] ?? null;
      if (todayHours?.open && todayHours?.close) {
        return isOpenNow(todayHours.open, todayHours.close);
      }
    }
    return isOpenNow(merchant.opening_time ?? null, merchant.closing_time ?? null);
  }, [merchant]);

  // ── closedMessage: human-readable "Opens at X" ────────────────────────────
  const closedMessage = useMemo(() => {
    if (openNow || !merchant) return null;
    const fmt = (t: string | null | undefined) => {
      if (!t) return '';
      const [hh, mm] = String(t).split(':');
      const h = Number(hh);
      return `${h % 12 || 12}:${mm ?? '00'} ${h >= 12 ? 'PM' : 'AM'}`;
    };
    const open = merchant.opening_time;
    const close = merchant.closing_time;
    if (open && close) return `Opens ${fmt(open)} · Closes ${fmt(close)}`;
    if (open) return `Opens at ${fmt(open)}`;
    return 'Currently closed';
  }, [openNow, merchant]);

  // ── Review helpers ────────────────────────────────────────────────────────

  const enrichReviewNames = useCallback(async (base: ReviewRow[]) => {
    const ids = Array.from(new Set(base.map((r) => r.customer_id).filter(Boolean)));
    if (!ids.length) return base;
    const { data } = await supabase.from('profiles').select('id,full_name').in('id', ids).limit(200);
    const map = new Map((data ?? []).map((p: any) => [String(p.id), String(p.full_name ?? 'Customer')]));
    return base.map((r) => ({ ...r, customer_name: map.get(String(r.customer_id)) ?? 'Customer' }));
  }, []);

  const loadReviewItemsForVisible = useCallback(async (list: ReviewRow[]) => {
    const pairs = list
      .map((r) => ({ reviewId: String(r.id), orderId: r.order_id ? String(r.order_id) : null }))
      .filter((x) => x.orderId);
    const orderIds = Array.from(new Set(pairs.map((p) => p.orderId!).filter(Boolean)));
    if (!orderIds.length) { setReviewItemsByReviewId({}); return; }

    const { data, error } = await supabase.from('orders').select('id,items').in('id', orderIds).limit(200);
    if (error) return;

    const itemsByOrderId = new Map<string, OrderedItemMini[]>();
    for (const row of data ?? []) {
      const raw = (row as any).items;
      itemsByOrderId.set(String((row as any).id), Array.isArray(raw) ? raw : []);
    }
    const out: Record<string, OrderedItemMini[]> = {};
    for (const p of pairs) out[p.reviewId] = (itemsByOrderId.get(String(p.orderId)) ?? []).slice(0, 6);
    setReviewItemsByReviewId(out);
  }, []);

  // ── Trending ─────────────────────────────────────────────────────────────

  const loadTrendingFromOrdersItems = useCallback(async () => {
    if (!UUID_REGEX.test(merchantId)) return;
    setTrendingLoading(true);
    try {
      const sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('orders')
        .select('id,status,created_at,items')
        .eq('merchant_id', merchantId)
        .gte('created_at', sinceIso)
        .neq('status', 'cancelled')
        .limit(250);

      if (error) throw error;

      const qtyByKey = new Map<string, { totalQty: number; sample?: OrderedItemMini }>();
      for (const o of data ?? []) {
        const items = Array.isArray((o as any).items) ? ((o as any).items as OrderedItemMini[]) : [];
        for (const it of items) {
          const menuItemId = it.menu_item_id ? String(it.menu_item_id) : '';
          const fallbackId = it.id ? String(it.id) : '';
          const key = UUID_REGEX.test(menuItemId) ? menuItemId : fallbackId || String(it.name ?? 'item');
          const q = toNum((it as any).quantity, 0);
          if (q <= 0) continue;
          const prev = qtyByKey.get(key);
          qtyByKey.set(key, { totalQty: (prev?.totalQty ?? 0) + q, sample: prev?.sample ?? it });
        }
      }

      const top = Array.from(qtyByKey.entries()).sort((a, b) => b[1].totalQty - a[1].totalQty).slice(0, 10);
      const menuIds = top.map(([k]) => k).filter((k) => UUID_REGEX.test(k));
      const menuMap = new Map<string, any>();

      if (menuIds.length) {
        const mi = await supabase
          .from('menu_items')
          .select('id,name,price,image_url,is_veg,discount_percentage')
          .in('id', menuIds)
          .limit(200);
        (mi.data ?? []).forEach((r: any) => menuMap.set(String(r.id), r));
      }

      setTrending(top.map(([key, v]) => {
        const mi = menuMap.get(key);
        const sample = v.sample ?? {};
        return {
          key,
          menu_item_id: UUID_REGEX.test(key) ? key : (sample.menu_item_id ?? null),
          name: String(mi?.name ?? sample.name ?? 'Item'),
          image_url: mi?.image_url ?? sample.image_url ?? null,
          price: mi?.price ?? sample.price ?? null,
          is_veg: mi?.is_veg ?? sample.is_veg ?? null,
          discount_percentage: mi?.discount_percentage ?? sample.discount_percentage ?? null,
          totalQty: v.totalQty,
        };
      }));
    } catch { setTrending([]); }
    finally { setTrendingLoading(false); }
  }, [merchantId]);

  // ── Offer badges ──────────────────────────────────────────────────────────

  const loadOfferBadges = useCallback(async () => {
    if (!UUID_REGEX.test(merchantId)) return;
    try {
      const now = new Date();
      const { data, error } = await supabase
        .from('promo_codes')
        .select('id,code,deal_type,deal_json,discount_type,discount_value,menu_item_ids,category_ids,auto_apply,priority,is_active,valid_from,valid_until,merchant_id,scope')
        .eq('is_active', true)
        .eq('scope', 'merchant')
        .eq('merchant_id', merchantId)
        .order('priority', { ascending: false })
        .limit(30);

      if (error) throw error;

      const promos = (data ?? []).filter((p: any) => isPromoActiveNow(p, now));
      if (!promos.length) { setOfferByMenuItemId({}); return; }

      const out: Record<string, OfferBadge | null> = {};
      for (const p of promos) {
        const label = promoLabel(p);
        if (!label) continue;
        const badge: OfferBadge = {
          label,
          subLabel: p.auto_apply ? 'Auto offer' : 'Offer',
          promoCode: String(p.code ?? ''),
        };
        const menuIds = Array.isArray(p.menu_item_ids) ? p.menu_item_ids.map(String) : [];
        const catIds  = Array.isArray(p.category_ids)  ? p.category_ids.map(String)  : [];

        if (!menuIds.length && !catIds.length) {
          if (!out['merchant:all']) out['merchant:all'] = badge;
        }
        for (const id of menuIds) { if (!out[id]) out[id] = badge; }
        for (const cid of catIds) { const k = `cat:${cid}`; if (!out[k]) out[k] = badge; }
      }
      setOfferByMenuItemId(out);
    } catch { setOfferByMenuItemId({}); }
  }, [merchantId]);

  // ── NEW: Load auto-apply BXGY promos + their targets ──────────────────────

  const loadAutoApplyBxgyPromos = useCallback(async () => {
    if (!UUID_REGEX.test(merchantId)) return;
    try {
      const now = new Date();
      const { data: promoData, error: promoErr } = await supabase
        .from('promo_codes')
        .select('id,code,deal_type,deal_json,auto_apply,priority,is_active,valid_from,valid_until,merchant_id,scope')
        .eq('is_active', true)
        .eq('scope', 'merchant')
        .eq('merchant_id', merchantId)
        .eq('deal_type', 'bxgy')
        .eq('auto_apply', true)
        .order('priority', { ascending: false })
        .limit(10);

      if (promoErr) throw promoErr;

      const activePromos = (promoData ?? []).filter((p: any) => isPromoActiveNow(p, now));
      if (!activePromos.length) { setAutoApplyBxgyPromos([]); return; }

      const ids = activePromos.map((p: any) => p.id);
      const { data: targetData, error: targErr } = await supabase
        .from('promo_bxgy_targets')
        .select('id,promo_code_id,side,menu_item_id,category_id')
        .in('promo_code_id', ids);

      if (targErr) throw targErr;

      const enriched: AutoApplyBxgyPromo[] = activePromos.map((promo: any) => ({
        promo,
        buyTargets: (targetData ?? []).filter((t: any) => t.promo_code_id === promo.id && t.side === 'buy'),
        getTargets: (targetData ?? []).filter((t: any) => t.promo_code_id === promo.id && t.side === 'get'),
      }));

      setAutoApplyBxgyPromos(enriched);
    } catch {
      setAutoApplyBxgyPromos([]);
    }
  }, [merchantId]);

  // ── Recommended ───────────────────────────────────────────────────────────

  const loadRecommendedRestaurants = useCallback(async (m: MerchantRow | null) => {
    if (!m?.id) { setRecommended([]); return; }
    setRecommendedLoading(true);
    try {
      const cuisines = normalizeCuisineTypes(m.cuisine_types);
      const city  = m.city  ? String(m.city)  : null;
      const state = m.state ? String(m.state) : null;

      let q = supabase
        .from('merchants')
        .select('id,business_name,logo_url,cuisine_types,average_rating,total_reviews,estimated_prep_time,latitude,longitude,opening_time,closing_time,is_active,is_verified,city,state')
        .eq('is_active', true)
        .neq('id', m.id)
        .limit(40);

      if (city)  q = q.eq('city',  city);
      if (state) q = q.eq('state', state);

      const { data, error } = await q;
      if (error) throw error;

      const pool = (data ?? []).map((r: any) => {
        const rLat = r.latitude  == null ? null : Number(r.latitude);
        const rLon = r.longitude == null ? null : Number(r.longitude);
        const mLat = m.latitude  == null ? null : Number(m.latitude);
        const mLon = m.longitude == null ? null : Number(m.longitude);
        let dist: number | null = null;
        if (Number.isFinite(rLat!) && Number.isFinite(rLon!) && Number.isFinite(mLat!) && Number.isFinite(mLon!)) {
          dist = haversineKm(mLat!, mLon!, rLat!, rLon!);
        }
        return {
          id: String(r.id),
          business_name: String(r.business_name ?? 'Restaurant'),
          logo_url: r.logo_url ?? null,
          cuisine_types: normalizeCuisineTypes(r.cuisine_types),
          average_rating: r.average_rating == null ? null : Number(r.average_rating),
          estimated_prep_time: r.estimated_prep_time == null ? null : Number(r.estimated_prep_time),
          latitude: rLat, longitude: rLon,
          distance_km: dist,
          is_open_now: isOpenNow(r.opening_time ?? null, r.closing_time ?? null),
        } satisfies RecommendedMerchant;
      });

      const filtered = cuisines.length ? pool.filter((x) => (x.cuisine_types ?? []).some((c) => cuisines.includes(c))) : pool;
      filtered.sort((a, b) => {
        const ad = a.distance_km ?? 999999, bd = b.distance_km ?? 999999;
        if (ad !== bd) return ad - bd;
        return (b.average_rating ?? 0) - (a.average_rating ?? 0);
      });
      setRecommended(filtered.slice(0, 10));
    } catch { setRecommended([]); }
    finally { setRecommendedLoading(false); }
  }, []);

  // ── Main load ─────────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    if (!UUID_REGEX.test(merchantId)) return;
    setLoading(true);
    try {
      const [merchRes, settingsRes, menuRes, revRes] = await Promise.all([
        supabase
          .from('merchants')
          .select('id,user_id,business_name,cuisine_types,description,logo_url,banner_url,phone,email,latitude,longitude,is_active,is_verified,average_rating,total_reviews,min_order_amount,estimated_prep_time,is_featured,opening_time,closing_time,opening_time,city,state,postal_code,address')
          .eq('id', merchantId)
          .maybeSingle(),

        supabase.from('app_settings').select('id,app_name,show_menu_images').limit(1).maybeSingle(),

        supabase
          .from('menu_items')
          .select('id,merchant_id,name,description,price,category,image_url,is_available,is_veg,preparation_time,category_id,discount_percentage,dish_timing,created_at,updated_at')
          .eq('merchant_id', merchantId)
          .order('category', { ascending: true })
          .order('name',     { ascending: true }),

        supabase
          .from('reviews')
          .select('id,order_id,customer_id,merchant_id,comment,created_at,rating')
          .eq('merchant_id', merchantId)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      if (merchRes.error) throw merchRes.error;
      const merch = (merchRes.data as any) ?? null;
      if (merch) merch.cuisine_types = normalizeCuisineTypes(merch.cuisine_types);
      setMerchant(merch);

      setAppSettings((settingsRes.data as any) ?? null);

      if (menuRes.error) throw menuRes.error;
      setMenuItems(((menuRes.data as any) ?? []) as MenuItemRow[]);

      if (revRes.error) throw revRes.error;
      const baseReviews = ((revRes.data as any) ?? []) as ReviewRow[];
      const enriched = await enrichReviewNames(baseReviews);
      setReviews(enriched);
      loadReviewItemsForVisible(enriched);

      if (userId) {
        const [fav, prefs, delivered] = await Promise.all([
          supabase.from('favorites').select('id').eq('user_id', userId).eq('merchant_id', merchantId).maybeSingle(),
          supabase.from('profiles').select('notification_prefs').eq('id', userId).maybeSingle(),
          supabase.from('orders').select('id').eq('customer_id', userId).eq('merchant_id', merchantId).eq('status', 'delivered').order('created_at', { ascending: false }).limit(1),
        ]);
        setIsFav(Boolean(fav.data));
        setNotificationPrefs(((prefs.data as any)?.notification_prefs ?? null) as any);
        const oid = delivered.data?.[0]?.id ?? null;
        setHasDeliveredOrder(Boolean(oid));
        setDeliveredOrderId(oid);

        const existing = await supabase.from('reviews').select('id').eq('customer_id', userId).eq('merchant_id', merchantId).maybeSingle();
        setAlreadyReviewed(Boolean(existing.data));
      } else {
        setIsFav(false);
        setNotificationPrefs(null);
        setHasDeliveredOrder(false);
        setDeliveredOrderId(null);
        setAlreadyReviewed(false);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to load restaurant');
    } finally {
      setLoading(false);
    }
  }, [enrichReviewNames, loadReviewItemsForVisible, merchantId, userId]);

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    loadAll();
    loadTrendingFromOrdersItems();
    loadOfferBadges();
    loadAutoApplyBxgyPromos();   // ← NEW
  }, [loadAll, loadOfferBadges, loadTrendingFromOrdersItems, loadAutoApplyBxgyPromos]);

  useEffect(() => {
    loadRecommendedRestaurants(merchant);
  }, [merchant, loadRecommendedRestaurants]);

  // Real-time reviews subscription
  useEffect(() => {
    if (!UUID_REGEX.test(merchantId)) return;
    const ch = supabase
      .channel(`merchant-reviews-${merchantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews', filter: `merchant_id=eq.${merchantId}` }, () => {
        if (reviewsReloadThrottle.current) return;
        reviewsReloadThrottle.current = setTimeout(async () => {
          reviewsReloadThrottle.current = null;
          await loadAll();
        }, 900);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
      if (reviewsReloadThrottle.current) clearTimeout(reviewsReloadThrottle.current);
      reviewsReloadThrottle.current = null;
    };
  }, [loadAll, merchantId]);

  // ── Refresh ───────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadAll(),
      loadTrendingFromOrdersItems(),
      loadOfferBadges(),
      loadAutoApplyBxgyPromos(),
    ]);
    await loadRecommendedRestaurants(merchant);
    setRefreshing(false);
  }, [loadAll, loadOfferBadges, loadTrendingFromOrdersItems, loadAutoApplyBxgyPromos, loadRecommendedRestaurants, merchant]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const toggleFavourite = useCallback(async () => {
    if (!userId) { Alert.alert('Login required', 'Please login to use favourites.'); return; }
    if (!UUID_REGEX.test(merchantId)) return;
    const next = !isFav;
    setIsFav(next);
    try {
      if (next) {
        const { error } = await supabase.from('favorites').insert({ user_id: userId, merchant_id: merchantId });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('favorites').delete().eq('user_id', userId).eq('merchant_id', merchantId);
        if (error) throw error;
      }
    } catch (e: any) {
      setIsFav(!next);
      Alert.alert('Error', e?.message ?? 'Failed to update favourite');
    }
  }, [isFav, merchantId, userId]);

  const setNotificationPref = useCallback(async (key: string, value: boolean) => {
    if (!userId) { Alert.alert('Login required', 'Please login to change notification preferences.'); return; }
    const prev = notificationPrefs ?? {};
    const next = { ...prev, [key]: value };
    setNotificationPrefs(next);
    const { error } = await supabase.from('profiles').update({ notification_prefs: next }).eq('id', userId);
    if (error) { setNotificationPrefs(prev); Alert.alert('Error', error.message); }
  }, [notificationPrefs, userId]);

  const submitReview = useCallback(async (payload: { rating: number; comment?: string | null }) => {
    if (!userId) { Alert.alert('Login required', 'Please login to write a review.'); return { ok: false as const }; }
    if (!hasDeliveredOrder || !deliveredOrderId) { Alert.alert('Not allowed', 'Only customers with a delivered order can write a review.'); return { ok: false as const }; }
    if (alreadyReviewed) { Alert.alert('Already reviewed', 'You already reviewed this restaurant.'); return { ok: false as const }; }

    const rating = toNum(payload.rating, 0);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) { Alert.alert('Invalid rating', 'Rating must be between 1 and 5.'); return { ok: false as const }; }

    try {
      const comment = payload.comment?.trim() ? payload.comment.trim() : null;
      const ins = await supabase
        .from('reviews')
        .insert({ order_id: deliveredOrderId, customer_id: userId, merchant_id: merchantId, comment, rating, created_at: new Date().toISOString() })
        .select('id').single();
      if (ins.error) throw ins.error;

      await supabase.from('orders').update({ rating, review: comment }).eq('id', deliveredOrderId);
      setAlreadyReviewed(true);
      Alert.alert('Thank you!', 'Your review has been submitted.');
      return { ok: true as const };
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to submit review');
      return { ok: false as const };
    }
  }, [alreadyReviewed, deliveredOrderId, hasDeliveredOrder, merchantId, userId]);

  // ── Return ────────────────────────────────────────────────────────────────

  return {
    merchant, appSettings, menuItems,
    trending, trendingLoading,
    recommended, recommendedLoading,
    offerByMenuItemId,
    reviews, reviewItemsByReviewId,
    isFav, openNow, closedMessage,
    hasDeliveredOrder, deliveredOrderId, alreadyReviewed,
    notificationPrefs, setNotificationPref,
    loading, refreshing, refresh,
    toggleFavourite, submitReview,
    autoApplyBxgyPromos,   // ← NEW
  };
}
