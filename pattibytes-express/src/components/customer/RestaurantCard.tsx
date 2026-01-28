'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Merchant } from '@/types';
import { Star, Clock, MapPin } from 'lucide-react';

interface RestaurantCardProps {
  restaurant: Merchant;
}

export default function RestaurantCard({ restaurant }: RestaurantCardProps) {
  return (
    <Link href={`/customer/restaurant/${restaurant.id}`}>
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden cursor-pointer group">
        {/* Image */}
        <div className="relative h-48 bg-gray-200">
          {restaurant.banner_url ? (
            <Image
              src={restaurant.banner_url}
              alt={restaurant.business_name}
              fill
              className="object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center">
              <span className="text-white text-2xl font-bold">
                {restaurant.business_name.charAt(0)}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-bold text-gray-900 text-lg truncate">
            {restaurant.business_name}
          </h3>

          <p className="text-sm text-gray-600 mt-1 truncate">
            {restaurant.cuisine_types?.join(', ') || 'Multi-cuisine'}
          </p>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-1">
              <Star className="fill-yellow-400 text-yellow-400" size={16} />
              <span className="font-semibold text-gray-900">
                {restaurant.average_rating.toFixed(1)}
              </span>
              <span className="text-gray-600 text-sm">
                ({restaurant.total_reviews})
              </span>
            </div>

            <div className="flex items-center gap-1 text-gray-600 text-sm">
              <Clock size={16} />
              <span>{restaurant.estimated_prep_time} min</span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Min Order: ₹{restaurant.min_order_amount}
            </span>
            <div className="flex items-center gap-1 text-gray-600">
              <MapPin size={14} />
              <span>{restaurant.delivery_radius_km}km</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
