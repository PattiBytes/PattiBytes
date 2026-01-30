/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Search, MapPin, Star, Clock, TrendingUp, Navigation, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import Image from 'next/image';

interface Merchant {
  id: string;
  business_name: string;
  address: string;
  cuisine_types: string[];
  description: string;
  logo_url: string;
  banner_url: string;
  rating: number;
  total_orders: number;
  is_active: boolean;
  is_verified: boolean;
  latitude: number;
  longitude: number;
  distance?: number;
}

export default function CustomerDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const maxDistance = 100;

  useEffect(() => {
    if (user) loadRestaurants();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getUserLocation = () => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
          toast.success('Location updated!');
          loadRestaurants(location.lat, location.lng);
          setLocationLoading(false);
        },
        (error) => {
          console.error('Location error:', error);
          toast.error('Unable to get location');
          loadRestaurants();
          setLocationLoading(false);
        }
      );
    } else {
      toast.error('Geolocation not supported');
      loadRestaurants();
      setLocationLoading(false);
    }
  };

  const loadRestaurants = async (userLat?: number, userLng?: number) => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('is_active', true)
        .eq('is_verified', true)
        .order('rating', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      let merchantsData = (data as Merchant[]) || [];

      if (userLat && userLng) {
        merchantsData = merchantsData
          .map((merchant) => {
            if (merchant.latitude && merchant.longitude) {
              const distance = calculateDistance(
                userLat,
                userLng,
                merchant.latitude,
                merchant.longitude
              );
              return { ...merchant, distance };
            }
            return { ...merchant, distance: 9999 };
          })
          .filter((merchant) => merchant.distance <= maxDistance)
          .sort((a, b) => (a.distance || 9999) - (b.distance || 9999));
      }

      setRestaurants(merchantsData);
    } catch (error: any) {
      console.error('Failed to load restaurants:', error);
      if (error?.code !== 'PGRST116') {
        toast.error('Unable to load restaurants');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredRestaurants = restaurants.filter(
    (restaurant) =>
      restaurant.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      restaurant.cuisine_types?.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                Welcome back, {user?.user_metadata?.full_name || 'Guest'}! 👋
              </h1>
              <p className="text-lg opacity-90">
                What would you like to eat today?
              </p>
            </div>
            <button
              onClick={getUserLocation}
              disabled={locationLoading}
              className="flex items-center gap-2 bg-white text-primary px-4 py-2 rounded-lg hover:bg-orange-50 transition-colors disabled:opacity-50"
            >
              {locationLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Navigation size={20} />
              )}
              <span className="hidden sm:inline">
                {userLocation ? 'Update Location' : 'Use Location'}
              </span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-4 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search restaurants or cuisines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-lg"
            />
          </div>
          {userLocation && (
            <p className="text-sm text-gray-600 mt-2">
              📍 Showing restaurants within {maxDistance}km
            </p>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Orders</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">0</p>
              </div>
              <Clock className="text-orange-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">0</p>
              </div>
              <TrendingUp className="text-green-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Favorite Spots</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">0</p>
              </div>
              <Star className="text-yellow-500" size={32} />
            </div>
          </div>
        </div>

        {/* Restaurants */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {userLocation ? 'Nearby Restaurants' : 'Featured Restaurants'}
            </h2>
            <span className="text-gray-600">{filteredRestaurants.length} restaurants</span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-200 h-64 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredRestaurants.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
              <MapPin size={64} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No restaurants found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery
                  ? 'Try adjusting your search'
                  : 'No restaurants available right now'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredRestaurants.map((restaurant) => (
                <div
                  key={restaurant.id}
                  onClick={() => router.push(`/customer/restaurant/${restaurant.id}`)}
                  className="bg-white rounded-lg shadow overflow-hidden hover:shadow-xl transition-all cursor-pointer group"
                >
                  <div className="relative h-48 bg-gradient-to-br from-orange-100 to-orange-200">
                    {restaurant.banner_url ? (
                      <Image
                        src={restaurant.banner_url}
                        alt={restaurant.business_name}
                        fill
                        sizes="400px"
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-6xl">
                        🍽️
                      </div>
                    )}
                    {restaurant.distance !== undefined && restaurant.distance < 9999 && (
                      <div className="absolute top-3 left-3 bg-white/90 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <MapPin size={12} />
                        {restaurant.distance.toFixed(1)} km
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-bold text-lg text-gray-900 mb-1 truncate">
                      {restaurant.business_name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {restaurant.description || restaurant.address}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Star className="text-yellow-400 fill-yellow-400" size={16} />
                        <span className="text-sm font-medium">{restaurant.rating?.toFixed(1) || '4.5'}</span>
                      </div>
                      <span className="text-xs px-3 py-1 bg-orange-50 text-primary rounded-full font-semibold">
                        {restaurant.cuisine_types?.[0] || 'Food'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
