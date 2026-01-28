/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { orderService } from '@/services/orders';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Package, DollarSign, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function MerchantDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    todayOrders: 0,
    todayRevenue: 0,
    pendingOrders: 0,
    avgPrepTime: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadDashboard = async () => {
      try {
        // In real app, fetch merchant ID from profile
        // For now using user.id as placeholder
        const orders = await orderService.getMerchantOrders(user.id);

        // Calculate stats
        const today = new Date().toDateString();
        const todayOrders = orders.filter(
          (o: any) => new Date(o.created_at).toDateString() === today
        );

        setStats({
          todayOrders: todayOrders.length,
          todayRevenue: todayOrders.reduce((sum: number, o: any) => sum + o.total, 0),
          pendingOrders: orders.filter((o: any) => o.status === 'pending').length,
          avgPrepTime: 25,
        });

        setRecentOrders(orders.slice(0, 5));
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [user]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-purple-100 text-purple-800',
      ready: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Merchant Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back, {user?.full_name}!</p>
          </div>
          <Link
            href="/merchant/menu"
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-medium"
          >
            Manage Menu
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today&apos;s Orders</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.todayOrders}</p>
              </div>
              <Package className="text-blue-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today&apos;s Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ₹{stats.todayRevenue.toFixed(0)}
                </p>
              </div>
              <DollarSign className="text-green-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Orders</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.pendingOrders}</p>
              </div>
              <AlertCircle className="text-orange-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Prep Time</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.avgPrepTime} min</p>
              </div>
              <Clock className="text-purple-500" size={32} />
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
            <Link href="/merchant/orders" className="text-primary hover:underline">
              View All
            </Link>
          </div>

          {loading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded" />
                ))}
              </div>
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="p-12 text-center">
              <Package size={48} className="mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600">No orders yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/merchant/orders/${order.id}`}
                  className="block px-6 py-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">
                        Order #{order.id.slice(0, 8)}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {order.profiles?.full_name || 'Customer'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                      <p className="text-sm text-gray-600 mt-1">₹{order.total.toFixed(0)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/merchant/orders"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <Package className="text-primary mb-3" size={32} />
            <h3 className="font-semibold text-gray-900 text-lg">Manage Orders</h3>
            <p className="text-sm text-gray-600 mt-2">
              View and process customer orders
            </p>
          </Link>

          <Link
            href="/merchant/menu"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <TrendingUp className="text-green-500 mb-3" size={32} />
            <h3 className="font-semibold text-gray-900 text-lg">Update Menu</h3>
            <p className="text-sm text-gray-600 mt-2">
              Add, edit or remove menu items
            </p>
          </Link>

          <Link
            href="/merchant/profile"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <DollarSign className="text-blue-500 mb-3" size={32} />
            <h3 className="font-semibold text-gray-900 text-lg">Business Profile</h3>
            <p className="text-sm text-gray-600 mt-2">
              Update restaurant information
            </p>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
