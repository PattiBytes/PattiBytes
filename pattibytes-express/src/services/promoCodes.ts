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

  valid_days: number[] | null; // 1=Mon..7=Sun
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

// Simple “flat” list (admin usage)
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

  const { data, error } = await qb;
  if (error) throw error;
  return (data ?? []) as PromoCodeRow[];
}

function normalizeCartItemsForPromo(input: any[] | undefined | null): CartItemForPromo[] {
  const list = Array.isArray(input) ? input : [];
  return list
    .map((x) => ({
      menu_item_id: String(
        x?.menu_item_id ?? x?.menuitemid ?? x?.menuItemId ?? x?.id ?? ''
      ),
      merchant_id: String(
        x?.merchant_id ?? x?.merchantid ?? x?.merchantId ?? ''
      ),
      category_id: x?.category_id ?? x?.categoryid ?? x?.categoryId ?? null,
      qty: clampNum(x?.qty ?? x?.quantity ?? 0, 0),
      unit_price: clampNum(
        x?.unit_price ?? x?.unitprice ?? x?.unitPrice ?? x?.price ?? 0,
        0
      ),
    }))
    .filter(
      (x) =>
        isUuid(x.menu_item_id) &&
        isUuid(x.merchant_id) &&
        x.qty > 0 &&
        x.unit_price >= 0
    );
}

class PromoCodeService {
  // -------- Admin lists --------
  async listPromoCodes(params: {
    merchantId?: string | null;
    includeGlobal?: boolean;
  }): Promise<PromoCodeRow[]> {
    return listPromoCodes(params);
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

  async listMerchants(): Promise<MerchantLite[]> {
    const { data, error } = await supabase
      .from('merchants')
      .select('id,user_id,business_name')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as MerchantLite[];
  }

  // -------- BXGY discount core --------
  private computeBxgyDiscount(params: {
    promo: PromoCodeRow;
    cartItems: CartItemForPromo[];
    merchantId: string;
    bxgyTargets: BxgyTargetRow[];
  }): { valid: boolean; discount: number; message: string } {
    const { promo, cartItems, merchantId, bxgyTargets } = params;

    const deal = promo.deal_json || {};
    const buyQty = Math.max(1, clampNum(deal?.buy?.qty, 1));
    const getQty = Math.max(1, clampNum(deal?.get?.qty, 1));
    const maxSets = Math.max(1, clampNum(deal?.max_sets_per_order, 1));
    const selection = (deal?.selection || 'auto_cheapest') as BxgySelection;

    const disc = deal?.get?.discount || { type: 'free', value: 100 };
    const discType = (disc?.type || 'free') as BxgyDiscountType;
    const discValue = clampNum(disc?.value, 100);

    const buyTargets = bxgyTargets.filter((t) => t.side === 'buy');
    const getTargets = bxgyTargets.filter((t) => t.side === 'get');

    const buyMenu = new Set(
      buyTargets
        .filter((t) => t.menu_item_id)
        .map((t) => t.menu_item_id as string)
    );
    const buyCat = new Set(
      buyTargets
        .filter((t) => t.category_id)
        .map((t) => t.category_id as string)
    );
    const getMenu = new Set(
      getTargets
        .filter((t) => t.menu_item_id)
        .map((t) => t.menu_item_id as string)
    );
    const getCat = new Set(
      getTargets
        .filter((t) => t.category_id)
        .map((t) => t.category_id as string)
    );

    const items = normalizeCartItemsForPromo(cartItems).filter(
      (x) => x.merchant_id === merchantId
    );

    const isBuyItem = (it: CartItemForPromo) =>
      (buyMenu.size > 0 && buyMenu.has(it.menu_item_id)) ||
      (buyCat.size > 0 && !!it.category_id && buyCat.has(it.category_id));

    const isGetItem = (it: CartItemForPromo) =>
      (getMenu.size > 0 && getMenu.has(it.menu_item_id)) ||
      (getCat.size > 0 && !!it.category_id && getCat.has(it.category_id));

    const buyCount = items.reduce(
      (acc, it) => acc + (isBuyItem(it) ? clampNum(it.qty, 0) : 0),
      0
    );

    const getPool = items
      .filter(isGetItem)
      .flatMap((it) => {
        const qty = Math.max(0, clampNum(it.qty, 0));
        return Array.from({ length: qty }).map(() => ({
          unit_price: clampNum(it.unit_price, 0),
        }));
      })
      .filter((x) => x.unit_price > 0);

    if (buyTargets.length === 0 || getTargets.length === 0) {
      return {
        valid: false,
        discount: 0,
        message: 'Offer targets are not configured',
      };
    }

    const possibleSets = Math.min(
      Math.floor(buyCount / buyQty),
      Math.floor(getPool.length / getQty),
      maxSets
    );
    if (possibleSets <= 0) {
      return {
        valid: false,
        discount: 0,
        message: 'Offer not applicable for current cart',
      };
    }

    let discountedUnits = getPool;
    if (selection === 'auto_cheapest') {
      discountedUnits = [...getPool].sort(
        (a, b) => a.unit_price - b.unit_price
      );
    }

    const takeCount = possibleSets * getQty;
    const chosen = discountedUnits.slice(0, takeCount);

    let discount = 0;
    for (const u of chosen) {
      if (discType === 'free') discount += u.unit_price;
      else if (discType === 'percentage')
        discount += (u.unit_price * discValue) / 100;
      else discount += Math.min(u.unit_price, discValue);
    }

    discount = Math.max(0, Math.round(discount * 100) / 100);

    return {
      valid: true,
      discount,
      message: `Offer applied! You saved ₹${discount.toFixed(2)}`,
    };
  }

  // -------- Menu item helpers (admin) --------
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

  async listAllMenuItems(params: {
    merchantId: string;
    includeUnavailable?: boolean;
    pageSize?: number;
    hardLimit?: number;
  }): Promise<MenuItemLite[]> {
    const merchantId = String(params.merchantId || '').trim();
    if (!merchantId) return [];

    const pageSize = Math.min(Math.max(params.pageSize ?? 500, 50), 1000);
    const hardLimit = Math.min(
      Math.max(params.hardLimit ?? 20000, 1000),
      100000
    );

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

  // -------- Targets (cart-discount) --------
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

    const { error: insErr } = await supabase
      .from('promo_code_targets')
      .insert(inserts);
    if (insErr) throw insErr;
  }

  // -------- BXGY targets --------
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
    merchantId?: string | null; // kept for callers, not stored
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

    const { error: insErr } = await supabase
      .from('promo_bxgy_targets')
      .insert(rows);
    if (insErr) throw insErr;
  }

  // -------- CRUD --------
  async createPromoCode(payload: Partial<PromoCodeRow>): Promise<PromoCodeRow> {
    const { data, error } = await supabase
      .from('promo_codes')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data as PromoCodeRow;
  }

  async updatePromoCode(
    id: string,
    payload: Partial<PromoCodeRow>
  ): Promise<PromoCodeRow> {
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
    const { error } = await supabase
      .from('promo_codes')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async toggleActive(id: string, next: boolean) {
    const { error } = await supabase
      .from('promo_codes')
      .update({ is_active: next })
      .eq('id', id);
    if (error) throw error;
  }

  // -------- Customer / active promos --------
  async getActivePromoCodes(params?: {
    merchantId?: string | null;
  }): Promise<PromoCodeRow[]> {
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

  // -------- Customer / validation (cart-discount only) --------
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
        : ({
            code: params as string,
            orderAmount: orderAmount as number,
            userId: userId as string,
            ...(options || {}),
          } as {
            code: string;
            orderAmount: number;
            userId: string;
            merchantId?: string | null;
            cartItems?: CartItemForPromo[];
          });

    try {
      const promo = normalizeCode(p.code);
      const amount = Number(p.orderAmount || 0);

      if (!promo)
        return { valid: false, discount: 0, message: 'Enter a promo code' };
      if (!Number.isFinite(amount) || amount <= 0)
        return {
          valid: false,
          discount: 0,
          message: 'Cart total is invalid',
        };
      if (!isUuid(p.userId))
        return {
          valid: false,
          discount: 0,
          message: 'Please sign in to use a promo code',
        };

      const { data: promoCode, error } = await supabase
        .from('promo_codes')
        .select('*')
        .ilike('code', promo)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (!promoCode)
        return { valid: false, discount: 0, message: 'Invalid promo code' };

      const dealType = (promoCode.deal_type ?? 'cart_discount') as DealType;
      if (dealType === 'bxgy') {
        return {
          valid: false,
          discount: 0,
          message:
            'This offer is applied automatically from offers, not as a coupon.',
        };
      }

      const now = new Date();

      if (promoCode.valid_from) {
        const vf = new Date(promoCode.valid_from);
        if (!Number.isNaN(vf.getTime()) && now < vf)
          return {
            valid: false,
            discount: 0,
            message: 'Promo code is not active yet',
          };
      }
      if (promoCode.valid_until) {
        const vu = new Date(promoCode.valid_until);
        if (!Number.isNaN(vu.getTime()) && now > vu)
          return {
            valid: false,
            discount: 0,
            message: 'Promo code has expired',
          };
      }

      if (Array.isArray(promoCode.valid_days) && promoCode.valid_days.length > 0) {
        const today = dayNumberMon1Sun7(now);
        if (!promoCode.valid_days.includes(today))
          return {
            valid: false,
            discount: 0,
            message: 'Promo code is not available today',
          };
      }

      if (!isNowWithinTimeWindow(now, promoCode.start_time, promoCode.end_time)) {
        return {
          valid: false,
          discount: 0,
          message: 'Promo code is not available at this time',
        };
      }

      if (
        promoCode.usage_limit != null &&
        promoCode.used_count != null &&
        promoCode.used_count >= promoCode.usage_limit
      ) {
        return {
          valid: false,
          discount: 0,
          message: 'Promo code usage limit reached',
        };
      }

      if (amount < Number(promoCode.min_order_amount || 0)) {
        return {
          valid: false,
          discount: 0,
          message: `Minimum order amount ₹${promoCode.min_order_amount} required`,
        };
      }

      const orderMerchantId = p.merchantId ?? null;

      if (promoCode.scope === 'merchant') {
        if (!orderMerchantId || promoCode.merchant_id !== orderMerchantId) {
          return {
            valid: false,
            discount: 0,
            message: 'Promo code is not valid for this restaurant',
          };
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
        if ((count ?? 0) >= maxPerUser)
          return {
            valid: false,
            discount: 0,
            message: 'You have already used this promo code',
          };
      }

      let eligibleAmount = amount;

      if (promoCode.scope === 'targets') {
        if (!orderMerchantId)
          return {
            valid: false,
            discount: 0,
            message: 'Promo code is not valid for this order',
          };

        const targets = await this.getPromoTargets(promoCode.id);
        const menuTargets = new Set(
          targets
            .filter((t) => t.menu_item_id)
            .map((t) => t.menu_item_id as string)
        );
        const catTargets = new Set(
          targets
            .filter((t) => t.category_id)
            .map((t) => t.category_id as string)
        );

        if (promoCode.merchant_id && promoCode.merchant_id !== orderMerchantId) {
          return {
            valid: false,
            discount: 0,
            message: 'Promo code is not valid for this restaurant',
          };
        }

        const items = normalizeCartItemsForPromo(p.cartItems);
        if (items.length === 0)
          return {
            valid: false,
            discount: 0,
            message: 'Promo code requires item details',
          };

        let eligibleSubtotal = 0;
        for (const it of items) {
          if (it.merchant_id !== orderMerchantId) continue;
          const hitMenu =
            menuTargets.size > 0 && menuTargets.has(it.menu_item_id);
          const hitCat =
            catTargets.size > 0 &&
            !!it.category_id &&
            catTargets.has(it.category_id);
          if (hitMenu || hitCat) {
            eligibleSubtotal += Number(it.unit_price || 0) * Number(it.qty || 0);
          }
        }

        if (eligibleSubtotal <= 0)
          return {
            valid: false,
            discount: 0,
            message: 'Promo code does not apply to items in your cart',
          };

        eligibleAmount = eligibleSubtotal;
      }

      let discount = 0;
      if (promoCode.discount_type === 'percentage') {
        discount =
          (eligibleAmount * Number(promoCode.discount_value || 0)) / 100;
        if (promoCode.max_discount_amount != null) {
          discount = Math.min(
            discount,
            Number(promoCode.max_discount_amount || 0)
          );
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
      return {
        valid: false,
        discount: 0,
        message: info?.message || 'Failed to validate promo code',
      };
    }
  }

  // -------- Auto best offer (BXGY + auto coupons) --------
  async getBestAutoOffer(params: {
    merchantId: string | null;
    userId: string;
    orderAmount: number;
    cartItems: CartItemForPromo[];
  }): Promise<{
    promoCode: PromoCodeRow | null;
    discount: number;
    message: string;
  }> {
    const merchantId = params.merchantId ?? null;

    const promos = await this.getActivePromoCodes({ merchantId });

    const autos = (promos || [])
      .filter((p) => !!p.auto_apply)
      .sort((a, b) => {
        const pa = clampNum(a.priority, 0);
        const pb = clampNum(b.priority, 0);
        return pb - pa;
      });

    let best: {
      promoCode: PromoCodeRow | null;
      discount: number;
      message: string;
    } = {
      promoCode: null,
      discount: 0,
      message: 'No offer applied',
    };

    for (const p of autos) {
      const dealType = (p.deal_type ?? 'cart_discount') as DealType;

      if (dealType === 'bxgy') {
        if (!merchantId) continue;

        const bxgyTargets = await this.getBxgyTargets(p.id);
        const r = this.computeBxgyDiscount({
          promo: p,
          cartItems: params.cartItems,
          merchantId,
          bxgyTargets,
        });

        if (r.valid && r.discount > best.discount) {
          best = { promoCode: p, discount: r.discount, message: r.message };
        }
        continue;
      }

      const v = await this.validatePromoCode({
        code: p.code,
        orderAmount: params.orderAmount,
        userId: params.userId,
        merchantId,
        cartItems: normalizeCartItemsForPromo(params.cartItems),
      });

      if (v.valid && v.discount > best.discount) {
        best = {
          promoCode: v.promoCode || p,
          discount: v.discount,
          message: v.message,
        };
      }
    }

    return best;
  }
}

export const promoCodeService = new PromoCodeService();
