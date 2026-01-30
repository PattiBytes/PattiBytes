/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';
import { locationService } from './location';

export interface Restaurant {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  logo_url?: string;
  banner_url?: string;
  description?: string;
  cuisine_types: string[];
  phone: string;
  email?: string;
  latitude: number;
  longitude: number;
  min_order_amount: number;
  delivery_radius_km: number;
  estimated_prep_time: number;
  is_active: boolean;
  approval_status: string;
  average_rating?: number;
  total_reviews?: number;
  created_at: string;
  distance?: number;
}

export interface MenuItem {
  id: string;
  merchant_id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image_url?: string;
  is_available: boolean;
  is_veg: boolean;
  discount_percentage?: number;
  original_price?: number;
  created_at: string;
}

export interface MenuByCategory {
  [category: string]: MenuItem[];
}

class RestaurantService {
  /**
   * Get nearby restaurants within radius
   */
  async getNearbyRestaurants(lat: number, lon: number, radiusKm: number = 100): Promise<Restaurant[]> {
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('is_active', true)
        .eq('approval_status', 'approved')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error) {
        console.error('Error fetching restaurants:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      const normalizedData = data.map((restaurant: any) => ({
        ...restaurant,
        cuisine_types: Array.isArray(restaurant.cuisine_types) ? restaurant.cuisine_types : [],
        business_type: restaurant.business_type || 'Restaurant',
        min_order_amount: restaurant.min_order_amount || 0,
        delivery_radius_km: restaurant.delivery_radius_km || 5,
        estimated_prep_time: restaurant.estimated_prep_time || 30,
      }));

      const nearbyRestaurants = locationService.filterByRadius(
        normalizedData as Restaurant[],
        lat,
        lon,
        radiusKm
      );

      const withDistance = locationService.sortByDistance(nearbyRestaurants, lat, lon);

      return withDistance;
    } catch (error) {
      console.error('Failed to get nearby restaurants:', error);
      return [];
    }
  }

  /**
   * Get restaurant by ID
   */
  async getRestaurantById(id: string): Promise<Restaurant | null> {
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        ...data,
        cuisine_types: Array.isArray(data.cuisine_types) ? data.cuisine_types : [],
        business_type: data.business_type || 'Restaurant',
        min_order_amount: data.min_order_amount || 0,
        delivery_radius_km: data.delivery_radius_km || 5,
        estimated_prep_time: data.estimated_prep_time || 30,
      } as Restaurant;
    } catch (error) {
      console.error('Failed to get restaurant:', error);
      return null;
    }
  }

  /**
   * Get menu items for a restaurant
   */
  async getMenuItems(merchantId: string): Promise<MenuItem[]> {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('merchant_id', merchantId)
        .eq('is_available', true)
        .order('category')
        .order('name');

      if (error) throw error;
      return (data as MenuItem[]) || [];
    } catch (error) {
      console.error('Failed to get menu items:', error);
      return [];
    }
  }

  /**
   * Get menu items grouped by category
   */
  async getMenuItemsByCategory(merchantId: string): Promise<MenuByCategory> {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('merchant_id', merchantId)
        .eq('is_available', true)
        .order('category')
        .order('name');

      if (error) throw error;

      const menuItems = (data as MenuItem[]) || [];

      // Group by category
      const grouped: MenuByCategory = {};
      menuItems.forEach((item) => {
        const category = item.category || 'Uncategorized';
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(item);
      });

      return grouped;
    } catch (error) {
      console.error('Failed to get menu items by category:', error);
      return {};
    }
  }

  /**
   * Get active promo codes for a restaurant
   */
  async getActivePromoCodes(merchantId: string) {
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('merchant_id', merchantId)
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString());

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get promo codes:', error);
      return [];
    }
  }

  /**
   * Search restaurants and menu items
   */
  async search(query: string, lat?: number, lon?: number, radiusKm: number = 100) {
    try {
      const lowerQuery = query.toLowerCase();

      const { data: restaurants, error: restaurantError } = await supabase
        .from('merchants')
        .select('*')
        .eq('is_active', true)
        .eq('approval_status', 'approved')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (restaurantError) throw restaurantError;

      const normalizedRestaurants = (restaurants || []).map((r: any) => ({
        ...r,
        cuisine_types: Array.isArray(r.cuisine_types) ? r.cuisine_types : [],
        business_type: r.business_type || 'Restaurant',
        min_order_amount: r.min_order_amount || 0,
        delivery_radius_km: r.delivery_radius_km || 5,
        estimated_prep_time: r.estimated_prep_time || 30,
      }));

      let filteredRestaurants = normalizedRestaurants.filter(
        (r: any) =>
          r.business_name.toLowerCase().includes(lowerQuery) ||
          r.cuisine_types?.some((c: string) => c.toLowerCase().includes(lowerQuery))
      );

      if (lat && lon) {
        filteredRestaurants = locationService.filterByRadius(
          filteredRestaurants,
          lat,
          lon,
          radiusKm
        );
      }

      const { data: menuItems, error: menuError } = await supabase
        .from('menu_items')
        .select('*, merchant:merchants!inner(*)')
        .eq('is_available', true)
        .eq('merchant.is_active', true)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`);

      if (menuError) throw menuError;

      let filteredMenuItems = menuItems || [];

      if (lat && lon) {
        filteredMenuItems = filteredMenuItems.filter((item: any) => {
          if (!item.merchant?.latitude || !item.merchant?.longitude) return false;
          return locationService.isWithinRadius(
            lat,
            lon,
            item.merchant.latitude,
            item.merchant.longitude,
            radiusKm
          );
        });
      }

      return {
        restaurants: filteredRestaurants,
        menuItems: filteredMenuItems,
      };
    } catch (error) {
      console.error('Search error:', error);
      return { restaurants: [], menuItems: [] };
    }
  }

  /**
   * Get restaurants by cuisine type
   */
  async getRestaurantsByCuisine(
    cuisine: string,
    lat: number,
    lon: number,
    radiusKm: number = 100
  ): Promise<Restaurant[]> {
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('is_active', true)
        .eq('approval_status', 'approved')
        .contains('cuisine_types', [cuisine])
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error) throw error;

      const normalizedData = (data || []).map((r: any) => ({
        ...r,
        cuisine_types: Array.isArray(r.cuisine_types) ? r.cuisine_types : [],
        business_type: r.business_type || 'Restaurant',
        min_order_amount: r.min_order_amount || 0,
        delivery_radius_km: r.delivery_radius_km || 5,
        estimated_prep_time: r.estimated_prep_time || 30,
      }));

      const filtered = locationService.filterByRadius(normalizedData as Restaurant[], lat, lon, radiusKm);
      return locationService.sortByDistance(filtered, lat, lon);
    } catch (error) {
      console.error('Failed to get restaurants by cuisine:', error);
      return [];
    }
  }
}

export const restaurantService = new RestaurantService();
