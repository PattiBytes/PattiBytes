/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { ClipboardList, Clock, ChevronDown, ChevronUp,
         CheckCircle, XCircle, Package, IndianRupee } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface CustomOrderRequest {
  id:               string;
  custom_order_ref: string;
  status:           string;
  category:         string | null;
  description:      string | null;
  image_url:        string | null;
  items:            any[];
  quoted_amount:    number | null;
  quote_message:    string | null;
  total_amount:     number | null;
  delivery_fee:     number | null;
  payment_method:   string | null;
  created_at:       string;
  updated_at:       string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:    { label: 'Pending Review',  color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  reviewing:  { label: 'Being Reviewed',  color: 'bg-blue-100 text-blue-800 border-blue-200',       icon: Clock },
  quoted:     { label: 'Quote Received',  color: 'bg-purple-100 text-purple-800 border-purple-200', icon: IndianRupee },
  confirmed:  { label: 'Confirmed',       color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: CheckCircle },
  processing: { label: 'Processing',      color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Package },
  delivered:  { label: 'Delivered',       color: 'bg-green-100 text-green-800 border-green-200',    icon: CheckCircle },
  cancelled:  { label: 'Cancelled',       color: 'bg-red-100 text-red-800 border-red-200',          icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status.toLowerCase()] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border
                      text-xs font-black ${cfg.color}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

function OrderCard({ order }: { order: CustomOrderRequest }) {
  const [expanded, setExpanded] = useState(false);
  const items = Array.isArray(order.items) ? order.items : [];
  const date  = new Date(order.created_at).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <div className={`bg-white rounded-2xl border-2 overflow-hidden shadow-sm
                     transition-shadow hover:shadow-md ${
      order.status === 'quoted' ? 'border-purple-300' : 'border-gray-100'
    }`}>
      {/* Header */}
      <div
        className="p-4 cursor-pointer flex items-start gap-3"
        onClick={() => setExpanded(p => !p)}
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500
                        flex items-center justify-center flex-shrink-0 shadow-sm">
          <ClipboardList className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-black text-gray-900 text-sm">{order.custom_order_ref}</span>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-xs text-gray-500 font-medium">
            {items.length} item{items.length !== 1 ? 's' : ''} · {date}
          </p>
        </div>

        <button type="button" className="text-gray-400 flex-shrink-0 mt-1">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Quote banner */}
      {order.status === 'quoted' && order.quoted_amount != null && (
        <div className="mx-4 mb-3 bg-purple-50 border-2 border-purple-200 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-black text-purple-700">💜 Quote received</p>
            <span className="text-base font-black text-purple-700">
              ₹{Number(order.quoted_amount).toFixed(2)}
            </span>
          </div>
          {order.quote_message && (
            <p className="text-xs text-purple-600 font-medium">{order.quote_message}</p>
          )}
        </div>
      )}

      {/* Expanded items */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-3 bg-gray-50">
          {/* Items list */}
          <div>
            <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-2">
              Requested Items
            </p>
            <ul className="space-y-1.5">
              {items.map((it: any, i: number) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                  <span className="font-semibold text-gray-800">
                    {it.quantity ?? 1} {it.unit ?? ''} — {it.name}
                  </span>
                  {it.price > 0 && (
                    <span className="ml-auto text-xs font-black text-purple-600">
                      ₹{it.price}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Reference image */}
          {order.image_url && (
            <div>
              <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-2">
                Reference Image
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={order.image_url} alt="Reference"
                className="w-full h-40 object-cover rounded-xl border border-gray-200"
              />
            </div>
          )}

          {/* Description */}
          {order.description && (
            <div>
              <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1">
                Notes
              </p>
              <p className="text-sm text-gray-700 font-medium">{order.description}</p>
            </div>
          )}

          {/* Financial summary */}
          {(order.total_amount != null || order.delivery_fee != null) && (
            <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-1">
              {order.delivery_fee != null && (
                <div className="flex justify-between text-xs font-semibold text-gray-600">
                  <span>Delivery Fee</span>
                  <span>₹{Number(order.delivery_fee).toFixed(2)}</span>
                </div>
              )}
              {order.total_amount != null && (
                <div className="flex justify-between text-sm font-black text-gray-900 pt-1
                                border-t border-gray-100 mt-1">
                  <span>Total</span>
                  <span className="text-purple-600">₹{Number(order.total_amount).toFixed(2)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function MyCustomOrders() {
  const { user }  = useAuth();
  const [orders,  setOrders]  = useState<CustomOrderRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('custom_order_requests')
          .select('id,custom_order_ref,status,category,description,image_url,items,' +
                  'quoted_amount,quote_message,total_amount,delivery_fee,payment_method,' +
                  'created_at,updated_at')
          .eq('customer_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (!error) setOrders((data || []) as unknown as CustomOrderRequest[]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto rounded-full bg-purple-50 border-2 border-purple-100
                        flex items-center justify-center mb-4">
          <ClipboardList className="w-9 h-9 text-purple-300" />
        </div>
        <h3 className="font-black text-gray-900 mb-1">No requests yet</h3>
        <p className="text-sm text-gray-500 font-medium">
          Your submitted custom requests will appear here
        </p>
      </div>
    );
  }

  const pending  = orders.filter(o => o.status === 'pending' || o.status === 'reviewing');
  const quoted   = orders.filter(o => o.status === 'quoted');
  const active   = orders.filter(o => ['confirmed','processing'].includes(o.status));
  const done     = orders.filter(o => ['delivered','cancelled'].includes(o.status));

  const Section = ({ title, items }: { title: string; items: CustomOrderRequest[] }) =>
    items.length > 0 ? (
      <div className="space-y-3">
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{title}</p>
        {items.map(o => <OrderCard key={o.id} order={o} />)}
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      {quoted.length > 0 && (
        <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-3">
          <p className="text-xs font-black text-purple-700 mb-1">
            🎉 {quoted.length} quote{quoted.length > 1 ? 's' : ''} awaiting your review
          </p>
        </div>
      )}
      <Section title="Awaiting review"  items={pending} />
      <Section title="Quoted"           items={quoted} />
      <Section title="Active"           items={active} />
      <Section title="Completed"        items={done} />
    </div>
  );
}

