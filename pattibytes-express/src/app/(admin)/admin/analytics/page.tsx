// src/app/(admin)/admin/analytics/page.tsx
 
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useOrdersRealtime } from '@/hooks/useOrdersRealtime';
import { useRouter } from 'next/navigation';
import {
  BarChart3, DollarSign, RefreshCw, ShoppingBag, Store, Truck,
  Users, Volume2, VolumeX, Printer, Download, Activity,
  Package, MapPin, Clock, AlertTriangle,
} from 'lucide-react';
import { toast } from 'react-toastify';

import { useAnalyticsData } from './_components/useAnalyticsData';
import KPICard from './_components/KPICard';
import SvgBarChart, { type BarDatum } from './_components/SvgBarChart';
import SvgDonutChart from './_components/SvgDonutChart';
import HourlyHeatmap from './_components/HourlyHeatmap';
import { TopMerchants, TopDrivers } from './_components/TopLeaderboard';
import {
  NotificationInsights, ReviewInsights, CancellationInsights,
  RevenueBreakdownPanel, CustomOrdersPanel,
} from './_components/InsightPanels';
import type { TimeRange } from './_components/types';

// ─── Utilities ────────────────────────────────────────────────────────────────
function moneyINR(v: number) {
  try { return v.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }); }
  catch { return `₹${Math.round(v)}`; }
}

function cx(...c: Array<string | false | null | undefined>) { return c.filter(Boolean).join(' '); }

// Converts analytics data → CSV string
function buildCSV(data: ReturnType<typeof useAnalyticsData>['data']): string {
  const rows: string[][] = [
    ['Metric', 'Value'],
    ['Total Users', String(data.totalUsers)],
    ['Active Users', String(data.activeUsers)],
    ['New Users (Period)', String(data.newUsersThisPeriod)],
    ['Total Merchants', String(data.totalMerchants)],
    ['Total Drivers', String(data.totalDrivers)],
    ['Total Revenue (Net)', String(data.totalRevenue)],
    ['Total Orders', String(data.totalOrders)],
    ['Revenue Growth %', String(data.revenueGrowth.toFixed(2))],
    ['Avg Order Value', String(data.avgOrderValue.toFixed(2))],
    ['Fulfillment Rate %', String(data.fulfillmentRate.toFixed(2))],
    ['Cancellation Rate %', String(data.cancellationRate.toFixed(2))],
    ['Avg Prep Time (min)', String(data.avgPrepTime.toFixed(1))],
    ['Avg Delivery Distance (km)', String(data.avgDeliveryDistance.toFixed(2))],
    ['Total Notifications', String(data.totalNotifications)],
    ['Notif Read Rate %', String(data.notifReadRate.toFixed(2))],
    ['Notif Push Rate %', String(data.notifPushRate.toFixed(2))],
    ['Total Reviews', String(data.totalReviews)],
    ['Avg Overall Rating', String(data.avgOverallRating.toFixed(2))],
    ['Avg Food Rating', String(data.avgFoodRating.toFixed(2))],
    ['Avg Delivery Rating', String(data.avgDeliveryRating.toFixed(2))],
    ['Pending Custom Orders', String(data.pendingCustomOrders)],
    ['Pending Access Requests', String(data.pendingAccessRequests)],
    ['', ''],
    ['Revenue by Day', ''],
    ['Date', 'Revenue', 'Orders'],
    ...data.revenueByDay.map(r => [r.day, String(r.revenue.toFixed(2)), String(r.orders)]),
  ];
  return rows.map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminAnalyticsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [activeSection, setActiveSection] = useState<'overview' | 'orders' | 'operations' | 'engagement'>('overview');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundBlocked, setSoundBlocked] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const { data, loading, lastUpdated, reload } = useAnalyticsData(timeRange);

  // ── Sound ────────────────────────────────────────────────────────────────
  useEffect(() => {
    audioRef.current = new Audio('/sounds/analytics-update.mp3');
    audioRef.current.preload = 'auto';
    audioRef.current.play().then(() => { audioRef.current?.pause(); audioRef.current!.currentTime = 0; }).catch(() => setSoundBlocked(true));
    return () => { audioRef.current = null; };
  }, []);

  const playPing = useCallback(async () => {
    if (!soundEnabled) return;
    try { await audioRef.current?.play(); setSoundBlocked(false); }
    catch { setSoundBlocked(true); }
  }, [soundEnabled]);

  const scheduleReload = useCallback(() => {
    if (reloadTimer.current) clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(reload, 500);
  }, [reload]);

  // ── Realtime ─────────────────────────────────────────────────────────────
  useOrdersRealtime({
    enabled: !!user,
    onInsert: async () => { await playPing(); scheduleReload(); },
    onAnyChange: scheduleReload,
  });

  useEffect(() => {
    if (user) reload();
    return () => { if (reloadTimer.current) clearTimeout(reloadTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, timeRange]);

  // ── Print ────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body > * { display: none !important; }
        #analytics-print-root { display: block !important; }
        .no-print { display: none !important; }
        @page { margin: 1cm; }
      }
    `;
    document.head.appendChild(style);
    if (printRef.current) printRef.current.id = 'analytics-print-root';
    window.print();
    document.head.removeChild(style);
  };

  // ── CSV Export ───────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const csv = buildCSV(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `analytics_${timeRange}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('📊 CSV exported!');
  };

  // ── Derived chart data ────────────────────────────────────────────────────
  const revBarData: BarDatum[] = data.revenueByDay.slice(-14).map(d => ({
    label: d.day.slice(5),
    value: d.revenue,
    subLabel: `${d.orders}`,
    color: d.revenue < 0 ? '#EF4444' : '#F97316',
  }));

  const hourBarData: BarDatum[] = data.ordersByHour.map(d => ({
    label: `${d.hour}`,
    value: d.count,
    color: '#3B82F6',
  }));

  const statusDonutSegments = [
    { label: 'Delivered', value: data.ordersByStatus.delivered, color: '#22C55E' },
    { label: 'Processing', value: data.ordersByStatus.processing, color: '#F97316' },
    { label: 'Pending', value: data.ordersByStatus.pending, color: '#FBBF24' },
    { label: 'Cancelled', value: data.ordersByStatus.cancelled, color: '#EF4444' },
  ].filter(s => s.value > 0);

  const paymentDonutSegments = data.ordersByPayment.map(p => ({
    label: p.method,
    value: p.count,
    color: p.method === 'COD' ? '#F97316' : p.method === 'ONLINE' ? '#3B82F6' : '#9CA3AF',
  }));

  const vegDonutSegments = [
    { label: 'Veg 🌿', value: data.vegNonVeg.veg, color: '#22C55E' },
    { label: 'Non-Veg 🍗', value: data.vegNonVeg.nonVeg, color: '#EF4444' },
  ].filter(s => s.value > 0);

  const totalStatusOrders = Object.values(data.ordersByStatus).reduce((a, b) => a + b, 0);

  // ── Skeleton ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="h-8 w-48 bg-gray-200 rounded-xl animate-pulse" />
            <div className="h-10 w-64 bg-gray-200 rounded-xl animate-pulse" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(8)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-2xl animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 h-72 bg-gray-200 rounded-2xl animate-pulse" />
            <div className="h-72 bg-gray-200 rounded-2xl animate-pulse" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div ref={printRef} className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-5">

        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 no-print">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-xs text-gray-400 mt-1">
              {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString('en-IN')}` : 'Live data'}
              {data.pendingAccessRequests > 0 && (
                <span className="ml-3 bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold animate-pulse">
                  {data.pendingAccessRequests} pending requests
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Sound */}
            <button onClick={() => setSoundEnabled(v => !v)}
              className="p-2 rounded-xl border hover:bg-gray-50 transition-colors" title="Toggle sound">
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} className="text-gray-400" />}
            </button>

            {/* Print */}
            <button onClick={handlePrint}
              className="p-2 rounded-xl border hover:bg-gray-50 transition-colors" title="Print / Screenshot">
              <Printer size={16} />
            </button>

            {/* Export CSV */}
            <button onClick={handleExportCSV}
              className="px-3 py-2 rounded-xl border hover:bg-gray-50 font-semibold flex items-center gap-1.5 text-sm transition-colors">
              <Download size={14} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            {/* Refresh */}
            <button onClick={reload}
              className="p-2 rounded-xl border hover:bg-gray-50 transition-colors">
              <RefreshCw size={16} />
            </button>

            {/* Time range */}
            <div className="flex rounded-xl border overflow-hidden">
              {(['week', 'month', 'year'] as const).map((r) => (
                <button key={r} onClick={() => setTimeRange(r)}
                  className={cx('px-3 py-2 text-sm font-semibold transition-colors',
                    timeRange === r ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  )}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sound blocked banner */}
        {soundEnabled && soundBlocked && (
          <div className="mb-4 p-3 rounded-xl bg-yellow-50 border border-yellow-200 flex items-center justify-between gap-3 no-print">
            <p className="text-sm text-yellow-800">Browser blocked sound. Click to enable.</p>
            <button onClick={() => audioRef.current?.play().then(() => setSoundBlocked(false))}
              className="px-3 py-1.5 bg-yellow-600 text-white rounded-lg text-sm font-semibold hover:bg-yellow-700">
              Enable Sound
            </button>
          </div>
        )}

        {/* ── Section tabs ───────────────────────────────────────────── */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit no-print overflow-x-auto">
          {([
            { key: 'overview', label: 'Overview', icon: <BarChart3 size={13} /> },
            { key: 'orders', label: 'Orders', icon: <ShoppingBag size={13} /> },
            { key: 'operations', label: 'Operations', icon: <Activity size={13} /> },
            { key: 'engagement', label: 'Engagement', icon: <Users size={13} /> },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveSection(tab.key)}
              className={cx('flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
                activeSection === tab.key ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════════ */}
        {/*  OVERVIEW SECTION                                           */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeSection === 'overview' && (
          <>
            {/* Platform counts */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
              {[
                { title: 'Total Users', value: data.totalUsers, icon: <Users size={15} className="text-blue-600" />, iconBg: 'bg-blue-50', subtitle: `${data.activeUsers} active` },
                { title: 'New Users', value: data.newUsersThisPeriod, icon: <Users size={15} className="text-indigo-600" />, iconBg: 'bg-indigo-50', subtitle: `This ${timeRange}` },
                { title: 'Merchants', value: data.totalMerchants, icon: <Store size={15} className="text-orange-600" />, iconBg: 'bg-orange-50', onClick: () => router.push('/admin/merchants') },
                { title: 'Drivers', value: data.totalDrivers, icon: <Truck size={15} className="text-green-600" />, iconBg: 'bg-green-50' },
                { title: 'Pending Access', value: data.pendingAccessRequests, icon: <AlertTriangle size={15} className="text-red-600" />, iconBg: 'bg-red-50', alert: data.pendingAccessRequests > 0, onClick: () => router.push('/admin/access-requests') },
                { title: 'Custom Pending', value: data.pendingCustomOrders, icon: <Package size={15} className="text-purple-600" />, iconBg: 'bg-purple-50', alert: data.pendingCustomOrders > 0 },
              ].map(kpi => (
                <KPICard key={kpi.title} {...kpi} format="number" />
              ))}
            </div>

            {/* Core metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              <KPICard title="Net Revenue" value={data.totalRevenue} format="currency"
                growth={data.revenueGrowth} icon={<DollarSign size={15} className="text-green-600" />}
                iconBg="bg-green-50" subtitle="Incl. cancelled −" />
              <KPICard title="Total Orders" value={data.totalOrders} format="number"
                growth={data.growth} icon={<ShoppingBag size={15} className="text-blue-600" />}
                iconBg="bg-blue-50" subtitle={`This ${timeRange}`} />
              <KPICard title="Avg Order Value" value={data.avgOrderValue} format="currency"
                icon={<DollarSign size={15} className="text-purple-600" />}
                iconBg="bg-purple-50" subtitle="Per order (net)" />
              <KPICard title="Fulfillment Rate" value={data.fulfillmentRate} format="percent"
                icon={<BarChart3 size={15} className="text-primary" />}
                iconBg="bg-orange-50" subtitle={`${data.ordersByStatus.delivered} delivered`} />
            </div>

            {/* Revenue bar chart + Order status donut */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="text-sm font-bold text-gray-900 mb-4">Revenue Trend (last 14 days)</h2>
                <SvgBarChart
                  data={revBarData}
                  height={220}
                  valueFormatter={moneyINR}
                  tooltipExtra={(d) => `${d.subLabel} orders`}
                  showValues={revBarData.length <= 10}
                  animated
                />
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="text-sm font-bold text-gray-900 mb-4">Order Status</h2>
                <SvgDonutChart
                  segments={statusDonutSegments}
                  centerValue={`${totalStatusOrders}`}
                  centerLabel="orders"
                  size={130}
                />
              </div>
            </div>

            {/* Revenue breakdown + top lists */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <RevenueBreakdownPanel
                subtotal={data.breakdown.subtotal}
                deliveryFee={data.breakdown.deliveryFee}
                tax={data.breakdown.tax}
                discount={data.breakdown.discount}
              />
              <TopMerchants merchants={data.topMerchants} />
              <TopDrivers drivers={data.topDrivers} />
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/*  ORDERS SECTION                                             */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeSection === 'orders' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              {[
                { title: 'Cancellation Rate', value: data.cancellationRate, format: 'percent' as const, icon: <AlertTriangle size={15} className="text-red-500" />, iconBg: 'bg-red-50', subtitle: `${data.ordersByStatus.cancelled} cancelled` },
                { title: 'Fulfillment Rate', value: data.fulfillmentRate, format: 'percent' as const, icon: <BarChart3 size={15} className="text-green-600" />, iconBg: 'bg-green-50' },
                { title: 'Avg Prep Time', value: data.avgPrepTime, format: 'time' as const, icon: <Clock size={15} className="text-orange-600" />, iconBg: 'bg-orange-50', subtitle: 'minutes' },
                { title: 'Avg Delivery Dist.', value: data.avgDeliveryDistance, format: 'distance' as const, icon: <MapPin size={15} className="text-blue-600" />, iconBg: 'bg-blue-50', subtitle: 'kilometers' },
              ].map(kpi => <KPICard key={kpi.title} {...kpi} />)}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="text-sm font-bold text-gray-900 mb-4">Payment Methods</h2>
                <SvgDonutChart
                  segments={paymentDonutSegments}
                  centerValue={`${data.totalOrders}`}
                  centerLabel="total"
                  size={130}
                />
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="text-sm font-bold text-gray-900 mb-4">Veg vs Non-Veg Items Ordered</h2>
                <SvgDonutChart
                  segments={vegDonutSegments}
                  centerValue={`${data.vegNonVeg.veg + data.vegNonVeg.nonVeg}`}
                  centerLabel="items"
                  size={130}
                />
              </div>
            </div>

            {/* Order type breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="text-sm font-bold text-gray-900 mb-4">Orders by Type</h2>
                <SvgBarChart
                  data={data.ordersByType.map(t => ({
                    label: t.type,
                    value: t.count,
                    color: t.type === 'restaurant' ? '#F97316' : t.type === 'store' ? '#3B82F6' : '#8B5CF6',
                  }))}
                  height={180}
                  valueFormatter={(v) => String(v)}
                  showValues
                />
              </div>

              <CancellationInsights
                cancellationRate={data.cancellationRate}
                topReasons={data.topCancellationReasons}
              />
            </div>

            {/* Full revenue daily chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-4">Daily Revenue & Order Count (Full Period)</h2>
              <SvgBarChart
                data={data.revenueByDay.map(d => ({
                  label: d.day.slice(5),
                  value: d.revenue,
                  subLabel: `${d.orders} orders`,
                  color: d.revenue < 0 ? '#EF4444' : '#F97316',
                }))}
                height={240}
                valueFormatter={moneyINR}
                tooltipExtra={(d) => d.subLabel || ''}
                animated
              />
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/*  OPERATIONS SECTION                                         */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeSection === 'operations' && (
          <>
            {/* Hourly heatmap */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
              <h2 className="text-sm font-bold text-gray-900 mb-2">Peak Hours Heatmap</h2>
              <p className="text-xs text-gray-400 mb-4">Order volume by hour of day</p>
              <HourlyHeatmap data={data.ordersByHour} />
            </div>

            {/* Hourly bar chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
              <h2 className="text-sm font-bold text-gray-900 mb-4">Orders by Hour (Bar Chart)</h2>
              <SvgBarChart
                data={hourBarData}
                height={200}
                color="#3B82F6"
                valueFormatter={(v) => String(v)}
                showValues={false}
                animated
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TopMerchants merchants={data.topMerchants} />
              <TopDrivers drivers={data.topDrivers} />
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/*  ENGAGEMENT SECTION                                         */}
        {/* ════════════════════════════════════════════════════════════ */}
        {activeSection === 'engagement' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
              <NotificationInsights
                total={data.totalNotifications}
                readRate={data.notifReadRate}
                pushRate={data.notifPushRate}
                byType={data.notifByType}
              />
              <ReviewInsights
                totalReviews={data.totalReviews}
                avgOverall={data.avgOverallRating}
                avgFood={data.avgFoodRating}
                avgDelivery={data.avgDeliveryRating}
                ratingDistribution={data.ratingDistribution}
              />
              <CustomOrdersPanel
                pending={data.pendingCustomOrders}
                byCategory={data.customOrdersByCategory}
              />
            </div>

            {/* User growth bar (new users by role) */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-4">Platform Health</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Notif Engagement', value: `${data.notifReadRate.toFixed(1)}%`, color: 'bg-blue-100 text-blue-700', icon: '🔔' },
                  { label: 'Push Delivery', value: `${data.notifPushRate.toFixed(1)}%`, color: 'bg-purple-100 text-purple-700', icon: '📲' },
                  { label: 'Avg Rating', value: data.avgOverallRating.toFixed(2), color: 'bg-yellow-100 text-yellow-700', icon: '⭐' },
                  { label: 'Fulfillment', value: `${data.fulfillmentRate.toFixed(1)}%`, color: 'bg-green-100 text-green-700', icon: '✅' },
                ].map(item => (
                  <div key={item.label} className={`${item.color} rounded-2xl p-4 text-center`}>
                    <div className="text-2xl mb-1">{item.icon}</div>
                    <p className="text-2xl font-bold tabular-nums">{item.value}</p>
                    <p className="text-xs font-semibold opacity-80 mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      </div>
    </DashboardLayout>
  );
}

