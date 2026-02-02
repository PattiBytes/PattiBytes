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
} from 'lucide-react';

import AppShell from '@/components/common/AppShell';
import { supabase } from '@/lib/supabase';
import { locationService, type SavedAddress } from '@/services/location';

// Pick ONE auth import that matches your project
import { useAuth } from '@/contexts/AuthContext'; // if you use contexts/AuthContext
// import { useAuth } from '@/hooks/useAuth'; // if you use hooks/useAuth

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
  totalamount?: number | null;
  created_at?: string | null;
  createdat?: string | null;
  merchant_id?: string | null;
  merchantid?: string | null;

  // hydrated
  merchantName?: string;
  merchantLogoUrl?: string | null;
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
    return iso;
  }
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

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuCountByMerchant, setMenuCountByMerchant] = useState<Record<string, number>>({});

  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const [searchQuery, setSearchQuery] = useState('');
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
    totalSpent: 0,
  });

  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [loadingActiveOrders, setLoadingActiveOrders] = useState(false);

  // Brand (optional from app_settings, with safe fallbacks)
  const [brand, setBrand] = useState({
    title: 'Presented by Pattibytes',
    instagram1: 'https://instagram.com/pattibytes',
    instagram2: 'https://instagram.com/pbexpress38',
    youtube: 'https://www.youtube.com/@pattibytes',
    website: 'https://pattibytes.com',
    facebook: 'https://facebook.com/pattibytes',
  });

  const firstName = useMemo(() => getFirstNameFromUser(user), [user]);

  // Load radius (app_settings)
  useEffect(() => {
    const loadRadius = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'customer_search_radius_km')
          .single();

        if (error) {
          setSearchRadiusKm(25);
          return;
        }
        const n = Number(data?.value);
        setSearchRadiusKm(Number.isFinite(n) && n > 0 ? Math.round(n) : 25);
      } catch {
        setSearchRadiusKm(25);
      }
    };

    loadRadius();
  }, []);

  // Load brand links (optional)
  useEffect(() => {
    const loadBrand = async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('key,value')
          .in('key', [
            'brand_title',
            'brand_instagram_pattibytes',
            'brand_instagram_pbexpress38',
            'brand_youtube',
            'brand_website',
            'brand_facebook',
          ])
          .limit(20);

        const map = new Map<string, string>();
        (data || []).forEach((r: any) => map.set(String(r.key), String(r.value || '')));

        setBrand((b) => ({
          title: map.get('brand_title') || b.title,
          instagram1: map.get('brand_instagram_pattibytes') || b.instagram1,
          instagram2: map.get('brand_instagram_pbexpress38') || b.instagram2,
          youtube: map.get('brand_youtube') || b.youtube,
          website: map.get('brand_website') || b.website,
          facebook: map.get('brand_facebook') || b.facebook,
        }));
      } catch {
        // keep defaults
      }
    };

    loadBrand();
  }, []);

  // Load saved addresses (and set location)
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
  }, [user]);

  // Detect location
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

  // Load order stats + active orders list (snake-first with fallback)
 const loadOrdersAndStats = async () => {
  if (!user) return;

  setLoadingActiveOrders(true);
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id,status,total_amount,merchant_id,created_at,order_number')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(2000);

    if (error) throw error;

    const rows = data || [];

    const totalOrders = rows.length;

    const activeOrdersCount = rows.filter((o: any) =>
      ACTIVE_STATUSES.includes(String(o.status || '').toLowerCase())
    ).length;

    const completedOrders = rows.filter(
      (o: any) => String(o.status || '').toLowerCase() === 'delivered'
    ).length;

    const totalSpent = rows.reduce(
      (sum: number, o: any) => sum + Number(o.total_amount || 0),
      0
    );

    setStats({ totalOrders, activeOrders: activeOrdersCount, completedOrders, totalSpent });

    // top 3 active orders (for the small Active Orders card)
    const active = rows
      .filter((o: any) => ACTIVE_STATUSES.includes(String(o.status || '').toLowerCase()))
      .slice(0, 3)
      .map((o: any) => ({
        id: String(o.id),
        order_number: o.order_number ?? null,
        status: o.status ?? null,
        total_amount: Number(o.total_amount || 0),
        created_at: o.created_at ?? null,
        merchant_id: o.merchant_id ?? null,
      }));

    // hydrate merchant names (optional)
    const merchantIds = Array.from(new Set(active.map((x) => x.merchant_id).filter(Boolean))) as string[];
    if (merchantIds.length) {
      const m = await supabase
        .from('merchants')
        .select('id,business_name,logo_url')
        .in('id', merchantIds)
        .limit(50);

      const mapM = new Map<string, { business_name: string | null; logo_url: string | null }>();
      (m.data || []).forEach((r: any) =>
        mapM.set(String(r.id), { business_name: r.business_name ?? null, logo_url: r.logo_url ?? null })
      );

      active.forEach((a: any) => {
        const info = mapM.get(String(a.merchant_id || ''));
        if (info) {
          a.merchantName = info.business_name || 'Restaurant';
          a.merchantLogoUrl = info.logo_url || null;
        }
      });
    }

    setActiveOrders(active as any);
  } catch (e: any) {
    toast.error(e?.message || 'Failed to load order analytics');
    setStats({ totalOrders: 0, activeOrders: 0, completedOrders: 0, totalSpent: 0 });
    setActiveOrders([]);
  } finally {
    setLoadingActiveOrders(false);
  }
};

  // initial load + realtime refresh for orders
  useEffect(() => {
    if (!user) return;

    loadOrdersAndStats();

    const channel = supabase
      .channel(`customer-orders-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `customer_id=eq.${user.id}` },
        () => loadOrdersAndStats()
      )
      .subscribe();

    // camel fallback channel (won't harm if column doesn't exist)
    const channel2 = supabase
      .channel(`customer-orders-camel-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `customerid=eq.${user.id}` },
        () => loadOrdersAndStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(channel2);
    };
  }, [user?.id]);

  // Load restaurants when location or radius changes
  useEffect(() => {
    if (!location) return;

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

        const all = (data || []) as unknown as Merchant[];

        const withDistance = all
          .map((m) => {
            const lat = Number(m.latitude || 0);
            const lon = Number(m.longitude || 0);
            const dist = lat && lon ? haversineKm(location.lat, location.lon, lat, lon) : Number.POSITIVE_INFINITY;
            return { ...m, distance_km: dist };
          })
          .filter((m) => Number.isFinite(m.distance_km as number) && (m.distance_km as number) <= searchRadiusKm)
          .sort((a, b) => Number(a.distance_km || 0) - Number(b.distance_km || 0));

        setRestaurants(withDistance);
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
      const cuisines = parseCuisineList(r.cuisine_types).map((x) => x.toLowerCase());
      return cuisines.some((c) => c.includes(f));
    });

    setFilteredRestaurants(out);
  }, [selectedFilter, restaurants]);

  // Load menu items (for search + menu counts) for currently visible restaurants
  useEffect(() => {
    const loadMenu = async () => {
      try {
        const ids = filteredRestaurants.slice(0, 30).map((r) => r.id);
        if (!ids.length) {
          setMenuItems([]);
          setMenuCountByMerchant({});
          return;
        }

        const { data, error } = await supabase
          .from('menu_items')
          .select(
            'id,merchant_id,name,description,price,category,image_url,is_available,is_veg,preparation_time,discount_percentage'
          )
          .in('merchant_id', ids)
          .limit(1000);

        if (error) throw error;

        const items = (data || []) as MenuItem[];
        setMenuItems(items);

        const counts: Record<string, number> = {};
        for (const it of items) counts[it.merchant_id] = (counts[it.merchant_id] || 0) + 1;
        setMenuCountByMerchant(counts);
      } catch {
        setMenuItems([]);
        setMenuCountByMerchant({});
      }
    };

    loadMenu();
  }, [filteredRestaurants]);

  // Close modals on ESC
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowLocationModal(false);
        setShowLocationSearch(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Search debounced (keeps typing smooth)
  const setSearchQueryDebounced = (v: string) => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => setSearchQuery(v), 120);
  };

  const onOpenSearchResult = (res: SearchResult) => {
    if (res.type === 'restaurant') {
      router.push(`/customer/restaurant/${res.restaurant.id}`);
      setSearchQuery('');
      return;
    }
    router.push(`/customer/restaurant/${res.menu.merchant_id}?item=${res.menu.id}`);
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

  const socials = [
    { href: brand.instagram1, label: 'Instagram (pattibytes)', Icon: Instagram },
    { href: brand.instagram2, label: 'Instagram (pbexpress38)', Icon: Instagram },
    { href: brand.youtube, label: 'YouTube', Icon: Youtube },
    { href: brand.website, label: 'Website', Icon: Globe },
    { href: brand.facebook, label: 'Facebook', Icon: Facebook },
  ].filter((x) => !!x.href);

  return (
     <AppShell title="Pattibytes Express">
      <div
        className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50"
        style={{ paddingBottom: `calc(${BOTTOM_NAV_PX}px + env(safe-area-inset-bottom))` }}
      >
        <div className="mx-auto w-full max-w-7xl px-2.5 sm:px-3.5 md:px-5 lg:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4">
          <DashboardHeader firstName={firstName} radiusKm={searchRadiusKm} />

          {/* Presented by + socials (compact) */}
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-gray-100 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] text-gray-600 leading-4">{brand.title}</p>
                <p className="text-[11px] text-gray-500 leading-4 truncate">
                  Fast, compact, mobile-first dashboard experience.
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {socials.slice(0, 5).map(({ href, label, Icon }) => (
                  <Link
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    title={label}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-primary/40 transition active:scale-[0.98]"
                  >
                    <Icon className="w-4 h-4 text-gray-800" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

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
              <SearchBox
                query={searchQuery}
                setQuery={setSearchQueryDebounced}
                restaurants={filteredRestaurants}
                menuItems={menuItems}
                onOpen={onOpenSearchResult}
              />

              <StatsCards
                restaurantsCount={filteredRestaurants.length}
                totalOrders={stats.totalOrders}
                activeOrders={stats.activeOrders}
                totalSpent={stats.totalSpent}
              />

              {/* Active orders (compact) */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-gray-900 truncate">Active orders</h3>
                    <p className="text-[11px] text-gray-600 leading-4">
                      Quick access to what’s in progress.
                    </p>
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
                      const total = o.total_amount ?? o.totalamount ?? 0;
                      const created = o.created_at ?? o.createdat ?? null;

                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => router.push(`/customer/orders/${o.id}`)}
                          className="w-full text-left rounded-xl border border-gray-200 hover:border-primary/30 hover:bg-orange-50/40 transition px-3 py-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-900 truncate">
                                {o.merchantName || 'Restaurant'} • Order #{o.ordernumber ?? o.id.slice(0, 6)}
                              </p>
                              <p className="text-[11px] text-gray-600 mt-0.5 truncate">
                                Status: {String(o.status || 'pending').toLowerCase()} • {tinyTime(created)}
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              <p className="text-xs font-bold text-primary">₹{toMoney(total)}</p>
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

              <div className="flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-bold text-gray-900 truncate">
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

              <RestaurantGrid
                loading={loadingRestaurants}
                restaurants={filteredRestaurants}
                menuCountByMerchant={menuCountByMerchant}
                onOpenRestaurant={(id) => router.push(`/customer/restaurant/${id}`)}
              />
            </div>

            {/* Right rail (desktop only, compact) */}
            <div className="hidden lg:block lg:col-span-4 space-y-3">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <p className="text-sm font-bold text-gray-900">Quick links</p>
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
                <p className="text-sm font-bold">Tip</p>
                <p className="text-[12px] text-white/90 mt-1">
                  Use search for dishes (not just restaurants) to find items faster.
                </p>
              </div>
            </div>
          </div>

          {/* Footer credit (compact) */}
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
