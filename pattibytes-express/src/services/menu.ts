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
    return (data || []) as MenuItem[];
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
    const { error } = await supabase.from('menu_items').delete().eq('id', itemId);
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
    return (data || []) as MenuItem[];
  },

  // ✅ NEW: bulk insert (used by BulkMenuUpload.tsx)
  async createMenuItemsBulk(items: Partial<MenuItem>[]): Promise<MenuItem[]> {
    if (!items || items.length === 0) return [];

    // Note: `.insert()` accepts an array for bulk create. [web:64]
    // Note: `.select()` returns inserted rows; without it, Supabase won't return data by default. [web:65]
    const chunkSize = 200;
    const inserted: MenuItem[] = [];

    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);

      const { data, error } = await supabase
        .from('menu_items')
        .insert(chunk)
        .select('*');

      if (error) throw error;
      inserted.push(...((data || []) as MenuItem[]));
    }

    return inserted;
  },
};
