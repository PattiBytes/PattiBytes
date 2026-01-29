'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { orderService } from '@/services/orders';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { ShoppingBag, DollarSign, TrendingUp, Clock, CheckCircle, Store, Plus } from 'lucide-react';
import { logger } from '@/lib/logger';
import { toast } from 'react-toastify';
import Link from 'next/link';

export default function MerchantDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    todayOrders: 0,
    totalRevenue: 0,
    todayRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [merchantId, setMerchantId] = useState<string>('');
  const [hasMerchant, setHasMerchant] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user) {
      loadMerchantData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadMerchantData = async () => {
    try {
      // Check if user has merchant profile
      const { data: merchantData, error } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) {
        logger.error('Error loading merchant data', error);
      }

      if (!merchantData) {
        logger.info('No merchant profile found');
        setHasMerchant(false);
        setLoading(false);
        return;
      }

      setHasMerchant(true);
      setMerchantId(merchantData.id);

      // Get merchant orders
      try {
        const orders = await orderService.getMerchantOrders(merchantData.id);

        // Calculate stats
        const today = new Date().toISOString().split('T')[0];
        const todayOrders = orders.filter(o => o.created_at.startsWith(today));
        const pendingOrders = orders.filter(o => 
          ['pending', 'confirmed', 'preparing'].includes(o.status)
        );

        const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
        const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);

        setStats({
          totalOrders: orders.length,
          pendingOrders: pendingOrders.length,
          todayOrders: todayOrders.length,
          totalRevenue,
          todayRevenue,
        });
      } catch (orderError) {
        logger.error('Error loading orders', orderError);
      }
    } catch (error) {
      logger.error('Failed to load merchant data', error);
      toast.error('Failed to load merchant data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMerchant = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('merchants')
        .insert({
          user_id: user!.id,
          name: user!.full_name + "'s Restaurant",
          email: user!.email,
          phone: user!.phone || '',
          address: '',
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Restaurant profile created! Please complete your details.');
      setHasMerchant(true);
      setMerchantId(data.id);
      loadMerchantData();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      logger.error('Error creating merchant', error);
      toast.error('Failed to create restaurant profile');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-32 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!hasMerchant) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <Store className="mx-auto text-primary mb-4" size={64} />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Create Your Restaurant</h1>
            <p className="text-gray-600 mb-8">
              You don't have a restaurant profile yet. Create one to start managing your menu and orders.
            </p>
            <button
              onClick={handleCreateMerchant}
              disabled={creating}
              className="bg-primary text-white px-8 py-3 rounded-lg hover:bg-orange-600 font-medium flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
            >
              <Plus size={20} />
              {creating ? 'Creating...' : 'Create Restaurant Profile'}
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Merchant Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your restaurant and orders</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalOrders}</p>
              </div>
              <ShoppingBag className="text-blue-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.pendingOrders}</p>
              </div>
              <Clock className="text-yellow-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today&apos;s Orders</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.todayOrders}</p>
              </div>
              <TrendingUp className="text-green-500" size={32} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Revenue</p>
                <p className="text-2xl font-bold mt-1">₹{stats.totalRevenue.toFixed(2)}</p>
              </div>
              <DollarSign size={32} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-teal-500 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Today&apos;s Revenue</p>
                <p className="text-2xl font-bold mt-1">₹{stats.todayRevenue.toFixed(2)}</p>
              </div>
              <CheckCircle size={32} />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/merchant/orders"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <ShoppingBag className="text-primary mb-3" size={32} />
            <h3 className="font-bold text-gray-900 mb-2">Manage Orders</h3>
            <p className="text-sm text-gray-600">View and process incoming orders</p>
          </Link>

          <Link
            href="/merchant/menu"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <span className="text-4xl mb-3 block">🍽️</span>
            <h3 className="font-bold text-gray-900 mb-2">Manage Menu</h3>
            <p className="text-sm text-gray-600">Add and update menu items</p>
          </Link>

          <Link
            href="/merchant/profile"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <span className="text-4xl mb-3 block">🏪</span>
            <h3 className="font-bold text-gray-900 mb-2">Restaurant Profile</h3>
            <p className="text-sm text-gray-600">Update business information</p>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
