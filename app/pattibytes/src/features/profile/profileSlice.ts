import { createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../lib/supabase';

export const updateProfile = createAsyncThunk(
  'profile/update',
  async (data: { full_name?: string; username?: string; phone?: string; avatar_url?: string }) => {
    const { data: updated, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', (await supabase.auth.getUser()).data.user!.id)
      .select()
      .single();
    
    if (error) throw error;
    return updated;
  }
);

export const updateEmail = createAsyncThunk(
  'profile/updateEmail',
  async (newEmail: string) => {
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) throw error;
    return newEmail;
  }
);

export const updatePassword = createAsyncThunk(
  'profile/updatePassword',
  async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }
);

export const addAddress = createAsyncThunk(
  'profile/addAddress',
  async (address: any) => {
    const userId = (await supabase.auth.getUser()).data.user!.id;
    const { data, error } = await supabase
      .from('user_addresses')
      .insert({ ...address, user_id: userId })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
);

export const fetchAddresses = createAsyncThunk(
  'profile/fetchAddresses',
  async () => {
    const userId = (await supabase.auth.getUser()).data.user!.id;
    const { data, error } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false });
    
    if (error) throw error;
    return data;
  }
);
