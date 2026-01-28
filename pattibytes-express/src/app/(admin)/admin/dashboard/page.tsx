'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { 
  Users, ShoppingBag, DollarSign, TrendingUp, 
  Store, Truck, Clock, CheckCircle 
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalMerchants: 0,
    totalDrivers: 0,
    totalOrders: 0,
    pendingOrders: 0,
    todayOrders: 0,
    totalRevenue: 0,
    todayRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadStats();
     
  }, [user]);

  const loadStats = async () => {
    try {
      // Get user counts
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: merchantsCount } = await supabase
        .from('merchants')
        .select('*', { count: 'exact', head: true });

      const { count: driversCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'driver');

      // Get order stats
      const { data: orders } = await supabase
        .from('orders')
        .select('total, status, created_at');

      const today = new Date().toISOString().split('T')[0];
      const todayOrders = orders?.filter(o => o.created_at.startsWith(today)) || [];
      const pendingOrders = orders?.filter(o => o.status === 'pending') || [];

      const totalRevenue = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
      const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);

      setStats({
        totalUsers: usersCount || 0,
        totalMerchants: merchantsCount || 0,
        totalDrivers: driversCount || 0,
        totalOrders: orders?.length || 0,
        pendingOrders: pendingOrders.length,
        todayOrders: todayOrders.length,
        totalRevenue,
        todayRevenue,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview of platform metrics and activities</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-32 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalUsers}</p>
                  </div>
                  <Users className="text-blue-500" size={32} />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Merchants</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalMerchants}</p>
                  </div>
                  <Store className="text-orange-500" size={32} />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Drivers</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalDrivers}</p>
                  </div>
                  <Truck className="text-green-500" size={32} />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalOrders}</p>
                  </div>
                  <ShoppingBag className="text-purple-500" size={32} />
                </div>
              </div>
            </div>

            {/* Revenue & Order Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                  <TrendingUp size={32} />
                </div>
              </div>

              <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg shadow p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Pending Orders</p>
                    <p className="text-2xl font-bold mt-1">{stats.pendingOrders}</p>
                  </div>
                  <Clock size={32} />
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg shadow p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Today&apos;s Orders</p>
                    <p className="text-2xl font-bold mt-1">{stats.todayOrders}</p>
                  </div>
                  <CheckCircle size={32} />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <a
                href="/admin/orders"
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                <ShoppingBag className="text-primary mb-3" size={32} />
                <h3 className="font-bold text-gray-900 mb-2">Manage Orders</h3>
                <p className="text-sm text-gray-600">View and manage all platform orders</p>
              </a>

              <a
                href="/admin/merchants"
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                <Store className="text-primary mb-3" size={32} />
                <h3 className="font-bold text-gray-900 mb-2">Manage Merchants</h3>
                <p className="text-sm text-gray-600">Approve and monitor restaurants</p>
              </a>

              <a
                href="/admin/users"
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                <Users className="text-primary mb-3" size={32} />
                <h3 className="font-bold text-gray-900 mb-2">Manage Users</h3>
                <p className="text-sm text-gray-600">View all platform users</p>
              </a>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
