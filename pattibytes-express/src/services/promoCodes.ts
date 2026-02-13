/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';

export type DiscountType = 'percentage' | 'fixed';
export type PromoScope = 'global' | 'merchant' | 'targets';

export type DealType = 'cart_discount' | 'bxgy';
export type BxgyDiscountType = 'free' | 'percentage' | 'fixed';
export type BxgySelection = 'auto_cheapest' | 'customer_choice';

export interface PromoCodeRow {
  id: string;
  code: string;
  description: string | null;

  // Cart-discount fields
  discount_type: DiscountType;
  discount_value: number;

  min_order_amount: number | null;
  max_discount_amount: number | null;

  usage_limit: number | null;
  used_count: number | null;

  max_uses_per_user: number | null;
  is_active: boolean;

  valid_from: string | null; // timestamptz
  valid_until: string | null; // timestamptz

  valid_days: number[] | null; // smallint[] (1=Mon..7=Sun)
  start_time: string | null; // time
  end_time: string | null; // time

  scope: PromoScope;
  merchant_id: string | null;
  created_by: string | null;

  created_at?: string | null;
  updated_at?: string | null;

  // Offer fields
  deal_type?: DealType; // default 'cart_discount'
  deal_json?: any; // jsonb
  auto_apply?: boolean;
  priority?: number;
}

export type PromoCode = PromoCodeRow;

export interface PromoTargetRow {
  id: string;
  promo_code_id: string;
  merchant_id: string | null;
  menu_item_id: string | null;
  category_id: string | null;
  created_at: string;
}

export type BxgySide = 'buy' | 'get';

export interface BxgyTargetRow {
  id: string;
  promo_code_id: string;
  side: BxgySide;
  menu_item_id: string | null;
  category_id: string | null;
  created_at: string;
}
export interface MenuItemLite {
  id: string;
  merchant_id: string;
  name: string;
  description?: string | null;
  price: number;

  category?: string | null;
  discount_percentage?: number | null;

  category_id?: string | null;
  is_available?: boolean | null;
  is_veg?: boolean | null;
  preparation_time?: number | null;

  image_url?: string | null;
}



export interface MerchantLite {
  id: string;
  user_id: string;
  business_name: string;
}

export interface CartItemForPromo {
  menu_item_id: string;
  merchant_id: string;
  category_id?: string | null;
  qty: number;
  unit_price: number;
}

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(v: any) {
  return typeof v === 'string' && uuidRegex.test(v);
}

function normalizeCode(v: any) {
  return String(v ?? '').trim().toUpperCase();
}

function clampNum(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function formatErr(err: any) {
  if (!err) return { message: 'Unknown error', raw: err };
  if (err instanceof Error) return { message: err.message, stack: err.stack };

  const out: any = {};
  for (const k of ['message', 'details', 'hint', 'code', 'status', 'statusText']) {
    if (err?.[k] != null) out[k] = err[k];
  }
  if (!out.message) out.message = String(err);
  out.raw = err;
  return out;
}

function dayNumberMon1Sun7(d: Date) {
  const js = d.getDay(); // Sun=0..Sat=6
  return js === 0 ? 7 : js;
}

function timeToMinutes(t: string) {
  const [hh, mm] = String(t).split(':');
  return Number(hh || 0) * 60 + Number(mm || 0);
}

function isNowWithinTimeWindow(now: Date, start: string | null, end: string | null) {
  if (!start || !end) return true;
  const cur = now.getHours() * 60 + now.getMinutes();
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  if (s <= e) return cur >= s && cur <= e;
  return cur >= s || cur <= e; // overnight window
}

export function toDateInputValue(iso: string | null | undefined) {
  if (!iso) return '';
  const s = String(iso);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '';
}
export async function listPromoCodes(params: {
  merchantId?: string | null;
  includeGlobal?: boolean;
}): Promise<PromoCodeRow[]> {
  const merchantId = params.merchantId ?? null;
  const includeGlobal = params.includeGlobal ?? true;

  let qb = supabase
    .from('promo_codes')
    .select('*')
    .order('created_at', { ascending: false });

  if (merchantId) {
    qb = includeGlobal
      ? qb.or(`merchant_id.eq.${merchantId},merchant_id.is.null`)
      : qb.eq('merchant_id', merchantId);
  }
  // else: merchantId is null => return all promos (global + all merchants)

  const { data, error } = await qb;
  if (error) throw error;
  return (data ?? []) as PromoCodeRow[];
}

class PromoCodeService {
  async listPromoCodes(params: {
    merchantId?: string | null;
    includeGlobal?: boolean;
  }): Promise<PromoCodeRow[]> {
    const merchantId = params.merchantId ?? null;
    const includeGlobal = params.includeGlobal ?? true;

    let qb = supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (merchantId) {
      qb = includeGlobal
        ? qb.or(`merchant_id.eq.${merchantId},merchant_id.is.null`)
        : qb.eq('merchant_id', merchantId);
    }

    const { data, error } = await qb;
    if (error) throw error;
    return (data ?? []) as PromoCodeRow[];
  }  
  async getMerchantIdByUserId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('merchants')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}
  // ---------- Admin/Merchant ----------
  async listMerchants(): Promise<MerchantLite[]> {
  const { data, error } = await supabase
    .from('merchants')
    .select('id,user_id,business_name')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as MerchantLite[];
}

  async listMenuItems(params: {
  merchantId: string;
  limit?: number;
  offset?: number;
  includeUnavailable?: boolean;
}): Promise<MenuItemLite[]> {
  const merchantId = String(params.merchantId || '').trim();
  if (!merchantId) return [];

  const limit = Math.max(1, clampNum(params.limit, 200));
  const offset = Math.max(0, clampNum(params.offset, 0));
  const includeUnavailable = params.includeUnavailable ?? true;

  let qb = supabase
    .from('menu_items')
    .select(
      'id,merchant_id,name,description,price,category,discount_percentage,image_url,is_available,is_veg,preparation_time,category_id'
    )
    .eq('merchant_id', merchantId)
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1);

  if (!includeUnavailable) qb = qb.eq('is_available', true);

  const { data, error } = await qb;
  if (error) throw error;
  return (data ?? []) as MenuItemLite[];
}


  /** Fetch ALL menu items for a merchant by paginating range(). */
  async listAllMenuItems(params: {
    merchantId: string;
    includeUnavailable?: boolean;
    pageSize?: number; // default 500
    hardLimit?: number; // default 20000 safety
  }): Promise<MenuItemLite[]> {
    const merchantId = String(params.merchantId || '').trim();
    if (!merchantId) return [];

    const pageSize = Math.min(Math.max(params.pageSize ?? 500, 50), 1000);
    const hardLimit = Math.min(Math.max(params.hardLimit ?? 20000, 1000), 100000);

    let offset = 0;
    const out: MenuItemLite[] = [];

    while (true) {
      const page = await this.listMenuItems({
        merchantId,
        limit: pageSize,
        offset,
        includeUnavailable: params.includeUnavailable ?? true,
      });

      out.push(...page);

      if (page.length < pageSize) break;
      offset += pageSize;

      if (out.length >= hardLimit) break;
    }

    return out;
  }

  /** Enhancement: if query empty, returns listMenuItems so picker can show items immediately. */
  async searchMenuItems(params: {
  merchantId: string;
  query: string;
  limit?: number;
  includeUnavailable?: boolean;
  offset?: number;
}): Promise<MenuItemLite[]> {
  const merchantId = String(params.merchantId || '').trim();
  if (!merchantId) return [];

  const q = String(params.query || '').trim();
  const like = `%${q}%`;

  let qb = supabase
    .from('menu_items')
    .select(
      'id,merchant_id,name,description,price,category,discount_percentage,image_url,is_available,is_veg,preparation_time,category_id'
    )
    .eq('merchant_id', merchantId)
    .or(`name.ilike.${like},description.ilike.${like},category.ilike.${like}`)
    .limit(params.limit ?? 25);

  if (!(params.includeUnavailable ?? true)) qb = qb.eq('is_available', true);

  const { data, error } = await qb;
  if (error) throw error;
  return (data ?? []) as MenuItemLite[];
}


  async getMenuItemsByIds(ids: string[]): Promise<MenuItemLite[]> {
  const clean = Array.from(new Set((ids || []).filter(isUuid)));
  if (clean.length === 0) return [];

  const { data, error } = await supabase
    .from('menu_items')
    .select(
      'id,merchant_id,name,description,price,category,discount_percentage,image_url,is_available,is_veg,preparation_time,category_id'
    )
    .in('id', clean);

  if (error) throw error;
  return (data ?? []) as MenuItemLite[];
}


  async getPromoTargets(promoCodeId: string): Promise<PromoTargetRow[]> {
    const { data, error } = await supabase
      .from('promo_code_targets')
      .select('*')
      .eq('promo_code_id', promoCodeId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data ?? []) as PromoTargetRow[];
  }

  async replacePromoTargets(params: {
    promoCodeId: string;
    merchantId: string | null;
    menuItemIds: string[];
    categoryIds?: string[];
  }) {
    const { error: delErr } = await supabase
      .from('promo_code_targets')
      .delete()
      .eq('promo_code_id', params.promoCodeId);

    if (delErr) throw delErr;

    const inserts: any[] = [];

    for (const id of params.menuItemIds || []) {
      if (!isUuid(id)) continue;
      inserts.push({
        promo_code_id: params.promoCodeId,
        merchant_id: params.merchantId,
        menu_item_id: id,
        category_id: null,
      });
    }

    for (const id of params.categoryIds || []) {
      if (!isUuid(id)) continue;
      inserts.push({
        promo_code_id: params.promoCodeId,
        merchant_id: params.merchantId,
        menu_item_id: null,
        category_id: id,
      });
    }

    if (inserts.length === 0) return;

    const { error: insErr } = await supabase.from('promo_code_targets').insert(inserts);
    if (insErr) throw insErr;
  }

  // ---------- BXGY targets ----------
async getBxgyTargets(promoCodeId: string): Promise<BxgyTargetRow[]> {
  const { data, error } = await supabase
    .from('promo_bxgy_targets')
    .select('id,promo_code_id,side,menu_item_id,category_id,created_at')
    .eq('promo_code_id', promoCodeId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as BxgyTargetRow[];
}

async replaceBxgyTargets(params: {
  promoCodeId: string;
  merchantId?: string | null; // kept only to avoid changing callers; NOT stored in promo_bxgy_targets
  buyMenuItemIds: string[];
  getMenuItemIds: string[];
}) {
  const { promoCodeId, buyMenuItemIds, getMenuItemIds } = params;

  const { error: delErr } = await supabase
    .from('promo_bxgy_targets')
    .delete()
    .eq('promo_code_id', promoCodeId);

  if (delErr) throw delErr;

  const rows: Array<{
    promo_code_id: string;
    side: BxgySide;
    menu_item_id: string;
    category_id?: string | null;
  }> = [];

  for (const id of buyMenuItemIds || []) {
    if (!isUuid(id)) continue;
    rows.push({
      promo_code_id: promoCodeId,
      side: 'buy',
      menu_item_id: id,
      category_id: null,
    });
  }

  for (const id of getMenuItemIds || []) {
    if (!isUuid(id)) continue;
    rows.push({
      promo_code_id: promoCodeId,
      side: 'get',
      menu_item_id: id,
      category_id: null,
    });
  }

  if (rows.length === 0) return;

  const { error: insErr } = await supabase.from('promo_bxgy_targets').insert(rows);
  if (insErr) throw insErr;
}

// ---------- CRUD ----------
async createPromoCode(payload: Partial<PromoCodeRow>): Promise<PromoCodeRow> {
  const { data, error } = await supabase
    .from('promo_codes')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data as PromoCodeRow;
}

async updatePromoCode(id: string, payload: Partial<PromoCodeRow>): Promise<PromoCodeRow> {
  const { data, error } = await supabase
    .from('promo_codes')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as PromoCodeRow;
}

async deletePromoCode(id: string) {
  const { error } = await supabase.from('promo_codes').delete().eq('id', id);
  if (error) throw error;
}

async toggleActive(id: string, next: boolean) {
  const { error } = await supabase.from('promo_codes').update({ is_active: next }).eq('id', id);
  if (error) throw error;
}

  // ---------- Customer/cart ----------
  async getActivePromoCodes(params?: { merchantId?: string | null }): Promise<PromoCodeRow[]> {
    const nowIso = new Date().toISOString();

    let qb = supabase
      .from('promo_codes')
      .select(
        [
          'id',
          'code',
          'description',
          'discount_type',
          'discount_value',
          'min_order_amount',
          'max_discount_amount',
          'usage_limit',
          'used_count',
          'max_uses_per_user',
          'is_active',
          'valid_from',
          'valid_until',
          'valid_days',
          'start_time',
          'end_time',
          'scope',
          'merchant_id',
          'created_by',
          'deal_type',
          'deal_json',
          'auto_apply',
          'priority',
        ].join(',')
      )
      .eq('is_active', true)
      .or(`valid_from.is.null,valid_from.lte.${nowIso}`)
      .or(`valid_until.is.null,valid_until.gte.${nowIso}`)
      .order('priority', { ascending: false })
      .order('valid_until', { ascending: true });

    if (params?.merchantId) {
      qb = qb.or(`merchant_id.eq.${params.merchantId},merchant_id.is.null`);
    }

    const { data, error } = await qb;
    if (error) throw error;
    return (data ?? []) as unknown as PromoCodeRow[];
  }

  // Validate coupon-style cart discounts (NOT BXGY)
  async validatePromoCode(
    params:
      | {
          code: string;
          orderAmount: number;
          userId: string;
          merchantId?: string | null;
          cartItems?: CartItemForPromo[];
        }
      | string,
    orderAmount?: number,
    userId?: string,
    options?: { merchantId?: string | null; cartItems?: CartItemForPromo[] }
  ): Promise<{
    valid: boolean;
    discount: number;
    message: string;
    promoCode?: PromoCodeRow;
    eligibleAmount?: number;
  }> {
    const p =
      typeof params === 'object' && params
        ? params
        : { code: params as string, orderAmount: orderAmount as number, userId: userId as string, ...(options || {}) };

    try {
      const promo = normalizeCode(p.code);
      const amount = Number(p.orderAmount || 0);

      if (!promo) return { valid: false, discount: 0, message: 'Enter a promo code' };
      if (!Number.isFinite(amount) || amount <= 0) return { valid: false, discount: 0, message: 'Cart total is invalid' };
      if (!isUuid(p.userId)) return { valid: false, discount: 0, message: 'Please sign in to use a promo code' };

      const { data: promoCode, error } = await supabase
        .from('promo_codes')
        .select('*')
        .ilike('code', promo)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (!promoCode) return { valid: false, discount: 0, message: 'Invalid promo code' };

      const dealType = (promoCode.deal_type ?? 'cart_discount') as DealType;
      if (dealType === 'bxgy') {
        return { valid: false, discount: 0, message: 'This offer is applied automatically from offers, not as a coupon.' };
      }

      const now = new Date();

      if (promoCode.valid_from) {
        const vf = new Date(promoCode.valid_from);
        if (!Number.isNaN(vf.getTime()) && now < vf) return { valid: false, discount: 0, message: 'Promo code is not active yet' };
      }
      if (promoCode.valid_until) {
        const vu = new Date(promoCode.valid_until);
        if (!Number.isNaN(vu.getTime()) && now > vu) return { valid: false, discount: 0, message: 'Promo code has expired' };
      }

      if (Array.isArray(promoCode.valid_days) && promoCode.valid_days.length > 0) {
        const today = dayNumberMon1Sun7(now);
        if (!promoCode.valid_days.includes(today)) return { valid: false, discount: 0, message: 'Promo code is not available today' };
      }

      if (!isNowWithinTimeWindow(now, promoCode.start_time, promoCode.end_time)) {
        return { valid: false, discount: 0, message: 'Promo code is not available at this time' };
      }

      if (promoCode.usage_limit != null && promoCode.used_count != null && promoCode.used_count >= promoCode.usage_limit) {
        return { valid: false, discount: 0, message: 'Promo code usage limit reached' };
      }

      if (amount < Number(promoCode.min_order_amount || 0)) {
        return { valid: false, discount: 0, message: `Minimum order amount ₹${promoCode.min_order_amount} required` };
      }

      const orderMerchantId = p.merchantId ?? null;

      if (promoCode.scope === 'merchant') {
        if (!orderMerchantId || promoCode.merchant_id !== orderMerchantId) {
          return { valid: false, discount: 0, message: 'Promo code is not valid for this restaurant' };
        }
      }

      const maxPerUser = promoCode.max_uses_per_user ?? 1;
      if (maxPerUser > 0) {
        const { count, error: cErr } = await supabase
          .from('promo_usage')
          .select('id', { count: 'exact', head: true })
          .eq('promo_code_id', promoCode.id)
          .eq('user_id', p.userId);

        if (cErr) throw cErr;
        if ((count ?? 0) >= maxPerUser) return { valid: false, discount: 0, message: 'You have already used this promo code' };
      }

      let eligibleAmount = amount;

      if (promoCode.scope === 'targets') {
        if (!orderMerchantId) return { valid: false, discount: 0, message: 'Promo code is not valid for this order' };

        const targets = await this.getPromoTargets(promoCode.id);
        const menuTargets = new Set(targets.filter((t) => t.menu_item_id).map((t) => t.menu_item_id as string));
        const catTargets = new Set(targets.filter((t) => t.category_id).map((t) => t.category_id as string));

        if (promoCode.merchant_id && promoCode.merchant_id !== orderMerchantId) {
          return { valid: false, discount: 0, message: 'Promo code is not valid for this restaurant' };
        }

        const items = p.cartItems ?? [];
        if (items.length === 0) return { valid: false, discount: 0, message: 'Promo code requires item details' };

        let eligibleSubtotal = 0;
        for (const it of items) {
          if (it.merchant_id !== orderMerchantId) continue;
          const hitMenu = menuTargets.size > 0 && menuTargets.has(it.menu_item_id);
          const hitCat = catTargets.size > 0 && !!it.category_id && catTargets.has(it.category_id);
          if (hitMenu || hitCat) eligibleSubtotal += Number(it.unit_price || 0) * Number(it.qty || 0);
        }

        if (eligibleSubtotal <= 0) return { valid: false, discount: 0, message: 'Promo code does not apply to items in your cart' };

        eligibleAmount = eligibleSubtotal;
      }

      let discount = 0;
      if (promoCode.discount_type === 'percentage') {
        discount = (eligibleAmount * Number(promoCode.discount_value || 0)) / 100;
        if (promoCode.max_discount_amount != null) {
          discount = Math.min(discount, Number(promoCode.max_discount_amount || 0));
        }
      } else {
        discount = Number(promoCode.discount_value || 0);
      }

      const finalDiscount = Math.max(0, Math.round(discount * 100) / 100);

      return {
        valid: true,
        discount: finalDiscount,
        eligibleAmount,
        message: `Promo code applied! You saved ₹${finalDiscount.toFixed(2)}`,
        promoCode: promoCode as PromoCodeRow,
      };
    } catch (err: any) {
      const info = formatErr(err);
      console.error('Promo code validation error:', info);
      return { valid: false, discount: 0, message: info?.message || 'Failed to validate promo code' };
    }
  }
}


export const promoCodeService = new PromoCodeService();
