/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';

export const superadminService = {
  // User Management
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

    await this.logAction('admin_promoted', 'user', userId, { new_role: role });
    
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

    await this.logAction('admin_demoted', 'user', userId, { new_role: newRole });
    
    return data;
  },

  async grantPermission(userId: string, permission: string) {
    const { data, error } = await supabase
      .from('admin_permissions')
      .insert([{ user_id: userId, permission }])
      .select()
      .single();

    if (error) throw error;

    await this.logAction('permission_granted', 'user', userId, { permission });
    
    return data;
  },

  async revokePermission(userId: string, permission: string) {
    const { error } = await supabase
      .from('admin_permissions')
      .delete()
      .eq('user_id', userId)
      .eq('permission', permission);

    if (error) throw error;

    await this.logAction('permission_revoked', 'user', userId, { permission });
  },

  async getAdminPermissions(userId: string) {
    const { data, error } = await supabase
      .from('admin_permissions')
      .select('permission')
      .eq('user_id', userId);

    if (error) throw error;
    return data?.map(p => p.permission) || [];
  },

  async getAllAdmins() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['admin', 'superadmin'])
      .order('created_at', { ascending: false });

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

    await this.logAction('admin_role_updated', 'user', userId, { role });
    
    return data;
  },

  async deleteAdmin(userId: string) {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (error) throw error;

    await this.logAction('admin_deleted', 'user', userId);
  },

  // Settings Management
  async getSettings() {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('key');

    if (error) throw error;
    return data;
  },

  async updateSetting(key: string, value: any) {
    const { data, error } = await supabase
      .from('system_settings')
      .update({ 
        value,
        updated_at: new Date().toISOString(),
      })
      .eq('key', key)
      .select()
      .single();

    if (error) throw error;

    await this.logAction('setting_updated', 'setting', key, { value });
    
    return data;
  },

  // Activity Logs
  async getActivityLogs(limit: number = 50) {
    const { data, error } = await supabase
      .from('admin_activity_log')
      .select(`
        *,
        profiles:admin_id (full_name, email, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  async logAction(
    action: string,
    targetType?: string,
    targetId?: string,
    details?: any
  ) {
    try {
      const { error } = await supabase.rpc('log_admin_action', {
        p_action: action,
        p_target_type: targetType || null,
        p_target_id: targetId || null,
        p_details: details || null,
      });

      if (error) console.error('Failed to log action:', error);
    } catch (error) {
      console.error('Failed to log action:', error);
    }
  },

  // Platform Stats
  async getPlatformStats() {
    const { data: userStats } = await supabase
      .from('profiles')
      .select('role')
      .eq('is_active', true);

    const roleCounts = userStats?.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const { data: orders } = await supabase
      .from('orders')
      .select('total, created_at')
      .eq('payment_status', 'completed');

    const totalRevenue = orders?.reduce((sum, order) => sum + order.total, 0) || 0;
    const platformRevenue = totalRevenue * 0.1;

    const { count: activeMerchants } = await supabase
      .from('merchant_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const { count: pendingMerchants } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'merchant')
      .eq('approval_status', 'pending');

    const { count: pendingDrivers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'driver')
      .eq('approval_status', 'pending');

    const { count: totalOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    return {
      users: roleCounts,
      totalRevenue,
      platformRevenue,
      activeMerchants: activeMerchants || 0,
      pendingMerchants: pendingMerchants || 0,
      pendingDrivers: pendingDrivers || 0,
      totalOrders: totalOrders || 0,
    };
  },

  // User Management
  async banUser(userId: string, reason: string) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    await this.logAction('user_banned', 'user', userId, { reason });
    
    return data;
  },

  async unbanUser(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_active: true })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    await this.logAction('user_unbanned', 'user', userId);
    
    return data;
  },
};
