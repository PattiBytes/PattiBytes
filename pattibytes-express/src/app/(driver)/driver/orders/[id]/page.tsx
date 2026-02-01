/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { MapPin, Truck, CheckCircle, RefreshCcw } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { logger } from '@/lib/logger';

type Order = {
  id: string;
  order_number: number | null;
  status: string | null;
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

  items: any;
  created_at: string;
  updated_at: string | null;
  actual_delivery_time: string | null;
};

export default function DriverOrderDetailsPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const id = String((params as any)?.id || '');

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!id) return;
    load();

    const t = setInterval(load, 5000);

    const ch = supabase
      .channel(`driver-order-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, load)
      .subscribe();

    return () => {
      clearInterval(t);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, id]);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      const row = (data as any) as Order | null;
      setOrder(row);

      if (row && row.driver_id && row.driver_id !== user?.id) {
        toast.error('This order is not assigned to you.');
        router.push('/driver/orders');
      }
    } catch (e: any) {
      logger.error('Order details load failed', e);
      toast.error(e?.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: 'picked_up' | 'delivered') => {
    if (!user?.id || !order?.id) return;
    setBusy(true);
    try {
      const patch: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (newStatus === 'delivered') {
        patch.payment_status = 'paid';
        patch.actual_delivery_time = new Date().toISOString();
      }

      const { error } = await supabase.from('orders').update(patch).eq('id', order.id).eq('driver_id', user.id);
      if (error) throw error;

      toast.success('Status updated');
      await load();
    } catch (e: any) {
      logger.error('Status update failed', e);
      toast.error(e?.message || 'Failed to update');
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order Details</h1>
            <p className="text-sm text-gray-600">Auto refresh every 5 seconds.</p>
          </div>
          <button onClick={load} className="px-4 py-2 rounded-lg bg-gray-900 text-white flex items-center gap-2">
            <RefreshCcw size={16} />
            Refresh
          </button>
        </div>

        {loading || !order ? (
          <div className="bg-white rounded-xl shadow p-10 text-gray-600">Loading…</div>
        ) : (
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-gray-600">Order</div>
                <div className="text-xl font-bold text-gray-900">
                  #{order.order_number ?? String(order.id).slice(0, 8)}
                </div>
                <div className="text-xs text-gray-500 mt-1">{new Date(order.created_at).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Total</div>
                <div className="text-xl font-bold text-primary">₹{Number(order.total_amount || 0).toFixed(2)}</div>
                <div className="text-xs text-gray-600 mt-1">Status: {String(order.status || '—')}</div>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="text-sm font-semibold text-gray-900 mb-2">Delivery</div>
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <MapPin size={16} className="mt-0.5 text-primary" />
                <span>{order.delivery_address || 'No address provided'}</span>
              </div>
              {order.customer_phone ? (
                <a href={`tel:${order.customer_phone}`} className="inline-block mt-2 text-primary font-semibold text-sm">
                  Call customer
                </a>
              ) : null}
            </div>

            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="text-sm font-semibold text-gray-900 mb-2">Payment</div>
              <div className="text-sm text-gray-700">
                Method: {order.payment_method || '—'} • Status: {order.payment_status || '—'}
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="text-sm font-semibold text-gray-900 mb-2">Items</div>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words">
                {typeof order.items === 'string' ? order.items : JSON.stringify(order.items, null, 2)}
              </pre>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {order.status === 'assigned' && (
                <button
                  disabled={busy}
                  onClick={() => updateStatus('picked_up')}
                  className="flex-1 bg-primary text-white py-3 rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <Truck size={18} />
                  Mark Picked Up
                </button>
              )}

              {order.status === 'picked_up' && (
                <button
                  disabled={busy}
                  onClick={() => updateStatus('delivered')}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} />
                  Mark Delivered
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
