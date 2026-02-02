'use client';

import { Store } from 'lucide-react';
import type { Merchant } from './types';
import RestaurantCard from './RestaurantCard';

export default function RestaurantGrid({
  loading,
  restaurants,
  menuCountByMerchant,
  onOpenRestaurant,
}: {
  loading: boolean;
  restaurants: Merchant[];
  menuCountByMerchant: Record<string, number>;
  onOpenRestaurant: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-gray-200 h-56 sm:h-64 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!restaurants.length) {
    return (
      <div className="text-center py-10 sm:py-12 bg-white rounded-2xl shadow text-gray-600">
        <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="font-semibold">No restaurants found nearby.</p>
        <p className="text-sm mt-1">Try changing your location or filter.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
      {restaurants.map((r) => (
        <RestaurantCard
          key={r.id}
          restaurant={r}
          menuCount={menuCountByMerchant[r.id]}
          onOpen={() => onOpenRestaurant(r.id)}
        />
      ))}
    </div>
  );
}
