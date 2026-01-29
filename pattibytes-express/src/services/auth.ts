/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase, getRedirectUrl } from '@/lib/supabase';

export const authService = {
  async signup(email: string, password: string, fullName: string, phone: string, role: string) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone,
            role,
          },
          emailRedirectTo: `${getRedirectUrl()}/auth/callback`,
        },
      });

      if (authError) throw authError;

      // Wait for trigger to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      return authData;
    } catch (error: any) {
      console.error('Signup error:', error);
      throw error;
    }
  },

  async login(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        
        // Customers are auto-approved, others need approval
        const approvalStatus = data.user.user_metadata?.role === 'customer' 
          ? 'approved' 
          : 'pending';
        
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{
            id: data.user.id,
            email: data.user.email,
            full_name: data.user.user_metadata?.full_name || '',
            phone: data.user.user_metadata?.phone || '',
            role: data.user.user_metadata?.role || 'customer',
            approval_status: approvalStatus,
          }])
          .select()
          .single();

        if (createError) throw createError;
        return newProfile;
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
        redirectTo: `${getRedirectUrl()}/auth/callback`,
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
      .single();

    return profile;
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getRedirectUrl()}/auth/reset-password`,
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
