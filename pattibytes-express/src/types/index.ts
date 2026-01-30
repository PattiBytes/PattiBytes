export interface User {
  user_metadata: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  avatar_url: any;
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: 'customer' | 'merchant' | 'driver' | 'admin' | 'superadmin';
  created_at: string;
  updated_at: string;
}

export interface DeliveryAddress {
  address: string;
  city?: string;
  state?: string;
  zipcode?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface Merchant {
  id: string;
  user_id: string;
  owner_id: string;
  business_name: string;
  description?: string;
  cuisine_type?: string[];
  address: DeliveryAddress;
  latitude?: number;
  longitude?: number;
  phone: string;
  email: string;
  banner_url?: string;
  logo_url?: string;
  is_active: boolean;
  is_verified: boolean;
  rating: number;
  total_orders: number;
  opening_hours?: Record<string, { open: string; close: string }>;
  created_at: string;
  updated_at: string;
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
  preparation_time?: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  special_instructions?: string;
}

export interface Order {
  id: string;
  customer_id: string;
  merchant_id: string;
  driver_id?: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  tax: number;
  total: number;
  delivery_address: DeliveryAddress;
  payment_method: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  special_instructions?: string;
  estimated_delivery_time?: string;
  actual_delivery_time?: string;
  rating?: number;
  review?: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  specialInstructions?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body?: string;
  type: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  order_id: string;
  customer_id: string;
  merchant_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface Driver {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  vehicle_type: string;
  vehicle_number: string;
  license_number: string;
  is_available: boolean;
  is_verified: boolean;
  rating: number;
  total_deliveries: number;
  current_location?: {
    latitude: number;
    longitude: number;
  };
  created_at: string;
  updated_at: string;
}

export interface AccessRequest {
  id: string;
  user_id: string;
  requested_role: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}
