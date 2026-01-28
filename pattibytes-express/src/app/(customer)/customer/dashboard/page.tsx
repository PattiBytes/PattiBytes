/* eslint-disable @next/next/no-html-link-for-pages */
/* eslint-disable react/jsx-no-comment-textnodes */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Search, MapPin, Star, Clock, TrendingUp } from 'lucide-react';
import { Merchant } from '@/types';
import { useRouter } from 'next/navigation';

export default function CustomerDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadRestaurants();
     
  }, [user]);

  const loadRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('is_active', true)
        .eq('is_verified', true)
        .order('rating', { ascending: false })
        .limit(6);

      if (error) throw error;
      setRestaurants(data as Merchant[]);
    } catch (error) {
      console.error('Failed to load restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl p-8 mb-8 text-white">
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, {user?.full_name}! 👋
          </h1>
          <p className="text-lg opacity-90">
            What would you like to eat today?
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-4 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search for restaurants, cuisines, or dishes..."
              className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-lg"
              onClick={() => router.push('/customer/search')}
            />
          </div>
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

        {/* Popular Restaurants */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Popular Restaurants</h2>
            <a
              href="/customer/restaurants"
              className="text-primary hover:text-orange-600 font-medium"
            >
              View All →
            </a>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-200 h-64 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : restaurants.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg">
              <MapPin size={64} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No restaurants available</h3>
              <p className="text-gray-600">Check back soon for new restaurants</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {restaurants.map((restaurant) => (
                <div
                  key={restaurant.id}
                  onClick={() => router.push(`/customer/restaurant/${restaurant.id}`)}
                  className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                >
                  {restaurant.banner_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={restaurant.banner_url}
                      alt={restaurant.business_name}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
                      <MapPin className="text-white" size={64} />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 mb-1">{restaurant.business_name}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {restaurant.description || 'Delicious food awaits you'}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Star className="text-yellow-400 fill-yellow-400" size={16} />
                        <span className="text-sm font-medium">{restaurant.rating || 4.5}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <MapPin size={16} />
                        <span>{restaurant.address?.address?.split(',')[0] || 'Nearby'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        // eslint-disable-next-line react/jsx-no-comment-textnodes
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          // eslint-disable-next-line @next/next/no-html-link-for-pages
          <a
            href="/customer/orders"
            className="bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl p-6 text-white hover:shadow-lg transition-shadow"
          >
            <Clock size={32} className="mb-3" />
            <h3 className="text-xl font-bold mb-2">My Orders</h3>
            <p className="opacity-90">Track your current and past orders</p>
          </a>

          <a
            href="/customer/restaurants"
            className="bg-gradient-to-br from-green-500 to-teal-500 rounded-xl p-6 text-white hover:shadow-lg transition-shadow"
          >
            <MapPin size={32} className="mb-3" />
            <h3 className="text-xl font-bold mb-2">Explore Restaurants</h3>
            <p className="opacity-90">Discover new dining options near you</p>
          </a>
        </div>
      </div>
    </DashboardLayout>
  );
}
