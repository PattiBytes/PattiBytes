/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useEffect, useMemo, useState } from 'react';
import { useAuth }   from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { PageLoadingSpinner } from '@/components/common/LoadingSpinner';
import { Clock, MessageSquare, Package, ShoppingBag } from 'lucide-react';
import BarcodeScanner from './_components/BarcodeScanner';

import { useOrders }            from './_hooks/useOrders';
import { useCustomOrders }      from './_hooks/useCustomOrders';
import { useAutoReload }        from './_hooks/useAutoReload';
import { useAdminPreferences }  from './_hooks/useAdminPreferences';

import { OrdersHeader }       from './_components/OrdersHeader';
import { OrdersStats }        from './_components/OrdersStats';
import { OrdersFilters }      from './_components/OrdersFilters';
import { OrdersTable }        from './_components/OrdersTable';
import { CustomOrdersPanel }  from './_components/CustomOrdersPanel';
import { AdminWarningBanner } from './_components/AdminWarningBanner';
// ── NEW: multi-cart session panel ──────────────────────────────────────────
import { MultiCartSessionsPanel } from './_components/MultiCartSessionsPanel';

type Tab = 'orders' | 'custom' | 'sessions';

export default function AdminOrdersPage() {
  const { user } = useAuth();
  const router   = useRouter();

  const isAdmin = useMemo(() =>
    (user as any)?.role === 'admin' || (user as any)?.role === 'superadmin', [user]);

  const [tab,          setTab]          = useState<Tab>('orders');
  const [searchQuery,  setSearchQuery]  = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // ── Persisted preferences ──────────────────────────────────────────────────
  const { prefs, loading: prefsLoading, updatePrefs } = useAdminPreferences();

  // ── Data hooks ─────────────────────────────────────────────────────────────
  const orders = useOrders();
  const custom = useCustomOrders();

  // ── Auto-reload ────────────────────────────────────────────────────────────
  const autoReload = useAutoReload(
    async () => { await Promise.all([orders.loadOrders(), custom.loadCustomOrders()]); },
    {
      initialEnabled  : prefs.auto_reload_enabled,
      initialInterval : prefs.auto_reload_interval,
      onPersist       : (enabled, interval) =>
        updatePrefs({ auto_reload_enabled: enabled, auto_reload_interval: interval }),
    },
  );

  // ── Auth guard + initial load ──────────────────────────────────────────────
  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    void orders.loadOrders();
    void custom.loadCustomOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── Filtered orders ────────────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    let list = [...orders.orders];
    if (statusFilter !== 'all') list = list.filter(o => o.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(o =>
        o.id.includes(q) ||
        String(o.order_number ?? '').includes(q) ||
        (o.customerName ?? '').toLowerCase().includes(q) ||
        (o.merchants?.business_name ?? '').toLowerCase().includes(q) ||
        (o.customer_phone ?? '').includes(q),
      );
    }
    return list;
  }, [orders.orders, statusFilter, searchQuery]);

  // ── Multi-cart sessions filter ─────────────────────────────────────────────
  // Show orders that belong to a session (multi-restaurant orders)
  const multiOrders = useMemo(
    () => orders.orders.filter(o => !!(o as any).cart_session_id),
    [orders.orders],
  );

  const pendingCustom   = custom.customOrders.filter(o => o.status === 'pending').length;
  const fullStats       = { ...orders.stats, customPending: pendingCustom };

  if (orders.loading && !orders.orders.length) return <PageLoadingSpinner />;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4">

        <OrdersHeader
          isAdmin={isAdmin} refreshing={orders.refreshing}
          onRefresh={orders.handleRefresh} onExport={orders.exportToCSV}
        />

        {/* Status bar */}
        <div className="flex items-center gap-3 -mt-2 mb-3">
          {orders.lastRefreshed && (
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Clock size={10} />
              {orders.lastRefreshed.toLocaleTimeString('en-IN', {
                hour: '2-digit', minute: '2-digit', second: '2-digit',
              })}
            </p>
          )}
          {prefsLoading && (
            <span className="text-xs text-gray-300 flex items-center gap-1">
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-pulse" />
              Loading preferences…
            </span>
          )}
          {autoReload.enabled && !prefsLoading && (
            <span className="text-xs text-primary font-semibold flex items-center gap-1">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              Auto-reload ON · {autoReload.interval}s
            </span>
          )}
        </div>

        <OrdersStats stats={fullStats} />

        {/* Tab switcher — now 3 tabs */}
        <div className="flex gap-1 mb-3 bg-white rounded-lg shadow-sm p-1 w-fit border border-gray-100 flex-wrap">
          {([
            {
              id:    'orders',
              label: 'All Orders',
              Icon:  Package,
              count: filteredOrders.length,
            },
            {
              id:    'sessions',
              label: 'Multi-Restaurant',
              Icon:  ShoppingBag,
              count: multiOrders.length,
            },
            {
              id:    'custom',
              label: 'Custom Requests',
              Icon:  MessageSquare,
              count: pendingCustom,
            },
          ] as const).map(({ id, label, Icon, count }) => (
            <button
              key={id}
              onClick={() => setTab(id as Tab)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                tab === id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Icon size={13} />
              {label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0 rounded-full font-bold ${
                  tab === id
                    ? 'bg-white/25 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab content ────────────────────────────────────────────────── */}
        {tab === 'orders' && (
          <>
            <OrdersFilters
              searchQuery={searchQuery}   statusFilter={statusFilter}
              onSearch={setSearchQuery}   onStatus={setStatusFilter}
              autoReload={autoReload}
            />
            <OrdersTable
              orders={filteredOrders}
              isAdmin={isAdmin}
              updatingOrderId={orders.updatingOrderId}
              deletingOrderId={orders.deletingOrderId}
              notifyingOrderId={orders.notifyingOrderId}
              onNotify={orders.notifyAllDrivers}
              onStatusChange={orders.updateOrderStatus}
              onDelete={o => orders.deleteOrder(o, isAdmin)}
            />
          </>
        )}

        {tab === 'sessions' && (
          <MultiCartSessionsPanel
            onViewOrder={id => router.push(`/admin/orders/${id}`)}
          />
        )}

        {tab === 'custom' && (
          <CustomOrdersPanel
            orders={custom.customOrders}
            loading={custom.loadingCustom}
            quotingId={custom.quotingId}
            onQuote={custom.quoteCustomOrder}
            onStatus={custom.updateCustomOrderStatus}
          />
        )}

        {/* Barcode scanner — floating action */}
        <div className="fixed bottom-6 right-6 z-50">
          <BarcodeScanner />
        </div>

        {isAdmin && <AdminWarningBanner />}
      </div>

      <style jsx global>{`
        @keyframes fade-in  { from { opacity:0; transform:translateY(6px) }  to { opacity:1; transform:none } }
        @keyframes slide-up { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:none } }
        .animate-fade-in  { animation: fade-in  0.3s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.4s ease-out forwards; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </DashboardLayout>
  );
}