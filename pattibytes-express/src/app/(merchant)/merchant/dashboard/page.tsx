'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { ShoppingBag, DollarSign, TrendingUp, Clock, Store, Plus } from 'lucide-react';
import { logger } from '@/lib/logger';
import { toast } from 'react-toastify';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function MerchantDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    todayOrders: 0,
    totalRevenue: 0,
    todayRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [, setMerchantId] = useState<string>('');
  const [hasMerchant, setHasMerchant] = useState(false);

  useEffect(() => {
    if (user) {
      loadMerchantData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadMerchantData = async () => {
    try {
      setLoading(true);

      // Check if user has merchant profile
      const { data: merchantData, error } = await supabase
        .from('merchants')
        .select('id, business_name, is_active')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) {
        logger.error('Error loading merchant data', error);
        setHasMerchant(false);
        setLoading(false);
        return;
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
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('id, total, status, created_at')
          .eq('merchant_id', merchantData.id);

        if (ordersError) {
          logger.error('Error loading orders', ordersError);
        } else if (orders) {
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
        }
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
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Setup Your Restaurant</h1>
            <p className="text-gray-600 mb-8">
              You don&lsquo;t have a restaurant profile yet. Complete the setup to start receiving orders.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-2">What you&apos;ll need:</p>
                <ul className="text-left space-y-1 ml-6">
                  <li>• Restaurant name and type</li>
                  <li>• Logo and banner images</li>
                  <li>• Cuisine types you offer</li>
                  <li>• Contact information</li>
                  <li>• Delivery settings</li>
                </ul>
              </div>
            </div>
            <button
              onClick={() => router.push('/merchant/profile/complete')}
              className="bg-primary text-white px-8 py-3 rounded-lg hover:bg-orange-600 font-medium flex items-center justify-center gap-2 mx-auto"
            >
              <Plus size={20} />
              Complete Restaurant Setup
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 mb-8">
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
                <p className="text-2xl font-bold mt-1">₹{stats.totalRevenue.toFixed(0)}</p>
              </div>
              <DollarSign size={32} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-teal-500 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Today&apos;s Revenue</p>
                <p className="text-2xl font-bold mt-1">₹{stats.todayRevenue.toFixed(0)}</p>
              </div>
              <DollarSign size={32} />
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
            {stats.pendingOrders > 0 && (
              <span className="inline-block mt-2 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold">
                {stats.pendingOrders} pending
              </span>
            )}
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

        {/* Recent Activity */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-primary">{stats.totalOrders}</p>
              <p className="text-sm text-gray-600 mt-1">All Time Orders</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-green-600">{stats.todayOrders}</p>
              <p className="text-sm text-gray-600 mt-1">Today&apos;s Orders</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-yellow-600">{stats.pendingOrders}</p>
              <p className="text-sm text-gray-600 mt-1">Pending Orders</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-purple-600">
                ₹{(stats.totalRevenue / (stats.totalOrders || 1)).toFixed(0)}
              </p>
              <p className="text-sm text-gray-600 mt-1">Avg Order Value</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
