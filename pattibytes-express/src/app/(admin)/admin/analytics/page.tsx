 
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { supabase } from '@/lib/supabase';
import {
  BarChart3,
  DollarSign,
  RefreshCw,
  ShoppingBag,
  Store,
  Truck,
  TrendingDown,
  TrendingUp,
  Users,
  Volume2,
  VolumeX,
  ArrowRight,
} from 'lucide-react';

import { useOrdersRealtime } from '@/hooks/useOrdersRealtime';
import {
  calcGrowthPercent,
  computeOrderMetrics,
  groupRevenueByDay,
  netRevenueOfOrder,
} from '@/lib/analyticsKit';
import { useRouter } from 'next/navigation';

type TimeRange = 'week' | 'month' | 'year';

type AnalyticsState = {
  totalUsers: number;
  totalMerchants: number;
  totalDrivers: number;

  totalRevenue: number; // net (cancelled negative)
  totalOrders: number;
  growth: number;
  avgOrderValue: number;

  ordersByStatus: Record<string, number>;
  revenueByDay: Array<{ day: string; revenue: number }>;

  topMerchants: Array<{ id: string; name: string; revenue: number; orders: number }>;
  topDrivers: Array<{ id: string; name: string; deliveries: number }>;
};

function moneyINR(n: any) {
  const v = Number(n ?? 0) || 0;
  try {
    return v.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  } catch {
    return `₹${Math.round(v)}`;
  }
}

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

export default function AdminAnalyticsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [analytics, setAnalytics] = useState<AnalyticsState>({
    totalUsers: 0,
    totalMerchants: 0,
    totalDrivers: 0,

    totalRevenue: 0,
    totalOrders: 0,
    growth: 0,
    avgOrderValue: 0,

    ordersByStatus: {},
    revenueByDay: [],
    topMerchants: [],
    topDrivers: [],
  });

  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('month');

  // Compact interactivity
  const [statusFocus, setStatusFocus] = useState<'all' | 'pending' | 'processing' | 'delivered' | 'cancelled'>('all');

  // Sound: ON by default, but browsers may block until user gesture.
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const reloadTimer = useRef<any>(null);

  const SOUND_URL = '/sounds/analytics-update.mp3';

  const scheduleReload = () => {
    if (reloadTimer.current) clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(() => loadAnalytics(), 400);
  };

  const playPing = async () => {
    if (!soundEnabled) return;
    try {
      // Autoplay with sound may be blocked until user interaction.
      await audioRef.current?.play();
      setSoundBlocked(false);
    } catch {
      setSoundBlocked(true);
    }
  };

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

  // Build the audio element once (client only)
  useEffect(() => {
    audioRef.current = new Audio(SOUND_URL);
    audioRef.current.preload = 'auto';

    // Try a silent “prime” play; browsers may still require a gesture for audible audio.
    // If it fails, we show the "Enable sound" banner on next realtime event.
    unlockSound();

    return () => {
      audioRef.current = null;
    };
     
  }, []);

  useOrdersRealtime({
    enabled: !!user,
    onInsert: async () => {
      // Play sound only when a new order is inserted
      await playPing();
      scheduleReload();
    },
    onAnyChange: () => {
      // Any update should refresh analytics (compact debounce)
      scheduleReload();
    },
  });

  useEffect(() => {
    if (user) loadAnalytics();
    return () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      const now = new Date();
      let startDate = new Date();

      if (timeRange === 'week') startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      else if (timeRange === 'month') startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      else startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

      const previousStart = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));

      const [{ count: usersCount }, { count: merchantsCount }, { count: driversCount }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('merchants').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'driver'),
      ]);

      const { data: orders, error: ordersErr } = await supabase
        .from('orders')
        .select('total_amount,status,created_at,merchant_id,driver_id')
        .gte('created_at', startDate.toISOString());

      if (ordersErr) throw ordersErr;

      const { data: previousOrders, error: prevErr } = await supabase
        .from('orders')
        .select('total_amount,status,created_at')
        .gte('created_at', previousStart.toISOString())
        .lt('created_at', startDate.toISOString());

      if (prevErr) throw prevErr;

      const list = (orders as any[]) || [];
      const prevList = (previousOrders as any[]) || [];

      const m = computeOrderMetrics(list);
      const totalRevenue = m.totalRevenueNet;
      const totalOrders = m.totalOrders;
      const avgOrderValue = m.avgOrderValue;

      const prevRevenue = prevList.reduce((sum, o: any) => sum + netRevenueOfOrder(o), 0);
      const growth = calcGrowthPercent(totalRevenue, prevRevenue);

      const ordersByStatus: Record<string, number> = {
        pending: list.filter((o: any) => String(o.status || '').toLowerCase() === 'pending').length,
        processing: list.filter((o: any) =>
          ['confirmed', 'preparing', 'ready', 'picked_up', 'on_the_way'].includes(String(o.status || '').toLowerCase())
        ).length,
        delivered: list.filter((o: any) => String(o.status || '').toLowerCase() === 'delivered').length,
        cancelled: list.filter((o: any) => String(o.status || '').toLowerCase() === 'cancelled').length,
      };

      // Top merchants (by net revenue)
      const merchantAgg = new Map<string, { revenue: number; orders: number }>();
      for (const o of list) {
        const id = String(o.merchant_id || '');
        if (!id) continue;
        const cur = merchantAgg.get(id) || { revenue: 0, orders: 0 };
        cur.revenue += netRevenueOfOrder(o);
        cur.orders += 1;
        merchantAgg.set(id, cur);
      }

      const topMerchantIds = Array.from(merchantAgg.entries())
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 5)
        .map(([id]) => id);

      const topMerchants = await Promise.all(
        topMerchantIds.map(async (id) => {
          const { data: merchant } = await supabase
            .from('merchants')
            .select('business_name')
            .eq('id', id)
            .maybeSingle();

          return {
            id,
            name: merchant?.business_name || 'Unknown',
            revenue: merchantAgg.get(id)?.revenue || 0,
            orders: merchantAgg.get(id)?.orders || 0,
          };
        })
      );

      // Top drivers (by delivered count)
      const driverAgg = new Map<string, number>();
      for (const o of list) {
        if (String(o.status || '').toLowerCase() !== 'delivered') continue;
        const id = String(o.driver_id || '');
        if (!id) continue;
        driverAgg.set(id, (driverAgg.get(id) || 0) + 1);
      }

      const topDriverIds = Array.from(driverAgg.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => id);

      const topDrivers = await Promise.all(
        topDriverIds.map(async (id) => {
          const { data: driver } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', id)
            .maybeSingle();

          return { id, name: driver?.full_name || 'Unknown', deliveries: driverAgg.get(id) || 0 };
        })
      );

      setAnalytics({
        totalUsers: usersCount || 0,
        totalMerchants: merchantsCount || 0,
        totalDrivers: driversCount || 0,

        totalRevenue,
        totalOrders,
        growth,
        avgOrderValue,

        ordersByStatus,
        revenueByDay: groupRevenueByDay(list),
        topMerchants,
        topDrivers,
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const focusedCounts = useMemo(() => {
    const s = analytics.ordersByStatus || {};
    const all = Object.values(s).reduce((a, b) => a + Number(b || 0), 0);
    const pending = Number(s.pending || 0);
    const processing = Number(s.processing || 0);
    const delivered = Number(s.delivered || 0);
    const cancelled = Number(s.cancelled || 0);

    const active =
      statusFocus === 'all'
        ? all
        : statusFocus === 'pending'
          ? pending
          : statusFocus === 'processing'
            ? processing
            : statusFocus === 'delivered'
              ? delivered
              : cancelled;

    return { all, pending, processing, delivered, cancelled, active };
  }, [analytics.ordersByStatus, statusFocus]);

  const recentDays = useMemo(() => {
    const arr = analytics.revenueByDay || [];
    return arr.slice(-7);
  }, [analytics.revenueByDay]);

  const maxDayRevenueAbs = useMemo(() => {
    let m = 0;
    for (const d of recentDays) m = Math.max(m, Math.abs(Number(d.revenue || 0)));
    return m || 1;
  }, [recentDays]);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-5">
        {/* Header (compact) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-sm text-gray-600 mt-1">Net revenue includes cancelled orders as negative.</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
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
              onClick={loadAnalytics}
              className="px-3 py-2 rounded-xl border hover:bg-gray-50 font-semibold flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <div className="flex gap-2">
              {(['week', 'month', 'year'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={cx(
                    'px-3 py-2 rounded-xl font-semibold transition-colors border',
                    timeRange === range
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  )}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
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
            {/* Compact entity counts */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Users</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{analytics.totalUsers}</p>
                  </div>
                  <Users className="text-blue-500" size={22} />
                </div>
              </div>

              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Merchants</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{analytics.totalMerchants}</p>
                  </div>
                  <Store className="text-orange-500" size={22} />
                </div>
              </div>

              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Drivers</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{analytics.totalDrivers}</p>
                  </div>
                  <Truck className="text-green-500" size={22} />
                </div>
              </div>
            </div>

            {/* Compact key metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600">Revenue (net)</p>
                  <DollarSign className="text-green-600" size={18} />
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">{moneyINR(analytics.totalRevenue)}</p>
                <div className="flex items-center gap-1 mt-2 text-xs">
                  {analytics.growth >= 0 ? (
                    <>
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="text-green-600 font-semibold">+{analytics.growth.toFixed(1)}%</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-4 h-4 text-red-600" />
                      <span className="text-red-600 font-semibold">{analytics.growth.toFixed(1)}%</span>
                    </>
                  )}
                  <span className="text-gray-500">vs prev</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600">Orders</p>
                  <ShoppingBag className="text-blue-600" size={18} />
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">{analytics.totalOrders}</p>
                <p className="text-xs text-gray-500 mt-2">Range: {timeRange}</p>
              </div>

              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600">Avg order (net)</p>
                  <DollarSign className="text-purple-600" size={18} />
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">{moneyINR(analytics.avgOrderValue)}</p>
                <p className="text-xs text-gray-500 mt-2">Per order</p>
              </div>

              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600">Success</p>
                  <BarChart3 className="text-orange-600" size={18} />
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {analytics.totalOrders > 0
                    ? ((Number(analytics.ordersByStatus.delivered || 0) / analytics.totalOrders) * 100).toFixed(1)
                    : 0}
                  %
                </p>
                <p className="text-xs text-gray-500 mt-2">Delivered</p>
              </div>
            </div>

            {/* Interactive status chips + mini revenue bars */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
              <div className="bg-white rounded-xl border shadow-sm p-4 lg:col-span-2">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h2 className="text-sm font-bold text-gray-900">Orders by Status</h2>
                  <div className="text-xs text-gray-500">Showing: {focusedCounts.active}</div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {([
                    { k: 'all', label: `All (${focusedCounts.all})` },
                    { k: 'pending', label: `Pending (${focusedCounts.pending})` },
                    { k: 'processing', label: `Processing (${focusedCounts.processing})` },
                    { k: 'delivered', label: `Delivered (${focusedCounts.delivered})` },
                    { k: 'cancelled', label: `Cancelled (${focusedCounts.cancelled})` },
                  ] as const).map((x) => (
                    <button
                      key={x.k}
                      type="button"
                      onClick={() => setStatusFocus(x.k)}
                      className={cx(
                        'px-3 py-2 rounded-xl border text-sm font-semibold',
                        statusFocus === x.k ? 'bg-primary text-white border-primary' : 'hover:bg-gray-50'
                      )}
                    >
                      {x.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border shadow-sm p-4">
                <h2 className="text-sm font-bold text-gray-900 mb-3">Last 7 days (net)</h2>
                {recentDays.length === 0 ? (
                  <p className="text-sm text-gray-500">No data</p>
                ) : (
                  <div className="space-y-2">
                    {recentDays.map((d) => {
                      const value = Number(d.revenue || 0);
                      const pct = Math.min(100, (Math.abs(value) / maxDayRevenueAbs) * 100);
                      return (
                        <div key={d.day} className="flex items-center gap-2">
                          <div className="w-16 text-xs text-gray-500">{d.day.slice(5)}</div>
                          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className={cx('h-2', value >= 0 ? 'bg-green-500' : 'bg-red-500')}
                              style={{ width: `${pct}%` }}
                              title={`${d.day}: ${moneyINR(value)}`}
                            />
                          </div>
                          <div className="w-20 text-right text-xs font-semibold text-gray-700">{moneyINR(value)}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Top lists (clickable) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-gray-900">Top Merchants (net revenue)</h2>
                  <button
                    type="button"
                    onClick={() => router.push('/admin/merchants')}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    Manage <ArrowRight size={14} />
                  </button>
                </div>

                {analytics.topMerchants.length === 0 ? (
                  <p className="text-sm text-gray-500 py-6 text-center">No data available</p>
                ) : (
                  <div className="space-y-2">
                    {analytics.topMerchants.map((m, index) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => router.push(`/admin/merchants/${m.id}`)}
                        className="w-full text-left flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {index + 1}. {m.name}
                          </p>
                          <p className="text-xs text-gray-600">{m.orders} orders</p>
                        </div>
                        <div className="text-sm font-bold text-primary shrink-0">{moneyINR(m.revenue)}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border shadow-sm p-4">
                <h2 className="text-sm font-bold text-gray-900 mb-3">Top Drivers (deliveries)</h2>

                {analytics.topDrivers.length === 0 ? (
                  <p className="text-sm text-gray-500 py-6 text-center">No data available</p>
                ) : (
                  <div className="space-y-2">
                    {analytics.topDrivers.map((d, index) => (
                      <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {index + 1}. {d.name}
                          </p>
                          <p className="text-xs text-gray-600">Driver ID: {String(d.id).slice(0, 8)}…</p>
                        </div>
                        <div className="text-sm font-bold text-gray-900 shrink-0">{d.deliveries}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
