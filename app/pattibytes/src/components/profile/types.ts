// ─────────────────────────────────────────────
// All shared TypeScript types for the profile
// ─────────────────────────────────────────────

export type TabKey =
  | "profile"
  | "addresses"
  | "notifications"
  | "security"
  | "requests";

export type NotificationPrefs = {
  promos: boolean;
  system: boolean;
  order_updates: boolean;
};

export type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  phone: string | null;
  role: string | null;
  avatar_url: string | null;
  logo_url: string | null;
  approval_status: string | null;
  profile_completed: boolean | null;
  is_active: boolean | null;
  account_status: string | null;
  trust_score: number | null;
  is_trusted: boolean | null;
  is_approved: boolean | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  total_orders: number | null;
  completed_orders: number | null;
  cancelled_orders: number | null;
  cancelled_orders_count: number | null;
  last_order_date: string | null;
  last_seen_at: string | null;
  notification_prefs: any;
  expo_push_token: string | null;
  fcm_token: string | null;
  push_token: string | null;
  push_token_platform: string | null;
  push_token_updated_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type AddressRow = {
  id: string;
  customer_id?: string | null;
  label: string | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  address: string | null;
  apartment_floor?: string | null;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  state: string | null;
  postal_code?: string | null;
  is_default?: boolean | null;
  delivery_instructions?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type Stats = {
  total: number;
  completed: number;
  cancelled: number;
  totalSpent: number;
};

export type UsernameStatus =
  | "idle"
  | "checking"
  | "ok"
  | "taken"
  | "invalid";

export type LegalPage = {
  id: string;
  slug: string;
  title: string;
  is_active: boolean | null;
};