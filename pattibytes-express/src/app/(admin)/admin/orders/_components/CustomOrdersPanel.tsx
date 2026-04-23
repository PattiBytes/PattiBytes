/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState } from 'react';
import { toast } from 'react-toastify';                    // ✅ Added missing import
import {
  ChevronDown, ChevronUp, CheckCircle, MessageSquare,
  Send, XCircle, Share2, MapPin, Phone, Package,
  Clock, Tag, FileText, Wallet,
} from 'lucide-react';
import { StatusBadge, formatDate } from '../_utils/formatters';
import { shareOrderBill }          from '../_utils/shareBill';
import type { CustomOrder, Order } from '../_types';

const CUSTOM_STATUSES = ['pending','quoted','accepted','rejected','assigned','delivered','cancelled'];

const STATUS_COLORS: Record<string, string> = {
  pending  : 'border-l-yellow-400 bg-yellow-50/30',
  quoted   : 'border-l-cyan-400 bg-cyan-50/30',
  accepted : 'border-l-green-400 bg-green-50/30',
  rejected : 'border-l-red-400 bg-red-50/20',
  assigned : 'border-l-indigo-400 bg-indigo-50/20',
  delivered: 'border-l-emerald-400 bg-emerald-50/20',
  cancelled: 'border-l-gray-300 bg-gray-50/30',
};

interface Props {
  orders   : CustomOrder[];
  loading  : boolean;
  quotingId: string | null;
  onQuote  (o: CustomOrder, amount: number, msg: string): void;
  onStatus (o: CustomOrder, s: string): void;
}

export function CustomOrdersPanel({ orders, loading, quotingId, onQuote, onStatus }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (loading)
    return (
      <div className="space-y-2">
        {[1,2,3].map(i => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 h-20 animate-pulse" />
        ))}
      </div>
    );

  if (!orders.length)
    return (
      <div className="bg-white rounded-xl border border-gray-100 text-center py-16">
        <MessageSquare size={36} className="mx-auto text-gray-200 mb-3" />
        <p className="text-sm font-semibold text-gray-400">No custom order requests yet</p>
        <p className="text-xs text-gray-300 mt-1">They&apos;ll appear here when customers submit them</p>
      </div>
    );

  const pending  = orders.filter(o => o.status === 'pending').length;
  const quoted   = orders.filter(o => o.status === 'quoted').length;

  return (
    <div className="space-y-2">
      {/* Summary strip */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {[
          { label: 'Total',    value: orders.length,  cls: 'bg-gray-100 text-gray-700'     },
          { label: 'Pending',  value: pending,         cls: 'bg-yellow-100 text-yellow-700' },
          { label: 'Quoted',   value: quoted,          cls: 'bg-cyan-100 text-cyan-700'     },
          { label: 'Accepted', value: orders.filter(o => o.status === 'accepted').length,  cls: 'bg-green-100 text-green-700' },
        ].map(({ label, value, cls }) => (
          <div key={label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${cls}`}>
            {label}: <span className="font-bold text-sm">{value}</span>
          </div>
        ))}
      </div>

      {orders.map(o => (
        <div
          key={o.id}
          className={`bg-white rounded-xl border border-gray-100 border-l-4 overflow-hidden animate-fade-in shadow-sm hover:shadow-md transition-shadow ${STATUS_COLORS[o.status] ?? ''}`}
        >
          {/* ── Card header ── */}
          <button
            type="button"
            onClick={() => setExpanded(expanded === o.id ? null : o.id)}
            className="w-full px-4 py-3 flex items-start justify-between hover:bg-white/60 text-left transition-colors gap-3"
          >
            <div className="flex items-start gap-3 min-w-0 flex-1">
              {/* Icon */}
              <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <MessageSquare size={15} className="text-violet-600" />
              </div>

              <div className="min-w-0 flex-1">
                {/* Ref + status */}
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <code className="text-xs font-bold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">
                    {o.custom_order_ref ?? o.id.slice(0, 12)}
                  </code>
                  <StatusBadge status={o.status} />
                  {o.category?.split(',').map(c => c.trim()).filter(Boolean).map(c => (
                    <span key={c} className="text-xs px-1.5 py-0 bg-violet-100 text-violet-700 rounded-full font-semibold leading-5">
                      {c}
                    </span>
                  ))}
                </div>

                {/* Customer + date */}
                <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                  <span className="flex items-center gap-0.5"><Phone size={9}/>{o.customer_phone ?? o.customerName}</span>
                  <span className="text-gray-300">·</span>
                  <span className="flex items-center gap-0.5"><Clock size={9}/>{formatDate(o.created_at)}</span>
                </div>

                {/* Quote + items preview */}
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {o.quoted_amount && (
                    <span className="text-xs font-bold text-primary flex items-center gap-0.5">
                      <Wallet size={9}/> Quoted ₹{Number(o.quoted_amount).toFixed(2)}
                    </span>
                  )}
                  {o.total_amount && (
                    <span className="text-xs text-gray-500">
                      Total ₹{Number(o.total_amount).toFixed(2)}
                    </span>
                  )}
                  {(o.items ?? []).length > 0 && (
                    <span className="text-xs text-gray-400 flex items-center gap-0.5">
                      <Package size={9}/> {(o.items ?? []).length} item{(o.items ?? []).length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 flex items-center gap-1.5">
              {o.status === 'pending' && (
                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              )}
              {expanded === o.id
                ? <ChevronUp  size={15} className="text-gray-400" />
                : <ChevronDown size={15} className="text-gray-400" />
              }
            </div>
          </button>

          {/* ── Expanded detail ── */}
          {expanded === o.id && (
            <CustomOrderDetail
              order={o} quotingId={quotingId}
              onQuote={onQuote} onStatus={onStatus}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────── */
function CustomOrderDetail({ order, quotingId, onQuote, onStatus }: {
  order    : CustomOrder;
  quotingId: string | null;
  onQuote  (o: CustomOrder, a: number, m: string): void;
  onStatus (o: CustomOrder, s: string): void;
}) {
  const [amount,  setAmount]  = useState(String(order.quoted_amount ?? ''));
  const [message, setMessage] = useState(order.quote_message ?? '');
  const items = order.items ?? [];

  /* Build bill order shape for sharing */
  const billOrder: Order = {
    id: order.order_id ?? order.id,
    order_number: order.custom_order_ref,
    customerName: order.customerName,
    customer_id: order.customer_id,
    merchant_id: '',
    customer_phone: order.customer_phone,
    items,
    subtotal: Number(order.total_amount ?? 0) - Number(order.delivery_fee ?? 0),
    delivery_fee: Number(order.delivery_fee ?? 0),
    tax: 0,
    discount: 0,
    total_amount: Number(order.total_amount ?? 0),
    payment_method: order.payment_method ?? 'COD',
    payment_status: 'pending',
    status: order.status,
    created_at: order.created_at,
    delivery_address: order.delivery_address,
    merchants: { business_name: 'PattiBytes Express' },
    delivery_address_label: undefined,
    review: undefined
  };

  const handleShare = async () => {
    const result = await shareOrderBill(billOrder);
    if      (result === 'copied') toast.success('Bill copied to clipboard!');
    else if (result === 'shared') toast.success('Order details shared!');
    else                          toast.error('Could not share');
  };

  return (
    <div className="border-t border-gray-100 bg-gray-50/40 divide-y divide-gray-100">

      {/* Info grid */}
      <div className="p-4 grid sm:grid-cols-2 gap-3">
        {order.description && (
          <div className="sm:col-span-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
              <FileText size={10}/> Description
            </p>
            <p className="text-sm text-gray-800 bg-white rounded-lg p-2.5 border border-gray-100">{order.description}</p>
          </div>
        )}

        {order.delivery_address && (
          <div className="sm:col-span-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1">
              <MapPin size={10}/> Delivery Address
            </p>
            <p className="text-sm text-gray-800 bg-white rounded-lg p-2.5 border border-gray-100">{order.delivery_address}</p>
          </div>
        )}

        {/* IDs for reference */}
        <div className="bg-white rounded-lg p-2.5 border border-gray-100">
          <p className="text-xs text-gray-400 font-bold uppercase mb-1">Reference</p>
          <code className="text-xs text-gray-600 break-all">{order.id}</code>
          {order.order_id && (
            <p className="text-xs text-gray-400 mt-0.5">Order: <code className="text-gray-600">{order.order_id.slice(0, 8)}</code></p>
          )}
        </div>

        {/* Financials */}
        <div className="bg-white rounded-lg p-2.5 border border-gray-100 text-xs space-y-1">
          <p className="text-gray-400 font-bold uppercase mb-1">Financials</p>
          {order.total_amount   && <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-bold text-primary">₹{Number(order.total_amount).toFixed(2)}</span></div>}
          {order.delivery_fee   && <div className="flex justify-between"><span className="text-gray-500">Delivery</span><span className="font-semibold">₹{Number(order.delivery_fee).toFixed(2)}</span></div>}
          {order.payment_method && <div className="flex justify-between"><span className="text-gray-500">Payment</span><span className="font-bold uppercase">{order.payment_method}</span></div>}
        </div>
      </div>

      {/* Items list */}
      {items.length > 0 && (
        <div className="p-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Tag size={10}/> Requested Items ({items.length})
          </p>
          <div className="space-y-1.5">
            {items.map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border border-gray-100 hover:border-violet-200 transition-colors">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {item.image_url && !item.image_url.startsWith('file://')
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    : <Package size={14} className="text-gray-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-gray-900">{item.name}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.unit     && <span className="text-xs text-gray-400">{item.unit}</span>}
                    {item.category && <span className="text-xs bg-orange-50 text-orange-600 px-1 rounded">{item.category}</span>}
                    <span className="text-xs text-gray-400">× {item.quantity}</span>
                  </div>
                  {item.note && (
                    <p className="text-xs text-blue-600 italic mt-0.5">&quot;{item.note}&quot;</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  {item.price > 0
                    ? <p className="text-sm font-bold text-primary">₹{(Number(item.price) * Number(item.quantity)).toFixed(2)}</p>
                    : <p className="text-xs text-gray-300 italic">TBD</p>
                  }
                  {item.is_free && (
                    <span className="text-xs bg-green-100 text-green-700 px-1.5 rounded-full font-bold">FREE</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quote form */}
      {['pending', 'quoted'].includes(order.status) && (
        <div className="p-4">
          <p className="text-xs font-bold text-violet-700 uppercase tracking-wide mb-2 flex items-center gap-1">
            📝 {order.status === 'quoted' ? 'Update Quote' : 'Send Quote to Customer'}
          </p>
          <div className="space-y-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">₹</span>
              <input
                type="number" min={0} placeholder="Quoted amount"
                value={amount} onChange={e => setAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:border-transparent bg-white"
              />
            </div>
            <textarea
              placeholder="Message explaining the quote (optional)…"
              value={message} rows={2}
              onChange={e => setMessage(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-400 focus:border-transparent resize-none bg-white"
            />
            <button
              onClick={() => onQuote(order, Number(amount), message)}
              disabled={!amount || Number(amount) <= 0 || quotingId === order.id}
              className="w-full py-2 bg-violet-600 text-white rounded-lg font-semibold text-sm hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
            >
              <Send size={13} />
              {quotingId === order.id ? 'Sending…' : 'Send Quote'}
            </button>
          </div>
        </div>
      )}

      {/* Actions row */}
      <div className="p-4 flex flex-wrap gap-2">
        {/* Status dropdown */}
        <select
          value={order.status}
          onChange={e => onStatus(order, e.target.value)}
          className="flex-1 min-w-[120px] px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary bg-white font-semibold"
        >
          {CUSTOM_STATUSES.map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>

        <button
          onClick={() => onStatus(order, 'accepted')}
          disabled={order.status === 'accepted'}
          className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 disabled:opacity-40 transition-all"
        >
          <CheckCircle size={13}/> Accept
        </button>

        <button
          onClick={() => onStatus(order, 'rejected')}
          disabled={order.status === 'rejected'}
          className="flex items-center gap-1.5 px-3 py-2 bg-red-500 text-white rounded-lg font-semibold text-sm hover:bg-red-600 disabled:opacity-40 transition-all"
        >
          <XCircle size={13}/> Reject
        </button>

        {/* Share bill */}
        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-2 border border-teal-200 text-teal-700 rounded-lg font-semibold text-sm hover:bg-teal-600 hover:text-white transition-all"
        >
          <Share2 size={13}/> Share Bill
        </button>
      </div>
    </div>
  );
}


