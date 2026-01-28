export interface User {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  role: 'customer' | 'merchant' | 'driver' | 'admin' | 'superadmin';
  is_active: boolean;
  is_verified: boolean;
  is_email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Merchant {
  address: any;
  rating: ReactNode;
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  cuisine_types: string[];
  description?: string;
  logo_url?: string;
  banner_url?: string;
  phone?: string;
  email?: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
  is_verified: boolean;
  average_rating: number;
  total_reviews: number;
  delivery_radius_km: number;
  min_order_amount: number;
  estimated_prep_time: number;
  commission_rate: number;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  category: ReactNode;
  category: string;
  category: any;
  category: any;
  id: string;
  merchant_id: string;
  category_id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_veg: boolean;
  is_available: boolean;
  preparation_time: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customization_options: any[];
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body?: string;
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  is_read: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  customer_id: string;
  merchant_id: string;
  driver_id?: string;
  status: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any;
  subtotal: number;
  delivery_fee: number;
  tax: number;
  discount: number;
  tip: number;
  total: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delivery_address: any;
  special_instructions?: string;
  scheduled_time?: string;
  payment_method: string;
  payment_status: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  created_at: string;
  updated_at: string;
}
