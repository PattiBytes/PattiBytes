/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import {
  Package,
  Clock,
  CheckCircle,
  TrendingUp,
  MapPin,
  Phone,
  Store,
  RefreshCcw,
  AlertCircle,
  Truck,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { logger } from '@/lib/logger';

type Merchant = {
  id: string;
  business_name?: string | null;
  address?: string | null;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type Customer = {
  id: string;
  full_name?: string | null;
  phone?: string | null;
};

type Order = {
  id: string;
  order_number: number | null;
  status: string | null;
  customer_id: string | null;
  merchant_id: string | null;
  driver_id: string | null;

  subtotal: number | null;
  delivery_fee: number | null;
  tax: number | null;
  discount: number | null;
  total_amount: number | null;

  payment_method: string | null;
  payment_status: string | null;

  delivery_address: string | null;
  customer_phone: string | null;
  delivery_distance_km: number | null;

  delivery_latitude?: number | null;
  delivery_longitude?: number | null;

  created_at: string;
  updated_at: string | null;
  actual_delivery_time: string | null;

  merchant?: Merchant | null;
  customer?: Customer | null;
};

type DriverAssignment = {
  id: string;
  order_id: string;
  driver_id: string;
  status: string;
  assigned_at: string;
  responded_at: string | null;
  order?: Order | null;
};

const COMMISSION = 0.1;

// Public pool status (your db sample shows "ready")
const POOL_STATUS = 'ready';

// Driver active statuses
const ACTIVE_STATUSES = ['assigned', 'picked_up', 'on_the_way', 'out_for_delivery'];

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function fmtMoney(n: any) {
  return `₹${Number(n || 0).toFixed(2)}`;
}

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return iso;
  }
}

function mapsLink(lat?: number | null, lng?: number | null) {
  if (!lat || !lng) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export default function DriverDashboardPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);

  const [pendingRequests, setPendingRequests] = useState<DriverAssignment[]>([]);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);

  const [stats, setStats] = useState({
    available: 0,
    inProgress: 0,
    completed: 0,
    earnings: 0,
  });

  const [busyAccept, setBusyAccept] = useState<string | null>(null);
  const [busyUpdate, setBusyUpdate] = useState(false);

  const canWork = useMemo(() => !!user?.id, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    loadAll();

    // 5s fallback refresh
    const t = setInterval(() => {
      loadAll(false);
    }, 5000);

    // realtime
    const chOrders = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadAll(false))
      .subscribe();

    const chAssign = supabase
      .channel(`assignments-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'driver_assignments', filter: `driver_id=eq.${user.id}` },
        () => loadAll(false)
      )
      .subscribe();

    return () => {
      clearInterval(t);
      supabase.removeChannel(chOrders);
      supabase.removeChannel(chAssign);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadAll = async (showLoader = true) => {
    if (!user?.id) return;
    if (showLoader) setLoading(true);

    try {
      // 1) pending assignments for this driver
      const { data: assignments, error: asgErr } = await supabase
        .from('driver_assignments')
        .select('id,order_id,driver_id,status,assigned_at,responded_at')
        .eq('driver_id', user.id)
        .eq('status', 'pending')
        .order('assigned_at', { ascending: false })
        .limit(20);

      if (asgErr) logger.error('assignments load failed', asgErr);

      // 2) public pool orders visible to all drivers
      const { data: pool, error: poolErr } = await supabase
        .from('orders')
        .select(
          'id,order_number,status,customer_id,merchant_id,driver_id,total_amount,delivery_address,customer_phone,delivery_distance_km,delivery_latitude,delivery_longitude,created_at'
        )
        .eq('status', POOL_STATUS)
        .is('driver_id', null)
        .order('created_at', { ascending: true })
        .limit(30);

      if (poolErr) logger.error('pool load failed', poolErr);

      // 3) current active order for this driver
      const { data: current, error: curErr } = await supabase
        .from('orders')
        .select(
          'id,order_number,status,customer_id,merchant_id,driver_id,subtotal,delivery_fee,tax,discount,total_amount,payment_method,payment_status,delivery_address,customer_phone,delivery_distance_km,delivery_latitude,delivery_longitude,created_at,updated_at,actual_delivery_time'
        )
        .eq('driver_id', user.id)
        .in('status', ACTIVE_STATUSES as any)
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (curErr && curErr.code !== 'PGRST116') logger.error('current load failed', curErr);

      // 4) analytics (completed today) - use actual_delivery_time if you set it on delivered
      const { data: completedToday, error: compErr } = await supabase
        .from('orders')
        .select('total_amount,actual_delivery_time,created_at')
        .eq('driver_id', user.id)
        .eq('status', 'delivered')
        .gte('actual_delivery_time', startOfTodayISO());

      if (compErr) logger.error('completed load failed', compErr);

      // 5) bulk fetch merchants + customers for ALL ids involved
      const allOrders = [...(pool || []), ...(current ? [current] : [])] as any[];
      const merchantIds = Array.from(new Set(allOrders.map((o) => o.merchant_id).filter(Boolean))) as string[];
      const customerIds = Array.from(new Set(allOrders.map((o) => o.customer_id).filter(Boolean))) as string[];

      const [merRes, cusRes] = await Promise.all([
        merchantIds.length
          ? supabase.from('merchants').select('id,business_name,address,phone,latitude,longitude').in('id', merchantIds)
          : Promise.resolve({ data: [], error: null } as any),
        customerIds.length
          ? supabase.from('profiles').select('id,full_name,phone').in('id', customerIds)
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      const merMap = new Map<string, Merchant>(((merRes.data as any[]) || []).map((m) => [m.id, m]));
      const cusMap = new Map<string, Customer>(((cusRes.data as any[]) || []).map((c) => [c.id, c]));

      const poolWith: Order[] = (pool || []).map((o: any) => ({
        ...(o as Order),
        merchant: o.merchant_id ? merMap.get(o.merchant_id) || null : null,
        customer: o.customer_id ? cusMap.get(o.customer_id) || null : null,
      }));

      const currentWith: Order | null = current
        ? ({
            ...(current as any),
            merchant: (current as any).merchant_id ? merMap.get((current as any).merchant_id) || null : null,
            customer: (current as any).customer_id ? cusMap.get((current as any).customer_id) || null : null,
          } as Order)
        : null;

      // attach order details to assignments (optional)
      const orderIds = Array.from(new Set((assignments || []).map((a: any) => a.order_id)));
      let assignmentOrders: any[] = [];
      if (orderIds.length) {
        const { data: aOrders } = await supabase
          .from('orders')
          .select(
            'id,order_number,status,customer_id,merchant_id,driver_id,total_amount,delivery_address,customer_phone,delivery_distance_km,delivery_latitude,delivery_longitude,created_at'
          )
          .in('id', orderIds as any);
        assignmentOrders = aOrders || [];
      }
      const orderMap = new Map<string, Order>(assignmentOrders.map((o: any) => [o.id, o]));
      const enrichedAssignments: DriverAssignment[] = (assignments || []).map((a: any) => {
        const o = orderMap.get(a.order_id) || null;
        const oo = o
          ? ({
              ...o,
              merchant: o.merchant_id ? merMap.get(o.merchant_id) || null : null,
              customer: o.customer_id ? cusMap.get(o.customer_id) || null : null,
            } as any)
          : null;
        return { ...a, order: oo };
      });

      const earnings =
        (completedToday || []).reduce((sum: number, r: any) => sum + Number(r.total_amount || 0) * COMMISSION, 0) || 0;

      setPendingRequests(enrichedAssignments);
      setAvailableOrders(poolWith);
      setCurrentOrder(currentWith);

      setStats({
        available: poolWith.length,
        inProgress: currentWith ? 1 : 0,
        completed: completedToday?.length || 0,
        earnings,
      });
    } catch (e: any) {
      logger.error('driver loadAll failed', e);
      toast.error(e?.message || 'Failed to load driver dashboard');
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const acceptFromPool = async (orderId: string) => {
    if (!user?.id) return;
    setBusyAccept(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ driver_id: user.id, status: 'assigned', updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('status', POOL_STATUS)
        .is('driver_id', null);

      if (error) throw error;
      toast.success('Order accepted');
      await loadAll(false);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to accept (maybe already taken)');
    } finally {
      setBusyAccept(null);
    }
  };

  const acceptAssignment = async (assignmentId: string, orderId: string) => {
    if (!user?.id) return;
    setBusyAccept(assignmentId);
    try {
      const { error: aErr } = await supabase
        .from('driver_assignments')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', assignmentId)
        .eq('driver_id', user.id)
        .eq('status', 'pending');

      if (aErr) throw aErr;

      const { error: oErr } = await supabase
        .from('orders')
        .update({ driver_id: user.id, status: 'assigned', updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (oErr) throw oErr;

      toast.success('Assignment accepted');
      await loadAll(false);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to accept assignment');
    } finally {
      setBusyAccept(null);
    }
  };

  const rejectAssignment = async (assignmentId: string) => {
    if (!user?.id) return;
    setBusyAccept(assignmentId);
    try {
      const { error } = await supabase
        .from('driver_assignments')
        .update({ status: 'rejected', responded_at: new Date().toISOString() })
        .eq('id', assignmentId)
        .eq('driver_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;

      toast.success('Assignment rejected');
      await loadAll(false);
    } catch (e: any) {
      toast.error((e as any)?.message || 'Failed to reject');
    } finally {
      setBusyAccept(null);
    }
  };

  const markPickedUp = async () => {
    if (!user?.id || !currentOrder?.id) return;
    setBusyUpdate(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'picked_up', updated_at: new Date().toISOString() })
        .eq('id', currentOrder.id)
        .eq('driver_id', user.id);
      if (error) throw error;
      toast.success('Picked up');
      await loadAll(false);
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally {
      setBusyUpdate(false);
    }
  };

  const markDelivered = async () => {
    if (!user?.id || !currentOrder?.id) return;
    setBusyUpdate(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'delivered',
          payment_status: 'paid',
          actual_delivery_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentOrder.id)
        .eq('driver_id', user.id);
      if (error) throw error;
      toast.success('Delivered');
      await loadAll(false);
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally {
      setBusyUpdate(false);
    }
  };

  if (!canWork) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <AlertCircle className="mx-auto text-orange-500 mb-3" size={56} />
            <div className="text-xl font-bold">Login required</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Driver Dashboard</h1>
            <p className="text-gray-600 mt-1">Realtime + refresh every 5 seconds.</p>
          </div>
          <button
            onClick={() => loadAll()}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white flex items-center gap-2 w-fit"
          >
            <RefreshCcw size={16} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-4 md:p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Package size={28} />
              <span className="text-2xl md:text-3xl font-bold">{stats.available}</span>
            </div>
            <p className="text-blue-100 text-sm">Available Orders</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-4 md:p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Clock size={28} />
              <span className="text-2xl md:text-3xl font-bold">{stats.inProgress}</span>
            </div>
            <p className="text-orange-100 text-sm">In Progress</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-4 md:p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle size={28} />
              <span className="text-2xl md:text-3xl font-bold">{stats.completed}</span>
            </div>
            <p className="text-green-100 text-sm">Completed Today</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-4 md:p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp size={28} />
              <span className="text-2xl md:text-3xl font-bold">₹{stats.earnings.toFixed(0)}</span>
            </div>
            <p className="text-purple-100 text-sm">Today&apos;s Earnings</p>
          </div>
        </div>

        {/* Pending requests */}
        {pendingRequests.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-8 border-2 border-yellow-300">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">New Requests</h2>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-900 rounded-full text-sm font-semibold">
                {pendingRequests.length}
              </span>
            </div>

            <div className="space-y-4">
              {pendingRequests.map((a) => {
                const o = a.order;
                return (
                  <div key={a.id} className="border rounded-lg p-4 bg-yellow-50">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900">
                          Order #{o?.order_number ?? a.order_id.slice(0, 8)}
                        </div>
                        <div className="text-sm text-gray-700 mt-1">
                          {fmtMoney(o?.total_amount)} • Assigned {fmtTime(a.assigned_at)}
                        </div>

                        <div className="mt-3 text-sm">
                          <div className="font-semibold flex items-center gap-2 text-gray-900">
                            <Store size={16} /> Pickup
                          </div>
                          <div className="text-gray-700">
                            {o?.merchant?.business_name || 'Merchant'} • {o?.merchant?.address || '—'}
                          </div>
                        </div>

                        <div className="mt-3 text-sm">
                          <div className="font-semibold flex items-center gap-2 text-gray-900">
                            <MapPin size={16} /> Drop
                          </div>
                          <div className="text-gray-700">{o?.delivery_address || '—'}</div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          disabled={busyAccept === a.id}
                          onClick={() => acceptAssignment(a.id, a.order_id)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-60"
                        >
                          {busyAccept === a.id ? 'Accepting…' : 'Accept'}
                        </button>
                        <button
                          disabled={busyAccept === a.id}
                          onClick={() => rejectAssignment(a.id)}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Current active */}
        {currentOrder && (
          <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-8 border-2 border-primary">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-primary">
                Active Delivery • Order #{currentOrder.order_number ?? currentOrder.id.slice(0, 8)}
              </h2>
              <Link href={`/driver/orders/${currentOrder.id}`} className="text-primary font-semibold">
                Details →
              </Link>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4 bg-orange-50">
                <div className="font-bold flex items-center gap-2 text-orange-900">
                  <Store size={18} /> Pickup (Merchant)
                </div>
                <div className="text-sm text-gray-800 mt-2">
                  <div className="font-semibold">{currentOrder.merchant?.business_name || 'Merchant'}</div>
                  <div>{currentOrder.merchant?.address || 'Address not available'}</div>
                  {currentOrder.merchant?.phone ? (
                    <a className="inline-flex items-center gap-2 mt-2 text-primary font-semibold" href={`tel:${currentOrder.merchant.phone}`}>
                      <Phone size={16} /> {currentOrder.merchant.phone}
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-green-50">
                <div className="font-bold flex items-center gap-2 text-green-900">
                  <MapPin size={18} /> Drop (Customer)
                </div>
                <div className="text-sm text-gray-800 mt-2">
                  <div className="font-semibold">{currentOrder.customer?.full_name || 'Customer'}</div>
                  <div>{currentOrder.delivery_address || 'No address provided'}</div>
                  {currentOrder.customer_phone ? (
                    <a className="inline-flex items-center gap-2 mt-2 text-primary font-semibold" href={`tel:${currentOrder.customer_phone}`}>
                      <Phone size={16} /> {currentOrder.customer_phone}
                    </a>
                  ) : null}
                  {mapsLink(currentOrder.delivery_latitude, currentOrder.delivery_longitude) ? (
                    <a
                      className="block mt-2 text-primary font-semibold"
                      target="_blank"
                      rel="noreferrer"
                      href={mapsLink(currentOrder.delivery_latitude, currentOrder.delivery_longitude)!}
                    >
                      Open in Maps →
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              {currentOrder.status === 'assigned' && (
                <button
                  disabled={busyUpdate}
                  onClick={markPickedUp}
                  className="flex-1 bg-primary text-white py-3 rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <Truck size={18} />
                  Mark Picked Up
                </button>
              )}

              {currentOrder.status === 'picked_up' && (
                <button
                  disabled={busyUpdate}
                  onClick={markDelivered}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} />
                  Mark Delivered
                </button>
              )}
            </div>
          </div>
        )}

        {/* Available pool */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold">Available Orders (All Drivers)</h2>
            <Link href="/driver/orders" className="text-primary font-semibold">
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-gray-200 h-28 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : availableOrders.length ? (
            <div className="space-y-4">
              {availableOrders.map((o) => (
                <div key={o.id} className="border-2 border-gray-200 rounded-lg p-4 hover:border-primary transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-2">
                        <span className="font-bold text-base md:text-lg">
                          Order #{o.order_number ?? o.id.slice(0, 8)}
                        </span>
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-semibold">
                          {fmtMoney(o.total_amount)} • Earn ₹{(Number(o.total_amount || 0) * COMMISSION).toFixed(0)}
                        </span>
                      </div>

                      <div className="text-sm text-gray-700 mb-1">
                        <span className="font-semibold">Pickup:</span> {o.merchant?.business_name || 'Merchant'} •{' '}
                        {o.merchant?.address || '—'}
                      </div>

                      <div className="text-sm text-gray-600 line-clamp-2">
                        <span className="font-semibold text-gray-700">Drop:</span> {o.delivery_address || 'No address provided'}
                      </div>

                      <div className="text-xs text-gray-500 mt-1">{fmtTime(o.created_at)}</div>
                    </div>

                    <button
                      disabled={busyAccept === o.id}
                      onClick={() => acceptFromPool(o.id)}
                      className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-semibold disabled:opacity-60"
                    >
                      {busyAccept === o.id ? 'Accepting…' : 'Accept'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package size={64} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No available orders</h3>
              <p className="text-gray-600">When an order becomes “ready”, it will appear here for all drivers.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
