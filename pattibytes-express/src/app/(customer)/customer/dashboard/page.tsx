/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'react-toastify';
import {
  Home,
  MapPin,
  Package,
  User as UserIcon,
  Search,
  X,
  MapPinned,
  Loader2,
  Heart,
  Navigation,
  Star,
  Clock,
  IndianRupee,
  Store,
  Filter,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import AddressAutocomplete, { type AddressPick } from '@/components/AddressAutocomplete';

import { supabase } from '@/lib/supabase';
import { restaurantService, type Restaurant } from '@/services/restaurants';
import { locationService, type SavedAddress } from '@/services/location';

type Location = { lat: number; lon: number; address: string };

type MenuItem = {
  id: string;
  merchantid?: string;
  merchant_id?: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  imageurl?: string;
  image_url?: string;
  isavailable?: boolean;
  is_available?: boolean;
  isveg?: boolean;
  is_veg?: boolean;
  discountpercentage?: number;
  discount_percentage?: number;
  restaurantname?: string;
  restaurant_name?: string;
  restaurantid?: string;
  restaurant_id?: string;
};

type SearchResult =
  | { type: 'restaurant'; restaurant: Restaurant }
  | { type: 'menu'; menu: MenuItem };

const SEARCH_RADIUS_KM = 10;

const cuisineFilters = [
  'all',
  'punjabi',
  'chinese',
  'italian',
  'south indian',
  'cafe',
  'desserts',
  'fast food',
  'beverages',
  'north indian',
];

function formatCurrencyINR(value: number) {
  const n = Number(value || 0);
  try {
    return n.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    });
  } catch {
    return `₹${Math.round(n)}`;
  }
}

function getFirstNameFromUser(user: any) {
  const fullName =
    user?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    '';
  const name = String(fullName || '').trim();
  if (!name) return 'Food Lover';
  return name.split(' ')[0] || 'Food Lover';
}

// Normalize restaurant fields (supports many naming styles safely)
function getRestaurantName(r: any) {
  return (
    r?.business_name ||
    r?.businessname ||
    r?.name ||
    'Restaurant'
  );
}

function getRestaurantBanner(r: any) {
  return (
    r?.banner_url ||
    r?.bannerurl ||
    r?.image_url ||
    r?.imageurl ||
    ''
  );
}

function getRestaurantLogo(r: any) {
  return r?.logo_url || r?.logourl || '';
}

function getRestaurantAddress(r: any) {
  return r?.address || r?.full_address || '';
}

function getCuisineList(r: any): string[] {
  const cuisines =
    r?.cuisine_types ??
    r?.cuisinetypes ??
    r?.cuisine ??
    r?.cuisines ??
    [];
  if (Array.isArray(cuisines)) return cuisines.map((x) => String(x)).filter(Boolean);
  if (!cuisines) return [];
  return String(cuisines)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function getEstimatedPrepTime(r: any) {
  return Number(r?.estimated_prep_time ?? r?.estimatedpreptime ?? 0) || 0;
}

function getMinOrder(r: any) {
  return Number(r?.min_order_amount ?? r?.minorderamount ?? 0) || 0;
}

function getDeliveryRadiusKm(r: any) {
  return Number(r?.delivery_radius_km ?? r?.deliveryradiuskm ?? 0) || 0;
}

function getRating(r: any) {
  const v = Number(r?.average_rating ?? r?.averagerating ?? r?.rating ?? 0);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

function getTotalReviews(r: any) {
  const v = Number(r?.total_reviews ?? r?.totalreviews ?? r?.reviews ?? 0);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

export default function CustomerDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [location, setLocation] = useState<Location | null>(null);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([]);
  const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([]);

  const [menuCountByRestaurant, setMenuCountByRestaurant] = useState<Record<string, number>>({});

  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);

  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showAddressSearch, setShowAddressSearch] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const searchCloseTimer = useRef<NodeJS.Timeout | null>(null);

  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
    totalSpent: 0,
    last30DaysOrders: 0,
    last30DaysSpent: 0,
  });

  const quickActions = useMemo(
    () => [
      { icon: Home, label: 'Home', path: '/customer/dashboard', value: '' },
      {
        icon: Package,
        label: 'Orders',
        path: '/customer/orders',
        value: String(stats.totalOrders),
        badge: stats.activeOrders,
      },
      { icon: MapPin, label: 'Addresses', path: '/customer/addresses', value: String(savedAddresses.length) },
      { icon: UserIcon, label: 'Profile', path: '/customer/profile', value: '' },
      { icon: Heart, label: 'Favorites', path: '/customer/favorites', value: '' },
    ],
    [savedAddresses.length, stats.activeOrders, stats.totalOrders]
  );

  useEffect(() => {
    if (!user) return;
    loadStats();
    loadSavedAddresses();
  }, [user]);

  useEffect(() => {
    if (!location) return;
    loadNearbyRestaurants();
  }, [location?.lat, location?.lon]);

  useEffect(() => {
    applyFilter();
  }, [selectedFilter, restaurants]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddressModal(false);
        setShowAddressSearch(false);
        setSearchResults([]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const loadSavedAddresses = async () => {
    if (!user) return;

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
        // If user has no saved addresses, open quick search UI automatically
        setShowAddressModal(true);
        setShowAddressSearch(true);
      }
    } catch (error: any) {
      console.error('Failed to load saved addresses', error?.message || error);
      await getCurrentLocation();
    }
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const coords = await locationService.getCurrentLocation();
      const addr = await locationService.reverseGeocode(coords.lat, coords.lon);

      setLocation({
        lat: coords.lat,
        lon: coords.lon,
        address: addr?.address || `${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)}`,
      });

      toast.success('Location detected');
    } catch (error: any) {
      console.error('Location error', error);
      setLocation({ lat: 30.901, lon: 75.8573, address: 'Ludhiana, Punjab, India' });
      toast.info('Using default location');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSavedAddressSelect = (addr: SavedAddress) => {
    setLocation({
      lat: addr.latitude,
      lon: addr.longitude,
      address: addr.address,
    });
    setShowAddressModal(false);
    toast.success(`Location changed to ${addr.label}`);
  };

  const handleAddressSearchSelect = (pick: AddressPick) => {
    setLocation({
      lat: pick.lat,
      lon: pick.lon,
      address: pick.address,
    });
    setShowAddressSearch(false);
    setShowAddressModal(false);
    toast.success('Location updated');
  };

  const loadStats = async () => {
    if (!user) return;

    const now = Date.now();
    const last30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

    try {
      // Attempt snake_case first
      const q1 = await supabase
        .from('orders')
        .select('id,status,total_amount,created_at')
        .eq('customer_id', user.id)
        .limit(500);

      if (!q1.error) {
        const rows = q1.data || [];

        const totalOrders = rows.length;
        const activeOrders = rows.filter((o: any) =>
          ['pending', 'confirmed', 'preparing', 'on_the_way'].includes(String(o.status || '').toLowerCase())
        ).length;
        const completedOrders = rows.filter((o: any) => String(o.status || '').toLowerCase() === 'delivered').length;
        const totalSpent = rows.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);

        const last30Rows = rows.filter((o: any) => {
          const t = o.created_at ? Date.parse(o.created_at) : 0;
          return t && t >= Date.parse(last30);
        });
        const last30DaysOrders = last30Rows.length;
        const last30DaysSpent = last30Rows.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);

        setStats({
          totalOrders,
          activeOrders,
          completedOrders,
          totalSpent,
          last30DaysOrders,
          last30DaysSpent,
        });
        return;
      }

      // Fallback camelCase
      const q2 = await supabase
        .from('orders')
        .select('id,status,totalamount,createdat')
        .eq('customerid', user.id)
        .limit(500);

      if (q2.error) {
        console.warn('Orders query failed', q2.error.message);
        setStats({ totalOrders: 0, activeOrders: 0, completedOrders: 0, totalSpent: 0, last30DaysOrders: 0, last30DaysSpent: 0 });
        return;
      }

      const rows = q2.data || [];
      const totalOrders = rows.length;

      const activeOrders = rows.filter((o: any) =>
        ['pending', 'confirmed', 'preparing', 'ontheway', 'on_the_way'].includes(String(o.status || '').toLowerCase())
      ).length;

      const completedOrders = rows.filter((o: any) => String(o.status || '').toLowerCase() === 'delivered').length;

      const totalSpent = rows.reduce((sum: number, o: any) => sum + Number(o.totalamount || 0), 0);

      const last30Rows = rows.filter((o: any) => {
        const t = o.createdat ? Date.parse(o.createdat) : 0;
        return t && t >= Date.parse(last30);
      });
      const last30DaysOrders = last30Rows.length;
      const last30DaysSpent = last30Rows.reduce((sum: number, o: any) => sum + Number(o.totalamount || 0), 0);

      setStats({
        totalOrders,
        activeOrders,
        completedOrders,
        totalSpent,
        last30DaysOrders,
        last30DaysSpent,
      });
    } catch (error: any) {
      console.warn('Stats loading failed', error?.message || error);
      setStats({ totalOrders: 0, activeOrders: 0, completedOrders: 0, totalSpent: 0, last30DaysOrders: 0, last30DaysSpent: 0 });
    }
  };

  const loadMenuCounts = async (list: any[]) => {
    try {
      const ids = (list || []).map((r) => String(r?.id)).filter(Boolean);
      if (ids.length === 0) {
        setMenuCountByRestaurant({});
        return;
      }

      // N queries with head:true (fast; returns count only). Parallel.
      const pairs = await Promise.all(
        ids.slice(0, 30).map(async (id) => {
          // Try snake_case menu_items first
          const q1 = await supabase
            .from('menu_items')
            .select('id', { count: 'exact', head: true })
            .eq('merchant_id', id);

          if (!q1.error) return [id, q1.count || 0] as const;

          // fallback camelCase
          const q2 = await supabase
            .from('menuitems')
            .select('id', { count: 'exact', head: true })
            .eq('merchantid', id);

          if (q2.error) return [id, 0] as const;
          return [id, q2.count || 0] as const;
        })
      );

      const map: Record<string, number> = {};
      for (const [id, c] of pairs) map[id] = c;
      setMenuCountByRestaurant(map);
    } catch (e) {
      console.warn('Menu count loading failed', e);
      setMenuCountByRestaurant({});
    }
  };

  const loadNearbyRestaurants = async () => {
    if (!location) return;

    setLoading(true);
    try {
      const nearby = await restaurantService.getNearbyRestaurants(location.lat, location.lon, SEARCH_RADIUS_KM);
      const list = nearby || [];

      setRestaurants(list);
      setFilteredRestaurants(list);

      // Optional menu-items search dataset (limited)
      // If your service supports it, keep this block; otherwise it safely falls back.
      try {
        const menuPromises = list.slice(0, 10).map(async (r: any) => {
          try {
            const items = await restaurantService.getMenuItems(r.id);
            return (items || []).map((it: any) => ({
              ...it,
              restaurant_name: getRestaurantName(r),
              restaurant_id: r.id,
            }));
          } catch {
            return [];
          }
        });
        const all = await Promise.all(menuPromises);
        setAllMenuItems(all.flat());
      } catch {
        setAllMenuItems([]);
      }

      await loadMenuCounts(list);
    } catch (error: any) {
      console.error('Failed to load restaurants', error);
      toast.error('Failed to load restaurants');
      setRestaurants([]);
      setFilteredRestaurants([]);
      setAllMenuItems([]);
      setMenuCountByRestaurant({});
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = () => {
    if (selectedFilter === 'all') {
      setFilteredRestaurants(restaurants);
      return;
    }

    const f = selectedFilter.toLowerCase();
    const filtered = restaurants.filter((r: any) => {
      const cuisines = getCuisineList(r);
      return cuisines.some((c) => c.toLowerCase().includes(f));
    });

    setFilteredRestaurants(filtered);
  };

  const runSearch = (q: string) => {
    const query = q.trim().toLowerCase();
    if (!query) {
      setSearchResults([]);
      return;
    }

    const rHits: SearchResult[] = filteredRestaurants
      .filter((r: any) => {
        const name = getRestaurantName(r).toLowerCase();
        const cuisines = getCuisineList(r).join(' ').toLowerCase();
        return name.includes(query) || cuisines.includes(query);
      })
      .slice(0, 10)
      .map((restaurant) => ({ type: 'restaurant', restaurant }));

    const mHits: SearchResult[] = allMenuItems
      .filter((m) => {
        const n = String(m.name || '').toLowerCase();
        const d = String(m.description || '').toLowerCase();
        const c = String(m.category || '').toLowerCase();
        return n.includes(query) || d.includes(query) || c.includes(query);
      })
      .slice(0, 10)
      .map((menu) => ({ type: 'menu', menu }));

    setSearchResults([...rHits, ...mHits].slice(0, 15));
  };

  useEffect(() => {
    if (searchCloseTimer.current) clearTimeout(searchCloseTimer.current);
    searchCloseTimer.current = setTimeout(() => runSearch(searchQuery), 200);
    return () => {
      if (searchCloseTimer.current) clearTimeout(searchCloseTimer.current);
    };
  }, [searchQuery, filteredRestaurants, allMenuItems]);

  const openFromSearch = (res: SearchResult) => {
    if (res.type === 'restaurant') {
      router.push(`/customer/restaurant/${(res.restaurant as any).id}`);
      setSearchQuery('');
      setSearchResults([]);
      return;
    }

    const m = res.menu;
    const restaurantId = m.restaurantid || m.restaurant_id || m.merchantid || m.merchant_id;
    if (restaurantId) {
      // Pass item id so Restaurant page can auto-scroll/highlight if you implement it.
      router.push(`/customer/restaurant/${restaurantId}?item=${m.id}`);
      setSearchQuery('');
      setSearchResults([]);
      return;
    }

    toast.info('Restaurant not found for this dish');
  };

  const displayAddress = location?.address ?? '';

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-5">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 rounded-2xl shadow-lg p-5 text-white mb-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-56 h-56 bg-white/10 rounded-full -mr-20 -mt-20" />
            <div className="relative z-10 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-white/90 text-sm">Welcome,</p>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">
                  {getFirstNameFromUser(user)}!
                </h1>
                <p className="text-white/90 text-sm mt-1">
                  Discover food within {SEARCH_RADIUS_KM}km
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push('/customer/cart')}
                className="bg-white/15 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                Go to Cart
              </button>
            </div>
          </div>

          {/* Location + Search */}
          <div className="bg-white rounded-2xl shadow-lg p-4 md:p-5 mb-5">
            <div className="flex items-start justify-between gap-3 pb-4 border-b">
              <div className="flex items-start gap-2 min-w-0">
                <MapPinned className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-600 mb-0.5">Delivering to</p>
                  <p className="font-semibold text-sm text-gray-900 line-clamp-2">
                    {locationLoading ? 'Detecting location…' : (displayAddress || 'Set your location')}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Within {SEARCH_RADIUS_KM}km radius
                  </p>
                </div>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddressModal(true);
                    setShowAddressSearch(true);
                  }}
                  className="p-2 bg-orange-50 text-primary rounded-xl hover:bg-orange-100 transition-colors"
                  title="Search address"
                  aria-label="Search address"
                >
                  <Search className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={locationLoading}
                  className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 disabled:opacity-50 transition-colors"
                  title="Use current location"
                  aria-label="Use current location"
                >
                  {locationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddressModal(true)}
                  className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors"
                  title="Saved addresses"
                  aria-label="Saved addresses"
                >
                  <MapPin className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search input */}
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search restaurants or dishes…"
                  className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all bg-white"
                />
                {!!searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl hover:bg-gray-100"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                )}

                {searchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-2xl shadow-2xl max-h-96 overflow-y-auto">
                    {searchResults.map((res, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => openFromSearch(res)}
                        className="w-full text-left px-4 py-3 hover:bg-orange-50 border-b last:border-b-0 flex items-start gap-3 transition-colors"
                      >
                        {res.type === 'restaurant' ? (
                          <Store className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                        ) : (
                          <IndianRupee className="text-green-600 w-5 h-5 mt-0.5 flex-shrink-0" />
                        )}

                        <div className="flex-1 min-w-0">
                          {res.type === 'restaurant' ? (
                            <>
                              <p className="font-semibold text-gray-900 text-sm truncate">
                                {getRestaurantName(res.restaurant)}
                              </p>
                              <p className="text-xs text-gray-600 truncate">Open restaurant</p>
                            </>
                          ) : (
                            <>
                              <p className="font-semibold text-gray-900 text-sm truncate">{res.menu.name}</p>
                              <p className="text-xs text-gray-600 truncate">
                                {formatCurrencyINR(res.menu.price)} •{' '}
                                {(res.menu.restaurantname || res.menu.restaurant_name || 'Restaurant')}
                              </p>
                            </>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Analytics cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
            <div className="bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl shadow-lg p-4 text-white">
              <Store className="w-6 h-6 mb-2" />
              <p className="text-2xl font-bold">{filteredRestaurants.length}</p>
              <p className="text-xs text-white/90">Restaurants</p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg p-4 text-white">
              <Package className="w-6 h-6 mb-2" />
              <p className="text-2xl font-bold">{stats.totalOrders}</p>
              <p className="text-xs text-white/90">Total orders</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl shadow-lg p-4 text-white">
              <Package className="w-6 h-6 mb-2" />
              <p className="text-2xl font-bold">{stats.activeOrders}</p>
              <p className="text-xs text-white/90">Active orders</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl shadow-lg p-4 text-white">
              <IndianRupee className="w-6 h-6 mb-2" />
              <p className="text-2xl font-bold">{formatCurrencyINR(stats.totalSpent)}</p>
              <p className="text-xs text-white/90">Total spent</p>
            </div>
          </div>

          {/* Cuisine filter */}
          <div className="bg-white rounded-2xl shadow-md p-4 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-gray-700" />
              <h3 className="font-bold text-sm text-gray-900">Filter by cuisine</h3>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {cuisineFilters.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setSelectedFilter(f)}
                  className={`flex-shrink-0 px-4 py-2 rounded-2xl font-semibold text-sm transition-all ${
                    selectedFilter === f
                      ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {f === 'all' ? 'All' : f}
                </button>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {quickActions.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => router.push(a.path)}
                  className="bg-white rounded-2xl shadow p-4 text-left hover:shadow-md transition-shadow relative"
                >
                  <div className="flex items-center justify-between">
                    <Icon className="w-6 h-6 text-primary" />
                    {!!(a as any).badge && (
                      <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-bold">
                        {(a as any).badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 font-bold text-gray-900">{a.label}</p>
                  {!!a.value && <p className="text-sm text-gray-600">{a.value}</p>}
                </button>
              );
            })}
          </div>

          {/* Restaurants list */}
          {loading ? (
            <div className="text-center py-12 text-gray-600">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Loading restaurants…
            </div>
          ) : filteredRestaurants.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow text-gray-600">
              <p className="font-semibold">No restaurants found nearby.</p>
              <p className="text-sm mt-1">Try changing your location or filter.</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedFilter('all');
                  setShowAddressModal(true);
                  setShowAddressSearch(true);
                }}
                className="mt-4 bg-primary text-white px-6 py-3 rounded-2xl hover:bg-orange-600 font-semibold transition-colors"
              >
                Change location
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredRestaurants.map((r: any) => {
                const id = String(r?.id);
                const name = getRestaurantName(r);
                const banner = getRestaurantBanner(r);
                const logo = getRestaurantLogo(r);
                const addr = getRestaurantAddress(r);
                const cuisines = getCuisineList(r);
                const rating = getRating(r);
                const reviews = getTotalReviews(r);
                const prep = getEstimatedPrepTime(r);
                const minOrder = getMinOrder(r);
                const radius = getDeliveryRadiusKm(r);
                const menuCount = menuCountByRestaurant[id] ?? 0;

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => router.push(`/customer/restaurant/${id}`)}
                    className="bg-white rounded-2xl shadow hover:shadow-xl transition-all overflow-hidden text-left"
                  >
                    {/* Banner */}
                    <div className="relative w-full h-44 bg-gray-100">
                      {banner ? (
                        <Image
                          src={banner}
                          alt={name}
                          fill
                          sizes="(max-width: 1024px) 100vw, 33vw"
                          className="object-cover"
                          priority={false}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-orange-400 to-pink-500" />
                      )}

                      {/* Logo */}
                      {logo ? (
                        <div className="absolute top-3 right-3 w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-lg bg-white">
                          <Image
                            src={logo}
                            alt={`${name} logo`}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </div>
                      ) : null}
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-bold text-base text-gray-900 truncate" title={name}>
                        {name}
                      </h3>

                      {!!addr && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {addr}
                        </p>
                      )}

                      {cuisines.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {cuisines.slice(0, 2).map((c, i) => (
                            <span
                              key={`${id}-c-${i}`}
                              className="px-2 py-0.5 bg-orange-100 text-orange-800 text-[11px] font-semibold rounded-full"
                            >
                              {c}
                            </span>
                          ))}
                          {cuisines.length > 2 && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[11px] font-semibold rounded-full">
                              +{cuisines.length - 2}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="mt-4 pt-3 border-t grid grid-cols-2 gap-2 text-xs text-gray-700">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="font-bold">
                            {rating ? rating.toFixed(1) : '—'}
                          </span>
                          <span className="text-gray-500">
                            {reviews ? `(${reviews})` : ''}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 justify-end">
                          <Clock className="w-4 h-4 text-gray-600" />
                          <span>{prep ? `${prep} min` : '—'}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <IndianRupee className="w-4 h-4 text-gray-600" />
                          <span>Min {minOrder ? formatCurrencyINR(minOrder) : '—'}</span>
                        </div>

                        <div className="flex items-center gap-1 justify-end">
                          <MapPin className="w-4 h-4 text-gray-600" />
                          <span>{radius ? `${radius} km` : '—'}</span>
                        </div>

                        <div className="col-span-2 text-xs text-gray-600">
                          {menuCount ? `${menuCount} menu items` : 'Menu items: —'}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Address modal */}
          {showAddressModal && (
            <>
              <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowAddressModal(false)} />
              <div className="fixed left-0 right-0 bottom-0 sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:bottom-auto w-full sm:w-[560px] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl z-50 max-h-[90vh] overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
                  <h2 className="text-lg font-bold text-gray-900">Choose location</h2>
                  <button
                    type="button"
                    className="p-2 rounded-lg hover:bg-gray-100"
                    onClick={() => setShowAddressModal(false)}
                    aria-label="Close"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                <div className="p-4 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => setShowAddressSearch((v) => !v)}
                    className="w-full bg-primary text-white px-4 py-3 rounded-xl font-semibold hover:bg-orange-600"
                  >
                    {showAddressSearch ? 'Hide search' : 'Search new address'}
                  </button>

                  {showAddressSearch && (
                    <div className="mt-4">
                      <AddressAutocomplete onSelect={handleAddressSearchSelect} />
                    </div>
                  )}

                  <div className="mt-5 border-t pt-4">
                    <h3 className="font-bold text-gray-900 mb-3">Saved addresses</h3>

                    {savedAddresses.length === 0 ? (
                      <p className="text-sm text-gray-600">No saved addresses yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {savedAddresses.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => handleSavedAddressSelect(a)}
                            className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          >
                            <p className="font-bold text-gray-900">
                              {a.label}{' '}
                              {a.isdefault ? <span className="text-xs text-primary">(Default)</span> : null}
                            </p>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{a.address}</p>
                          </button>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      disabled={locationLoading}
                      className="mt-4 w-full bg-blue-50 text-blue-700 px-4 py-3 rounded-xl font-semibold hover:bg-blue-100 disabled:opacity-50"
                    >
                      {locationLoading ? 'Detecting…' : 'Use my current location'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
