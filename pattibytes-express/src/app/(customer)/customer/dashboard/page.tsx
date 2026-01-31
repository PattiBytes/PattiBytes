'use client';

/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

import DashboardLayout from '@/components/layouts/DashboardLayout';
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
  const searchDebounce = useRef<NodeJS.Timeout | null>(null);

  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
    totalSpent: 0,
  });

  const firstName = useMemo(() => getFirstNameFromUser(user), [user]);

  // Load admin-configured radius (app_settings)
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

  // Load order stats (safe fallback strategy)
  useEffect(() => {
    if (!user) return;

    const loadStats = async () => {
      try {
        // Try snake_case
        const q1 = await supabase
          .from('orders')
          .select('id,status,total_amount')
          .eq('customer_id', user.id)
          .limit(500);

        if (!q1.error) {
          const rows = q1.data || [];
          const totalOrders = rows.length;
          const activeOrders = rows.filter((o: any) =>
            ['pending', 'confirmed', 'preparing', 'on_the_way', 'ontheway'].includes(String(o.status || '').toLowerCase())
          ).length;
          const completedOrders = rows.filter((o: any) => String(o.status || '').toLowerCase() === 'delivered').length;
          const totalSpent = rows.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);
          setStats({ totalOrders, activeOrders, completedOrders, totalSpent });
          return;
        }

        // Fallback camelCase
        const q2 = await supabase
          .from('orders')
          .select('id,status,totalamount')
          .eq('customerid', user.id)
          .limit(500);

        if (q2.error) {
          setStats({ totalOrders: 0, activeOrders: 0, completedOrders: 0, totalSpent: 0 });
          return;
        }

        const rows = q2.data || [];
        const totalOrders = rows.length;
        const activeOrders = rows.filter((o: any) =>
          ['pending', 'confirmed', 'preparing', 'ontheway'].includes(String(o.status || '').toLowerCase())
        ).length;
        const completedOrders = rows.filter((o: any) => String(o.status || '').toLowerCase() === 'delivered').length;
        const totalSpent = rows.reduce((sum: number, o: any) => sum + Number(o.totalamount || 0), 0);
        setStats({ totalOrders, activeOrders, completedOrders, totalSpent });
      } catch {
        setStats({ totalOrders: 0, activeOrders: 0, completedOrders: 0, totalSpent: 0 });
      }
    };

    loadStats();
  }, [user]);

  // Detect location (uses normalizeReverseGeocodeToString to avoid LocationData->string issues)
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
          .select('id,merchant_id,name,description,price,category,image_url,is_available,is_veg,preparation_time,discount_percentage')
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

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6 space-y-4">
          <DashboardHeader firstName={firstName} radiusKm={searchRadiusKm} />

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

          <CuisineFilters selected={selectedFilter} onSelect={setSelectedFilter} />

          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-base md:text-lg font-bold text-gray-900">
                {selectedFilter === 'all' ? 'All restaurants' : selectedFilter}
              </h2>
              <p className="text-xs text-gray-600">
                {filteredRestaurants.length} restaurants • within {searchRadiusKm}km
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push('/customer/favorites')}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Favorites
            </button>
          </div>

          <RestaurantGrid
            loading={loadingRestaurants}
            restaurants={filteredRestaurants}
            menuCountByMerchant={menuCountByMerchant}
            onOpenRestaurant={(id) => router.push(`/customer/restaurant/${id}`)}
          />
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
    </DashboardLayout>
  );
}
