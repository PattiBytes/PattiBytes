'use client';

import { useState, useEffect, useCallback } from 'react';
import { geocodingService } from '@/services/geocoding';

interface Location {
  lat: number;
  lon: number;
  address?: string;
}

export function useLocation() {
  const [location, setLocationState] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const coords = await geocodingService.getCurrentLocation();
      const addressData = await geocodingService.reverseGeocode(coords.lat, coords.lon);
      
      setLocationState({
        lat: coords.lat,
        lon: coords.lon,
        address: addressData.displayName,
      });
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      
      // Default to Ludhiana if location fails
      setLocationState({
        lat: 30.9010,
        lon: 75.8573,
        address: 'Ludhiana, Punjab, India',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const searchLocation = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const results = await geocodingService.searchAddress(query);
      if (results.length > 0) {
        setLocationState({
          lat: results[0].lat,
          lon: results[0].lon,
          address: results[0].displayName,
        });
        return results;
      }
      return [];
    } catch (err) {
      setError((err as Error).message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const setLocation = useCallback((newLocation: Location) => {
    setLocationState(newLocation);
  }, []);

  useEffect(() => {
    // Auto-fetch location on mount
    getCurrentLocation();
  }, [getCurrentLocation]);

  return {
    location,
    loading,
    error,
    getCurrentLocation,
    searchLocation,
    setLocation,
  };
}
