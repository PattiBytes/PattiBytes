'use client';

import { useEffect, useState } from 'react';
import { restaurantService } from '@/services/restaurants';
import { Merchant } from '@/types';
import { MapPin, Search } from 'lucide-react';
import dynamic from 'next/dynamic';
import RestaurantCard from '@/components/customer/RestaurantCard';
import DashboardLayout from '@/components/layouts/DashboardLayout';

const MapView = dynamic(() => import('@/components/common/MapView'), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-200 animate-pulse rounded-lg" />,
});

export default function CustomerDashboard() {
  const [restaurants, setRestaurants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number]>([30.9010, 75.8573]);

  useEffect(() => {
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
    <DashboardLayout>
      {/* Search Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-2 text-gray-600 text-sm mb-4">
            <MapPin size={16} />
            <span>Ludhiana, Punjab</span>
          </div>
          
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Map View */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Near You</h2>
          <div className="h-80 rounded-lg overflow-hidden shadow">
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
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            {restaurants.length} Restaurants
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-200 h-80 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : restaurants.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No restaurants found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {restaurants.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
