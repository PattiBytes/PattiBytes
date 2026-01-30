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
  address?: string;
  latitude: number;
  longitude: number;
  min_order_amount: number;
  delivery_radius_km: number;
  estimated_prep_time: number;
  is_active: boolean;
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
  is_veg?: boolean;
  discount_percentage?: number;
  created_at?: string;
}

export interface MenuByCategory {
  [category: string]: MenuItem[];
}

class RestaurantService {
  async getNearbyRestaurants(lat: number, lon: number, radiusKm: number = 100): Promise<Restaurant[]> {
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.error('Supabase error:', error);
        return [];
      }

      if (!data || data.length === 0) {
        console.log('No active merchants found');
        return [];
      }

      console.log(`Found ${data.length} active merchants in database`);

      const validRestaurants = data.filter(r => r.latitude != null && r.longitude != null);
      console.log(`${validRestaurants.length} merchants have valid coordinates`);

      if (validRestaurants.length === 0) {
        console.warn('No merchants have latitude/longitude set');
        return [];
      }

      const normalizedData = validRestaurants.map((restaurant: any) => ({
        id: restaurant.id,
        user_id: restaurant.user_id,
        business_name: restaurant.business_name,
        business_type: restaurant.business_type || 'Restaurant',
        logo_url: restaurant.logo_url,
        banner_url: restaurant.banner_url,
        description: restaurant.description,
        cuisine_types: Array.isArray(restaurant.cuisine_types) ? restaurant.cuisine_types : [],
        phone: restaurant.phone,
        email: restaurant.email,
        address: restaurant.address,
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
        min_order_amount: restaurant.min_order_amount || 0,
        delivery_radius_km: restaurant.delivery_radius_km || restaurant.delivery_radius || 5,
        estimated_prep_time: restaurant.estimated_prep_time || restaurant.avg_delivery_time || 30,
        is_active: restaurant.is_active,
        average_rating: restaurant.average_rating || restaurant.rating,
        total_reviews: restaurant.total_reviews,
        created_at: restaurant.created_at,
      }));

      const nearbyRestaurants = locationService.filterByRadius(
        normalizedData as Restaurant[],
        lat,
        lon,
        radiusKm
      );

      console.log(`${nearbyRestaurants.length} merchants within ${radiusKm}km of location`);

      const withDistance = locationService.sortByDistance(nearbyRestaurants, lat, lon);

      return withDistance;
    } catch (error) {
      console.error('Exception in getNearbyRestaurants:', error);
      return [];
    }
  }

  async getRestaurantById(id: string): Promise<Restaurant | null> {
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        user_id: data.user_id,
        business_name: data.business_name,
        business_type: data.business_type || 'Restaurant',
        logo_url: data.logo_url,
        banner_url: data.banner_url,
        description: data.description,
        cuisine_types: Array.isArray(data.cuisine_types) ? data.cuisine_types : [],
        phone: data.phone,
        email: data.email,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        min_order_amount: data.min_order_amount || 0,
        delivery_radius_km: data.delivery_radius_km || data.delivery_radius || 5,
        estimated_prep_time: data.estimated_prep_time || data.avg_delivery_time || 30,
        is_active: data.is_active,
        average_rating: data.average_rating || data.rating,
        total_reviews: data.total_reviews,
        created_at: data.created_at,
      } as Restaurant;
    } catch (error) {
      console.error('Failed to get restaurant:', error);
      return null;
    }
  }

  async getMenuItems(merchantId: string): Promise<MenuItem[]> {
    try {
      let { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('merchant_id', merchantId)
        .eq('is_available', true)
        .order('category')
        .order('name');

      if (error) {
        console.warn('Full select failed, trying minimal columns:', error.message);
        const result = await supabase
          .from('menu_items')
          .select('id, merchant_id, name, description, price, category, image_url, is_available')
          .eq('merchant_id', merchantId)
          .eq('is_available', true)
          .order('category')
          .order('name');
        
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.id,
        merchant_id: item.merchant_id,
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        image_url: item.image_url,
        is_available: item.is_available !== false,
        is_veg: item.is_veg,
        discount_percentage: item.discount_percentage,
        created_at: item.created_at,
      }));
    } catch (error) {
      console.error('Failed to get menu items:', error);
      return [];
    }
  }

  async getMenuItemsByCategory(merchantId: string): Promise<MenuByCategory> {
    try {
      const menuItems = await this.getMenuItems(merchantId);
      
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

  async getActivePromoCodes(merchantId: string) {
    try {
      // Promo codes don't have merchant_id, they have applicable_merchants array
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .contains('applicable_merchants', [merchantId])
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString());

      if (error) {
        console.warn('Promo codes not available:', error.message);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error('Failed to get promo codes:', error);
      return [];
    }
  }

  async search(query: string, lat?: number, lon?: number, radiusKm: number = 100) {
    try {
      const lowerQuery = query.toLowerCase();

      const { data: restaurants, error: restaurantError } = await supabase
        .from('merchants')
        .select('*')
        .eq('is_active', true);

      if (restaurantError) {
        console.error('Restaurant search error:', restaurantError);
        return { restaurants: [], menuItems: [] };
      }

      const validRestaurants = (restaurants || []).filter(r => r.latitude != null && r.longitude != null);

      const normalizedRestaurants = validRestaurants.map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        business_name: r.business_name,
        business_type: r.business_type || 'Restaurant',
        logo_url: r.logo_url,
        banner_url: r.banner_url,
        description: r.description,
        cuisine_types: Array.isArray(r.cuisine_types) ? r.cuisine_types : [],
        phone: r.phone,
        email: r.email,
        address: r.address,
        latitude: r.latitude,
        longitude: r.longitude,
        min_order_amount: r.min_order_amount || 0,
        delivery_radius_km: r.delivery_radius_km || r.delivery_radius || 5,
        estimated_prep_time: r.estimated_prep_time || r.avg_delivery_time || 30,
        is_active: r.is_active,
        average_rating: r.average_rating || r.rating,
        total_reviews: r.total_reviews,
        created_at: r.created_at,
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

      const { data: menuItems } = await supabase
        .from('menu_items')
        .select('id, merchant_id, name, description, price, category, image_url, is_available')
        .eq('is_available', true)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`);

      return {
        restaurants: filteredRestaurants,
        menuItems: menuItems || [],
      };
    } catch (error) {
      console.error('Search error:', error);
      return { restaurants: [], menuItems: [] };
    }
  }

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
        .contains('cuisine_types', [cuisine]);

      if (error) throw error;

      const validData = (data || []).filter(r => r.latitude != null && r.longitude != null);

      const normalizedData = validData.map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        business_name: r.business_name,
        business_type: r.business_type || 'Restaurant',
        logo_url: r.logo_url,
        banner_url: r.banner_url,
        description: r.description,
        cuisine_types: Array.isArray(r.cuisine_types) ? r.cuisine_types : [],
        phone: r.phone,
        email: r.email,
        address: r.address,
        latitude: r.latitude,
        longitude: r.longitude,
        min_order_amount: r.min_order_amount || 0,
        delivery_radius_km: r.delivery_radius_km || r.delivery_radius || 5,
        estimated_prep_time: r.estimated_prep_time || r.avg_delivery_time || 30,
        is_active: r.is_active,
        average_rating: r.average_rating || r.rating,
        total_reviews: r.total_reviews,
        created_at: r.created_at,
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
