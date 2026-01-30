import { supabase } from '@/lib/supabase';

export interface SavedAddress {
  city: string;
  postal_code: string;
  city: string;
  postal_code: string;
  state: string;
  id: string;
  user_id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  is_default: boolean;
  created_at: string;
}

export const locationService = {
  // Calculate distance between two points (Haversine formula)
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
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
    return R * c;
  },

  toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  },

  // Calculate delivery charge based on distance
  calculateDeliveryCharge(distanceKm: number): number {
    const baseCharge = 20; // ₹20 base charge
    const perKmCharge = 8; // ₹8 per km
    const freeDeliveryDistance = 2; // Free up to 2km

    if (distanceKm <= freeDeliveryDistance) {
      return 0;
    }

    const chargeableDistance = distanceKm - freeDeliveryDistance;
    return Math.ceil(baseCharge + chargeableDistance * perKmCharge);
  },

  // Geocode address using LocationIQ
  async geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
    const apiKey = process.env.NEXT_PUBLIC_LOCATIONIQ_API_KEY;
    
    if (!apiKey) {
      console.error('LocationIQ API key not configured');
      return null;
    }

    try {
      const response = await fetch(
        `https://us1.locationiq.com/v1/search.php?key=${apiKey}&q=${encodeURIComponent(
          address
        )}&format=json&limit=1`
      );

      if (!response.ok) throw new Error('Geocoding failed');

      const data = await response.json();
      if (data.length === 0) return null;

      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
      };
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  },

  // Reverse geocode coordinates to address
  async reverseGeocode(lat: number, lon: number): Promise<string | null> {
    const apiKey = process.env.NEXT_PUBLIC_LOCATIONIQ_API_KEY;
    
    if (!apiKey) {
      console.error('LocationIQ API key not configured');
      return null;
    }

    try {
      const response = await fetch(
        `https://us1.locationiq.com/v1/reverse.php?key=${apiKey}&lat=${lat}&lon=${lon}&format=json`
      );

      if (!response.ok) throw new Error('Reverse geocoding failed');

      const data = await response.json();
      return data.display_name;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  },

  // Get user's saved addresses
  async getSavedAddresses(userId: string): Promise<SavedAddress[]> {
    const { data, error } = await supabase
      .from('saved_addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as SavedAddress[];
  },

  // Save a new address
  async saveAddress(address: Omit<SavedAddress, 'id' | 'created_at'>): Promise<SavedAddress> {
    // If this is set as default, unset all others
    if (address.is_default) {
      await supabase
        .from('saved_addresses')
        .update({ is_default: false })
        .eq('user_id', address.user_id);
    }

    const { data, error } = await supabase
      .from('saved_addresses')
      .insert([address])
      .select()
      .single();

    if (error) throw error;
    return data as SavedAddress;
  },

  // Update an address
  async updateAddress(
    addressId: string,
    updates: Partial<SavedAddress>
  ): Promise<SavedAddress> {
    // If setting as default, unset all others for this user
    if (updates.is_default) {
      const { data: address } = await supabase
        .from('saved_addresses')
        .select('user_id')
        .eq('id', addressId)
        .single();

      if (address) {
        await supabase
          .from('saved_addresses')
          .update({ is_default: false })
          .eq('user_id', address.user_id);
      }
    }

    const { data, error } = await supabase
      .from('saved_addresses')
      .update(updates)
      .eq('id', addressId)
      .select()
      .single();

    if (error) throw error;
    return data as SavedAddress;
  },

  // Delete an address
  async deleteAddress(addressId: string): Promise<void> {
    const { error } = await supabase
      .from('saved_addresses')
      .delete()
      .eq('id', addressId);

    if (error) throw error;
  },

  // Get default address
  async getDefaultAddress(userId: string): Promise<SavedAddress | null> {
    const { data, error } = await supabase
      .from('saved_addresses')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single();

    if (error) return null;
    return data as SavedAddress;
  },
};
