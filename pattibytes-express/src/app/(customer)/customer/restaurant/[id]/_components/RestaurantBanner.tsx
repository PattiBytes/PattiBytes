/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ShoppingCart, Star, Clock, IndianRupee, Image as ImageIcon,
} from 'lucide-react';
import { getSafeImageSrc } from '@/lib/safeImage';
import type { Restaurant } from '@/services/restaurants';

interface Props {
  restaurant: Restaurant;
  restaurantId: string;
  itemCount: number;
  totalShownItems: number;
}

export function RestaurantBanner({ restaurant, restaurantId, itemCount, totalShownItems }: Props) {
  const router = useRouter();
  const bannerSrc = getSafeImageSrc((restaurant as any).banner_url);
  const logoSrc = getSafeImageSrc((restaurant as any).logo_url);

  return (
    <div className="relative h-64 md:h-80 bg-gradient-to-br from-orange-400 to-pink-500 overflow-hidden">
      {bannerSrc ? (
        <Image src={bannerSrc} alt={restaurant.business_name} fill className="object-cover" priority />
      ) : (
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_20%,white,transparent_35%),radial-gradient(circle_at_80%_30%,white,transparent_35%),radial-gradient(circle_at_50%_80%,white,transparent_40%)] animate-pulse" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/20" />

      {/* Back */}
      <button
        onClick={() => router.back()}
        className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-full hover:bg-white transition-all shadow-lg z-10 hover:scale-110 active:scale-95"
        aria-label="Go back"
      >
        <ArrowLeft className="w-6 h-6 text-gray-900" />
      </button>

      {/* Cart shortcut */}
      {itemCount > 0 && (
        <button
          onClick={() => router.push('/customer/cart')}
          className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-full hover:bg-white transition-all shadow-lg z-10 hover:scale-110 active:scale-95 animate-bounce"
          aria-label="Open cart"
        >
          <ShoppingCart className="w-6 h-6 text-primary" />
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black w-7 h-7 rounded-full flex items-center justify-center shadow-lg animate-pulse">
            {itemCount}
          </span>
        </button>
      )}

      {/* Info overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6 bg-gradient-to-t from-black/90 via-black/70 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start gap-4">
            {/* Logo */}
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border-4 border-white shadow-2xl bg-white flex-shrink-0">
              {logoSrc ? (
                <Image src={logoSrc} alt={`${restaurant.business_name} logo`} width={96} height={96} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <ImageIcon className="w-8 h-8" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-2xl md:text-4xl font-black text-white mb-2 truncate drop-shadow-lg">
                    {restaurant.business_name}
                  </h1>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {restaurant.cuisine_types?.slice(0, 6)?.map((c: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-full border border-white/30">
                        {c}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-4 text-white text-sm">
                    <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-black">{restaurant.average_rating?.toFixed(1) || '4.5'}</span>
                      <span className="text-white/80">({restaurant.total_reviews || 0})</span>
                    </div>
                    <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full">
                      <Clock className="w-4 h-4" />
                      <span className="font-bold">{restaurant.estimated_prep_time || 30} mins</span>
                    </div>
                    <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full">
                      <IndianRupee className="w-4 h-4" />
                      <span className="font-bold">Min ₹{restaurant.min_order_amount || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Desktop full menu */}
                <div className="hidden md:flex flex-col gap-2 items-end">
                  <button
                    onClick={() => router.push(`/customer/restaurant/${restaurantId}/menu`)}
                    className="px-5 py-2 rounded-full bg-white text-gray-900 font-black hover:bg-gray-100 transition-all shadow-lg hover:scale-105"
                  >
                    View full menu
                  </button>
                  <div className="text-white/90 text-xs font-bold bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full">
                    {totalShownItems} items
                  </div>
                </div>
              </div>

              {/* Mobile */}
              <div className="mt-3 md:hidden flex gap-2">
                <button
                  onClick={() => router.push(`/customer/restaurant/${restaurantId}/menu`)}
                  className="flex-1 px-4 py-2 rounded-xl bg-white text-gray-900 font-black hover:bg-gray-100 transition-all shadow-lg"
                >
                  View full menu
                </button>
                {itemCount > 0 && (
                  <button
                    onClick={() => router.push('/customer/cart')}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-pink-500 text-white font-black"
                  >
                    Cart ({itemCount})
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
