export interface MerchantProfile {
  id: string;
  user_id: string;
  business_name: string;
  business_address: string;
  business_phone: string;
  cuisine_type: string;
  description: string;
  logo_url: string;
  banner_url: string;
  is_active: boolean;
  is_verified: boolean;
  rating: number;
  total_orders: number;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  pincode: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: 'customer' | 'merchant' | 'driver' | 'admin' | 'superadmin';
  avatar_url: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  profile_completed: boolean;
  is_active: boolean;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  created_at: string;
  updated_at: string;
}
