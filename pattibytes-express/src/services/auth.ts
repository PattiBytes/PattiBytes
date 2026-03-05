/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';

const PROFILE_FIELDS =
  'id,email,full_name,phone,role,approval_status,profile_completed,is_active,created_at';

// ── Module-level cache ────────────────────────────────────────────────────────
let cachedProfile: any = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60_000; // 5 minutes (increased from 1m — profile rarely changes)

async function waitForProfile(userId: string, maxRetries = 6, delayMs = 400): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    const { data } = await supabase
      .from('profiles').select(PROFILE_FIELDS).eq('id', userId).maybeSingle();
    if (data) return data;
    if (i < maxRetries - 1) await new Promise(r => setTimeout(r, delayMs));
  }
  return null;
}

export const authService = {
  async signup(
    email: string, password: string,
    fullName: string, phone: string, role = 'customer'
  ) {
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName, phone, role } },
      });
      if (error) throw error;
      if (!authData.user) throw new Error('Signup failed — no user returned');

      let profile = await waitForProfile(authData.user.id);

      if (!profile) {
        const { data: np, error: ce } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            email: authData.user.email!,
            full_name: fullName, phone, role,
            approval_status: role === 'customer' ? 'approved' : 'pending',
            profile_completed: role === 'customer',
            is_active: true,
          }, { onConflict: 'id' })
          .select(PROFILE_FIELDS)
          .single();
        if (ce) throw new Error('Failed to create profile. Please contact support.');
        profile = np;
      }

      // Fire-and-forget access request
      if (role === 'merchant' || role === 'driver') {
        supabase.from('access_requests')
          .insert({ user_id: authData.user.id, requested_role: role, status: 'pending' })
          .then(({ error: e }) => { if (e) console.error('Access request:', e); });
      }

      return { user: authData.user, userId: authData.user.id };
    } catch (error: any) {
      if (error.message?.includes('rate limit'))
        throw new Error('Too many attempts. Please wait 10 minutes.');
      if (error.message?.includes('already registered'))
        throw new Error('This email is already registered. Please login.');
      throw new Error(error.message || 'Signup failed. Please try again.');
    }
  },

  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message?.includes('Email not confirmed'))
        throw new Error('Please confirm your email first.');
      if (error.message?.includes('Invalid login credentials'))
        throw new Error('Invalid email or password');
      throw new Error(error.message || 'Login failed');
    }
    if (!data.user) throw new Error('Login failed — no user returned');

    const { data: profile, error: pe } = await supabase
      .from('profiles').select(PROFILE_FIELDS).eq('id', data.user.id).maybeSingle();

    if (pe) throw new Error('Failed to load profile. Please try again.');

    if (!profile) {
      const { data: np, error: ce } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          email: data.user.email!,
          full_name: data.user.user_metadata?.full_name || '',
          phone: data.user.user_metadata?.phone || '',
          role: data.user.user_metadata?.role || 'customer',
          approval_status: 'approved',
          profile_completed: true,
          is_active: true,
        }, { onConflict: 'id' })
        .select(PROFILE_FIELDS).single();
      if (ce) throw new Error('Failed to create profile. Please contact support.');
      cachedProfile = np;
      cacheTimestamp = Date.now();
      return np;
    }

    cachedProfile = profile;
    cacheTimestamp = Date.now();
    return profile;
  },

  async loginWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
    return data;
  },

  async logout() {
    cachedProfile = null;
    cacheTimestamp = 0;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    // ✅ Return in-memory cache if fresh (5 min TTL)
    if (cachedProfile && Date.now() - cacheTimestamp < CACHE_TTL) {
      return cachedProfile;
    }

    // ✅ Use getSession() — reads from memory/localStorage, NO network call
    // getUser() hits the Supabase Auth server every time — avoid it here
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      cachedProfile = null;
      return null;
    }

    const { data: profile } = await supabase
      .from('profiles').select(PROFILE_FIELDS).eq('id', session.user.id).maybeSingle();

    cachedProfile = profile ?? null;
    cacheTimestamp = Date.now();
    return cachedProfile;
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) throw error;
  },

  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  invalidateCache() {
    cachedProfile = null;
    cacheTimestamp = 0;
  },
};
