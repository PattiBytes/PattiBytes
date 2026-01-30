export interface GeocodingResult {
  lat: number;
  lon: number;
  displayName: string;
  address?: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

class GeocodingService {
  private baseUrl = 'https://nominatim.openstreetmap.org';
  private debounceTimeout: NodeJS.Timeout | null = null;

  async getCurrentLocation(): Promise<{ lat: number; lon: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => {
          let errorMessage = 'Failed to get location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out.';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }

  async reverseGeocode(lat: number, lon: number): Promise<GeocodingResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to reverse geocode');
      }

      const data = await response.json();

      return {
        lat,
        lon,
        displayName: data.display_name,
        address: data.address,
      };
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return {
        lat,
        lon,
        displayName: `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
      };
    }
  }

  async searchAddress(query: string): Promise<GeocodingResult[]> {
    if (!query || query.trim().length < 3) {
      return [];
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to search address');
      }

      const data = await response.json();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.map((item: any) => ({
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        displayName: item.display_name,
        address: item.address,
      }));
    } catch (error) {
      console.error('Address search error:', error);
      return [];
    }
  }

  debouncedSearch(query: string, callback: (results: GeocodingResult[]) => void, delay = 500) {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    this.debounceTimeout = setTimeout(async () => {
      const results = await this.searchAddress(query);
      callback(results);
    }, delay);
  }
}

export const geocodingService = new GeocodingService();
