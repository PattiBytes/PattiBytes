'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, MapPin, Loader2, X, Navigation } from 'lucide-react';

interface AddressSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    town?: string;
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

/** ✅ Use this everywhere (checkout, dashboard, profile, etc.) */
export type AddressPick = {
  address: string;
  lat: number;
  lon: number;
  city?: string;
  state?: string;
  postalcode?: string;
};

interface AddressAutocompleteProps {
  onSelect: (address: AddressPick) => void;
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
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (query.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      await searchAddress(query);
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchAddress = async (searchQuery: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
          q: searchQuery,
          format: 'json',
          addressdetails: '1',
          limit: '5',
          countrycodes: 'in',
        })}`,
        { headers: { 'User-Agent': 'PattiBytes Express App' } }
      );

      const data = await response.json();
      setSuggestions(Array.isArray(data) ? data : []);
      setShowDropdown(Array.isArray(data) && data.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Failed to search address', error);
      setSuggestions([]);
      setShowDropdown(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (suggestion: AddressSuggestion) => {
    const address: AddressPick = {
      address: suggestion.display_name,
      lat: parseFloat(suggestion.lat),
      lon: parseFloat(suggestion.lon),
      city: suggestion.address?.city || suggestion.address?.suburb || suggestion.address?.town,
      state: suggestion.address?.state,
      postalcode: suggestion.address?.postcode,
    };

    setQuery(suggestion.display_name);
    setShowDropdown(false);
    onSelect(address);
  };

  const handleCurrentLocation = async () => {
    setLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?${new URLSearchParams({
          lat: latitude.toString(),
          lon: longitude.toString(),
          format: 'json',
          addressdetails: '1',
        })}`,
        { headers: { 'User-Agent': 'PattiBytes Express App' } }
      );

      const data = await response.json();

      const address: AddressPick = {
        address: data.display_name,
        lat: latitude,
        lon: longitude,
        city: data?.address?.city || data?.address?.suburb || data?.address?.town,
        state: data?.address?.state,
        postalcode: data?.address?.postcode,
      };

      setQuery(data.display_name);
      setShowDropdown(false);
      onSelect(address);
    } catch (error) {
      console.error('Failed to get current location', error);
      alert('Failed to get current location. Please enter address manually.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const clearInput = () => {
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setShowDropdown(true);
          }}
          placeholder={placeholder}
          className="w-full pl-10 md:pl-12 pr-24 md:pr-28 py-2.5 md:py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm md:text-base transition-all"
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && <Loader2 className="text-primary animate-spin" size={18} />}

          {!!query && !loading && (
            <button
              onClick={clearInput}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-all"
              type="button"
              title="Clear"
            >
              <X size={16} className="text-gray-400" />
            </button>
          )}

          <button
            type="button"
            onClick={handleCurrentLocation}
            disabled={loading}
            className="p-1.5 text-primary hover:bg-orange-50 rounded-lg disabled:opacity-50 transition-all"
            title="Use current location"
          >
            <Navigation size={18} />
          </button>
        </div>
      </div>

      {showDropdown && suggestions.length > 0 && !loading && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-2xl max-h-96 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.lat}-${suggestion.lon}-${index}`}
              type="button"
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full text-left px-3 md:px-4 py-3 border-b last:border-b-0 flex items-start gap-3 transition-all ${
                selectedIndex === index ? 'bg-gradient-to-r from-orange-50 to-pink-50' : 'hover:bg-orange-50'
              }`}
            >
              <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm mb-1 line-clamp-1">
                  {suggestion.address?.road || suggestion.address?.suburb || 'Unknown Road'}
                </p>
                <p className="text-xs text-gray-600 line-clamp-2">{suggestion.display_name}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
