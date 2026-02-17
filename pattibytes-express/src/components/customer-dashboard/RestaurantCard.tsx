'use client';

import Image from 'next/image';
import { Clock, MapPin, Star, BadgePercent, XCircle, CheckCircle } from 'lucide-react';
import type { Merchant } from './types';
import { formatCurrencyINR, parseCuisineList } from './utils';
import type { OfferBadge } from './offers';
import { useMemo } from 'react';

// ✅ Helper function to check if restaurant is open
function isRestaurantOpen(openingTime?: string | null, closingTime?: string | null): {
  isOpen: boolean;
  status: 'open' | 'closed' | 'always-open';
  openingTime: string | null;
  closingTime: string | null;
} {
  // If either is null, restaurant is always open
  if (!openingTime || !closingTime) {
    return {
      isOpen: true,
      status: 'always-open',
      openingTime: null,
      closingTime: null,
    };
  }

  try {
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeInMinutes = currentHours * 60 + currentMinutes;

    // Parse opening time (format: "HH:MM" or "HH:MM:SS")
    const [openHour, openMin] = openingTime.split(':').map(Number);
    const openingTimeInMinutes = openHour * 60 + (openMin || 0);

    // Parse closing time
    const [closeHour, closeMin] = closingTime.split(':').map(Number);
    const closingTimeInMinutes = closeHour * 60 + (closeMin || 0);

    // Handle overnight closing (e.g., open 10:00, close 02:00 next day)
    if (closingTimeInMinutes < openingTimeInMinutes) {
      // Closing time is next day
      if (currentTimeInMinutes >= openingTimeInMinutes) {
        // After opening time today
        return {
          isOpen: true,
          status: 'open',
          openingTime: formatTime(openingTime),
          closingTime: formatTime(closingTime),
        };
      } else if (currentTimeInMinutes < closingTimeInMinutes) {
        // Before closing time (next day)
        return {
          isOpen: true,
          status: 'open',
          openingTime: formatTime(openingTime),
          closingTime: formatTime(closingTime),
        };
      } else {
        // Closed
        return {
          isOpen: false,
          status: 'closed',
          openingTime: formatTime(openingTime),
          closingTime: formatTime(closingTime),
        };
      }
    }

    // Normal case: opening and closing on same day
    const isOpen = currentTimeInMinutes >= openingTimeInMinutes && currentTimeInMinutes < closingTimeInMinutes;

    return {
      isOpen,
      status: isOpen ? 'open' : 'closed',
      openingTime: formatTime(openingTime),
      closingTime: formatTime(closingTime),
    };
  } catch (error) {
    console.error('Error parsing restaurant hours:', error);
    // If error, assume always open
    return {
      isOpen: true,
      status: 'always-open',
      openingTime: null,
      closingTime: null,
    };
  }
}

// ✅ Format time to 12-hour format
function formatTime(time: string): string {
  try {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  } catch {
    return time;
  }
}

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
  const subLabel = String(offer?.subLabel || '').trim();

  // ✅ Check if restaurant is open
  const restaurantStatus = useMemo(
    () => isRestaurantOpen(restaurant.opening_time, restaurant.closing_time),
    [restaurant.opening_time, restaurant.closing_time]
  );

  const handleClick = () => {
    if (restaurantStatus.isOpen) {
      onOpen();
    }
  };

  const handleOfferClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (restaurantStatus.isOpen) {
      if (offer?.focusItemId && onOpenOffer) {
        onOpenOffer(offer.focusItemId, offer.promoId);
      } else {
        onOpen();
      }
    }
  };

  return (
    <article
      role="button"
      tabIndex={restaurantStatus.isOpen ? 0 : -1}
      onClick={handleClick}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && restaurantStatus.isOpen) {
          onOpen();
        }
      }}
      className={`bg-white rounded-2xl shadow transition-all overflow-hidden text-left relative ${
        restaurantStatus.isOpen
          ? 'hover:shadow-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40'
          : 'opacity-75 cursor-not-allowed'
      }`}
    >
      {/* ✅ Closed Overlay */}
      {!restaurantStatus.isOpen && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10 flex items-center justify-center">
          <div className="bg-red-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
            <XCircle size={24} />
            <div>
              <p className="font-bold text-lg">CLOSED</p>
              {restaurantStatus.openingTime && (
                <p className="text-xs opacity-90">Opens at {restaurantStatus.openingTime}</p>
              )}
            </div>
          </div>
        </div>
      )}

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

        {/* ✅ Open/Closed Status Badge */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-20">
          {restaurantStatus.status === 'open' && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-3 py-1.5 text-white shadow-lg">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs font-bold">OPEN</span>
            </div>
          )}
          
          {restaurantStatus.status === 'closed' && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-white shadow-lg">
              <XCircle className="w-4 h-4" />
              <span className="text-xs font-bold">CLOSED</span>
            </div>
          )}

          {/* Offer badge */}
          {!!label && restaurantStatus.isOpen && (
            <button
              type="button"
              onClick={handleOfferClick}
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
          )}

          {!!subLabel && restaurantStatus.isOpen && (
            <div
              title={subLabel}
              className="text-[11px] font-bold text-white rounded-full px-3 py-1 w-fit max-w-[260px] truncate bg-black/55"
            >
              {subLabel}
            </div>
          )}
        </div>

        {!!logo && (
          <div className="absolute top-3 right-3 w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-white shadow-lg bg-white z-20">
            <Image src={logo} alt="Logo" fill sizes="48px" className="object-cover" />
          </div>
        )}

        {typeof restaurant.distance_km === 'number' && (
          <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-xl shadow z-20">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-primary" />
              <span className="text-xs font-bold">{restaurant.distance_km.toFixed(1)} km</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-sm sm:text-base text-gray-900 truncate flex-1" title={restaurant.business_name}>
            {restaurant.business_name}
          </h3>
        </div>

        {/* ✅ Timing Display */}
        {restaurantStatus.status !== 'always-open' && restaurantStatus.openingTime && restaurantStatus.closingTime && (
          <div className={`flex items-center gap-1.5 text-xs font-semibold mb-2 px-2 py-1 rounded-lg w-fit ${
            restaurantStatus.isOpen 
              ? 'bg-green-50 text-green-700' 
              : 'bg-red-50 text-red-700'
          }`}>
            <Clock className="w-3.5 h-3.5" />
            <span>
              {restaurantStatus.openingTime} - {restaurantStatus.closingTime}
            </span>
          </div>
        )}

        {!!restaurant.address && (
          <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">{restaurant.address}</p>
        )}

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
