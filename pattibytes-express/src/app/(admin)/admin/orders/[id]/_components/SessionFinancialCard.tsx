// pattibytes-express/src/app/(admin)/admin/orders/[id]/_components/SessionFinancialCard.tsx

'use client';

import { Receipt, TrendingDown, Truck, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type MerchantBill = {
  merchant_id:      string;
  merchant_name:    string;
  subtotal:         number;
  delivery_fee:     number;
  tax:              number;
  discount:         number;
  promo_code?:      string | null;
  is_free_delivery?: boolean;
  total:            number;
};

type SessionSummary = {
  id:             string;
  total_amount:   number;
  merchant_ids:   string[] | null;
  order_ids:      string[] | null;
  status:         string;
  payment_method: string | null;
  payment_status: string | null;
  merchant_bills: MerchantBill[] | null;
  discount:       number;
  created_at:     string;
};

type Props = {
  session:        SessionSummary;
  currentOrderId: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number | null | undefined) {
  if (v == null) return '—';
  return `₹${Number(v).toLocaleString('en-IN', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })}`;
}

function BillRow({
  label, value, sub, green, bold, faint, indent,
}: {
  label:   string;
  value:   string;
  sub?:    string;
  green?:  boolean;
  bold?:   boolean;
  faint?:  boolean;
  indent?: boolean;
}) {
  return (
    <div className={`flex items-start justify-between py-1.5 ${
      indent ? 'pl-4' : ''
    } ${faint ? 'opacity-60' : ''}`}>
      <div className="min-w-0 flex-1 pr-2">
        <span className={`text-xs ${bold ? 'font-bold text-gray-800' : 'text-gray-500'}`}>
          {label}
        </span>
        {sub && (
          <span className="ml-1.5 text-[10px] text-gray-400 font-medium">{sub}</span>
        )}
      </div>
      <span className={`text-xs flex-shrink-0 tabular-nums ${
        bold   ? 'font-extrabold text-gray-900' :
        green  ? 'font-semibold text-green-600' :
                 'font-medium text-gray-700'
      }`}>
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-dashed border-gray-200 my-1.5" />;
}

// ─── Merchant mini-card ───────────────────────────────────────────────────────

function MerchantBillCard({ bill, index }: { bill: MerchantBill; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const COLORS = [
    'bg-teal-500', 'bg-purple-500', 'bg-rose-500',
    'bg-amber-500', 'bg-blue-500', 'bg-emerald-500',
  ];
  const dotColor = COLORS[index % COLORS.length];

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden mb-2 last:mb-0">
      {/* Merchant header row — always visible */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5
          bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotColor}`} />
        <p className="flex-1 text-xs font-bold text-gray-800 truncate">
          {bill.merchant_name}
        </p>
        {bill.promo_code && (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold
            bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full uppercase">
            <Tag size={8} />
            {bill.promo_code}
          </span>
        )}
        <span className="text-xs font-extrabold text-gray-900 ml-1 tabular-nums">
          {fmt(bill.total)}
        </span>
        {expanded
          ? <ChevronUp size={13} className="text-gray-400 flex-shrink-0" />
          : <ChevronDown size={13} className="text-gray-400 flex-shrink-0" />
        }
      </button>

      {/* Expanded breakdown */}
      {expanded && (
        <div className="px-3 py-2 bg-white">
          <BillRow label="Subtotal"     value={fmt(bill.subtotal)} />
          {bill.discount > 0 && (
            <BillRow
              label={`Discount${bill.promo_code ? ` (${bill.promo_code})` : ''}`}
              value={`-${fmt(bill.discount)}`}
              green
            />
          )}
          <BillRow
            label="Delivery fee"
            value={bill.is_free_delivery ? 'Free 🎉' : fmt(bill.delivery_fee)}
            green={bill.is_free_delivery}
            faint={bill.delivery_fee === 0 && !bill.is_free_delivery}
          />
          {bill.tax > 0 && (
            <BillRow label="Tax / GST" value={fmt(bill.tax)} />
          )}
          <Divider />
          <BillRow label="Restaurant total" value={fmt(bill.total)} bold />
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SessionFinancialCard({ session }: Props) {
  const [showBreakdown, setShowBreakdown] = useState(true);

  // Derive grand totals from merchant_bills if available, else use session fields
  const bills = session.merchant_bills ?? [];

  const derivedSubtotal     = bills.length
    ? bills.reduce((s, b) => s + (b.subtotal ?? 0), 0)
    : null;
  const derivedDelivery     = bills.length
    ? bills.reduce((s, b) => s + (b.delivery_fee ?? 0), 0)
    : null;
  const derivedTax          = bills.length
    ? bills.reduce((s, b) => s + (b.tax ?? 0), 0)
    : null;
  const derivedDiscount     = session.discount
    ?? (bills.length ? bills.reduce((s, b) => s + (b.discount ?? 0), 0) : 0);

  const grandTotal          = session.total_amount;
  const merchantCount       = session.merchant_ids?.length ?? bills.length;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

      {/* ── Card header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3
        border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white">
        <div className="flex items-center gap-2">
          <Receipt size={15} className="text-orange-500" />
          <p className="text-sm font-bold text-gray-800">Batch Financial Summary</p>
        </div>
        <span className="text-[10px] font-bold bg-orange-100 text-orange-700
          px-2 py-1 rounded-full uppercase tracking-wide">
          {merchantCount} Restaurant{merchantCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Grand total hero ─────────────────────────────────────────────── */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">
              Grand Total Charged
            </p>
            <p className="text-2xl font-black text-gray-900 tabular-nums">
              {fmt(grandTotal)}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
              session.payment_status === 'paid'
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {(session.payment_status ?? 'pending').toUpperCase()}
            </p>
            <p className="text-[10px] text-gray-400 mt-1">
              via {(session.payment_method ?? 'COD').toUpperCase()}
            </p>
          </div>
        </div>

        {/* Savings badge */}
        {derivedDiscount > 0 && (
          <div className="mt-3 flex items-center gap-1.5 bg-green-50
            border border-green-200 rounded-lg px-3 py-1.5">
            <TrendingDown size={12} className="text-green-600" />
            <p className="text-xs text-green-700 font-semibold">
              You saved {fmt(derivedDiscount)} on this batch order
            </p>
          </div>
        )}
      </div>

      {/* ── Grand totals breakdown ────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-gray-100">
        <button
          onClick={() => setShowBreakdown(v => !v)}
          className="flex items-center gap-1 text-[10px] font-bold
            text-gray-400 uppercase tracking-widest mb-2 hover:text-gray-600
            transition-colors w-full text-left"
        >
          Grand totals breakdown
          {showBreakdown
            ? <ChevronUp size={11} />
            : <ChevronDown size={11} />
          }
        </button>

        {showBreakdown && (
          <>
            {derivedSubtotal != null && (
              <BillRow label="Items subtotal"               value={fmt(derivedSubtotal)} />
            )}
            {derivedDiscount > 0 && (
              <BillRow
                label={`Total discounts (${bills.filter(b => b.promo_code).length} promo${
                  bills.filter(b => b.promo_code).length !== 1 ? 's' : ''
                })`}
                value={`-${fmt(derivedDiscount)}`}
                green
              />
            )}
            {derivedDelivery != null && (
              <BillRow
                label={`Delivery (${merchantCount} routes)`}
                value={fmt(derivedDelivery)}
                sub={derivedDelivery === 0 ? 'all free' : undefined}
                green={derivedDelivery === 0}
              />
            )}
            {derivedTax != null && derivedTax > 0 && (
              <BillRow label="GST / Tax (combined)" value={fmt(derivedTax)} />
            )}
            <Divider />
            <BillRow label="Total payable" value={fmt(grandTotal)} bold />
          </>
        )}
      </div>

      {/* ── Per-merchant breakdown ───────────────────────────────────────── */}
      {bills.length > 0 && (
        <div className="px-4 py-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase
            tracking-widest mb-2.5 flex items-center gap-1.5">
            <Truck size={10} />
            Per-Restaurant Breakdown
          </p>
          {bills.map((bill, i) => (
            <MerchantBillCard key={bill.merchant_id ?? i} bill={bill} index={i} />
          ))}
        </div>
      )}

      {/* ── Session ID footer ─────────────────────────────────────────────── */}
      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100">
        <p className="text-[10px] text-gray-400">
          Batch ID:{' '}
          <span className="font-mono text-gray-600 select-all">
            {session.id}
          </span>
        </p>
      </div>
    </div>
  );
}