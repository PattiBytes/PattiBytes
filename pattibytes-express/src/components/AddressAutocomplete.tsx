'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, X, Navigation } from 'lucide-react';

interface AddressSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    town: string;
    house_number?: string;
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
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
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
      setSelectedIndex(-1);
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
      city: suggestion.address.city || suggestion.address.suburb || suggestion.address.town,
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
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
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
        city: data.address.city || data.address.suburb || data.address.town,
        state: data.address.state,
        postal_code: data.address.postcode,
      };

      setQuery(data.display_name);
      setShowDropdown(false);
      onSelect(address);
    } catch (error) {
      console.error('Failed to get current location:', error);
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

  const quickAddresses = [
    { name: 'Ludhiana Railway Station', icon: '🚉' },
    { name: 'Civil Lines, Ludhiana', icon: '🏙️' },
    { name: 'Model Town, Ludhiana', icon: '🏘️' },
  ];

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
          {query && !loading && (
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

      {query.length === 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="text-xs text-gray-500 flex items-center">💡 Quick:</span>
          {quickAddresses.map((hint) => (
            <button
              key={hint.name}
              type="button"
              onClick={() => setQuery(hint.name)}
              className="px-2 py-1 bg-gradient-to-r from-orange-50 to-pink-50 text-primary rounded-lg text-xs hover:from-orange-100 hover:to-pink-100 font-medium transition-all flex items-center gap-1"
            >
              <span>{hint.icon}</span>
              <span className="hidden sm:inline">{hint.name.split(',')[0]}</span>
              <span className="sm:hidden">{hint.name.split(',')[0].slice(0, 10)}...</span>
            </button>
          ))}
        </div>
      )}

      {loading && query.length >= 3 && (
        <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-2xl p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <span className="text-gray-600 text-sm">Searching addresses...</span>
          </div>
        </div>
      )}

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
              className={`w-full text-left px-3 md:px-4 py-3 hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 border-b last:border-b-0 flex items-start gap-3 transition-all ${
                selectedIndex === index ? 'bg-gradient-to-r from-orange-50 to-pink-50' : ''
              }`}
            >
              <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm mb-1 line-clamp-1">
                  {suggestion.address.road || suggestion.address.suburb || 'Unknown Road'}
                </p>
                <p className="text-xs text-gray-600 line-clamp-2">{suggestion.display_name}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {query.length >= 3 && suggestions.length === 0 && !loading && (
        <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-2xl p-6 text-center">
          <MapPin size={40} className="mx-auto text-gray-400 mb-3" />
          <div>
            <p className="font-semibold text-gray-900 mb-1">No addresses found</p>
            <p className="text-sm text-gray-600">Try a different search term</p>
          </div>
        </div>
      )}
    </div>
  );
}
