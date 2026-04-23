/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '@/lib/supabase';
import type {
  PromoCodeRow, BxgyTargetRow, PromoTargetRow,
  MenuItemLite, MerchantLite, CustomerLite,
} from '../_types';

// ─── Internal notify helper ───────────────────────────────────────────────────
async function callNotify(
  targetUserId: string,
  title: string,
  message: string,
  type = 'promo',
  data: Record<string, unknown> = {},
) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    await fetch('/api/notify', {
      method : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ targetUserId, title, message, type, data }),
    });
  } catch { /* non-critical */ }
}

export function usePromoCodes() {
  const [promos,    setPromos]    = useState<PromoCodeRow[]>([]);
  const [merchants, setMerchants] = useState<MerchantLite[]>([]);
  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(false);

  // ── Load promos ─────────────────────────────────────────────────────────────
  const loadPromos = useCallback(async (merchantId?: string) => {
    setLoading(true);
    try {
      let q = supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      // FIX: use scope='global' OR merchant_id=X — not merchant_id IS NULL
      // because merchant_id IS NULL would wrongly include non-global unscoped rows
      if (merchantId) {
        q = q.or(`merchant_id.eq.${merchantId},scope.eq.global`);
      }
      const { data, error } = await q;
      if (error) throw error;
      setPromos((data ?? []) as PromoCodeRow[]);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to load promo codes');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load dropdowns ──────────────────────────────────────────────────────────
  const loadOptions = useCallback(async () => {
    const [{ data: m }, { data: c }] = await Promise.all([
      supabase
        .from('merchants')
        .select('id,user_id,business_name')
        .eq('is_active', true)
        .order('business_name'),
      supabase
        .from('profiles')
        .select('id,full_name,phone,email,expo_push_token,fcm_token')
        .eq('role', 'customer')
        .eq('is_active', true)
        .limit(300),
    ]);
    setMerchants((m ?? []) as MerchantLite[]);
    setCustomers((c ?? []) as CustomerLite[]);
  }, []);

  // ── CRUD ────────────────────────────────────────────────────────────────────
  const createPromo = useCallback(async (payload: Partial<PromoCodeRow>) => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_active : true,
          used_count: 0,
        })
        .select()
        .single();
      if (error) throw error;
      toast.success('Promo code created!');
      return data as PromoCodeRow;
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to create promo code');
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const updatePromo = useCallback(async (id: string, payload: Partial<PromoCodeRow>) => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      toast.success('Promo code updated!');
      return data as PromoCodeRow;
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to update promo code');
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const deletePromo = useCallback(async (promo: PromoCodeRow) => {
    if (!confirm(`Delete "${promo.code}"? This cannot be undone.`)) return false;
    try {
      // FIX: also delete promo_usage rows to prevent FK violations
      await Promise.all([
        supabase.from('promo_bxgy_targets').delete().eq('promo_code_id', promo.id),
        supabase.from('promo_code_targets').delete().eq('promo_code_id', promo.id),
        supabase.from('promo_usage').delete().eq('promo_id', promo.id),
      ]);
      const { error } = await supabase.from('promo_codes').delete().eq('id', promo.id);
      if (error) throw error;
      setPromos(p => p.filter(x => x.id !== promo.id));
      toast.success('Promo code deleted');
      return true;
    } catch (e: any) {
      toast.error(e?.message ?? 'Delete failed');
      return false;
    }
  }, []);

  const toggleActive = useCallback(async (promo: PromoCodeRow) => {
    const next = !promo.is_active;
    try {
      const { error } = await supabase
        .from('promo_codes')
        .update({ is_active: next, updated_at: new Date().toISOString() })
        .eq('id', promo.id);
      if (error) throw error;
      setPromos(p => p.map(x => x.id === promo.id ? { ...x, is_active: next } : x));
      toast.success(`Promo ${next ? 'activated' : 'deactivated'}`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Toggle failed');
    }
  }, []);

  // ── BXGY targets ─────────────────────────────────────────────────────────
  const replaceBxgyTargets = useCallback(async (
    promoId : string,
    buyIds  : string[],
    getIds  : string[],
  ) => {
    const { error: delErr } = await supabase
      .from('promo_bxgy_targets')
      .delete()
      .eq('promo_code_id', promoId);
    if (delErr) throw delErr;

    const allIds = [...new Set([...buyIds, ...getIds])];
    const rows = [
      ...buyIds.map(id => ({
        promo_code_id: promoId,
        side         : 'buy',
        menu_item_id : id,
        category_id  : null as string | null,
      })),
      ...getIds.map(id => ({
        promo_code_id: promoId,
        side         : 'get',
        menu_item_id : id,
        category_id  : null as string | null,
      })),
    ];

    if (rows.length > 0) {
      const { error: insErr } = await supabase
        .from('promo_bxgy_targets')
        .insert(rows);
      if (insErr) throw insErr;
    }

    // Sync menu_item_ids + deal_json back to promo_codes
    const { data: current } = await supabase
      .from('promo_codes')
      .select('deal_json')
      .eq('id', promoId)
      .single();

    const existingDeal = (current?.deal_json as any) ?? {};
    const updatedDeal = {
      ...existingDeal,
      buy: { ...(existingDeal.buy ?? {}), item_ids: buyIds },
      get: { ...(existingDeal.get ?? {}), item_ids: getIds },
    };

    const { error: syncErr } = await supabase
      .from('promo_codes')
      .update({
        menu_item_ids: allIds,
        deal_json    : updatedDeal,
        updated_at   : new Date().toISOString(),
      })
      .eq('id', promoId);
    if (syncErr) throw syncErr;
  }, []);

  const getBxgyTargets = useCallback(async (promoId: string): Promise<BxgyTargetRow[]> => {
    const { data, error } = await supabase
      .from('promo_bxgy_targets')
      .select('*')
      .eq('promo_code_id', promoId);
    if (error) throw error;
    return (data ?? []) as BxgyTargetRow[];
  }, []);

  // ── Cart-discount targets ─────────────────────────────────────────────────
  const replacePromoTargets = useCallback(async (
    promoId   : string,
    merchantId: string | null,
    menuItemIds: string[],
  ) => {
    const { error: delErr } = await supabase
      .from('promo_code_targets')
      .delete()
      .eq('promo_code_id', promoId);
    if (delErr) throw delErr;

    if (menuItemIds.length > 0) {
      const rows = menuItemIds.map(id => ({
        promo_code_id: promoId,
        merchant_id  : merchantId,
        menu_item_id : id,
        category_id  : null as string | null,
      }));
      const { error: insErr } = await supabase
        .from('promo_code_targets')
        .insert(rows);
      if (insErr) throw insErr;
    }

    const { error: syncErr } = await supabase
      .from('promo_codes')
      .update({
        menu_item_ids: menuItemIds.length > 0 ? menuItemIds : null,
        updated_at   : new Date().toISOString(),
      })
      .eq('id', promoId);
    if (syncErr) throw syncErr;
  }, []);

  const getPromoTargets = useCallback(async (promoId: string): Promise<PromoTargetRow[]> => {
    const { data, error } = await supabase
      .from('promo_code_targets')
      .select('*')
      .eq('promo_code_id', promoId);
    if (error) throw error;
    return (data ?? []) as PromoTargetRow[];
  }, []);

  const getMenuItemsByIds = useCallback(async (ids: string[]): Promise<MenuItemLite[]> => {
    if (!ids.length) return [];
    const { data, error } = await supabase
      .from('menu_items')
      .select('id,merchant_id,name,description,price,category,discount_percentage,image_url,is_available,is_veg,category_id')
      .in('id', ids);
    if (error) throw error;
    return (data ?? []) as MenuItemLite[];
  }, []);

  // ── Push notifications ────────────────────────────────────────────────────
  const notifyForPromo = useCallback(async (
    promo        : PromoCodeRow,
    mode         : 'activate' | 'create',
    customMessage?: string,
  ) => {
    const title = `🎉 ${mode === 'create' ? 'New ' : ''}Offer: ${promo.code}`;
    const body  = customMessage ?? promo.description ?? `Use code ${promo.code} to save!`;

    if (promo.is_secret) {
      const allowed = (promo.secret_allowed_users ?? []) as string[];
      if (allowed.length === 0) return;
      for (let i = 0; i < allowed.length; i += 5) {
        await Promise.allSettled(
          allowed.slice(i, i + 5).map(uid =>
            callNotify(uid, title, body, 'promo', { promo_id: promo.id, code: promo.code }),
          ),
        );
      }
      return;
    }

    if (promo.scope === 'merchant' && promo.merchant_id) {
      const { data: orders } = await supabase
        .from('orders')
        .select('customer_id')
        .eq('merchant_id', promo.merchant_id)
        .eq('status', 'delivered');
      const uids = [
        ...new Set((orders ?? []).map((o: any) => o.customer_id).filter(Boolean)),
      ] as string[];
      for (let i = 0; i < uids.length; i += 5) {
        await Promise.allSettled(
          uids.slice(i, i + 5).map(uid =>
            callNotify(uid, title, body, 'promo', { promo_id: promo.id, code: promo.code }),
          ),
        );
      }
      return;
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'customer')
      .eq('is_active', true)
      .limit(50);
    const uids = (profiles ?? []).map((p: any) => p.id as string);
    for (let i = 0; i < uids.length; i += 5) {
      await Promise.allSettled(
        uids.slice(i, i + 5).map(uid =>
          callNotify(uid, title, body, 'promo', { promo_id: promo.id, code: promo.code }),
        ),
      );
    }
  }, []);

  // ── Assign secret code to specific users ──────────────────────────────────
  const assignSecretUsers = useCallback(async (
    promoId : string,
    userIds : string[],
    notify  : boolean,
    noteMsg?: string,
  ) => {
    const { data: promo, error } = await supabase
      .from('promo_codes')
      .update({
        secret_allowed_users: userIds,
        updated_at          : new Date().toISOString(),
      })
      .eq('id', promoId)
      .select()
      .single();
    if (error) throw error;

    if (notify && userIds.length > 0) {
      await notifyForPromo(promo as PromoCodeRow, 'create', noteMsg).catch(() => null);
    }

    toast.success('Secret code assigned!');
    setPromos(p =>
      p.map(x => x.id === promoId ? { ...x, secret_allowed_users: userIds } : x),
    );
  }, [notifyForPromo]);

  // ── Record promo usage after order placed ─────────────────────────────────
  // FIX: correct column name is "promo_id". Added discount_applied (requires migration).
  // FIX: uses atomic RPC to avoid race conditions on used_count.
  // ⚠️  CALL THIS FROM YOUR CHECKOUT FLOW after order is confirmed.
  const recordPromoUsage = useCallback(async (
    promoId        : string,
    userId         : string,
    orderId        : string,
    discountApplied: number,
  ) => {
    try {
      // Insert usage row
      const { error: insErr } = await supabase.from('promo_usage').insert({
        promo_id        : promoId,
        user_id         : userId,
        order_id        : orderId,
        discount_applied: discountApplied, // requires ALTER TABLE migration above
      });
      if (insErr) console.warn('[recordPromoUsage] insert error:', insErr.message);

      // Atomic increment via RPC (requires CREATE FUNCTION migration above)
      const { error: rpcErr } = await supabase.rpc('increment_promo_used_count', {
        promo_id_input: promoId,
      });
      if (rpcErr) {
        // Fallback: non-atomic but acceptable for low concurrency
        const { data } = await supabase
          .from('promo_codes')
          .select('used_count')
          .eq('id', promoId)
          .single();
        await supabase.from('promo_codes').update({
          used_count: (data?.used_count ?? 0) + 1,
          updated_at: new Date().toISOString(),
        }).eq('id', promoId);
      }
    } catch (e: any) {
      console.warn('[recordPromoUsage]', e?.message);
    }
  }, []);

  // ── Check per-user usage limit ────────────────────────────────────────────
  // Call this BEFORE applying promo in checkout to enforce max_uses_per_user.
  const checkUserPromoLimit = useCallback(async (
    promoId: string,
    userId : string,
    maxUses: number | null,
  ): Promise<boolean> => {
    if (!maxUses) return true; // unlimited
    const { count } = await supabase
      .from('promo_usage')
      .select('id', { count: 'exact', head: true })
      .eq('promo_id', promoId)
      .eq('user_id', userId);
    return (count ?? 0) < maxUses;
  }, []);

  return {
    promos, merchants, customers, loading, saving,
    loadPromos, loadOptions,
    createPromo, updatePromo, deletePromo, toggleActive,
    replaceBxgyTargets, getBxgyTargets,
    replacePromoTargets, getPromoTargets, getMenuItemsByIds,
    notifyForPromo, assignSecretUsers,
    recordPromoUsage,  // ← call from checkout
    checkUserPromoLimit, // ← call before applying promo
  };
}

