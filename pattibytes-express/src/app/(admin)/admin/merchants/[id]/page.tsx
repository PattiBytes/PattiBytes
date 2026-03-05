/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { useAuth } from '@/contexts/AuthContext';

import { MerchantPageSkeleton } from './_components/MerchantPageSkeleton';
import { MerchantHeader }       from './_components/MerchantHeader';
import { MerchantTabs }         from './_components/MerchantTabs';
import { ProfileTab }           from './_components/ProfileTab';
import { MenuTab }              from './_components/MenuTab';
import { OrdersTab }            from './_components/OrdersTab';

import {
  MerchantRow, MenuItemRow, OrderRow, TabType,
  cuisineTextToArray, parseCuisineToText,
} from './_components/types';

export default function AdminMerchantPage() {
  const { user, loading: authLoading } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();
  const params   = useParams<{ id: string }>();
  const merchantId = params?.id ?? '';

  const [tab, setTab] = useState<TabType>('profile');

  // ── Merchant ──────────────────────────────────────────────────────────────
  const [merchant,      setMerchant]      = useState<MerchantRow | null>(null);
  const [merchantForm,  setMerchantForm]  = useState<MerchantRow | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // ── Menu ──────────────────────────────────────────────────────────────────
  const [menu,        setMenu]        = useState<MenuItemRow[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);

  // ── Orders ────────────────────────────────────────────────────────────────
  const [orders,        setOrders]        = useState<OrderRow[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // ── Auth guard ────────────────────────────────────────────────────────────
  const isAdmin = useMemo(
    () => user?.role === 'admin' || user?.role === 'superadmin',
    [user?.role]
  );

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname || '/admin/merchants')}`);
    }
  }, [authLoading, isAdmin, pathname, router]);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!merchantId || authLoading || !isAdmin) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantId, authLoading, isAdmin]);

  const loadAll = useCallback(async () => {
    await Promise.all([fetchMerchant(), fetchMenu(), fetchOrders()]);
  }, [merchantId]); // eslint-disable-line

  const fetchMerchant = useCallback(async () => {
    if (!merchantId) return;
    setLoadingProfile(true);
    try {
      const { data, error } = await supabase
        .from('merchants').select('*').eq('id', merchantId).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Merchant not found');
      setMerchant(data as MerchantRow);
      setMerchantForm(data as MerchantRow);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load merchant');
    } finally {
      setLoadingProfile(false);
    }
  }, [merchantId]);

  const fetchMenu = useCallback(async () => {
    if (!merchantId) return;
    setLoadingMenu(true);
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      setMenu((data as MenuItemRow[]) || []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load menu');
      setMenu([]);
    } finally {
      setLoadingMenu(false);
    }
  }, [merchantId]);

  const fetchOrders = useCallback(async () => {
    if (!merchantId) return;
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id,status,payment_method,payment_status,total_amount,delivery_address,items,created_at')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setOrders((data as OrderRow[]) || []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load orders');
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, [merchantId]);

  // ── Save profile ──────────────────────────────────────────────────────────
  const saveProfile = useCallback(async () => {
    if (!merchantForm || !merchantId) return;
    setSavingProfile(true);
    try {
      const payload: Partial<MerchantRow> = {
        business_name:      merchantForm.business_name,
        business_type:      merchantForm.business_type || 'restaurant',
        cuisine_types:      Array.isArray(merchantForm.cuisine_types)
                              ? merchantForm.cuisine_types
                              : cuisineTextToArray(parseCuisineToText(merchantForm.cuisine_types)),
        description:        merchantForm.description        ?? null,
        phone:              merchantForm.phone              ?? null,
        email:              merchantForm.email              ?? null,
        address:            merchantForm.address            ?? null,
        city:               merchantForm.city               ?? null,
        state:              merchantForm.state              ?? null,
        postal_code:        merchantForm.postal_code        ?? null,
        latitude:           merchantForm.latitude           ?? null,
        longitude:          merchantForm.longitude          ?? null,
        logo_url:           merchantForm.logo_url           ?? null,
        banner_url:         merchantForm.banner_url         ?? null,
        is_active:          !!merchantForm.is_active,
        is_verified:        !!merchantForm.is_verified,
        is_featured:        !!merchantForm.is_featured,
        delivery_radius_km: merchantForm.delivery_radius_km ?? null,
        min_order_amount:   merchantForm.min_order_amount   ?? null,
        estimated_prep_time: merchantForm.estimated_prep_time ?? null,
        commission_rate:    merchantForm.commission_rate    ?? null,
        gst_enabled:        !!merchantForm.gst_enabled,
        gst_percentage:     merchantForm.gst_percentage     ?? 0,
        opening_time:       merchantForm.opening_time       ?? null,
        closing_time:       merchantForm.closing_time       ?? null,
        updated_at:         new Date().toISOString(),
      };

      if (payload.gst_enabled && (payload.gst_percentage ?? 0) < 0) {
        toast.error('GST must be ≥ 0');
        return;
      }

      const { error } = await supabase.from('merchants').update(payload).eq('id', merchantId);
      if (error) throw error;
      toast.success('✅ Merchant profile saved');
      await fetchMerchant();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save');
    } finally {
      setSavingProfile(false);
    }
  }, [merchantForm, merchantId, fetchMerchant]);

  // ── Patch form helper ─────────────────────────────────────────────────────
  const patchForm = useCallback((patch: Partial<MerchantRow>) => {
    setMerchantForm(p => p ? { ...p, ...patch } : p);
  }, []);

  // ── Loading / auth state ─────────────────────────────────────────────────
  if (authLoading || !isAdmin) {
    return <MerchantPageSkeleton />;
  }

  if (loadingProfile && !merchant) {
    return <MerchantPageSkeleton />;
  }

  return (
    <div
      className="w-full max-w-full overflow-x-hidden"
      style={{ paddingBottom: `calc(96px + env(safe-area-inset-bottom))` }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">

        <MerchantHeader
          merchant={merchant}
          merchantId={merchantId}
          saving={savingProfile}
          canSave={!!merchantForm && tab === 'profile'}
          onRefresh={loadAll}
          onSave={saveProfile}
        />

        <MerchantTabs
          tab={tab}
          onChange={setTab}
          menuCount={menu.length}
          orderCount={orders.length}
        />

        {tab === 'profile' && merchantForm && (
          <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6">
            <ProfileTab
              merchantId={merchantId}
              form={merchantForm}
              loading={loadingProfile}
              onChange={patchForm}
            />
          </div>
        )}

        {tab === 'menu' && (
          <MenuTab
            merchantId={merchantId}
            menu={menu}
            loading={loadingMenu}
            onRefresh={fetchMenu}
          />
        )}

        {tab === 'orders' && (
          <OrdersTab
            orders={orders}
            loading={loadingOrders}
            onRefresh={fetchOrders}
          />
        )}

      </div>
    </div>
  );
}
