/* eslint-disable @next/next/no-img-element */
'use client';

/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import {
  Facebook,
  Globe,
  Instagram,
  Receipt,
  RefreshCcw,
  ShoppingBag,
  Truck,
  Youtube,
  TrendingUp,
  ArrowRight,
  Image as ImageIcon,
  X,
  Megaphone,
} from 'lucide-react';

import AppShell from '@/components/common/AppShell';
import { supabase } from '@/lib/supabase';
import { locationService, type SavedAddress } from '@/services/location';

import { useAuth } from '@/contexts/AuthContext';

import type { Location, MenuItem, Merchant, SearchResult } from '@/components/customer-dashboard/types';
import {
  getFirstNameFromUser,
  haversineKm,
  normalizeReverseGeocodeToString,
  parseCuisineList,
} from '@/components/customer-dashboard/utils';

import DashboardHeader from '@/components/customer-dashboard/DashboardHeader';
import LocationBar from '@/components/customer-dashboard/LocationBar';
import LocationModal from '@/components/customer-dashboard/LocationModal';
import SearchBox from '@/components/customer-dashboard/SearchBox';
import StatsCards from '@/components/customer-dashboard/StatsCards';
import CuisineFilters from '@/components/customer-dashboard/CuisineFilters';
import RestaurantGrid from '@/components/customer-dashboard/RestaurantGrid';

import type { AddressPick } from '@/components/AddressAutocomplete';
import type { OfferBadge, PromoCodeRow, BxgyTargetRow, MenuItemNameLite } from '@/components/customer-dashboard/offers';
import { buildOfferBadgeFromPromo, isPromoActiveNow } from '@/components/customer-dashboard/offers';

const BOTTOM_NAV_PX = 96;

const ACTIVE_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'assigned',
  'pickedup',
  'on_the_way',
  'ontheway',
  'on the way',
  'out_for_delivery',
  'outfordelivery',
];

type ActiveOrder = {
  id: string;
  ordernumber?: number | null;
  status?: string | null;
  total_amount?: number | null;
  created_at?: string | null;
  merchant_id?: string | null;

  merchantName?: string;
  merchantLogoUrl?: string | null;
};

type CustomLink = {
  id: string;
  title: string;
  url: string;
  logo_url?: string | null;
  enabled?: boolean;
};

type Announcement = {
  enabled?: boolean;
  type?: 'banner' | 'popup';
  title?: string;
  message?: string;
  image_url?: string;
  link_url?: string;
  start_at?: string; // ISO
  end_at?: string; // ISO
  dismissible?: boolean;
  dismiss_key?: string;

  // optional (if you want): control auto hide in milliseconds
  auto_hide_ms?: number;
};

type AppSettingsRow = {
  id: string;
  app_name: string | null;

  support_email: string | null;
  support_phone: string | null;
  business_address: string | null;

  facebook_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  youtube_url: string | null;
  website_url: string | null;

  custom_links?: any;
  customer_search_radius_km?: number | null;

  // NEW
  announcement?: any;
  show_menu_images?: boolean | null;
};

const APP_SETTINGS_ID = 'a6ba88a3-6fe9-4652-8c5d-b25ee1a05e39';

type TrendingDish = {
  id: string;
  merchant_id: string;
  name: string;
  description?: string | null;
  price: number;
  category?: string | null;
  image_url?: string | null;
  discount_percentage?: number | null;
  is_veg?: boolean | null;

  merchantName?: string | null;
  totalQty: number;
};

function toMoney(n: any) {
  const x = Number(n || 0);
  if (!Number.isFinite(x)) return '0';
  try {
    return x.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  } catch {
    return String(Math.round(x));
  }
}

function tinyTime(iso?: string | null) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso || '';
  }
}

function safeArr<T = any>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}

function normalizeMaybeMarkdownUrl(v: any) {
  const s0 = String(v ?? '').trim();
  if (!s0) return '';

  const md = s0.match(/\((https?:\/\/[^)]+)\)/i);
  const picked = (md?.[1] || s0).trim();

  const bracketOnly = picked.match(/^\[([^\]]+)\]$/);
  return (bracketOnly?.[1] || picked).trim();
}

function iconForUrl(url: string) {
  const u = String(url || '').toLowerCase();
  if (u.includes('instagram.com')) return Instagram;
  if (u.includes('facebook.com')) return Facebook;
  if (u.includes('youtube.com') || u.includes('youtu.be')) return Youtube;
  return Globe;
}

function finalPrice(price: any, discount?: any) {
  const p = Number(price || 0);
  const d = Number(discount || 0);
  if (!d) return p;
  return p * (1 - d / 100);
}

function isAnnouncementActive(a?: Announcement | null) {
  if (!a?.enabled) return false;

  const now = Date.now();
  const s = a.start_at ? new Date(a.start_at).getTime() : NaN;
  const e = a.end_at ? new Date(a.end_at).getTime() : NaN;

  if (Number.isFinite(s) && now < s) return false;
  if (Number.isFinite(e) && now > e) return false;

  const hasContent =
    Boolean(String(a.title || '').trim()) ||
    Boolean(String(a.message || '').trim()) ||
    Boolean(String(a.image_url || '').trim());

  return hasContent;
}

function normalizeHttpUrl(v: any) {
  const s = normalizeMaybeMarkdownUrl(v);
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

export default function CustomerDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [location, setLocation] = useState<Location | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const [searchRadiusKm, setSearchRadiusKm] = useState<number>(25);

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showLocationSearch, setShowLocationSearch] = useState(false);

  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [restaurants, setRestaurants] = useState<Merchant[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<Merchant[]>([]);

  // SearchBox inputs
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuCountByMerchant, setMenuCountByMerchant] = useState<Record<string, number>>({});

  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuSearchReq = useRef(0);

  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
    totalSpent: 0,
  });

  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [loadingActiveOrders, setLoadingActiveOrders] = useState(false);

  const [appSettings, setAppSettings] = useState<AppSettingsRow | null>(null);
  const [customLinks, setCustomLinks] = useState<CustomLink[]>([]);

  // Trending dishes
  const [trending, setTrending] = useState<TrendingDish[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
const [offerByMerchant, setOfferByMerchant] = useState<Record<string, OfferBadge | null>>({});

  const [brand, setBrand] = useState({
    title: 'Presented by Pattibytes',
    instagram1: 'https://www.instagram.com/pb_express38',
    instagram2: 'https://instagram.com/patti_bytes',
    youtube: 'https://www.youtube.com/@pattibytes',
    website: 'https://www.pattibytes.com',
    facebook: 'https://www.facebook.com/ipattibytes',
  });

  // NEW: announcement UI state
  const [bannerVisible, setBannerVisible] = useState(true);
  const [popupOpen, setPopupOpen] = useState(false);

  // timers
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const firstName = useMemo(() => getFirstNameFromUser(user), [user]);

  const announcement: Announcement | null = useMemo(() => {
    const raw = (appSettings as any)?.announcement;
    if (!raw || typeof raw !== 'object') return null;
    return raw as Announcement;
  }, [appSettings]);

  const showMenuImages = useMemo(() => {
    return Boolean((appSettings as any)?.show_menu_images ?? true);
  }, [appSettings]);
const PROMO_TABLE = 'promo_codes';
const BXGY_TABLE = 'promo_bxgy_targets';
const MENU_TABLE = 'menu_items';

const merchantIdsKey = useMemo(() => {
  const ids = filteredRestaurants.slice(0, 60).map((r: any) => String(r.id)).filter(Boolean);
  ids.sort();
  return ids.join(',');
}, [filteredRestaurants]);

useEffect(() => {
  let cancelled = false;

  const loadOffersForGrid = async () => {
    const merchantIds = merchantIdsKey ? merchantIdsKey.split(',').filter(Boolean) : [];
    if (!merchantIds.length) {
      setOfferByMerchant({});
      return;
    }

    const cacheKey = `offers:grid:v1:${merchantIdsKey}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') setOfferByMerchant(parsed);
      }
    } catch {}

    try {
      // 1) Fetch promos for these merchants
      const promoSelect = [
        'id',
        'code',
        'description',
        'scope',
        'merchant_id',
        'deal_type',
        'deal_json',
        'discount_type',
        'discount_value',
        'min_order_amount',
        'max_discount_amount',
        'auto_apply',
        'priority',
        'is_active',
        'valid_from',
        'valid_until',
        'valid_days',
        'valid_time_start',
        'valid_time_end',
        'start_time',
        'end_time',
      ].join(',');

      const promosRes = await supabase
        .from(PROMO_TABLE)
        .select(promoSelect)
        .in('merchant_id', merchantIds)
        .eq('is_active', true);

      if (promosRes.error) throw promosRes.error;

      const promos = (promosRes.data || []) as unknown as PromoCodeRow[];
      const now = new Date();

      // 2) Pick best promo per merchant (active now + priority + auto_apply)
      const bestPromoByMerchant = new Map<string, PromoCodeRow>();

      const score = (p: PromoCodeRow) => {
        const auto = p.auto_apply ? 1 : 0;
        const pr = Number.isFinite(Number(p.priority)) ? Number(p.priority) : 9999; // smaller = better
        const bxgy = p.deal_type === 'bxgy' ? 1 : 0;
        // sort: auto first, then priority asc, then bxgy first
        return { auto, pr, bxgy };
      };

      const compare = (a: PromoCodeRow, b: PromoCodeRow) => {
        const sa = score(a);
        const sb = score(b);
        if (sa.auto !== sb.auto) return sb.auto - sa.auto;
        if (sa.pr !== sb.pr) return sa.pr - sb.pr;
        if (sa.bxgy !== sb.bxgy) return sb.bxgy - sa.bxgy;
        return String(a.code || '').localeCompare(String(b.code || ''));
      };

      const grouped = new Map<string, PromoCodeRow[]>();
      for (const p of promos) {
        const mid = String(p.merchant_id || '').trim();
        if (!mid) continue;
        if (!isPromoActiveNow(p, now)) continue;

        if (!grouped.has(mid)) grouped.set(mid, []);
        grouped.get(mid)!.push(p);
      }

      for (const [mid, list] of grouped.entries()) {
        list.sort(compare);
        bestPromoByMerchant.set(mid, list[0]);
      }

      // 3) Fetch BXGY targets for selected BXGY promos
      const selectedPromos = Array.from(bestPromoByMerchant.values());
      const bxgyPromoIds = selectedPromos.filter((p) => p.deal_type === 'bxgy').map((p) => p.id);

      const targetsByPromo = new Map<string, BxgyTargetRow[]>();

      if (bxgyPromoIds.length) {
        const targetsRes = await supabase
          .from(BXGY_TABLE)
          .select('id,promo_code_id,side,menu_item_id,category_id,created_at')
          .in('promo_code_id', bxgyPromoIds);

        if (targetsRes.error) throw targetsRes.error;

        const targets = (targetsRes.data || []) as BxgyTargetRow[];
        for (const t of targets) {
          const pid = String(t.promo_code_id || '').trim();
          if (!pid) continue;
          if (!targetsByPromo.has(pid)) targetsByPromo.set(pid, []);
          targetsByPromo.get(pid)!.push(t);
        }
      }

      // 4) Fetch menu item names for all target item ids
      const allItemIds = new Set<string>();
      for (const list of targetsByPromo.values()) {
        for (const t of list) {
          if (t.menu_item_id) allItemIds.add(String(t.menu_item_id));
        }
      }

      const menuItemsById: Record<string, MenuItemNameLite> = {};
      if (allItemIds.size) {
        const ids = Array.from(allItemIds);
        const menuRes = await supabase.from(MENU_TABLE).select('id,name').in('id', ids).limit(2000);
        if (menuRes.error) throw menuRes.error;

        for (const it of menuRes.data || []) {
          const id = String((it as any)?.id || '').trim();
          const name = String((it as any)?.name || '').trim();
          if (id) menuItemsById[id] = { id, name };
        }
      }

      // 5) Build OfferBadge per merchant
      const out: Record<string, OfferBadge | null> = {};
      for (const mid of merchantIds) {
        const p = bestPromoByMerchant.get(mid) || null;
        if (!p) {
          out[mid] = null;
          continue;
        }

        const badge = buildOfferBadgeFromPromo({
          promo: p,
          bxgyTargets: targetsByPromo.get(p.id) || [],
          menuItemsById,
        });

        out[mid] = badge;
      }

      if (cancelled) return;

      setOfferByMerchant(out);
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(out));
      } catch {}
    } catch {
      if (!cancelled) setOfferByMerchant({});
    }
  };

  loadOffersForGrid();

  return () => {
    cancelled = true;
  };
}, [merchantIdsKey]);

  // App settings
  useEffect(() => {
    const loadAppSettings = async () => {
      try {
        let row: AppSettingsRow | null = null;

        const selectAll =
          'id,app_name,support_email,support_phone,business_address,facebook_url,instagram_url,twitter_url,youtube_url,website_url,custom_links,customer_search_radius_km,announcement,show_menu_images';

        const try1 = await supabase.from('app_settings').select(selectAll).eq('id', APP_SETTINGS_ID).single();

        if (!try1.error) {
          row = (try1.data || null) as any;
        } else {
          // Backward compatible fallback if some columns don't exist yet
          const msg = String(try1.error.message || '').toLowerCase();

          const needsFallback =
            msg.includes('customer_search_radius_km') || msg.includes('announcement') || msg.includes('show_menu_images');

          if (needsFallback) {
            const try2 = await supabase
              .from('app_settings')
              .select(
                'id,app_name,support_email,support_phone,business_address,facebook_url,instagram_url,twitter_url,youtube_url,website_url,custom_links'
              )
              .eq('id', APP_SETTINGS_ID)
              .single();

            if (try2.error) throw try2.error;
            row = (try2.data || null) as any;
          } else {
            throw try1.error;
          }
        }

        if (!row) return;

        setAppSettings(row);

        const r = Number((row as any).customer_search_radius_km);
        if (Number.isFinite(r) && r > 0) setSearchRadiusKm(Math.round(r));

        const instagramMain = normalizeMaybeMarkdownUrl(row.instagram_url);
        const extra = normalizeMaybeMarkdownUrl(row.twitter_url);
        const youtube = normalizeMaybeMarkdownUrl(row.youtube_url);
        const website = normalizeMaybeMarkdownUrl(row.website_url);
        const facebook = normalizeMaybeMarkdownUrl(row.facebook_url);

        setBrand((b) => ({
          title: row.app_name ? `Presented by ${row.app_name}` : b.title,
          instagram1: instagramMain || b.instagram1,
          instagram2: extra || b.instagram2,
          youtube: youtube || b.youtube,
          website: website || b.website,
          facebook: facebook || b.facebook,
        }));

        const links = safeArr<any>((row as any).custom_links)
          .map((x) => ({
            id: String(x?.id || ''),
            title: String(x?.title || ''),
            url: normalizeMaybeMarkdownUrl(x?.url || ''),
            logo_url: normalizeMaybeMarkdownUrl(x?.logo_url || ''),
            enabled: Boolean(x?.enabled ?? true),
          }))
          .filter((x) => !!x.url);

        setCustomLinks(links);
      } catch {
        // keep fallbacks
      }
    };

    loadAppSettings();

    const ch = supabase
      .channel('app-settings-live')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'app_settings', filter: `id=eq.${APP_SETTINGS_ID}` },
        () => loadAppSettings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  // NEW: announcement open + auto-hide logic
  useEffect(() => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    if (popupTimer.current) clearTimeout(popupTimer.current);
    bannerTimer.current = null;
    popupTimer.current = null;

    // reset UI per new announcement payload
    setBannerVisible(true);
    setPopupOpen(false);

    if (!isAnnouncementActive(announcement)) return;

    const type = (announcement?.type || 'banner') as 'banner' | 'popup';
    const dismissible = announcement?.dismissible !== false;
    const dismissKey = String(announcement?.dismiss_key || 'v1').trim() || 'v1';
    const storageKey = `pb_announcement_dismissed:${dismissKey}`;

    const autoMsRaw = Number((announcement as any)?.auto_hide_ms);
    const autoHideMs =
      Number.isFinite(autoMsRaw) && autoMsRaw > 500 ? Math.round(autoMsRaw) : type === 'popup' ? 12000 : 8000;

    if (type === 'popup') {
      const dismissed = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
      if (!dismissed) {
        setPopupOpen(true);

        popupTimer.current = setTimeout(() => {
          // auto close
          setPopupOpen(false);
          if (dismissible) {
            try {
              localStorage.setItem(storageKey, new Date().toISOString());
            } catch {}
          }
        }, autoHideMs);
      }
      return;
    }

    // banner
    bannerTimer.current = setTimeout(() => {
      setBannerVisible(false);
    }, autoHideMs);

    return () => {
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
      if (popupTimer.current) clearTimeout(popupTimer.current);
      bannerTimer.current = null;
      popupTimer.current = null;
    };
  }, [announcement?.enabled, announcement?.type, announcement?.dismiss_key, announcement?.start_at, announcement?.end_at]);

  const onOpenRestaurantOffer = (merchantId: string, focusItemId: string, promoId?: string) => {
  const q = new URLSearchParams();
  if (focusItemId) q.set('item', focusItemId);
  if (promoId) q.set('promo', promoId);
  router.push(`/customer/restaurant/${merchantId}?${q.toString()}`);
};

  // Saved addresses + initial location
  useEffect(() => {
    if (!user) return;

    const run = async () => {
      try {
        const addresses = await locationService.getSavedAddresses(user.id);
        setSavedAddresses(addresses || []);

        if (addresses && addresses.length > 0) {
          const defaultAddr = addresses.find((a) => a.isdefault) || addresses[0];
          setLocation({
            lat: defaultAddr.latitude,
            lon: defaultAddr.longitude,
            address: defaultAddr.address,
          });
        } else {
          await getCurrentLocation();
          setShowLocationModal(true);
          setShowLocationSearch(true);
        }
      } catch {
        await getCurrentLocation();
      }
    };

    run();
  }, [user?.id]);

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const coords = await locationService.getCurrentLocation();
      const geo = await locationService.reverseGeocode(coords.lat, coords.lon);
      const norm = normalizeReverseGeocodeToString(geo);

      setLocation({
        lat: coords.lat,
        lon: coords.lon,
        address: norm.address || `${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)}`,
      });

      toast.success('Location detected');
    } catch {
      setLocation({ lat: 30.901, lon: 75.8573, address: 'Ludhiana, Punjab, India' });
      toast.info('Using default location');
    } finally {
      setLocationLoading(false);
    }
  };

  // FAST stats using aggregates + small active list
const loadOrdersAndStats = async () => {
  if (!user) return;

  setLoadingActiveOrders(true);
  try {
    const uid = user.id;

    const [totalRes, activeRes, deliveredRes, spentRowsRes, activeListRes] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('customer_id', uid),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('customer_id', uid).in('status', ACTIVE_STATUSES),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('customer_id', uid).eq('status', 'delivered'),

      // ✅ Total spent fallback (avoid total_amount.sum() 400)
      supabase
        .from('orders')
        .select('total_amount')
        .eq('customer_id', uid)
        .eq('status', 'delivered')
        .order('created_at', { ascending: false })
        .limit(500),

      // ✅ Active list (this MUST stay last so activeListRes is correct)
      supabase
        .from('orders')
        .select('id,status,total_amount,merchant_id,created_at,order_number')
        .eq('customer_id', uid)
        .in('status', ACTIVE_STATUSES)
        .order('created_at', { ascending: false })
        .limit(3),
    ]);

    const totalSpent = (spentRowsRes.data || []).reduce((acc: number, r: any) => acc + Number(r?.total_amount || 0), 0);

    setStats({
      totalOrders: totalRes.count || 0,
      activeOrders: activeRes.count || 0,
      completedOrders: deliveredRes.count || 0,
      totalSpent,
    });

    const active = (activeListRes.data || []).map((o: any) => ({
      id: String(o.id),
      ordernumber: o.order_number ?? null,
      status: o.status ?? null,
      total_amount: Number(o.total_amount || 0),
      created_at: o.created_at ?? null,
      merchant_id: o.merchant_id ?? null,
    })) as ActiveOrder[];

    const merchantIds = Array.from(new Set(active.map((x) => x.merchant_id).filter(Boolean))) as string[];
    if (merchantIds.length) {
      const m = await supabase.from('merchants').select('id,business_name,logo_url').in('id', merchantIds).limit(50);
      const mapM = new Map<string, { business_name: string | null; logo_url: string | null }>();
      (m.data || []).forEach((r: any) =>
        mapM.set(String(r.id), { business_name: r.business_name ?? null, logo_url: r.logo_url ?? null })
      );

      active.forEach((a) => {
        const info = mapM.get(String(a.merchant_id || ''));
        if (info) {
          a.merchantName = info.business_name || 'Restaurant';
          a.merchantLogoUrl = info.logo_url || null;
        }
      });
    }

    setActiveOrders(active);
  } catch (e: any) {
    toast.error(e?.message || 'Failed to load order analytics');
    setStats({ totalOrders: 0, activeOrders: 0, completedOrders: 0, totalSpent: 0 });
    setActiveOrders([]);
  } finally {
    setLoadingActiveOrders(false);
  }
};


  // Realtime refresh (throttled)
  const ordersThrottle = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;

    loadOrdersAndStats();

    const ch = supabase
      .channel(`customer-orders-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `customer_id=eq.${user.id}` }, () => {
        if (ordersThrottle.current) return;
        ordersThrottle.current = setTimeout(() => {
          ordersThrottle.current = null;
          loadOrdersAndStats();
        }, 1200);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
      if (ordersThrottle.current) clearTimeout(ordersThrottle.current);
      ordersThrottle.current = null;
    };
  }, [user?.id]);

  // Restaurants: cache + fetch
  useEffect(() => {
    if (!location) return;

    const key = `merchants:${location.lat.toFixed(3)}:${location.lon.toFixed(3)}:${searchRadiusKm}`;

    // Instant cache
    try {
      const cached = sessionStorage.getItem(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) setRestaurants(parsed);
        setLoadingRestaurants(false);
      }
    } catch {}

    const load = async () => {
      setLoadingRestaurants(true);
      try {
        const { data, error } = await supabase
          .from('merchants')
          .select(
            [
              'id',
              'business_name',
              'business_type',
              'cuisine_types',
              'description',
              'logo_url',
              'banner_url',
              'phone',
              'email',
              'latitude',
              'longitude',
              'is_active',
              'is_verified',
              'average_rating',
              'total_reviews',
              'delivery_radius_km',
              'min_order_amount',
              'estimated_prep_time',
              'address',
              'city',
              'state',
              'postal_code',
            ].join(',')
          )
          .eq('is_active', true);

        if (error) throw error;

        const all = (data || []) as any[];

        const withDistance = all
          .map((m) => {
            const lat = Number(m.latitude || 0);
            const lon = Number(m.longitude || 0);
            const dist = lat && lon ? haversineKm(location.lat, location.lon, lat, lon) : Number.POSITIVE_INFINITY;
            return { ...m, distance_km: dist };
          })
          .filter((m) => Number.isFinite(m.distance_km) && m.distance_km <= searchRadiusKm)
          .sort((a, b) => Number(a.distance_km || 0) - Number(b.distance_km || 0));

        setRestaurants(withDistance as any);

        try {
          sessionStorage.setItem(key, JSON.stringify(withDistance));
        } catch {}
      } catch (e: any) {
        setRestaurants([]);
        toast.error(e?.message || 'Failed to load restaurants');
      } finally {
        setLoadingRestaurants(false);
      }
    };

    load();
  }, [location?.lat, location?.lon, searchRadiusKm]);

  // Filter restaurants
  useEffect(() => {
    const f = selectedFilter.toLowerCase();
    if (f === 'all') {
      setFilteredRestaurants(restaurants);
      return;
    }

    const out = restaurants.filter((r) => {
      const cuisines = parseCuisineList((r as any).cuisine_types).map((x) => x.toLowerCase());
      return cuisines.some((c) => c.includes(f));
    });

    setFilteredRestaurants(out);
  }, [selectedFilter, restaurants]);

  // FAST menu search: load menu items only when user types (no preload)
  const setSearchQueryDebounced = (v: string) => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);

    searchDebounce.current = setTimeout(async () => {
      setSearchQuery(v);

      const q = v.trim();
      if (q.length < 2) {
        setMenuItems([]);
        setMenuCountByMerchant({});
        return;
      }

      const ids = filteredRestaurants.slice(0, 60).map((r: any) => r.id).filter(Boolean);
      if (!ids.length) {
        setMenuItems([]);
        setMenuCountByMerchant({});
        return;
      }

      const reqId = ++menuSearchReq.current;

      try {
        const { data, error } = await supabase
          .from('menu_items')
          .select('id,merchant_id,name,description,price,category,image_url,is_available,is_veg,preparation_time,discount_percentage')
          .in('merchant_id', ids)
          .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
          .limit(120);

        if (reqId !== menuSearchReq.current) return;
        if (error) throw error;

        const items = (data || []) as MenuItem[];
        setMenuItems(items);

        const counts: Record<string, number> = {};
        for (const it of items as any[]) counts[it.merchant_id] = (counts[it.merchant_id] || 0) + 1;
        setMenuCountByMerchant(counts);
      } catch {
        if (reqId !== menuSearchReq.current) return;
        setMenuItems([]);
        setMenuCountByMerchant({});
      }
    }, 180);
  };

  // Trending dishes (last 7 days), sorted client-side
// Trending dishes (last 7 days), sorted client-side (NO huge IN(menu_item_id))
useEffect(() => {
  let cancelled = false;

  const loadTrending = async () => {
    if (!location) return;

    const merchantIds = filteredRestaurants.slice(0, 60).map((r: any) => r.id).filter(Boolean);
    if (!merchantIds.length) {
      setTrending([]);
      return;
    }

    const cacheKey = `trending:7d:${location.lat.toFixed(2)}:${location.lon.toFixed(2)}:${searchRadiusKm}:${merchantIds.length}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) setTrending(parsed);
      }
    } catch {}

    setTrendingLoading(true);

    try {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      /**
       * Key idea:
       * - order_items has menu_item_id + quantity + created_at
       * - menu_items has merchant_id
       * So filter order_items by menu_items.merchant_id via an inner join.
       */
      const oiRes = await supabase
        .from('order_items')
        .select('menu_item_id,quantity,created_at,menu_items!inner(merchant_id)')
        .gte('created_at', since)
        .in('menu_items.merchant_id', merchantIds)
        .limit(10000);

      if (oiRes.error) throw oiRes.error;

      // Sum quantities by menu_item_id
      const qtyByItem = new Map<string, number>();
      for (const r of oiRes.data || []) {
        const menuItemId = String((r as any)?.menu_item_id || '');
        const q = Number((r as any)?.quantity || 0);
        if (!menuItemId || !Number.isFinite(q) || q <= 0) continue;
        qtyByItem.set(menuItemId, (qtyByItem.get(menuItemId) || 0) + q);
      }

      const top = Array.from(qtyByItem.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([menu_item_id, totalQty]) => ({ menu_item_id, totalQty }));

      const topItemIds = top.map((x) => x.menu_item_id);
      if (!topItemIds.length) {
        if (!cancelled) setTrending([]);
        return;
      }

      // Fetch item details (includes merchant_id)
      const itemsRes = await supabase
        .from('menu_items')
        .select('id,merchant_id,name,description,price,category,image_url,is_veg,discount_percentage')
        .in('id', topItemIds)
        .limit(200);

      if (itemsRes.error) throw itemsRes.error;

      const itemMap = new Map<string, any>();
      (itemsRes.data || []).forEach((it: any) => itemMap.set(String(it.id), it));

      const topMerchantIds = Array.from(
        new Set((itemsRes.data || []).map((x: any) => String(x.merchant_id || '')).filter(Boolean))
      );

      const merchantsRes = await supabase
        .from('merchants')
        .select('id,business_name')
        .in('id', topMerchantIds)
        .limit(200);

      if (merchantsRes.error) throw merchantsRes.error;

      const merchantMap = new Map<string, string>();
      (merchantsRes.data || []).forEach((m: any) =>
        merchantMap.set(String(m.id), String(m.business_name || 'Restaurant'))
      );

      const merged: TrendingDish[] = top
        .map((t) => {
          const it = itemMap.get(String(t.menu_item_id));
          if (!it) return null;

          return {
            id: String(it.id),
            merchant_id: String(it.merchant_id),
            name: String(it.name || ''),
            description: it.description ?? null,
            price: Number(it.price || 0),
            category: it.category ?? null,
            image_url: it.image_url ?? null,
            discount_percentage: it.discount_percentage ?? null,
            is_veg: it.is_veg ?? null,
            merchantName: merchantMap.get(String(it.merchant_id)) || 'Restaurant',
            totalQty: Number(t.totalQty || 0),
          };
        })
        .filter(Boolean) as TrendingDish[];

      if (!cancelled) {
        setTrending(merged);
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(merged));
        } catch {}
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // If this throws “relationship not found”, you need the FK.
      if (!cancelled) setTrending([]);
    } finally {
      if (!cancelled) setTrendingLoading(false);
    }
  };

  loadTrending();
  return () => {
    cancelled = true;
  };
}, [location?.lat, location?.lon, searchRadiusKm, filteredRestaurants]);

  // Close modals on ESC
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowLocationModal(false);
        setShowLocationSearch(false);
        setPopupOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const onOpenSearchResult = (res: SearchResult) => {
    if (res.type === 'restaurant') {
      router.push(`/customer/restaurant/${(res as any).restaurant.id}`);
      setSearchQuery('');
      return;
    }
    router.push(`/customer/restaurant/${(res as any).menu.merchant_id}?item=${(res as any).menu.id}`);
    setSearchQuery('');
  };

  const handlePickSaved = (addr: SavedAddress) => {
    setLocation({ lat: addr.latitude, lon: addr.longitude, address: addr.address });
    setShowLocationModal(false);
    toast.success(`Location changed to ${addr.label}`);
  };

  const handlePickSearch = (pick: AddressPick) => {
    setLocation({ lat: pick.lat, lon: pick.lon, address: pick.address });
    setShowLocationModal(false);
    setShowLocationSearch(false);
    toast.success('Location updated');
  };

  const socials = useMemo(() => {
    const base = [
      { href: brand.instagram1, label: 'Instagram', Icon: Instagram },
      { href: brand.instagram2, label: 'More', Icon: iconForUrl(brand.instagram2) },
      { href: brand.youtube, label: 'YouTube', Icon: Youtube },
      { href: brand.website, label: 'Website', Icon: Globe },
      { href: brand.facebook, label: 'Facebook', Icon: Facebook },
    ].filter((x) => !!x.href);

    const extra = (customLinks || [])
      .filter((x) => x.enabled !== false && !!x.url)
      .map((x) => ({
        href: x.url,
        label: x.title || 'Link',
        Icon: iconForUrl(x.url),
        logoUrl: x.logo_url || '',
      }));

    return [...base, ...extra];
  }, [brand, customLinks]);

  const closePopup = (mode: 'manual' | 'auto') => {
    setPopupOpen(false);

    const a = announcement;
    if (!a) return;

    const dismissible = a.dismissible !== false;
    if (!dismissible) return;

    const dismissKey = String(a.dismiss_key || 'v1').trim() || 'v1';
    const storageKey = `pb_announcement_dismissed:${dismissKey}`;

    try {
      localStorage.setItem(storageKey, `${mode}:${new Date().toISOString()}`);
    } catch {}
  };

  return (
    <AppShell title={appSettings?.app_name || 'Pattibytes Express'}>
      <div
        className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50"
        style={{ paddingBottom: `calc(${BOTTOM_NAV_PX}px + env(safe-area-inset-bottom))` }}
      >
        <div className="mx-auto w-full max-w-7xl px-2.5 sm:px-3.5 md:px-5 lg:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4">
          <DashboardHeader firstName={firstName} radiusKm={searchRadiusKm} />

          {/* NEW: Banner announcement */}
          {bannerVisible && isAnnouncementActive(announcement) && (announcement?.type || 'banner') === 'banner' && (
            <div className="rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2.5">
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  <div className="w-9 h-9 rounded-xl bg-white border border-orange-200 flex items-center justify-center">
                    <Megaphone className="w-4 h-4 text-primary" />
                  </div>
                </div>

                {!!String(announcement?.image_url || '').trim() && (
                  <img
                    src={String(announcement?.image_url || '')}
                    alt="Announcement"
                    className="w-12 h-12 rounded-xl object-cover bg-white border"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
                  />
                )}

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-extrabold text-gray-900 truncate">
                    {String(announcement?.title || 'Announcement')}
                  </div>

                  {!!String(announcement?.message || '').trim() && (
                    <div className="text-[12px] text-gray-700 mt-0.5">{String(announcement?.message || '')}</div>
                  )}

                  {!!String(announcement?.link_url || '').trim() && (
                    <a
                      href={normalizeHttpUrl(announcement?.link_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] font-semibold text-primary hover:underline mt-1 inline-block"
                    >
                      Learn more →
                    </a>
                  )}
                </div>

                {announcement?.dismissible !== false && (
                  <button
                    type="button"
                    onClick={() => setBannerVisible(false)}
                    className="shrink-0 text-xs font-bold text-gray-700 px-3 py-2 rounded-xl border bg-white hover:bg-gray-50"
                    title="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Presented by + quick actions */}
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-gray-100 px-3 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] text-gray-600 leading-4">{brand.title}</p>

                <p className="text-[11px] text-gray-500 leading-4">
                  For professional queries contact us at{' '}
                  <a
                    href="https://www.pattibytes.com/#collaboration"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-gray-900 hover:underline"
                  >
                    pattibytes.com/collaboration
                  </a>
                </p>

                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText('https://www.pattibytes.com/#collaboration');
                        toast.success('Link copied');
                      } catch {
                        toast.info('Copy not supported on this device');
                      }
                    }}
                    className="text-[11px] px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 font-semibold transition"
                    title="Copy collaboration link"
                  >
                    Copy link
                  </button>

                  <button
                    type="button"
                                        onClick={() => {
                      const email = appSettings?.support_email || 'pbexpress38@gmail.com';
                      window.location.href = `mailto:${email}?subject=Collaboration%20Query&body=Hi%20team,%20`;
                    }}
                    className="text-[11px] px-2.5 py-1.5 rounded-xl bg-gray-900 text-white hover:bg-black font-semibold transition"
                    title="Email us"
                  >
                    Email us
                  </button>
{!!appSettings?.support_phone && (() => {
  const phone = String(appSettings.support_phone).replace(/\D/g, ''); // digits only
  if (!phone) return null;

  return (
    <a
      href={`https://wa.me/${phone}`}
      className="text-[11px] px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 font-semibold transition"
      title="Chat on WhatsApp"
      target="_blank"
      rel="noopener noreferrer"
    >
      WhatsApp us
    </a>
  );
})()}

                </div>

                <div id="collaboration" />
              </div>

              {/* socials */}
              <div className="flex items-center gap-1.5 shrink-0">
                {socials.slice(0, 6).map(({ href, label, Icon, logoUrl }: any) => (
                  <Link
                    key={`${label}-${href}`}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    title={label}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-primary/40 transition active:scale-[0.98] overflow-hidden"
                  >
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={label}
                        loading="lazy"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Icon className="w-4 h-4 text-gray-800" />
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Location */}
          <LocationBar
            address={location?.address || ''}
            radiusKm={searchRadiusKm}
            locationLoading={locationLoading}
            onOpenSaved={() => {
              setShowLocationModal(true);
              setShowLocationSearch(false);
            }}
            onOpenSearch={() => {
              setShowLocationModal(true);
              setShowLocationSearch(true);
            }}
            onDetect={getCurrentLocation}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
            <div className="lg:col-span-8 space-y-3 sm:space-y-4">
              <SearchBox query={searchQuery} setQuery={setSearchQueryDebounced} restaurants={filteredRestaurants} menuItems={menuItems} onOpen={onOpenSearchResult} />

              <StatsCards restaurantsCount={filteredRestaurants.length} totalOrders={stats.totalOrders} activeOrders={stats.activeOrders} totalSpent={stats.totalSpent} />

              {/* Trending dishes */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="min-w-0">
                    <h3 className="text-sm font-extrabold text-gray-900 truncate inline-flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Trending dishes
                    </h3>
                    <p className="text-[11px] text-gray-600 leading-4">Most ordered in last 7 days (nearby).</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setTrendingLoading(true);
                      setTimeout(() => setTrendingLoading(false), 250);
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-800 transition"
                    title="Refresh"
                  >
                    <RefreshCcw className="w-4 h-4" />
                    Refresh
                  </button>
                </div>

                {trendingLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
                    ))}
                  </div>
                ) : trending.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3 text-center">
                    <p className="text-xs text-gray-700 font-semibold">Trending will appear after some orders.</p>
                  </div>
                ) : (
                  <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                    {trending.map((d) => {
                      const img = String(d.image_url || '').trim();
                      const price = finalPrice(d.price, d.discount_percentage);

                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => router.push(`/customer/restaurant/${d.merchant_id}?item=${d.id}`)}
                          className="min-w-[220px] max-w-[220px] text-left bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-primary/30 transition overflow-hidden"
                        >
                          <div className="h-24 bg-gray-100 relative">
                            {showMenuImages && img ? (
                              <img
                                src={img}
                                alt={d.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <ImageIcon className="w-6 h-6" />
                              </div>
                            )}
                          </div>

                          <div className="p-3">
                            <div className="text-xs text-gray-600 font-semibold truncate">{d.merchantName}</div>
                            <div className="font-extrabold text-gray-900 truncate">{d.name}</div>
                            <div className="mt-1 flex items-center justify-between">
                              <div className="text-sm font-extrabold text-gray-900">₹{price.toFixed(0)}</div>
                              <div className="text-[11px] font-bold text-primary">
                                {d.totalQty}+ orders <ArrowRight className="inline w-3.5 h-3.5" />
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Active orders */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="min-w-0">
                    <h3 className="text-sm font-extrabold text-gray-900 truncate">Active orders</h3>
                    <p className="text-[11px] text-gray-600 leading-4">Quick access to what’s in progress.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={loadOrdersAndStats}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-800 transition"
                      title="Refresh"
                    >
                      <RefreshCcw className="w-4 h-4" />
                      <span className="hidden sm:inline">{loadingActiveOrders ? 'Refreshing…' : 'Refresh'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push('/customer/orders')}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-white hover:bg-orange-600 text-xs font-semibold transition"
                    >
                      <Receipt className="w-4 h-4" />
                      View
                    </button>
                  </div>
                </div>

                {loadingActiveOrders ? (
                  <div className="space-y-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />
                    ))}
                  </div>
                ) : activeOrders.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3 text-center">
                    <p className="text-xs text-gray-700 font-semibold">No active orders right now.</p>
                    <p className="text-[11px] text-gray-600 mt-1">Place an order and it will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeOrders.map((o) => {
                      const total = o.total_amount || 0;
                      const created = o.created_at || null;

                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => router.push(`/customer/orders/${o.id}`)}
                          className="w-full text-left rounded-xl border border-gray-200 hover:border-primary/30 hover:bg-orange-50/40 transition px-3 py-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-extrabold text-gray-900 truncate">
                                {o.merchantName || 'Restaurant'} • Order #{o.ordernumber ?? o.id.slice(0, 6)}
                              </p>
                              <p className="text-[11px] text-gray-600 mt-0.5 truncate">
                                Status: {String(o.status || 'pending').toLowerCase()} • {tinyTime(created)}
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              <p className="text-xs font-extrabold text-primary">₹{toMoney(total)}</p>
                              <p className="text-[11px] text-gray-500 mt-0.5">Tap to track</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <CuisineFilters selected={selectedFilter} onSelect={setSelectedFilter} />

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-4">
                <div className="flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-sm sm:text-base font-extrabold text-gray-900 truncate">
                      {selectedFilter === 'all' ? 'Restaurants near you' : selectedFilter}
                    </h2>
                    <p className="text-[11px] text-gray-600">
                      {filteredRestaurants.length} found • within {searchRadiusKm}km
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => router.push('/customer/cart')}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-800 transition"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      Cart
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push('/customer/orders')}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 text-white hover:bg-black text-xs font-semibold transition"
                    >
                      <Truck className="w-4 h-4" />
                      Orders
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                 <RestaurantGrid
  loading={loadingRestaurants}
  restaurants={filteredRestaurants}
  menuCountByMerchant={menuCountByMerchant}
  onOpenRestaurant={(id) => router.push(`/customer/restaurant/${id}`)}
  offerByMerchant={offerByMerchant}
  onOpenRestaurantOffer={onOpenRestaurantOffer}
/>

                </div>
              </div>
            </div>

            {/* Right rail */}
            <div className="hidden lg:block lg:col-span-4 space-y-3">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <p className="text-sm font-extrabold text-gray-900">Quick links</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => router.push('/customer/cart')}
                    className="px-3 py-2.5 rounded-xl bg-orange-50 text-primary font-semibold text-xs hover:bg-orange-100 transition"
                  >
                    Open cart
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/customer/orders')}
                    className="px-3 py-2.5 rounded-xl bg-gray-100 text-gray-900 font-semibold text-xs hover:bg-gray-200 transition"
                  >
                    My orders
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/customer/profile')}
                    className="px-3 py-2.5 rounded-xl bg-gray-100 text-gray-900 font-semibold text-xs hover:bg-gray-200 transition"
                  >
                    Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/customer/notifications')}
                    className="px-3 py-2.5 rounded-xl bg-gray-100 text-gray-900 font-semibold text-xs hover:bg-gray-200 transition"
                  >
                    Alerts
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500 via-pink-500 to-purple-500 rounded-2xl shadow-lg p-4 text-white">
                <p className="text-sm font-extrabold">Tip</p>
                <p className="text-[12px] text-white/90 mt-1">Search dishes first—results load only when you type (faster on mobile).</p>
              </div>
            </div>
          </div>

          <div className="pt-1 text-center">
            <p className="text-[11px] text-gray-600">
              {brand.title} • Developed with ❤️ by{' '}
              <Link
                href="https://www.instagram.com/thrillyverse"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-gray-900 hover:underline"
              >
                Thrillyverse
              </Link>
            </p>
          </div>
        </div>

        {/* NEW: Popup announcement */}
        {isAnnouncementActive(announcement) && (announcement?.type || 'banner') === 'popup' && popupOpen && (
          <div className="fixed inset-0 z-[9999]">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => {
                if (announcement?.dismissible === false) return;
                closePopup('manual');
              }}
              aria-hidden="true"
            />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
                {!!String(announcement?.image_url || '').trim() && (
                  <div className="h-40 bg-gray-100">
                    <img
                      src={String(announcement?.image_url || '')}
                      alt="Announcement"
                      className="w-full h-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
                    />
                  </div>
                )}

                <div className="p-4">
                  <div className="text-lg font-extrabold text-gray-900">{String(announcement?.title || 'Announcement')}</div>
                  {!!String(announcement?.message || '').trim() && (
                    <div className="text-sm text-gray-700 mt-2">{String(announcement?.message || '')}</div>
                  )}

                  <div className="mt-4 flex items-center justify-end gap-2">
                    {!!String(announcement?.link_url || '').trim() && (
                      <a
                        href={normalizeHttpUrl(announcement?.link_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-xl bg-primary text-white font-extrabold hover:bg-orange-600"
                      >
                        Open
                      </a>
                    )}

                    {announcement?.dismissible !== false ? (
                      <button
                        type="button"
                        onClick={() => closePopup('manual')}
                        className="px-4 py-2 rounded-xl border bg-white font-extrabold hover:bg-gray-50"
                      >
                        Close
                      </button>
                    ) : null}
                  </div>

                  <p className="text-[11px] text-gray-500 mt-3">
                    This popup auto-hides after a few seconds (or you can close it).
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <LocationModal
          open={showLocationModal}
          title="Choose location"
          savedAddresses={savedAddresses}
          showSearch={showLocationSearch}
          onClose={() => setShowLocationModal(false)}
          onToggleSearch={() => setShowLocationSearch((v) => !v)}
          onPickAddressSearch={handlePickSearch}
          onPickSaved={handlePickSaved}
        />
      </div>
    </AppShell>
  );
}
