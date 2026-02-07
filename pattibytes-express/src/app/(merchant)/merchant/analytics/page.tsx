/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { TrendingUp, DollarSign, ShoppingBag, Star } from 'lucide-react';

export default function MerchantAnalyticsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    averageRating: 0,
    topItems: [] as any[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadAnalytics();
  }, [user]);

  // replace loadAnalytics() with this
const loadAnalytics = async () => {
  try {
    setLoading(true);

    // get merchant id from merchants table (like your orders page does)
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id')
      .eq('user_id', user!.id)
      .single();

    if (merchantError) throw merchantError;

    const { data: orders, error } = await supabase
      .from('orders')
      .select('total_amount, delivery_fee, status, items')
      .eq('merchant_id', merchant.id)
      .eq('status', 'delivered');

    if (error) throw error;

    const totalRevenue =
      orders?.reduce((sum: number, o: any) => {
        const total = Number(o.total_amount ?? 0);
        const del = Number(o.delivery_fee ?? 0);
        return sum + Math.max(0, total - del);
      }, 0) || 0;

    const totalOrders = orders?.length || 0;

    // top items
    const itemCounts: Record<string, number> = {};
    (orders || []).forEach((order: any) => {
      (order.items || []).forEach((item: any) => {
        const name = String(item?.name || 'Item');
        const qty = Number(item?.quantity ?? 1);
        itemCounts[name] = (itemCounts[name] || 0) + qty;
      });
    });

    const topItems = Object.entries(itemCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setStats({
      totalRevenue,
      totalOrders,
      averageRating: 4.5, // keep your placeholder
      topItems,
    });
  } catch (e) {
    console.error('Failed to load analytics:', e);
  } finally {
    setLoading(false);
  }
};


  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Analytics</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ₹{stats.totalRevenue.toFixed(2)}
                </p>
              </div>
              <DollarSign className="text-green-500" size={32} />
            </div>
          </div>

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
                <p className="text-sm text-gray-600">Average Rating</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.averageRating}</p>
              </div>
              <Star className="text-yellow-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Growth</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">+15%</p>
              </div>
              <TrendingUp className="text-primary" size={32} />
            </div>
          </div>
        </div>

        {/* Top Items */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Top Selling Items</h2>
          <div className="space-y-4">
            {stats.topItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                    {idx + 1}
                  </div>
                  <span className="font-medium text-gray-900">{item.name}</span>
                </div>
                <span className="text-gray-600">{item.count} sold</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
