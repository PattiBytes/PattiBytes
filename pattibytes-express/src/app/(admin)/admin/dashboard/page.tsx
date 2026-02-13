/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

 
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  Users,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Store,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  ArrowUp,
  ArrowDown,
  Eye,
  LogOut,
  RefreshCw,
  Volume2,
  VolumeX,
  ArrowRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useOrdersRealtime } from '@/hooks/useOrdersRealtime';
import { calcGrowthPercent, computeOrderMetrics, netRevenueOfOrder, startOfDayISO } from '@/lib/analyticsKit';

type RecentOrderRow = {
  id: string;
  order_number: string | number | null;
  total_amount: number | null;
  status: string | null;
  created_at: string;
  customer_id: string | null;
  customer_name?: string;
};

type OrderForStats = {
  total_amount: number | null;
  status: string | null;
  created_at: string;
};

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

function moneyINR(n: any) {
  const v = Number(n ?? 0) || 0;
  try {
    return v.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  } catch {
    return `₹${Math.round(v)}`;
  }
}

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalMerchants: 0,
    totalDrivers: 0,

    totalOrders: 0,
    pendingOrders: 0,
    todayOrders: 0,

    totalRevenue: 0, // net revenue (cancelled subtract)
    todayRevenue: 0, // net revenue (cancelled subtract)

    weekOrders: 0,
    monthOrders: 0,

    deliveredOrders: 0,
    cancelledOrders: 0,
    processingOrders: 0,

    avgOrderValue: 0,
    revenueGrowth: 0,
  });

  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<RecentOrderRow[]>([]);

  // Interactivity (compact filters)
  const [recentFilter, setRecentFilter] = useState<'all' | 'pending' | 'processing' | 'delivered' | 'cancelled'>('all');
  const [pulseNewOrder, setPulseNewOrder] = useState(false);

  // Sound (ON by default) with autoplay-block handling
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const reloadTimer = useRef<any>(null);

  const SOUND_URL = '/sounds/order.mp3';

  useEffect(() => {
    audioRef.current = new Audio(SOUND_URL);
    audioRef.current.preload = 'auto';

    // Try to prime audio; may fail until user gesture
    (async () => {
      try {
        await audioRef.current?.play();
        audioRef.current?.pause();
        if (audioRef.current) audioRef.current.currentTime = 0;
        setSoundBlocked(false);
      } catch {
        setSoundBlocked(true);
      }
    })();

    return () => {
      audioRef.current = null;
    };
  }, []);

  const unlockSound = async () => {
    if (!audioRef.current) return;
    try {
      await audioRef.current.play();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setSoundBlocked(false);
    } catch {
      setSoundBlocked(true);
    }
  };

  const playSound = async () => {
    if (!soundEnabled) return;
    try {
      await audioRef.current?.play();
      setSoundBlocked(false);
    } catch {
      setSoundBlocked(true);
    }
  };

  const scheduleReload = () => {
    if (reloadTimer.current) clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(() => {
      loadStats();
      loadRecentOrders();
    }, 350);
  };

  useOrdersRealtime({
    enabled: !!user,
    onInsert: async () => {
      setPulseNewOrder(true);
      setTimeout(() => setPulseNewOrder(false), 1200);

      await playSound();
      scheduleReload();
    },
    onAnyChange: () => {
      scheduleReload();
    },
  });
  
// Add this polling effect (keep 5000; use 1000 only if you really need it)
useEffect(() => {
  if (!user) return;

  const id = window.setInterval(() => {
    loadStats();
    loadRecentOrders();
  }, 30000);

  return () => window.clearInterval(id);
   
}, [user]);

  useEffect(() => {
    if (user) {
      loadStats();
      loadRecentOrders();
    }
    return () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
    };
  }, [user]);

  const loadStats = async () => {
    try {
      setLoading(true);

      const [{ count: usersCount }, { count: merchantsCount }, { count: driversCount }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('merchants').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'driver'),
      ]);

      const { data: orders, error: ordersErr } = await supabase.from('orders').select('total_amount,status,created_at');
      if (ordersErr) throw ordersErr;

      const list: OrderForStats[] = (orders as any[]) || [];
      const todayKey = startOfDayISO(new Date());
      const todayOrdersList = list.filter((o) => String(o.created_at || '').startsWith(todayKey));

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const lastMonthAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const weekOrdersList = list.filter((o) => new Date(o.created_at) >= weekAgo);
      const monthOrdersList = list.filter((o) => new Date(o.created_at) >= monthAgo);
      const lastMonthOrdersList = list.filter(
        (o) => new Date(o.created_at) >= lastMonthAgo && new Date(o.created_at) < monthAgo
      );

      const mAll = computeOrderMetrics(list as any);
      const mToday = computeOrderMetrics(todayOrdersList as any);

      const monthRevenueNet = monthOrdersList.reduce((sum, o: any) => sum + netRevenueOfOrder(o), 0);
      const lastMonthRevenueNet = lastMonthOrdersList.reduce((sum, o: any) => sum + netRevenueOfOrder(o), 0);

      setStats({
        totalUsers: usersCount || 0,
        totalMerchants: merchantsCount || 0,
        totalDrivers: driversCount || 0,

        totalOrders: mAll.totalOrders,
        pendingOrders: mAll.pendingOrders,
        todayOrders: todayOrdersList.length,

        totalRevenue: mAll.totalRevenueNet,
        todayRevenue: mToday.totalRevenueNet,

        weekOrders: weekOrdersList.length,
        monthOrders: monthOrdersList.length,

        deliveredOrders: mAll.deliveredOrders,
        cancelledOrders: mAll.cancelledOrders,
        processingOrders: mAll.processingOrders,

        avgOrderValue: mAll.avgOrderValue,
        revenueGrowth: calcGrowthPercent(monthRevenueNet, lastMonthRevenueNet),
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentOrders = async () => {
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, order_number, total_amount, status, created_at, customer_id')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      const list = (orders as any[]) || [];

      const withCustomers = await Promise.all(
        list.map(async (order: any) => {
          const { data: customer } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', order.customer_id)
            .maybeSingle();
          return { ...order, customer_name: customer?.full_name || 'Unknown' };
        })
      );

      setRecentOrders(withCustomers);
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
      on_the_way: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[String(status || '').toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const isProcessing = (status: string) =>
    ['confirmed', 'preparing', 'ready', 'picked_up', 'on_the_way'].includes(String(status || '').toLowerCase());

  const filteredRecentOrders = useMemo(() => {
    if (recentFilter === 'all') return recentOrders;
    return recentOrders.filter((o) => {
      const s = String(o.status || '').toLowerCase();
      if (recentFilter === 'processing') return isProcessing(s);
      return s === recentFilter;
    });
  }, [recentOrders, recentFilter]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-5">
        {/* Header (compact) */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              {pulseNewOrder && (
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-800">
                  New order
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">Realtime platform metrics and activity</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => setSoundEnabled((v) => !v)}
              className="px-3 py-2 rounded-xl border hover:bg-gray-50 font-semibold flex items-center gap-2"
              title="Toggle sound"
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span className="hidden sm:inline">{soundEnabled ? 'Sound on' : 'Sound off'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                loadStats();
                loadRecentOrders();
              }}
              className="px-3 py-2 rounded-xl border hover:bg-gray-50 font-semibold flex items-center gap-2"
              title="Refresh"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-2 rounded-xl border hover:bg-gray-50 font-semibold flex items-center gap-2"
              title="Logout"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Sound blocked banner */}
        {soundEnabled && soundBlocked && (
          <div className="mb-4 p-3 rounded-xl border bg-yellow-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-sm text-yellow-900">
              Sound is blocked by the browser until you click “Enable sound”.
            </div>
            <button
              type="button"
              onClick={unlockSound}
              className="px-3 py-2 rounded-xl bg-yellow-600 text-white font-semibold hover:bg-yellow-700"
            >
              Enable sound
            </button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-24 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Compact main stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Users</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{stats.totalUsers}</p>
                  </div>
                  <Users className="text-blue-500" size={22} />
                </div>
              </div>

              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Merchants</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{stats.totalMerchants}</p>
                  </div>
                  <Store className="text-orange-500" size={22} />
                </div>
              </div>

              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Drivers</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{stats.totalDrivers}</p>
                  </div>
                  <Truck className="text-green-500" size={22} />
                </div>
              </div>

              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Orders</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{stats.totalOrders}</p>
                  </div>
                  <ShoppingBag className="text-purple-500" size={22} />
                </div>
              </div>
            </div>

            {/* Compact revenue row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600">Revenue (net)</p>
                  <DollarSign className="text-green-600" size={18} />
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">{moneyINR(stats.totalRevenue)}</p>
                <div className="flex items-center gap-1 mt-2 text-xs">
                  {stats.revenueGrowth >= 0 ? (
                    <>
                      <ArrowUp className="w-4 h-4 text-green-600" />
                      <span className="text-green-600 font-semibold">+{stats.revenueGrowth.toFixed(1)}%</span>
                    </>
                  ) : (
                    <>
                      <ArrowDown className="w-4 h-4 text-red-600" />
                      <span className="text-red-600 font-semibold">{stats.revenueGrowth.toFixed(1)}%</span>
                    </>
                  )}
                  <span className="text-gray-500">vs prev</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600">Today revenue (net)</p>
                  <TrendingUp className="text-teal-600" size={18} />
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">{moneyINR(stats.todayRevenue)}</p>
                <p className="text-xs text-gray-500 mt-2">{stats.todayOrders} orders today</p>
              </div>

              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600">Avg order (net)</p>
                  <DollarSign className="text-purple-600" size={18} />
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">{moneyINR(stats.avgOrderValue)}</p>
                <p className="text-xs text-gray-500 mt-2">Per order</p>
              </div>

              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600">Pending</p>
                  <Clock className="text-yellow-600" size={18} />
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stats.pendingOrders}</p>
                <p className="text-xs text-gray-500 mt-2">Needs attention</p>
              </div>
            </div>

            {/* Interactive status chips */}
            <div className="bg-white rounded-xl border shadow-sm p-4 mb-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-sm font-bold text-gray-900">Order status</h2>
                <button
                  type="button"
                  onClick={() => router.push('/admin/orders')}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  Orders <ArrowRight size={14} />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-yellow-50 border border-yellow-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-yellow-800">Pending</p>
                    <p className="text-xl font-bold text-yellow-900">{stats.pendingOrders}</p>
                  </div>
                  <Clock className="text-yellow-600" size={20} />
                </div>

                <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-800">Processing</p>
                    <p className="text-xl font-bold text-blue-900">{stats.processingOrders}</p>
                  </div>
                  <Package className="text-blue-600" size={20} />
                </div>

                <div className="p-3 rounded-xl bg-green-50 border border-green-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-green-800">Delivered</p>
                    <p className="text-xl font-bold text-green-900">{stats.deliveredOrders}</p>
                  </div>
                  <CheckCircle className="text-green-600" size={20} />
                </div>

                <div className="p-3 rounded-xl bg-red-50 border border-red-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-red-800">Cancelled</p>
                    <p className="text-xl font-bold text-red-900">{stats.cancelledOrders}</p>
                  </div>
                  <XCircle className="text-red-600" size={20} />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                <span className="px-2 py-1 rounded-full bg-gray-100">Week: {stats.weekOrders}</span>
                <span className="px-2 py-1 rounded-full bg-gray-100">Month: {stats.monthOrders}</span>
              </div>
            </div>

            {/* Recent Orders (compact + filter chips) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <h2 className="text-sm font-bold text-gray-900">Recent Orders</h2>

                  <div className="flex gap-2 flex-wrap">
                    {(['all', 'pending', 'processing', 'delivered', 'cancelled'] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setRecentFilter(k)}
                        className={cx(
                          'px-3 py-2 rounded-xl border text-sm font-semibold',
                          recentFilter === k ? 'bg-primary text-white border-primary' : 'hover:bg-gray-50'
                        )}
                      >
                        {k === 'all' ? 'All' : k.charAt(0).toUpperCase() + k.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredRecentOrders.length === 0 ? (
                  <p className="text-center text-gray-500 py-8 text-sm">No orders</p>
                ) : (
                  <div className="space-y-2">
                    {filteredRecentOrders.slice(0, 6).map((order) => (
                      <div
                        key={order.id}
                        onClick={() => router.push(`/admin/orders/${order.id}`)}
                        className="flex items-center justify-between p-3 rounded-xl border hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">
                            Order #{String(order.order_number ?? '').trim() || String(order.id).slice(0, 8)}
                          </p>
                          <p className="text-xs text-gray-600 truncate">{order.customer_name}</p>
                          <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString()}</p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="font-bold text-gray-900 text-sm">{moneyINR(order.total_amount || 0)}</p>
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getStatusColor(
                              String(order.status || '')
                            )}`}
                          >
                            {String(order.status || '—')}
                          </span>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => router.push('/admin/orders')}
                      className="w-full mt-2 px-3 py-2 rounded-xl border hover:bg-gray-50 font-semibold flex items-center justify-center gap-2"
                    >
                      View all orders
                      <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Quick actions (compact) */}
              <div className="bg-white rounded-xl border shadow-sm p-4">
                <h2 className="text-sm font-bold text-gray-900 mb-3">Quick actions</h2>

                <div className="space-y-2">
                  <button
                    onClick={() => router.push('/admin/orders')}
                    className="w-full bg-gray-50 hover:bg-gray-100 rounded-xl p-3 text-left border"
                  >
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="text-primary" size={18} />
                      <span className="font-semibold text-gray-900">Manage Orders</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-600 flex items-center gap-2">
                      View all platform orders <Eye size={14} />
                    </div>
                  </button>

                  <button
                    onClick={() => router.push('/admin/merchants')}
                    className="w-full bg-gray-50 hover:bg-gray-100 rounded-xl p-3 text-left border"
                  >
                    <div className="flex items-center gap-2">
                      <Store className="text-primary" size={18} />
                      <span className="font-semibold text-gray-900">Manage Merchants</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-600 flex items-center gap-2">
                      Restaurants & approvals <Eye size={14} />
                    </div>
                  </button>

                  <button
                    onClick={() => router.push('/admin/users')}
                    className="w-full bg-gray-50 hover:bg-gray-100 rounded-xl p-3 text-left border"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="text-primary" size={18} />
                      <span className="font-semibold text-gray-900">Manage Users</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-600 flex items-center gap-2">
                      Customers & drivers <Eye size={14} />
                    </div>
                  </button>

                  <button
                    onClick={() => router.push('/admin/analytics')}
                    className="w-full bg-gray-50 hover:bg-gray-100 rounded-xl p-3 text-left border"
                  >
                    <div className="flex items-center gap-2">
                      <TrendingUp className="text-primary" size={18} />
                      <span className="font-semibold text-gray-900">Open Analytics</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-600">
                      Revenue, top merchants, drivers
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
