/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/jsx-no-comment-textnodes */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Users, Store, Truck, Package, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { superadminService } from '@/services/superadmin';

export default function AdminDashboard() {
  const { user } = useAuth();
   
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await superadminService.getPlatformStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Platform overview and management</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                // eslint-disable-next-line react/jsx-no-comment-textnodes, react/jsx-no-comment-textnodes
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                 {stats?.users ? Object.values(stats.users as Record<string, number>).reduce((a, b) => a + b, 0) : 0}
                </p>
              </div>
              <Users className="text-blue-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Merchants</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats?.activeMerchants || 0}
                </p>
              </div>
              <Store className="text-green-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Platform Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ₹{stats?.platformRevenue?.toFixed(0) || 0}
                </p>
              </div>
              <DollarSign className="text-purple-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ₹{stats?.totalRevenue?.toFixed(0) || 0}
                </p>
              </div>
              <TrendingUp className="text-orange-500" size={32} />
            </div>
          </div>
        </div>

        {/* Pending Approvals */}
        {(stats?.pendingMerchants > 0 || stats?.pendingDrivers > 0) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-yellow-600 flex-shrink-0" size={24} />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 mb-2">Pending Approvals</h3>
                <div className="space-y-1">
                  {stats.pendingMerchants > 0 && (
                    <p className="text-yellow-800">
                      {stats.pendingMerchants} merchant(s) awaiting verification
                    </p>
                  )}
                  {stats.pendingDrivers > 0 && (
                    <p className="text-yellow-800">
                      {stats.pendingDrivers} driver(s) awaiting verification
                    </p>
                  )}
                </div>
                <Link
                  href="/admin/approvals"
                  className="inline-block mt-3 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700"
                >
                  Review Now
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link
            href="/admin/merchants"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <Store className="text-green-500 mb-3" size={32} />
            <h3 className="font-semibold text-gray-900 text-lg">Manage Merchants</h3>
            <p className="text-sm text-gray-600 mt-2">
              View and manage all restaurant partners
            </p>
          </Link>

          <Link
            href="/admin/drivers"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <Truck className="text-blue-500 mb-3" size={32} />
            <h3 className="font-semibold text-gray-900 text-lg">Manage Drivers</h3>
            <p className="text-sm text-gray-600 mt-2">
              View and manage delivery partners
            </p>
          </Link>

          <Link
            href="/admin/orders"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <Package className="text-purple-500 mb-3" size={32} />
            <h3 className="font-semibold text-gray-900 text-lg">All Orders</h3>
            <p className="text-sm text-gray-600 mt-2">
              Monitor and manage all platform orders
            </p>
          </Link>

          <Link
            href="/admin/users"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <Users className="text-indigo-500 mb-3" size={32} />
            <h3 className="font-semibold text-gray-900 text-lg">User Management</h3>
            <p className="text-sm text-gray-600 mt-2">
              View and manage platform users
            </p>
          </Link>

          <Link
            href="/admin/analytics"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <TrendingUp className="text-orange-500 mb-3" size={32} />
            <h3 className="font-semibold text-gray-900 text-lg">Analytics</h3>
            <p className="text-sm text-gray-600 mt-2">
              View platform performance metrics
            </p>
          </Link>

          {user?.role === 'superadmin' && (
            <Link
              href="/admin/superadmin"
              className="bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-white"
            >
              <AlertCircle className="mb-3" size={32} />
              <h3 className="font-semibold text-lg">Super Admin</h3>
              <p className="text-sm text-purple-100 mt-2">
                Advanced platform controls
              </p>
            </Link>
          )}
        </div>

        {/* User Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">User Distribution</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">
                {stats?.users?.customer || 0}
              </p>
              <p className="text-sm text-gray-600 mt-1">Customers</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-3xl font-bold text-green-600">
                {stats?.users?.merchant || 0}
              </p>
              <p className="text-sm text-gray-600 mt-1">Merchants</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-3xl font-bold text-purple-600">
                {stats?.users?.driver || 0}
              </p>
              <p className="text-sm text-gray-600 mt-1">Drivers</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-3xl font-bold text-orange-600">
                {(stats?.users?.admin || 0) + (stats?.users?.superadmin || 0)}
              </p>
              <p className="text-sm text-gray-600 mt-1">Admins</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
