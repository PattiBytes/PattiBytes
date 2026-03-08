/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast }    from 'react-toastify';
import { MerchantRow, MenuItemRow, OrderRow } from '../_components/types';

export function useMerchantPageData(merchantId: string) {
  // ── Merchant profile ──────────────────────────────────────────────────────
  const [merchant,       setMerchant]       = useState<MerchantRow | null>(null);
  const [merchantForm,   setMerchantForm]   = useState<MerchantRow | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // ── Menu items ────────────────────────────────────────────────────────────
  const [menu,        setMenu]        = useState<MenuItemRow[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);

  // ── Orders ────────────────────────────────────────────────────────────────
  const [orders,        setOrders]        = useState<OrderRow[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  const fetchMerchant = useCallback(async () => {
    if (!merchantId) return;
    setLoadingProfile(true);
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', merchantId)
        .maybeSingle();
      if (error) throw error;
      if (!data)  throw new Error('Merchant not found');
      setMerchant(data as MerchantRow);
      setMerchantForm(data as MerchantRow);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load merchant');
    } finally {
      setLoadingProfile(false);
    }
  }, [merchantId]);

  // ─────────────────────────────────────────────────────────────────────────
  const fetchMenu = useCallback(async () => {
    if (!merchantId) return;
    setLoadingMenu(true);
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('category', { ascending: true })
        .order('name',     { ascending: true });
      if (error) throw error;
      setMenu((data as MenuItemRow[]) || []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load menu');
      setMenu([]);
    } finally {
      setLoadingMenu(false);
    }
  }, [merchantId]);

  // ─────────────────────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    if (!merchantId) return;
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(
          'id,status,payment_method,payment_status,total_amount,' +
          'delivery_address,items,created_at'
        )
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setOrders((data as unknown as OrderRow[]) || []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load orders');
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, [merchantId]);

  // ─────────────────────────────────────────────────────────────────────────
  const loadAll = useCallback(
    () => Promise.all([fetchMerchant(), fetchMenu(), fetchOrders()]),
    [fetchMerchant, fetchMenu, fetchOrders]
  );

  const patchForm = useCallback((patch: Partial<MerchantRow>) =>
    setMerchantForm(prev => (prev ? { ...prev, ...patch } : prev)),
  []);

  return {
    // state
    merchant,
    merchantForm,
    loadingProfile,
    menu,
    loadingMenu,
    orders,
    loadingOrders,
    // actions
    fetchMerchant,
    fetchMenu,
    fetchOrders,
    loadAll,
    patchForm,
    setMerchantForm,
  };
}
