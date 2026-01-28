'use client';

import { useEffect, useState } from 'react';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useRouter } from 'next/navigation';
import { Shield, Users, Settings, Activity, DollarSign, Store, TrendingUp } from 'lucide-react';
import { toast } from 'react-toastify';

interface PlatformStats {
  users: Record<string, number>;
  totalRevenue: number;
  platformRevenue: number;
  activeMerchants: number;
  pendingMerchants: number;
  pendingDrivers: number;
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { isSuperAdmin, getPlatformStats, getActivityLogs } = useSuperAdmin();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSuperAdmin) {
      toast.error('Access denied');
      router.push('/admin/dashboard');
      return;
    }

    const loadData = async () => {
      try {
        const [platformStats, logs] = await Promise.all([
          getPlatformStats(),
          getActivityLogs(20),
        ]);
        setStats(platformStats);
        setActivityLogs(logs);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isSuperAdmin, router, getPlatformStats, getActivityLogs]);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!stats) {
    return <div className="p-8">No data available</div>;
  }

  const totalUsers = Object.values(stats.users).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <Shield size={32} />
            <div>
              <h1 className="text-3xl font-bold">Super Admin Control Panel</h1>
              <p className="text-purple-100 mt-1">Platform management and oversight</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {totalUsers}
                </p>
              </div>
              <Users className="text-blue-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Platform Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ₹{stats.platformRevenue.toFixed(0)}
                </p>
              </div>
              <DollarSign className="text-green-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Merchants</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.activeMerchants}
                </p>
              </div>
              <Store className="text-purple-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ₹{stats.totalRevenue.toFixed(0)}
                </p>
              </div>
              <TrendingUp className="text-orange-500" size={32} />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => router.push('/admin/superadmin/users')}
            className="bg-white rounded-lg shadow p-6 text-left hover:shadow-lg transition-shadow"
          >
            <Users className="text-blue-500 mb-3" size={32} />
            <h3 className="font-semibold text-gray-900 text-lg">User Management</h3>
            <p className="text-sm text-gray-600 mt-2">
              Manage all users, roles, and permissions
            </p>
          </button>

          <button
            onClick={() => router.push('/admin/superadmin/settings')}
            className="bg-white rounded-lg shadow p-6 text-left hover:shadow-lg transition-shadow"
          >
            <Settings className="text-purple-500 mb-3" size={32} />
            <h3 className="font-semibold text-gray-900 text-lg">System Settings</h3>
            <p className="text-sm text-gray-600 mt-2">
              Configure platform-wide settings
            </p>
          </button>

          <button
            onClick={() => router.push('/admin/superadmin/activity')}
            className="bg-white rounded-lg shadow p-6 text-left hover:shadow-lg transition-shadow"
          >
            <Activity className="text-green-500 mb-3" size={32} />
            <h3 className="font-semibold text-gray-900 text-lg">Activity Logs</h3>
            <p className="text-sm text-gray-600 mt-2">
              View all administrative actions
            </p>
          </button>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {activityLogs.slice(0, 10).map((log) => (
              <div key={log.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {log.profiles?.full_name || 'Unknown Admin'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">{log.action}</p>
                  </div>
                  <p className="text-sm text-gray-500">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Approvals */}
        {(stats.pendingMerchants > 0 || stats.pendingDrivers > 0) && (
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="font-semibold text-yellow-900 mb-3">Pending Approvals</h3>
            <div className="space-y-2">
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
            <button
              onClick={() => router.push('/admin/approvals')}
              className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              Review Now
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
