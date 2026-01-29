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
        },
      });

      if (signUpError) {
        console.error('Signup error:', signUpError);
        throw signUpError;
      }
      
      if (!authData.user) {
        throw new Error('Signup failed - no user returned');
      }

      console.log('User created:', authData.user.id);

      // Wait for trigger to create profile
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Profile verification error:', profileError);
      }

      if (!profile) {
        console.log('Profile not created by trigger, creating manually...');
        
        // Create profile manually
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: authData.user.email!,
            full_name: fullName,
            phone,
            role,
            approval_status: role === 'customer' ? 'approved' : 'pending',
            profile_completed: role === 'customer',
            is_active: true,
          })
          .select()
          .single();

        if (createError) {
          console.error('Manual profile creation error:', createError);
          throw new Error('Failed to create profile. Please contact support.');
        }

        console.log('Profile created manually:', newProfile);
      }

      // Create access request for merchant/driver
      if (role === 'merchant' || role === 'driver') {
        const { error: requestError } = await supabase
          .from('access_requests')
          .insert({
            user_id: authData.user.id,
            requested_role: role,
            status: 'pending',
          });

        if (requestError) {
          console.error('Access request error:', requestError);
        }
      }

      return authData.user;
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
    console.log('Attempting login for:', email);

    // Sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Login error:', error);
      
      if (error.message?.includes('Email not confirmed')) {
        throw new Error('Please confirm your email first.');
      }
      if (error.message?.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password');
      }
      throw new Error(error.message || 'Login failed');
    }
    
    if (!data.user) {
      throw new Error('Login failed - no user returned');
    }

    console.log('Login successful, user ID:', data.user.id);

    // Get profile - simplified with single attempt
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      throw new Error('Failed to load profile. Please try again.');
    }

    if (!profile) {
      console.log('Profile not found, creating...');
      
      // Create profile
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: data.user.email!,
          full_name: data.user.user_metadata?.full_name || '',
          phone: data.user.user_metadata?.phone || '',
          role: data.user.user_metadata?.role || 'customer',
          approval_status: 'approved',
          profile_completed: true,
          is_active: true,
        })
        .select()
        .single();

      if (createError) {
        console.error('Profile creation error:', createError);
        throw new Error('Failed to create profile. Please contact support.');
      }

      return newProfile;
    }

    console.log('Profile loaded successfully:', profile.role);
    return profile; // ✅ Just return the profile, don't redirect here
  } catch (error: any) {
    console.error('Login failed:', error);
    throw error;
  }
},

  async loginWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
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
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) return null;

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
