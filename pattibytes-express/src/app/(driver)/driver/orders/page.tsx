/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { Package, Truck, CheckCircle, XCircle, RefreshCcw } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { logger } from '@/lib/logger';

type Order = {
  id: string;
  order_number: number | null;
  status: string | null;
  total_amount: number | null;
  delivery_address: string | null;
  created_at: string;
  driver_id: string | null;
};

const ACTIVE = ['assigned', 'picked_up', 'on_the_way', 'out_for_delivery', 'ready'];
const DONE = ['delivered', 'cancelled'];

export default function DriverOrdersPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<'active' | 'history'>('active');

  useEffect(() => {
    if (!user?.id) return;

    load();

    const t = setInterval(load, 5000);

    const ch = supabase
      .channel(`driver-orders-page-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `driver_id=eq.${user.id}` }, load)
      .subscribe();

    return () => {
      clearInterval(t);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, tab]);

  const load = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const statuses = tab === 'active' ? ACTIVE : DONE;

      const { data, error } = await supabase
        .from('orders')
        .select('id,order_number,status,total_amount,delivery_address,created_at,driver_id')
        .eq('driver_id', user.id)
        .in('status', statuses as any)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setOrders((data as any) || []);
    } catch (e: any) {
      logger.error('DriverOrders load failed', e);
      toast.error(e?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const a = orders.filter((o) => ACTIVE.includes(String(o.status || ''))).length;
    const h = orders.filter((o) => DONE.includes(String(o.status || ''))).length;
    return { a, h };
  }, [orders]);

  if (!user) {
    return (
      <DashboardLayout>
        <div className="p-8 text-gray-700">Please login.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
            <p className="text-sm text-gray-600">Auto refresh every 5 seconds.</p>
          </div>
          <button onClick={load} className="px-4 py-2 rounded-lg bg-gray-900 text-white flex items-center gap-2">
            <RefreshCcw size={16} />
            Refresh
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('active')}
            className={`px-4 py-2 rounded-lg font-semibold ${tab === 'active' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-800'}`}
          >
            Active ({stats.a})
          </button>
          <button
            onClick={() => setTab('history')}
            className={`px-4 py-2 rounded-lg font-semibold ${tab === 'history' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-800'}`}
          >
            History ({stats.h})
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <Truck size={64} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No orders found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <Link
                key={o.id}
                href={`/driver/orders/${o.id}`}
                className="block bg-white rounded-xl shadow p-4 hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900">
                      Order #{o.order_number ?? String(o.id).slice(0, 8)}
                    </div>
                    <div className="text-sm text-gray-600 line-clamp-1">
                      {o.delivery_address || 'No address provided'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{new Date(o.created_at).toLocaleString()}</div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-primary">₹{Number(o.total_amount || 0).toFixed(2)}</div>
                    <div className="text-xs mt-1 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                      {String(o.status || '—')}
                      {String(o.status) === 'delivered' ? <CheckCircle size={14} /> : null}
                      {String(o.status) === 'cancelled' ? <XCircle size={14} /> : null}
                      {ACTIVE.includes(String(o.status || '')) ? <Package size={14} /> : null}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
