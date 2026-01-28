export type UserRole = 'customer' | 'merchant' | 'driver' | 'admin';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  is_verified: boolean;
  is_active: boolean;
}

export interface Merchant {
  id: string;
  user_id: string;
  business_name: string;
  business_type: 'restaurant' | 'cafe' | 'bakery' | 'juice_bar' | 'fast_food';
  cuisine_types: string[];
  description?: string;
  logo_url?: string;
  banner_url?: string;
  latitude: number;
  longitude: number;
  is_verified: boolean;
  average_rating: number;
  total_reviews: number;
  delivery_radius_km: number;
  min_order_amount: number;
  estimated_prep_time: number;
}

export interface MenuItem {
  id: string;
  merchant_id: string;
  category_id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_veg: boolean;
  is_available: boolean;
}

export interface Order {
  id: string;
  customer_id: string;
  merchant_id: string;
  driver_id?: string;
  status: OrderStatus;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
  total: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delivery_address: any;
  payment_method: string;
  payment_status: string;
  created_at: string;
}

export type OrderStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'preparing' 
  | 'ready' 
  | 'picked_up' 
  | 'in_transit' 
  | 'delivered' 
  | 'cancelled';
