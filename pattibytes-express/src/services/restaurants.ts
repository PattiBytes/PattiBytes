/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';

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
  distance?: number; // km
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

/** ---------- helpers (no dependency on locationService) ---------- */
function toNumber(v: any, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeString(v: any): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function toArrayOfStrings(v: any): string[] {
  if (Array.isArray(v)) return v.map((x) => normalizeString(x)).filter(Boolean);
  if (typeof v === 'string') {
    // allow comma separated
    return v
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

function degreesToRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(degreesToRadians(lat1)) *
      Math.cos(degreesToRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isValidCoord(n: any): boolean {
  const v = toNumber(n, Number.NaN);
  return Number.isFinite(v);
}

function normalizeRestaurantRow(row: any): Restaurant {
  // support both snake_case and camelCase columns (your repo has mixed usage)
  const id = normalizeString(row.id);
  const user_id = normalizeString(row.user_id ?? row.userid ?? row.owner_id ?? row.ownerid);

  const business_name = normalizeString(row.business_name ?? row.businessname);
  const business_type = normalizeString(row.business_type ?? row.businesstype ?? 'Restaurant');

  const latitude = toNumber(row.latitude, 0);
  const longitude = toNumber(row.longitude, 0);

  return {
    id,
    user_id,
    business_name,
    business_type,
    logo_url: row.logo_url ?? row.logourl ?? undefined,
    banner_url: row.banner_url ?? row.bannerurl ?? undefined,
    description: row.description ?? undefined,
    cuisine_types: toArrayOfStrings(row.cuisine_types ?? row.cuisinetypes ?? row.cuisine_type ?? row.cuisinetype),
    phone: normalizeString(row.phone),
    email: row.email ?? undefined,
    address: row.address ?? undefined,
    latitude,
    longitude,
    min_order_amount: toNumber(row.min_order_amount ?? row.minorderamount, 0),
    delivery_radius_km: toNumber(row.delivery_radius_km ?? row.deliveryradiuskm ?? row.delivery_radius ?? row.deliveryradius, 5),
    estimated_prep_time: toNumber(row.estimated_prep_time ?? row.estimatedpreptime ?? row.avg_delivery_time ?? row.avgdeliverytime, 30),
    is_active: Boolean(row.is_active ?? row.isactive ?? true),
    average_rating: row.average_rating ?? row.averagerating ?? row.rating ?? undefined,
    total_reviews: row.total_reviews ?? row.totalreviews ?? undefined,
    created_at: normalizeString(row.created_at ?? row.createdat ?? new Date(0).toISOString()),
  };
}

function normalizeMenuItemRow(row: any): MenuItem {
  return {
    id: normalizeString(row.id),
    merchant_id: normalizeString(row.merchant_id ?? row.merchantid),
    name: normalizeString(row.name),
    description: row.description ?? undefined,
    price: toNumber(row.price, 0),
    category: normalizeString(row.category ?? 'Uncategorized') || 'Uncategorized',
    image_url: row.image_url ?? row.imageurl ?? undefined,
    is_available: row.is_available !== false && row.isavailable !== false,
    is_veg: row.is_veg ?? row.isveg ?? undefined,
    discount_percentage: row.discount_percentage ?? row.discountpercentage ?? undefined,
    created_at: row.created_at ?? row.createdat ?? undefined,
  };
}

function withDistance<T extends { latitude: number; longitude: number }>(
  items: T[],
  lat: number,
  lon: number
): Array<T & { distance: number }> {
  return items.map((r) => ({
    ...r,
    distance: haversineKm(lat, lon, r.latitude, r.longitude),
  }));
}

function filterByRadius<T extends { latitude: number; longitude: number }>(
  items: T[],
  lat: number,
  lon: number,
  radiusKm: number
): T[] {
  const r = toNumber(radiusKm, 0);
  if (!Number.isFinite(r) || r <= 0) return items;
  return items.filter((x) => haversineKm(lat, lon, x.latitude, x.longitude) <= r);
}

/** ---------- service ---------- */
class RestaurantService {
  async getNearbyRestaurants(lat: number, lon: number, radiusKm: number = 100): Promise<Restaurant[]> {
    try {
      const { data, error } = await supabase.from('merchants').select('*').eq('is_active', true);

      if (error) {
        console.error('Supabase error:', error);
        return [];
      }
      if (!data || data.length === 0) return [];

      // keep only rows with usable coordinates
      const normalized = data
        .filter((r: any) => isValidCoord(r.latitude) && isValidCoord(r.longitude))
        .map(normalizeRestaurantRow)
        .filter((r) => isValidCoord(r.latitude) && isValidCoord(r.longitude));

      if (normalized.length === 0) return [];

      const filtered = filterByRadius(normalized, lat, lon, radiusKm);
      const sorted = withDistance(filtered, lat, lon).sort((a, b) => a.distance - b.distance);

      return sorted;
    } catch (e) {
      console.error('Exception in getNearbyRestaurants:', e);
      return [];
    }
  }

  async getRestaurantById(id: string): Promise<Restaurant | null> {
    try {
      const { data, error } = await supabase.from('merchants').select('*').eq('id', id).single();
      if (error) throw error;
      const restaurant = normalizeRestaurantRow(data);

      // if DB row has missing coords, keep it but do not crash
      return restaurant;
    } catch (e) {
      console.error('Failed to get restaurant:', e);
      return null;
    }
  }

  async getMenuItems(merchantId: string): Promise<MenuItem[]> {
    try {
      // Try full select first (keeps compatibility if schema has extra columns)
      let { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('merchant_id', merchantId)
        .eq('is_available', true)
        .order('category')
        .order('name');

      if (error) {
        // fallback minimal column list (prevents failures if RLS/permissions hide fields)
        const result = await supabase
          .from('menu_items')
          .select('id, merchant_id, name, description, price, category, image_url, is_available, is_veg, discount_percentage, created_at')
          .eq('merchant_id', merchantId)
          .eq('is_available', true)
          .order('category')
          .order('name');

        data = result.data;
        error = result.error;
      }

      if (error) throw error;
      return (data || []).map(normalizeMenuItemRow);
    } catch (e) {
      console.error('Failed to get menu items:', e);
      return [];
    }
  }

  async getMenuItemsByCategory(merchantId: string): Promise<MenuByCategory> {
    try {
      const menuItems = await this.getMenuItems(merchantId);
      const grouped: MenuByCategory = {};

      for (const item of menuItems) {
        const category = item.category || 'Uncategorized';
        if (!grouped[category]) grouped[category] = [];
        grouped[category].push(item);
      }

      return grouped;
    } catch (e) {
      console.error('Failed to get menu items by category:', e);
      return {};
    }
  }

  async getActivePromoCodes(merchantId: string) {
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .contains('applicable_merchants', [merchantId])
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString());

      if (error) return [];
      return data || [];
    } catch (e) {
      console.error('Failed to get promo codes:', e);
      return [];
    }
  }

  async search(query: string, lat?: number, lon?: number, radiusKm: number = 100) {
    try {
      const q = normalizeString(query).trim();
      const lowerQuery = q.toLowerCase();

      const { data: restaurantRows, error: restaurantError } = await supabase
        .from('merchants')
        .select('*')
        .eq('is_active', true);

      if (restaurantError) {
        console.error('Restaurant search error:', restaurantError);
        return { restaurants: [], menuItems: [] };
      }

      const restaurantsAll = (restaurantRows || [])
        .filter((r: any) => isValidCoord(r.latitude) && isValidCoord(r.longitude))
        .map(normalizeRestaurantRow);

      let restaurants = restaurantsAll.filter((r) => {
        const nameMatch = r.business_name.toLowerCase().includes(lowerQuery);
        const cuisineMatch = r.cuisine_types?.some((c) => c.toLowerCase().includes(lowerQuery));
        return nameMatch || cuisineMatch;
      });

      // optional geo-filter
      if (typeof lat === 'number' && typeof lon === 'number' && Number.isFinite(lat) && Number.isFinite(lon)) {
        restaurants = filterByRadius(restaurants, lat, lon, radiusKm);
        restaurants = withDistance(restaurants, lat, lon).sort((a, b) => a.distance - b.distance);
      }

      const { data: menuItems } = await supabase
        .from('menu_items')
        .select('id, merchant_id, name, description, price, category, image_url, is_available, is_veg, discount_percentage, created_at')
        .eq('is_available', true)
        .or(`name.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`);

      return {
        restaurants,
        menuItems: (menuItems || []).map(normalizeMenuItemRow),
      };
    } catch (e) {
      console.error('Search error:', e);
      return { restaurants: [], menuItems: [] };
    }
  }

  async getRestaurantsByCuisine(cuisine: string, lat: number, lon: number, radiusKm: number = 100): Promise<Restaurant[]> {
    try {
      const cuisineValue = normalizeString(cuisine).trim();
      if (!cuisineValue) return [];

      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('is_active', true)
        .contains('cuisine_types', [cuisineValue]);

      if (error) throw error;

      const restaurants = (data || [])
        .filter((r: any) => isValidCoord(r.latitude) && isValidCoord(r.longitude))
        .map(normalizeRestaurantRow);

      const filtered = filterByRadius(restaurants, lat, lon, radiusKm);
      return withDistance(filtered, lat, lon).sort((a, b) => a.distance - b.distance);
    } catch (e) {
      console.error('Failed to get restaurants by cuisine:', e);
      return [];
    }
  }
}

export const restaurantService = new RestaurantService();
export default restaurantService;
