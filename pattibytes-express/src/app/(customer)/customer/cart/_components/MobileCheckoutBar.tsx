'use client';

import { Loader2 } from 'lucide-react';

interface Props {
  finalTotal:   number;
  totalSavings: number;
  validating:   boolean;
  onCheckout:   () => void;
}

export function MobileCheckoutBar({
  finalTotal, totalSavings, validating, onCheckout,
}: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg
                    p-4 lg:hidden z-40">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-600">Total Amount</p>
          <p className="text-xl font-bold text-primary">₹{finalTotal.toFixed(2)}</p>
          {totalSavings > 0 && (
            <p className="text-xs text-green-600">Saved ₹{totalSavings.toFixed(2)}</p>
          )}
        </div>
        <button
          onClick={onCheckout}
          disabled={validating}
          className="bg-primary text-white px-6 py-3 rounded-xl hover:bg-orange-600
                     font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {validating
            ? <><Loader2 className="w-5 h-5 animate-spin" /> Validating…</>
            : 'Checkout'}
        </button>
      </div>
    </div>
  );
}
