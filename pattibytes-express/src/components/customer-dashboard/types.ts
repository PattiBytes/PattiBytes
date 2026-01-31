export type Location = {
  lat: number;
  lon: number;
  address: string;
};

export type Merchant = {
  id: string;
  user_id?: string;
  business_name: string;
  business_type?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cuisine_types?: any; // JSON array in your DB
  description?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  phone?: string | null;
  email?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_active?: boolean | null;
  is_verified?: boolean | null;
  average_rating?: number | null;
  total_reviews?: number | null;
  delivery_radius_km?: number | null;
  min_order_amount?: number | null;
  estimated_prep_time?: number | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;

  // computed on client
  distance_km?: number;
};

export type MenuItem = {
  id: string;
  merchant_id: string;
  name: string;
  description?: string | null;
  price: number;
  category?: string | null;
  image_url?: string | null;
  is_available?: boolean | null;
  is_veg?: boolean | null;
  preparation_time?: number | null;
  discount_percentage?: number | null;
};

export type SearchResult =
  | { type: 'restaurant'; restaurant: Merchant }
  | { type: 'menu'; menu: MenuItem; restaurantName?: string };
