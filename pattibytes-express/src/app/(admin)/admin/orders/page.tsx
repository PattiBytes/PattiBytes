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
  DollarSign,
  RefreshCw,
  Download,
  Bell,
  User,
  X,
  Check,
} from 'lucide-react';
import { PageLoadingSpinner } from '@/components/common/LoadingSpinner';
import { toast } from 'react-toastify';

type Driver = {
  id: string;
  full_name?: string | null;
  fullname?: string | null;
  phone?: string | null;
  is_active?: boolean | null;
  isactive?: boolean | null;
  approval_status?: string | null;
  approvalstatus?: string | null;
  role?: string | null;
};

interface Order {
  id: string;
  customer_id: string;
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
  profiles?: { full_name: string };
  merchants?: { business_name: string };
}

const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'assigned', 'picked_up'];
const ALL_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'assigned', 'picked_up', 'delivered', 'cancelled'];

function safeLower(v: any) {
  return String(v ?? '').toLowerCase();
}

async function sendDbNotification(
  userId: string,
  title: string,
  message: string,
  type: string,
  data?: any
): Promise<boolean> {
  // New schema first: user_id / is_read / created_at
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
    });
    if (!error) return true;
  } catch {
    // ignore -> fallback
  }

  // Legacy schema fallback: userid / isread / createdat
  try {
    const { error } = await supabase.from('notifications').insert({
      userid: userId,
      title,
      message,
      body: message,
      type,
      data: data ?? null,
      isread: false,
      createdat: new Date().toISOString(),
    } as any);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('sendDbNotification failed:', e);
    return false;
  }
}

async function insertDriverAssignment(orderId: string, driverId: string) {
  const nowIso = new Date().toISOString();

  // Your repo uses driverassignments in multiple places, but we also try driver_assignments just in case.
  try {
    const { error } = await supabase.from('driverassignments').insert({
      orderid: orderId,
      driverid: driverId,
      status: 'pending',
      assignedat: nowIso,
    } as any);
    if (!error) return;
    if ((error as any)?.code !== '23505') throw error;
  } catch (e: any) {
    // If table missing, try snake name
    if (String(e?.code).toUpperCase() === '42P01') {
      const { error } = await supabase.from('driver_assignments').insert({
        order_id: orderId,
        driver_id: driverId,
        status: 'pending',
        assigned_at: nowIso,
      } as any);
      if (error && (error as any)?.code !== '23505') throw error;
      return;
    }
    // ignore duplicate, otherwise rethrow
    if (String(e?.code) !== '23505') throw e;
  }
}

async function markDriverAssignmentAccepted(orderId: string, driverId: string) {
  const nowIso = new Date().toISOString();

  // Prefer driverassignments
  try {
    const { error } = await supabase
      .from('driverassignments')
      .update({ status: 'accepted', respondedat: nowIso } as any)
      .eq('orderid', orderId)
      .eq('driverid', driverId);

    if (!error) return;
    throw error;
  } catch (e: any) {
    if (String(e?.code).toUpperCase() === '42P01') {
      await supabase
        .from('driver_assignments')
        .update({ status: 'accepted', responded_at: nowIso } as any)
        .eq('order_id', orderId)
        .eq('driver_id', driverId);
      return;
    }
    // else ignore (non-fatal)
  }
}

export default function AdminOrdersPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driversLoading, setDriversLoading] = useState(false);

  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, revenue: 0 });

  // Assign modal
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignOrder, setAssignOrder] = useState<Order | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);

  // Notify all drivers (per-order)
  const [notifyingOrderId, setNotifyingOrderId] = useState<string | null>(null);

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

    if (statusFilter !== 'all') {
      filtered = filtered.filter((o) => o.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.profiles?.full_name?.toLowerCase().includes(q) ||
          o.merchants?.business_name?.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [orders, statusFilter, searchQuery]);

  const loadOrders = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('orders')
        .select(
          `
          *,
          profiles:customer_id (full_name),
          merchants:merchant_id (business_name)
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = (data || []) as any[];
      setOrders(rows);

      const total = rows.length;
      const active = rows.filter((o) => ACTIVE_STATUSES.includes(String(o.status))).length;
      const completed = rows.filter((o) => String(o.status) === 'delivered').length;
      const revenue = rows.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

      setStats({ total, active, completed, revenue });
    } catch (e) {
      console.error('Failed to load orders:', e);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableDrivers = async () => {
    try {
      setDriversLoading(true);

      // Try a superset select; filter client-side to tolerate schema variations.
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, fullname, phone, role, is_active, isactive, approval_status, approvalstatus');

      if (error) throw error;

      const list = (data || []) as Driver[];
      const filtered = list.filter((d) => {
        const roleOk = safeLower(d.role) === 'driver';
        const approved = safeLower(d.approval_status ?? d.approvalstatus) === 'approved' || safeLower(d.approval_status ?? d.approvalstatus) === '';
        const active =
          typeof d.is_active === 'boolean'
            ? d.is_active
            : typeof d.isactive === 'boolean'
              ? d.isactive
              : true;

        return roleOk && approved && active;
      });

      setDrivers(filtered);
    } catch (e) {
      console.error('Failed to load drivers:', e);
      toast.error('Failed to load drivers');
      setDrivers([]);
    } finally {
      setDriversLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Order ID', 'Customer', 'Restaurant', 'Amount', 'Status', 'Payment', 'Date'];
    const csvData = filteredOrders.map((order) => [
      order.id,
      order.profiles?.full_name || 'N/A',
      order.merchants?.business_name || 'N/A',
      order.total_amount,
      order.status,
      order.payment_status,
      new Date(order.created_at).toLocaleString(),
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

  const getStatusBadge = (status: string) => {
    const statusConfig: any = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
      confirmed: { color: 'bg-blue-100 text-blue-800', icon: ChefHat, label: 'Confirmed' },
      preparing: { color: 'bg-purple-100 text-purple-800', icon: ChefHat, label: 'Preparing' },
      ready: { color: 'bg-orange-100 text-orange-800', icon: Package, label: 'Ready' },
      assigned: { color: 'bg-indigo-100 text-indigo-800', icon: Truck, label: 'Assigned' },
      picked_up: { color: 'bg-indigo-100 text-indigo-800', icon: Truck, label: 'Picked up' },
      delivered: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Delivered' },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Cancelled' },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        <Icon size={14} />
        {config.label}
      </span>
    );
  };

  const openAssign = async (order: Order) => {
    setAssignOrder(order);
    setSelectedDriverId('');
    setAssignOpen(true);

    // Load drivers lazily
    if (drivers.length === 0) {
      await loadAvailableDrivers();
    }
  };

  const closeAssign = () => {
    setAssignOpen(false);
    setAssignOrder(null);
    setSelectedDriverId('');
  };

  const assignDriver = async () => {
    if (!assignOrder) return;
    if (!selectedDriverId) {
      toast.error('Please select a driver');
      return;
    }

    setAssigning(true);
    try {
      const nowIso = new Date().toISOString();

      const patch: any = {
        driver_id: selectedDriverId,
        updated_at: nowIso,
      };

      // If the order is ready, we move it to assigned (keeps your flow clean).
      if (assignOrder.status === 'ready') {
        patch.status = 'assigned';
      }

      const { error } = await supabase.from('orders').update(patch).eq('id', assignOrder.id);
      if (error) throw error;

      await markDriverAssignmentAccepted(assignOrder.id, selectedDriverId);

      // Notify driver + customer
      await sendDbNotification(
        selectedDriverId,
        'Order Assigned',
        `You have been assigned to deliver order #${assignOrder.id.slice(0, 8)}.`,
        'delivery',
        { order_id: assignOrder.id, status: patch.status ?? assignOrder.status }
      );

      await sendDbNotification(
        assignOrder.customer_id,
        'Driver Assigned',
        `A delivery partner has been assigned to your order #${assignOrder.id.slice(0, 8)}.`,
        'order',
        { order_id: assignOrder.id, driver_id: selectedDriverId }
      );

      toast.success('Driver assigned');
      closeAssign();
      await loadOrders();
    } catch (e: any) {
      console.error('Assign driver failed:', e);
      toast.error(e?.message || 'Failed to assign driver');
    } finally {
      setAssigning(false);
    }
  };

  const notifyAllDrivers = async (order: Order) => {
    if (!order) return;

    setNotifyingOrderId(order.id);
    try {
      if (drivers.length === 0) {
        await loadAvailableDrivers();
      }

      if (drivers.length === 0) {
        toast.warning('No available drivers found');
        return;
      }

      // Create pending assignments and notify
      let sent = 0;
      for (const d of drivers) {
        try {
          await insertDriverAssignment(order.id, d.id);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
          // non-fatal
        }

        const ok = await sendDbNotification(
          d.id,
          'New Delivery Request',
          `Order #${order.id.slice(0, 8)} is ready for pickup.`,
          'delivery',
          {
            order_id: order.id,
            merchant_id: order.merchant_id,
            customer_id: order.customer_id,
            total_amount: order.total_amount,
            status: order.status,
          }
        );
        if (ok) sent += 1;
      }

      toast.success(`Notified ${sent} driver(s)`);
    } catch (e: any) {
      console.error('Notify all drivers failed:', e);
      toast.error(e?.message || 'Failed to notify drivers');
    } finally {
      setNotifyingOrderId(null);
    }
  };

  if (loading) return <PageLoadingSpinner />;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">All Orders</h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Manage orders, notify drivers, and assign a driver when needed.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={loadOrders}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 font-semibold transition-colors"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button
              onClick={exportToCSV}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 font-semibold transition-colors"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Total Orders</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Package className="text-primary" size={34} />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Active Orders</p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.active}</p>
              </div>
              <Clock className="text-yellow-600" size={34} />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Completed</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="text-green-600" size={34} />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6 col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">Total Revenue</p>
                <p className="text-xl sm:text-2xl font-bold text-primary truncate">
                  ₹{stats.revenue.toFixed(2)}
                </p>
              </div>
              <DollarSign className="text-primary" size={34} />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6 mb-6">
          <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by order id, customer, restaurant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent appearance-none"
              >
                <option value="all">All statuses</option>
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Restaurant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      #{order.id.slice(0, 8)}
                      {order.driver_id ? (
                        <div className="text-xs text-gray-500 font-medium mt-1">Driver: {order.driver_id.slice(0, 8)}</div>
                      ) : (
                        <div className="text-xs text-gray-500 font-medium mt-1">Driver: Not assigned</div>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {order.profiles?.full_name || 'N/A'}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {order.merchants?.business_name || 'N/A'}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      ₹{Number(order.total_amount || 0).toFixed(2)}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(order.status)}</td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => router.push(`/admin/orders/${order.id}`)}
                          className="inline-flex items-center gap-1 text-primary hover:text-orange-600 font-semibold"
                        >
                          <Eye size={16} />
                          View
                        </button>

                        <button
                          onClick={() => openAssign(order)}
                          className="inline-flex items-center gap-1 text-gray-900 hover:text-gray-700 font-semibold"
                        >
                          <User size={16} />
                          Assign
                        </button>

                        <button
                          onClick={() => notifyAllDrivers(order)}
                          disabled={notifyingOrderId === order.id}
                          className="inline-flex items-center gap-1 text-purple-700 hover:text-purple-900 font-semibold disabled:opacity-50"
                        >
                          <Bell size={16} />
                          {notifyingOrderId === order.id ? 'Notifying…' : 'Notify drivers'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <Package size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No orders found</p>
            </div>
          )}
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-md p-10 text-center">
              <Package size={48} className="mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600">No orders found</p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl shadow-md p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900">#{order.id.slice(0, 8)}</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {order.profiles?.full_name || 'N/A'} • {order.merchants?.business_name || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(order.created_at).toLocaleString()}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-base font-bold text-primary">₹{Number(order.total_amount || 0).toFixed(2)}</p>
                    <div className="mt-1">{getStatusBadge(order.status)}</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => router.push(`/admin/orders/${order.id}`)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-white font-semibold"
                  >
                    <Eye size={16} />
                    View
                  </button>

                  <button
                    onClick={() => openAssign(order)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 text-white font-semibold"
                  >
                    <User size={16} />
                    Assign
                  </button>

                  <button
                    onClick={() => notifyAllDrivers(order)}
                    disabled={notifyingOrderId === order.id}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-600 text-white font-semibold disabled:opacity-50"
                  >
                    <Bell size={16} />
                    {notifyingOrderId === order.id ? 'Notifying…' : 'Notify'}
                  </button>
                </div>

                <div className="mt-2 text-xs text-gray-600">
                  Driver: {order.driver_id ? order.driver_id.slice(0, 8) : 'Not assigned'}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Assign modal */}
        {assignOpen && (
          <>
            <div className="fixed inset-0 bg-black/40 z-40" onClick={closeAssign} />
            <div className="fixed z-50 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto bottom-3 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:w-[520px] bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-bold text-gray-900">Assign driver</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Order #{assignOrder?.id.slice(0, 8)} • Status: {assignOrder?.status}
                  </p>
                </div>
                <button onClick={closeAssign} className="p-2 rounded-xl hover:bg-gray-100">
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 space-y-3">
                <button
                  onClick={loadAvailableDrivers}
                  disabled={driversLoading}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 font-semibold disabled:opacity-50"
                >
                  <RefreshCw size={16} />
                  {driversLoading ? 'Loading drivers…' : `Reload drivers (${drivers.length})`}
                </button>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Select driver</label>
                  <select
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300"
                  >
                    <option value="">Choose a driver</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {(d.full_name || d.fullname || 'Driver') + (d.phone ? ` - ${d.phone}` : '')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={closeAssign}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-200 text-gray-900 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={assignDriver}
                    disabled={assigning || !selectedDriverId}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-white font-semibold disabled:opacity-50"
                  >
                    <Check size={18} />
                    {assigning ? 'Assigning…' : 'Assign'}
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
