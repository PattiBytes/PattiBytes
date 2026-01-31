'use client';

import { ShoppingBag } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DashboardHeader({
  firstName,
  radiusKm,
}: {
  firstName: string;
  radiusKm: number;
}) {
  const router = useRouter();

  return (
    <div className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 rounded-2xl shadow-lg p-4 sm:p-6 text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-56 h-56 bg-white/10 rounded-full -mr-20 -mt-20" />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-white/90 text-sm">Welcome,</p>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">{firstName}!</h1>
          <p className="text-white/90 text-sm mt-1">Discover food within {radiusKm}km</p>
        </div>

        <button
          type="button"
          onClick={() => router.push('/customer/cart')}
          className="bg-white/15 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 flex-shrink-0"
          aria-label="Go to cart"
        >
          <ShoppingBag className="w-4 h-4" />
          Cart
        </button>
      </div>
    </div>
  );
}
