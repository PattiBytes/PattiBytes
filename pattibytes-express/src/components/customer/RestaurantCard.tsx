import { Merchant } from '@/types';
import { MapPin, Star, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface RestaurantCardProps {
  restaurant: Merchant;
}

export default function RestaurantCard({ restaurant }: RestaurantCardProps) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/customer/restaurant/${restaurant.id}`)}
      className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
    >
      {restaurant.banner_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={restaurant.banner_url}
          alt={restaurant.business_name}
          className="w-full h-48 object-cover"
        />
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
          <span className="text-white text-5xl">🍽️</span>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-bold text-gray-900 text-lg">{restaurant.business_name}</h3>
          {restaurant.is_verified && (
            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
              Verified
            </span>
          )}
        </div>

        <p className="text-sm text-gray-600 mt-1 truncate">
          {restaurant.cuisine_type || 'Multi-cuisine'}
        </p>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-1">
            <Star className="text-yellow-400 fill-yellow-400" size={16} />
            <span className="text-sm font-medium">4.5</span>
            <span className="text-sm text-gray-500">(100+)</span>
          </div>

          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Clock size={16} />
            <span>30-40 min</span>
          </div>
        </div>

        {restaurant.address?.address && (
          <div className="flex items-center gap-1 text-sm text-gray-500 mt-2">
            <MapPin size={14} />
            <span className="truncate">{restaurant.address.address.split(',')[0]}</span>
          </div>
        )}
      </div>
    </div>
  );
}
