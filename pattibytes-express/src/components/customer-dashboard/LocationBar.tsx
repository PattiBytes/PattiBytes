'use client';

import { MapPinned, Navigation, Search } from 'lucide-react';

export default function LocationBar({
  address,
  radiusKm,
  locationLoading,
  onOpenSaved,
  onOpenSearch,
  onDetect,
}: {
  address: string;
  radiusKm: number;
  locationLoading: boolean;
  onOpenSaved: () => void;
  onOpenSearch: () => void;
  onDetect: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 md:p-5">
      <div className="flex items-start justify-between gap-3 pb-4 border-b">
        <div className="flex items-start gap-2 min-w-0">
          <MapPinned className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs text-gray-600 mb-0.5">Delivering to</p>
            <p className="font-semibold text-sm text-gray-900 line-clamp-2">
              {locationLoading ? 'Detecting location…' : (address || 'Set your location')}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">Within {radiusKm}km radius</p>
          </div>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onOpenSearch}
            className="p-2 bg-orange-50 text-primary rounded-xl hover:bg-orange-100 transition-colors"
            title="Search address"
            aria-label="Search address"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onDetect}
            disabled={locationLoading}
            className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 disabled:opacity-50 transition-colors"
            title="Use current location"
            aria-label="Use current location"
          >
            <Navigation className={`w-4 h-4 ${locationLoading ? 'animate-pulse' : ''}`} />
          </button>

          <button
            type="button"
            onClick={onOpenSaved}
            className="px-3 py-2 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 text-sm font-semibold"
          >
            Saved
          </button>
        </div>
      </div>
    </div>
  );
}
