/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { AlertCircle, Loader2 } from 'lucide-react';

interface Props {
  items:            any[];
  subtotal:         number;
  promoDiscount:    number;
  promoCode:        string | null;
  deliveryFee:      number;
  deliveryDistance: number;
  deliveryBreakdown:string;
  showDeliveryFee:  boolean;
  tax:              number;
  gstEnabled:       boolean;
  gstPct:           number;
  finalTotal:       number;
  isShopCart:       boolean;

  hasAddress:       boolean;
  addressComplete:  boolean;
  liveReady:        boolean;
  placing:          boolean;
  onPlaceOrder:     () => void;
}

export function OrderSummaryPanel({
  items, subtotal, promoDiscount, promoCode,
  deliveryFee, deliveryDistance, deliveryBreakdown, showDeliveryFee,
  tax, gstEnabled, gstPct, finalTotal,
  isShopCart,
  hasAddress, addressComplete, liveReady, placing, onPlaceOrder,
}: Props) {
  const canPlace = hasAddress && addressComplete && liveReady && !placing;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
      <h2 className="text-xl font-bold mb-4">Order Summary</h2>

      {/* Items list */}
      <div className="space-y-3 mb-4 pb-4 border-b max-h-52 overflow-y-auto">
        {items.map((item: any) => (
          <div key={item.id || item.name} className="flex justify-between text-sm gap-3">
            <span className="text-gray-600 flex-1">
              {item.name} × {item.quantity}
            </span>
            <span className="font-semibold">
              ₹{(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* Breakdown */}
      <div className="space-y-2 mb-4 pb-4 border-b text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Item Total</span>
          <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
        </div>

        {promoDiscount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Promo {promoCode ? `(${promoCode})` : 'Discount'}</span>
            <span className="font-semibold">-₹{promoDiscount.toFixed(2)}</span>
          </div>
        )}

        {showDeliveryFee && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-600">
                Delivery Fee
                {isShopCart && (
                  <span className="ml-1 text-xs text-purple-600">(from Patti hub)</span>
                )}
              </span>
              <span className="font-semibold">₹{deliveryFee.toFixed(2)}</span>
            </div>
            {deliveryBreakdown && (
              <p className="text-xs text-gray-500">
                {deliveryDistance > 0 ? `${deliveryDistance.toFixed(2)} km • ` : ''}
                {deliveryBreakdown}
              </p>
            )}
          </>
        )}

        <div className="flex justify-between">
          <span className="text-gray-600">
            {gstEnabled && gstPct > 0 ? `GST (${gstPct}%)` : 'GST (0%)'}
          </span>
          <span className="font-semibold">₹{tax.toFixed(2)}</span>
        </div>
      </div>

      {/* Total */}
      <div className="flex justify-between mb-6 pt-2">
        <span className="text-lg font-bold">Total</span>
        <span className="text-2xl font-bold text-primary">₹{finalTotal.toFixed(2)}</span>
      </div>

      {/* Validation warnings */}
      {!hasAddress && (
        <Warning>Please select a delivery address to continue</Warning>
      )}
      {hasAddress && !addressComplete && (
        <Warning color="red">
          Selected address must have a landmark and a 10-digit mobile number.
        </Warning>
      )}
      {hasAddress && addressComplete && !liveReady && (
        <Warning color="red">Live location is required to place the order.</Warning>
      )}

      <button
        onClick={onPlaceOrder}
        disabled={!canPlace}
        className="w-full bg-primary text-white py-4 rounded-xl hover:bg-orange-600
                   font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed
                   transition-all flex items-center justify-center gap-2"
      >
        {placing
          ? <><Loader2 className="w-5 h-5 animate-spin" /> Placing Order…</>
          : `Place Order • ₹${finalTotal.toFixed(2)}`}
      </button>

      <p className="text-xs text-gray-500 text-center mt-4">
        By placing this order, you agree to our terms.
      </p>
    </div>
  );
}

function Warning({
  children, color = 'yellow',
}: { children: React.ReactNode; color?: 'yellow' | 'red' }) {
  const cls = color === 'red'
    ? 'bg-red-50 border-red-200 text-red-800'
    : 'bg-yellow-50 border-yellow-200 text-yellow-800';
  const iconCls = color === 'red' ? 'text-red-600' : 'text-yellow-600';
  return (
    <div className={`${cls} border rounded-lg p-3 mb-4`}>
      <div className="flex items-start gap-2">
        <AlertCircle className={`w-5 h-5 ${iconCls} flex-shrink-0 mt-0.5`} />
        <p className="text-sm">{children}</p>
      </div>
    </div>
  );
}
