/* eslint-disable @next/next/no-img-element */
'use client';

import { Gift, Percent, Plus, Minus, Sparkles } from 'lucide-react';
import type { OfferItem } from './types';

interface Props {
  offers: OfferItem[];
  quantities: Record<string, number>;
  onUpdateQty: (id: string, delta: number) => void;
  onAddOffer: (offer: OfferItem) => void;
}

export function OffersSection({ offers, quantities, onUpdateQty, onAddOffer }: Props) {
  if (!offers.length) return null;

  return (
    <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-3xl shadow-2xl border-2 border-green-400 p-5 animate-in slide-in-from-right duration-700">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg animate-bounce">
          <Gift className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-black text-gray-900">Special Offers</h3>
          <p className="text-xs text-gray-700 font-bold flex items-center gap-1">
            <Percent className="w-3 h-3" /> Buy items to get amazing deals!
          </p>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
        {offers.map((offer, index) => {
          const img = String(offer.buyItemImage || '').trim();
          const qty = quantities[offer.buyItemId] || 1;

          return (
            <div
              key={offer.id}
              className="min-w-[220px] max-w-[220px] bg-white border-2 border-gray-200 rounded-2xl shadow-lg hover:shadow-2xl hover:border-green-500 transition-all overflow-hidden animate-in fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="h-28 bg-gradient-to-br from-green-100 via-emerald-100 to-teal-100 relative">
                {img ? (
                  <img src={img} alt={offer.buyItemName} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Sparkles className="w-12 h-12 text-green-500 animate-pulse" />
                  </div>
                )}
                <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-black shadow-lg animate-pulse">
                  OFFER
                </div>
              </div>

              <div className="p-3">
                <div className="font-black text-gray-900 text-sm truncate mb-1">{offer.buyItemName}</div>
                <div className="text-xs text-green-700 font-bold mb-2 line-clamp-2">{offer.offerLabel}</div>
                <div className="text-base font-black bg-gradient-to-r from-primary to-pink-600 bg-clip-text text-transparent mb-3">
                  ₹{offer.buyItemPrice.toFixed(0)}
                </div>

                <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1 mb-3">
                  <button onClick={() => onUpdateQty(offer.buyItemId, -1)} disabled={qty <= 1}
                    className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-lg transition-all disabled:opacity-40">
                    <Minus className="w-3 h-3 text-gray-700" />
                  </button>
                  <span className="flex-1 text-center font-black text-gray-900 text-sm">{qty}</span>
                  <button onClick={() => onUpdateQty(offer.buyItemId, 1)} disabled={qty >= 10}
                    className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-lg transition-all disabled:opacity-40">
                    <Plus className="w-3 h-3 text-gray-700" />
                  </button>
                </div>

                <button onClick={() => onAddOffer(offer)}
                  className="w-full px-3 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-black shadow-md hover:shadow-xl transition-all hover:scale-105">
                  Add to Cart
                </button>
                <div className="mt-2 text-center text-xs font-bold text-gray-600">CODE: {offer.promoCode}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
