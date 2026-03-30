// ── Announcement JSON structure (from `announcement` JSONB column) ───────────
export type AnnouncementConfig = {
  type:        'popup' | 'banner';  // popup = modal, banner = top strip
  title?:      string;
  enabled:     boolean;
  message:     string;
  link_url?:   string;
  image_url?:  string;
  start_at?:   string;             // ISO — show after this time
  end_at?:     string;             // ISO — hide after this time
  dismiss_key?: string;            // localStorage key
  dismissible?: boolean;
};

// ── Delivery fee schedule JSON ────────────────────────────────────────────────
export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type DeliveryFeeSchedule = {
  ui?:       { show_to_customer?: boolean };
  weekly?:   Partial<Record<DayKey, { fee: number; enabled: boolean }>>;
  timezone?: string;
  overrides?: unknown[];
};

// ── Admin preferences JSON ────────────────────────────────────────────────────
export type AdminPreferences = {
  auto_reload_enabled?:   boolean;
  auto_reload_interval?:  number;
  merchant_permissions?: {
    global?: {
      can_add_items?:           boolean;
      can_edit_price?:          boolean;
      can_edit_images?:         boolean;
      can_edit_timing?:         boolean;
      can_delete_items?:        boolean;
      can_manage_discount?:     boolean;
      can_edit_description?:    boolean;
      can_manage_categories?:   boolean;
      can_toggle_availability?: boolean;
    };
    overrides?: Record<string, unknown>;
  };
};

// ── App settings — exact columns from your Supabase table ────────────────────
export type AppSettingsRow = {
  id:                            string;
  app_name:                      string | null;
  app_logo_url:                  string | null;
  support_email:                 string | null;
  support_phone:                 string | null;
  business_address:              string | null;

  facebook_url:                  string | null;
  instagram_url:                 string | null;
  twitter_url:                   string | null;
  youtube_url:                   string | null;
  website_url:                   string | null;

  delivery_fee:                  number | null;
  base_delivery_fee:             number | null;
  min_order_amount:              number | null;
  tax_percentage:                number | null;
  free_delivery_above:           number | null;
  free_delivery_enabled:         boolean | null;
  delivery_fee_enabled:          boolean | null;
  delivery_fee_show_to_customer: boolean | null;
  delivery_fee_schedule:         DeliveryFeeSchedule | null;
  base_delivery_radius_km:       number | null;
  per_km_fee_beyond_base:        number | null;
  per_km_rate:                   number | null;
  customer_search_radius_km:     number | null;
  hub_latitude:                  number | null;
  hub_longitude:                 number | null;

  show_menu_images:              boolean | null;
  announcement:                  AnnouncementConfig | null;  // JSONB
  admin_preferences:             AdminPreferences | null;    // JSONB
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  custom_links?:                 any;

  created_at:                    string | null;
  updated_at:                    string | null;
};

// ── Rest unchanged ────────────────────────────────────────────────────────────
export type Platform = 'ios' | 'android' | 'desktop';

export type CustomLink = {
  id:        string;
  title:     string;
  url:       string;
  logo_url?: string | null;
  enabled?:  boolean;
};

export type PartnerMerchant = {
  id:            string;
  user_id?:      string | null;
  business_name: string | null;
  business_type: string | null;
  logo_url:      string | null;
  phone:         string | null;
  email:         string | null;
  is_active?:    boolean | null;
  is_verified?:  boolean | null;
  city?:         string | null;
  state?:        string | null;
};

export type NormalizedPartner = {
  id:           string;
  name:         string;
  type:         string;
  logo:         string;
  phone:        string;
  email:        string;
  verified:     boolean;
  locationLine: string;
};

export type SocialLink = {
  label:    string;
  href:     string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon:     any;
  logoUrl?: string;
};

export type SupportEmail = {
  email: string;
  href:  string;
};

export type LegalPageSummary = {
  slug:  string;
  title: string;
};