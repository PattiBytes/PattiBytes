'use client';

import { Phone, Mail, MapPin, Sparkles } from 'lucide-react';
import type { Restaurant } from '@/services/restaurants';

interface Props { restaurant: Restaurant; }

export function RestaurantInfoCards({ restaurant }: Props) {
  return (
    <div className="space-y-4">
      {restaurant.description && (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-6 animate-in fade-in duration-500">
          <h2 className="text-lg font-black text-gray-900 mb-2 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> About
          </h2>
          <p className="text-gray-700 leading-relaxed font-semibold">{restaurant.description}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {restaurant.phone && (
          <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-100 p-4 flex items-center gap-3 hover:shadow-xl hover:border-blue-300 transition-all hover:scale-105 animate-in fade-in duration-500">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
              <Phone className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-600 font-bold">Contact</p>
              <p className="font-black text-gray-900 truncate">{restaurant.phone}</p>
            </div>
          </div>
        )}

        {restaurant.email && (
          <div className="bg-white rounded-2xl shadow-lg border-2 border-green-100 p-4 flex items-center gap-3 hover:shadow-xl hover:border-green-300 transition-all hover:scale-105 animate-in fade-in duration-500" style={{ animationDelay: '100ms' }}>
            <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center flex-shrink-0">
              <Mail className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-600 font-bold">Email</p>
              <p className="font-black text-gray-900 truncate">{restaurant.email}</p>
            </div>
          </div>
        )}

        {restaurant.address && (
          <div className="bg-white rounded-2xl shadow-lg border-2 border-orange-100 p-4 flex items-center gap-3 hover:shadow-xl hover:border-orange-300 transition-all hover:scale-105 animate-in fade-in duration-500" style={{ animationDelay: '200ms' }}>
            <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center flex-shrink-0">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-600 font-bold">Address</p>
              <p className="font-black text-gray-900 line-clamp-2 text-sm">{restaurant.address}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
