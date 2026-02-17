/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  ChefHat,
  Filter,
  Search,
  Eye,
  RefreshCw,
  Download,
  Bell,
  Zap,
  TrendingUp,
  Trash2,
  AlertTriangle,
  Shield,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Edit3,
} from 'lucide-react';
import { PageLoadingSpinner } from '@/components/common/LoadingSpinner';
import { toast } from 'react-toastify';

type DriverProfileRow = { user_id: string; is_available: boolean | null; is_verified: boolean | null; profile_completed: boolean | null };
type DriverRow = { id: string; full_name: string | null; phone: string | null };

interface Order {
  id: string;
   order_number?: string | number | null;
  customer_id: string | null;
  merchant_id: string;
  driver_id?: string | null;
  items: any[];
  subtotal: number;
  delivery_fee: number;
  tax: number;
  total_amount: number;
  status: string;
  payment_method: string;
  payment_status: string;
  created_at: string;
  updated_at?: string | null;
  customer_notes?: string | null;
  customer_phone?: string | null;
  profiles?: { full_name: string | null };
  merchants?: { business_name: string | null };
  customerName?: string;
}

const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'assigned', 'picked_up'];
const ALL_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'assigned', 'picked_up', 'delivered', 'cancelled'];

async function sendDbNotification(userId: string | null, title: string, message: string, type: string, data?: any) {
  if (!userId) {
    console.log('⚠️ Skipping notification: No user_id (walk-in order)');
    return true;
  }

  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      body: message,
      type,
      data: data ?? null,
      is_read: false,
      created_at: new Date().toISOString(),
    } as any);
    if (!error) return true;
  } catch {}

  try {
    const { error } = await supabase.from('notifications').insert({
      userid: userId,
      title,
      body: message,
      message,
      type,
      data: data ?? null,
      isread: false,
      createdat: new Date().toISOString(),
    } as any);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('Notification insert failed:', e);
    return false;
  }
}

async function loadAvailableDriversStrict(): Promise<DriverRow[]> {
  const { data: dp, error: dpErr } = await supabase
    .from('driver_profiles')
    .select('user_id,is_available,is_verified,profile_completed')
    .eq('is_available', true)
    .eq('is_verified', true)
    .eq('profile_completed', true);

  if (dpErr) throw dpErr;

  const ids = (dp || []).map((r: DriverProfileRow) => r.user_id).filter(Boolean);
  if (ids.length === 0) return [];

  const { data: profs, error: pErr } = await supabase
    .from('profiles')
    .select('id,full_name,phone,role,approval_status,is_active')
    .in('id', ids)
    .eq('role', 'driver')
    .eq('approval_status', 'approved')
    .eq('is_active', true);

  if (pErr) throw pErr;

  return (profs || []).map((p: any) => ({ id: p.id, full_name: p.full_name ?? null, phone: p.phone ?? null }));
}

async function upsertAssignments(orderId: string, driverIds: string[]) {
  const nowIso = new Date().toISOString();
  const rows = driverIds.map((driverId) => ({
    order_id: orderId,
    driver_id: driverId,
    status: 'pending',
    assigned_at: nowIso,
  }));
  const { error } = await supabase.from('driver_assignments').upsert(rows as any, { onConflict: 'order_id,driver_id' } as any);
  if (error) throw error;
}

export default function AdminOrdersPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [drivers, setDrivers] = useState<DriverRow[]>([]);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, revenue: 0 });

  const [notifyingOrderId, setNotifyingOrderId] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  const isAdmin = useMemo(() => {
    return (user as any)?.role === 'admin' || (user as any)?.role === 'superadmin';
  }, [user]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    if (statusFilter !== 'all') filtered = filtered.filter((o) => o.status === statusFilter);

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          (o.customerName || '').toLowerCase().includes(q) ||
          (o.merchants?.business_name || '').toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [orders, statusFilter, searchQuery]);

  const loadOrders = async () => {
  try {
    setLoading(true);

    const { data, error } = await supabase
      .from('orders')
      .select(
        `
        id,
        order_number,
        customer_id,
        merchant_id,
        driver_id,
        items,
        subtotal,
        delivery_fee,
        tax,
        total_amount,
        status,
        payment_method,
        payment_status,
        created_at,
        updated_at,
        customer_notes,
        customer_phone,
        profiles:customer_id (full_name),
        merchants:merchant_id (business_name)
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = (data || []) as any[];

      const processedOrders = rows.map((order) => {
        let customerName = 'Unknown';

        if (!order.customer_id) {
          if (order.customer_notes) {
            if (order.customer_notes.includes('Walk-in:')) {
              customerName = order.customer_notes
                .replace('Walk-in:', '')
                .split('\n')[0]
                .trim();
            } else {
              customerName = order.customer_notes.split('\n')[0].trim() || 'Walk-in Customer';
            }
          } else if (order.customer_phone) {
            customerName = `Walk-in (${order.customer_phone})`;
          } else {
            customerName = 'Walk-in Customer';
          }
        } else {
          customerName = order.profiles?.full_name || 'Unknown';
        }

        return {
          ...order,
          customerName,
        };
      });

      setOrders(processedOrders);

      const total = rows.length;
      const active = rows.filter((o) => ACTIVE_STATUSES.includes(String(o.status))).length;
      const completed = rows.filter((o) => String(o.status) === 'delivered').length;
      const revenue = rows.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

      setStats({ total, active, completed, revenue });
    } catch (e: any) {
      console.error('Failed to load orders:', e);
      toast.error(e?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    toast.success('Orders refreshed!');
  };

  const loadDrivers = async () => {
    try {
      const list = await loadAvailableDriversStrict();
      setDrivers(list);
    } catch (e: any) {
      console.error('Failed to load drivers:', e);
      toast.error('Failed to load drivers');
      setDrivers([]);
    }
  };

 const exportToCSV = () => {
  const headers = ['Order Number', 'Order ID', 'Customer', 'Restaurant', 'Amount', 'Status', 'Payment', 'Created At', 'Updated At'];
  const csvData = filteredOrders.map((o) => [
    String(o.order_number ?? '').trim() || o.id.slice(0, 8),  // ✅ Add order_number
    o.id,
    o.customerName || 'N/A',
    o.merchants?.business_name || 'N/A',
    o.total_amount,
    o.status,
    o.payment_status,
    new Date(o.created_at).toLocaleString(),
    o.updated_at ? new Date(o.updated_at).toLocaleString() : 'N/A',
  ]);

  const csv = [headers.join(','), ...csvData.map((row) => row.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  toast.success('Orders exported successfully!');
};


  const notifyAllDrivers = async (order: Order) => {
    if (!drivers.length) await loadDrivers();
    if (!drivers.length) {
      toast.warning('No available drivers');
      return;
    }

    setNotifyingOrderId(order.id);
    try {
      const ids = drivers.map((d) => d.id);
      await upsertAssignments(order.id, ids);

      let ok = 0;
      for (const d of drivers) {
        const sent = await sendDbNotification(
          d.id,
          'New Delivery Request',
          `Order #${order.id.slice(0, 8)} is ready for pickup.`,
          'delivery',
          { order_id: order.id, merchant_id: order.merchant_id, total_amount: order.total_amount }
        );
        if (sent) ok += 1;
      }
      toast.success(`Notified ${ok} driver(s)`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to notify drivers');
    } finally {
      setNotifyingOrderId(null);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getTimeDiff = (created: string, updated?: string | null) => {
    if (!updated) return '';
    const diff = new Date(updated).getTime() - new Date(created).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ${minutes % 60}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  };

  // ✅ UPDATE ORDER STATUS FUNCTION
  const updateOrderStatus = async (order: Order, newStatus: string) => {
    if (order.status === newStatus) return;

    setUpdatingOrderId(order.id);
    try {
      const nowIso = new Date().toISOString();
      const patch: any = { status: newStatus, updated_at: nowIso };

      const { error } = await supabase.from('orders').update(patch).eq('id', order.id);
      if (error) throw error;

      // Notify customer (if not walk-in)
      if (order.customer_id) {
        await sendDbNotification(
          order.customer_id,
          'Order Status Updated',
          `Your order #${order.id.slice(0, 8)} is now ${newStatus.replace('_', ' ')}.`,
          'order',
          { order_id: order.id, status: newStatus }
        );
      }

      toast.success(`Status updated to ${newStatus}`);
      await loadOrders();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to update status');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const deleteOrder = async (order: Order) => {
    if (!isAdmin) {
      toast.error('Only admins can delete orders');
      return;
    }

    const confirmed = window.confirm(
      `⚠️ DELETE ORDER PERMANENTLY\n\n` +
      `Order ID: #${order.id.slice(0, 8)}\n` +
      `Customer: ${order.customerName || 'Unknown'}\n` +
      `Restaurant: ${order.merchants?.business_name || 'N/A'}\n` +
      `Amount: ₹${Number(order.total_amount || 0).toFixed(2)}\n` +
      `Status: ${order.status}\n\n` +
      `⚠️ THIS ACTION CANNOT BE UNDONE!\n\n` +
      `Are you absolutely sure?`
    );

    if (!confirmed) return;

    setDeletingOrderId(order.id);
    try {
      if (order.driver_id || ACTIVE_STATUSES.includes(order.status)) {
        await supabase.from('driver_assignments').delete().eq('order_id', order.id);
      }

      try {
        await supabase.from('notifications').delete().or(`data->>order_id.eq.${order.id}`);
      } catch (e) {
        console.warn('Notification deletion skipped:', e);
      }

      const { error: orderError } = await supabase.from('orders').delete().eq('id', order.id);
      if (orderError) throw orderError;

      if (order.customer_id) {
        await sendDbNotification(
          order.customer_id,
          '❌ Order Deleted',
          `Your order #${order.id.slice(0, 8)} has been deleted by admin.`,
          'order',
          { order_id: order.id, deleted_at: new Date().toISOString(), reason: 'Admin deletion' }
        );
      }

      if (order.driver_id) {
        await sendDbNotification(
          order.driver_id,
          '❌ Order Cancelled',
          `Order #${order.id.slice(0, 8)} has been deleted by admin.`,
          'delivery',
          { order_id: order.id, deleted_at: new Date().toISOString() }
        );
      }

      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      toast.success('✅ Order deleted successfully');
      setTimeout(() => loadOrders(), 500);
    } catch (e: any) {
      console.error('❌ Failed to delete order:', e);
      toast.error(e?.message || 'Failed to delete order');
    } finally {
      setDeletingOrderId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: any = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      confirmed: { color: 'bg-blue-100 text-blue-800', icon: ChefHat },
      preparing: { color: 'bg-purple-100 text-purple-800', icon: ChefHat },
      ready: { color: 'bg-orange-100 text-orange-800', icon: Package },
      assigned: { color: 'bg-indigo-100 text-indigo-800', icon: Truck },
      picked_up: { color: 'bg-indigo-100 text-indigo-800', icon: Truck },
      delivered: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle },
    };
    const cfg = map[status] || map.pending;
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
        <Icon size={12} />
        {status}
      </span>
    );
  };

  if (loading) return <PageLoadingSpinner />;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 animate-fade-in">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Zap className="text-primary animate-pulse" size={24} />
              All Orders
            </h1>
            <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-1">
              {isAdmin && <Shield size={12} className="text-green-600" />}
              Manage orders {isAdmin && '(Admin)'}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition-all hover:scale-105 disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={exportToCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-orange-600 font-semibold transition-all hover:scale-105"
            >
              <Download size={14} />
              Export
            </button>
            <button
              onClick={() => router.push('/admin/orders/new')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-semibold transition-all hover:scale-105"
            >
              Create
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg shadow p-3 hover:shadow-lg transition-all animate-slide-up" style={{ animationDelay: '0ms' }}>
            <p className="text-xs text-gray-600 flex items-center gap-1">
              <Package size={14} className="text-gray-400" />
              Total
            </p>
            <p className="text-lg sm:text-xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-white rounded-lg shadow p-3 hover:shadow-lg transition-all animate-slide-up" style={{ animationDelay: '50ms' }}>
            <p className="text-xs text-yellow-700 flex items-center gap-1">
              <Clock size={14} className="text-yellow-500" />
              Active
            </p>
            <p className="text-lg sm:text-xl font-bold text-yellow-600 mt-1">{stats.active}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-white rounded-lg shadow p-3 hover:shadow-lg transition-all animate-slide-up" style={{ animationDelay: '100ms' }}>
            <p className="text-xs text-green-700 flex items-center gap-1">
              <CheckCircle size={14} className="text-green-500" />
              Done
            </p>
            <p className="text-lg sm:text-xl font-bold text-green-600 mt-1">{stats.completed}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-white rounded-lg shadow p-3 col-span-2 lg:col-span-1 hover:shadow-lg transition-all animate-slide-up" style={{ animationDelay: '150ms' }}>
            <p className="text-xs text-orange-700 flex items-center gap-1">
              <TrendingUp size={14} className="text-primary" />
              Revenue
            </p>
            <p className="text-lg sm:text-xl font-bold text-primary mt-1">₹{stats.revenue.toFixed(2)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-3 mb-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="grid md:grid-cols-2 gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search orders…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent appearance-none"
              >
                <option value="all">All Statuses</option>
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden animate-fade-in" style={{ animationDelay: '250ms' }}>
          <div className="overflow-x-auto">
            {/* Desktop Table */}
            <table className="w-full hidden lg:table text-sm">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Restaurant</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Updated</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filteredOrders.map((o, index) => (
                  <tr 
                    key={o.id} 
                    className={`hover:bg-orange-50 transition-all animate-fade-in ${
                      deletingOrderId === o.id ? 'opacity-50 bg-red-50' : ''
                    }`}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                   <td className="px-3 py-2">
  <p className="text-sm font-bold text-gray-900">
    #{String(o.order_number ?? '').trim() || o.id.slice(0, 8)}
  </p>
  {o.order_number && (
    <p className="text-xs text-gray-500">ID: {o.id.slice(0, 8)}</p>
  )}
  {o.driver_id && (
    <p className="text-xs text-green-600 flex items-center gap-0.5 mt-0.5">
      <Truck size={10} />
      Driver
    </p>
  )}
</td>

                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        {!o.customer_id && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                            🚶
                          </span>
                        )}
                        <span className="text-sm">{o.customerName || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm">{o.merchants?.business_name || 'N/A'}</td>
                    <td className="px-3 py-2 text-sm font-semibold">₹{Number(o.total_amount || 0).toFixed(2)}</td>
                    <td className="px-3 py-2">{getStatusBadge(o.status)}</td>
                    <td className="px-3 py-2">
                      <div className="text-xs text-gray-900">{formatDate(o.created_at).split(',')[0]}</div>
                      <div className="text-xs text-gray-500">{formatDate(o.created_at).split(',')[1]}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-xs text-gray-900">{formatDate(o.updated_at).split(',')[0]}</div>
                      {o.updated_at && (
                        <div className="text-xs text-blue-600 flex items-center gap-0.5">
                          <Clock size={9} />
                          {getTimeDiff(o.created_at, o.updated_at)} ago
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <button
                          onClick={() => router.push(`/admin/orders/${o.id}`)}
                          disabled={deletingOrderId === o.id}
                          className="inline-flex items-center gap-0.5 px-2 py-1 text-xs text-primary hover:text-orange-600 font-semibold transition-all hover:scale-105 disabled:opacity-50 border border-primary rounded"
                        >
                          <Eye size={12} />
                          View
                        </button>

                        <button
                          onClick={() => notifyAllDrivers(o)}
                          disabled={notifyingOrderId === o.id || deletingOrderId === o.id}
                          className="inline-flex items-center gap-0.5 px-2 py-1 text-xs text-purple-700 hover:text-purple-900 font-semibold disabled:opacity-50 transition-all hover:scale-105 border border-purple-300 rounded"
                        >
                          <Bell size={12} className={notifyingOrderId === o.id ? 'animate-bounce' : ''} />
                          {notifyingOrderId === o.id ? '...' : 'Notify'}
                        </button>

                        <select
                          value={o.status}
                          disabled={updatingOrderId === o.id || deletingOrderId === o.id}
                          onChange={(e) => updateOrderStatus(o, e.target.value)}
                          className="px-2 py-1 text-xs rounded border border-gray-300 hover:border-primary transition-all disabled:opacity-50 font-semibold"
                        >
                          {ALL_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>

                        {isAdmin && (
                          <button
                            onClick={() => deleteOrder(o)}
                            disabled={deletingOrderId === o.id}
                            className="inline-flex items-center gap-0.5 px-2 py-1 text-xs text-red-600 hover:text-red-800 font-semibold disabled:opacity-50 transition-all hover:scale-105 border border-red-300 rounded"
                            title="Delete Order"
                          >
                            <Trash2 size={12} className={deletingOrderId === o.id ? 'animate-spin' : ''} />
                            {deletingOrderId === o.id ? '...' : 'Del'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile/Tablet Cards */}
            <div className="lg:hidden divide-y">
              {filteredOrders.map((o, index) => (
                <div 
                  key={o.id} 
                  className={`p-3 hover:bg-orange-50 transition-all animate-fade-in ${
                    deletingOrderId === o.id ? 'opacity-50 bg-red-50' : ''
                  }`}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
               <div className="flex items-start justify-between gap-2 mb-2">
  <div>
    <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
      #{String(o.order_number ?? '').trim() || o.id.slice(0, 8)}
      {o.order_number && (
        <span className="text-xs text-gray-500 font-normal">({o.id.slice(0, 8)})</span>
      )}
      {o.driver_id && (
        <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold flex items-center gap-0.5">
          <Truck size={9} />
          Driver
        </span>
      )}
    </p>
    <p className="text-xs text-gray-600 mt-0.5">
      {!o.customer_id && '🚶 '}
      {o.customerName || 'Unknown'} • {o.merchants?.business_name || 'N/A'}
    </p>
  </div>
  <div className="text-right">
    <p className="text-sm font-bold text-primary">₹{Number(o.total_amount || 0).toFixed(2)}</p>
    <div className="mt-0.5">{getStatusBadge(o.status)}</div>
  </div>
</div>


                  {/* Timestamps */}
                  <div className="grid grid-cols-2 gap-1.5 mb-2 text-xs">
                    <div className="bg-gray-50 rounded p-1.5">
                      <p className="text-gray-500 font-medium">Created</p>
                      <p className="text-gray-900 font-semibold">{formatDate(o.created_at)}</p>
                    </div>
                    <div className="bg-blue-50 rounded p-1.5">
                      <p className="text-gray-500 font-medium">Updated</p>
                      <p className="text-gray-900 font-semibold">{formatDate(o.updated_at)}</p>
                      {o.updated_at && (
                        <p className="text-blue-600 text-xs flex items-center gap-0.5">
                          <Clock size={9} />
                          {getTimeDiff(o.created_at, o.updated_at)} ago
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => router.push(`/admin/orders/${o.id}`)}
                      disabled={deletingOrderId === o.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-primary text-white font-semibold transition-all hover:scale-105 disabled:opacity-50"
                    >
                      <Eye size={12} />
                      View
                    </button>

                    <button
                      onClick={() => notifyAllDrivers(o)}
                      disabled={notifyingOrderId === o.id || deletingOrderId === o.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-purple-600 text-white font-semibold disabled:opacity-50 transition-all hover:scale-105"
                    >
                      <Bell size={12} className={notifyingOrderId === o.id ? 'animate-bounce' : ''} />
                      {notifyingOrderId === o.id ? 'Notifying' : 'Notify'}
                    </button>

                    <select
                      value={o.status}
                      disabled={updatingOrderId === o.id || deletingOrderId === o.id}
                      onChange={(e) => updateOrderStatus(o, e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 disabled:opacity-50 font-semibold flex-1"
                    >
                      {ALL_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>

                    {isAdmin && (
                      <button
                        onClick={() => deleteOrder(o)}
                        disabled={deletingOrderId === o.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-red-600 text-white font-semibold disabled:opacity-50 transition-all hover:scale-105"
                      >
                        <Trash2 size={12} className={deletingOrderId === o.id ? 'animate-spin' : ''} />
                        {deletingOrderId === o.id ? 'Deleting' : 'Delete'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {filteredOrders.length === 0 && (
            <div className="text-center py-12 animate-fade-in">
              <Package size={40} className="mx-auto text-gray-400 mb-3 animate-bounce" />
              <p className="text-sm text-gray-600">No orders found</p>
            </div>
          )}
        </div>

        {/* Warning Banner */}
        {isAdmin && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 animate-fade-in">
            <AlertTriangle className="text-red-600 shrink-0" size={18} />
            <div className="text-xs text-red-800">
              <p className="font-semibold flex items-center gap-1 mb-1">
                <Shield size={14} />
                Admin Warning
              </p>
              <p>Order deletion is permanent. Use responsibly!</p>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.4s ease-out forwards;
        }

        .animate-slide-up {
          animation: slide-up 0.5s ease-out forwards;
        }
      `}</style>
    </DashboardLayout>
  );
}
