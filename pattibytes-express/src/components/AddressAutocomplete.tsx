'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Navigation } from 'lucide-react';

interface AddressSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

interface AddressAutocompleteProps {
  onSelect: (address: {
    address: string;
    lat: number;
    lon: number;
    city?: string;
    state?: string;
    postal_code?: string;
  }) => void;
  placeholder?: string;
  initialValue?: string;
}

export default function AddressAutocomplete({
  onSelect,
  placeholder = 'Search for an address...',
  initialValue = '',
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null); // FIXED: Added null type

  useEffect(() => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      await searchAddress(query);
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const searchAddress = async (searchQuery: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        new URLSearchParams({
          q: searchQuery,
          format: 'json',
          addressdetails: '1',
          limit: '5',
          countrycodes: 'in',
        })
      );

      const data = await response.json();
      setSuggestions(data);
      setShowDropdown(true);
    } catch (error) {
      console.error('Failed to search address:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (suggestion: AddressSuggestion) => {
    const address = {
      address: suggestion.display_name,
      lat: parseFloat(suggestion.lat),
      lon: parseFloat(suggestion.lon),
      city: suggestion.address.city || suggestion.address.suburb,
      state: suggestion.address.state,
      postal_code: suggestion.address.postcode,
    };

    setQuery(suggestion.display_name);
    setShowDropdown(false);
    onSelect(address);
  };

  const handleCurrentLocation = async () => {
    setLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const { latitude, longitude } = position.coords;

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?` +
        new URLSearchParams({
          lat: latitude.toString(),
          lon: longitude.toString(),
          format: 'json',
          addressdetails: '1',
        })
      );

      const data = await response.json();

      const address = {
        address: data.display_name,
        lat: latitude,
        lon: longitude,
        city: data.address.city || data.address.suburb,
        state: data.address.state,
        postal_code: data.address.postcode,
      };

      setQuery(data.display_name);
      onSelect(address);
    } catch (error) {
      console.error('Failed to get current location:', error);
      alert('Failed to get current location. Please enter address manually.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <button
          type="button"
          onClick={handleCurrentLocation}
          disabled={loading}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-primary hover:bg-orange-50 rounded-lg disabled:opacity-50"
          title="Use current location"
        >
          <Navigation size={18} />
        </button>
      </div>

      {query.length === 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="text-xs text-gray-500">Examples:</span>
          {[
            'Ludhiana Railway Station',
            'Civil Lines, Ludhiana',
            'Model Town, Ludhiana',
          ].map((hint) => (
            <button
              key={hint}
              type="button"
              onClick={() => setQuery(hint)}
              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
            >
              {hint}
            </button>
          ))}
        </div>
      )}

      {loading && query.length >= 3 && (
        <div className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-600">Searching addresses...</span>
          </div>
        </div>
      )}

      {showDropdown && suggestions.length > 0 && !loading && (
        <div className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-80 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 flex items-start gap-3"
            >
              <MapPin className="text-primary flex-shrink-0 mt-1" size={18} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {suggestion.address.road || suggestion.address.suburb || 'Unknown Road'}
                </p>
                <p className="text-sm text-gray-600 truncate">
                  {[
                    suggestion.address.city || suggestion.address.suburb,
                    suggestion.address.state,
                    suggestion.address.postcode,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {query.length >= 3 && suggestions.length === 0 && !loading && (
        <div className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-lg p-4">
          <div className="flex items-center gap-3 text-gray-600">
            <MapPin size={20} />
            <div>
              <p className="font-medium">No addresses found</p>
              <p className="text-sm">Try a different search term</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
