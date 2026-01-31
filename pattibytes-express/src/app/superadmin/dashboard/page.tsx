'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Users, Store, ShoppingBag, TrendingUp, Shield, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingUsers: 0,
    totalMerchants: 0,
    activeMerchants: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });
  const [, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [users, merchants, orders] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('merchants').select('*'),
        supabase.from('orders').select('total, status'),
      ]);

      const totalRevenue = orders.data?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
      const pendingUsers = users.data?.filter(u => u.approval_status === 'pending').length || 0;
      const activeMerchants = merchants.data?.filter(m => m.is_active).length || 0;

      setStats({
        totalUsers: users.data?.length || 0,
        pendingUsers,
        totalMerchants: merchants.data?.length || 0,
        activeMerchants,
        totalOrders: orders.data?.length || 0,
        totalRevenue,
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
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="text-purple-600" size={32} />
            <h1 className="text-3xl font-bold text-gray-900">SuperAdmin Dashboard</h1>
          </div>
          <p className="text-gray-600">Complete system overview and management</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Total Users */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm opacity-90">Total Users</p>
                <p className="text-3xl font-bold">{stats.totalUsers}</p>
              </div>
              <Users size={40} className="opacity-80" />
            </div>
            {stats.pendingUsers > 0 && (
              <div className="bg-white/20 rounded px-3 py-1 text-sm inline-block">
                {stats.pendingUsers} pending approval
              </div>
            )}
          </div>

          {/* Merchants */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm opacity-90">Total Merchants</p>
                <p className="text-3xl font-bold">{stats.totalMerchants}</p>
              </div>
              <Store size={40} className="opacity-80" />
            </div>
            <p className="text-sm opacity-90">
              {stats.activeMerchants} active
            </p>
          </div>

          {/* Orders */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm opacity-90">Total Orders</p>
                <p className="text-3xl font-bold">{stats.totalOrders}</p>
              </div>
              <ShoppingBag size={40} className="opacity-80" />
            </div>
            <p className="text-sm opacity-90">All time</p>
          </div>

          {/* Revenue */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm opacity-90">Total Revenue</p>
                <p className="text-3xl font-bold">₹{stats.totalRevenue.toFixed(0)}</p>
              </div>
              <TrendingUp size={40} className="opacity-80" />
            </div>
            <p className="text-sm opacity-90">Platform wide</p>
          </div>
 
          {/* Pending Approvals */}
          <Link
            href="/superadmin/users"
            className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg shadow-lg p-6 text-white hover:shadow-xl transition-shadow cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm opacity-90">Pending Approvals</p>
                <p className="text-3xl font-bold">{stats.pendingUsers}</p>
              </div>
              <Clock size={40} className="opacity-80" />
            </div>
            <p className="text-sm opacity-90">Click to review →</p>
          </Link>

          {/* System Status */}
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm opacity-90">System Status</p>
                <p className="text-2xl font-bold">All Systems Operational</p>
              </div>
              <CheckCircle size={40} className="opacity-80" />
            </div>
            <p className="text-sm opacity-90">🟢 Healthy</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/superadmin/users"
              className="bg-blue-50 hover:bg-blue-100 p-4 rounded-lg transition-colors"
            >
              <Users className="text-blue-600 mb-2" size={24} />
              <h3 className="font-semibold text-gray-900">Manage Users</h3>
              <p className="text-sm text-gray-600 mt-1">Review and approve users</p>
            </Link>

            <Link
              href="/superadmin/merchants"
              className="bg-orange-50 hover:bg-orange-100 p-4 rounded-lg transition-colors"
            >
              <Store className="text-orange-600 mb-2" size={24} />
              <h3 className="font-semibold text-gray-900">Manage Merchants</h3>
              <p className="text-sm text-gray-600 mt-1">Verify and monitor merchants</p>
            </Link>

            <Link
              href="/superadmin/orders"
              className="bg-green-50 hover:bg-green-100 p-4 rounded-lg transition-colors"
            >
              <ShoppingBag className="text-green-600 mb-2" size={24} />
              <h3 className="font-semibold text-gray-900">View Orders</h3>
              <p className="text-sm text-gray-600 mt-1">Monitor all platform orders</p>
            </Link>

            <Link
              href="/superadmin/settings"
              className="bg-purple-50 hover:bg-purple-100 p-4 rounded-lg transition-colors"
            >
              <Shield className="text-purple-600 mb-2" size={24} />
              <h3 className="font-semibold text-gray-900">System Settings</h3>
              <p className="text-sm text-gray-600 mt-1">Configure platform settings</p>
            </Link>
          </div>
        </div>

        {/* Alerts */}
        {stats.pendingUsers > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="font-semibold text-yellow-900">
                  {stats.pendingUsers} User{stats.pendingUsers > 1 ? 's' : ''} Awaiting Approval
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Review pending user applications to grant them access to the platform.
                </p>
                <Link
                  href="/superadmin/users"
                  className="inline-block mt-3 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 text-sm font-medium"
                >
                  Review Now →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
