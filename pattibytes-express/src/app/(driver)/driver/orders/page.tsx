/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { RefreshCcw, Package, Truck, CheckCircle } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { logger } from '@/lib/logger';

type Merchant = { id: string; business_name?: string | null; address?: string | null; phone?: string | null };
type Customer = { id: string; full_name?: string | null; phone?: string | null };

type Order = {
  id: string;
  order_number: number | null;
  status: string | null;
  driver_id: string | null;
  merchant_id: string | null;
  customer_id: string | null;

  total_amount: number | null;
  delivery_address: string | null;
  delivery_distance_km: number | null;

  created_at: string;

  merchant?: Merchant | null;
  customer?: Customer | null;
};

const COMMISSION = 0.1;

// Pool = visible to all drivers until driver_id is set
const POOL_STATUS = 'ready';

// Your DB constraint may not allow custom statuses.
// To avoid check-constraint issues, accept will only set driver_id.
// If your constraint allows, you can also set status to 'assigned' or 'accepted'.
const ACCEPT_NEXT_STATUS: string | null = null; // e.g. 'accepted' | 'assigned' | null

const ACTIVE_STATUSES = ['ready', 'accepted', 'assigned', 'picked_up', 'out_for_delivery', 'on_the_way'];
const HISTORY_STATUSES = ['delivered', 'cancelled'];

const BOTTOM_NAV_PX = 96; // prevents content/buttons hiding under bottom nav

function money(n: any) {
  return `₹${Number(n || 0).toFixed(2)}`;
}

function timeFmt(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export default function DriverOrdersPage() {
  const { user } = useAuth();

  const [tab, setTab] = useState<'available' | 'active' | 'history'>('available');
  const [loading, setLoading] = useState(true);

  const [pool, setPool] = useState<Order[]>([]);
  const [mine, setMine] = useState<Order[]>([]);

  const [busy, setBusy] = useState<string | null>(null);

  const stats = useMemo(() => {
    const available = pool.length;
    const active = mine.filter((o) => ACTIVE_STATUSES.includes(String(o.status || '')) && !HISTORY_STATUSES.includes(String(o.status || ''))).length;
    const history = mine.filter((o) => HISTORY_STATUSES.includes(String(o.status || ''))).length;
    return { available, active, history };
  }, [pool, mine]);

  useEffect(() => {
    if (!user?.id) return;

    loadAll();

    const chPool = supabase
      .channel('orders-pool')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `status=eq.${POOL_STATUS}` }, () => {
        loadPool();
      })
      .subscribe();

    const chMine = supabase
      .channel(`orders-mine-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `driver_id=eq.${user.id}` }, () => {
        loadMine();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chPool);
      supabase.removeChannel(chMine);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadPool(), loadMine()]);
    } finally {
      setLoading(false);
    }
  };

  const enrichOrders = async (orders: any[]): Promise<Order[]> => {
    const merchantIds = Array.from(new Set(orders.map((o) => o.merchant_id).filter(Boolean))) as string[];
    const customerIds = Array.from(new Set(orders.map((o) => o.customer_id).filter(Boolean))) as string[];

    const [merRes, cusRes] = await Promise.all([
      merchantIds.length ? supabase.from('merchants').select('id,business_name,address,phone').in('id', merchantIds) : Promise.resolve({ data: [] } as any),
      customerIds.length ? supabase.from('profiles').select('id,full_name,phone').in('id', customerIds) : Promise.resolve({ data: [] } as any),
    ]);

    const merMap = new Map<string, Merchant>(((merRes.data as any[]) || []).map((m) => [m.id, m]));
    const cusMap = new Map<string, Customer>(((cusRes.data as any[]) || []).map((c) => [c.id, c]));

    return (orders || []).map((o: any) => ({
      ...(o as Order),
      merchant: o.merchant_id ? merMap.get(o.merchant_id) || null : null,
      customer: o.customer_id ? cusMap.get(o.customer_id) || null : null,
    }));
  };

  const loadPool = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id,order_number,status,driver_id,merchant_id,customer_id,total_amount,delivery_address,delivery_distance_km,created_at')
        .eq('status', POOL_STATUS)
        .is('driver_id', null)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;
      setPool(await enrichOrders((data as any[]) || []));
    } catch (e: any) {
      logger.error('loadPool failed', e);
      toast.error(e?.message || 'Failed to load available orders');
    }
  };

  const loadMine = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id,order_number,status,driver_id,merchant_id,customer_id,total_amount,delivery_address,delivery_distance_km,created_at')
        .eq('driver_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setMine(await enrichOrders((data as any[]) || []));
    } catch (e: any) {
      logger.error('loadMine failed', e);
      toast.error(e?.message || 'Failed to load your orders');
    }
  };

  const acceptFromPool = async (orderId: string) => {
    if (!user?.id) return;
    setBusy(orderId);
    try {
      const patch: any = {
        driver_id: user.id,
        updated_at: new Date().toISOString(),
      };
      if (ACCEPT_NEXT_STATUS) patch.status = ACCEPT_NEXT_STATUS;

      const { error } = await supabase
        .from('orders')
        .update(patch)
        .eq('id', orderId)
        .eq('status', POOL_STATUS)
        .is('driver_id', null);

      if (error) throw error;
      toast.success('Order accepted');
      // Realtime will refresh, but doing a quick local refresh feels instant
      await Promise.all([loadPool(), loadMine()]);
    } catch (e: any) {
      logger.error('acceptFromPool failed', e);
      toast.error(e?.message || 'Failed to accept (already taken or blocked by policies/constraints)');
    } finally {
      setBusy(null);
    }
  };

  const visibleOrders = useMemo(() => {
    if (tab === 'available') return pool;

    if (tab === 'active') return mine.filter((o) => !HISTORY_STATUSES.includes(String(o.status || '')));

    return mine.filter((o) => HISTORY_STATUSES.includes(String(o.status || '')));
  }, [tab, pool, mine]);

  if (!user) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 py-10">Please login.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div
        className="max-w-6xl mx-auto px-4 py-8"
        style={{ paddingBottom: `calc(${BOTTOM_NAV_PX}px + env(safe-area-inset-bottom))` }}
      >
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
            <p className="text-sm text-gray-600">Realtime updates enabled.</p>
          </div>
          <button onClick={loadAll} className="px-4 py-2 rounded-lg bg-gray-900 text-white flex items-center gap-2">
            <RefreshCcw size={16} />
            Refresh
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('available')}
            className={`px-4 py-2 rounded-lg font-semibold ${tab === 'available' ? 'bg-primary text-white' : 'bg-gray-100'}`}
          >
            Available ({stats.available})
          </button>
          <button
            onClick={() => setTab('active')}
            className={`px-4 py-2 rounded-lg font-semibold ${tab === 'active' ? 'bg-primary text-white' : 'bg-gray-100'}`}
          >
            My Active ({stats.active})
          </button>
          <button
            onClick={() => setTab('history')}
            className={`px-4 py-2 rounded-lg font-semibold ${tab === 'history' ? 'bg-primary text-white' : 'bg-gray-100'}`}
          >
            History ({stats.history})
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <Package size={64} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No orders found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleOrders.map((o) => (
              <div key={o.id} className="bg-white rounded-xl shadow p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900">Order #{o.order_number ?? o.id.slice(0, 8)}</div>
                    <div className="text-sm text-gray-700 mt-1">
                      <span className="font-semibold">Pickup:</span> {o.merchant?.business_name || 'Merchant'} • {o.merchant?.address || '—'}
                    </div>
                    <div className="text-sm text-gray-600 mt-1 line-clamp-1">
                      <span className="font-semibold text-gray-700">Drop:</span> {o.delivery_address || 'No address'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{timeFmt(o.created_at)}</div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-2">
                    <div className="font-bold text-primary">{money(o.total_amount)}</div>
                    <div className="text-xs text-gray-700">
                      Earn ₹{(Number(o.total_amount || 0) * COMMISSION).toFixed(0)}
                    </div>

                    {tab === 'available' ? (
                      <button
                        disabled={busy === o.id}
                        onClick={() => acceptFromPool(o.id)}
                        className="bg-primary text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-60"
                      >
                        {busy === o.id ? 'Accepting…' : 'Accept'}
                      </button>
                    ) : (
                      <Link
                        href={`/driver/orders/${o.id}`}
                        className="px-4 py-2 rounded-lg border font-semibold text-gray-900 hover:bg-gray-50"
                      >
                        Details →
                      </Link>
                    )}
                  </div>
                </div>

                {tab !== 'available' ? (
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">Status: {String(o.status || '—')}</span>
                    {String(o.status) === 'picked_up' ? <Truck size={14} /> : null}
                    {String(o.status) === 'delivered' ? <CheckCircle size={14} /> : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
