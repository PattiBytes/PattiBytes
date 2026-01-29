/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';

export const superadminService = {
  // Admin Management
  async getAllAdmins() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['admin', 'superadmin'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async promoteToAdmin(userId: string, role: 'admin' | 'superadmin' = 'admin') {
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        role, 
        approval_status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async demoteAdmin(userId: string, newRole: string = 'customer') {
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        role: newRole,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateAdminRole(userId: string, role: 'admin' | 'superadmin') {
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        role,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteAdmin(userId: string) {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (error) throw error;
  },

  // Permission Management (placeholder for future implementation)
  async grantPermission(userId: string, permission: string) {
    // This would be implemented with a permissions table
    console.log('Grant permission:', userId, permission);
    return { success: true };
  },

  async revokePermission(userId: string, permission: string) {
    // This would be implemented with a permissions table
    console.log('Revoke permission:', userId, permission);
    return { success: true };
  },

  async getAdminPermissions(userId: string) {
    // This would fetch from a permissions table
    // For now, return default permissions based on role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profile?.role === 'superadmin') {
      return ['*']; // All permissions
    } else if (profile?.role === 'admin') {
      return ['view_orders', 'manage_users', 'manage_merchants', 'manage_drivers'];
    }

    return [];
  },

  // Settings Management
  async getSystemSettings() {
    // This would fetch from a settings table
    return {
      app_name: 'PattiBytes Express',
      app_version: '1.0.0',
      maintenance_mode: false,
      allow_registrations: true,
    };
  },

  async updateSystemSettings(settings: any) {
    // This would update a settings table
    console.log('Update settings:', settings);
    return { success: true };
  },
};
