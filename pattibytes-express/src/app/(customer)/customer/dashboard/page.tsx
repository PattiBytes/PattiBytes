/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { restaurantService, type Restaurant } from '@/services/restaurants';
import { locationService, type SavedAddress } from '@/services/location';
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
  MapPinned,
  Loader2,
  X,
  Edit2,
} from 'lucide-react';
import { toast } from 'react-toastify';
import Image from 'next/image';

interface Location {
  lat: number;
  lon: number;
  address: string;
}

interface MenuItem {
  id: string;
  merchant_id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image_url?: string;
  is_available?: boolean;
  is_veg?: boolean; // Changed from required to optional
  discount_percentage?: number;
  restaurant_name?: string;
  restaurant_id?: string;
  created_at?: string;
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

  const SEARCH_RADIUS_KM = 100;

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
      const addresses = await locationService.getSavedAddresses(user.id);
      setSavedAddresses(addresses);

      if (addresses && addresses.length > 0) {
        const defaultAddr = addresses.find((a) => a.is_default) || addresses[0];
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

      setLocation({
        lat: 30.901,
        lon: 75.8573,
        address: 'Patti, Punjab, India',
      });
      toast.info('Using default location: Patti');
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
        .select('id, status')
        .eq('customer_id', user.id)
        .limit(100);

      if (error) {
        console.warn('Orders table error:', error.message);
        setStats({ totalOrders: 0, activeOrders: 0, completedOrders: 0, totalSpent: 0 });
        return;
      }

      if (!orders || orders.length === 0) {
        setStats({ totalOrders: 0, activeOrders: 0, completedOrders: 0, totalSpent: 0 });
        return;
      }

      const total = orders.length;
      const active = orders.filter((o) =>
        ['pending', 'confirmed', 'preparing', 'on_the_way'].includes(o.status)
      ).length;
      const completed = orders.filter((o) => o.status === 'delivered').length;

      let totalSpent = 0;
      try {
        const { data: orderAmounts } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('customer_id', user.id);
        
        if (orderAmounts) {
          totalSpent = orderAmounts.reduce((sum, o) => sum + (o.total_amount || 0), 0);
        }
      } catch {
        totalSpent = 0;
      }

      setStats({
        totalOrders: total,
        activeOrders: active,
        completedOrders: completed,
        totalSpent,
      });
    } catch (error: any) {
      console.warn('Stats loading failed:', error.message);
      setStats({ totalOrders: 0, activeOrders: 0, completedOrders: 0, totalSpent: 0 });
    }
  };

  const loadNearbyRestaurants = async () => {
    if (!location) return;

    setLoading(true);
    try {
      console.log(`🔍 Searching restaurants within ${SEARCH_RADIUS_KM}km`);

      const nearby = await restaurantService.getNearbyRestaurants(
        location.lat,
        location.lon,
        SEARCH_RADIUS_KM
      );

      console.log(`✅ Found ${nearby.length} restaurants`);

      setRestaurants(nearby);
      setFilteredRestaurants(nearby);

      if (nearby.length > 0) {
        const menuPromises = nearby.slice(0, 10).map(async (restaurant) => {
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
      }
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
          item.description?.toLowerCase().includes(lowerQuery)
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
          <div className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 rounded-xl md:rounded-2xl shadow-lg p-4 md:p-6 mb-4 md:mb-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 md:w-64 h-32 md:h-64 bg-white/10 rounded-full -mr-16 md:-mr-32 -mt-16 md:-mt-32" />
            <div className="relative z-10">
              <h1 className="text-lg md:text-2xl lg:text-3xl font-bold mb-1">
                Welcome, {user?.user_metadata?.full_name?.split(' ')[0] || 'Food Lover'}! 👋
              </h1>
              <p className="text-white/90 text-sm md:text-base">
                Discover delicious food within {SEARCH_RADIUS_KM}km
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-4 md:mb-6 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 pb-2">
              {[
                { icon: Home, label: 'Home', path: '/customer/dashboard', color: 'from-orange-400 to-orange-600', value: '' },
                { icon: Package, label: 'Orders', path: '/customer/orders', color: 'from-blue-400 to-blue-600', value: stats.totalOrders, badge: stats.activeOrders },
                { icon: MapPin, label: 'Addresses', path: '/customer/addresses', color: 'from-green-400 to-green-600', value: savedAddresses.length },
                { icon: UserIcon, label: 'Profile', path: '/customer/profile', color: 'from-purple-400 to-purple-600', value: '' },
                { icon: Heart, label: 'Favorites', path: '/customer/favorites', color: 'from-pink-400 to-pink-600', value: '' },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => router.push(item.path)}
                  className="flex-shrink-0 bg-white rounded-xl shadow-md hover:shadow-lg transition-all p-3 flex items-center gap-3 min-w-[140px] relative"
                >
                  <div className={`w-10 h-10 bg-gradient-to-br ${item.color} rounded-full flex items-center justify-center`}>
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900 text-sm">{item.label}</p>
                    <p className="text-xs text-gray-600">{item.value || 'View'}</p>
                  </div>
                  {item.badge && item.badge > 0 && (
                    <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Location & Search */}
          <div className="bg-white rounded-xl shadow-lg p-3 md:p-4 lg:p-6 mb-4 md:mb-6">
            <div className="flex items-center justify-between mb-3 pb-3 border-b">
              <div className="flex items-start gap-2 flex-1 min-w-0 pr-2">
                <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600 mb-0.5">Delivering to:</p>
                  <p className="font-semibold text-sm text-gray-900 line-clamp-2">
                    {location?.address || 'Loading location...'}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Within {SEARCH_RADIUS_KM}km radius
                  </p>
                </div>
              </div>

              <div className="flex gap-1.5">
                <button
                  onClick={() => setShowAddressSearch(true)}
                  className="p-2 bg-orange-50 text-primary rounded-lg hover:bg-orange-100 transition-colors"
                  title="Change location"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={getCurrentLocation}
                  disabled={locationLoading}
                  className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
                  title="Detect current location"
                >
                  {locationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                </button>
                {savedAddresses.length > 0 && (
                  <button
                    onClick={() => setShowAddressModal(true)}
                    className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                    title="Saved addresses"
                  >
                    <MapPinned className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search restaurants or dishes..."
                className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all"
              />

              {searchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-2xl max-h-96 overflow-y-auto">
                  {searchResults.map((result, index) => (
                    <button
                      key={index}
                      onClick={() => handleResultClick(result)}
                      className="w-full text-left px-3 py-2.5 hover:bg-orange-50 border-b last:border-b-0 flex items-start gap-2 transition-colors"
                    >
                      {result.type === 'restaurant' ? (
                        <>
                          <Store className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">
                              {result.business_name}
                            </p>
                            <p className="text-xs text-gray-600">
                              {result.distance?.toFixed(1)} km away
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="text-green-600 w-5 h-5 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">
                              {result.name}
                            </p>
                            <p className="text-xs text-gray-600">
                              {result.restaurant_name} • ₹{result.price}
                            </p>
                          </div>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!searchQuery && (
              <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
                <span className="text-xs text-gray-600 flex items-center gap-1 flex-shrink-0">
                  <TrendingUp className="w-3 h-3" />
                  Popular:
                </span>
                {['Paneer', 'Biryani', 'Pizza', 'Chinese'].map((hint) => (
                  <button
                    key={hint}
                    onClick={() => handleSearch(hint)}
                    className="flex-shrink-0 px-3 py-1 bg-gradient-to-r from-orange-50 to-pink-50 text-primary rounded-full text-xs font-medium hover:from-orange-100 hover:to-pink-100 transition-colors"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="mb-4 md:mb-6 overflow-x-auto scrollbar-hide">
            <div className="flex gap-3 pb-2">
              {[
                { icon: Store, label: 'Restaurants', value: filteredRestaurants.length, color: 'from-orange-500 to-pink-500' },
                { icon: Package, label: 'Total Orders', value: stats.totalOrders, color: 'from-blue-500 to-cyan-500' },
                { icon: ShoppingBag, label: 'Active', value: stats.activeOrders, color: 'from-green-500 to-emerald-500' },
                { icon: TrendingUp, label: 'Total Spent', value: `₹${stats.totalSpent}`, color: 'from-purple-500 to-indigo-500' },
              ].map((stat, idx) => (
                <div
                  key={idx}
                  className={`flex-shrink-0 bg-gradient-to-br ${stat.color} rounded-xl shadow-lg p-4 text-white min-w-[140px]`}
                >
                  <stat.icon className="mb-2 w-6 h-6" />
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-white/90">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="mb-4 md:mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-gray-700" />
              <h3 className="font-bold text-sm text-gray-900">Filter by Cuisine</h3>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {cuisineFilters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
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

          {/* Restaurants */}
          <div className="mb-4">
            <h2 className="text-base md:text-lg font-bold text-gray-900 mb-1">
              {selectedFilter === 'all' ? 'All Restaurants' : `${selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)}`}
            </h2>
            <p className="text-xs text-gray-600 mb-4">
              {filteredRestaurants.length} restaurants • Within {SEARCH_RADIUS_KM}km
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-gray-200 h-56 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredRestaurants.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredRestaurants.map((restaurant) => (
                <div
                  key={restaurant.id}
                  onClick={() => router.push(`/customer/restaurant/${restaurant.id}`)}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all cursor-pointer overflow-hidden group"
                >
                  {restaurant.banner_url || restaurant.logo_url ? (
                    <div className="relative h-32">
                      <Image
                        src={restaurant.banner_url || restaurant.logo_url || ''}
                        alt={restaurant.business_name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                        priority={false}
                      />
                      {restaurant.distance !== undefined && (
                        <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-lg shadow-lg">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-primary" />
                            <span className="text-xs font-bold">{restaurant.distance.toFixed(1)} km</span>
                          </div>
                        </div>
                      )}
                      {restaurant.banner_url && restaurant.logo_url && (
                        <div className="absolute top-2 right-2 w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-lg bg-white">
                          <Image
                            src={restaurant.logo_url}
                            alt={`${restaurant.business_name} logo`}
                            fill
                            className="object-cover"
                            priority={false}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-32 bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center relative">
                      <Store className="text-white w-10 h-10" />
                      {restaurant.distance !== undefined && (
                        <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-lg shadow-lg">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-primary" />
                            <span className="text-xs font-bold">{restaurant.distance.toFixed(1)} km</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-2 md:p-3">
                    <h3 className="font-bold text-xs md:text-sm text-gray-900 mb-1.5 truncate" title={restaurant.business_name}>
                      {restaurant.business_name}
                    </h3>

                    {restaurant.cuisine_types && restaurant.cuisine_types.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {restaurant.cuisine_types.slice(0, 2).map((cuisine, index) => (
                          <span
                            key={index}
                            className="px-1.5 py-0.5 bg-orange-100 text-orange-800 text-[10px] font-semibold rounded-full"
                          >
                            {cuisine}
                          </span>
                        ))}
                        {restaurant.cuisine_types.length > 2 && (
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-semibold rounded-full">
                            +{restaurant.cuisine_types.length - 2}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs pt-2 border-t">
                      <div className="flex items-center gap-0.5 text-yellow-600">
                        <Star className="w-3 h-3" fill="currentColor" />
                        <span className="font-bold">{restaurant.average_rating?.toFixed(1) || '4.5'}</span>
                      </div>
                      <div className="flex items-center gap-0.5 text-gray-600">
                        <Clock className="w-3 h-3" />
                        <span>{restaurant.estimated_prep_time || 30} min</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl shadow-lg">
              <Store className="mx-auto text-gray-400 mb-4 w-16 h-16" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No restaurants found</h3>
              <p className="text-sm text-gray-600 mb-6">
                No restaurants within {SEARCH_RADIUS_KM}km
              </p>
              <button
                onClick={() => {
                  setSelectedFilter('all');
                  getCurrentLocation();
                }}
                className="bg-primary text-white px-6 py-3 rounded-xl hover:bg-orange-600 font-semibold transition-colors"
              >
                Update Location
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddressSearch && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowAddressSearch(false)} />
          <div className="fixed left-0 right-0 bottom-0 sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:bottom-auto w-full sm:w-[480px] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl z-50 max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold">Change Location</h2>
              <button 
                onClick={() => setShowAddressSearch(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <AddressAutocomplete onSelect={handleAddressSearchSelect} />
            </div>
          </div>
        </>
      )}

      {showAddressModal && savedAddresses.length > 0 && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowAddressModal(false)} />
          <div className="fixed left-0 right-0 bottom-0 sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:bottom-auto w-full sm:w-[480px] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl z-50 max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold">Saved Addresses</h2>
              <button 
                onClick={() => setShowAddressModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {savedAddresses.map((address) => (
                <button
                  key={address.id}
                  onClick={() => handleAddressSelect(address)}
                  className="w-full text-left p-3 border-2 rounded-xl hover:border-primary mb-3 last:mb-0 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm mb-1">{address.label}</h3>
                      <p className="text-xs text-gray-600 line-clamp-2">{address.address}</p>
                    </div>
                  </div>
                </button>
              ))}
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
