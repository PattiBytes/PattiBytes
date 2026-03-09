'use client';

import { Package, Clock, Info } from 'lucide-react';
import type { CustomOrderForm } from './types';
import { ORDER_CATEGORIES } from './types';

interface Props {
  form:       CustomOrderForm;
  submitting: boolean;
  onSubmit:   () => void;
}

export function OrderSummary({ form, submitting, onSubmit }: Props) {
  const cat       = ORDER_CATEGORIES.find(c => c.id === form.category);
  const estTotal  = form.items.reduce((s, it) => s + it.price * it.quantity, 0);
  const canSubmit = form.category && form.deliveryAddress.trim() && form.customerPhone.length === 10;

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-200 p-4">

      <h3 className="font-black text-gray-900 flex items-center gap-2 mb-3">
        <Package className="w-4 h-4 text-purple-500" />
        Order Summary
      </h3>

      <div className="space-y-2 text-sm mb-4">
        {cat && (
          <div className="flex items-center justify-between">
            <span className="text-gray-500 font-semibold">Category</span>
            <span className="font-black text-gray-900">{cat.emoji} {cat.label}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-gray-500 font-semibold">Items</span>
          <span className="font-black text-gray-900">{form.items.length} listed</span>
        </div>
        {estTotal > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-gray-500 font-semibold">Est. subtotal</span>
            <span className="font-black text-gray-900">₹{estTotal.toFixed(0)}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-gray-500 font-semibold">Delivery fee</span>
          <span className="font-black text-gray-900">₹35</span>
        </div>
      </div>

      {/* Info note */}
      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
        <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 font-semibold leading-relaxed">
          Our team will review and send you a final quote. You&apos;ll be notified once it&apos;s ready.
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold mb-4">
        <Clock className="w-3.5 h-3.5" />
        Estimated response: within 30 minutes
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit || submitting}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white
                   py-4 rounded-2xl font-black text-base shadow-lg
                   hover:shadow-xl hover:scale-[1.02] transition-all
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Submitting…
          </span>
        ) : 'Submit Custom Order'}
      </button>

      {!canSubmit && (
        <p className="text-[11px] text-red-500 font-semibold text-center mt-2">
          {!form.category
            ? 'Please select a category'
            : !form.deliveryAddress.trim()
            ? 'Please enter a delivery address'
            : 'Please enter a valid 10-digit phone number'}
        </p>
      )}
    </div>
  );
}
