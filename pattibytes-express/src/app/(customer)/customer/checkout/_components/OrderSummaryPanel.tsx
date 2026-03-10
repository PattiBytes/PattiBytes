'use client';

import { Loader2, MapPin, IndianRupee, AlertCircle, Sparkles } from 'lucide-react';
import type { BxgyFreeItem } from '@/hooks/useCartPromo';

interface OrderItem {
  name               : string;
  quantity           : number;
  price              : number;
  discount_percentage?: number;
}

interface Props {
  items            : OrderItem[];
  subtotal         : number;
  promoDiscount    : number;
  promoCode        : string | null;
  deliveryFee      : number;
  deliveryDistance : number;
  deliveryBreakdown: string;
  showDeliveryFee  : boolean;
  tax              : number;
  gstEnabled       : boolean;
  gstPct           : number;
  finalTotal       : number;
  isShopCart       : boolean;
  hasAddress       : boolean;
  addressComplete  : boolean;
  liveReady        : boolean;
  placing          : boolean;
  onPlaceOrder     : () => void;

  // ── Promo display (optional — graceful if not passed) ──────────────────
  bxgyFreeItems?   : BxgyFreeItem[];
  promoMessage?    : string;
  isBxgyPromo?     : boolean;
}

export function OrderSummaryPanel({
  items, subtotal, promoDiscount, promoCode,
  deliveryFee, deliveryDistance, deliveryBreakdown,
  showDeliveryFee, tax, gstEnabled, gstPct,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  finalTotal, isShopCart, hasAddress, addressComplete,
  liveReady, placing, onPlaceOrder,
  bxgyFreeItems = [], promoMessage, isBxgyPromo = false,
}: Props) {

  const canPlace = hasAddress && addressComplete && liveReady && !placing;
  const hasFreeItems = isBxgyPromo && bxgyFreeItems.length > 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 text-base">Order Summary</h2>
      </div>

      {/* ── Line items ──────────────────────────────────────────────────── */}
      <div className="px-5 py-3 space-y-2 border-b border-gray-50 max-h-52 overflow-y-auto">
        {items.map((item, i) => {
          const effectivePrice =
            item.discount_percentage && item.discount_percentage > 0
              ? item.price * (1 - item.discount_percentage / 100)
              : item.price;
          return (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-gray-700 truncate max-w-[65%]">
                {item.name}
                <span className="text-gray-400 ml-1">× {item.quantity}</span>
              </span>
              <span className="font-medium text-gray-900">
                ₹{(effectivePrice * item.quantity).toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── BXGY free items section ─────────────────────────────────────── */}
      {hasFreeItems && (
        <div className="px-5 py-3 border-b border-purple-100 bg-purple-50/50">
          <p className="text-xs font-semibold text-purple-700 mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Free items from offer
          </p>
          <div className="space-y-2">
            {bxgyFreeItems.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-white rounded-lg px-3 py-1.5
                           border border-purple-100"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] bg-purple-600 text-white
                                   px-1.5 py-0.5 rounded font-bold flex-shrink-0">
                    FREE
                  </span>
                  <span className="text-sm text-gray-800 truncate">
                    {item.name}
                    {item.qty > 1 && (
                      <span className="text-gray-400"> × {item.qty}</span>
                    )}
                  </span>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <span className="text-xs text-gray-400 line-through block leading-none">
                    ₹{(item.originalPrice * item.qty).toFixed(2)}
                  </span>
                  <span className="text-sm font-bold text-purple-700 leading-none">
                    ₹0.00
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Price breakdown ─────────────────────────────────────────────── */}
      <div className="px-5 py-3 space-y-2 border-b border-gray-100">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Item Total</span>
          <span className="font-medium text-gray-900">₹{subtotal.toFixed(2)}</span>
        </div>

        {promoDiscount > 0 && (
          <div className="flex justify-between text-sm">
            <span className={isBxgyPromo ? 'text-purple-600' : 'text-green-600'}>
              {isBxgyPromo ? 'BXGY Discount' : `Promo${promoCode ? ` (${promoCode})` : ''}`}
            </span>
            <span className={`font-semibold ${isBxgyPromo ? 'text-purple-600' : 'text-green-600'}`}>
              −₹{promoDiscount.toFixed(2)}
            </span>
          </div>
        )}

        {promoMessage && promoDiscount > 0 && (
          <p className={`text-xs ${isBxgyPromo ? 'text-purple-500' : 'text-green-500'}`}>
            {promoMessage}
          </p>
        )}

        {showDeliveryFee && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Delivery Fee
                {deliveryDistance > 0 && (
                  <span className="text-gray-400 text-xs">
                    ({deliveryDistance.toFixed(2)} km)
                  </span>
                )}
              </span>
              <span className="font-medium text-gray-900">₹{deliveryFee.toFixed(2)}</span>
            </div>
            {deliveryBreakdown && (
              <p className="text-xs text-gray-400 pl-4">{deliveryBreakdown}</p>
            )}
          </>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-gray-500">
            {gstEnabled && gstPct > 0 ? `GST (${gstPct}%)` : 'Taxes & Fees'}
          </span>
          <span className="font-medium text-gray-900">₹{tax.toFixed(2)}</span>
        </div>
      </div>

      {/* ── Total ───────────────────────────────────────────────────────── */}
      <div className="px-5 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <span className="font-bold text-gray-900">Total</span>
          <div className="flex items-center gap-0.5">
            <IndianRupee className="w-4 h-4 text-primary" />
            <span className="text-xl font-bold text-primary">{finalTotal.toFixed(2)}</span>
          </div>
        </div>
        {promoDiscount > 0 && (
          <p className={`text-xs mt-1 font-semibold
            ${isBxgyPromo ? 'text-purple-600' : 'text-green-600'}`}>
            🎉 You save ₹{promoDiscount.toFixed(2)} on this order!
          </p>
        )}
      </div>

      {/* ── Place Order button ───────────────────────────────────────────── */}
      <div className="px-5 py-4 space-y-3">
        {!hasAddress && (
          <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            Select a delivery address to continue
          </p>
        )}
        {hasAddress && !addressComplete && (
          <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            Address needs landmark + 10-digit phone
          </p>
        )}
        {hasAddress && addressComplete && !liveReady && (
          <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            Enable live location above to place order
          </p>
        )}

        <button
          onClick={onPlaceOrder}
          disabled={!canPlace}
          className="w-full bg-primary text-white py-3.5 rounded-xl font-bold text-base
                     hover:bg-orange-600 transition-colors disabled:opacity-50
                     disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {placing ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Placing Order…</>
          ) : (
            `Place Order • ₹${finalTotal.toFixed(2)}`
          )}
        </button>

        <p className="text-center text-xs text-gray-400">
          By placing this order, you agree to our terms.
        </p>
      </div>
    </div>
  );
}
