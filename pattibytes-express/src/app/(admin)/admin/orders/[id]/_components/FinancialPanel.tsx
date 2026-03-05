'use client';
import { IndianRupee, AlertTriangle, Wallet } from 'lucide-react';
import { toINR, type OrderNormalized } from './types';
import type { CustomOrderRequest } from './types';

interface Props {
  order: OrderNormalized;
  customRequest?: CustomOrderRequest | null;
}

export function FinancialPanel({ order, customRequest }: Props) {
  const isCustomOrder = order.orderType === 'custom' || !!order.customOrderRef;

  // For custom orders: total_amount in orders table is the customer's budget.
  // The actual cost breakdown lives in custom_order_requests.
  const customerBudget = isCustomOrder
    ? (customRequest?.total_amount ?? order.totalAmount)
    : null;

  const computedTotal = Math.max(0,
    order.subtotal - order.discount + order.deliveryFee + order.tax
  );
  const dbTotal  = order.totalAmount;
  const mismatch = !isCustomOrder && Math.abs(computedTotal - dbTotal) > 0.5;

  const payColor: Record<string, string> = {
    paid:     'bg-green-100 text-green-700 border-green-200',
    pending:  'bg-yellow-100 text-yellow-700 border-yellow-200',
    failed:   'bg-red-100 text-red-700 border-red-200',
    refunded: 'bg-blue-100 text-blue-700 border-blue-200',
  };
  const payBadge = payColor[order.paymentStatus ?? 'pending'] ?? 'bg-gray-100 text-gray-600 border-gray-200';

  // ── Custom order layout ────────────────────────────────────────────────────
  if (isCustomOrder) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-violet-500" /> Customer Budget
        </h3>

        {/* Big budget display */}
        <div className="bg-gradient-to-br from-violet-50 to-pink-50 rounded-2xl p-5 border border-violet-100 text-center mb-4">
          <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
            Customer&apos;s Stated Budget
          </p>
          <p className="text-4xl font-black text-violet-700">
            {toINR(customerBudget ?? 0)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            This is what the customer wants to spend — not a calculated total
          </p>
        </div>

        {/* Delivery fee (if any) */}
        {(customRequest?.delivery_fee ?? order.deliveryFee) > 0 && (
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">Delivery Fee</span>
            <span className="font-semibold text-gray-900">
              {toINR(customRequest?.delivery_fee ?? order.deliveryFee)}
            </span>
          </div>
        )}

        {/* Quoted amount (admin side) */}
        {order.quotedAmount != null && (
          <div className="flex justify-between text-sm mb-3">
            <span className="text-gray-500">Admin Quoted</span>
            <span className="font-bold text-violet-700">{toINR(order.quotedAmount)}</span>
          </div>
        )}

        {/* Payment */}
        <div className="pt-3 border-t flex items-center justify-between flex-wrap gap-2 mt-1">
          <div>
            <p className="text-xs text-gray-500">Payment Method</p>
            <p className="font-bold text-gray-900 uppercase text-sm">
              {customRequest?.payment_method ?? order.paymentMethod ?? 'N/A'}
            </p>
          </div>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full border uppercase ${payBadge}`}>
            {order.paymentStatus ?? 'pending'}
          </span>
        </div>

        {/* Description from custom_order_requests */}
        {customRequest?.description && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs font-bold text-gray-500 mb-1.5">📝 Customer Description</p>
            <p className="text-sm text-gray-800 whitespace-pre-line bg-gray-50 rounded-xl p-3 border">
              {customRequest.description}
            </p>
          </div>
        )}

        {/* Admin notes */}
        {customRequest?.admin_notes && (
          <div className="mt-3">
            <p className="text-xs font-bold text-amber-700 mb-1.5">🗒 Admin Notes</p>
            <p className="text-sm text-amber-900 whitespace-pre-line bg-amber-50 rounded-xl p-3 border border-amber-100">
              {customRequest.admin_notes}
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── Regular order layout ───────────────────────────────────────────────────
  const lines = [
    { label: 'Subtotal',    value: toINR(order.subtotal),    color: '' },
    ...(order.discount > 0
      ? [{ label: `Discount${order.promoCode ? ` (${order.promoCode})` : ''}`,
           value: `-${toINR(order.discount)}`, color: 'text-green-600 font-bold' }]
      : []),
    { label: 'Delivery Fee', value: toINR(order.deliveryFee), color: '' },
    { label: 'GST / Tax',    value: toINR(order.tax),         color: '' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6">
      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
        <IndianRupee className="w-5 h-5 text-primary" /> Bill Summary
      </h3>

      <div className="space-y-2.5 text-sm">
        {lines.map(l => (
          <div key={l.label} className="flex justify-between items-center">
            <span className="text-gray-500">{l.label}</span>
            <span className={`font-semibold ${l.color || 'text-gray-900'}`}>{l.value}</span>
          </div>
        ))}

        {order.deliveryDistanceKm != null && (
          <p className="text-[11px] text-gray-400 text-right -mt-1">
            ({Number(order.deliveryDistanceKm).toFixed(2)} km)
          </p>
        )}

        <div className="flex justify-between items-end pt-3 border-t-2 border-gray-200">
          <span className="font-bold text-gray-900">Total</span>
          <span className="text-2xl font-black text-primary">{toINR(dbTotal)}</span>
        </div>

        {mismatch && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-1">
            <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Total Mismatch
            </p>
            <p className="text-xs text-amber-700">
              Computed: <strong>{toINR(computedTotal)}</strong>
              {' · '}DB: <strong>{toINR(dbTotal)}</strong>
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-xs text-gray-500">Payment Method</p>
          <p className="font-bold text-gray-900 uppercase text-sm">{order.paymentMethod ?? 'N/A'}</p>
        </div>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full border uppercase ${payBadge}`}>
          {order.paymentStatus ?? 'pending'}
        </span>
      </div>
    </div>
  );
}
