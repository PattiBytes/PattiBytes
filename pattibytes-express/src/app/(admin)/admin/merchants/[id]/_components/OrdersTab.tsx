/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useMemo, useState } from 'react';
import {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  RefreshCw, Package, CheckCircle2, XCircle, Clock,
  Loader2, ChevronDown, ChevronUp, Search,
} from 'lucide-react';
import { OrderRow, ORDER_STATUSES, money, cx } from './types';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';

interface Props {
  orders: OrderRow[];
  loading: boolean;
  onRefresh: () => void;
}

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  pending:     { label: 'Pending',     color: 'bg-yellow-50 text-yellow-700 border-yellow-200',  dot: 'bg-yellow-500'  },
  confirmed:   { label: 'Confirmed',   color: 'bg-blue-50 text-blue-700 border-blue-200',        dot: 'bg-blue-500'    },
  preparing:   { label: 'Preparing',   color: 'bg-indigo-50 text-indigo-700 border-indigo-200',  dot: 'bg-indigo-500'  },
  on_the_way:  { label: 'On The Way',  color: 'bg-orange-50 text-orange-700 border-orange-200',  dot: 'bg-orange-500'  },
  delivered:   { label: 'Delivered',   color: 'bg-green-50 text-green-700 border-green-200',     dot: 'bg-green-500'   },
  cancelled:   { label: 'Cancelled',   color: 'bg-red-50 text-red-700 border-red-200',           dot: 'bg-red-400'     },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, color: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' };
  return (
    <span className={cx('inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border', meta.color)}>
      <span className={cx('w-1.5 h-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  );
}

function OrderCard({ order, onUpdate }: { order: OrderRow; onUpdate: (id: string, patch: Record<string, string>) => Promise<void> }) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  const safeAddress = useMemo(() => {
    if (!order.delivery_address) return '—';
    if (typeof order.delivery_address === 'string') return order.delivery_address;
    return order.delivery_address?.address || order.delivery_address?.formatted_address || '—';
  }, [order.delivery_address]);

  const created = order.created_at
    ? new Date(order.created_at).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : '—';

  const handleUpdate = async (patch: Record<string, string>) => {
    setSaving(true);
    await onUpdate(order.id, patch);
    setSaving(false);
  };

  const items = Array.isArray(order.items) ? order.items : [];
  const currentStatus = String(order.status ?? 'pending');

  return (
    <div className="border rounded-2xl bg-white overflow-hidden hover:shadow-sm transition">
      {/* Status accent bar */}
      <div className={cx(
        'h-1',
        currentStatus === 'delivered' ? 'bg-green-500'
          : currentStatus === 'cancelled' ? 'bg-red-400'
          : currentStatus === 'on_the_way' ? 'bg-orange-500'
          : 'bg-primary'
      )} />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-900 font-mono text-sm">#{order.id.slice(0, 8).toUpperCase()}</p>
              <StatusBadge status={currentStatus} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{created}</p>
            {safeAddress !== '—' && (
              <p className="text-xs text-gray-600 mt-1 truncate max-w-xs">📍 {safeAddress}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-black text-primary">{money(order.total_amount)}</p>
            {order.payment_method && (
              <p className="text-xs text-gray-500 mt-0.5 uppercase">{order.payment_method}</p>
            )}
            <span className={cx(
              'inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1',
              order.payment_status === 'paid'
                ? 'bg-green-100 text-green-700'
                : order.payment_status === 'failed'
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-500'
            )}>
              {order.payment_status ?? 'pending'}
            </span>
          </div>
        </div>

        {/* Items preview */}
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(e => !e)}
            className="mt-3 w-full flex items-center justify-between text-xs text-gray-500 hover:text-gray-700 transition"
          >
            <span>{items.length} item{items.length !== 1 ? 's' : ''}</span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}

        {expanded && items.length > 0 && (
          <div className="mt-2 bg-gray-50 rounded-xl p-3 space-y-1.5">
            {items.slice(0, 10).map((it: any, i: number) => (
              <div key={i} className="flex justify-between gap-3 text-sm">
                <span className="text-gray-700 truncate min-w-0">
                  {it?.name ?? `Item ${i + 1}`}
                  {it?.quantity > 1 && (
                    <span className="ml-1 text-xs text-gray-400">×{it.quantity}</span>
                  )}
                </span>
                <span className="font-semibold shrink-0 text-gray-900">
                  {money((it?.price ?? 0) * (it?.quantity ?? 1))}
                </span>
              </div>
            ))}
            {items.length > 10 && (
              <p className="text-xs text-gray-400 text-center pt-1">+{items.length - 10} more</p>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Status selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Order Status</label>
            <select
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary/30 focus:border-primary"
              value={currentStatus}
              disabled={saving}
              onChange={e => handleUpdate({ status: e.target.value })}
            >
              {ORDER_STATUSES.map(s => (
                <option key={s} value={s}>{STATUS_META[s]?.label ?? s}</option>
              ))}
            </select>
          </div>

          {/* Payment status */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Payment Status</label>
            <select
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary/30 focus:border-primary"
              value={String(order.payment_status ?? 'pending')}
              disabled={saving}
              onChange={e => handleUpdate({ payment_status: e.target.value })}
            >
              {['pending', 'paid', 'failed', 'refunded'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Quick actions */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Quick Actions</label>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={saving || currentStatus === 'confirmed'}
                onClick={() => handleUpdate({ status: 'confirmed' })}
                className="flex-1 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-40 transition"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                Confirm
              </button>
              <button
                type="button"
                disabled={saving || currentStatus === 'delivered'}
                onClick={() => handleUpdate({ status: 'delivered' })}
                className="flex-1 py-2 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-40 transition"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Package className="w-3 h-3" />}
                Deliver
              </button>
              <button
                type="button"
                disabled={saving || currentStatus === 'cancelled'}
                onClick={() => handleUpdate({ status: 'cancelled' })}
                className="px-2.5 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold flex items-center justify-center disabled:opacity-40 transition"
                title="Cancel"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrdersTab({ orders, loading, onRefresh }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const updateOrder = async (orderId: string, patch: Record<string, string>) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', orderId);
      if (error) throw error;
      toast.success('Order updated');
      onRefresh();
    } catch (e: any) {
      toast.error(e?.message || 'Update failed');
    }
  };

  const stats = useMemo(() => {
    const out: Record<string, number> = { all: orders.length };
    ORDER_STATUSES.forEach(s => { out[s] = orders.filter(o => o.status === s).length; });
    return out;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter(o => {
      const byStatus = statusFilter === 'all' || o.status === statusFilter;
      const byQ = !q || o.id.toLowerCase().includes(q);
      return byStatus && byQ;
    });
  }, [orders, search, statusFilter]);

  const revenue = useMemo(() =>
    orders.filter(o => o.status === 'delivered')
      .reduce((s, o) => s + Number(o.total_amount ?? 0), 0),
    [orders]
  );

  return (
    <div className="space-y-4">
      {/* Stats */}
      {!loading && orders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Orders',  value: orders.length,                                              bg: 'bg-blue-50',   text: 'text-blue-700'   },
            { label: 'Delivered',     value: stats['delivered'] ?? 0,                                    bg: 'bg-green-50',  text: 'text-green-700'  },
            { label: 'Active',        value: (stats['pending'] ?? 0) + (stats['confirmed'] ?? 0) + (stats['preparing'] ?? 0), bg: 'bg-orange-50', text: 'text-orange-700' },
            { label: 'Revenue',       value: money(revenue),                                             bg: 'bg-violet-50', text: 'text-violet-700' },
          ].map(({ label, value, bg, text }) => (
            <div key={label} className={cx(bg, 'rounded-2xl p-3 text-center border border-white shadow-sm')}>
              <p className={cx('text-xl font-black', text)}>{value}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Orders panel */}
      <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" /> Orders
            </h2>
            {!loading && (
              <p className="text-sm text-gray-400 mt-0.5">
                {filtered.length} of {orders.length} · last 50
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="Search by order ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Status chips */}
          <div className="flex gap-1.5 flex-wrap">
            {(['all', 'pending', 'confirmed', 'preparing', 'on_the_way', 'delivered', 'cancelled'] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={cx(
                  'px-3 py-1.5 rounded-xl text-xs font-bold border transition',
                  statusFilter === s
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
                )}
              >
                {s === 'all' ? `All (${stats.all})` : `${STATUS_META[s]?.label ?? s} (${stats[s] ?? 0})`}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border animate-pulse">
                <div className="h-1 bg-gray-100 rounded-t-2xl" />
                <div className="p-4 space-y-2">
                  <div className="flex justify-between">
                    <div className="space-y-1.5">
                      <div className="h-4 w-32 bg-gray-100 rounded" />
                      <div className="h-3 w-20 bg-gray-100 rounded" />
                    </div>
                    <div className="h-6 w-16 bg-gray-100 rounded" />
                  </div>
                  <div className="h-20 bg-gray-50 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center">
            <div className="text-5xl">📦</div>
            <p className="text-lg font-bold text-gray-900">
              {orders.length === 0 ? 'No orders yet' : 'No orders match'}
            </p>
            <p className="text-sm text-gray-400">
              {orders.length === 0 ? 'Orders placed at this merchant will appear here' : 'Try a different filter'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(o => (
              <OrderCard key={o.id} order={o} onUpdate={updateOrder} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
