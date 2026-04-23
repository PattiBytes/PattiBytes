export type CustomLink = {
  id: string;
  title: string;
  url: string;
  logo_url: string;
  enabled: boolean;
};

export type AnnouncementType = 'banner' | 'popup';

export type Announcement = {
  enabled: boolean;
  type: AnnouncementType;
  title: string;
  message: string;
  image_url?: string;
  link_url?: string;
  start_at?: string;
  end_at?: string;
  dismissible: boolean;
  dismiss_key: string;
};

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type DeliveryFeeSchedule = {
  timezone: string;
  weekly: Record<DayKey, { enabled: boolean; fee: number }>;
  overrides: unknown[];
  ui?: { show_to_customer?: boolean };
};

export type MerchantPermissionKey =
  | 'can_edit_price'
  | 'can_add_items'
  | 'can_delete_items'
  | 'can_edit_description'
  | 'can_toggle_availability'
  | 'can_edit_images'
  | 'can_manage_discount'
  | 'can_manage_categories'
  | 'can_edit_timing';

export type MerchantPermissions = Record<MerchantPermissionKey, boolean>;

export type AdminPreferences = {
  auto_reload_enabled?: boolean;
  auto_reload_interval?: number;
  merchant_permissions?: {
    global: MerchantPermissions;
    overrides: Record<string, Partial<MerchantPermissions>>;
  };
};

export interface Settings {
  id?: string;
  app_name: string;
  app_logo_url: string;
  support_email: string;
  support_phone: string;
  business_address: string;
  facebook_url: string;
  instagram_url: string;
  twitter_url: string;
  youtube_url: string;
  website_url: string;
  delivery_fee: number;
  min_order_amount: number;
  tax_percentage: number;
  base_delivery_radius_km: number;
  per_km_fee_beyond_base: number;
  customer_search_radius_km?: number;
  custom_links: CustomLink[];
  announcement: Announcement;
  show_menu_images: boolean;
  delivery_fee_enabled: boolean;
  delivery_fee_schedule: DeliveryFeeSchedule;
  free_delivery_enabled?: boolean;
  free_delivery_above?: number;
  hub_latitude?: number;
  hub_longitude?: number;
  admin_preferences?: AdminPreferences;
}

// matches `merchants` table
export interface Merchant {
  delivery_radius: number;
  id: string;
  user_id: string;
  business_name: string;
  business_type?: string;
  cuisine_types?: string[];
  description?: string;
  logo_url?: string;
  banner_url?: string;
  phone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  is_verified: boolean;
  average_rating?: number;
  total_reviews?: number;
  delivery_radius_km?: number;
  min_order_amount?: number;
  estimated_prep_time?: number;
  commission_rate?: number;
  address?: string;
  avg_delivery_time?: number;
  rating?: number;
  total_orders?: number;
  is_featured?: boolean;
  opening_time?: string;
  closing_time?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  gst_enabled?: boolean;
  gst_percentage?: number;
  created_at?: string;
  updated_at?: string;
}
