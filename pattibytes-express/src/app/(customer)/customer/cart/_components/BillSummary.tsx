'use client';

import {
  Tag, IndianRupee, MapPin, AlertCircle,
  Loader2, Check, X, Sparkles,
} from 'lucide-react';
import type { PromoCode } from '@/services/promoCodes';

interface Props {
  subtotal          : number;
  promoDiscount     : number;
  deliveryFee       : number;
  deliveryBreakdown : string;
  showDeliveryFee   : boolean;
  tax               : number;
  gstEnabled        : boolean;
  gstPct            : number;
  finalTotal        : number;
  totalSavings      : number;
  validating        : boolean;

  promoCode         : string;
  appliedPromo      : PromoCode | null;
  applyingPromo     : boolean;
  promoMessage?     : string;   // ← NEW: message from useCartPromo hook
  isBxgyPromo?      : boolean;  // ← NEW: true when a BXGY offer is active
  showPromoList     : boolean;
  availablePromos   : PromoCode[];

  onPromoCodeChange : (v: string) => void;
  onApplyPromo      : (code?: string) => void;
  onRemovePromo     : () => void;
  onTogglePromoList : () => void;
  onCheckout        : () => void;
}

export function BillSummary({
  subtotal, promoDiscount, deliveryFee, deliveryBreakdown,
  showDeliveryFee, tax, gstEnabled, gstPct, finalTotal,
  totalSavings, validating,
  promoCode, appliedPromo, applyingPromo,
  promoMessage, isBxgyPromo = false,
  showPromoList, availablePromos,
  onPromoCodeChange, onApplyPromo, onRemovePromo,
  onTogglePromoList, onCheckout,
}: Props) {
  // ── Derived chip colours based on promo type ───────────────────────────────
  const chipBg     = isBxgyPromo ? 'bg-purple-50'    : 'bg-green-50';
  const chipBorder = isBxgyPromo ? 'border-purple-200' : 'border-green-200';
  const chipText   = isBxgyPromo ? 'text-purple-700' : 'text-green-700';
  const chipSub    = isBxgyPromo ? 'text-purple-600' : 'text-green-600';
  const chipHover  = isBxgyPromo ? 'hover:bg-purple-100' : 'hover:bg-green-100';

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Bill Summary</h2>

      {/* ── Promo section ─────────────────────────────────────────── */}
      <div className="border-b pb-4">
        {!appliedPromo ? (
          <>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={promoCode}
                onChange={e => onPromoCodeChange(e.target.value.toUpperCase())}
                placeholder="Enter promo code"
                disabled={applyingPromo}
                className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg
                           focus:ring-2 focus:ring-primary focus:border-primary text-sm"
              />
              <button
                onClick={() => onApplyPromo()}
                disabled={!promoCode.trim() || applyingPromo}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-orange-600
                           font-semibold disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center gap-2"
              >
                {applyingPromo ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
              </button>
            </div>

            {availablePromos.length > 0 && (
              <button
                onClick={onTogglePromoList}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <Tag className="w-3 h-3" />
                View available offers ({availablePromos.length})
              </button>
            )}

            {showPromoList && (
              <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                {availablePromos.map(promo => (
                  <button
                    key={promo.id}
                    onClick={() => onApplyPromo(promo.code)}
                    className="w-full text-left p-3 border-2 border-gray-200 rounded-lg
                               hover:border-primary transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-primary">{promo.code}</span>
                      <span className="text-xs bg-green-100 text-green-700
                                       px-2 py-0.5 rounded-full">
                        {promo.discount_type === 'percentage'
                          ? `${promo.discount_value}% OFF`
                          : `₹${promo.discount_value} OFF`}
                      </span>
                    </div>
                    {promo.description && (
                      <p className="text-xs text-gray-600">{promo.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Min order: ₹{promo.min_order_amount}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          /* ── Applied promo chip — green for cart discount, purple for BXGY ── */
          <div className={`${chipBg} border-2 ${chipBorder} rounded-lg p-3`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isBxgyPromo
                  ? <Sparkles className={`w-5 h-5 ${chipText}`} />
                  : <Check    className={`w-5 h-5 ${chipText}`} />}

                <div>
                  <p className={`font-bold ${chipText}`}>
                    {appliedPromo.code}
                    {isBxgyPromo && (
                      <span className="ml-2 text-xs font-semibold opacity-70">
                        BXGY offer
                      </span>
                    )}
                  </p>
                  <p className={`text-xs ${chipSub}`}>
                    {/* Prefer message from hook; fall back to generic "Saved" label */}
                    {promoMessage ?? `Saved ₹${promoDiscount.toFixed(2)}`}
                  </p>
                </div>
              </div>

              <button
                onClick={onRemovePromo}
                className={`p-1 ${chipHover} rounded transition-colors`}
              >
                <X className={`w-4 h-4 ${chipText}`} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Price breakdown ───────────────────────────────────────── */}
      <div className="space-y-3 pb-4 border-b">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Item Total</span>
          <span className="font-semibold text-gray-900">₹{subtotal.toFixed(2)}</span>
        </div>

        {promoDiscount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-green-600">Promo Discount</span>
            <span className="font-semibold text-green-600">
              -₹{promoDiscount.toFixed(2)}
            </span>
          </div>
        )}

        {showDeliveryFee && (
          <>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-gray-600" />
                <span className="text-gray-600">Delivery Fee</span>
              </div>
              <span className="font-semibold text-gray-900">₹{deliveryFee.toFixed(2)}</span>
            </div>
            {deliveryBreakdown && (
              <p className="text-xs text-gray-500 pl-4">{deliveryBreakdown}</p>
            )}
          </>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {gstEnabled && gstPct > 0 ? `GST (${gstPct}%)` : 'Taxes & Fees'}
          </span>
          <span className="font-semibold text-gray-900">₹{tax.toFixed(2)}</span>
        </div>
      </div>

      {/* ── Total ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-lg font-bold text-gray-900">Total</span>
        <div className="flex items-center gap-1">
          <IndianRupee className="w-5 h-5 text-primary" />
          <span className="text-2xl font-bold text-primary">{finalTotal.toFixed(2)}</span>
        </div>
      </div>

      {totalSavings > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-green-700">
            <Tag className="w-4 h-4" />
            <span className="text-sm font-semibold">
              Total Savings: ₹{totalSavings.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      <button
        onClick={onCheckout}
        disabled={validating}
        className="w-full bg-primary text-white py-4 rounded-xl hover:bg-orange-600
                   font-bold text-lg transition-colors disabled:opacity-50
                   disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {validating
          ? <><Loader2 className="w-5 h-5 animate-spin" /> Validating…</>
          : 'Proceed to Checkout'}
      </button>

      <div className="flex items-start gap-2 text-xs text-gray-600">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>Review your order carefully. Prices and availability are subject to change.</p>
      </div>
    </div>
  );
}
