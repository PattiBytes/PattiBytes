/* eslint-disable @typescript-eslint/no-explicit-any */

export type Role = 'customer' | 'merchant' | 'driver' | 'admin' | 'superadmin';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'revoked' | string;
export type AccountStatus = 'active' | 'suspended' | 'banned' | string;

export interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: Role | string | null;
  avatar_url?: string | null;
  logo_url?: string | null;
  approval_status: ApprovalStatus | null;
  is_approved: boolean | null;
  is_active: boolean | null;
  is_trusted?: boolean | null;
  trust_score?: number | null;
  profile_completed: boolean | null;
  account_status?: AccountStatus | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  total_orders?: number | null;
  completed_orders?: number | null;
  cancelled_orders?: number | null;
  cancelled_orders_count?: number | null;
  last_order_date?: string | null;
  banned_at?: string | null;
  banned_by?: string | null;
  ban_reason?: string | null;
  ban_expires_at?: string | null;
  notification_prefs?: { order_updates?: boolean; promos?: boolean; system?: boolean } | null;
  created_at: string;
  updated_at?: string | null;
  [key: string]: any;
}

export interface MerchantRow {
  id: string;
  user_id: string;
  business_name: string | null;
  business_type: string | null;
  logo_url?: string | null;
  phone?: string | null;
  email?: string | null;
  is_active?: boolean | null;
  is_verified?: boolean | null;
  average_rating?: number | null;
  total_reviews?: number | null;
  total_orders?: number | null;
  city?: string | null;
  state?: string | null;
  commission_rate?: number | null;
  created_at: string;
}

export interface UserWithMerchant extends ProfileRow {
  merchant?: MerchantRow | null;
}

export interface OrderAnalytics {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  avgOrderValue: number;
  todayOrders: number;
  todayRevenue: number;
}

export interface RoleCounts {
  customers: number;
  merchants: number;
  drivers: number;
  admins: number;
  superadmins: number;
}

export const PER_PAGE = 20;
