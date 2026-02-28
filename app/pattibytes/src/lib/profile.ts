import { supabase } from './supabase'

export type Profile = {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  role: 'customer' | 'driver' | 'merchant' | 'admin' | 'superadmin' | null
  avatar_url: string | null
  approval_status: 'pending' | 'approved' | 'rejected' | null
  profile_completed: boolean | null
  is_active: boolean | null
  is_approved: boolean | null
  is_trusted: boolean | null
  trust_score: number | null
  account_status: string | null
  cancelled_orders_count: number | null
  total_orders: number | null
  completed_orders: number | null
  cancelled_orders: number | null
}

// ONLY columns that actually exist in your profiles table
// (expo_push_token was causing ALL profile fetches to fail silently)
const PROFILE_SELECT = [
  'id', 'email', 'full_name', 'phone', 'role',
  'avatar_url', 'approval_status', 'profile_completed',
  'is_active', 'is_approved', 'is_trusted', 'trust_score',
  'account_status','username', 'cancelled_orders_count',
  'total_orders', 'completed_orders', 'cancelled_orders',
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
