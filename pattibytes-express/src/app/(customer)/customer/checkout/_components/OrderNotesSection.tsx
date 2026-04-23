'use client';

import { Info, Loader2, LocateFixed } from 'lucide-react';

type LiveLocation = { lat: number; lng: number; accuracy?: number; updated_at: string };

interface Props {
  notes:              string;
  onNotesChange:      (v: string) => void;
  shareLiveLocation:  boolean;
  onToggleLive:       (v: boolean) => void;
  liveLocation:       LiveLocation | null;
  locChecking:        boolean;
  onVerifyLocation:   () => void;
  isShopCart:         boolean;
}

export function OrderNotesSection({
  notes, onNotesChange,
  shareLiveLocation, onToggleLive,
  liveLocation, locChecking, onVerifyLocation,
  isShopCart,
}: Props) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
      <div>
        <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
          <Info className="text-primary" size={22} />
          {isShopCart ? 'Order notes' : 'Notes for restaurant'}
        </h2>
        <textarea
          value={notes}
          onChange={e => onNotesChange(e.target.value)}
          placeholder={
            isShopCart
              ? 'Any special request? (optional)'
              : 'Any request for the restaurant? (optional)'
          }
          className="w-full min-h-[90px] border-2 border-gray-200 rounded-lg px-3 py-2
                     focus:ring-2 focus:ring-primary focus:border-primary text-sm"
        />
      </div>

      <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-lg p-3">
        <input
          type="checkbox"
          checked={shareLiveLocation}
          onChange={e => onToggleLive(e.target.checked)}
          className="mt-1 w-4 h-4"
        />
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">Live location required</p>
          <p className="text-xs text-gray-600">
            You must enable live location to place the order. It will keep updating
            so the delivery agent can find you easily.
          </p>

          <div className="mt-2">
            <button
              type="button"
              onClick={onVerifyLocation}
              disabled={!shareLiveLocation || locChecking}
              className="px-3 py-2 rounded-lg bg-white border border-orange-200
                         hover:bg-orange-100 text-sm font-semibold
                         disabled:opacity-60 inline-flex items-center gap-2"
            >
              {locChecking
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <LocateFixed className="w-4 h-4" />}
              Verify location now
            </button>
          </div>

          {shareLiveLocation && liveLocation && (
            <p className="mt-2 text-xs text-green-700 font-medium">
              ✓ Location received at {new Date(liveLocation.updated_at).toLocaleTimeString()}
            </p>
          )}
          {shareLiveLocation && !liveLocation && (
            <p className="mt-2 text-xs text-red-700">
              Location not received yet. Tap &quot;Verify location now&quot; and allow permission.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

