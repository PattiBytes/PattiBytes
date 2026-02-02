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
  Check,
  X,
  Bell,
  User,
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
  delivery_address: string;
  created_at: string;
  preparation_time?: number;
  profiles?: { full_name: string; phone?: string };
}

const MERCHANT_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'assigned', 'picked_up', 'delivered', 'cancelled'];

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
    // ignore
  }

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
    if (String(e?.code) !== '23505') throw e;
  }
}

async function markDriverAssignmentAccepted(orderId: string, driverId: string) {
  const nowIso = new Date().toISOString();

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
    }
  }
}

export default function MerchantOrdersPage() {
  const { user } = useAuth();
  const router = useRouter();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [merchantId, setMerchantId] = useState<string | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driversLoading, setDriversLoading] = useState(false);

  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
  const [notifyingOrderId, setNotifyingOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadMerchantAndOrders();
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
        (o) => o.id.toLowerCase().includes(q) || o.profiles?.full_name?.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [orders, statusFilter, searchQuery]);

  const loadMerchantAndOrders = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (merchantError) throw merchantError;

      setMerchantId(merchant.id);

      const { data, error } = await supabase
        .from('orders')
        .select(
          `
          *,
          profiles:customer_id (
            full_name,
            phone
          )
        `
        )
        .eq('merchant_id', merchant.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders((data || []) as any[]);
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

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      if (!MERCHANT_STATUSES.includes(newStatus)) {
        toast.error('Invalid status');
        return;
      }

      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
      if (error) throw error;

      toast.success(`Order ${newStatus}!`);

      // Notify customer (optional but helpful)
      const order = orders.find((o) => o.id === orderId);
      if (order?.customer_id) {
        await sendDbNotification(
          order.customer_id,
          'Order Status Updated',
          `Your order #${order.id.slice(0, 8)} is now ${newStatus}.`,
          'order',
          { order_id: order.id, status: newStatus }
        );
      }

      await loadMerchantAndOrders();
    } catch (e) {
      console.error('Failed to update order:', e);
      toast.error('Failed to update order status');
    }
  };

  const notifyDriversForOrder = async (order: Order) => {
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

      let sent = 0;
      for (const d of drivers) {
        try {
          await insertDriverAssignment(order.id, d.id);
        } catch {
          // ignore
        }

        const ok = await sendDbNotification(
          d.id,
          'New Delivery Request',
          `Order #${order.id.slice(0, 8)} is ready for pickup.`,
          'delivery',
          { order_id: order.id, merchant_id: order.merchant_id, total_amount: order.total_amount }
        );

        if (ok) sent += 1;
      }

      toast.success(`Notified ${sent} driver(s)`);
    } catch (e: any) {
      console.error('Notify drivers failed:', e);
      toast.error(e?.message || 'Failed to notify drivers');
    } finally {
      setNotifyingOrderId(null);
    }
  };

  const assignDriver = async (order: Order, driverId: string) => {
    if (!order || !driverId) return;

    setAssigningOrderId(order.id);
    try {
      const nowIso = new Date().toISOString();

      const patch: any = {
        driver_id: driverId,
        updated_at: nowIso,
      };

      // When merchant assigns and the order is ready, shift to assigned
      if (order.status === 'ready') {
        patch.status = 'assigned';
      }

      const { error } = await supabase.from('orders').update(patch).eq('id', order.id);
      if (error) throw error;

      await markDriverAssignmentAccepted(order.id, driverId);

      await sendDbNotification(
        driverId,
        'Order Assigned',
        `You have been assigned to deliver order #${order.id.slice(0, 8)}.`,
        'delivery',
        { order_id: order.id, status: patch.status ?? order.status }
      );

      await sendDbNotification(
        order.customer_id,
        'Driver Assigned',
        `A delivery partner has been assigned to your order #${order.id.slice(0, 8)}.`,
        'order',
        { order_id: order.id, driver_id: driverId }
      );

      toast.success('Driver assigned');
      await loadMerchantAndOrders();
    } catch (e: any) {
      console.error('Assign driver failed:', e);
      toast.error(e?.message || 'Failed to assign driver');
    } finally {
      setAssigningOrderId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: any = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'New Order' },
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

  if (loading) return <PageLoadingSpinner />;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Orders</h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Track orders, move statuses, and request/assign a driver.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={loadMerchantAndOrders}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 font-semibold"
            >
              <Clock size={16} />
              Refresh
            </button>

            <button
              onClick={loadAvailableDrivers}
              disabled={driversLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white font-semibold disabled:opacity-50"
            >
              <User size={16} />
              {driversLoading ? 'Loading…' : `Drivers (${drivers.length})`}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6 mb-6">
          <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search orders..."
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
                <option value="all">All Orders</option>
                <option value="pending">New Orders</option>
                <option value="confirmed">Confirmed</option>
                <option value="preparing">Preparing</option>
                <option value="ready">Ready</option>
                <option value="assigned">Assigned</option>
                <option value="picked_up">Picked up</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center">
            <Package size={56} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No orders found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl shadow-md p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900">
                        {order.profiles?.full_name || 'Customer'}
                      </h3>
                      {getStatusBadge(order.status)}
                    </div>

                    <p className="text-xs sm:text-sm text-gray-600">Order #{order.id.slice(0, 8)}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(order.created_at).toLocaleString()}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Driver: {order.driver_id ? order.driver_id.slice(0, 8) : 'Not assigned'}
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-xl sm:text-2xl font-bold text-primary">
                      ₹{Number(order.total_amount || 0).toFixed(2)}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600">{order.items?.length || 0} items</p>
                  </div>
                </div>

                <div className="border-t pt-4 mb-4">
                  <p className="font-semibold mb-2">Items:</p>
                  <div className="space-y-1">
                    {order.items?.slice(0, 4)?.map((item: any, idx: number) => (
                      <p key={idx} className="text-sm text-gray-700">
                        {item?.name || 'Item'} × {item?.quantity || 1}
                      </p>
                    ))}
                    {order.items?.length > 4 && <p className="text-xs text-gray-500">+ more…</p>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  {order.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateOrderStatus(order.id, 'confirmed')}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700"
                      >
                        <Check size={16} />
                        Accept
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to reject this order?')) {
                            updateOrderStatus(order.id, 'cancelled');
                          }
                        }}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700"
                      >
                        <X size={16} />
                        Reject
                      </button>
                    </div>
                  )}

                  {order.status === 'confirmed' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'preparing')}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700"
                    >
                      <ChefHat size={16} />
                      Start preparing
                    </button>
                  )}

                  {order.status === 'preparing' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'ready')}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700"
                    >
                      <Package size={16} />
                      Mark ready
                    </button>
                  )}

                  {/* Driver controls when ready & not assigned */}
                  {order.status === 'ready' && !order.driver_id && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => notifyDriversForOrder(order)}
                        disabled={notifyingOrderId === order.id}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 disabled:opacity-50"
                      >
                        <Bell size={16} />
                        {notifyingOrderId === order.id ? 'Notifying…' : 'Notify all drivers'}
                      </button>

                      <select
                        className="px-3 py-2 rounded-xl border border-gray-300"
                        defaultValue=""
                        onChange={(e) => {
                          const id = e.target.value;
                          if (!id) return;
                          assignDriver(order, id);
                          e.currentTarget.value = '';
                        }}
                        disabled={assigningOrderId === order.id || driversLoading}
                      >
                        <option value="">Assign driver…</option>
                        {drivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {(d.full_name || d.fullname || 'Driver') + (d.phone ? ` - ${d.phone}` : '')}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    onClick={() => router.push(`/merchant/orders/${order.id}`)}
                    className="sm:ml-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-semibold hover:bg-orange-600"
                  >
                    <Eye size={16} />
                    View details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
