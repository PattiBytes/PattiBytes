/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Clock,
  Store,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Truck,
} from 'lucide-react';
import { logger } from '@/lib/logger';
import { toast } from 'react-toastify';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Merchant = {
  id: string;
  business_name?: string;
  is_active?: boolean;
};

type OrderRow = {
  id: string;
  status: string;
  created_at: string;
  total_amount?: number | null;
  delivery_fee?: number | null;
  total?: number | null;
};

function formatCurrencyINR(value: number) {
  const n = Number(value || 0);
  try {
    return n.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  } catch {
    return `₹${Math.round(n)}`;
  }
}

function safeNumber(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function isToday(createdAt: string) {
  // compares by local date (good enough for dashboard stats)
  const d = new Date(createdAt);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function normalizeStatus(status: any) {
  return String(status || '').toLowerCase();
}

export default function MerchantDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [hasMerchant, setHasMerchant] = useState(false);

  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    preparingOrders: 0,
    completedOrders: 0,
    todayOrders: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    avgOrderValue: 0,
  });

  const [recentOrders, setRecentOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

 useEffect(() => {
  if (!user) return;

  loadMerchantData();

  const interval = setInterval(() => {
    loadMerchantData();
  }, 30000); // 60000 if you want faster

  return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user]);


  const fetchOrders = async (merchantId: string): Promise<OrderRow[]> => {
    // Fix for your error: your schema does not have orders.total [file:13]
    // Try total_amount first (matches your customer dashboard usage), fallback to total.
  const attempts = [
  'id, status, created_at, total_amount, delivery_fee',
  'id, status, created_at, total, delivery_fee',
];

    for (const selectStr of attempts) {
      const { data, error } = await supabase
        .from('orders')
        .select(selectStr)
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (!error) return (data || []) as unknown as OrderRow[];

      const msg = error?.message || '';
      // if column missing, try next select
      if (msg.includes('does not exist') && (msg.includes('total_amount') || msg.includes('total'))) {
        logger.error('Orders select failed, trying fallback', { selectStr, error });
        continue;
      }

      // other errors should stop immediately
      throw error;
    }

    return [];
  };

  const computeStats = (orders: OrderRow[]) => {
    const totalOrders = orders.length;

    const pendingOrders = orders.filter((o) => {
      const s = normalizeStatus(o.status);
      return s === 'pending' || s === 'confirmed';
    }).length;

    const preparingOrders = orders.filter((o) => normalizeStatus(o.status) === 'preparing').length;

    const completedOrders = orders.filter((o) => {
      const s = normalizeStatus(o.status);
      return s === 'delivered' || s === 'completed';
    }).length;

    const todayOrders = orders.filter((o) => isToday(o.created_at)).length;

   const totalRevenue = orders.reduce((sum, o) => {
  const total = safeNumber(o.total_amount ?? o.total ?? 0);
  const del = safeNumber(o.delivery_fee ?? 0);
  return sum + Math.max(0, total - del);
}, 0);

   const todayRevenue = orders
  .filter((o) => isToday(o.created_at))
  .reduce((sum, o) => {
    const total = safeNumber(o.total_amount ?? o.total ?? 0);
    const del = safeNumber(o.delivery_fee ?? 0);
    return sum + Math.max(0, total - del);
  }, 0);


    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    setStats({
      totalOrders,
      pendingOrders,
      preparingOrders,
      completedOrders,
      todayOrders,
      totalRevenue,
      todayRevenue,
      avgOrderValue,
    });
  };

  const loadMerchantData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: merchantData, error } = await supabase
        .from('merchants')
        .select('id, business_name, is_active')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        logger.error('Error loading merchant data', error);
        setHasMerchant(false);
        setMerchant(null);
        return;
      }

      if (!merchantData) {
        logger.info('No merchant profile found');
        setHasMerchant(false);
        setMerchant(null);
        return;
      }

      setHasMerchant(true);
      setMerchant(merchantData as Merchant);

      const orders = await fetchOrders(merchantData.id);
      computeStats(orders);
      setRecentOrders(orders.slice(0, 8));
    } catch (error: any) {
      logger.error('Failed to load merchant data', error);
      toast.error(error?.message || 'Failed to load merchant data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!merchant?.id) return;
    try {
      setRefreshing(true);
      const orders = await fetchOrders(merchant.id);
      computeStats(orders);
      setRecentOrders(orders.slice(0, 8));
      toast.success('Dashboard refreshed');
    } catch (e: any) {
      toast.error(e?.message || 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  const statusPills = useMemo(
    () => [
      { label: 'Pending', value: stats.pendingOrders, icon: AlertCircle, color: 'bg-orange-100 text-orange-800' },
      { label: 'Preparing', value: stats.preparingOrders, icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
      { label: 'Completed', value: stats.completedOrders, icon: CheckCircle2, color: 'bg-green-100 text-green-800' },
    ],
    [stats.completedOrders, stats.pendingOrders, stats.preparingOrders]
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-28 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!hasMerchant) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <Store className="mx-auto text-primary mb-4" size={64} />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Setup Your Restaurant</h1>
            <p className="text-gray-600 mb-8">
              You don&apos;t have a restaurant profile yet. Complete setup to start receiving orders.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 text-left">
              <p className="font-semibold text-blue-900 mb-2">What you&apos;ll need:</p>
              <ul className="text-sm text-blue-800 space-y-1 ml-5 list-disc">
                <li>Restaurant name & type</li>
                <li>Logo & banner images</li>
                <li>Cuisine types</li>
                <li>Contact information</li>
                <li>Delivery settings</li>
              </ul>
            </div>

            <button
              onClick={() => router.push('/merchant/profile/complete')}
              className="bg-primary text-white px-8 py-3 rounded-2xl hover:bg-orange-600 font-semibold flex items-center justify-center gap-2 mx-auto"
            >
              <Plus size={20} />
              Complete Restaurant Setup
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
              Merchant Dashboard{merchant?.business_name ? ` • ${merchant.business_name}` : ''}
            </h1>
            <p className="text-gray-600 mt-1">Manage your restaurant, orders, and revenue.</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {statusPills.map((p) => (
                <span
                  key={p.label}
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${p.color}`}
                >
                  <p.icon className="w-4 h-4" />
                  {p.label}: {p.value}
                </span>
              ))}

              {merchant?.is_active === false && (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
                  <AlertCircle className="w-4 h-4" />
                  Restaurant inactive
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white shadow hover:shadow-md border border-gray-200 text-gray-800 font-semibold disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalOrders}</p>
              </div>
              <ShoppingBag className="text-blue-500" size={34} />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today&apos;s Orders</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.todayOrders}</p>
              </div>
              <TrendingUp className="text-green-500" size={34} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl shadow p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Revenue</p>
                <p className="text-3xl font-bold mt-1">{formatCurrencyINR(stats.totalRevenue)}</p>
              </div>
              <DollarSign size={34} />
            </div>
            <p className="text-xs opacity-90 mt-2">Avg: {formatCurrencyINR(stats.avgOrderValue)}</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-teal-500 rounded-2xl shadow p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Today&apos;s Revenue</p>
                <p className="text-3xl font-bold mt-1">{formatCurrencyINR(stats.todayRevenue)}</p>
              </div>
              <DollarSign size={34} />
            </div>
            <p className="text-xs opacity-90 mt-2">Live sales today</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Link href="/merchant/orders" className="bg-white rounded-2xl shadow p-6 hover:shadow-lg transition-shadow">
            <ShoppingBag className="text-primary mb-3" size={32} />
            <h3 className="font-bold text-gray-900 mb-2">Manage Orders</h3>
            <p className="text-sm text-gray-600">View, accept, prepare and complete orders.</p>
            {stats.pendingOrders > 0 && (
              <span className="inline-block mt-3 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold">
                {stats.pendingOrders} pending
              </span>
            )}
          </Link>

          <Link href="/merchant/menu" className="bg-white rounded-2xl shadow p-6 hover:shadow-lg transition-shadow">
            <span className="text-4xl mb-3 block">🍽️</span>
            <h3 className="font-bold text-gray-900 mb-2">Manage Menu</h3>
            <p className="text-sm text-gray-600">Add items, prices, photos, and availability.</p>
          </Link>

          <Link href="/merchant/profile" className="bg-white rounded-2xl shadow p-6 hover:shadow-lg transition-shadow">
            <span className="text-4xl mb-3 block">🏪</span>
            <h3 className="font-bold text-gray-900 mb-2">Restaurant Profile</h3>
            <p className="text-sm text-gray-600">Update business details and delivery settings.</p>
          </Link>
        </div>

        {/* Recent Orders */}
        <div className="mt-8 bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Recent Orders</h2>
            <Link href="/merchant/orders" className="text-primary font-semibold text-sm hover:underline">
              View all
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-10 text-gray-600">
              <Truck className="mx-auto w-10 h-10 text-gray-300 mb-3" />
              No orders yet.
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((o) => {
                const s = normalizeStatus(o.status);
               const total = safeNumber(o.total_amount ?? o.total ?? 0);
const del = safeNumber(o.delivery_fee ?? 0);
const amount = Math.max(0, total - del);


                return (
                  <div
                    key={o.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-gray-100 rounded-2xl p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">Order #{o.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(o.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="text-sm mt-1">
                        <span className="font-semibold text-gray-700">Status:</span>{' '}
                        <span className="font-bold text-gray-900">{s || 'unknown'}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <p className="font-bold text-gray-900">{formatCurrencyINR(amount)}</p>
                      <Link
                        href={`/merchant/orders`}
                        className="px-4 py-2 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-orange-600"
                      >
                        Open
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
