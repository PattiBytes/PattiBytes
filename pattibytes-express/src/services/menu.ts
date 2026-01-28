import { supabase } from '@/lib/supabase';
import { MenuItem } from '@/types';

export const menuService = {
  async getMenuItems(merchantId: string): Promise<MenuItem[]> {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('category', { ascending: true });

    if (error) throw error;
    return data as MenuItem[];
  },

  async createMenuItem(item: Partial<MenuItem>): Promise<MenuItem> {
    const { data, error } = await supabase
      .from('menu_items')
      .insert([item])
      .select()
      .single();

    if (error) throw error;
    return data as MenuItem;
  },

  async updateMenuItem(itemId: string, updates: Partial<MenuItem>): Promise<MenuItem> {
    const { data, error } = await supabase
      .from('menu_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return data as MenuItem;
  },

  async deleteMenuItem(itemId: string): Promise<void> {
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
  },

  async getMenuItemsByCategory(merchantId: string, category: string): Promise<MenuItem[]> {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('category', category)
      .eq('is_available', true);

    if (error) throw error;
    return data as MenuItem[];
  },
};
