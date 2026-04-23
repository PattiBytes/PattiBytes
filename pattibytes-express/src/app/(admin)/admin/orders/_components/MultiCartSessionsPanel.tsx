/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useEffect, useState } from 'react';
import { supabase }  from '@/lib/supabase';
import { RefreshCw } from 'lucide-react';

type Props = { onViewOrder: (id: string) => void };

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  partial:   'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
  pending:   'bg-blue-100 text-blue-800',
};

export function MultiCartSessionsPanel({ onViewOrder }: Props) {
  const [sessions,  setSessions]  = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [expanded,  setExpanded]  = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('multi_cart_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(60);
      setSessions(data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <RefreshCw size={18} className="animate-spin mr-2" /> Loading sessions…
      </div>
    );
  }

  if (!sessions.length) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-3">🛒</p>
        <p className="font-semibold">No multi-restaurant orders yet</p>
        <p className="text-sm mt-1">
          Sessions appear when a customer orders from 2+ restaurants at once.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-2">
        <p className="text-sm text-gray-500 font-semibold">
          {sessions.length} multi-restaurant session{sessions.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={load}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {sessions.map(s => {
        const bills      = s.merchant_bills ?? [];
        const isOpen     = expanded === s.id;
        const orderIds   = (s.order_ids ?? []) as string[];
        const statusCls  = STATUS_COLORS[s.status] ?? 'bg-gray-100 text-gray-600';

        return (
          <div
            key={s.id}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          >
            {/* Row header */}
            <button
              onClick={() => setExpanded(isOpen ? null : s.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg">🛒</span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800">
                    {orderIds.length} orders · {bills.length} restaurants
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {new Date(s.created_at).toLocaleString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-black text-gray-800">
                  ₹{Number(s.total_amount).toFixed(2)}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${statusCls}`}>
                  {s.status.replace('_', ' ').toUpperCase()}
                </span>
                <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
              </div>
            </button>

            {/* Expanded detail */}
            {isOpen && (
              <div className="border-t border-gray-100 px-4 py-3 space-y-3">

                {/* Payment info */}
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>💳 {s.payment_method?.toUpperCase() ?? '—'}</span>
                  <span className={
                    s.payment_status === 'paid'
                      ? 'text-green-600 font-bold'
                      : 'text-yellow-600 font-bold'
                  }>
                    {s.payment_status?.toUpperCase() ?? '—'}
                  </span>
                  {s.promo_code && (
                    <span className="text-purple-600 font-bold">🏷️ {s.promo_code}</span>
                  )}
                  {s.discount > 0 && (
                    <span className="text-green-600">
                      🎉 Saved ₹{Number(s.discount).toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Delivery address */}
                {s.delivery_address && (
                  <p className="text-xs text-gray-500">
                    📍 {s.delivery_address}
                  </p>
                )}

                {/* Per-merchant bill rows */}
                {bills.length > 0 && (
                  <div className="space-y-1">
                    {bills.map((b: any, i: number) => (
                      <div
                        key={b.merchant_id ?? i}
                        className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-700 truncate">
                            {b.merchant_name}
                          </p>
                          <p className="text-xs text-gray-400">
                            Sub: ₹{Number(b.subtotal).toFixed(2)}
                            {b.discount > 0 && ` · -₹${Number(b.discount).toFixed(2)}`}
                            {` · Del: ₹${Number(b.delivery_fee).toFixed(2)}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-black text-gray-800">
                            ₹{Number(b.total).toFixed(2)}
                          </span>
                          {b.order_id && (
                            <button
                              onClick={() => onViewOrder(b.order_id)}
                              className="text-xs px-2 py-1 bg-primary text-white rounded-lg
                                         font-semibold hover:opacity-90 transition-opacity"
                            >
                              View
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* All order IDs (fallback if no bills) */}
                {bills.length === 0 && orderIds.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {orderIds.map(oid => (
                      <button
                        key={oid}
                        onClick={() => onViewOrder(oid)}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-lg
                                   font-mono hover:bg-gray-200 transition-colors"
                      >
                        {oid.slice(0, 8)}…
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

