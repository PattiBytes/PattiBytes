'use client';
import { useRef } from 'react';
import { MapPin, Search, Loader2, DollarSign } from 'lucide-react';
import type { AddressSuggestion } from './types';

interface Props {
  addressQuery: string;
  setAddressQuery: (v: string) => void;
  addressSearching: boolean;
  addressOptions: AddressSuggestion[];
  showAddressDropdown: boolean;
  setShowAddressDropdown: (v: boolean) => void;
  deliveryAddress: string;
  setDeliveryAddress: (v: string) => void;
  deliveryLat: number | null;
  deliveryDistanceKm: number;
  deliveryFee: number;
  setDeliveryFee: (n: number) => void;
  chooseAddress: (opt: AddressSuggestion) => void;
  handleCurrentLocation: () => void;
  computeFeeFromDistance: () => void;
  merchant: { latitude?: number | null } | null;
}

export function AddressPicker({
  addressQuery, setAddressQuery, addressSearching,
  addressOptions, showAddressDropdown, setShowAddressDropdown,
  deliveryAddress, setDeliveryAddress,
  deliveryLat, deliveryDistanceKm, deliveryFee, setDeliveryFee,
  chooseAddress, handleCurrentLocation, computeFeeFromDistance, merchant,
}: Props) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-gradient-to-br from-white to-green-50 rounded-2xl shadow-sm border border-green-100 p-5 space-y-4">
      <h2 className="font-bold text-gray-900 flex items-center gap-2">
        <span className="w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center">
          <MapPin className="w-4 h-4 text-white" />
        </span>
        Delivery Address
      </h2>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
        <input
          ref={ref}
          value={addressQuery}
          onChange={e => setAddressQuery(e.target.value)}
          onFocus={() => addressOptions.length > 0 && setShowAddressDropdown(true)}
          placeholder="Search address…"
          className="w-full pl-9 pr-20 py-3 rounded-xl border-2 border-gray-200
                     focus:ring-2 focus:ring-green-400 focus:border-green-400 bg-white text-sm"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
          {addressSearching && <Loader2 className="w-4 h-4 animate-spin text-green-500" />}
          <button
            type="button"
            onClick={handleCurrentLocation}
            disabled={addressSearching}
            title="Use my current location"
            className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg
                       disabled:opacity-40 transition-colors"
          >
            <MapPin className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dropdown */}
      {showAddressDropdown && addressOptions.length > 0 && !addressSearching && (
        <div className="border-2 border-green-200 rounded-xl shadow-xl max-h-56 overflow-y-auto bg-white">
          {addressOptions.map((opt, i) => (
            <button
              key={`${opt.lat}-${opt.lon}-${i}`}
              type="button"
              onClick={() => chooseAddress(opt)}
              className="w-full text-left p-3.5 hover:bg-green-50 border-b last:border-b-0
                         flex items-start gap-3 transition-colors"
            >
              <MapPin className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm">
                  {opt.address?.road || opt.address?.suburb || 'Unknown'}
                </p>
                <p className="text-xs text-gray-500 truncate">{opt.display_name}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Manual address textarea */}
      <textarea
        value={deliveryAddress}
        onChange={e => setDeliveryAddress(e.target.value)}
        placeholder="Full delivery address (auto-filled or type manually)"
        rows={2}
        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200
                   focus:ring-2 focus:ring-green-400 focus:border-green-400
                   bg-white text-sm resize-none"
      />

      {/* Fee row */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={computeFeeFromDistance}
          disabled={!merchant || deliveryLat == null}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 text-white
                     font-semibold text-sm hover:bg-green-700 disabled:opacity-40 transition-all"
        >
          <DollarSign className="w-4 h-4" /> Compute Fee
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-semibold">Fee (₹)</span>
          <input
            type="number"
            min={0}
            step="0.5"
            value={deliveryFee}
            onChange={e => setDeliveryFee(parseFloat(e.target.value) || 0)}
            className="w-24 px-3 py-2 rounded-xl border-2 border-gray-200
                       focus:ring-2 focus:ring-green-400 focus:border-green-400
                       text-sm font-bold bg-white"
          />
        </div>

        {deliveryLat != null && (
          <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
            ✓ Coords set
          </span>
        )}
        {deliveryDistanceKm > 0 && (
          <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
            📏 {deliveryDistanceKm.toFixed(2)} km
          </span>
        )}
      </div>
    </div>
  );
}


