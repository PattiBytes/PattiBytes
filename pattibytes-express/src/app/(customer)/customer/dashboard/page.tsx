/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { restaurantService } from '@/services/restaurants';
import { locationService } from '@/services/location';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import {
  ShoppingBag,
  MapPin,
  Clock,
  Star,
  Search,
  Store,
  Package,
  User as UserIcon,
  Home,
  Navigation,
  Filter,
  TrendingUp,
  Heart,
  ChevronDown,
  MapPinned,
  Loader2,
  X,
  Edit2,
  Activity,
} from 'lucide-react';
import { toast } from 'react-toastify';
import Image from 'next/image';

interface Location {
  lat: number;
  lon: number;
  address: string;
}

interface SavedAddress {
  id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  is_default: boolean;
}

interface Restaurant {
  id: string;
  business_name: string;
  business_type: string;
  logo_url?: string;
  banner_url?: string;
  description?: string;
  cuisine_types: string[];
  latitude: number;
  longitude: number;
  min_order_amount: number;
  estimated_prep_time: number;
  is_active: boolean;
  distance?: number;
}

interface MenuItem {
  id: string;
  merchant_id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image_url?: string;
  is_veg: boolean;
  discount_percentage?: number;
  restaurant_name?: string;
}

export default function CustomerDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [location, setLocation] = useState<Location | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([]);
  const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
    totalSpent: 0,
  });

  const SEARCH_RADIUS_KM = 100; // 100km radius

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
    'mexican',
    'thai',
    'japanese',
  ];

  useEffect(() => {
    if (user) {
      loadStats();
      loadSavedAddresses();
    }
  }, [user]);

  useEffect(() => {
    if (location) {
      loadNearbyRestaurants();
    }
  }, [location]);

  useEffect(() => {
    applyFilter();
  }, [selectedFilter, restaurants]);

  const loadSavedAddresses = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('saved_addresses')
        .select('id, label, address, latitude, longitude, is_default')
        .eq('customer_id', user.id)
        .order('is_default', { ascending: false });

      if (error) {
        if (error.code === 'PGRST116' || error.code === '42P01') {
          console.log('Saved addresses not available yet');
          getCurrentLocation();
          return;
        }
        throw error;
      }

      setSavedAddresses(data || []);

      if (data && data.length > 0) {
        const defaultAddr = data.find((a) => a.is_default) || data[0];
        setLocation({
          lat: defaultAddr.latitude,
          lon: defaultAddr.longitude,
          address: defaultAddr.address,
        });
      } else {
        getCurrentLocation();
      }
    } catch (error: any) {
      console.error('Failed to load saved addresses:', error.message);
      getCurrentLocation();
    }
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const coords = await locationService.getCurrentLocation();
      const address = await locationService.reverseGeocode(coords.lat, coords.lon);

      setLocation({
        lat: coords.lat,
        lon: coords.lon,
        address,
      });

      toast.success('📍 Location detected');
    } catch (error: any) {
      console.error('Location error:', error);
      toast.error(error.message || 'Failed to get location');

      // Default to Ludhiana
      setLocation({
        lat: 30.901,
        lon: 75.8573,
        address: 'Ludhiana, Punjab, India',
      });
    } finally {
      setLocationLoading(false);
    }
  };

  const handleAddressSelect = (address: SavedAddress) => {
    setLocation({
      lat: address.latitude,
      lon: address.longitude,
      address: address.address,
    });
    setShowAddressModal(false);
    toast.success(`📍 Location changed to ${address.label}`);
  };

  const handleAddressSearchSelect = (addressData: any) => {
    setLocation({
      lat: addressData.lat,
      lon: addressData.lon,
      address: addressData.address,
    });
    setShowAddressSearch(false);
    toast.success('📍 Location updated');
  };

  const loadStats = async () => {
    if (!user) return;

    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, status, total_amount')
        .eq('customer_id', user.id);

      if (error) {
        if (error.code === 'PGRST116' || error.code === '42P01') {
          console.log('Orders table not ready yet');
          setStats({ totalOrders: 0, activeOrders: 0, completedOrders: 0, totalSpent: 0 });
          return;
        }
        throw error;
      }

      const total = orders?.length || 0;
      const active =
        orders?.filter((o) =>
          ['pending', 'confirmed', 'preparing', 'on_the_way'].includes(o.status)
        ).length || 0;
      const completed = orders?.filter((o) => o.status === 'delivered').length || 0;
      const spent = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

      setStats({
        totalOrders: total,
        activeOrders: active,
        completedOrders: completed,
        totalSpent: spent,
      });
    } catch (error: any) {
      console.error('Stats error:', error.message);
      setStats({ totalOrders: 0, activeOrders: 0, completedOrders: 0, totalSpent: 0 });
    }
  };

  const loadNearbyRestaurants = async () => {
    if (!location) return;

    setLoading(true);
    try {
      console.log(`🔍 Searching restaurants within ${SEARCH_RADIUS_KM}km of:`, {
        lat: location.lat,
        lon: location.lon,
        address: location.address,
      });

      const nearby = await restaurantService.getNearbyRestaurants(
        location.lat,
        location.lon,
        SEARCH_RADIUS_KM
      );

      console.log(`✅ Found ${nearby.length} restaurants within ${SEARCH_RADIUS_KM}km`);

      if (nearby.length === 0) {
        toast.info(`No restaurants found within ${SEARCH_RADIUS_KM}km radius`);
      }

      setRestaurants(nearby);
      setFilteredRestaurants(nearby);

      // Load menu items for all restaurants
      const menuPromises = nearby.map(async (restaurant) => {
        try {
          const items = await restaurantService.getMenuItems(restaurant.id);
          return items.map((item) => ({
            ...item,
            restaurant_name: restaurant.business_name,
            restaurant_id: restaurant.id,
          }));
        } catch {
          return [];
        }
      });

      const allMenus = await Promise.all(menuPromises);
      setAllMenuItems(allMenus.flat());
    } catch (error) {
      console.error('Failed to load restaurants:', error);
      toast.error('Failed to load restaurants');
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = () => {
    if (selectedFilter === 'all') {
      setFilteredRestaurants(restaurants);
    } else {
      const filtered = restaurants.filter((r) =>
        r.cuisine_types?.some((c: string) => c.toLowerCase().includes(selectedFilter.toLowerCase()))
      );
      setFilteredRestaurants(filtered);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const lowerQuery = query.toLowerCase();

    const restaurantResults = restaurants
      .filter(
        (r) =>
          r.business_name.toLowerCase().includes(lowerQuery) ||
          r.cuisine_types?.some((c: string) => c.toLowerCase().includes(lowerQuery))
      )
      .map((r) => ({ ...r, type: 'restaurant' }));

    const menuResults = allMenuItems
      .filter(
        (item) =>
          item.name.toLowerCase().includes(lowerQuery) ||
          item.description?.toLowerCase().includes(lowerQuery) ||
          item.category?.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 10)
      .map((item) => ({ ...item, type: 'menu' }));

    setSearchResults([...restaurantResults, ...menuResults]);
  };

  const handleResultClick = (result: any) => {
    if (result.type === 'restaurant') {
      router.push(`/customer/restaurant/${result.id}`);
    } else if (result.type === 'menu') {
      router.push(`/customer/restaurant/${result.restaurant_id || result.merchant_id}`);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 md:py-6">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 rounded-xl md:rounded-2xl shadow-lg md:shadow-2xl p-4 md:p-6 mb-4 md:mb-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 md:w-64 h-32 md:h-64 bg-white/10 rounded-full -mr-16 md:-mr-32 -mt-16 md:-mt-32" />
            <div className="absolute bottom-0 left-0 w-24 md:w-48 h-24 md:h-48 bg-white/10 rounded-full -ml-12 md:-ml-24 -mb-12 md:-mb-24" />
            <div className="relative z-10">
              <h1 className="text-lg md:text-2xl lg:text-3xl font-bold mb-1 leading-tight">
                Welcome, {user?.user_metadata?.full_name?.split(' ')[0] || 'Food Lover'}! 👋
              </h1>
              <p className="text-white/90 text-sm md:text-base lg:text-lg">
                Discover delicious food within {SEARCH_RADIUS_KM}km
              </p>
            </div>
          </div>

          {/* Quick Action Cards - Horizontal Scroll */}
          <div className="mb-4 md:mb-6">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
              <button
                onClick={() => router.push('/customer/dashboard')}
                className="flex-shrink-0 snap-start bg-white rounded-xl shadow-md hover:shadow-lg transition-all p-3 flex items-center gap-3 border-2 border-orange-500 min-w-[140px]"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                  <Home className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900 text-sm">Home</p>
                  <p className="text-xs text-gray-600">Main</p>
                </div>
              </button>

              <button
                onClick={() => router.push('/customer/orders')}
                className="flex-shrink-0 snap-start bg-white rounded-xl shadow-md hover:shadow-lg transition-all p-3 flex items-center gap-3 relative min-w-[140px]"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900 text-sm">Orders</p>
                  <p className="text-xs text-gray-600">{stats.totalOrders} total</p>
                </div>
                {stats.activeOrders > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                    {stats.activeOrders}
                  </span>
                )}
              </button>

              <button
                onClick={() => router.push('/customer/addresses')}
                className="flex-shrink-0 snap-start bg-white rounded-xl shadow-md hover:shadow-lg transition-all p-3 flex items-center gap-3 min-w-[140px]"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900 text-sm">Addresses</p>
                  <p className="text-xs text-gray-600">{savedAddresses.length} saved</p>
                </div>
              </button>

              <button
                onClick={() => router.push('/customer/profile')}
                className="flex-shrink-0 snap-start bg-white rounded-xl shadow-md hover:shadow-lg transition-all p-3 flex items-center gap-3 min-w-[140px]"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900 text-sm">Profile</p>
                  <p className="text-xs text-gray-600">Settings</p>
                </div>
              </button>

              <button
                onClick={() => router.push('/customer/favorites')}
                className="flex-shrink-0 snap-start bg-white rounded-xl shadow-md hover:shadow-lg transition-all p-3 flex items-center gap-3 min-w-[140px]"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900 text-sm">Favorites</p>
                  <p className="text-xs text-gray-600">Saved</p>
                </div>
              </button>
            </div>
          </div>

          {/* Location & Search Card */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-3 md:p-4 lg:p-6 mb-4 md:mb-6">
            {/* Current Location */}
            <div className="flex items-center justify-between mb-3 md:mb-4 pb-3 md:pb-4 border-b">
              <div className="flex items-start gap-2 flex-1 min-w-0 pr-2">
                <MapPin className="w-5 h-5 md:w-6 md:h-6 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm text-gray-600 mb-0.5">Delivering to:</p>
                  <p className="font-semibold text-sm md:text-base text-gray-900 line-clamp-2 break-words">
                    {location?.address || 'Loading location...'}
                  </p>
                  <p className="text-[10px] md:text-xs text-gray-500 mt-1">
                    📍 Searching within {SEARCH_RADIUS_KM}km radius
                  </p>
                </div>
              </div>

              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  onClick={() => setShowAddressSearch(true)}
                  className="p-2 bg-orange-50 text-primary rounded-lg hover:bg-orange-100 transition-all"
                  title="Change address"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={getCurrentLocation}
                  disabled={locationLoading}
                  className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all disabled:opacity-50"
                  title="Use current location"
                >
                  {locationLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Navigation className="w-4 h-4" />
                  )}
                </button>

                {savedAddresses.length > 0 && (
                  <button
                    onClick={() => setShowAddressModal(true)}
                    className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-all"
                    title="Saved addresses"
                  >
                    <MapPinned className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search restaurants or dishes..."
                className="w-full pl-10 md:pl-12 pr-3 md:pr-4 py-2.5 md:py-3 lg:py-4 border-2 border-gray-200 rounded-lg md:rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm md:text-base lg:text-lg transition-all"
              />

              {searchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-2xl max-h-96 overflow-y-auto">
                  {searchResults.map((result, index) => (
                    <button
                      key={index}
                      onClick={() => handleResultClick(result)}
                      className="w-full text-left px-3 md:px-4 py-2.5 md:py-3 hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 border-b last:border-b-0 flex items-start gap-2 md:gap-3 transition-all"
                    >
                      {result.type === 'restaurant' ? (
                        <>
                          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Store className="text-white w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm md:text-base truncate">
                              {result.business_name}
                            </p>
                            <p className="text-xs md:text-sm text-gray-600 truncate">
                              {result.cuisine_types?.slice(0, 2).join(', ')} •{' '}
                              {result.distance?.toFixed(1)} km away
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            <ShoppingBag className="text-white w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm md:text-base truncate">
                              {result.name}
                            </p>
                            <p className="text-xs md:text-sm text-gray-600 truncate">
                              {result.restaurant_name} • ₹{result.price}
                              {result.discount_percentage && (
                                <span className="ml-2 text-green-600 font-semibold">
                                  {result.discount_percentage}% OFF
                                </span>
                              )}
                            </p>
                          </div>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Search Suggestions */}
            {!searchQuery && (
              <div className="mt-3 md:mt-4 flex gap-2 overflow-x-auto scrollbar-hide">
                <span className="text-xs md:text-sm text-gray-600 flex items-center gap-1 flex-shrink-0">
                  <TrendingUp className="w-3 h-3 md:w-3.5 md:h-3.5" />
                  Popular:
                </span>
                {['Paneer', 'Biryani', 'Pizza', 'Chinese', 'Desserts', 'Burger', 'Momos', 'Pasta'].map(
                  (hint) => (
                    <button
                      key={hint}
                      onClick={() => handleSearch(hint)}
                      className="flex-shrink-0 px-3 py-1 bg-gradient-to-r from-orange-50 to-pink-50 text-primary rounded-full text-xs md:text-sm font-medium hover:from-orange-100 hover:to-pink-100 transition-all"
                    >
                      {hint}
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* Analytics Cards - Horizontal Scroll */}
          <div className="mb-4 md:mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-gray-700" />
              <h3 className="font-bold text-sm md:text-base text-gray-900">Your Stats</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
              <div className="flex-shrink-0 snap-start bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl shadow-lg p-4 text-white min-w-[140px]">
                <Store className="mb-2 w-6 h-6" />
                <p className="text-2xl font-bold">{filteredRestaurants.length}</p>
                <p className="text-xs text-white/90">Restaurants</p>
              </div>

              <div className="flex-shrink-0 snap-start bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg p-4 text-white min-w-[140px]">
                <Package className="mb-2 w-6 h-6" />
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
                <p className="text-xs text-white/90">Total Orders</p>
              </div>

              <div className="flex-shrink-0 snap-start bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg p-4 text-white min-w-[140px]">
                <ShoppingBag className="mb-2 w-6 h-6" />
                <p className="text-2xl font-bold">{stats.activeOrders}</p>
                <p className="text-xs text-white/90">Active</p>
              </div>

              <div className="flex-shrink-0 snap-start bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl shadow-lg p-4 text-white min-w-[140px]">
                <TrendingUp className="mb-2 w-6 h-6" />
                <p className="text-2xl font-bold">₹{stats.totalSpent}</p>
                <p className="text-xs text-white/90">Total Spent</p>
              </div>

              <div className="flex-shrink-0 snap-start bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl shadow-lg p-4 text-white min-w-[140px]">
                <Star className="mb-2 w-6 h-6" fill="currentColor" />
                <p className="text-2xl font-bold">{stats.completedOrders}</p>
                <p className="text-xs text-white/90">Completed</p>
              </div>
            </div>
          </div>

          {/* Cuisine Filters - Horizontal Scroll */}
          <div className="mb-4 md:mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-gray-700" />
              <h3 className="font-bold text-sm md:text-base text-gray-900">Filter by Cuisine</h3>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
              {cuisineFilters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`flex-shrink-0 snap-start px-4 py-2 rounded-xl whitespace-nowrap font-semibold text-sm transition-all transform active:scale-95 ${
                    selectedFilter === filter
                      ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-50 shadow'
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Restaurants Grid Header */}
          <div className="mb-4 md:mb-6">
            <h2 className="text-base md:text-lg lg:text-xl font-bold text-gray-900 mb-1">
              {selectedFilter === 'all'
                ? `All Restaurants Near You`
                : `${selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)} Restaurants`}
            </h2>
            <p className="text-xs md:text-sm text-gray-600">
              {filteredRestaurants.length} restaurants found within {SEARCH_RADIUS_KM}km
              {location && ` • Sorted by distance`}
            </p>
          </div>

          {/* Restaurants Grid */}
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-200 h-56 md:h-64 lg:h-72 rounded-xl md:rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : filteredRestaurants.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
              {filteredRestaurants.map((restaurant) => (
                <div
                  key={restaurant.id}
                  onClick={() => router.push(`/customer/restaurant/${restaurant.id}`)}
                  className="bg-white rounded-xl md:rounded-2xl shadow-md hover:shadow-xl transition-all cursor-pointer overflow-hidden transform active:scale-95 sm:hover:scale-105 group"
                >
                  {restaurant.banner_url ? (
                    <div className="relative h-32 md:h-36 lg:h-44">
                      <Image
                        src={restaurant.banner_url}
                        alt={restaurant.business_name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute top-2 right-2">
                        <button className="w-8 h-8 md:w-10 md:h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all">
                          <Heart className="w-4 h-4 md:w-5 md:h-5 text-red-500" />
                        </button>
                      </div>
                      {restaurant.distance !== undefined && (
                        <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-lg shadow-lg">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-primary" />
                            <span className="text-xs font-bold text-gray-900">
                              {restaurant.distance.toFixed(1)} km
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-32 md:h-36 lg:h-44 bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center relative">
                      <Store className="text-white w-10 h-10 md:w-12 md:h-12" />
                      <div className="absolute top-2 right-2">
                        <button className="w-8 h-8 md:w-10 md:h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all">
                          <Heart className="w-4 h-4 md:w-5 md:h-5 text-red-500" />
                        </button>
                      </div>
                      {restaurant.distance !== undefined && (
                        <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-lg shadow-lg">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-primary" />
                            <span className="text-xs font-bold text-gray-900">
                              {restaurant.distance.toFixed(1)} km
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-2 md:p-3 lg:p-4">
                    <h3 className="font-bold text-xs md:text-sm lg:text-base text-gray-900 mb-1.5 md:mb-2 truncate group-hover:text-primary transition-colors">
                      {restaurant.business_name}
                    </h3>

                    {restaurant.cuisine_types && restaurant.cuisine_types.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2 md:mb-3">
                        {restaurant.cuisine_types.slice(0, 2).map((cuisine: string, index: number) => (
                          <span
                            key={index}
                            className="px-1.5 md:px-2 py-0.5 bg-gradient-to-r from-orange-100 to-pink-100 text-orange-800 text-[10px] md:text-xs font-semibold rounded-full"
                          >
                            {cuisine}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs md:text-sm pt-2 md:pt-3 border-t">
                      <div className="flex items-center gap-0.5 text-yellow-600">
                        <Star className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" />
                        <span className="font-bold">4.5</span>
                      </div>
                      <div className="flex items-center gap-0.5 text-gray-600">
                        <Clock className="w-3 h-3 md:w-3.5 md:h-3.5" />
                        <span className="font-medium whitespace-nowrap text-[10px] md:text-xs">
                          {restaurant.estimated_prep_time || 30} min
                        </span>
                      </div>
                    </div>

                    {restaurant.min_order_amount > 0 && (
                      <div className="mt-2 text-[10px] md:text-xs text-gray-500">
                        Min order: ₹{restaurant.min_order_amount}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 md:py-16 bg-white rounded-xl md:rounded-2xl shadow-lg">
              <Store className="mx-auto text-gray-400 mb-4 w-16 h-16 md:w-20 md:h-20" />
              <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 mb-2">
                No restaurants found
              </h3>
              <p className="text-sm md:text-base text-gray-600 mb-2 px-4">
                No restaurants within {SEARCH_RADIUS_KM}km of your location
              </p>
              <p className="text-xs md:text-sm text-gray-500 mb-6 px-4">
                Try changing your location or filter
              </p>
              <button
                onClick={() => {
                  setSelectedFilter('all');
                  getCurrentLocation();
                }}
                className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-6 md:px-8 py-2.5 md:py-3 rounded-xl hover:from-orange-600 hover:to-pink-600 font-semibold shadow-lg hover:shadow-xl transition-all text-sm md:text-base"
              >
                Update Location
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Address Search Modal */}
      {showAddressSearch && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => setShowAddressSearch(false)}
          />
          <div className="fixed left-0 right-0 bottom-0 sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:bottom-auto w-full sm:w-[480px] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl z-50 max-h-[85vh] sm:max-h-[600px] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">Change Location</h2>
              <button
                onClick={() => setShowAddressSearch(false)}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4">
              <AddressAutocomplete
                onSelect={handleAddressSearchSelect}
                placeholder="Search for your address..."
              />
            </div>

            <div className="p-4 border-t">
              <button
                onClick={getCurrentLocation}
                disabled={locationLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50"
              >
                {locationLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Navigation className="w-5 h-5" />
                )}
                <span className="font-semibold">Use Current Location</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Saved Addresses Modal */}
      {showAddressModal && savedAddresses.length > 0 && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => setShowAddressModal(false)}
          />
          <div className="fixed left-0 right-0 bottom-0 sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:bottom-auto w-full sm:w-[480px] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl z-50 max-h-[85vh] sm:max-h-[600px] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">Saved Addresses</h2>
              <button
                onClick={() => setShowAddressModal(false)}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {savedAddresses.map((address) => (
                <button
                  key={address.id}
                  onClick={() => handleAddressSelect(address)}
                  className="w-full text-left p-3 border-2 rounded-xl hover:border-primary hover:bg-orange-50 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        address.is_default
                          ? 'bg-gradient-to-br from-orange-400 to-pink-500'
                          : 'bg-gray-200 group-hover:bg-orange-200'
                      }`}
                    >
                      <MapPin
                        className={`w-5 h-5 ${
                          address.is_default
                            ? 'text-white'
                            : 'text-gray-600 group-hover:text-primary'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 text-sm">{address.label}</h3>
                        {address.is_default && (
                          <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full font-semibold">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">{address.address}</p>
                    </div>
                    <ChevronDown className="w-5 h-5 -rotate-90 text-gray-400 group-hover:text-primary flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>

            <div className="p-4 border-t">
              <button
                onClick={() => {
                  setShowAddressModal(false);
                  router.push('/customer/addresses');
                }}
                className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl hover:from-orange-600 hover:to-pink-600 transition-all shadow-lg font-semibold"
              >
                Manage Addresses
              </button>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </DashboardLayout>
  );
}
