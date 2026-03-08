'use client';

import { Clock, Ban } from 'lucide-react';

interface Props {
  hoursLabel: string;  // "9:30 AM – 6:30 PM"
}

export function RestaurantClosedBanner({ hoursLabel }: Props) {
  return (
    <div className="bg-gradient-to-r from-red-50 via-orange-50 to-red-50 border-2 border-red-200
                    rounded-2xl p-4 animate-in slide-in-from-top duration-500 shadow-md">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-red-100 border-2 border-red-200 flex items-center
                        justify-center flex-shrink-0">
          <Ban className="w-5 h-5 text-red-500" />
        </div>
        <div className="min-w-0">
          <p className="font-black text-red-700 text-sm">Restaurant is currently closed</p>
          <p className="text-xs text-red-600 font-semibold flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" />
            Opens {hoursLabel}
          </p>
        </div>
        <div className="ml-auto px-3 py-1.5 bg-red-100 rounded-xl text-xs font-black text-red-600
                        border border-red-200 whitespace-nowrap flex-shrink-0">
          Closed Now
        </div>
      </div>
    </div>
  );
}
