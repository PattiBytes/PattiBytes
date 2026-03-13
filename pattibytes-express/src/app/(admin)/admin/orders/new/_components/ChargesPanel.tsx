'use client';
import { DollarSign } from 'lucide-react';
import { toINR } from './utils';
import { IC } from './utils';

interface Props {
  subtotal: number;
  itemDiscountTotal: number;
  promoDiscount: number;
  discount: number; setDiscount: (n: number) => void;
  tax: number; setTax: (n: number) => void;
  extraCharges: number; setExtraCharges: (n: number) => void;
  autoGst: boolean; setAutoGst: (v: boolean) => void;
  totalAmount: number;
  promoCodes: { id: string; code: string; description?: string | null }[];
  selectedPromoCode: string; setSelectedPromoCode: (v: string) => void;
  promoApplied: boolean;
  applyPromo: () => void;
  status: string; setStatus: (v: string) => void;
  paymentMethod: 'cod' | 'online'; setPaymentMethod: (v: 'cod' | 'online') => void;
  paymentStatus: 'pending' | 'paid' | 'failed'; setPaymentStatus: (v: 'pending' | 'paid' | 'failed') => void;
  customerNotes: string; setCustomerNotes: (v: string) => void;
  specialInstructions: string; setSpecialInstructions: (v: string) => void;
  recipientName: string; setRecipientName: (v: string) => void;
  deliveryInstructions: string; setDeliveryInstructions: (v: string) => void;
  merchantGst: boolean;
}

const Row = ({ label, value, green, red }: { label: string; value: string; green?: boolean; red?: boolean }) => (
  <div className="flex justify-between items-center text-sm">
    <span className="text-gray-500 font-medium">{label}</span>
    <span className={`font-bold ${green ? 'text-green-600' : red ? 'text-red-500' : 'text-gray-900'}`}>
      {value}
    </span>
  </div>
);

export function ChargesPanel({
  subtotal, itemDiscountTotal, promoDiscount,
  discount, setDiscount, tax, setTax, extraCharges, setExtraCharges,
  autoGst, setAutoGst, totalAmount,
  promoCodes, selectedPromoCode, setSelectedPromoCode, promoApplied, applyPromo,
  status, setStatus, paymentMethod, setPaymentMethod,
  paymentStatus, setPaymentStatus,
  customerNotes, setCustomerNotes,
  specialInstructions, setSpecialInstructions,
   recipientName, setRecipientName,
  deliveryInstructions, setDeliveryInstructions,
  merchantGst,
}: Props) {
  return (
    <div className="space-y-4">

      {/* ── Promo code ── */}
      {promoCodes.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border p-4 space-y-3">
          <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-pink-500 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5 text-white" />
            </span>
            Promo Code
          </h3>
          <div className="flex gap-2">
            <select
              value={selectedPromoCode}
              onChange={e => { setSelectedPromoCode(e.target.value); }}
              className={IC}
            >
              <option value="">— None —</option>
              {promoCodes.map(p => (
                <option key={p.id} value={p.code}>
                  {p.code}{p.description ? ` – ${p.description}` : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={applyPromo}
              className="px-4 py-2 rounded-xl bg-pink-500 text-white font-bold text-sm
                         hover:bg-pink-600 transition-all hover:scale-105 active:scale-95
                         whitespace-nowrap"
            >
              {promoApplied ? '✓ Applied' : 'Apply'}
            </button>
          </div>
          {promoApplied && promoDiscount > 0 && (
            <p className="text-xs font-bold text-green-600 bg-green-50 px-3 py-2 rounded-xl
                          border border-green-200">
              🎉 Promo discount: −{toINR(promoDiscount)}
            </p>
          )}
        </div>
      )}

      {/* ── Adjustable charges ── */}
      <div className="bg-white rounded-2xl shadow-sm border p-4 space-y-3">
        <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-green-500 flex items-center justify-center">
            <DollarSign className="w-3.5 h-3.5 text-white" />
          </span>
          Charges & Adjustments
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Discount (₹)</label>
            <input type="number" min={0} step="0.5" value={discount}
              onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
              className={IC} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Extra Charges (₹)</label>
            <input type="number" min={0} step="0.5" value={extraCharges}
              onChange={e => setExtraCharges(parseFloat(e.target.value) || 0)}
              className={IC} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">
              Tax / GST (₹)
              {merchantGst && (
                <label className="ml-2 cursor-pointer inline-flex items-center gap-1 font-normal text-gray-400">
                  <input type="checkbox" checked={autoGst}
                    onChange={e => setAutoGst(e.target.checked)}
                    className="rounded w-3 h-3" />
                  auto
                </label>
              )}
            </label>
            <input type="number" min={0} step="0.01" value={tax}
              onChange={e => setTax(parseFloat(e.target.value) || 0)}
              disabled={autoGst && merchantGst}
              className={`${IC} disabled:bg-gray-50 disabled:text-gray-400`} />
          </div>
        </div>

        {/* Bill summary */}
        <div className="mt-2 bg-gray-50 rounded-xl p-3.5 space-y-1.5 border">
          <Row label="Items subtotal" value={toINR(subtotal)} />
          {itemDiscountTotal > 0 &&
            <Row label="Item discounts" value={`−${toINR(itemDiscountTotal)}`} green />}
          {discount > 0 &&
            <Row label="Manual discount" value={`−${toINR(discount)}`} green />}
          {promoDiscount > 0 &&
            <Row label="Promo discount" value={`−${toINR(promoDiscount)}`} green />}
          {tax > 0 &&
            <Row label="Tax / GST" value={`+${toINR(tax)}`} />}
          {extraCharges > 0 &&
            <Row label="Extra charges" value={`+${toINR(extraCharges)}`} />}
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <span className="font-black text-gray-900">Total</span>
            <span className="font-black text-xl text-primary">{toINR(totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* ── Payment & Status ── */}
      <div className="bg-white rounded-2xl shadow-sm border p-4 space-y-3">
        <h3 className="font-bold text-gray-800 text-sm">Payment & Status</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Order Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className={IC}>
              {['pending','confirmed','preparing','ready','out_for_delivery','delivered','cancelled'].map(s => (
                <option key={s} value={s}>
                  {s.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Payment Method</label>
            <select value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value as 'cod' | 'online')}
              className={IC}>
              <option value="cod">Cash on Delivery</option>
              <option value="online">Online</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Payment Status</label>
            <select value={paymentStatus}
              onChange={e => setPaymentStatus(e.target.value as 'pending' | 'paid' | 'failed')}
              className={IC}>
              {['pending','paid','failed'].map(s => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Notes & Recipient ── */}
      <div className="bg-white rounded-2xl shadow-sm border p-4 space-y-3">
        <h3 className="font-bold text-gray-800 text-sm">Notes & Recipient</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Recipient Name</label>
            <input type="text" value={recipientName}
              onChange={e => setRecipientName(e.target.value)}
              placeholder="e.g. Ranjit Singh"
              className={IC} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Delivery Instructions</label>
            <input type="text" value={deliveryInstructions}
              onChange={e => setDeliveryInstructions(e.target.value)}
              placeholder="e.g. Leave at door"
              className={IC} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Customer Notes</label>
          <textarea rows={2} value={customerNotes}
            onChange={e => setCustomerNotes(e.target.value)}
            className={`${IC} resize-none`} />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Special Instructions</label>
          <textarea rows={2} value={specialInstructions}
            onChange={e => setSpecialInstructions(e.target.value)}
            className={`${IC} resize-none`} />
        </div>
      </div>
    </div>
  );
}
