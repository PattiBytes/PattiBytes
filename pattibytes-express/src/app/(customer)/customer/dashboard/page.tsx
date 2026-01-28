'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { restaurantService } from '@/services/restaurants';
import { Merchant } from '@/types';
import { MapPin, Search, Bell, ShoppingBag, Heart } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import RestaurantCard from '@/components/customer/RestaurantCard';

// Dynamic import for map (client-side only)
const MapView = dynamic(() => import('@/components/common/MapView'), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-200 animate-pulse rounded-lg" />,
});

export default function CustomerDashboard() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications(user?.id);
  const [restaurants, setRestaurants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number]>([30.9010, 75.8573]); // Default Ludhiana

  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        () => {
          console.log('Location access denied, using default');
        }
      );
    }
  }, []);

  useEffect(() => {
    const loadRestaurants = async () => {
      try {
        const nearby = await restaurantService.getNearbyRestaurants(
          userLocation[0],
          userLocation[1]
        );
        setRestaurants(nearby);
      } catch (error) {
        console.error('Failed to load restaurants:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRestaurants();
  }, [userLocation]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const results = await restaurantService.searchRestaurants(searchQuery);
      setRestaurants(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary">Pattibytes Express</h1>
              <div className="flex items-center text-gray-600 text-sm mt-1">
                <MapPin size={16} className="mr-1" />
                <span>Ludhiana, Punjab</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Link href="/customer/orders" className="flex items-center gap-2 text-gray-700 hover:text-primary">
                <ShoppingBag size={20} />
                <span className="hidden md:inline">Orders</span>
              </Link>
              
              <Link href="/customer/favorites" className="flex items-center gap-2 text-gray-700 hover:text-primary">
                <Heart size={20} />
                <span className="hidden md:inline">Favorites</span>
              </Link>
              
              <Link href="/customer/notifications" className="relative">
                <Bell size={24} className="text-gray-700 hover:text-primary" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Link>

              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                {user?.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search for restaurants, cuisines, dishes..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-orange-600 font-medium"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Map View */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Restaurants Near You</h2>
          <div className="h-96 rounded-lg overflow-hidden shadow">
            <MapView
              center={userLocation}
              zoom={13}
              markers={restaurants.map((r) => ({
                position: [r.latitude, r.longitude],
                popup: r.business_name,
              }))}
            />
          </div>
        </div>

        {/* Restaurant Grid */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {restaurants.length} Restaurants Available
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-200 h-80 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : restaurants.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No restaurants found in your area</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {restaurants.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
