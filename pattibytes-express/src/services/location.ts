import { supabase } from '@/lib/supabase';

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface LocationData extends Coordinates {
  address?: string;
}

export interface SavedAddress {
  id: string;
  customer_id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  postal_code?: string;
  is_default: boolean;
  created_at: string;
}

class LocationService {
  /**
   * Calculate distance between two points using Haversine formula
   * Returns distance in kilometers
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Check if a point is within a given radius
   */
  isWithinRadius(
    centerLat: number,
    centerLon: number,
    pointLat: number,
    pointLon: number,
    radiusKm: number
  ): boolean {
    const distance = this.calculateDistance(centerLat, centerLon, pointLat, pointLon);
    return distance <= radiusKm;
  }

  /**
   * Calculate delivery charge based on distance
   */
  calculateDeliveryCharge(distanceKm: number): number {
    const baseCharge = 20; // ₹20 base charge
    const perKmCharge = 8; // ₹8 per km
    const freeDeliveryDistance = 2; // Free up to 2km

    if (distanceKm <= freeDeliveryDistance) {
      return 0;
    }

    const chargeableDistance = distanceKm - freeDeliveryDistance;
    return Math.ceil(baseCharge + chargeableDistance * perKmCharge);
  }

  /**
   * Get current location from browser
   */
  async getCurrentLocation(): Promise<Coordinates> {
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
              errorMessage = 'Location permission denied';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
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

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(lat: number, lon: number): Promise<string> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`
      );

      if (!response.ok) {
        throw new Error('Failed to reverse geocode');
      }

      const data = await response.json();
      return data.display_name || `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    }
  }

  /**
   * Sort locations by distance from a point
   */
  sortByDistance<T extends { latitude: number; longitude: number }>(
    items: T[],
    fromLat: number,
    fromLon: number
  ): (T & { distance: number })[] {
    return items
      .map((item) => ({
        ...item,
        distance: this.calculateDistance(fromLat, fromLon, item.latitude, item.longitude),
      }))
      .sort((a, b) => a.distance - b.distance);
  }

  /**
   * Filter locations within radius
   */
  filterByRadius<T extends { latitude: number; longitude: number }>(
    items: T[],
    centerLat: number,
    centerLon: number,
    radiusKm: number
  ): T[] {
    return items.filter((item) =>
      this.isWithinRadius(centerLat, centerLon, item.latitude, item.longitude, radiusKm)
    );
  }

  /**
   * Get user's saved addresses
   */
  async getSavedAddresses(userId: string): Promise<SavedAddress[]> {
    const { data, error } = await supabase
      .from('saved_addresses')
      .select('*')
      .eq('customer_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching saved addresses:', error);
      return [];
    }
    return (data as SavedAddress[]) || [];
  }

  /**
   * Save a new address
   */
  async saveAddress(address: Omit<SavedAddress, 'id' | 'created_at'>): Promise<SavedAddress | null> {
    try {
      // If this is set as default, unset all others
      if (address.is_default) {
        await supabase
          .from('saved_addresses')
          .update({ is_default: false })
          .eq('customer_id', address.customer_id);
      }

      const { data, error } = await supabase
        .from('saved_addresses')
        .insert([address])
        .select()
        .single();

      if (error) throw error;
      return data as SavedAddress;
    } catch (error) {
      console.error('Error saving address:', error);
      return null;
    }
  }

  /**
   * Delete an address
   */
  async deleteAddress(addressId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('saved_addresses')
        .delete()
        .eq('id', addressId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting address:', error);
      return false;
    }
  }

  /**
   * Get default address
   */
  async getDefaultAddress(userId: string): Promise<SavedAddress | null> {
    const { data, error } = await supabase
      .from('saved_addresses')
      .select('*')
      .eq('customer_id', userId)
      .eq('is_default', true)
      .single();

    if (error) return null;
    return data as SavedAddress;
  }
}

export const locationService = new LocationService();
