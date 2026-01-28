/* eslint-disable @typescript-eslint/no-unused-vars */
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
  const { user, userRole } = useAuth();
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {userRole === 'superadmin' ? 'Super Admin' : 'Admin'} Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              {userRole === 'superadmin' 
                ? 'Full system control and management' 
                : 'Platform overview and management'}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                <p className="text-sm text-gray-600">Total Merchants</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalMerchants}</p>
              </div>
              <Store className="text-orange-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Drivers</p>
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

        {/* Today's Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-yellow-50 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">Pending Orders</p>
                <p className="text-2xl font-bold text-yellow-900 mt-1">{stats.pendingOrders}</p>
              </div>
              <Clock className="text-yellow-600" size={32} />
            </div>
          </div>

          <div className="bg-green-50 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Today&apos;s Orders</p>
                <p className="text-2xl font-bold text-green-900 mt-1">{stats.todayOrders}</p>
              </div>
              <CheckCircle className="text-green-600" size={32} />
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Today&apos;s Revenue</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">₹{stats.todayRevenue.toFixed(0)}</p>
              </div>
              <DollarSign className="text-blue-600" size={32} />
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Total Revenue</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">₹{stats.totalRevenue.toFixed(0)}</p>
              </div>
              <TrendingUp className="text-purple-600" size={32} />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <a
              href="/admin/merchants"
              className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 hover:bg-orange-100 transition-colors"
            >
              <Store className="text-orange-600 mb-2" size={24} />
              <h3 className="font-bold text-gray-900">Manage Merchants</h3>
              <p className="text-sm text-gray-600 mt-1">View and verify merchants</p>
            </a>

            <a
              href="/admin/orders"
              className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 hover:bg-blue-100 transition-colors"
            >
              <ShoppingBag className="text-blue-600 mb-2" size={24} />
              <h3 className="font-bold text-gray-900">View Orders</h3>
              <p className="text-sm text-gray-600 mt-1">Monitor all platform orders</p>
            </a>

            <a
              href="/admin/access-requests"
              className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 hover:bg-purple-100 transition-colors"
            >
              <Users className="text-purple-600 mb-2" size={24} />
              <h3 className="font-bold text-gray-900">Access Requests</h3>
              <p className="text-sm text-gray-600 mt-1">Review role requests</p>
            </a>

            <a
              href="/admin/menus"
              className="bg-green-50 border-2 border-green-200 rounded-lg p-4 hover:bg-green-100 transition-colors"
            >
              <ShoppingBag className="text-green-600 mb-2" size={24} />
              <h3 className="font-bold text-gray-900">Manage Menus</h3>
              <p className="text-sm text-gray-600 mt-1">Add/edit menu items</p>
            </a>

            {userRole === 'superadmin' && (
              <>
                <a
                  href="/admin/users"
                  className="bg-red-50 border-2 border-red-200 rounded-lg p-4 hover:bg-red-100 transition-colors"
                >
                  <Users className="text-red-600 mb-2" size={24} />
                  <h3 className="font-bold text-gray-900">Manage Users</h3>
                  <p className="text-sm text-gray-600 mt-1">View and manage all users</p>
                </a>

                <a
                  href="/admin/admins"
                  className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-4 hover:bg-indigo-100 transition-colors"
                >
                  <Users className="text-indigo-600 mb-2" size={24} />
                  <h3 className="font-bold text-gray-900">Manage Admins</h3>
                  <p className="text-sm text-gray-600 mt-1">Add or remove admin users</p>
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
