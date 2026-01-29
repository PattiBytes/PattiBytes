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
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
      }

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
    try {
      // Step 1: Sign in with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Auth error:', error);
        
        if (error.message?.includes('Email not confirmed')) {
          throw new Error('Please check your email and confirm your account before logging in.');
        }
        if (error.message?.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password');
        }
        throw new Error(error.message || 'Login failed');
      }
      
      if (!data.user) throw new Error('Login failed - no user returned');

      // Step 2: Verify session with getUser() for security
      const { data: { user: verifiedUser }, error: verifyError } = await supabase.auth.getUser();
      
      if (verifyError || !verifiedUser) {
        console.error('Session verification failed:', verifyError);
        throw new Error('Session verification failed. Please try again.');
      }

      // Step 3: Get profile with retry and better error handling
      let profile = null;
      let retries = 3;
      
      while (retries > 0 && !profile) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', verifiedUser.id)
          .maybeSingle(); // Use maybeSingle instead of single

        if (profileError) {
          console.error('Profile fetch error (attempt ' + (4 - retries) + '):', profileError);
          
          // If it's a 406 error, check headers
          if (profileError.code === 'PGRST106') {
            console.error('406 Error - Check Supabase client headers');
          }
        }

        if (profileData) {
          profile = profileData;
          break;
        }

        retries--;
        if (retries > 0) {
          console.log('Retrying profile fetch...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Step 4: If still no profile, create one
      if (!profile) {
        console.log('Profile not found, creating new profile...');
        
        const newProfile = {
          id: verifiedUser.id,
          email: verifiedUser.email!,
          full_name: verifiedUser.user_metadata?.full_name || '',
          phone: verifiedUser.user_metadata?.phone || '',
          role: verifiedUser.user_metadata?.role || 'customer',
          approval_status: 'approved',
          profile_completed: true,
          is_active: true,
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert([newProfile])
          .select()
          .single();

        if (createError) {
          console.error('Failed to create profile:', createError);
          throw new Error('Profile not found and could not be created. Please contact support.');
        }

        profile = createdProfile;
      }

      return profile;
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
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
    // Use secure getUser() method
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.error('Error getting user:', error);
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return null;
    }

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
