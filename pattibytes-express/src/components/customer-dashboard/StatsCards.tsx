'use client';

import { IndianRupee, Package, Store, ClipboardList } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrencyINR } from './utils';

export default function StatsCards({
  restaurantsCount,
  totalOrders,
  activeOrders,
  totalSpent,
  pendingCustomOrders = 0,   // ← NEW (optional, defaults to 0)
}: {
  restaurantsCount: number;
  totalOrders: number;
  activeOrders: number;
  totalSpent: number;
  pendingCustomOrders?: number;  // ← NEW
}) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">

      {/* Restaurants */}
      <div className="bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl shadow-lg p-3 sm:p-4 text-white">
        <Store className="w-5 h-5 sm:w-6 sm:h-6 mb-2" />
        <p className="text-xl sm:text-2xl font-bold leading-tight">{restaurantsCount}</p>
        <p className="text-[11px] sm:text-xs text-white/90">Restaurants</p>
      </div>

      {/* Total Orders */}
      <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg p-3 sm:p-4 text-white">
        <Package className="w-5 h-5 sm:w-6 sm:h-6 mb-2" />
        <p className="text-xl sm:text-2xl font-bold leading-tight">{totalOrders}</p>
        <p className="text-[11px] sm:text-xs text-white/90">Total orders</p>
      </div>

      {/* Active Orders */}
      <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl shadow-lg p-3 sm:p-4 text-white">
        <Package className="w-5 h-5 sm:w-6 sm:h-6 mb-2" />
        <p className="text-xl sm:text-2xl font-bold leading-tight">{activeOrders}</p>
        <p className="text-[11px] sm:text-xs text-white/90">Active orders</p>
      </div>

      {/* Total Spent */}
      <div className="bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl shadow-lg p-3 sm:p-4 text-white">
        <IndianRupee className="w-5 h-5 sm:w-6 sm:h-6 mb-2" />
        <p className="text-base sm:text-2xl font-bold leading-tight break-words">
          {formatCurrencyINR(totalSpent)}
        </p>
        <p className="text-[11px] sm:text-xs text-white/90">Total spent</p>
      </div>

      {/* Custom Orders Pending — only shows when > 0 */}
      {pendingCustomOrders > 0 && (
        <button
          onClick={() => router.push('/customer/orders?type=custom')}
          className="col-span-2 lg:col-span-4 bg-gradient-to-r from-purple-50 to-pink-50
                     border-2 border-purple-300 rounded-2xl p-3 sm:p-4
                     flex items-center gap-3 hover:shadow-lg hover:scale-[1.01]
                     transition-all text-left w-full animate-in fade-in duration-500"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500
                          flex items-center justify-center shadow-lg flex-shrink-0">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-gray-900 text-sm flex items-center gap-2">
              {pendingCustomOrders} custom order{pendingCustomOrders > 1 ? 's' : ''} pending
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            </p>
            <p className="text-xs text-gray-500 font-semibold mt-0.5">
              Awaiting quote or confirmation — tap to view
            </p>
          </div>
          <span className="text-primary font-black text-xs flex-shrink-0">View →</span>
        </button>
      )}

    </div>
  );
}

