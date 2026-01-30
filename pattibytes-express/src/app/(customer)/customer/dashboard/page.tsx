/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { 
  ShoppingBag, 
  MapPin, 
  Clock, 
  TrendingUp, 
  Star,
  ChevronRight,
  Package,
  Heart,
  Wallet,
  Gift
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function CustomerDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
    totalSpent: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      // Load orders
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      setRecentOrders(orders || []);

      // Calculate stats
      const total = orders?.length || 0;
      const active = orders?.filter((o) => 
        ['pending', 'confirmed', 'preparing', 'on_the_way'].includes(o.status)
      ).length || 0;
      const completed = orders?.filter((o) => o.status === 'delivered').length || 0;
      const spent = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;

      setStats({
        totalOrders: total,
        activeOrders: active,
        completedOrders: completed,
        totalSpent: spent,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-purple-100 text-purple-800',
      on_the_way: 'bg-orange-100 text-orange-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string) => {
    const texts: any = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      preparing: 'Preparing',
      on_the_way: 'On the Way',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    };
    return texts[status] || status;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-gray-200 h-96 rounded-lg animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.full_name || 'Food Lover'}! 👋
          </h1>
          <p className="text-gray-600 mt-1">Here&apos;s what&apos;s happening with your orders</p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <ShoppingBag size={32} />
              <span className="text-3xl font-bold">{stats.totalOrders}</span>
            </div>
            <p className="text-white/90 font-medium">Total Orders</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Clock size={32} />
              <span className="text-3xl font-bold">{stats.activeOrders}</span>
            </div>
            <p className="text-white/90 font-medium">Active Orders</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Package size={32} />
              <span className="text-3xl font-bold">{stats.completedOrders}</span>
            </div>
            <p className="text-white/90 font-medium">Completed</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Wallet size={32} />
              <span className="text-3xl font-bold">₹{stats.totalSpent}</span>
            </div>
            <p className="text-white/90 font-medium">Total Spent</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => router.push('/customer/home')}
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 text-left"
          >
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <ShoppingBag className="text-primary" size={24} />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">Order Food</h3>
            <p className="text-sm text-gray-600">Browse restaurants</p>
          </button>

          <button
            onClick={() => router.push('/customer/orders')}
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 text-left"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="text-blue-600" size={24} />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">Track Orders</h3>
            <p className="text-sm text-gray-600">View order status</p>
          </button>

          <button
            onClick={() => router.push('/customer/addresses')}
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 text-left"
          >
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <MapPin className="text-green-600" size={24} />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">Addresses</h3>
            <p className="text-sm text-gray-600">Manage locations</p>
          </button>

          <button
            onClick={() => router.push('/customer/profile')}
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 text-left"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <Gift className="text-purple-600" size={24} />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">Rewards</h3>
            <p className="text-sm text-gray-600">View offers</p>
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Orders */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Recent Orders</h2>
              <button
                onClick={() => router.push('/customer/orders')}
                className="text-primary hover:text-orange-600 font-medium flex items-center gap-1"
              >
                View All
                <ChevronRight size={20} />
              </button>
            </div>

            {recentOrders.length > 0 ? (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => router.push(`/customer/orders/${order.id}`)}
                    className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-gray-900 mb-1">
                          Order #{order.id.slice(0, 8).toUpperCase()}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {new Date(order.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {getStatusText(order.status)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">
                          {order.items?.length || 0} item(s)
                        </p>
                      </div>
                      <p className="text-xl font-bold text-primary">₹{order.total}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <ShoppingBag size={64} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No orders yet</h3>
                <p className="text-gray-600 mb-6">Start ordering delicious food now!</p>
                <button
                  onClick={() => router.push('/customer/home')}
                  className="bg-primary text-white px-8 py-3 rounded-lg hover:bg-orange-600 font-medium"
                >
                  Browse Restaurants
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Promo Banner */}
            <div className="bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500 rounded-lg shadow-lg p-6 text-white">
              <Gift size={32} className="mb-4" />
              <h3 className="text-xl font-bold mb-2">Special Offer!</h3>
              <p className="text-white/90 mb-4">Get 50% off on your next order</p>
              <button
                onClick={() => router.push('/customer/home')}
                className="bg-white text-orange-600 px-6 py-2 rounded-lg hover:bg-gray-100 font-medium w-full"
              >
                Order Now
              </button>
            </div>

            {/* Top Picks */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-primary" />
                Popular Near You
              </h3>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <button
                    key={i}
                    onClick={() => router.push('/customer/home')}
                    className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-pink-500 rounded-lg flex items-center justify-center">
                        <Star className="text-white" size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">Restaurant {i}</p>
                        <p className="text-sm text-gray-600">★ 4.5 • 2 km</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Favorites */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Heart size={20} className="text-red-500" />
                Your Favorites
              </h3>
              <p className="text-gray-600 text-sm text-center py-4">
                Save your favorite restaurants for quick access
              </p>
              <button
                onClick={() => router.push('/customer/home')}
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-medium"
              >
                Explore Restaurants
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
