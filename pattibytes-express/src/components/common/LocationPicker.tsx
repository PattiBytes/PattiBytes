/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useMemo, useState } from 'react';
import { MapPin, Navigation, Link2, Search, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { locationService, LocationData } from '@/services/location';

type Props = {
  value: LocationData | null;
  onChange: (loc: LocationData | null) => void;
};

export default function LocationPicker({ value, onChange }: Props) {
  const [searchText, setSearchText] = useState('');
  const [mapsLink, setMapsLink] = useState('');
  const [loading, setLoading] = useState(false);

  const canUse = useMemo(() => Boolean(value?.address && value?.lat && value?.lon), [value]);

  const handleSearch = async () => {
    const q = searchText.trim();
    if (!q) return;

    try {
      setLoading(true);
      const loc = await locationService.geocodeAddress(q);
      if (!loc) {
        toast.error('Address not found');
        return;
      }
      onChange(loc);
      toast.success('Location selected');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to search location');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLink = async () => {
    const s = mapsLink.trim();
    if (!s) return;

    const coords = locationService.parseGoogleMapsLink(s);
    if (!coords) {
      toast.error('Could not read lat/lng from link. Paste a link that contains @lat,lng or ?q=lat,lng');
      return;
    }

    try {
      setLoading(true);
      const rev = await locationService.reverseGeocode(coords.lat, coords.lon);
      onChange(rev);
      toast.success('Google Maps location applied');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to use Google Maps link');
    } finally {
      setLoading(false);
    }
  };

  const useCurrentLocation = async () => {
    try {
      setLoading(true);
      const coords = await locationService.getCurrentLocation();
      const rev = await locationService.reverseGeocode(coords.lat, coords.lon);
      onChange(rev);
      toast.success('Current location applied');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to get current location');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="bg-white border rounded-xl p-4">
        <label className="text-sm font-semibold text-gray-700">Search address</label>
        <div className="mt-2 flex gap-2">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-3 text-gray-400" />
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Type area / street / landmark..."
              className="w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            disabled={loading}
            className="px-4 py-2.5 rounded-lg bg-gray-900 text-white disabled:opacity-50"
          >
            {loading ? '...' : 'Search'}
          </button>
        </div>

        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={loading}
          className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
          Use current location
        </button>
      </div>

      {/* Google Maps link */}
      <div className="bg-white border rounded-xl p-4">
        <label className="text-sm font-semibold text-gray-700">Or paste Google Maps link</label>
        <div className="mt-2 flex gap-2">
          <div className="flex-1 relative">
            <Link2 size={18} className="absolute left-3 top-3 text-gray-400" />
            <input
              value={mapsLink}
              onChange={(e) => setMapsLink(e.target.value)}
              placeholder="https://maps.google.com/..."
              className="w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="button"
            onClick={handleGoogleLink}
            disabled={loading}
            className="px-4 py-2.5 rounded-lg bg-primary text-white disabled:opacity-50"
          >
            Apply
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Tip: links containing <code>@lat,lng</code> or <code>?q=lat,lng</code> work best.
        </p>
      </div>

      {/* Selected */}
      <div className={`border rounded-xl p-4 ${canUse ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${canUse ? 'bg-green-600' : 'bg-gray-400'}`}>
            <MapPin className="text-white" size={18} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">Selected location</p>
            <p className="text-sm text-gray-700 mt-1">{value?.address || 'No location selected'}</p>
            {canUse && (
              <p className="text-xs text-gray-600 mt-2">
                Lat: {value?.lat.toFixed(6)} • Lng: {value?.lon.toFixed(6)}
              </p>
            )}
          </div>
        </div>

        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="mt-3 w-full px-4 py-2.5 rounded-lg border bg-white hover:bg-gray-50"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
