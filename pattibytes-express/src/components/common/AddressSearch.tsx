'use client';

import { useState } from 'react';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { geocodingService } from '@/services/geocoding';

interface AddressSearchProps {
  onSelectAddress: (address: {
    displayName: string;
    lat: number;
    lon: number;
    city?: string;
    state?: string;
  }) => void;
}

export default function AddressSearch({ onSelectAddress }: AddressSearchProps) {
  const [query, setQuery] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const searchResults = await geocodingService.searchAddress(searchQuery);
      setResults(searchResults);
      setShowResults(true);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSelect = (result: any) => {
    onSelectAddress({
      displayName: result.displayName,
      lat: result.lat,
      lon: result.lon,
      city: result.address?.city,
      state: result.address?.state,
    });
    setQuery(result.displayName);
    setShowResults(false);
  };

  const handleUseCurrentLocation = async () => {
    setLoading(true);
    try {
      const coords = await geocodingService.getCurrentLocation();
      const address = await geocodingService.reverseGeocode(coords.lat, coords.lon);
      
      onSelectAddress({
        displayName: address.displayName,
        lat: coords.lat,
        lon: coords.lon,
        city: address.address?.city,
        state: address.address?.state,
      });
      setQuery(address.displayName);
    } catch (error) {
      console.error('Location access failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              handleSearch(e.target.value);
            }}
            onFocus={() => setShowResults(true)}
            placeholder="Search for area, street name..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-3 text-gray-400 animate-spin" size={20} />
          )}
        </div>
        
        <button
          onClick={handleUseCurrentLocation}
          disabled={loading}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
        >
          <MapPin size={20} />
          Use Current
        </button>
      </div>

      {/* Search Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
          {results.map((result, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(result)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0 flex items-start gap-3"
            >
              <MapPin className="text-primary mt-1 flex-shrink-0" size={20} />
              <div>
                <p className="font-medium text-gray-900">{result.address?.city || 'Location'}</p>
                <p className="text-sm text-gray-600">{result.displayName}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
