 
'use client';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Tag, MapPin, Check, X, Loader2, ChevronDown, Sparkles } from 'lucide-react';
import type { PromoCode } from '@/services/promoCodes';

// ─── Props ─────────────────────────────────────────────────────────────────────
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

  // ── Promo ────────────────────────────────────────────────────────────────────
  promoCode         : string;                   // current input value
  appliedPromo      : PromoCode | null;
  applyingPromo     : boolean;
  promoMessage?     : string;                   // ← NEW: message from useCartPromo hook
  isBxgyPromo?      : boolean;                  // ← NEW: true when BXGY offer is active
  showPromoList     : boolean;
  availablePromos   : PromoCode[];

  // ── Callbacks ────────────────────────────────────────────────────────────────
  onPromoCodeChange : (v: string) => void;
  onApplyPromo      : (code?: string) => void;
  onRemovePromo     : () => void;
  onTogglePromoList : () => void;
  onCheckout        : () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function BillSummary({
  subtotal, promoDiscount, deliveryFee, deliveryBreakdown,
  showDeliveryFee, tax, gstEnabled, gstPct, finalTotal, totalSavings,
  validating,
  promoCode, appliedPromo, applyingPromo,
  promoMessage, isBxgyPromo = false,
  showPromoList, availablePromos,
  onPromoCodeChange, onApplyPromo, onRemovePromo, onTogglePromoList,
  onCheckout,
}: Props) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Bill Summary</h2>

      {/* ── Promo code section ───────────────────────────────────────────────── */}
      <div className="border-b pb-4">
        {!appliedPromo ? (
          <>
            {/* Manual code input — hidden for BXGY-only flows if you prefer */}
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={promoCode}
                onChange={e => onPromoCodeChange(e.target.value)}
                placeholder="Enter promo code"
                className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg
                           focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                disabled={applyingPromo}
              />
              <button
                onClick={() => onApplyPromo()}
                disabled={!promoCode.trim() || applyingPromo}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-orange-600
                           font-semibold disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center gap-2"
              >
                {applyingPromo
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : 'Apply'}
              </button>
            </div>

            {/* Offer list picker */}
            {availablePromos.length > 0 && (
              <button
                onClick={onTogglePromoList}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <Tag className="w-3 h-3" />
                {showPromoList ? 'Hide' : 'View'} available offers ({availablePromos.length})
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
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        {promo.discount_type === 'percentage'
                          ? `${promo.discount_value}% OFF`
                          : `₹${promo.discount_value} OFF`}
                      </span>
                    </div>
                    {promo.description && (
                      <p className="text-xs text-gray-600">{promo.description}</p>
                    )}
                    {(promo.min_order_amount ?? 0) > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Min order ₹{promo.min_order_amount}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          /* ── Applied promo chip ─────────────────────────────────────────── */
          <div className={`border-2 rounded-lg p-3 ${
            isBxgyPromo
              ? 'bg-purple-50 border-purple-200'     // BXGY = purple chip
              : 'bg-green-50  border-green-200'       // cart discount = green chip
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isBxgyPromo
                  ? <Sparkles className="w-5 h-5 text-purple-600" />
                  : <Check     className="w-5 h-5 text-green-600" />}

                <div>
                  <p className={`font-bold ${
                    isBxgyPromo ? 'text-purple-700' : 'text-green-700'
                  }`}>
                    {appliedPromo.code}
                    {isBxgyPromo && (
                      <span className="ml-2 text-xs font-semibold opacity-75">
                        BXGY offer
                      </span>
                    )}
                  </p>

                  {/* Show hook message (e.g. "Saved ₹40.00") or fallback */}
                  {(promoMessage || promoDiscount > 0) && (
                    <p className={`text-xs ${
                      isBxgyPromo ? 'text-purple-600' : 'text-green-600'
                    }`}>
                      {promoMessage ?? `Saved ₹${promoDiscount.toFixed(2)}`}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={onRemovePromo}
                className={`p-1 rounded transition-colors ${
                  isBxgyPromo
                    ? 'hover:bg-purple-100'
                    : 'hover:bg-green-100'
                }`}
              >
                <X className={`w-4 h-4 ${
                  isBxgyPromo ? 'text-purple-700' : 'text-green-700'
                }`} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Price breakdown ──────────────────────────────────────────────────── */}
      <div className="space-y-3 pb-4 border-b">
        <Row label="Item Total"     value={`₹${subtotal.toFixed(2)}`} />

        {promoDiscount > 0 && (
          <Row
            label={`Promo (${appliedPromo?.code ?? ''})`}
            value={`-₹${promoDiscount.toFixed(2)}`}
            green
          />
        )}

        {showDeliveryFee && (
          <>
            <Row label="Delivery Fee" value={`₹${deliveryFee.toFixed(2)}`} />
            {deliveryBreakdown && (
              <p className="text-xs text-gray-500 pl-4">{deliveryBreakdown}</p>
            )}
          </>
        )}

        {gstEnabled && gstPct > 0 && (
          <Row label={`GST (${gstPct}%)`} value={`₹${tax.toFixed(2)}`} />
        )}
      </div>

      {/* ── Total ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-lg font-bold text-gray-900">Total</span>
        <div className="text-right">
          <span className="text-2xl font-bold text-primary">
            ₹{finalTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* ── Savings banner ───────────────────────────────────────────────────── */}
      {totalSavings > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-green-700">
            <Tag className="w-4 h-4" />
            <span className="text-sm font-semibold">
              Total Savings ₹{totalSavings.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* ── Checkout button ──────────────────────────────────────────────────── */}
      <button
        onClick={onCheckout}
        disabled={validating}
        className="w-full bg-primary text-white py-4 rounded-xl hover:bg-orange-600
                   font-bold text-lg transition-colors disabled:opacity-50
                   disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {validating && <Loader2 className="w-5 h-5 animate-spin" />}
        {validating ? 'Validating…' : 'Proceed to Checkout'}
      </button>

      <div className="flex items-start gap-2 text-xs text-gray-500">
        <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
        <p>Delivery fee is estimated based on your default address.</p>
      </div>
    </div>
  );
}

// ── Small helper ────────────────────────────────────────────────────────────────
function Row({
  label, value, green = false,
}: { label: string; value: string; green?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={green ? 'text-green-600' : 'text-gray-600'}>{label}</span>
      <span className={`font-semibold ${green ? 'text-green-600' : 'text-gray-900'}`}>
        {value}
      </span>
    </div>
  );
}
