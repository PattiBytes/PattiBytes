/* eslint-disable @typescript-eslint/no-unused-vars */
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
  Sparkles,
  Zap,
  Gift,
  Percent,
  Star,
  Clock,
  MapPin,
  ChevronRight,
  Flame,
  Store,
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
import CustomOrderSection from '@/components/customer-dashboard/CustomOrderSection';

import type { AddressPick } from '@/components/AddressAutocomplete';

import type { OfferBadge, PromoCodeRow, BxgyTargetRow } from '@/components/customer-dashboard/offers';
import { isPromoActiveNow } from '@/components/customer-dashboard/offers';

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
  start_at?: string;
  end_at?: string;
  dismissible?: boolean;
  dismiss_key?: string;
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

type OfferItem = {
  id: string;
  merchant_id: string;
  merchantName: string;
  merchantLogo?: string | null;
  menuItemId?: string;
  menuItemName?: string;
  offerLabel: string;
  offerSubLabel?: string;
  promoCode?: string;
  image_url?: string | null;
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

  const [searchRadiusKm, setSearchRadiusKm] = useState<number>(9999);

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

  // NEW: Offers
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);

  const [brand, setBrand] = useState({
    title: 'Presented by Pattibytes',
    instagram1: 'https://www.instagram.com/pb_express38',
    instagram2: 'https://instagram.com/patti_bytes',
    youtube: 'https://www.youtube.com/@pattibytes',
    website: 'https://www.pattibytes.com',
    facebook: 'https://www.facebook.com/ipattibytes',
  });

  // Announcement UI state
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

  const [offerByMerchant, setOfferByMerchant] = useState<Record<string, OfferBadge | null>>({});

  function pickName(names: string[]) {
    if (names.length <= 1) return names[0] || '';
    return `${names[0]} +${names.length - 1}`;
  }

  function buildBxgyLabel(promo: any, buyNames: string[], getNames: string[]): OfferBadge {
    const discType = String(promo.deal_json?.get?.discount?.type ?? 'free');
    const discVal = Number(promo.deal_json?.get?.discount?.value ?? 0);
    const disc =
      discType === 'free' ? 'FREE' : discType === 'percentage' ? `${discVal}% OFF` : `₹${discVal} OFF`;

    const buy = pickName(buyNames);
    const get = pickName(getNames);

    if (buy && get) return { label: `Buy ${buy} Get ${get} ${disc}`, subLabel: 'Offer', auto: Boolean(promo.auto_apply) };

    const buyQty = Number(promo.deal_json?.buy?.qty ?? 1);
    const getQty = Number(promo.deal_json?.get?.qty ?? 1);
    return { label: `Buy ${buyQty} Get ${getQty} ${disc}`, subLabel: 'Offer', auto: Boolean(promo.auto_apply) };
  }

  useEffect(() => {
    const run = async () => {
      const merchantIds = filteredRestaurants.slice(0, 60).map((r) => String(r.id)).filter(Boolean);
      if (!merchantIds.length) return setOfferByMerchant({});

      const { data: promoRows, error: promoErr } = await supabase
        .from('promo_codes')
        .select(
          'id,scope,merchant_id,deal_type,deal_json,discount_type,discount_value,min_order_amount,is_active,valid_from,valid_until,valid_days,valid_time_start,valid_time_end,start_time,end_time,auto_apply,priority'
        )
        .eq('is_active', true)
        .eq('scope', 'merchant')
        .in('merchant_id', merchantIds)
        .order('priority', { ascending: false })
        .order('valid_until', { ascending: true });

      if (promoErr) return setOfferByMerchant({});

      const now = new Date();
      const promos = (promoRows ?? []).filter((p: any) => isPromoActiveNow(p, now));

      const bestByMerchant: Record<string, any> = {};
      for (const p of promos) {
        const mid = String(p.merchant_id || '');
        if (!mid) continue;
        if (!bestByMerchant[mid]) bestByMerchant[mid] = p;
      }

      const chosen = Object.values(bestByMerchant);
      const bxgyIds = chosen.filter((p: any) => p.deal_type === 'bxgy').map((p: any) => p.id);

      let targets: any[] = [];
      if (bxgyIds.length) {
        const { data: tRows } = await supabase
          .from('promo_bxgy_targets')
          .select('id,promo_code_id,side,menu_item_id,category_id,created_at')
          .in('promo_code_id', bxgyIds);

        targets = tRows ?? [];
      }

      const menuItemIds = Array.from(new Set(targets.map((t) => t.menu_item_id).filter(Boolean).map(String)));
      const menuNameById = new Map<string, string>();

      if (menuItemIds.length) {
        const { data: items } = await supabase
          .from('menu_items')
          .select('id,name')
          .in('id', menuItemIds)
          .limit(500);

        (items ?? []).forEach((it: any) => menuNameById.set(String(it.id), String(it.name || 'Item')));
      }

      const out: Record<string, OfferBadge | null> = {};
      for (const mid of merchantIds) {
        const promo = bestByMerchant[mid];
        if (!promo) {
          out[mid] = null;
          continue;
        }

        if (promo.deal_type === 'bxgy') {
          const ts = targets.filter((t) => t.promo_code_id === promo.id);

          const buyNames = Array.from(
            new Set(ts.filter((t) => t.side === 'buy').map((t) => menuNameById.get(String(t.menu_item_id)) || '').filter(Boolean))
          );
          const getNames = Array.from(
            new Set(ts.filter((t) => t.side === 'get').map((t) => menuNameById.get(String(t.menu_item_id)) || '').filter(Boolean))
          );

          out[mid] = buildBxgyLabel(promo, buyNames, getNames);
        } else {
          const dt = String(promo.discount_type ?? 'percentage');
          const dv = Number(promo.discount_value ?? 0);
          if (!dv) {
            out[mid] = null;
            continue;
          }

          const label = dt === 'percentage' ? `${dv}% OFF` : `₹${dv} OFF`;
          const min = Number(promo.min_order_amount ?? 0);

          out[mid] = { label, subLabel: min > 0 ? `Min ₹${min}` : undefined, auto: Boolean(promo.auto_apply) };
        }
      }

      setOfferByMerchant(out);
    };

    run();
  }, [filteredRestaurants]);

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
      } catch {}
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

  // Announcement open + auto-hide logic
  useEffect(() => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    if (popupTimer.current) clearTimeout(popupTimer.current);
    bannerTimer.current = null;
    popupTimer.current = null;

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

  // Load orders and stats
  const loadOrdersAndStats = async () => {
    if (!user) return;

    setLoadingActiveOrders(true);
    try {
      const uid = user.id;

      const [totalRes, activeRes, deliveredRes, spentRowsRes, activeListRes] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('customer_id', uid),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('customer_id', uid).in('status', ACTIVE_STATUSES),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('customer_id', uid).eq('status', 'delivered'),

        supabase
          .from('orders')
          .select('total_amount')
          .eq('customer_id', uid)
          .eq('status', 'delivered')
          .order('created_at', { ascending: false })
          .limit(500),

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

    const key = `merchants:${location.lat.toFixed(3)}:${location.lon.toFixed(3)}:all`;  // Changed key                //}:${searchRadiusKm}`;

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
              'opening_time',
              'closing_time',
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
  }, [location?.lat, location?.lon]);

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

  // Menu search
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

  // Trending dishes (last 7 days)
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

        const oiRes = await supabase
          .from('order_items')
          .select('menu_item_id,quantity,created_at,menu_items!inner(merchant_id)')
          .gte('created_at', since)
          .in('menu_items.merchant_id', merchantIds)
          .limit(10000);

        if (oiRes.error) throw oiRes.error;

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
      } catch (e) {
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

  // NEW: Load offers
  useEffect(() => {
    let cancelled = false;

    const loadOffers = async () => {
      if (!location) return;

      const merchantIds = filteredRestaurants.slice(0, 60).map((r: any) => r.id).filter(Boolean);
      if (!merchantIds.length) {
        setOffers([]);
        return;
      }

      setOffersLoading(true);

      try {
        const { data: promoRows, error: promoErr } = await supabase
          .from('promo_codes')
          .select(
            'id,code,scope,merchant_id,deal_type,deal_json,discount_type,discount_value,min_order_amount,is_active,valid_from,valid_until,valid_days,valid_time_start,valid_time_end,start_time,end_time,auto_apply,priority'
          )
          .eq('is_active', true)
          .eq('scope', 'merchant')
          .in('merchant_id', merchantIds)
          .order('priority', { ascending: false })
          .limit(20);

        if (promoErr) throw promoErr;

        const now = new Date();
        const activePromos = (promoRows ?? []).filter((p: any) => isPromoActiveNow(p, now));

        if (!activePromos.length) {
          if (!cancelled) setOffers([]);
          return;
        }

        const bxgyPromos = activePromos.filter((p: any) => p.deal_type === 'bxgy');
        const bxgyIds = bxgyPromos.map((p: any) => p.id);

        let targets: any[] = [];
        if (bxgyIds.length) {
          const { data: tRows } = await supabase
            .from('promo_bxgy_targets')
            .select('id,promo_code_id,side,menu_item_id,category_id')
            .in('promo_code_id', bxgyIds);

          targets = tRows ?? [];
        }

        const menuItemIds = Array.from(new Set(targets.map((t) => t.menu_item_id).filter(Boolean).map(String)));
        const menuItemsMap = new Map<string, any>();

        if (menuItemIds.length) {
          const { data: items } = await supabase
            .from('menu_items')
            .select('id,name,image_url,merchant_id')
            .in('id', menuItemIds)
            .limit(500);

          (items ?? []).forEach((it: any) => menuItemsMap.set(String(it.id), it));
        }

        const merchantsMap = new Map<string, any>();
        const { data: merch } = await supabase
          .from('merchants')
          .select('id,business_name,logo_url')
          .in('id', merchantIds)
          .limit(200);

        (merch ?? []).forEach((m: any) => merchantsMap.set(String(m.id), m));

        const offerItems: OfferItem[] = [];

        for (const promo of activePromos) {
          const mid = String(promo.merchant_id || '');
          if (!mid) continue;

          const merchant = merchantsMap.get(mid);
          if (!merchant) continue;

          if (promo.deal_type === 'bxgy') {
            const ts = targets.filter((t) => t.promo_code_id === promo.id);
            const buyTargets = ts.filter((t) => t.side === 'buy');
            const getTargets = ts.filter((t) => t.side === 'get');

            const buyItemId = buyTargets[0]?.menu_item_id;
            const getItemId = getTargets[0]?.menu_item_id;

            const buyItem = buyItemId ? menuItemsMap.get(String(buyItemId)) : null;
            const getItem = getItemId ? menuItemsMap.get(String(getItemId)) : null;

            const discType = String(promo.deal_json?.get?.discount?.type ?? 'free');
            const discVal = Number(promo.deal_json?.get?.discount?.value ?? 0);
            const disc =
              discType === 'free' ? 'FREE' : discType === 'percentage' ? `${discVal}% OFF` : `₹${discVal} OFF`;

            offerItems.push({
              id: String(promo.id),
              merchant_id: mid,
              merchantName: String(merchant.business_name || 'Restaurant'),
              merchantLogo: merchant.logo_url ?? null,
              menuItemId: buyItemId || getItemId || undefined,
              menuItemName: buyItem?.name || getItem?.name || undefined,
              offerLabel: `Buy ${buyItem?.name || '1'} Get ${getItem?.name || '1'} ${disc}`,
              offerSubLabel: 'BXGY Offer',
              promoCode: String(promo.code || ''),
              image_url: buyItem?.image_url || getItem?.image_url || null,
            });
          } else {
            const dt = String(promo.discount_type ?? 'percentage');
            const dv = Number(promo.discount_value ?? 0);
            if (!dv) continue;

            const label = dt === 'percentage' ? `${dv}% OFF` : `₹${dv} OFF`;
            const min = Number(promo.min_order_amount ?? 0);

            offerItems.push({
              id: String(promo.id),
              merchant_id: mid,
              merchantName: String(merchant.business_name || 'Restaurant'),
              merchantLogo: merchant.logo_url ?? null,
              offerLabel: label,
              offerSubLabel: min > 0 ? `Min ₹${min}` : 'Sitewide',
              promoCode: String(promo.code || ''),
              image_url: merchant.logo_url ?? null,
            });
          }
        }

        if (!cancelled) setOffers(offerItems.slice(0, 12));
      } catch (e) {
        if (!cancelled) setOffers([]);
      } finally {
        if (!cancelled) setOffersLoading(false);
      }
    };

    loadOffers();
    return () => {
      cancelled = true;
    };
  }, [location?.lat, location?.lon, filteredRestaurants]);

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
          {/* Top: Location + Search */}
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

          {/* Banner announcement */}
          {bannerVisible &&
            isAnnouncementActive(announcement) &&
            (announcement?.type || 'banner') === 'banner' && (
              <div className="rounded-2xl border-2 border-orange-300 bg-gradient-to-r from-orange-100 via-pink-100 to-purple-100 px-3 py-3 shadow-lg animate-in slide-in-from-top duration-500">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    <div className="w-10 h-10 rounded-xl bg-white border-2 border-primary flex items-center justify-center shadow-md">
                      <Megaphone className="w-5 h-5 text-primary animate-pulse" />
                    </div>
                  </div>

                  {!!String(announcement?.image_url || '').trim() && (
                    <img
                      src={String(announcement?.image_url || '')}
                      alt="Announcement"
                      className="w-14 h-14 rounded-xl object-cover bg-white border-2 border-white shadow-md"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-extrabold text-gray-900 truncate flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      {String(announcement?.title || 'Announcement')}
                    </div>

                    {!!String(announcement?.message || '').trim() && (
                      <div className="text-xs text-gray-800 mt-1 font-semibold">{String(announcement?.message || '')}</div>
                    )}

                    {!!String(announcement?.link_url || '').trim() && (
                      <a
                        href={normalizeHttpUrl(announcement?.link_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-primary hover:underline mt-1.5 inline-flex items-center gap-1"
                      >
                        Learn more <ChevronRight className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {announcement?.dismissible !== false && (
                    <button
                      type="button"
                      onClick={() => setBannerVisible(false)}
                      className="shrink-0 p-2 rounded-xl border-2 border-white bg-white/80 hover:bg-white shadow-sm transition-all"
                      title="Dismiss"
                    >
                      <X className="w-4 h-4 text-gray-700" />
                    </button>
                  )}
                </div>
              </div>
            )}

          {/* Active orders (ENHANCED) */}
          <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-2xl shadow-lg border-2 border-blue-200 p-4 sm:p-5 animate-in fade-in duration-500">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="min-w-0">
                <h3 className="text-base font-black text-gray-900 truncate flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center shadow-md">
                    <Truck className="w-4 h-4 text-white" />
                  </div>
                  Active Orders
                </h3>
                <p className="text-xs text-gray-700 leading-4 mt-0.5 font-semibold">Track your orders in real-time</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadOrdersAndStats}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-blue-200 bg-white hover:bg-blue-50 text-xs font-bold text-gray-900 transition-all hover:scale-105"
                  title="Refresh"
                >
                  <RefreshCcw className={`w-4 h-4 ${loadingActiveOrders ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{loadingActiveOrders ? 'Refreshing…' : 'Refresh'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => router.push('/customer/orders')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-pink-500 text-white hover:shadow-xl text-xs font-bold transition-all hover:scale-105"
                >
                  <Receipt className="w-4 h-4" />
                  View All
                </button>
              </div>
            </div>

            {loadingActiveOrders ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-2xl bg-gradient-to-r from-gray-100 to-gray-200 animate-pulse" />
                ))}
              </div>
            ) : activeOrders.length === 0 ? (
  <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white/80 px-4 py-3 flex items-center gap-3">
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0">
      <ShoppingBag className="w-5 h-5 text-gray-400" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-sm text-gray-900 font-bold">No active orders</p>
      <p className="text-xs text-gray-600">Place an order to track here</p>
    </div>
  </div>
) : (
              <div className="space-y-3">
                {activeOrders.map((o) => {
                  const total = o.total_amount || 0;
                  const created = o.created_at || null;

                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => router.push(`/customer/orders/${o.id}`)}
                      className="w-full text-left rounded-2xl border-2 border-blue-200 hover:border-primary hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-all px-4 py-3 bg-white shadow-sm hover:shadow-lg hover:scale-[1.02]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black text-gray-900 truncate flex items-center gap-2">
                            {o.merchantLogoUrl && (
                              <img
                                src={o.merchantLogoUrl}
                                alt=""
                                className="w-6 h-6 rounded-full border-2 border-primary object-cover"
                                onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
                              />
                            )}
                            {o.merchantName || 'Restaurant'}
                          </p>
                          <p className="text-xs text-gray-700 mt-1 truncate font-semibold">
                            Order #{o.ordernumber ?? o.id.slice(0, 6)} • {String(o.status || 'pending').toLowerCase()}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {tinyTime(created)}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-base font-black bg-gradient-to-r from-primary to-pink-600 bg-clip-text text-transparent">
                            ₹{toMoney(total)}
                          </p>
                          <div className="mt-1 flex items-center gap-1 text-primary text-xs font-bold">
                            Track
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <SearchBox
            query={searchQuery}
            setQuery={setSearchQueryDebounced}
            restaurants={filteredRestaurants}
            menuItems={menuItems}
            onOpen={onOpenSearchResult}
          />

          {/* Filters */}
          <CuisineFilters selected={selectedFilter} onSelect={setSelectedFilter} />

         

          {/* Restaurants */}
          <div className="bg-white rounded-3xl shadow-xl border-2 border-gray-200 p-4 sm:p-5">
            <div className="flex items-end justify-between gap-2 mb-4">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-black text-gray-900 truncate flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center shadow-lg">
                    <Store className="w-5 h-5 text-white" />
                  </div>
                  {selectedFilter === 'all' ? 'Restaurants near you' : selectedFilter}
                </h2>
                <p className="text-xs text-gray-700 font-semibold flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" />
                  {filteredRestaurants.length} found • within {searchRadiusKm}km
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => router.push('/customer/cart')}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-900 transition-all hover:scale-105 shadow-sm"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Cart
                </button>

                <button
                  type="button"
                  onClick={() => router.push('/customer/orders')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-gray-900 to-gray-700 text-white hover:shadow-xl text-xs font-bold transition-all hover:scale-105"
                >
                  <Truck className="w-4 h-4" />
                  Orders
                </button>
              </div>
            </div>

            <div className="mt-4">
              <RestaurantGrid
                loading={loadingRestaurants}
                restaurants={filteredRestaurants}
                menuCountByMerchant={menuCountByMerchant}
                offerByMerchant={offerByMerchant}
                onOpenRestaurant={(id) => router.push(`/customer/restaurant/${id}`)}
                onOpenRestaurantOffer={(merchantId, focusItemId, promoId) => {
                  const qs = new URLSearchParams();
                  qs.set('item', focusItemId);
                  if (promoId) qs.set('promo', promoId);
                  router.push(`/customer/restaurant/${merchantId}?${qs.toString()}`);
                }}
              />
            </div>
          </div>

                         {/* NEW: TRENDING & OFFERS HERO SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* NEW: TRENDING DISHES - OPTIMIZED */}
<div className="bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 rounded-3xl shadow-2xl border-2 border-primary p-5 animate-in slide-in-from-left duration-700">
  <div className="flex items-center justify-between gap-2 mb-4">
    <div className="min-w-0">
      <h3 className="text-lg font-black text-gray-900 truncate inline-flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shadow-lg animate-pulse">
          <Flame className="w-5 h-5 text-white" />
        </div>
        Trending Now
      </h3>
      <p className="text-xs text-gray-700 leading-4 mt-1 font-bold flex items-center gap-1">
        <TrendingUp className="w-3 h-3" />
        Most ordered in last 7 days
      </p>
    </div>
    <button
      type="button"
      onClick={() => {
        setTrendingLoading(true);
        setTimeout(() => setTrendingLoading(false), 250);
      }}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-primary bg-white hover:bg-orange-50 text-xs font-bold text-gray-900 transition-all hover:scale-105 shadow-md"
      title="Refresh"
    >
      <RefreshCcw className={`w-4 h-4 ${trendingLoading ? 'animate-spin' : ''}`} />
    </button>
  </div>

  {trendingLoading ? (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-32 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse" />
      ))}
    </div>
  ) : trending.length === 0 ? (
    <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white/80 px-4 py-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0">
        <Zap className="w-5 h-5 text-gray-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-900 font-bold">Trending will appear soon</p>
        <p className="text-xs text-gray-600">After some orders are placed</p>
      </div>
    </div>
  ) : (
    <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
      {trending.map((d, index) => {
        const img = String(d.image_url || '').trim();
        const price = finalPrice(d.price, d.discount_percentage);

        return (
          <button
            key={d.id}
            type="button"
            onClick={() => router.push(`/customer/restaurant/${d.merchant_id}?item=${d.id}`)}
            className="min-w-[160px] max-w-[160px] text-left bg-white border-2 border-gray-200 rounded-2xl shadow-lg hover:shadow-2xl hover:border-primary hover:scale-105 transition-all duration-300 overflow-hidden animate-in fade-in slide-in-from-bottom flex-shrink-0"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            {/* Image Section - Smaller */}
            <div className="h-20 bg-gradient-to-br from-gray-100 to-gray-200 relative">
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
              {d.discount_percentage && d.discount_percentage > 0 && (
                <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-red-500 text-white text-xs font-black shadow-lg">
                  {d.discount_percentage}%
                </div>
              )}
              <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-primary text-white text-xs font-black shadow-lg flex items-center gap-0.5">
                <Flame className="w-2.5 h-2.5" />#{index + 1}
              </div>
            </div>

            {/* Content Section - Compact */}
            <div className="p-2.5">
              <div className="text-xs text-gray-600 font-bold truncate mb-0.5">{d.merchantName}</div>
              <div className="font-black text-gray-900 truncate text-sm">{d.name}</div>
              <div className="mt-1.5 flex items-center justify-between">
                <div className="text-sm font-black bg-gradient-to-r from-primary to-pink-600 bg-clip-text text-transparent">
                  ₹{price.toFixed(0)}
                </div>
                <div className="text-xs font-black text-primary flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" />
                  {d.totalQty}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  )}
</div>


            {/* HOT OFFERS (NEW ULTRA ENHANCED) */}
            <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-3xl shadow-2xl border-2 border-green-400 p-5 animate-in slide-in-from-right duration-700">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="min-w-0">
                  <h3 className="text-lg font-black text-gray-900 truncate inline-flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg animate-bounce">
                      <Gift className="w-5 h-5 text-white" />
                    </div>
                    Hot Offers
                  </h3>
                  <p className="text-xs text-gray-700 leading-4 mt-1 font-bold flex items-center gap-1">
                    <Percent className="w-3 h-3" />
                    Limited time deals near you
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setOffersLoading(true);
                    setTimeout(() => setOffersLoading(false), 250);
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-green-500 bg-white hover:bg-green-50 text-xs font-bold text-gray-900 transition-all hover:scale-105 shadow-md"
                  title="Refresh"
                >
                  <RefreshCcw className={`w-4 h-4 ${offersLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {offersLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-32 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse" />
                  ))}
                </div>
              ) : offers.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-white/80 p-6 text-center">
                  <Gift className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-900 font-bold">No offers available</p>
                  <p className="text-xs text-gray-600 mt-1">Check back later for deals</p>
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                  {offers.map((offer, index) => {
                    return (
                      <button
                        key={offer.id}
                        type="button"
                        onClick={() => {
                          if (offer.menuItemId) {
                            router.push(`/customer/restaurant/${offer.merchant_id}?item=${offer.menuItemId}`);
                          } else {
                            router.push(`/customer/restaurant/${offer.merchant_id}`);
                          }
                        }}
                        className="min-w-[200px] max-w-[200px] text-left bg-white border-2 border-gray-200 rounded-2xl shadow-lg hover:shadow-2xl hover:border-green-500 hover:scale-105 transition-all duration-300 overflow-hidden animate-in fade-in slide-in-from-bottom"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="h-28 bg-gradient-to-br from-green-100 via-emerald-100 to-teal-100 relative flex items-center justify-center">
                          {offer.image_url ? (
                            <img
                              src={offer.image_url}
                              alt={offer.offerLabel}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
                            />
                          ) : (
                            <div className="text-center p-4">
                              <Sparkles className="w-12 h-12 mx-auto text-green-500 mb-2 animate-pulse" />
                              <div className="text-lg font-black text-gray-900">{offer.offerLabel}</div>
                            </div>
                          )}
                          <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-black shadow-lg animate-pulse">
                            HOT
                          </div>
                        </div>

                        <div className="p-3">
                          <div className="flex items-center gap-2 mb-1">
                            {offer.merchantLogo && (
                              <img
                                src={offer.merchantLogo}
                                alt=""
                                className="w-5 h-5 rounded-full border border-gray-300 object-cover"
                                onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
                              />
                            )}
                            <div className="text-xs text-gray-600 font-bold truncate">{offer.merchantName}</div>
                          </div>
                          <div className="font-black text-gray-900 text-sm truncate">{offer.offerLabel}</div>
                          {offer.offerSubLabel && (
                            <div className="text-xs text-gray-600 mt-0.5 font-semibold">{offer.offerSubLabel}</div>
                          )}
                          <div className="mt-2 px-2 py-1 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-black text-center shadow-md">
                            CODE: {offer.promoCode}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-gradient-to-r from-white via-orange-50 to-pink-50 rounded-2xl shadow-sm border border-gray-200 px-3 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-gray-700 leading-4 font-bold">{brand.title}</p>
                  <p className="text-xs text-gray-600 leading-4 mt-1">
                    For professional queries contact us at{' '}
                    <a
                      href="https://www.pattibytes.com/#collaboration"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-gray-900 hover:underline"
                    >
                      pattibytes.com/collaboration
                    </a>
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
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
                      className="text-xs px-3 py-1.5 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50 text-gray-900 font-bold transition-all hover:scale-105"
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
                      className="text-xs px-3 py-1.5 rounded-xl bg-gray-900 text-white hover:bg-black font-bold transition-all hover:scale-105"
                      title="Email us"
                    >
                      Email us
                    </button>

                    {!!appSettings?.support_phone &&
                      (() => {
                        const phone = String(appSettings.support_phone).replace(/\D/g, '');
                        if (!phone) return null;

                        return (
                          <a
                            href={`https://wa.me/${phone}`}
                            className="text-xs px-3 py-1.5 rounded-xl border-2 border-green-500 bg-white hover:bg-green-50 text-gray-900 font-bold transition-all hover:scale-105"
                            title="Chat on WhatsApp"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            WhatsApp us
                          </a>
                        );
                      })()}
                  </div>
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
                      className="inline-flex items-center justify-center w-10 h-10 rounded-xl border-2 border-gray-200 bg-white shadow-sm hover:shadow-lg hover:border-primary hover:scale-110 transition-all active:scale-95 overflow-hidden"
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
                        <Icon className="w-5 h-5 text-gray-900" />
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-1 text-center">
              <p className="text-xs text-gray-600">
                {brand.title} • Developed with ❤️ by{' '}
                <Link
                  href="https://www.instagram.com/thrillyverse"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-gray-900 hover:underline"
                >
                  Thrillyverse
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Popup announcement */}
        {isAnnouncementActive(announcement) && (announcement?.type || 'banner') === 'popup' && popupOpen && (
          <div className="fixed inset-0 z-[9999] animate-in fade-in duration-300">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                if (announcement?.dismissible === false) return;
                closePopup('manual');
              }}
              aria-hidden="true"
            />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-primary animate-in zoom-in slide-in-from-bottom duration-500">
                {!!String(announcement?.image_url || '').trim() && (
                  <div className="h-48 bg-gradient-to-br from-orange-100 to-pink-100">
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

                <div className="p-6">
                  <div className="text-xl font-black text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                    {String(announcement?.title || 'Announcement')}
                  </div>
                  {!!String(announcement?.message || '').trim() && (
                    <div className="text-sm text-gray-700 mt-3 font-semibold">{String(announcement?.message || '')}</div>
                  )}

                  <div className="mt-6 flex items-center justify-end gap-3">
                    {!!String(announcement?.link_url || '').trim() && (
                      <a
                        href={normalizeHttpUrl(announcement?.link_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-pink-600 text-white font-black hover:shadow-xl transition-all hover:scale-105"
                      >
                        Open Link
                      </a>
                    )}

                    {announcement?.dismissible !== false ? (
                      <button
                        type="button"
                        onClick={() => closePopup('manual')}
                        className="px-6 py-3 rounded-xl border-2 border-gray-300 bg-white font-black hover:bg-gray-50 transition-all hover:scale-105"
                      >
                        Close
                      </button>
                    ) : null}
                  </div>

                  <p className="text-xs text-gray-500 mt-4 text-center">This popup auto-hides after a few seconds</p>
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
