/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Merchant, MenuItem } from '@/types';
import { Search, MapPin, Star, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CustomerSearchPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState<'all' | 'restaurants' | 'dishes'>('all');

  useEffect(() => {
    if (searchQuery.length >= 2) {
      handleSearch();
    } else {
      setMerchants([]);
      setMenuItems([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, searchType]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      if (searchType === 'all' || searchType === 'restaurants') {
        const { data: merchantData } = await supabase
          .from('merchants')
          .select('*')
          .eq('is_active', true)
          .eq('is_verified', true)
          .ilike('business_name', `%${searchQuery}%`);

        setMerchants(merchantData as Merchant[] || []);
      }

      if (searchType === 'all' || searchType === 'dishes') {
        const { data: itemData } = await supabase
          .from('menu_items')
          .select('*')
          .eq('is_available', true)
          .ilike('name', `%${searchQuery}%`);

        setMenuItems(itemData as MenuItem[] || []);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Search</h1>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for restaurants or dishes..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              autoFocus
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setSearchType('all')}
            className={`px-4 py-2 rounded-lg font-medium ${
              searchType === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSearchType('restaurants')}
            className={`px-4 py-2 rounded-lg font-medium ${
              searchType === 'restaurants'
                ? 'bg-primary text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Restaurants
          </button>
          <button
            onClick={() => setSearchType('dishes')}
            className={`px-4 py-2 rounded-lg font-medium ${
              searchType === 'dishes'
                ? 'bg-primary text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Dishes
          </button>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-64 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Restaurants */}
            {merchants.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Restaurants</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {merchants.map((merchant) => (
                    <div
                      key={merchant.id}
                      onClick={() => router.push(`/customer/restaurant/${merchant.id}`)}
                      className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    >
                      {merchant.banner_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={merchant.banner_url}
                          alt={merchant.business_name}
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <div className="w-full h-48 bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
                          <MapPin className="text-white" size={64} />
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="font-bold text-gray-900 mb-1">{merchant.business_name}</h3>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {merchant.description || 'Delicious food awaits you'}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Star className="text-yellow-400 fill-yellow-400" size={16} />
                            <span className="text-sm font-medium">4.5</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin size={16} />
                            <span>{merchant.address?.address?.split(',')[0] || 'Nearby'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Menu Items */}
            {menuItems.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Dishes</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {menuItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    >
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-32 object-cover"
                        />
                      ) : (
                        <div className="w-full h-32 bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
                          <span className="text-white text-2xl">🍽️</span>
                        </div>
                      )}
                      <div className="p-3">
                        <h3 className="font-bold text-gray-900 text-sm mb-1">{item.name}</h3>
                        <p className="text-primary font-bold">₹{item.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {searchQuery.length >= 2 && merchants.length === 0 && menuItems.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg">
                <Search size={64} className="mx-auto text-gray-400 mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">No results found</h2>
                <p className="text-gray-600">Try searching with different keywords</p>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
