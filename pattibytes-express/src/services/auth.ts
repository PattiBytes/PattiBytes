/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';

export const authService = {
  async signup(email: string, password: string, fullName: string, phone: string, role: string = 'customer') {
    try {
      // Sign up user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone,
            role,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Signup failed');

      // Wait for trigger to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify profile was created - with proper error handling
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (!profile) {
        // Manually create profile if trigger failed
        console.log('Creating profile manually...');
        
        const profileData = {
          id: authData.user.id,
          email,
          full_name: fullName,
          phone,
          role,
          approval_status: role === 'customer' ? 'approved' : 'pending',
          profile_completed: role === 'customer',
          is_active: true,
        };

        const { error: insertError } = await supabase
          .from('profiles')
          .insert([profileData])
          .select()
          .single();

        if (insertError) {
          console.error('Profile creation error:', insertError);
          // Try one more time with upsert
          const { error: upsertError } = await supabase
            .from('profiles')
            .upsert([profileData], { onConflict: 'id' });
          
          if (upsertError) {
            console.error('Profile upsert error:', upsertError);
            throw new Error('Failed to create user profile. Please contact support.');
          }
        }
      }

      return authData.user;
    } catch (error: any) {
      console.error('Signup error:', error);
      
      // Handle rate limit error
      if (error.message?.includes('rate limit')) {
        throw new Error('Too many signup attempts. Please wait 10 minutes and try again.');
      }
      
      // Handle duplicate email
      if (error.message?.includes('already registered')) {
        throw new Error('This email is already registered. Please login instead.');
      }
      
      throw new Error(error.message || 'Failed to create account');
    }
  },

  async login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message?.includes('Email not confirmed')) {
      throw new Error('Please check your email and confirm your account before logging in.');
    }
    if (error.message?.includes('Invalid login')) {
      throw new Error('Invalid email or password');
    }
    throw error;
  }
  
  if (!data.user) throw new Error('Login failed');

    // Get profile with retry
    let profile = null;
    let retries = 3;
    
    while (retries > 0 && !profile) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileData) {
        profile = profileData;
        break;
      }

      if (profileError) {
        console.error('Profile fetch error:', profileError);
      }

      retries--;
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!profile) {
      throw new Error('Profile not found. Please contact support.');
    }

    return profile;
  },

  async loginWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) throw error;
    return data;
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    return profile;
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) throw error;
  },

  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  },
};
