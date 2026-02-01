/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { RefreshCcw } from 'lucide-react';

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
};

type DriverAssignment = {
  id: string;
  order_id: string;
  status: string;
  assigned_at: string;
  responded_at: string | null;
};

const ACTIVE = ['assigned', 'picked_up', 'on_the_way', 'out_for_delivery'];
const HISTORY = ['delivered', 'cancelled'];

export default function DriverOrdersPage() {
  const { user } = useAuth();

  const [tab, setTab] = useState<'requests' | 'active' | 'history'>('active');
  const [loading, setLoading] = useState(true);

  const [requests, setRequests] = useState<DriverAssignment[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    load();

    const t = setInterval(load, 5000);

    const ch1 = supabase
      .channel(`driver-orders-${user.id}-${tab}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load)
      .subscribe();

    const ch2 = supabase
      .channel(`driver-assign-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'driver_assignments', filter: `driver_id=eq.${user.id}` },
        load
      )
      .subscribe();

    return () => {
      clearInterval(t);
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, tab]);

  const load = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      if (tab === 'requests') {
        const { data, error } = await supabase
          .from('driver_assignments')
          .select('id,order_id,status,assigned_at,responded_at')
          .eq('driver_id', user.id)
          .eq('status', 'pending')
          .order('assigned_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        setRequests((data as any) || []);
        setOrders([]);
      } else {
        const statuses = tab === 'active' ? ACTIVE : HISTORY;

        const { data, error } = await supabase
          .from('orders')
          .select('id,order_number,status,total_amount,delivery_address,created_at')
          .eq('driver_id', user.id)
          .in('status', statuses as any)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;
        setOrders((data as any) || []);
        setRequests([]);
      }
    } catch (e: any) {
      logger.error('orders page load failed', e);
      toast.error(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="p-8">Login required.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
            <p className="text-sm text-gray-600">Realtime + refresh every 5 seconds.</p>
          </div>
          <button onClick={load} className="px-4 py-2 rounded-lg bg-gray-900 text-white flex items-center gap-2">
            <RefreshCcw size={16} />
            Refresh
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('requests')}
            className={`px-4 py-2 rounded-lg font-semibold ${tab === 'requests' ? 'bg-primary text-white' : 'bg-gray-100'}`}
          >
            Requests
          </button>
          <button
            onClick={() => setTab('active')}
            className={`px-4 py-2 rounded-lg font-semibold ${tab === 'active' ? 'bg-primary text-white' : 'bg-gray-100'}`}
          >
            Active
          </button>
          <button
            onClick={() => setTab('history')}
            className={`px-4 py-2 rounded-lg font-semibold ${tab === 'history' ? 'bg-primary text-white' : 'bg-gray-100'}`}
          >
            History
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : tab === 'requests' ? (
          requests.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-10 text-gray-600">No pending requests.</div>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <div key={r.id} className="bg-white rounded-lg shadow p-4">
                  <div className="font-bold">Assignment for Order ID: {r.order_id}</div>
                  <div className="text-sm text-gray-600">Assigned: {new Date(r.assigned_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-10 text-gray-600">No orders found.</div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <Link key={o.id} href={`/driver/orders/${o.id}`} className="block bg-white rounded-lg shadow p-4 hover:shadow-lg transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900">Order #{o.order_number ?? o.id.slice(0, 8)}</div>
                    <div className="text-sm text-gray-600 line-clamp-1">{o.delivery_address || 'No address'}</div>
                    <div className="text-xs text-gray-500 mt-1">{new Date(o.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">₹{Number(o.total_amount || 0).toFixed(2)}</div>
                    <div className="text-xs text-gray-700 mt-1">Status: {String(o.status || '—')}</div>
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
