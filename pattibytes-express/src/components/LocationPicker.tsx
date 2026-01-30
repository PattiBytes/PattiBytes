/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader, Navigation } from 'lucide-react';
import { geocodingService } from '@/services/geocoding';

interface LocationPickerProps {
  onLocationSelect: (location: {
    lat: number;
    lon: number;
    address: string;
  }) => void;
  initialLat?: number;
  initialLon?: number;
}

export default function LocationPicker({
  onLocationSelect,
  initialLat = 30.9010,
  initialLon = 75.8573,
}: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState({
    lat: initialLat,
    lon: initialLon,
    address: '',
  });
  const [gettingLocation, setGettingLocation] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Initialize Leaflet map
  useEffect(() => {
  if (typeof window === 'undefined') return;

  const loadMap = async () => {
    const L = (await import('leaflet')).default;
    
    // Import CSS dynamically
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (mapRef.current && !mapInstance.current) {
      // Fix default marker icon issue
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      mapInstance.current = L.map(mapRef.current).setView(
        [selectedLocation.lat, selectedLocation.lon],
        13
      );

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(mapInstance.current);

      // Add marker
      markerRef.current = L.marker([selectedLocation.lat, selectedLocation.lon], {
        draggable: true,
      }).addTo(mapInstance.current);

      // Update location on marker drag
      markerRef.current.on('dragend', async () => {
        const position = markerRef.current.getLatLng();
        await updateLocation(position.lat, position.lng);
      });

      // Update location on map click
      mapInstance.current.on('click', async (e: any) => {
        await updateLocation(e.latlng.lat, e.latlng.lng);
      });
    }
  };

  loadMap();

  return () => {
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }
  };
}, []);


  const updateLocation = async (lat: number, lon: number) => {
    try {
      const addressData = await geocodingService.reverseGeocode(lat, lon);
      const location = {
        lat,
        lon,
        address: addressData.displayName,
      };
      
      setSelectedLocation(location);
      onLocationSelect(location);

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lon]);
      }
      if (mapInstance.current) {
        mapInstance.current.setView([lat, lon], 13);
      }
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const results = await geocodingService.searchAddress(searchQuery);
      setSuggestions(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const selectSuggestion = async (suggestion: any) => {
    await updateLocation(suggestion.lat, suggestion.lon);
    setSuggestions([]);
    setSearchQuery('');
  };

  const getCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      const coords = await geocodingService.getCurrentLocation();
      await updateLocation(coords.lat, coords.lon);
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setGettingLocation(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search for location..."
              className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching}
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            {searching ? <Loader className="animate-spin" size={20} /> : 'Search'}
          </button>
          <button
            onClick={getCurrentLocation}
            disabled={gettingLocation}
            className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            title="Use current location"
          >
            {gettingLocation ? (
              <Loader className="animate-spin" size={20} />
            ) : (
              <Navigation size={20} />
            )}
          </button>
        </div>

        {/* Search Suggestions */}
        {suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-2 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => selectSuggestion(suggestion)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 flex items-start gap-3"
              >
                <MapPin size={20} className="text-primary flex-shrink-0 mt-1" />
                <span className="text-sm">{suggestion.displayName}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div
        ref={mapRef}
        className="w-full h-96 rounded-lg border-2 border-gray-300 overflow-hidden"
      />

      {/* Selected Address Display */}
      {selectedLocation.address && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <MapPin className="text-blue-600 flex-shrink-0 mt-1" size={20} />
            <div>
              <p className="font-semibold text-blue-900 mb-1">Selected Location</p>
              <p className="text-sm text-blue-800">{selectedLocation.address}</p>
              <p className="text-xs text-blue-600 mt-2">
                Lat: {selectedLocation.lat.toFixed(6)}, Lon: {selectedLocation.lon.toFixed(6)}
              </p>
            </div>
          </div>
        </div>
      )}

      <p className="text-sm text-gray-600">
        💡 Click on the map or drag the marker to select your exact location
      </p>
    </div>
  );
}
