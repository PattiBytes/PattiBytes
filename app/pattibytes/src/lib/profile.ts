// src/lib/profile.ts
import { supabase } from './supabase'

// ─── Profile type — mirrors the profiles table exactly ────────────────────────
export type Profile = {
  id:                       string
  email:                    string | null
  full_name:                string | null
  phone:                    string | null
  role:                     'customer' | 'driver' | 'merchant' | 'admin' | 'superadmin'
  avatar_url:               string | null   // ← was missing — caused no avatar
  logo_url:                 string | null
  approval_status:          'pending' | 'approved' | 'rejected' | null
  profile_completed:        boolean
  is_active:                boolean
  is_approved:              boolean
  account_status:           'active' | 'banned' | 'suspended' | null

  // Address fields ← were missing — caused TS errors 2339
  address:                  string | null
  city:                     string | null
  state:                    string | null
  pincode:                  string | null
  latitude:                 number | null
  longitude:                number | null

  // Identity
  username:                 string | null

  // Trust / order stats
  is_trusted:               boolean
  trust_score:              number | null
  cancelled_orders_count:   number
  total_orders:             number
  completed_orders:         number
  cancelled_orders:         number
  last_order_date:          string | null

  // Push tokens
  expo_push_token:          string | null
  push_token:               string | null
  push_token_platform:      'ios' | 'android' | null
  push_token_updated_at:    string | null
  fcm_token:                string | null

  // Notification preferences
  notification_prefs: {
    order_updates: boolean
    promos:        boolean
    system:        boolean
  } | null

  // Ban fields
  banned_at:                string | null
  banned_by:                string | null
  ban_reason:               string | null
  ban_expires_at:           string | null

  // Timestamps
  last_seen_at:             string | null
  created_at:               string
  updated_at:               string
}

// ─── Column list for SELECT — keep in sync with type above ───────────────────
const PROFILE_SELECT = [
  'id',
  'email',
  'full_name',
  'phone',
  'role',
  'avatar_url',
  'logo_url',
  'approval_status',
  'profile_completed',
  'is_active',
  'is_approved',
  'account_status',
  'address',
  'city',
  'state',
  'pincode',
  'latitude',
  'longitude',
  'username',
  'is_trusted',
  'trust_score',
  'cancelled_orders_count',
  'total_orders',
  'completed_orders',
  'cancelled_orders',
  'last_order_date',
  'expo_push_token',
  'push_token',
  'push_token_platform',
  'push_token_updated_at',
  'fcm_token',
  'notification_prefs',
  'banned_at',
  'banned_by',
  'ban_reason',
  'ban_expires_at',
  'last_seen_at',
  'created_at',
  'updated_at',
].join(',')

export async function getMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    // Log so you can diagnose future issues
    console.warn('[getMyProfile] failed:', error.code, error.message)
    return null
  }
  return (data as unknown as Profile) ?? null
}

export async function savePushToken(userId: string, token: string): Promise<void> {
  // Gracefully attempt — column may not exist, never throws
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ expo_push_token: token } as any)
      .eq('id', userId)
    if (error) console.warn('[savePushToken] skipped:', error.message)
  } catch {
    // ignore silently
  }
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'full_name' | 'phone' | 'avatar_url' | 'profile_completed'>>
): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
  if (error) console.warn('[updateProfile] failed:', error.message)
  return !error
}
