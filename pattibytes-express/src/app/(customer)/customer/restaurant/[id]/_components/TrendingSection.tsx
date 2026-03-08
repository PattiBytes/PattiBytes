/* eslint-disable @next/next/no-img-element */
'use client';

import { Flame, TrendingUp, Image as ImageIcon } from 'lucide-react';
import type { TrendingItem } from './types';
import { finalPrice } from './types';

interface Props {
  trending: TrendingItem[];
  restaurantName: string;
}

export function TrendingSection({ trending, restaurantName }: Props) {
  if (!trending.length) return null;

  const scrollToItem = (id: string) => {
    const el = document.getElementById(`menu-item-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-4', 'ring-primary', 'rounded-2xl', 'shadow-2xl');
    setTimeout(() => el.classList.remove('ring-4', 'ring-primary', 'rounded-2xl', 'shadow-2xl'), 2500);
  };

  return (
    <div className="bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 rounded-3xl shadow-2xl border-2 border-primary p-5 animate-in slide-in-from-left duration-700">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shadow-lg animate-pulse">
          <Flame className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-black text-gray-900">Trending at {restaurantName}</h3>
          <p className="text-xs text-gray-700 font-bold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Most ordered in last 7 days
          </p>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
        {trending.map((item, index) => {
          const img = String(item.image_url || '').trim();
          const price = finalPrice(item.price, item.discount_percentage);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToItem(item.id)}
              className="min-w-[180px] max-w-[180px] text-left bg-white border-2 border-gray-200 rounded-2xl shadow-lg hover:shadow-2xl hover:border-primary hover:scale-105 transition-all duration-300 overflow-hidden animate-in fade-in"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="h-24 bg-gradient-to-br from-gray-100 to-gray-200 relative">
                {img ? (
                  <img src={img} alt={item.name} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <ImageIcon className="w-7 h-7" />
                  </div>
                )}
                {item.discount_percentage && item.discount_percentage > 0 && (
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-red-500 text-white text-xs font-black shadow-lg">
                    {item.discount_percentage}% OFF
                  </div>
                )}
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-primary text-white text-xs font-black shadow-lg flex items-center gap-1">
                  <Flame className="w-3 h-3" />#{index + 1}
                </div>
              </div>
              <div className="p-3">
                <div className="font-black text-gray-900 truncate text-sm">{item.name}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-base font-black bg-gradient-to-r from-primary to-pink-600 bg-clip-text text-transparent">
                    ₹{price.toFixed(0)}
                  </span>
                  <span className="text-xs font-black text-primary flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" />{item.totalQty}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
