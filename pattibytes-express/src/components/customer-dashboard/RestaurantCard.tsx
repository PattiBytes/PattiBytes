'use client';

import Image from 'next/image';
import { Clock, MapPin, Star, BadgePercent } from 'lucide-react';
import type { Merchant } from './types';
import { formatCurrencyINR, parseCuisineList } from './utils';
import type { OfferBadge } from './offers';
import { formatOfferSubLabel } from './offers';

export default function RestaurantCard({
  restaurant,
  menuCount,
  onOpen,
  offer,
  onOpenOffer,
}: {
  restaurant: Merchant;
  menuCount?: number;
  onOpen: () => void;
  offer?: OfferBadge | null;
  onOpenOffer?: (focusItemId: string, promoId?: string) => void;
}) {
  const cuisines = parseCuisineList(restaurant.cuisine_types);
  const banner = restaurant.banner_url || '';
  const logo = restaurant.logo_url || '';

  const rating = Number(restaurant.average_rating || 0);
  const totalReviews = Number(restaurant.total_reviews || 0);

  const label = String(offer?.label || '').trim();

  // NEW: if offer has item names, auto-build sublabel
  const computedSubLabel = String(formatOfferSubLabel(offer) || offer?.subLabel || '').trim();

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpen();
      }}
      className="bg-white rounded-2xl shadow hover:shadow-xl transition-all overflow-hidden text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40"
    >
      <div className="relative w-full h-40 sm:h-44 bg-gray-100">
        {banner ? (
          <Image
            src={banner}
            alt={restaurant.business_name || 'Restaurant'}
            fill
            sizes="(max-width: 1024px) 100vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-orange-400 to-pink-500" />
        )}

        {!!label && (
          <div className="absolute top-3 left-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (offer?.focusItemId && onOpenOffer) onOpenOffer(offer.focusItemId, offer.promoId);
                else onOpen();
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-black/75 backdrop-blur px-3 py-1.5 text-white shadow"
              title="View offer items"
            >
              <BadgePercent className="w-4 h-4" />
              <span className="text-xs font-extrabold max-w-[220px] truncate">{label}</span>
              {offer?.auto && (
                <span className="ml-1 text-[10px] font-extrabold bg-white/20 px-2 py-0.5 rounded-full">
                  AUTO
                </span>
              )}
            </button>

            {!!computedSubLabel && (
              <div
                title={computedSubLabel}
                className="mt-1 text-[11px] font-bold text-white rounded-full px-3 py-1 w-fit max-w-[260px] truncate bg-black/55"
              >
                {computedSubLabel}
              </div>
            )}
          </div>
        )}

        {!!logo && (
          <div className="absolute top-3 right-3 w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-white shadow-lg bg-white">
            <Image src={logo} alt="Logo" fill sizes="48px" className="object-cover" />
          </div>
        )}

        {typeof restaurant.distance_km === 'number' && (
          <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-xl shadow">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-primary" />
              <span className="text-xs font-bold">{restaurant.distance_km.toFixed(1)} km</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4">
        <h3 className="font-bold text-sm sm:text-base text-gray-900 truncate" title={restaurant.business_name}>
          {restaurant.business_name}
        </h3>

        {!!restaurant.address && <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">{restaurant.address}</p>}

        {cuisines.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {cuisines.slice(0, 2).map((c, i) => (
              <span
                key={`${restaurant.id}-c-${i}`}
                className="px-2 py-0.5 bg-orange-100 text-orange-800 text-[11px] font-semibold rounded-full"
              >
                {c}
              </span>
            ))}
            {cuisines.length > 2 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[11px] font-semibold rounded-full">
                +{cuisines.length - 2}
              </span>
            )}
          </div>
        )}

        <div className="mt-4 pt-3 border-t grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="font-bold">{rating ? rating.toFixed(1) : '—'}</span>
            <span className="text-gray-500">{totalReviews ? `(${totalReviews})` : ''}</span>
          </div>

          <div className="flex items-center gap-1 sm:justify-end">
            <Clock className="w-4 h-4 text-gray-600" />
            <span>{restaurant.estimated_prep_time ? `${restaurant.estimated_prep_time} min` : '—'}</span>
          </div>

          <div className="sm:col-span-2 text-xs text-gray-600">
            Min order: {restaurant.min_order_amount ? formatCurrencyINR(restaurant.min_order_amount) : '—'}
            {typeof menuCount === 'number' ? ` • ${menuCount} items` : ''}
          </div>
        </div>
      </div>
    </article>
  );
}
