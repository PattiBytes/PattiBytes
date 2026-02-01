'use client';

import { IndianRupee, Store, Receipt } from 'lucide-react';

export default function StatsCardsCompact(props: {
  restaurantsCount: number;
  totalOrders: number;
  totalSpent: number;
  onOpenOrders: () => void;
}) {
  const { restaurantsCount, totalOrders, totalSpent, onOpenOrders } = props;

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-3">
        <div className="flex items-center gap-2 text-gray-700">
          <Store className="w-4 h-4 text-primary" />
          <p className="text-[11px] sm:text-xs font-semibold">Restaurants</p>
        </div>
        <p className="mt-1 text-lg sm:text-xl font-bold text-gray-900">{restaurantsCount}</p>
      </div>

      <button
        type="button"
        onClick={onOpenOrders}
        className="rounded-xl bg-white shadow-sm border border-gray-100 p-3 text-left hover:border-primary/40 hover:shadow transition"
      >
        <div className="flex items-center gap-2 text-gray-700">
          <Receipt className="w-4 h-4 text-blue-600" />
          <p className="text-[11px] sm:text-xs font-semibold">Orders</p>
        </div>
        <p className="mt-1 text-lg sm:text-xl font-bold text-gray-900">{totalOrders}</p>
        <p className="text-[10px] sm:text-[11px] text-gray-500">Tap to view</p>
      </button>

      <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-3">
        <div className="flex items-center gap-2 text-gray-700">
          <IndianRupee className="w-4 h-4 text-purple-600" />
          <p className="text-[11px] sm:text-xs font-semibold">Spent</p>
        </div>
        <p className="mt-1 text-lg sm:text-xl font-bold text-gray-900">
          ₹{Math.round(totalSpent).toLocaleString('en-IN')}
        </p>
      </div>
    </div>
  );
}
