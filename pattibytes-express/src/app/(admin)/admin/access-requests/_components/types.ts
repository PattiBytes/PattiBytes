// src/app/(admin)/admin/access-requests/_components/types.ts

export type RequestType = 'role_upgrade' | 'account_deletion' | 'panel_request' | string;
export type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';
export type FilterTypeValue = 'all' | 'role_upgrade' | 'account_deletion' | 'panel_request';

// Mirrors every relevant column from the profiles table you shared
export interface ExtendedProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  approval_status: string;
  is_approved: boolean;
  is_active: boolean;
  profile_completed: boolean;
  account_status: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  username: string | null;
  // order stats
  total_orders: number | null;
  completed_orders: number | null;
  cancelled_orders: number | null;
  cancelled_orders_count: number | null;
  last_order_date: string | null;
  // trust
  trust_score: number | null;
  is_trusted: boolean | null;
  // dates
  created_at: string | null;
  // ban info
  ban_reason: string | null;
  banned_at: string | null;
  banned_by: string | null;
  ban_expires_at: string | null;
}

export interface AccessRequestUI {
  id: string;
  user_id: string;
  requested_role: string | null;
  request_type: RequestType;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  notes: string | null;
  scheduled_deletion_at: string | null;
  cancellation_reason: string | null;
  user_profile: ExtendedProfile;
}

export interface AccessRequestNotifPrefs {
  enabled: boolean;
  role_upgrade: boolean;
  account_deletion: boolean;
  panel_request: boolean;
  sound: boolean;
}

export const DEFAULT_NOTIF_PREFS: AccessRequestNotifPrefs = {
  enabled: true,
  role_upgrade: true,
  account_deletion: true,
  panel_request: true,
  sound: false,
};

// Human-readable config per request_type
export const REQUEST_TYPE_CONFIG: Record<
  string,
  { label: string; emoji: string; color: string; bg: string; borderColor: string }
> = {
  role_upgrade: {
    label: 'Role Upgrade',
    emoji: '🔑',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    borderColor: 'border-orange-300',
  },
  account_deletion: {
    label: 'Account Deletion',
    emoji: '🗑️',
    color: 'text-red-700',
    bg: 'bg-red-50',
    borderColor: 'border-red-300',
  },
  panel_request: {
    label: 'Panel Access',
    emoji: '🖥️',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    borderColor: 'border-purple-300',
  },
  default: {
    label: 'Request',
    emoji: '📋',
    color: 'text-gray-700',
    bg: 'bg-gray-50',
    borderColor: 'border-gray-300',
  },
};

