/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// pattibytes-express/src/app/(admin)/admin/orders/[id]/_components/SessionOrdersBanner.tsx

'use client';

import { useRouter } from 'next/navigation';
import {
  ShoppingBag, ExternalLink, CheckCircle2,
  Clock, XCircle, Loader2, AlertCircle, ChevronRight,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type SiblingOrder = {
  id:            string;
  order_number:  string | number | null;
  status:        string;
  total_amount:  number | null;
  merchant_name: string;
  order_type?:   string;
};

type SessionSummary = {
  id:             string;
  total_amount:   number;
  merchant_ids:   string[] | null;
  order_ids:      string[] | null;
  status:         string;
  payment_method: string | null;
  payment_status: string | null;
  merchant_bills: any[] | null;
  discount:       number;
  created_at:     string;
};

type Props = {
  /** The multi_cart_sessions row for this order */
  session:          SessionSummary;
  /** The order that is currently being viewed */
  currentOrderId:   string;
  /** Sibling orders in the same session (excluding current) */
  siblingOrders:    SiblingOrder[];
};

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  bg:    string;
  Icon:  React.ElementType;
}> = {
  pending:    { label: 'Pending',    color: 'text-amber-700',  bg: 'bg-amber-50',   Icon: Clock         },
  confirmed:  { label: 'Confirmed',  color: 'text-blue-700',   bg: 'bg-blue-50',    Icon: CheckCircle2  },
  preparing:  { label: 'Preparing',  color: 'text-purple-700', bg: 'bg-purple-50',  Icon: Loader2       },
  ready:      { label: 'Ready',      color: 'text-teal-700',   bg: 'bg-teal-50',    Icon: CheckCircle2  },
  assigned:   { label: 'Assigned',   color: 'text-indigo-700', bg: 'bg-indigo-50',  Icon: Loader2       },
  picked_up:  { label: 'Picked Up',  color: 'text-cyan-700',   bg: 'bg-cyan-50',    Icon: Loader2       },
  delivered:  { label: 'Delivered',  color: 'text-green-700',  bg: 'bg-green-50',   Icon: CheckCircle2  },
  cancelled:  { label: 'Cancelled',  color: 'text-red-700',    bg: 'bg-red-50',     Icon: XCircle       },
  rejected:   { label: 'Rejected',   color: 'text-red-700',    bg: 'bg-red-50',     Icon: XCircle       },
};

const SESSION_STATUS_CONFIG: Record<string, {
  label: string; dot: string; border: string; bg: string;
}> = {
  pending:   { label: 'In Progress',  dot: 'bg-amber-400',  border: 'border-amber-300',  bg: 'bg-amber-50'  },
  partial:   { label: 'Partial',      dot: 'bg-blue-400',   border: 'border-blue-300',   bg: 'bg-blue-50'   },
  completed: { label: 'Completed',    dot: 'bg-green-400',  border: 'border-green-300',  bg: 'bg-green-50'  },
  cancelled: { label: 'Cancelled',    dot: 'bg-red-400',    border: 'border-red-300',    bg: 'bg-red-50'    },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status.replace(/_/g, ' '),
    color: 'text-gray-600',
    bg:    'bg-gray-100',
    Icon:  AlertCircle,
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${cfg.bg} ${cfg.color}`}>
      <cfg.Icon size={9} />
      {cfg.label}
    </span>
  );
}

function fmtCurrency(val: number | null) {
  if (val == null) return '—';
  return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SessionOrdersBanner({ session, currentOrderId, siblingOrders }: Props) {
  const router = useRouter();

  const sessCfg = SESSION_STATUS_CONFIG[session.status] ?? SESSION_STATUS_CONFIG.pending;
  const allOrderCount = session.order_ids?.length ?? 1;
  const deliveredCount = siblingOrders.filter(o => o.status === 'delivered').length
    // count current if delivered too – caller passes current status via session
    + 0; // let the session status handle it

  return (
    <div className={`rounded-xl border-2 ${sessCfg.border} ${sessCfg.bg} mb-5 overflow-hidden`}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-current/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
            <ShoppingBag size={16} className="text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800 leading-tight">
              Multi-Restaurant Batch · {allOrderCount} Orders
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Session {session.id.slice(0, 8).toUpperCase()} · {fmtDate(session.created_at)}
            </p>
          </div>
        </div>

        {/* Session status pill */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${sessCfg.border}`}>
          <span className={`w-2 h-2 rounded-full ${sessCfg.dot} ${
            session.status === 'pending' ? 'animate-pulse' : ''
          }`} />
          <span className="text-xs font-bold text-gray-700">{sessCfg.label}</span>
        </div>
      </div>

      {/* ── Session financials strip ─────────────────────────────────────── */}
      <div className="grid grid-cols-3 divide-x divide-current/10 bg-white/60">
        {[
          {
            label: 'Batch Total',
            value: fmtCurrency(session.total_amount),
            emphasis: true,
          },
          {
            label: 'Discount',
            value: session.discount > 0 ? `-${fmtCurrency(session.discount)}` : '₹0.00',
            green: session.discount > 0,
          },
          {
            label: 'Payment',
            value: (session.payment_method ?? 'COD').toUpperCase(),
            sub: session.payment_status ?? 'pending',
          },
        ].map(({ label, value, emphasis, green, sub }) => (
          <div key={label} className="px-4 py-2.5 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
            <p className={`text-sm font-extrabold ${
              emphasis ? 'text-gray-900' : green ? 'text-green-600' : 'text-gray-700'
            }`}>
              {value}
            </p>
            {sub && (
              <p className={`text-[10px] mt-0.5 font-semibold ${
                sub === 'paid' ? 'text-green-500' : 'text-amber-500'
              }`}>
                {sub.toUpperCase()}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* ── Merchant bills breakdown (if available) ─────────────────────── */}
      {session.merchant_bills && session.merchant_bills.length > 0 && (
        <div className="px-4 py-2 border-t border-current/10">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            Per-Restaurant Bill
          </p>
          <div className="space-y-1">
            {session.merchant_bills.map((bill: any, i: number) => (
              <div key={bill.merchant_id ?? i}
                className="flex items-center justify-between text-xs">
                <span className="text-gray-600 font-medium truncate max-w-[55%]">
                  {bill.merchant_name ?? `Restaurant ${i + 1}`}
                </span>
                <div className="flex items-center gap-3 text-right">
                  {bill.discount > 0 && (
                    <span className="text-green-600 font-semibold">
                      -{fmtCurrency(bill.discount)}
                    </span>
                  )}
                  <span className="text-gray-800 font-bold">
                    {fmtCurrency(bill.total ?? bill.subtotal)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Sibling orders ─────────────────────────────────────────────────── */}
      {siblingOrders.length > 0 && (
        <div className="border-t border-current/10">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 pt-3 pb-1.5">
            Other Orders in This Batch
          </p>
          <div className="divide-y divide-gray-100">
            {siblingOrders.map(order => (
              <button
                key={order.id}
                onClick={() => router.push(`/admin/orders/${order.id}`)}
                className="w-full flex items-center gap-3 px-4 py-2.5
                  hover:bg-white/80 transition-colors text-left group"
              >
                {/* Color dot */}
                <div className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800 truncate">
                    {order.merchant_name}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    Order #{order.order_number ?? order.id.slice(0, 6).toUpperCase()}
                    {order.total_amount != null && ` · ${fmtCurrency(order.total_amount)}`}
                  </p>
                </div>

                {/* Status + arrow */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={order.status} />
                  <ChevronRight
                    size={13}
                    className="text-gray-300 group-hover:text-orange-400 transition-colors"
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Footer note ──────────────────────────────────────────────────── */}
      <div className="px-4 py-2 bg-white/40 border-t border-current/10 flex items-center gap-2">
        <ExternalLink size={10} className="text-gray-400 flex-shrink-0" />
        <p className="text-[10px] text-gray-400 leading-tight">
          This order is part of a multi-restaurant batch placed in a single checkout.
          Each restaurant&apos;s order is tracked independently.
          Session status auto-syncs when all orders deliver or cancel.
        </p>
      </div>
    </div>
  );
}