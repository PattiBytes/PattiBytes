'use client';

import { useState, useEffect } from 'react';
import { geocodingService } from '@/services/geocoding';

export function useLocation() {
  const [location, setLocation] = useState<{
    lat: number;
    lon: number;
    address?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentLocation = async () => {
    setLoading(true);
    setError(null);
    try {
      const coords = await geocodingService.getCurrentLocation();
      const addressData = await geocodingService.reverseGeocode(coords.lat, coords.lon);
      
      setLocation({
        lat: coords.lat,
        lon: coords.lon,
        address: addressData.displayName,
      });
    } catch (err) {
      setError((err as Error).message);
      // Default to Ludhiana if location fails
      setLocation({
        lat: 30.9010,
        lon: 75.8573,
        address: 'Ludhiana, Punjab, India',
      });
    } finally {
      setLoading(false);
    }
  };

  const searchLocation = async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const results = await geocodingService.searchAddress(query);
      if (results.length > 0) {
        setLocation({
          lat: results[0].lat,
          lon: results[0].lon,
          address: results[0].displayName,
        });
        return results;
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  return {
    location,
    loading,
    error,
    getCurrentLocation,
    searchLocation,
  };
}
