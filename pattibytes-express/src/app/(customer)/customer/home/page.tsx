/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
import { restaurantService } from '@/services/restaurants';
import { locationService } from '@/services/location';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { MapPin, Search, Navigation, Store, Star, Clock, TrendingUp } from 'lucide-react';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function CustomerHomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { location, loading: locationLoading, getCurrentLocation, searchLocation } = useLocation();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deliveryRadius, setDeliveryRadius] = useState(10);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);

  useEffect(() => {
    if (location && user) {
      loadRestaurants();
      loadSavedAddresses();
    }
  }, [location, user]);

  const loadRestaurants = async () => {
    if (!location) return;

    setLoading(true);
    try {
      const nearby = await restaurantService.getNearbyRestaurants(
        location.lat,
        location.lon,
        deliveryRadius
      );

      // Calculate distance for each restaurant
      const withDistance = nearby.map((restaurant) => ({
        ...restaurant,
        distance: locationService.calculateDistance(
          location.lat,
          location.lon,
          restaurant.latitude,
          restaurant.longitude
        ),
      }));

      // Sort by distance
      withDistance.sort((a, b) => a.distance - b.distance);
      setRestaurants(withDistance);
    } catch (error) {
      console.error('Failed to load restaurants:', error);
      toast.error('Failed to load restaurants');
    } finally {
      setLoading(false);
    }
  };

  const loadSavedAddresses = async () => {
    if (!user) return;
    
    try {
      const addresses = await locationService.getSavedAddresses(user.id);
      setSavedAddresses(addresses);
    } catch (error) {
      console.error('Failed to load addresses:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      const results = await searchLocation(searchQuery);
      if (results && results.length > 0) {
        toast.success('Location updated!');
        loadRestaurants();
      }
    } catch (error) {
      toast.error('Search failed');
    }
  };

  const selectSavedAddress = async (address: any) => {
    // Update location using saved address coordinates
    await searchLocation(address.address);
    setShowAddressModal(false);
    toast.success('Using saved address');
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Location Bar */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <MapPin className="text-primary" size={24} />
              <div>
                <h3 className="font-bold text-gray-900">Delivery Location</h3>
                <p className="text-sm text-gray-600">
                  {location?.address || 'Loading location...'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddressModal(true)}
                className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 font-medium"
              >
                Saved Addresses
              </button>
              <button
                onClick={() => router.push('/customer/addresses')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Manage
              </button>
            </div>
          </div>

          {/* Search and Radius */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search location..."
                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
            <select
              value={deliveryRadius}
              onChange={(e) => {
                setDeliveryRadius(Number(e.target.value));
                loadRestaurants();
              }}
              className="px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary"
            >
              <option value={5}>Within 5 km</option>
              <option value={10}>Within 10 km</option>
              <option value={15}>Within 15 km</option>
              <option value={20}>Within 20 km</option>
            </select>
            <button
              onClick={getCurrentLocation}
              disabled={locationLoading}
              className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-medium flex items-center gap-2"
            >
              <Navigation size={20} />
              Current Location
            </button>
          </div>
        </div>

        {/* Restaurants Grid */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Restaurants Near You
          </h2>
          <p className="text-gray-600">
            {restaurants.length} restaurant{restaurants.length !== 1 ? 's' : ''} available
          </p>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-64 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : restaurants.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-6">
            {restaurants.map((restaurant) => (
              <div
                key={restaurant.id}
                onClick={() => router.push(`/customer/restaurant/${restaurant.id}`)}
                className="bg-white rounded-lg shadow hover:shadow-xl transition-shadow cursor-pointer overflow-hidden"
              >
                {restaurant.banner_url ? (
                  <div className="relative h-48">
                    <Image
                      src={restaurant.banner_url}
                      alt={restaurant.business_name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
                    <Store className="text-white" size={64} />
                  </div>
                )}

                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-900 mb-2">
                    {restaurant.business_name}
                  </h3>

                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <MapPin size={16} />
                    <span>{restaurant.distance.toFixed(1)} km away</span>
                    <span>•</span>
                    <span>
                      ₹{locationService.calculateDeliveryCharge(restaurant.distance)} delivery
                    </span>
                  </div>

                  {restaurant.cuisine_types && restaurant.cuisine_types.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {restaurant.cuisine_types.slice(0, 3).map((cuisine: string, index: number) => (
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
                      <Star size={16} fill="currentColor" />
                      <span className="font-semibold">4.5</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Clock size={16} />
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
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No restaurants found
            </h3>
            <p className="text-gray-600 mb-4">
              Try increasing your delivery radius or changing your location
            </p>
            <button
              onClick={() => {
                setDeliveryRadius(20);
                loadRestaurants();
              }}
              className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-medium"
            >
              Increase Radius to 20km
            </button>
          </div>
        )}

        {/* Saved Addresses Modal */}
        {showAddressModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6 border-b">
                <h2 className="text-2xl font-bold">Select Delivery Address</h2>
              </div>

              <div className="p-6 space-y-4">
                {savedAddresses.map((address) => (
                  <button
                    key={address.id}
                    onClick={() => selectSavedAddress(address)}
                    className="w-full text-left p-4 border-2 rounded-lg hover:border-primary transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <MapPin className="text-primary flex-shrink-0 mt-1" size={20} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900">{address.label}</h3>
                          {address.is_default && (
                            <span className="px-2 py-1 bg-primary text-white text-xs rounded">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700">{address.address}</p>
                      </div>
                    </div>
                  </button>
                ))}

                <button
                  onClick={() => {
                    setShowAddressModal(false);
                    router.push('/customer/addresses');
                  }}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary hover:text-primary font-medium"
                >
                  + Add New Address
                </button>
              </div>

              <div className="p-6 border-t">
                <button
                  onClick={() => setShowAddressModal(false)}
                  className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
