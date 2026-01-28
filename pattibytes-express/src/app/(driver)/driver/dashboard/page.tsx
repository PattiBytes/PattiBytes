'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Package, DollarSign, TrendingUp, CheckCircle } from 'lucide-react';

export default function DriverDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    todayDeliveries: 0,
    todayEarnings: 0,
    totalDeliveries: 0,
    rating: 4.8,
  });
  const [, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadStats = async () => {
    try {
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('driver_id', user!.id)
        .eq('status', 'delivered');

      const today = new Date().toISOString().split('T')[0];
      const todayOrders = orders?.filter(o => 
        o.created_at.startsWith(today)
      ) || [];

      setStats({
        todayDeliveries: todayOrders.length,
        todayEarnings: todayOrders.reduce((sum, o) => sum + (o.delivery_fee || 0), 0),
        totalDeliveries: orders?.length || 0,
        rating: 4.8,
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Driver Dashboard</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today&apos;s Deliveries</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.todayDeliveries}</p>
              </div>
              <Package className="text-primary" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today&apos;s Earnings</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">₹{stats.todayEarnings}</p>
              </div>
              <DollarSign className="text-green-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Deliveries</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalDeliveries}</p>
              </div>
              <CheckCircle className="text-blue-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rating</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.rating}</p>
              </div>
              <TrendingUp className="text-yellow-500" size={32} />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/driver/orders"
              className="bg-primary text-white px-6 py-4 rounded-lg hover:bg-orange-600 font-medium text-center"
            >
              View Available Orders
            </a>
            <a
              href="/driver/earnings"
              className="bg-gray-900 text-white px-6 py-4 rounded-lg hover:bg-gray-800 font-medium text-center"
            >
              View Earnings
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
