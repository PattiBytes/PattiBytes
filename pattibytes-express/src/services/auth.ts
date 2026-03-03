/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';

// ✅ FIX 1: Select only needed columns (not select('*'))
const PROFILE_FIELDS = 'id, email, full_name, phone, role, approval_status, profile_completed, is_active, created_at';

// ✅ FIX 2: In-memory cache for getCurrentUser (prevents double DB calls on every page load)
let cachedProfile: any = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 1 minute

// ✅ FIX 3: Smart polling instead of hard 3-second delay
async function waitForProfile(userId: string, maxRetries = 6, delayMs = 400): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    const { data: profile } = await supabase
      .from('profiles')
      .select(PROFILE_FIELDS)
      .eq('id', userId)
      .maybeSingle();

    if (profile) return profile;

    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return null;
}

export const authService = {
  async signup(email: string, password: string, fullName: string, phone: string, role: string = 'customer') {
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, phone, role },
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Signup failed - no user returned');

      // ✅ Smart polling - exits as soon as profile exists (avg 400ms vs 3000ms)
      let profile = await waitForProfile(authData.user.id);

      if (!profile) {
        // ✅ FIX 4: upsert instead of insert (handles race conditions)
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            email: authData.user.email!,
            full_name: fullName,
            phone,
            role,
            approval_status: role === 'customer' ? 'approved' : 'pending',
            profile_completed: role === 'customer',
            is_active: true,
          }, { onConflict: 'id' })
          .select(PROFILE_FIELDS)
          .single();

        if (createError) {
          console.error('Manual profile creation error:', createError);
          throw new Error('Failed to create profile. Please contact support.');
        }

        profile = newProfile;
      }

      // ✅ FIX 5: Fire-and-forget (don't block signup flow)
      if (role === 'merchant' || role === 'driver') {
        supabase.from('access_requests')
          .insert({ user_id: authData.user.id, requested_role: role, status: 'pending' })
          .then(({ error }) => { if (error) console.error('Access request error:', error); });
      }

      return { user: authData.user, userId: authData.user.id };
    } catch (error: any) {
      console.error('Signup failed:', error);
      
      if (error.message?.includes('rate limit')) {
        throw new Error('Too many signup attempts. Please wait 10 minutes.');
      }
      if (error.message?.includes('already registered')) {
        throw new Error('This email is already registered. Please login.');
      }
      throw new Error(error.message || 'Signup failed. Please try again.');
    }
  },

  async login(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        if (error.message?.includes('Email not confirmed')) throw new Error('Please confirm your email first.');
        if (error.message?.includes('Invalid login credentials')) throw new Error('Invalid email or password');
        throw new Error(error.message || 'Login failed');
      }

      if (!data.user) throw new Error('Login failed - no user returned');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(PROFILE_FIELDS)
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        throw new Error('Failed to load profile. Please try again.');
      }

      if (!profile) {
        const { data: newProfile, error: createError } = await supabase
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
          .select(PROFILE_FIELDS)
          .single();

        if (createError) {
          console.error('Profile creation error:', createError);
          throw new Error('Failed to create profile. Please contact support.');
        }

        cachedProfile = newProfile;
        cacheTimestamp = Date.now();
        return newProfile;
      }

      // Cache after successful login
      cachedProfile = profile;
      cacheTimestamp = Date.now();
      return profile;
    } catch (error: any) {
      console.error('Login failed:', error);
      throw error;
    }
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
    // ✅ Return cached profile if fresh
    if (cachedProfile && Date.now() - cacheTimestamp < CACHE_TTL) {
      return cachedProfile;
    }

    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      cachedProfile = null;
      return null;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select(PROFILE_FIELDS)
      .eq('id', user.id)
      .maybeSingle();

    cachedProfile = profile;
    cacheTimestamp = Date.now();
    return profile;
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

  // ✅ Call this when profile data changes elsewhere
  invalidateCache() {
    cachedProfile = null;
    cacheTimestamp = 0;
  },
};
