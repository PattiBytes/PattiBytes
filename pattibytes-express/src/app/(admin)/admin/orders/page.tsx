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
} from 'lucide-react';
import { PageLoadingSpinner } from '@/components/common/LoadingSpinner';
import { toast } from 'react-toastify';

type DriverProfileRow = { user_id: string; is_available: boolean | null; is_verified: boolean | null; profile_completed: boolean | null };
type DriverRow = { id: string; full_name: string | null; phone: string | null };

interface Order {
  id: string;
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
  customer_notes?: string | null;
  customer_phone?: string | null;
  profiles?: { full_name: string | null };
  merchants?: { business_name: string | null };
  customerName?: string; // ✅ Processed name
}

const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'assigned', 'picked_up'];

// ✅ FIXED: Handle null user_id for walk-in orders
async function sendDbNotification(userId: string | null, title: string, message: string, type: string, data?: any) {
  // Skip if no user_id (walk-in orders)
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
  const [driversLoading, setDriversLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, revenue: 0 });

  const [notifyingOrderId, setNotifyingOrderId] = useState<string | null>(null);
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);

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
          customer_notes,
          customer_phone,
          profiles:customer_id (full_name),
          merchants:merchant_id (business_name)
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = (data || []) as any[];

      // ✅ FIXED: Process customer names for walk-in orders
      const processedOrders = rows.map((order) => {
        let customerName = 'Unknown';

        if (!order.customer_id) {
          // Walk-in order - extract name from customer_notes
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
          // Regular customer with profile
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
    setDriversLoading(true);
    try {
      const list = await loadAvailableDriversStrict();
      setDrivers(list);
    } catch (e: any) {
      console.error('Failed to load drivers:', e);
      toast.error('Failed to load drivers');
      setDrivers([]);
    } finally {
      setDriversLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Order ID', 'Customer', 'Restaurant', 'Amount', 'Status', 'Payment', 'Date'];
    const csvData = filteredOrders.map((o) => [
      o.id,
      o.customerName || 'N/A',
      o.merchants?.business_name || 'N/A',
      o.total_amount,
      o.status,
      o.payment_status,
      new Date(o.created_at).toLocaleString(),
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

  const assignDriver = async (order: Order, driverId: string) => {
    if (!driverId) return;

    setAssigningOrderId(order.id);
    try {
      const nowIso = new Date().toISOString();

      const patch: any = { driver_id: driverId, updated_at: nowIso };
      if (order.status === 'ready') patch.status = 'assigned';

      const { error } = await supabase.from('orders').update(patch).eq('id', order.id);
      if (error) throw error;

      await supabase
        .from('driver_assignments')
        .update({ status: 'accepted', responded_at: nowIso } as any)
        .eq('order_id', order.id)
        .eq('driver_id', driverId);

      // ✅ Always notify driver
      await sendDbNotification(driverId, 'Order Assigned', `You are assigned for order #${order.id.slice(0, 8)}.`, 'delivery', {
        order_id: order.id,
      });

      // ✅ Only notify customer if they have user_id
      if (order.customer_id) {
        await sendDbNotification(order.customer_id, 'Driver Assigned', `A driver has been assigned to your order #${order.id.slice(0, 8)}.`, 'order', {
          order_id: order.id,
          driver_id: driverId,
        });
      } else {
        console.log('⚠️ Walk-in order - skipping customer notification');
      }

      toast.success('Driver assigned');
      await loadOrders();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to assign driver');
    } finally {
      setAssigningOrderId(null);
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
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${cfg.color} transition-all`}>
        <Icon size={14} />
        {status}
      </span>
    );
  };

  if (loading) return <PageLoadingSpinner />;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6">
        {/* ✅ Animated Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 animate-fade-in">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Zap className="text-primary animate-pulse" size={32} />
              All Orders
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Assign a driver or notify available drivers.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 font-semibold transition-all hover:scale-105 disabled:opacity-50"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={exportToCSV}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-orange-600 font-semibold transition-all hover:scale-105 hover:shadow-lg"
            >
              <Download size={16} />
              Export CSV
            </button>
            <button
              onClick={() => router.push('/admin/orders/new')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 font-semibold transition-all hover:scale-105 hover:shadow-lg"
            >
              Create Order
            </button>
          </div>
        </div>

        {/* ✅ Animated Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6">
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-md p-4 sm:p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 animate-slide-up" style={{ animationDelay: '0ms' }}>
            <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-2">
              <Package size={16} className="text-gray-400" />
              Total Orders
            </p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">{stats.total}</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-white rounded-2xl shadow-md p-4 sm:p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <p className="text-xs sm:text-sm text-yellow-700 flex items-center gap-2">
              <Clock size={16} className="text-yellow-500" />
              Active Orders
            </p>
            <p className="text-xl sm:text-2xl font-bold text-yellow-600 mt-2">{stats.active}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-white rounded-2xl shadow-md p-4 sm:p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <p className="text-xs sm:text-sm text-green-700 flex items-center gap-2">
              <CheckCircle size={16} className="text-green-500" />
              Completed
            </p>
            <p className="text-xl sm:text-2xl font-bold text-green-600 mt-2">{stats.completed}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-white rounded-2xl shadow-md p-4 sm:p-6 col-span-2 lg:col-span-1 hover:shadow-xl transition-all duration-300 hover:scale-105 animate-slide-up" style={{ animationDelay: '300ms' }}>
            <p className="text-xs sm:text-sm text-orange-700 flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              Total Revenue
            </p>
            <p className="text-xl sm:text-2xl font-bold text-primary mt-2">₹{stats.revenue.toFixed(2)}</p>
          </div>
        </div>

        {/* ✅ Animated Filters */}
        <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6 mb-6 animate-fade-in" style={{ animationDelay: '400ms' }}>
          <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Search orders…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent appearance-none transition-all"
              >
                <option value="all">All</option>
                <option value="pending">pending</option>
                <option value="confirmed">confirmed</option>
                <option value="preparing">preparing</option>
                <option value="ready">ready</option>
                <option value="assigned">assigned</option>
                <option value="picked_up">picked_up</option>
                <option value="delivered">delivered</option>
                <option value="cancelled">cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* ✅ Animated Orders Table */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden animate-fade-in" style={{ animationDelay: '500ms' }}>
          <div className="overflow-x-auto">
            <table className="w-full hidden md:table">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restaurant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filteredOrders.map((o, index) => (
                  <tr key={o.id} className="hover:bg-orange-50 transition-all duration-200 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">#{o.id.slice(0, 8)}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        {!o.customer_id && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold animate-pulse">
                            🚶
                          </span>
                        )}
                        <span>{o.customerName || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{o.merchants?.business_name || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">₹{Number(o.total_amount || 0).toFixed(2)}</td>
                    <td className="px-6 py-4">{getStatusBadge(o.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => router.push(`/admin/orders/${o.id}`)}
                          className="inline-flex items-center gap-1 text-primary hover:text-orange-600 font-semibold transition-all hover:scale-110"
                        >
                          <Eye size={16} />
                          View
                        </button>

                        <button
                          onClick={() => notifyAllDrivers(o)}
                          disabled={notifyingOrderId === o.id}
                          className="inline-flex items-center gap-1 text-purple-700 hover:text-purple-900 font-semibold disabled:opacity-50 transition-all hover:scale-110"
                        >
                          <Bell size={16} className={notifyingOrderId === o.id ? 'animate-bounce' : ''} />
                          {notifyingOrderId === o.id ? 'Notifying…' : 'Notify'}
                        </button>

                        <select
                          defaultValue=""
                          disabled={assigningOrderId === o.id || driversLoading}
                          onChange={(e) => {
                            const id = e.target.value;
                            if (!id) return;
                            assignDriver(o, id);
                            e.currentTarget.value = '';
                          }}
                          className="px-3 py-2 rounded-xl border border-gray-300 hover:border-primary transition-all"
                        >
                          <option value="">Assign…</option>
                          {drivers.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.full_name || 'Driver'} {d.phone ? `- ${d.phone}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ✅ Animated Mobile cards */}
            <div className="md:hidden divide-y">
              {filteredOrders.map((o, index) => (
                <div key={o.id} className="p-4 hover:bg-orange-50 transition-all duration-200 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-900">#{o.id.slice(0, 8)}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {!o.customer_id && '🚶 '}
                        {o.customerName || 'Unknown'} • {o.merchants?.business_name || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">₹{Number(o.total_amount || 0).toFixed(2)}</p>
                      <div className="mt-1">{getStatusBadge(o.status)}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => router.push(`/admin/orders/${o.id}`)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-white font-semibold transition-all hover:scale-105 hover:shadow-lg"
                    >
                      <Eye size={16} />
                      View
                    </button>

                    <button
                      onClick={() => notifyAllDrivers(o)}
                      disabled={notifyingOrderId === o.id}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-600 text-white font-semibold disabled:opacity-50 transition-all hover:scale-105 hover:shadow-lg"
                    >
                      <Bell size={16} className={notifyingOrderId === o.id ? 'animate-bounce' : ''} />
                      {notifyingOrderId === o.id ? 'Notifying…' : 'Notify'}
                    </button>

                    <select
                      defaultValue=""
                      disabled={assigningOrderId === o.id || driversLoading}
                      onChange={(e) => {
                        const id = e.target.value;
                        if (!id) return;
                        assignDriver(o, id);
                        e.currentTarget.value = '';
                      }}
                      className="px-3 py-2 rounded-xl border border-gray-300 transition-all"
                    >
                      <option value="">Assign…</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.full_name || 'Driver'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {filteredOrders.length === 0 && (
            <div className="text-center py-12 animate-fade-in">
              <Package size={48} className="mx-auto text-gray-400 mb-4 animate-bounce" />
              <p className="text-gray-600">No orders found</p>
            </div>
          )}
        </div>
      </div>

      {/* ✅ Add Custom CSS for Animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }

        .animate-slide-up {
          animation: slide-up 0.6s ease-out forwards;
        }
      `}</style>
    </DashboardLayout>
  );
}
