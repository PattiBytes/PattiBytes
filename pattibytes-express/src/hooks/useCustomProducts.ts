/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '@/lib/supabase';
import type { CustomProduct } from '@/components/custom-products/types';


export function useCustomProducts() {
  const [products, setProducts] = useState<CustomProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customproducts')
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('category')
        .order('name');
      if (error) throw error;
      setProducts((data || []) as CustomProduct[]);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleActive = useCallback(async (id: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from('customproducts')
        .update({ isactive: !current, updatedat: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast.success(`Product ${!current ? 'activated' : 'deactivated'}`);
      setProducts(prev => prev.map(p => p.id === id ? { ...p, isactive: !current } : p));
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update status');
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('customproducts').delete().eq('id', id);
      if (error) throw error;
      toast.success('Product deleted');
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete');
    }
  }, []);

  return { products, loading, load, toggleActive, remove };
}

