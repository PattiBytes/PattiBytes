/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useLocation } from '@/hooks/useLocation';
import { supabase } from '@/lib/supabase';
import { restaurantService } from '@/services/restaurants'; // FIXED: Added 's'
import { locationService } from '@/services/location';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { 
  ShoppingBag, 
  MapPin, 
  Clock, 
  Star,
  Search,
  Store,
  Package,
  User,
  Home,
  Navigation,
  Filter
} from 'lucide-react';
import { toast } from 'react-toastify';
import Image from 'next/image';

export default function CustomerDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { location, loading: locationLoading, getCurrentLocation } = useLocation();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<any[]>([]);
  const [allMenuItems, setAllMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
  });

  const cuisineFilters = ['all', 'punjabi', 'chinese', 'italian', 'south indian', 'cafe', 'desserts', 'fast food'];

  useEffect(() => {
    if (user) {
      loadStats();
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

  const loadStats = async () => {
    if (!user) return;

    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, status')
        .eq('user_id', user.id);

      if (error) {
        if (error.code === 'PGRST116' || error.code === '42P01') {
          setStats({ totalOrders: 0, activeOrders: 0 });
          return;
        }
        throw error;
      }

      const total = orders?.length || 0;
      const active = orders?.filter((o) => 
        ['pending', 'confirmed', 'preparing', 'on_the_way'].includes(o.status)
      ).length || 0;

      setStats({
        totalOrders: total,
        activeOrders: active,
      });
    } catch (error: any) {
      console.error('Stats error:', error.message);
      setStats({ totalOrders: 0, activeOrders: 0 });
    }
  };

  const loadNearbyRestaurants = async () => {
    if (!location) return;

    setLoading(true);
    try {
      const nearby = await restaurantService.getNearbyRestaurants(
        location.lat,
        location.lon,
        100
      );

      const withDistance = nearby.map((restaurant) => ({
        ...restaurant,
        distance: locationService.calculateDistance(
          location.lat,
          location.lon,
          restaurant.latitude,
          restaurant.longitude
        ),
      }));

      withDistance.sort((a, b) => a.distance - b.distance);
      setRestaurants(withDistance);
      setFilteredRestaurants(withDistance);

      const menuPromises = withDistance.map(async (restaurant) => {
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
        r.cuisine_types?.some((c: string) => 
          c.toLowerCase().includes(selectedFilter.toLowerCase())
        )
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
      .filter((r) => 
        r.business_name.toLowerCase().includes(lowerQuery) ||
        r.cuisine_types?.some((c: string) => c.toLowerCase().includes(lowerQuery))
      )
      .map((r) => ({ ...r, type: 'restaurant' }));

    const menuResults = allMenuItems
      .filter((item) => 
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
      router.push(`/customer/restaurant/${result.restaurant_id}`);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Nav */}
        <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => router.push('/customer/home')}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-shadow whitespace-nowrap"
          >
            <Home size={18} className="text-primary" />
            <span className="font-medium">Home</span>
          </button>
          <button
            onClick={() => router.push('/customer/orders')}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-shadow whitespace-nowrap"
          >
            <Package size={18} className="text-blue-600" />
            <span className="font-medium">Orders</span>
            {stats.activeOrders > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {stats.activeOrders}
              </span>
            )}
          </button>
          <button
            onClick={() => router.push('/customer/addresses')}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-shadow whitespace-nowrap"
          >
            <MapPin size={18} className="text-green-600" />
            <span className="font-medium">Addresses</span>
          </button>
          <button
            onClick={() => router.push('/customer/profile')}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-shadow whitespace-nowrap"
          >
            <User size={18} className="text-purple-600" />
            <span className="font-medium">Profile</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-600 flex-shrink-0">
              <MapPin size={20} className="text-primary" />
              <span className="text-sm">
                {location?.address?.slice(0, 30) || 'Loading...'}
              </span>
            </div>
            <button
              onClick={getCurrentLocation}
              disabled={locationLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex-shrink-0 disabled:opacity-50"
            >
              <Navigation size={18} />
              <span className="hidden sm:inline">Update</span>
            </button>
          </div>

          <div className="relative mt-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search restaurants, cuisines, or dishes..."
              className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-lg"
            />

            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-96 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => handleResultClick(result)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 flex items-start gap-3"
                  >
                    {result.type === 'restaurant' ? (
                      <>
                        <Store className="text-primary flex-shrink-0 mt-1" size={20} />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{result.business_name}</p>
                          <p className="text-sm text-gray-600">
                            {result.cuisine_types?.slice(0, 2).join(', ')} • {result.distance.toFixed(1)} km
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="text-green-600 flex-shrink-0 mt-1" size={20} />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{result.name}</p>
                          <p className="text-sm text-gray-600">
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
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm text-gray-600">Try:</span>
              {['Paneer', 'Biryani', 'Pizza', 'Chinese', 'Desserts'].map((hint) => (
                <button
                  key={hint}
                  onClick={() => handleSearch(hint)}
                  className="px-3 py-1 bg-orange-50 text-primary rounded-full text-sm hover:bg-orange-100"
                >
                  {hint}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cuisine Filters */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-gray-600" />
            <h3 className="font-bold text-gray-900">Filter by Cuisine</h3>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {cuisineFilters.map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium transition-colors ${
                  selectedFilter === filter
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                } shadow`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg shadow-lg p-4 text-white">
            <Store size={24} className="mb-2" />
            <p className="text-2xl font-bold">{filteredRestaurants.length}</p>
            <p className="text-sm text-white/90">Restaurants</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg shadow-lg p-4 text-white">
            <Package size={24} className="mb-2" />
            <p className="text-2xl font-bold">{allMenuItems.length}</p>
            <p className="text-sm text-white/90">Menu Items</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg shadow-lg p-4 text-white">
            <ShoppingBag size={24} className="mb-2" />
            <p className="text-2xl font-bold">{stats.totalOrders}</p>
            <p className="text-sm text-white/90">Total Orders</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg shadow-lg p-4 text-white">
            <Clock size={24} className="mb-2" />
            <p className="text-2xl font-bold">{stats.activeOrders}</p>
            <p className="text-sm text-white/90">Active Orders</p>
          </div>
        </div>

        {/* Restaurants Grid */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {selectedFilter === 'all' ? 'All Restaurants' : `${selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)} Restaurants`} ({filteredRestaurants.length})
          </h2>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-64 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredRestaurants.length > 0 ? (
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredRestaurants.map((restaurant) => (
              <div
                key={restaurant.id}
                onClick={() => router.push(`/customer/restaurant/${restaurant.id}`)}
                className="bg-white rounded-lg shadow hover:shadow-xl transition-all cursor-pointer overflow-hidden transform hover:scale-105"
              >
                {restaurant.banner_url ? (
                  <div className="relative h-40">
                    <Image
                      src={restaurant.banner_url}
                      alt={restaurant.business_name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-40 bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
                    <Store className="text-white" size={48} />
                  </div>
                )}

                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-900 mb-2 truncate">
                    {restaurant.business_name}
                  </h3>

                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <MapPin size={14} />
                    <span>{restaurant.distance.toFixed(1)} km</span>
                  </div>

                  {restaurant.cuisine_types && restaurant.cuisine_types.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {restaurant.cuisine_types.slice(0, 2).map((cuisine: string, index: number) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded"
                        >
                          {cuisine}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-yellow-600">
                      <Star size={14} fill="currentColor" />
                      <span className="font-semibold">4.5</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Clock size={14} />
                      <span>30-40 min</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg">
            <Store size={64} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No restaurants found</h3>
            <p className="text-gray-600 mb-4">Try a different filter or update your location</p>
            <button
              onClick={() => setSelectedFilter('all')}
              className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-medium"
            >
              Show All
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
