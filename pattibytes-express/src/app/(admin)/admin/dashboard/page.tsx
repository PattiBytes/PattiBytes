/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { 
  Users, ShoppingBag, DollarSign, TrendingUp, 
  Store, Truck, Clock, CheckCircle, XCircle,
  Package, ArrowUp, ArrowDown, Eye
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalMerchants: 0,
    totalDrivers: 0,
    totalOrders: 0,
    pendingOrders: 0,
    todayOrders: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    // NEW STATS
    weekOrders: 0,
    monthOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    processingOrders: 0,
    avgOrderValue: 0,
    revenueGrowth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<any[]>([]); // NEW

  useEffect(() => {
    if (user) {
      loadStats();
      loadRecentOrders(); // NEW
    }
     
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
        .select('total_amount, status, created_at');

      const today = new Date().toISOString().split('T')[0];
      const todayOrders = orders?.filter(o => o.created_at.startsWith(today)) || [];
      const pendingOrders = orders?.filter(o => o.status === 'pending') || [];
      
      // NEW CALCULATIONS
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const lastMonthAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const weekOrders = orders?.filter(o => new Date(o.created_at) >= weekAgo) || [];
      const monthOrders = orders?.filter(o => new Date(o.created_at) >= monthAgo) || [];
      const lastMonthOrders = orders?.filter(
        o => new Date(o.created_at) >= lastMonthAgo && new Date(o.created_at) < monthAgo
      ) || [];

      const deliveredOrders = orders?.filter(o => o.status === 'delivered').length || 0;
      const cancelledOrders = orders?.filter(o => o.status === 'cancelled').length || 0;
      const processingOrders = orders?.filter(o => 
        ['confirmed', 'preparing', 'ready', 'picked_up'].includes(o.status)
      ).length || 0;

      const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
      const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const monthRevenue = monthOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const lastMonthRevenue = lastMonthOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

      const avgOrderValue = orders && orders.length > 0 ? totalRevenue / orders.length : 0;
      const revenueGrowth = lastMonthRevenue > 0 
        ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
        : 0;

      setStats({
        totalUsers: usersCount || 0,
        totalMerchants: merchantsCount || 0,
        totalDrivers: driversCount || 0,
        totalOrders: orders?.length || 0,
        pendingOrders: pendingOrders.length,
        todayOrders: todayOrders.length,
        totalRevenue,
        todayRevenue,
        weekOrders: weekOrders.length,
        monthOrders: monthOrders.length,
        deliveredOrders,
        cancelledOrders,
        processingOrders,
        avgOrderValue,
        revenueGrowth,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // NEW FUNCTION
  const loadRecentOrders = async () => {
    try {
      const { data: orders } = await supabase
        .from('orders')
        .select('id, order_number, total_amount, status, created_at, customer_id')
        .order('created_at', { ascending: false })
        .limit(5);

      if (orders) {
        const ordersWithCustomers = await Promise.all(
          orders.map(async (order) => {
            const { data: customer } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', order.customer_id)
              .single();
            return { ...order, customer_name: customer?.full_name || 'Unknown' };
          })
        );
        setRecentOrders(ordersWithCustomers);
      }
    } catch (error) {
      console.error('Failed to load recent orders:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-purple-100 text-purple-800',
      ready: 'bg-orange-100 text-orange-800',
      picked_up: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalUsers}</p>
                  </div>
                  <Users className="text-blue-500" size={32} />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Merchants</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalMerchants}</p>
                  </div>
                  <Store className="text-orange-500" size={32} />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Drivers</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalDrivers}</p>
                  </div>
                  <Truck className="text-green-500" size={32} />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg shadow p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Total Revenue</p>
                    <p className="text-2xl font-bold mt-1">₹{stats.totalRevenue.toFixed(2)}</p>
                    <div className="flex items-center gap-1 mt-2">
                      {stats.revenueGrowth >= 0 ? (
                        <ArrowUp className="w-4 h-4" />
                      ) : (
                        <ArrowDown className="w-4 h-4" />
                      )}
                      <span className="text-xs">{Math.abs(stats.revenueGrowth).toFixed(1)}%</span>
                    </div>
                  </div>
                  <DollarSign size={32} />
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-teal-500 rounded-lg shadow p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Today&apos;s Revenue</p>
                    <p className="text-2xl font-bold mt-1">₹{stats.todayRevenue.toFixed(2)}</p>
                    <p className="text-xs opacity-80 mt-2">{stats.todayOrders} orders</p>
                  </div>
                  <TrendingUp size={32} />
                </div>
              </div>

              <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg shadow p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Pending Orders</p>
                    <p className="text-2xl font-bold mt-1">{stats.pendingOrders}</p>
                    <p className="text-xs opacity-80 mt-2">Needs attention</p>
                  </div>
                  <Clock size={32} />
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg shadow p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Avg Order Value</p>
                    <p className="text-2xl font-bold mt-1">₹{stats.avgOrderValue.toFixed(0)}</p>
                    <p className="text-xs opacity-80 mt-2">Per order</p>
                  </div>
                  <DollarSign size={32} />
                </div>
              </div>
            </div>

            {/* NEW: Order Status Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
                  </div>
                  <Clock className="text-yellow-500" size={24} />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Processing</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.processingOrders}</p>
                  </div>
                  <Package className="text-blue-500" size={24} />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Delivered</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.deliveredOrders}</p>
                  </div>
                  <CheckCircle className="text-green-500" size={24} />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Cancelled</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.cancelledOrders}</p>
                  </div>
                  <XCircle className="text-red-500" size={24} />
                </div>
              </div>
            </div>

            {/* NEW: Recent Orders & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Recent Orders */}
              <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Recent Orders</h2>
                  <button
                    onClick={() => router.push('/admin/orders')}
                    className="text-primary hover:underline text-sm font-semibold"
                  >
                    View All →
                  </button>
                </div>

                {recentOrders.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No recent orders</p>
                ) : (
                  <div className="space-y-3">
                    {recentOrders.map((order) => (
                      <div
                        key={order.id}
                        onClick={() => router.push(`/admin/orders/${order.id}`)}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-sm">
                            Order #{order.order_number}
                          </p>
                          <p className="text-xs text-gray-600">{order.customer_name}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(order.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">
                            ₹{order.total_amount.toFixed(2)}
                          </p>
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getStatusColor(
                              order.status
                            )}`}
                          >
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Stats</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">This Week</span>
                    <span className="font-bold text-gray-900">{stats.weekOrders} orders</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">This Month</span>
                    <span className="font-bold text-gray-900">{stats.monthOrders} orders</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Success Rate</span>
                    <span className="font-bold text-green-600">
                      {stats.totalOrders > 0
                        ? ((stats.deliveredOrders / stats.totalOrders) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Cancel Rate</span>
                    <span className="font-bold text-red-600">
                      {stats.totalOrders > 0
                        ? ((stats.cancelledOrders / stats.totalOrders) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button
                onClick={() => router.push('/admin/orders')}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
              >
                <ShoppingBag className="text-primary mb-3" size={32} />
                <h3 className="font-bold text-gray-900 mb-2">Manage Orders</h3>
                <p className="text-sm text-gray-600">View and manage all platform orders</p>
                <div className="mt-3 flex items-center gap-2 text-primary font-semibold">
                  <span>View Orders</span>
                  <Eye size={16} />
                </div>
              </button>

              <button
                onClick={() => router.push('/admin/merchants')}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
              >
                <Store className="text-primary mb-3" size={32} />
                <h3 className="font-bold text-gray-900 mb-2">Manage Merchants</h3>
                <p className="text-sm text-gray-600">Approve and monitor restaurants</p>
                <div className="mt-3 flex items-center gap-2 text-primary font-semibold">
                  <span>View Merchants</span>
                  <Eye size={16} />
                </div>
              </button>

              <button
                onClick={() => router.push('/admin/users')}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
              >
                <Users className="text-primary mb-3" size={32} />
                <h3 className="font-bold text-gray-900 mb-2">Manage Users</h3>
                <p className="text-sm text-gray-600">View all platform users</p>
                <div className="mt-3 flex items-center gap-2 text-primary font-semibold">
                  <span>View Users</span>
                  <Eye size={16} />
                </div>
              </button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
