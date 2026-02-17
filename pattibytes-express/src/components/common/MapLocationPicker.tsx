'use client';

import { useEffect, useState } from 'react';
import { MapPin, Search, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';

interface MapLocationPickerProps {
  initialLat?: number | null;
  initialLon?: number | null;
  onSelect: (data: {
    address: string;
    lat: number;
    lon: number;
    city?: string;
    state?: string;
    postalcode?: string;
  }) => void;
}

export default function MapLocationPicker({ initialLat, initialLon, onSelect }: MapLocationPickerProps) {
  const [lat, setLat] = useState(initialLat || 31.2886);
  const [lon, setLon] = useState(initialLon || 74.8490);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [markerSet, setMarkerSet] = useState(false);

  useEffect(() => {
    if (initialLat && initialLon) {
      setLat(initialLat);
      setLon(initialLon);
      setMarkerSet(true);
    }
  }, [initialLat, initialLon]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Enter a location to search');
      return;
    }

    setSearching(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_LOCATIONIQ_API_KEY;
      if (!apiKey) throw new Error('LocationIQ API key missing');

      const response = await fetch(
        `https://us1.locationiq.com/v1/search?key=${apiKey}&q=${encodeURIComponent(
          searchQuery
        )}&format=json&limit=1`
      );

      const data = await response.json();
      if (!data || data.length === 0) {
        toast.error('Location not found');
        return;
      }

      const result = data[0];
      setLat(parseFloat(result.lat));
      setLon(parseFloat(result.lon));
      setMarkerSet(true);
      toast.success('Location found!');
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search location');
    } finally {
      setSearching(false);
    }
  };

  const handleConfirm = async () => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_LOCATIONIQ_API_KEY;
      if (!apiKey) throw new Error('LocationIQ API key missing');

      // Reverse geocode to get address
      const response = await fetch(
        `https://us1.locationiq.com/v1/reverse?key=${apiKey}&lat=${lat}&lon=${lon}&format=json`
      );

      const data = await response.json();
      
      onSelect({
        address: data.display_name || `${lat}, ${lon}`,
        lat,
        lon,
        city: data.address?.city || data.address?.town || data.address?.village,
        state: data.address?.state,
        postalcode: data.address?.postcode,
      });

      toast.success('✅ Location confirmed!');
    } catch (error) {
      console.error('Reverse geocode error:', error);
      toast.error('Failed to get address details');
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search location (e.g., Patti, Punjab)"
            className="w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={searching}
          className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
        >
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search
        </button>
      </div>

      {/* Map Container */}
      <div className="relative w-full h-96 bg-gray-100 rounded-xl overflow-hidden border-2 border-gray-300">
        <iframe
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.01},${lat - 0.01},${lon + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lon}`}
          className="w-full h-full"
          style={{ border: 0 }}
          title="Location Map"
        />
        
        {/* Marker Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <MapPin className="w-12 h-12 text-red-600 drop-shadow-lg animate-bounce" fill="currentColor" />
        </div>

        {markerSet && (
          <div className="absolute top-3 left-3 bg-white px-3 py-2 rounded-lg shadow-lg">
            <p className="text-xs font-semibold text-gray-900">Lat: {lat.toFixed(6)}</p>
            <p className="text-xs font-semibold text-gray-900">Lon: {lon.toFixed(6)}</p>
          </div>
        )}
      </div>

      {/* Manual Coordinate Input */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
          <input
            type="number"
            step="0.000001"
            value={lat}
            onChange={(e) => {
              setLat(parseFloat(e.target.value) || 0);
              setMarkerSet(true);
            }}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
          <input
            type="number"
            step="0.000001"
            value={lon}
            onChange={(e) => {
              setLon(parseFloat(e.target.value) || 0);
              setMarkerSet(true);
            }}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Confirm Button */}
      <button
        onClick={handleConfirm}
        className="w-full bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 font-semibold flex items-center justify-center gap-2"
      >
        <CheckCircle className="w-5 h-5" />
        Confirm Location
      </button>
    </div>
  );
}
