/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { 
  BarChart3, TrendingUp, DollarSign, ShoppingBag,
  Calendar, Users, Package, TrendingDown 
} from 'lucide-react';

export default function AdminAnalyticsPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    growth: 0,
    avgOrderValue: 0,
    topMerchants: [] as any[],
    revenueByDay: [] as any[],
    ordersByStatus: {} as any,
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    if (user) loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      
      if (timeRange === 'week') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (timeRange === 'month') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else {
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      }

      // Get orders in range
      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, status, created_at, merchant_id')
        .gte('created_at', startDate.toISOString());

      const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
      const totalOrders = orders?.length || 0;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Calculate growth (compare with previous period)
      const previousStart = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));
      const { data: previousOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', previousStart.toISOString())
        .lt('created_at', startDate.toISOString());

      const previousRevenue = previousOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
      const growth = previousRevenue > 0 
        ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
        : 0;

      // Orders by status
      const ordersByStatus = {
        pending: orders?.filter(o => o.status === 'pending').length || 0,
        confirmed: orders?.filter(o => ['confirmed', 'preparing', 'ready'].includes(o.status)).length || 0,
        delivering: orders?.filter(o => o.status === 'picked_up').length || 0,
        delivered: orders?.filter(o => o.status === 'delivered').length || 0,
        cancelled: orders?.filter(o => o.status === 'cancelled').length || 0,
      };

      // Top merchants
      const merchantRevenue = new Map();
      orders?.forEach(order => {
        const current = merchantRevenue.get(order.merchant_id) || 0;
        merchantRevenue.set(order.merchant_id, current + (order.total_amount || 0));
      });

      const topMerchantIds = Array.from(merchantRevenue.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => id);

      const topMerchantsData = await Promise.all(
        topMerchantIds.map(async (id) => {
          const { data: merchant } = await supabase
            .from('merchants')
            .select('business_name')
            .eq('id', id)
            .single();
          
          return {
            id,
            name: merchant?.business_name || 'Unknown',
            revenue: merchantRevenue.get(id) || 0,
          };
        })
      );

      setAnalytics({
        totalRevenue,
        totalOrders,
        growth,
        avgOrderValue,
        topMerchants: topMerchantsData,
        revenueByDay: [],
        ordersByStatus,
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          
          {/* Time Range Selector */}
          <div className="flex gap-2 mt-4 sm:mt-0">
            {(['week', 'month', 'year'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  timeRange === range
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-32 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-600 font-medium">Total Revenue</h3>
                  <DollarSign className="text-green-500" size={24} />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  ₹{analytics.totalRevenue.toFixed(0)}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  {analytics.growth >= 0 ? (
                    <>
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-600">
                        +{analytics.growth.toFixed(1)}%
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-4 h-4 text-red-600" />
                      <span className="text-sm text-red-600">
                        {analytics.growth.toFixed(1)}%
                      </span>
                    </>
                  )}
                  <span className="text-sm text-gray-500 ml-1">vs previous period</span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-600 font-medium">Total Orders</h3>
                  <ShoppingBag className="text-blue-500" size={24} />
                </div>
                <p className="text-3xl font-bold text-gray-900">{analytics.totalOrders}</p>
                <p className="text-sm text-gray-500 mt-2">
                  In selected {timeRange}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-600 font-medium">Avg Order Value</h3>
                  <DollarSign className="text-purple-500" size={24} />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  ₹{analytics.avgOrderValue.toFixed(0)}
                </p>
                <p className="text-sm text-gray-500 mt-2">Per order</p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-600 font-medium">Success Rate</h3>
                  <BarChart3 className="text-orange-500" size={24} />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {analytics.totalOrders > 0
                    ? ((analytics.ordersByStatus.delivered / analytics.totalOrders) * 100).toFixed(1)
                    : 0}%
                </p>
                <p className="text-sm text-gray-500 mt-2">Delivered orders</p>
              </div>
            </div>

            {/* Orders by Status */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Orders by Status</h2>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {Object.entries(analytics.ordersByStatus).map(([status, count]: [string, any]) => (
                  <div key={status} className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                    <p className="text-sm text-gray-600 capitalize mt-1">{status}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Merchants */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Top Performing Merchants</h2>
              {analytics.topMerchants.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No data available</p>
              ) : (
                <div className="space-y-4">
                  {analytics.topMerchants.map((merchant, index) => (
                    <div key={merchant.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                        <span className="font-semibold text-gray-900">{merchant.name}</span>
                      </div>
                      <span className="text-lg font-bold text-primary">
                        ₹{merchant.revenue.toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
