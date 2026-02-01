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
  logo_url?: string | null;
  banner_url?: string | null;
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

  created_at: string;
  updated_at: string | null;
  actual_delivery_time: string | null;

  merchant?: Merchant | null;
  customer?: Customer | null;
};

const COMMISSION_RATE = 0.1;

// Pool rules
const POOL_STATUS = 'ready';

// IMPORTANT: If your orders_status_check doesn't allow "assigned", keep this null.
// The pool still disappears because driver_id becomes non-null.
const ACCEPT_STATUS: string | null = null; // e.g. 'assigned' | 'accepted' | null

// IMPORTANT: These must exist in your orders_status_check
const PICKED_UP_STATUS = 'picked_up';
const DELIVERED_STATUS = 'delivered';

const ACTIVE_STATUSES = ['ready', 'assigned', 'accepted', 'picked_up', 'on_the_way', 'out_for_delivery'];

// Prevent content/buttons from hiding under your bottom nav
const BOTTOM_NAV_PX = 96;

const BRAND = {
  title: 'Presented by Pattibytes',
  instagram1: 'https://instagram.com/pattibytes',
  instagram2: 'https://instagram.com/pbexpress_38',
  youtube: 'https://www.youtube.com/@pattibytes',
  facebook: 'https://facebook.com/pattibytes',
};

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function formatTime(iso: string) {
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

function money(n: any) {
  return `₹${Number(n || 0).toFixed(2)}`;
}

export default function DriverDashboardPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);

  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);

  const [stats, setStats] = useState({
    available: 0,
    inProgress: 0,
    completed: 0,
    earnings: 0,
  });

  const [busyAccepting, setBusyAccepting] = useState<string | null>(null);
  const [busyStatus, setBusyStatus] = useState(false);

  const refreshAll = async () => {
    await loadOrdersAndStats();
  };

  useEffect(() => {
    if (!user?.id) return;

    refreshAll();

    // Realtime only (no polling).
    const driverFilter = `driver_id=eq.${user.id}`;
    const poolFilter = `status=eq.${POOL_STATUS}`;

    const chMine = supabase
      .channel(`driver-orders-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: driverFilter }, () => {
        loadOrdersAndStats();
      })
      .subscribe();

    const chPool = supabase
      .channel('orders-pool')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: poolFilter }, () => {
        loadOrdersAndStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chMine);
      supabase.removeChannel(chPool);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const enrichOrders = async (rows: any[]): Promise<Order[]> => {
    const merchantIds = Array.from(new Set(rows.map((o) => o.merchant_id).filter(Boolean))) as string[];
    const customerIds = Array.from(new Set(rows.map((o) => o.customer_id).filter(Boolean))) as string[];

    const [merchantsRes, customersRes] = await Promise.all([
      merchantIds.length
        ? supabase.from('merchants').select('id,business_name,address,phone,logo_url,banner_url').in('id', merchantIds)
        : Promise.resolve({ data: [], error: null } as any),
      customerIds.length
        ? supabase.from('profiles').select('id,full_name,phone').in('id', customerIds)
        : Promise.resolve({ data: [], error: null } as any),
    ]);

    if (merchantsRes.error) logger.warn('merchant bulk fetch failed', merchantsRes.error);
    if (customersRes.error) logger.warn('customer bulk fetch failed', customersRes.error);

    const merchantMap = new Map<string, Merchant>(((merchantsRes.data as any[]) || []).map((m) => [m.id, m]));
    const customerMap = new Map<string, Customer>(((customersRes.data as any[]) || []).map((c) => [c.id, c]));

    return rows.map((o: any) => ({
      ...(o as Order),
      merchant: o.merchant_id ? merchantMap.get(o.merchant_id) || null : null,
      customer: o.customer_id ? customerMap.get(o.customer_id) || null : null,
    })) as Order[];
  };

  const loadOrdersAndStats = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Available pool (all drivers)
      const { data: available, error: availableError } = await supabase
        .from('orders')
        .select(
          'id,order_number,status,customer_id,merchant_id,driver_id,total_amount,delivery_address,customer_phone,delivery_distance_km,created_at'
        )
        .eq('status', POOL_STATUS)
        .is('driver_id', null)
        .order('created_at', { ascending: true })
        .limit(50);

      if (availableError) logger.error('available load failed', availableError);

      // Active orders for this driver (show list, not only one)
      const { data: active, error: activeError } = await supabase
        .from('orders')
        .select(
          'id,order_number,status,customer_id,merchant_id,driver_id,total_amount,delivery_address,customer_phone,delivery_distance_km,created_at,updated_at,actual_delivery_time'
        )
        .eq('driver_id', user.id)
        .in('status', ACTIVE_STATUSES as any)
        .order('created_at', { ascending: false })
        .limit(10);

      if (activeError) logger.error('active load failed', activeError);

      // Delivered today (analytics)
      const { data: completedToday, error: completedError } = await supabase
        .from('orders')
        .select('total_amount,created_at')
        .eq('driver_id', user.id)
        .eq('status', DELIVERED_STATUS)
        .gte('created_at', startOfTodayISO());

      if (completedError) logger.error('completed load failed', completedError);

      const availableWith = await enrichOrders((available as any[]) || []);
      const activeWith = await enrichOrders((active as any[]) || []);

      const earnings =
        (completedToday || []).reduce((sum: number, o: any) => sum + Number(o.total_amount || 0) * COMMISSION_RATE, 0) ||
        0;

      setAvailableOrders(availableWith);
      setActiveOrders(activeWith);

      setStats({
        available: availableWith.length,
        inProgress: activeWith.length,
        completed: completedToday?.length || 0,
        earnings,
      });
    } catch (e: any) {
      logger.error('loadOrdersAndStats failed', e);
      toast.error(e?.message || 'Failed to load driver dashboard');
    } finally {
      setLoading(false);
    }
  };

  const acceptOrder = async (orderId: string) => {
    if (!user?.id) return;

    setBusyAccepting(orderId);
    try {
      const patch: any = {
        driver_id: user.id, // FK is profiles(id) so this is valid
        updated_at: new Date().toISOString(),
      };
      if (ACCEPT_STATUS) patch.status = ACCEPT_STATUS;

      const { error } = await supabase
        .from('orders')
        .update(patch)
        .eq('id', orderId)
        .eq('status', POOL_STATUS)
        .is('driver_id', null);

      if (error) throw error;

      toast.success('Order accepted');
      await loadOrdersAndStats();
    } catch (e: any) {
      logger.error('acceptOrder failed', e);
      toast.error(e?.message || 'Failed to accept (already taken or blocked by policies/constraints).');
    } finally {
      setBusyAccepting(null);
    }
  };

  const markPickedUp = async (orderId: string) => {
    if (!user?.id) return;

    setBusyStatus(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: PICKED_UP_STATUS, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('driver_id', user.id);

      if (error) throw error;

      toast.success('Marked as picked up');
      await loadOrdersAndStats();
    } catch (e: any) {
      logger.error('markPickedUp failed', e);
      toast.error(e?.message || 'Failed (check orders_status_check allowed statuses).');
    } finally {
      setBusyStatus(false);
    }
  };

  const markDelivered = async (orderId: string) => {
    if (!user?.id) return;

    setBusyStatus(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: DELIVERED_STATUS,
          payment_status: 'paid',
          actual_delivery_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .eq('driver_id', user.id);

      if (error) throw error;

      toast.success('Delivered');
      await loadOrdersAndStats();
    } catch (e: any) {
      logger.error('markDelivered failed', e);
      toast.error(e?.message || 'Failed to update');
    } finally {
      setBusyStatus(false);
    }
  };

  const topActive = useMemo(() => activeOrders.slice(0, 3), [activeOrders]);

  return (
    <DashboardLayout>
      <div
        className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6"
        style={{ paddingBottom: `calc(${BOTTOM_NAV_PX}px + env(safe-area-inset-bottom))` }}
      >
        {/* Header + Brand */}
        <div className="mb-5 sm:mb-8">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Driver Dashboard</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Presented by Pattibytes • Built for fast delivery operations.
              </p>

              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm">
                <a className="text-primary font-semibold hover:underline" href={BRAND.instagram1} target="_blank" rel="noreferrer">
                  Instagram: @pattibytes
                </a>
                <a className="text-primary font-semibold hover:underline" href={BRAND.instagram2} target="_blank" rel="noreferrer">
                  Instagram: @pbexpress_38
                </a>
                <a className="text-primary font-semibold hover:underline" href={BRAND.youtube} target="_blank" rel="noreferrer">
                  YouTube/Website: @pattibytes
                </a>
                <a className="text-primary font-semibold hover:underline" href={BRAND.facebook} target="_blank" rel="noreferrer">
                  Facebook: @pattibytes
                </a>
              </div>
            </div>

            <button
              onClick={refreshAll}
              className="shrink-0 px-3 sm:px-4 py-2 rounded-lg bg-gray-900 text-white flex items-center gap-2 text-sm"
            >
              <RefreshCcw size={16} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-5 sm:mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <Package className="flex-shrink-0" size={24} />
              <span className="text-2xl font-bold">{stats.available}</span>
            </div>
            <p className="text-blue-100 text-xs sm:text-sm">Available Orders</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <Clock className="flex-shrink-0" size={24} />
              <span className="text-2xl font-bold">{stats.inProgress}</span>
            </div>
            <p className="text-orange-100 text-xs sm:text-sm">In Progress</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="flex-shrink-0" size={24} />
              <span className="text-2xl font-bold">{stats.completed}</span>
            </div>
            <p className="text-green-100 text-xs sm:text-sm">Completed Today</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="flex-shrink-0" size={24} />
              <span className="text-2xl font-bold">₹{stats.earnings.toFixed(0)}</span>
            </div>
            <p className="text-purple-100 text-xs sm:text-sm">Today&apos;s Earnings</p>
          </div>
        </div>

        {/* Active Orders (top cards) */}
        <div className="mb-5 sm:mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Active Orders</h2>
            <Link href="/driver/orders" className="text-primary font-semibold text-sm hover:underline">
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-gray-200 h-24 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : topActive.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-6 text-center text-gray-600">
              No active orders right now.
            </div>
          ) : (
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
              {topActive.map((o) => {
                const m = o.merchant;
                return (
                  <div key={o.id} className="bg-white rounded-xl shadow p-4 border">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Merchant image */}
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
                          {m?.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.logo_url} alt="Merchant logo" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-bold text-gray-600">{(m?.business_name || 'M').slice(0, 1)}</span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="font-bold text-gray-900">
                            Order #{o.order_number ?? o.id.slice(0, 8)}
                          </div>
                          <div className="text-xs text-gray-600 mt-1 line-clamp-1">
                            Status: {String(o.status || '—')}
                          </div>
                          <div className="text-xs text-gray-600 mt-1 line-clamp-1">
                            Pickup: {m?.business_name || 'Merchant'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-bold text-primary text-sm">{money(o.total_amount)}</div>
                        <div className="text-[11px] text-gray-600 mt-1">
                          {formatTime(o.created_at)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Link
                        href={`/driver/orders/${o.id}`}
                        className="flex-1 text-center border rounded-lg py-2 text-sm font-semibold hover:bg-gray-50"
                      >
                        Details
                      </Link>

                      {(String(o.status) === 'assigned' || String(o.status) === 'ready') && (
                        <button
                          disabled={busyStatus}
                          onClick={() => markPickedUp(o.id)}
                          className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                          <Truck size={16} />
                          Picked up
                        </button>
                      )}

                      {String(o.status) === 'picked_up' && (
                        <button
                          disabled={busyStatus}
                          onClick={() => markDelivered(o.id)}
                          className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                          <CheckCircle size={16} />
                          Delivered
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Available Orders */}
        <div className="bg-white rounded-xl shadow p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 gap-3">
            <h2 className="text-lg sm:text-xl font-bold">Available Orders</h2>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs sm:text-sm font-semibold">
              {stats.available} Available
            </span>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-gray-200 h-28 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : availableOrders.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {availableOrders.map((o) => {
                const m = o.merchant;
                return (
                  <div key={o.id} className="border-2 border-gray-200 rounded-xl p-4 hover:border-primary transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          {/* Merchant image */}
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
                            {m?.logo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={m.logo_url} alt="Merchant logo" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-bold text-gray-600">{(m?.business_name || 'M').slice(0, 1)}</span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="font-bold text-base sm:text-lg">
                                Order #{o.order_number ?? o.id.slice(0, 8)}
                              </span>
                              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs sm:text-sm rounded-full font-semibold">
                                {money(o.total_amount)} • Earn ₹{(Number(o.total_amount || 0) * COMMISSION_RATE).toFixed(0)}
                              </span>
                            </div>

                            <div className="text-sm text-gray-700 mb-2 flex items-start gap-2">
                              <Store size={16} className="mt-0.5 text-gray-600" />
                              <span className="min-w-0">
                                <span className="font-semibold">Pickup:</span> {m?.business_name || 'Merchant'} • {m?.address || '—'}
                              </span>
                            </div>

                            <div className="text-sm text-gray-600 mb-2 flex items-start gap-2">
                              <MapPin size={16} className="mt-0.5 text-gray-600" />
                              <span className="min-w-0">
                                <span className="font-semibold text-gray-700">Drop:</span> {o.delivery_address || 'No address provided'}
                              </span>
                            </div>

                            <p className="text-xs text-gray-500">{formatTime(o.created_at)}</p>

                            {(m?.phone || o.customer_phone) ? (
                              <div className="mt-2 flex flex-wrap gap-3 text-xs sm:text-sm">
                                {m?.phone ? (
                                  <a className="inline-flex items-center gap-2 text-primary font-semibold" href={`tel:${m.phone}`}>
                                    <Phone size={14} /> Merchant
                                  </a>
                                ) : null}
                                {o.customer_phone ? (
                                  <a className="inline-flex items-center gap-2 text-primary font-semibold" href={`tel:${o.customer_phone}`}>
                                    <Phone size={14} /> Customer
                                  </a>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <button
                        disabled={busyAccepting === o.id}
                        onClick={() => acceptOrder(o.id)}
                        className="bg-primary text-white px-5 py-3 rounded-lg hover:bg-orange-600 font-semibold transition-colors whitespace-nowrap disabled:opacity-50"
                      >
                        {busyAccepting === o.id ? 'Accepting…' : 'Accept Order'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 sm:py-12">
              <Package size={56} className="mx-auto text-gray-400 mb-3" />
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">No orders available</h3>
              <p className="text-sm text-gray-600 mb-5">When an order becomes ready, it will appear here for all drivers.</p>
              <Link href="/driver/orders" className="text-primary font-semibold">
                View my orders →
              </Link>
            </div>
          )}
        </div>

        {/* Footer credit */}
        <div className="mt-6 sm:mt-10 text-center text-xs sm:text-sm text-gray-600">
          <div className="font-semibold text-gray-800">{BRAND.title}</div>
          <div className="mt-1">
            Developed with love ❤️ by thrillyverse
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
