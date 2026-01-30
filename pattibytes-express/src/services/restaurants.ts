/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';
import { Merchant, MenuItem } from '@/types';

export const restaurantService = {
  async getNearbyRestaurants(latitude: number, longitude: number, radiusKm: number = 10) {
    const { data, error } = await supabase
      .from('merchants')
      .select('*')
      .eq('is_verified', true)
      .eq('is_active', true);

    if (error) throw error;

    // Filter by distance
    const filtered = data.filter((merchant) => {
      if (!merchant.latitude || !merchant.longitude) return false;
      
      const distance = calculateDistance(
        latitude,
        longitude,
        merchant.latitude,
        merchant.longitude
      );
      
      return distance <= radiusKm;
    });

    return filtered as Merchant[];
  },

  async getRestaurantById(id: string) {
    const { data, error } = await supabase
      .from('merchants')
      .select(`
        *,
        menu_items (*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async searchRestaurants(query: string, latitude?: number, longitude?: number, radiusKm: number = 20) {
    const { data, error } = await supabase
      .from('merchants')
      .select('*')
      .ilike('business_name', `%${query}%`)
      .eq('is_verified', true)
      .eq('is_active', true);

    if (error) throw error;

    // If location provided, filter by distance
    if (latitude && longitude) {
      const filtered = data.filter((merchant) => {
        if (!merchant.latitude || !merchant.longitude) return false;
        
        const distance = calculateDistance(
          latitude,
          longitude,
          merchant.latitude,
          merchant.longitude
        );
        
        return distance <= radiusKm;
      });
      return filtered as Merchant[];
    }

    return data as Merchant[];
  },

  async getMenuItems(merchantId: string) {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('is_available', true)
      .order('category', { ascending: true });

    if (error) throw error;
    return data as MenuItem[];
  },

  async getMenuItemsByCategory(merchantId: string) {
    const items = await this.getMenuItems(merchantId);
    
    // Group by category
    const grouped = items.reduce((acc: any, item: any) => {
      const category = item.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {});

    return grouped;
  },
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
