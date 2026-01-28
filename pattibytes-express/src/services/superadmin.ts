/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { AdminPermission, SystemSetting } from '@/types/admin';

// Helper to ensure admin client exists
function ensureAdmin() {
  if (!supabaseAdmin) {
    throw new Error('Admin client not available. Please check SUPABASE_SERVICE_ROLE_KEY environment variable.');
  }
  return supabaseAdmin;
}

export const superadminService = {
  // User Management
  async promoteToAdmin(userId: string, role: 'admin' | 'superadmin') {
    const admin = ensureAdmin();
    const { data, error } = await admin
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    await this.logAction('admin_created', 'user', userId, { new_role: role });
    
    return data;
  },

  async demoteAdmin(userId: string) {
    const admin = ensureAdmin();
    const { data, error } = await admin
      .from('profiles')
      .update({ role: 'customer' })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    await this.logAction('admin_removed', 'user', userId);
    
    return data;
  },

  async grantPermission(userId: string, permission: string) {
    const admin = ensureAdmin();
    const { data, error } = await admin
      .from('admin_permissions')
      .insert([{ user_id: userId, permission }])
      .select()
      .single();

    if (error) throw error;

    await this.logAction('permission_granted', 'user', userId, { permission });
    
    return data;
  },

  async revokePermission(userId: string, permission: string) {
    const admin = ensureAdmin();
    const { error } = await admin
      .from('admin_permissions')
      .delete()
      .eq('user_id', userId)
      .eq('permission', permission);

    if (error) throw error;

    await this.logAction('permission_revoked', 'user', userId, { permission });
  },

  async getUserPermissions(userId: string): Promise<AdminPermission[]> {
    const { data, error } = await supabase
      .from('admin_permissions')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data;
  },

  async getSettings(): Promise<SystemSetting[]> {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('key');

    if (error) throw error;
    return data;
  },

  async updateSetting(key: string, value: any) {
    const admin = ensureAdmin();
    const { data, error } = await admin
      .from('system_settings')
      .update({ 
        value,
        updated_at: new Date().toISOString(),
      })
      .eq('key', key)
      .select()
      .single();

    if (error) throw error;

    await this.logAction('setting_updated', 'setting', undefined, { key, value });
    
    return data;
  },

  async getActivityLogs(limit: number = 50) {
    const { data, error } = await supabase
      .from('admin_activity_log')
      .select(`
        *,
        profiles:admin_id (full_name, email)
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
    const { error } = await supabase.rpc('log_admin_action', {
      p_action: action,
      p_target_type: targetType || null,
      p_target_id: targetId || null,
      p_details: details || null,
    });

    if (error) console.error('Failed to log action:', error);
  },

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
      .from('merchants')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('is_verified', true);

    const { count: pendingMerchants } = await supabase
      .from('merchants')
      .select('*', { count: 'exact', head: true })
      .eq('is_verified', false);

    const { count: pendingDrivers } = await supabase
      .from('drivers')
      .select('*', { count: 'exact', head: true })
      .eq('is_verified', false);

    return {
      users: roleCounts,
      totalRevenue,
      platformRevenue,
      activeMerchants: activeMerchants || 0,
      pendingMerchants: pendingMerchants || 0,
      pendingDrivers: pendingDrivers || 0,
    };
  },

  async banUser(userId: string, reason: string) {
    const admin = ensureAdmin();
    const { data, error } = await admin
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
    const admin = ensureAdmin();
    const { data, error } = await admin
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
