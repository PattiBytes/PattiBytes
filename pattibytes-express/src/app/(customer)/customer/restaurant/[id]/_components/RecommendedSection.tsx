/* eslint-disable @next/next/no-img-element */
'use client';

import { useRouter } from 'next/navigation';
import { Store, Star, Clock } from 'lucide-react';
import { getSafeImageSrc } from '@/lib/safeImage';
import type { RecommendedRestaurant } from './types';

interface Props {
  recommended: RecommendedRestaurant[];
}

export function RecommendedSection({ recommended }: Props) {
  const router = useRouter();
  if (!recommended.length) return null;

  return (
    <div className="bg-white rounded-3xl shadow-2xl border-2 border-gray-200 p-5 animate-in slide-in-from-bottom duration-700">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
          <Store className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-black text-gray-900">You May Also Like</h3>
          <p className="text-xs text-gray-700 font-bold">Similar restaurants near you</p>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
        {recommended.map((rest, index) => {
          const logoImg = getSafeImageSrc(rest.logo_url);

          return (
            <button
              key={rest.id}
              type="button"
              onClick={() => router.push(`/customer/restaurant/${rest.id}`)}
              className="min-w-[160px] max-w-[160px] text-left bg-white border-2 border-gray-200 rounded-2xl shadow-lg hover:shadow-2xl hover:border-primary hover:scale-105 transition-all duration-300 overflow-hidden animate-in fade-in"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="h-20 bg-gradient-to-br from-gray-100 to-gray-200 relative flex items-center justify-center">
                {logoImg ? (
                  <img src={logoImg} alt={rest.business_name} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <Store className="w-10 h-10 text-gray-400" />
                )}
              </div>
              <div className="p-3">
                <div className="font-black text-gray-900 text-sm truncate mb-1">{rest.business_name}</div>
                <div className="text-xs text-gray-600 truncate font-semibold mb-2">
                  {rest.cuisine_types?.slice(0, 2).join(', ') || 'Restaurant'}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 font-bold">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    {rest.average_rating?.toFixed(1) || '4.5'}
                  </span>
                  <span className="flex items-center gap-1 font-bold text-gray-600">
                    <Clock className="w-3 h-3" />
                    {rest.estimated_prep_time || 30}m
                  </span>
                </div>
                {rest.distance_km !== undefined && rest.distance_km > 0 && (
                  <div className="text-xs text-primary font-bold mt-1">
                    {rest.distance_km.toFixed(1)} km away
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
