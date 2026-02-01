/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { Package, Clock, CheckCircle, TrendingUp, MapPin, RefreshCcw, AlertCircle } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { logger } from '@/lib/logger';

type Profile = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  phone?: string | null;
  role?: string | null;
  approval_status?: string | null;
  is_approved?: boolean | null;
  profile_completed?: boolean | null;
  is_active?: boolean | null;
};

type DriverProfile = {
  user_id: string;
  profile_completed?: boolean | null;

  vehicle_type?: string | null;
  vehicle_number?: string | null;
  license_number?: string | null;
  license_expiry?: string | null;

  profile_photo?: string | null;
  vehicle_photo?: string | null;
  license_photo?: string | null;
  aadhar_number?: string | null;
  aadhar_photo?: string | null;

  rating?: number | null;
  total_deliveries?: number | null;
  earnings?: number | null;
};

type Merchant = { id: string; business_name?: string | null; businessname?: string | null; address?: string | null; phone?: string | null };
type Customer = { id: string; full_name?: string | null; phone?: string | null };

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

  items: any;
  created_at: string;
  updated_at: string | null;
  actual_delivery_time: string | null;

  merchant?: Merchant | null;
  customer?: Customer | null;
};

const AVAILABLE_STATUSES = ['ready', 'ready_for_pickup'];
const ACTIVE_STATUSES = ['assigned', 'picked_up', 'on_the_way', 'out_for_delivery', 'ready'];

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

export default function DriverDashboardPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);

  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);

  const [stats, setStats] = useState({
    available: 0,
    inProgress: 0,
    completed: 0,
    earnings: 0,
  });

  const [busyAccepting, setBusyAccepting] = useState<string | null>(null);
  const [busyStatus, setBusyStatus] = useState(false);

  const isDriver = useMemo(() => (profile?.role || '').toLowerCase() === 'driver', [profile?.role]);

  const isApproved = useMemo(() => {
    const s = (profile?.approval_status || '').toLowerCase();
    return s === 'approved' || profile?.is_approved === true;
  }, [profile?.approval_status, profile?.is_approved]);

  const profileCompleted = useMemo(() => {
    return driverProfile?.profile_completed === true || profile?.profile_completed === true;
  }, [driverProfile?.profile_completed, profile?.profile_completed]);

  const canDeliver = useMemo(() => {
    if (!user) return false;
    if (!isDriver) return false;
    if (profile?.is_active === false) return false;
    if (!profileCompleted) return false;
    if (!isApproved) return false;
    return true;
  }, [user, isDriver, profile?.is_active, profileCompleted, isApproved]);

  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      await loadAll();
    })();

    // Fallback: refresh every 5 seconds
    const t = setInterval(() => {
      loadOrdersOnly();
    }, 5000);

    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    // Realtime updates (driver's orders + new available orders)
    const ch1 = supabase
      .channel(`driver-orders-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `driver_id=eq.${user.id}` },
        () => loadOrdersOnly()
      )
      .subscribe();

    const ch2 = supabase
      .channel(`available-orders`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `status=in.(${AVAILABLE_STATUSES.join(',')})` },
        () => loadOrdersOnly()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadProfile(), loadDriverProfile()]);
      await loadOrdersOnly();
    } catch (e: any) {
      logger.error('Driver dashboard load failed', e);
      toast.error(e?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async () => {
    const uid = user?.id;
    if (!uid) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,full_name,phone,role,approval_status,is_approved,profile_completed,is_active')
      .eq('id', uid)
      .maybeSingle();

    if (error) throw error;
    setProfile((data as any) || null);
  };

  const loadDriverProfile = async () => {
    const uid = user?.id;
    if (!uid) return;

    const { data, error } = await supabase
      .from('driver_profiles')
      .select(
        [
          'user_id',
          'vehicle_type',
          'vehicle_number',
          'license_number',
          'license_expiry',
          'profile_photo',
          'vehicle_photo',
          'license_photo',
          'aadhar_number',
          'aadhar_photo',
          'rating',
          'total_deliveries',
          'earnings',
          'profile_completed',
        ].join(',')
      )
      .eq('user_id', uid)
      .maybeSingle();

    if (error) {
      logger.warn('driver_profiles load error', error);
      setDriverProfile(null);
      return;
    }
    setDriverProfile((data as any) || null);
  };

  const loadOrdersOnly = async () => {
    const uid = user?.id;
    if (!uid) return;

    try {
      // Available orders = ready & unassigned
      const { data: available, error: availableError } = await supabase
        .from('orders')
        .select(
          'id,order_number,status,customer_id,merchant_id,driver_id,delivery_address,customer_phone,delivery_distance_km,total_amount,created_at'
        )
        .in('status', AVAILABLE_STATUSES as any)
        .is('driver_id', null)
        .order('created_at', { ascending: true })
        .limit(20);

      if (availableError) logger.error('Error loading available orders', availableError);

      // Current order = assigned/picked_up/etc for this driver (latest)
      const { data: current, error: currentError } = await supabase
        .from('orders')
        .select(
          'id,order_number,status,customer_id,merchant_id,driver_id,delivery_address,customer_phone,total_amount,created_at'
        )
        .eq('driver_id', uid)
        .in('status', ACTIVE_STATUSES as any)
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (currentError && currentError.code !== 'PGRST116') {
        logger.error('Error loading current order', currentError);
      }

      // Completed today (analytics)
      const { data: completedToday, error: completedError } = await supabase
        .from('orders')
        .select('total_amount,created_at')
        .eq('driver_id', uid)
        .eq('status', 'delivered')
        .gte('created_at', startOfTodayISO());

      if (completedError) logger.error('Error loading completed orders', completedError);

      // Bulk fetch merchant/customer details
      const allOrders: any[] = [...(available || []), ...(current ? [current] : [])];
      const merchantIds = Array.from(new Set(allOrders.map((o) => o.merchant_id).filter(Boolean))) as string[];
      const customerIds = Array.from(new Set(allOrders.map((o) => o.customer_id).filter(Boolean))) as string[];

      const [merchantsRes, customersRes] = await Promise.all([
        merchantIds.length
          ? supabase.from('merchants').select('id,business_name,businessname,address,phone').in('id', merchantIds)
          : Promise.resolve({ data: [], error: null } as any),
        customerIds.length
          ? supabase.from('profiles').select('id,full_name,phone').in('id', customerIds)
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      const merchantMap = new Map<string, Merchant>(((merchantsRes.data as any[]) || []).map((m) => [m.id, m]));
      const customerMap = new Map<string, Customer>(((customersRes.data as any[]) || []).map((c) => [c.id, c]));

      const availableWith = (available || []).map((o: any) => ({
        ...(o as Order),
        merchant: o.merchant_id ? merchantMap.get(o.merchant_id) || null : null,
        customer: o.customer_id ? customerMap.get(o.customer_id) || null : null,
      }));

      const currentWith = current
        ? ({
            ...(current as any),
            merchant: (current as any).merchant_id ? merchantMap.get((current as any).merchant_id) || null : null,
            customer: (current as any).customer_id ? customerMap.get((current as any).customer_id) || null : null,
          } as Order)
        : null;

      const commissionRate = 0.1;
      const earnings =
        (completedToday || []).reduce((sum: number, o: any) => sum + Number(o.total_amount || 0) * commissionRate, 0) ||
        0;

      setAvailableOrders(availableWith);
      setCurrentOrder(currentWith);
      setStats({
        available: availableWith.length,
        inProgress: currentWith ? 1 : 0,
        completed: completedToday?.length || 0,
        earnings,
      });
    } catch (e: any) {
      logger.error('loadOrdersOnly failed', e);
    }
  };

  const acceptOrder = async (orderId: string) => {
    if (!user?.id) return;
    if (!canDeliver) {
      toast.error('Complete profile + get approval before accepting orders.');
      return;
    }

    setBusyAccepting(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          driver_id: user.id,
          status: 'assigned',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .in('status', AVAILABLE_STATUSES as any)
        .is('driver_id', null);

      if (error) throw error;

      toast.success('Order accepted.');
      await loadOrdersOnly();
    } catch (e: any) {
      logger.error('acceptOrder failed', e);
      toast.error(e?.message || 'Failed to accept order.');
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
        .update({ status: 'picked_up', updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('driver_id', user.id);

      if (error) throw error;

      toast.success('Marked as picked up.');
      await loadOrdersOnly();
    } catch (e: any) {
      logger.error('markPickedUp failed', e);
      toast.error(e?.message || 'Failed to update status.');
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
          status: 'delivered',
          payment_status: 'paid',
          actual_delivery_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .eq('driver_id', user.id);

      if (error) throw error;

      toast.success('Delivered.');
      await loadOrdersOnly();
    } catch (e: any) {
      logger.error('markDelivered failed', e);
      toast.error(e?.message || 'Failed to update status.');
    } finally {
      setBusyStatus(false);
    }
  };

  // UI gates
  if (!user) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <AlertCircle className="mx-auto text-orange-500 mb-4" size={56} />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Please login</h1>
            <p className="text-gray-600">Login to view the driver dashboard.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!loading && !isDriver) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <AlertCircle className="mx-auto text-blue-500 mb-4" size={56} />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Driver access only</h1>
            <p className="text-gray-600">Your role is not driver.</p>
            <Link href="/customer/dashboard" className="text-primary font-semibold">
              Go to customer dashboard →
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!loading && isDriver && !profileCompleted) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <AlertCircle className="mx-auto text-orange-500 mb-4" size={56} />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Complete driver profile</h1>
            <p className="text-gray-600 mb-6">Upload documents and fill required details.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/driver/complete-profile" className="bg-primary text-white px-8 py-3 rounded-lg font-semibold">
                Complete Profile
              </Link>
              <button onClick={loadAll} className="px-8 py-3 rounded-lg border font-semibold flex items-center gap-2">
                <RefreshCcw size={18} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!loading && isDriver && profileCompleted && !isApproved) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <AlertCircle className="mx-auto text-blue-500 mb-4" size={56} />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Waiting for admin approval</h1>
            <p className="text-gray-600 mb-6">Your documents are under review.</p>
            <button onClick={loadAll} className="bg-gray-900 text-white px-8 py-3 rounded-lg font-semibold">
              Refresh status
            </button>
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Welcome back, {profile?.full_name?.split(' ')[0] || 'Driver'}!
            </h1>
            <p className="text-gray-600 mt-1">Dashboard auto refreshes every 5 seconds.</p>
          </div>
          <button onClick={loadAll} className="px-4 py-2 rounded-lg bg-gray-900 text-white flex items-center gap-2 w-fit">
            <RefreshCcw size={16} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-4 md:p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Package className="flex-shrink-0" size={28} />
              <span className="text-2xl md:text-3xl font-bold">{stats.available}</span>
            </div>
            <p className="text-blue-100 text-sm">Available Orders</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-4 md:p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Clock className="flex-shrink-0" size={28} />
              <span className="text-2xl md:text-3xl font-bold">{stats.inProgress}</span>
            </div>
            <p className="text-orange-100 text-sm">In Progress</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-4 md:p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="flex-shrink-0" size={28} />
              <span className="text-2xl md:text-3xl font-bold">{stats.completed}</span>
            </div>
            <p className="text-green-100 text-sm">Completed Today</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-4 md:p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="flex-shrink-0" size={28} />
              <span className="text-2xl md:text-3xl font-bold">₹{stats.earnings.toFixed(0)}</span>
            </div>
            <p className="text-purple-100 text-sm">Today&apos;s Earnings</p>
          </div>
        </div>

        {currentOrder && (
          <div className="bg-gradient-to-br from-orange-50 to-pink-50 rounded-lg shadow-lg p-6 mb-8 border-2 border-primary">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-primary">Active Delivery</h2>
              <Link href={`/driver/orders/${currentOrder.id}`} className="text-primary font-semibold">
                View details →
              </Link>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Order</p>
                  <p className="font-bold text-sm">#{currentOrder.order_number ?? String(currentOrder.id).slice(0, 8)}</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Amount</p>
                  <p className="font-bold text-primary text-sm">₹{Number(currentOrder.total_amount || 0).toFixed(2)}</p>
                </div>
              </div>

              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Delivery Address</p>
                <div className="flex items-start gap-2">
                  <MapPin size={18} className="text-primary flex-shrink-0 mt-0.5" />
                  <p className="font-medium text-sm">{currentOrder.delivery_address || 'No address provided'}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {(currentOrder.status || '') === 'assigned' && (
                  <button
                    disabled={busyStatus}
                    onClick={() => markPickedUp(currentOrder.id)}
                    className="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-semibold disabled:opacity-60"
                  >
                    Mark as Picked Up
                  </button>
                )}

                {(currentOrder.status || '') === 'picked_up' && (
                  <button
                    disabled={busyStatus}
                    onClick={() => markDelivered(currentOrder.id)}
                    className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold disabled:opacity-60"
                  >
                    Mark as Delivered
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <div className="flex items-center justify-between mb-6 gap-3">
            <h2 className="text-xl md:text-2xl font-bold">Available Orders</h2>
            <Link href="/driver/orders" className="text-primary font-semibold">
              View all →
            </Link>
          </div>

          {availableOrders.length > 0 ? (
            <div className="space-y-4">
              {availableOrders.map((o) => (
                <div key={o.id} className="border-2 border-gray-200 rounded-lg p-4 hover:border-primary transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-2">
                        <span className="font-bold text-base md:text-lg">Order #{o.order_number ?? String(o.id).slice(0, 8)}</span>
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-semibold">
                          ₹{Number(o.total_amount || 0).toFixed(2)} • Earn ₹{(Number(o.total_amount || 0) * 0.1).toFixed(0)}
                        </span>
                      </div>

                      <div className="flex items-start gap-2 text-sm text-gray-600 mb-2">
                        <MapPin size={16} className="flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{o.delivery_address || 'No address provided'}</span>
                      </div>

                      <p className="text-xs text-gray-500">{formatTime(o.created_at)}</p>
                    </div>

                    <button
                      disabled={!canDeliver || busyAccepting === o.id}
                      onClick={() => acceptOrder(o.id)}
                      className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-semibold transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {busyAccepting === o.id ? 'Accepting...' : 'Accept Order'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package size={64} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No orders available</h3>
              <p className="text-gray-600">Check back soon for new delivery opportunities.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
