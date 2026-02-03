 
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Plus, Store, Mail, Phone, MapPin, Trash2, Settings, LogOut, Search, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import { Merchant } from '@/types';

export default function AdminMerchantsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('all');

  useEffect(() => {
    if (user) loadMerchants();
  }, [user]);

  const loadMerchants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('merchants').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setMerchants((data as Merchant[]) || []);
    } catch (error) {
      console.error('Failed to load merchants:', error);
      toast.error('Failed to load merchants');
    } finally {
      setLoading(false);
    }
  };

  const cities = useMemo(() => {
    const set = new Set<string>();
    merchants.forEach((m: any) => m?.city && set.add(String(m.city)));
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [merchants]);

  const filteredMerchants = useMemo(() => {
    const q = query.trim().toLowerCase();
    return merchants.filter((m: any) => {
      const byCity = cityFilter === 'all' ? true : String(m.city || '') === cityFilter;

      const byQ =
        !q ||
        String(m.business_name || '').toLowerCase().includes(q) ||
        String(m.email || '').toLowerCase().includes(q) ||
        String(m.phone || '').toLowerCase().includes(q) ||
        String(m.business_type || '').toLowerCase().includes(q) ||
        String(m.address?.address || m.address || '').toLowerCase().includes(q);

      return byCity && byQ;
    });
  }, [merchants, query, cityFilter]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleDelete = async (merchantId: string) => {
    if (!confirm('Are you sure you want to delete this restaurant?')) return;

    try {
      const { error } = await supabase.from('merchants').delete().eq('id', merchantId);
      if (error) throw error;
      toast.success('Restaurant deleted');
      loadMerchants();
    } catch (error) {
      console.error('Failed to delete merchant:', error);
      toast.error('Failed to delete restaurant');
    }
  };

  return (
    <DashboardLayout>
      <div
        className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 overflow-x-hidden"
        style={{ paddingBottom: `calc(88px + env(safe-area-inset-bottom))` }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 min-w-0">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Manage Restaurants</h1>
            <p className="text-gray-600 mt-1">Add and manage restaurant partners</p>
          </div>

          <div className="flex gap-3 flex-wrap shrink-0">
            <button
              onClick={() => router.push('/admin/merchants/new')}
              className="bg-primary text-white px-4 sm:px-6 py-3 rounded-xl hover:bg-orange-600 font-semibold flex items-center gap-2 shadow-lg"
            >
              <Plus size={20} />
              Add Restaurant
            </button>

            <button
              onClick={loadMerchants}
              className="border px-4 py-3 rounded-xl hover:bg-gray-50 font-semibold flex items-center gap-2"
            >
              <RefreshCw size={18} />
              Refresh
            </button>

            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-3 rounded-xl hover:bg-red-700 font-semibold flex items-center gap-2"
            >
              <LogOut size={20} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Search + filters */}
        <div className="bg-white rounded-2xl border shadow-sm p-4 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email, phone, address, type…"
                className="w-full border rounded-xl pl-9 pr-4 py-3"
              />
            </div>

            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full border rounded-xl px-4 py-3"
            >
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c === 'all' ? 'All cities' : c}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                setQuery('');
                setCityFilter('all');
              }}
              className="w-full border rounded-xl px-4 py-3 hover:bg-gray-50 font-semibold"
            >
              Clear filters
            </button>
          </div>

          <div className="mt-3 text-sm text-gray-600">
            Showing <span className="font-semibold">{filteredMerchants.length}</span> of{' '}
            <span className="font-semibold">{merchants.length}</span> restaurants
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-64 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredMerchants.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full max-w-full">
            {/* FIX: map filteredMerchants (not merchants) */}
            {filteredMerchants.map((merchant: any) => (
              <div
                key={merchant.id}
                className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-shadow p-6 w-full max-w-full overflow-x-hidden border"
              >
                <div className="flex items-start justify-between mb-4 gap-3 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center shrink-0">
                      <Store className="text-white" size={24} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">{merchant.business_name}</h3>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          merchant.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {merchant.is_verified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail size={16} className="shrink-0" />
                    <span className="truncate min-w-0">{merchant.email || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <Phone size={16} className="shrink-0" />
                    <span className="truncate min-w-0">{merchant.phone || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin size={16} className="shrink-0" />
                    <span className="truncate min-w-0">{merchant.address?.address || merchant.address || 'No address'}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                  <button
                    onClick={() => router.push(`/admin/merchants/${merchant.id}`)}
                    className="flex-1 bg-primary text-white px-4 py-2 rounded-xl hover:bg-orange-600 font-semibold flex items-center justify-center gap-2"
                  >
                    <Settings size={16} />
                    Manage
                  </button>
                  <button
                    onClick={() => handleDelete(merchant.id)}
                    className="flex-1 bg-red-50 text-red-600 px-4 py-2 rounded-xl hover:bg-red-100 font-semibold flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border">
            <Store size={64} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No restaurants found</h3>
            <p className="text-gray-600">Try clearing filters or add a new restaurant.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
