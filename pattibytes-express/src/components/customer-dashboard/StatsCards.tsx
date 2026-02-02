'use client';

import { IndianRupee, Package, Store } from 'lucide-react';
import { formatCurrencyINR } from './utils';

export default function StatsCards({
  restaurantsCount,
  totalOrders,
  activeOrders,
  totalSpent,
}: {
  restaurantsCount: number;
  totalOrders: number;
  activeOrders: number;
  totalSpent: number;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
      <div className="bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl shadow-lg p-3 sm:p-4 text-white">
        <Store className="w-5 h-5 sm:w-6 sm:h-6 mb-2" />
        <p className="text-xl sm:text-2xl font-bold leading-tight">{restaurantsCount}</p>
        <p className="text-[11px] sm:text-xs text-white/90">Restaurants</p>
      </div>

      <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg p-3 sm:p-4 text-white">
        <Package className="w-5 h-5 sm:w-6 sm:h-6 mb-2" />
        <p className="text-xl sm:text-2xl font-bold leading-tight">{totalOrders}</p>
        <p className="text-[11px] sm:text-xs text-white/90">Total orders</p>
      </div>

      <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl shadow-lg p-3 sm:p-4 text-white">
        <Package className="w-5 h-5 sm:w-6 sm:h-6 mb-2" />
        <p className="text-xl sm:text-2xl font-bold leading-tight">{activeOrders}</p>
        <p className="text-[11px] sm:text-xs text-white/90">Active orders</p>
      </div>

      <div className="bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl shadow-lg p-3 sm:p-4 text-white">
        <IndianRupee className="w-5 h-5 sm:w-6 sm:h-6 mb-2" />
        <p className="text-base sm:text-2xl font-bold leading-tight break-words">
          {formatCurrencyINR(totalSpent)}
        </p>
        <p className="text-[11px] sm:text-xs text-white/90">Total spent</p>
      </div>
    </div>
  );
}
