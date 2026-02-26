// ─── MERCHANTS / RESTAURANTS ───────────────────────────────────────────────
export interface Merchant {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  cuisine_types: string[];
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  phone: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  is_verified: boolean;
  average_rating: number | null;
  total_reviews: number | null;
  delivery_radius_km: number | null;
  min_order_amount: number | null;
  estimated_prep_time: number | null;
  commission_rate: number | null;
  address: string | null;
  delivery_radius: number | null;
  avg_delivery_time: number | null;
  rating: number | null;
  total_orders: number | null;
  is_featured: boolean | null;
  opening_time: string | null;
  closing_time: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  gst_enabled: boolean;
  gst_percentage: number | null;
  created_at: string;
  updated_at: string;
  // computed
  distance_km?: number;
  offer_label?: string | null;
  is_open?: boolean;
}

// ─── ORDERS ────────────────────────────────────────────────────────────────
export interface Order {
  id: string;
  customer_id: string;
  merchant_id: string;
  driver_id: string | null;
  order_number: number;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  tax: number;
  payment_method: 'cod' | 'upi' | 'card';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  delivery_address: string;
  customer_notes: string | null;
  created_at: string;
  updated_at: string;
  customer_location: { lat: number; lng: number } | null;
  driver_location: { lat: number; lng: number } | null;
  promo_code: string | null;
  total_amount: number;
  estimated_delivery_time: string | null;
  actual_delivery_time: string | null;
  preparation_time: number | null;
  cancellation_reason: string | null;
  rating: number | null;
  review: string | null;
  delivery_distance_km: number | null;
  customer_phone: string | null;
  special_instructions: string | null;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  discount: number;
  items: OrderItem[];
  cancelled_by: string | null;
  // joined
  merchants?: { business_name: string; address: string | null; latitude: number | null; longitude: number | null; phone: string | null } | null;
  merchant_name?: string;
}

export type OrderStatus =
  | 'pending' | 'confirmed' | 'preparing' | 'ready'
  | 'assigned' | 'picked_up' | 'on_the_way' | 'out_for_delivery'
  | 'delivered' | 'cancelled' | 'rejected';

export interface OrderItem {
  id: string;
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  is_veg: boolean;
  category: string | null;
  image_url: string | null;
  discount_percentage: number;
  merchant_id: string;
}

// ─── PROFILE / USER ────────────────────────────────────────────────────────
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: 'customer' | 'driver' | 'merchant' | 'admin';
  avatar_url: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  profile_completed: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  is_approved: boolean;
  cancelled_orders_count: number;
  is_trusted: boolean;
  trust_score: number;
  total_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  last_order_date: string | null;
  account_status: 'active' | 'suspended' | 'banned';
}

// ─── PROMO CODES ───────────────────────────────────────────────────────────
export interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
  scope: 'global' | 'merchant';
  merchant_id: string | null;
  menu_item_ids: string[] | null;
  category_ids: string[] | null;
  valid_days: number[] | null;
  valid_time_start: string | null;
  valid_time_end: string | null;
  created_by: string | null;
  max_uses_per_user: number | null;
  start_time: string | null;
  end_time: string | null;
  deal_type: 'standard' | 'bxgy' | 'cart_discount' | null;
  deal_json: any;
  auto_apply: boolean;
  priority: number;
}

// ─── SAVED ADDRESSES ───────────────────────────────────────────────────────
export interface SavedAddress {
  id: string;
  customer_id: string;
  label: string;
  recipient_name: string;
  recipient_phone: string;
  address: string;
  apartment_floor: string | null;
  landmark: string | null;
  latitude: number;
  longitude: number;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  is_default: boolean;
  delivery_instructions: string | null;
  created_at: string;
  updated_at: string;
}

// ─── APP SETTINGS ──────────────────────────────────────────────────────────
export interface AppSettings {
  id: string;
  app_name: string;
  support_email: string;
  support_phone: string;
  business_address: string;
  facebook_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  youtube_url: string | null;
  website_url: string | null;
  delivery_fee: number;
  min_order_amount: number;
  tax_percentage: number;
  custom_links: { id: string; url: string; title: string; enabled: boolean; logo_url: string }[] | null;
  customer_search_radius_km: number;
  announcement: {
    type: string; title: string; message: string; enabled: boolean;
    link_url?: string; image_url?: string; start_at: string; end_at: string;
    dismiss_key: string; dismissible: boolean;
  } | null;
  show_menu_images: boolean;
  delivery_fee_enabled: boolean;
  delivery_fee_schedule: any;
  delivery_fee_show_to_customer: boolean;
  base_delivery_radius_km: number;
  per_km_fee_beyond_base: number;
  app_logo_url: string | null;
}

// ─── CART ──────────────────────────────────────────────────────────────────
export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  is_veg: boolean;
  image_url: string | null;
  discount_percentage: number;
  merchant_id: string;
  category: string | null;
}

export interface Cart {
  merchant_id: string;
  merchant_name: string;
  items: CartItem[];
  subtotal: number;
}

export interface PromoResult {
  valid: boolean;
  discount: number;
  message: string;
  promo_code: PromoCode | null;
}

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  'pending','confirmed','preparing','ready','assigned','picked_up','on_the_way','out_for_delivery'
];

export const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B', confirmed: '#3B82F6', preparing: '#8B5CF6',
  ready: '#10B981', assigned: '#06B6D4', picked_up: '#F97316',
  on_the_way: '#F97316', out_for_delivery: '#84CC16',
  delivered: '#22C55E', cancelled: '#EF4444', rejected: '#EF4444',
};
