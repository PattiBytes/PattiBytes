/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
export type DiscountType     = 'percentage' | 'fixed';
export type PromoScope       = 'global' | 'merchant' | 'targets';
export type DealType         = 'cart_discount' | 'bxgy';
export type BxgyDiscountType = 'free' | 'percentage' | 'fixed';
export type BxgySelection    = 'auto_cheapest' | 'customer_choice';

export interface PromoCodeRow {
  id                   : string;
  code                 : string;
  description          : string | null;
  discount_type        : DiscountType;
  discount_value       : number;
  min_order_amount     : number | null;
  max_discount_amount  : number | null;
  usage_limit          : number | null;
  used_count           : number | null;
  max_uses_per_user    : number | null;
  is_active            : boolean;
  valid_from           : string | null;
  valid_until          : string | null;
  valid_days           : number[] | null;
  start_time           : string | null;
  end_time             : string | null;
  scope                : PromoScope;
  merchant_id          : string | null;
  created_by           : string | null;
  created_at?          : string | null;
  updated_at?          : string | null;
  deal_type?           : DealType;
  deal_json?           : any;
  auto_apply?          : boolean;
  priority?            : number;
  is_secret?           : boolean;
  secret_allowed_users?: string[];
  secret_note?         : string | null;
}

export type PromoCode = PromoCodeRow;

export interface PromoTargetRow {
  id            : string;
  promo_code_id : string;
  merchant_id   : string | null;
  menu_item_id  : string | null;
  category_id   : string | null;
  created_at    : string;
}

export type BxgySide = 'buy' | 'get';

export interface BxgyTargetRow {
  id            : string;
  promo_code_id : string;
  side          : BxgySide;
  menu_item_id  : string | null;
  category_id   : string | null;
  created_at    : string;
}

export interface MenuItemLite {
  id                  : string;
  merchant_id         : string;
  name                : string;
  description?        : string | null;
  price               : number;
  category?           : string | null;
  discount_percentage?: number | null;
  category_id?        : string | null;
  is_available?       : boolean | null;
  is_veg?             : boolean | null;
  preparation_time?   : number | null;
  image_url?          : string | null;
}

export interface MerchantLite {
  id            : string;
  user_id       : string;
  business_name : string;
}

export interface CartItemForPromo {
  menu_item_id : string;
  merchant_id  : string;
  category_id? : string | null;
  qty          : number;
  unit_price   : number;
}

export interface PromoApplyResult {
  valid      : boolean;
  discount   : number;
  message    : string;
  promoCode  : PromoCodeRow | null;
  isBxgy     : boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(v: any): v is string {
  return typeof v === 'string' && uuidRegex.test(v);
}

function normalizeCode(v: any) {
  return String(v ?? '').trim().toUpperCase();
}

function clampNum(v: any, fallback = 0): number {
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

function dayNumberMon1Sun7(d: Date): number {
  const js = d.getDay(); // Sun=0..Sat=6
  return js === 0 ? 7 : js;
}

function timeToMinutes(t: string): number {
  const [hh, mm] = String(t).split(':');
  return Number(hh || 0) * 60 + Number(mm || 0);
}

function isNowWithinTimeWindow(now: Date, start: string | null, end: string | null): boolean {
  if (!start || !end) return true;
  const cur = now.getHours() * 60 + now.getMinutes();
  const s   = timeToMinutes(start);
  const e   = timeToMinutes(end);
  if (s <= e) return cur >= s && cur <= e;
  return cur >= s || cur <= e; // overnight window
}

export function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '';
}

/**
 * Normalize cart items from ANY shape:
 * - CartContext shape:  { id, merchantid, categoryid, quantity, price, discountpercentage }
 * - API / DB shape:     { menu_item_id, merchant_id, category_id, qty, unit_price }
 * - camelCase shape:    { menuItemId, merchantId, categoryId, qty, unitPrice }
 */
export function normalizeCartItemsForPromo(
  input: any[] | undefined | null,
): CartItemForPromo[] {
  const list = Array.isArray(input) ? input : [];

  return list
    .map((x) => {
      // Resolve menu_item_id — CartContext uses `id` as the menu item id
      const menu_item_id = String(
        x?.menu_item_id  ??
        x?.menuitemid    ??
        x?.menuItemId    ??
        x?.id            ??
        '',
      );

      const merchant_id = String(
        x?.merchant_id  ??
        x?.merchantid   ??
        x?.merchantId   ??
        '',
      );

      const category_id =
        x?.category_id ?? x?.categoryid ?? x?.categoryId ?? null;

      const qty = clampNum(x?.qty ?? x?.quantity ?? 0, 0);

      // unit_price = price after discount (what customer actually pays per unit)
      const rawPrice = clampNum(
        x?.unit_price   ??
        x?.unitprice    ??
        x?.unitPrice    ??
        x?.price        ??
        0,
        0,
      );
      const discPct = clampNum(
        x?.discount_percentage ?? x?.discountpercentage ?? x?.discountPercentage ?? 0,
        0,
      );
      const unit_price =
        x?.unit_price ?? x?.unitprice ?? x?.unitPrice
          ? rawPrice                                   // already a net price
          : rawPrice * (1 - discPct / 100);            // apply discount to base

      return { menu_item_id, merchant_id, category_id, qty, unit_price };
    })
    .filter(
      (x) =>
        isUuid(x.menu_item_id) &&
        isUuid(x.merchant_id)  &&
        x.qty        > 0       &&
        x.unit_price >= 0,
    );
}

// ─── Standalone list (used outside class) ─────────────────────────────────────
export async function listPromoCodes(params: {
  merchantId?    : string | null;
  includeGlobal? : boolean;
}): Promise<PromoCodeRow[]> {
  const merchantId    = params.merchantId    ?? null;
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

// ─── Service class ─────────────────────────────────────────────────────────────
class PromoCodeService {

  // ── Admin helpers ──────────────────────────────────────────────────────────
  async listPromoCodes(params: {
    merchantId?    : string | null;
    includeGlobal? : boolean;
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

  // ── BXGY discount core ─────────────────────────────────────────────────────
  /**
   * KEY FIX:
   * - Empty buy targets  → ALL merchant items qualify as "buy" items
   * - Empty get targets  → ALL merchant items qualify as "get" items
   * - Item matches buy/get if it's in the menu set OR the category set (OR, not AND)
   * - No longer returns "not configured" for empty targets — instead treats as open
   */
  computeBxgyDiscount(params: {
    promo       : PromoCodeRow;
    cartItems   : CartItemForPromo[];
    merchantId  : string;
    bxgyTargets : BxgyTargetRow[];
  }): { valid: boolean; discount: number; message: string } {
    const { promo, cartItems, merchantId, bxgyTargets } = params;

    const deal      = promo.deal_json || {};
    const buyQty    = Math.max(1, clampNum(deal?.buy?.qty,           1));
    const getQty    = Math.max(1, clampNum(deal?.get?.qty,           1));
    const maxSets   = Math.max(1, clampNum(deal?.max_sets_per_order, 1));
    const selection = (deal?.selection || 'auto_cheapest') as BxgySelection;

    const disc      = deal?.get?.discount || { type: 'free', value: 100 };
    const discType  = (disc?.type  || 'free') as BxgyDiscountType;
    const discValue = clampNum(disc?.value, 100);

    const buyTargets = bxgyTargets.filter((t) => t.side === 'buy');
    const getTargets = bxgyTargets.filter((t) => t.side === 'get');

    // Build lookup sets for buy side
    const buyMenu = new Set(
      buyTargets.filter((t) => t.menu_item_id).map((t) => t.menu_item_id as string),
    );
    const buyCat = new Set(
      buyTargets.filter((t) => t.category_id).map((t) => t.category_id as string),
    );

    // Build lookup sets for get side
    const getMenu = new Set(
      getTargets.filter((t) => t.menu_item_id).map((t) => t.menu_item_id as string),
    );
    const getCat = new Set(
      getTargets.filter((t) => t.category_id).map((t) => t.category_id as string),
    );

    // ✅ FIX: empty targets = ALL items from this merchant qualify
    const isBuyItem = (it: CartItemForPromo): boolean => {
      if (buyMenu.size === 0 && buyCat.size === 0) return true; // open — any item
      return (
        (buyMenu.size > 0 && buyMenu.has(it.menu_item_id)) ||
        (buyCat.size  > 0 && !!it.category_id && buyCat.has(it.category_id))
      );
    };

    const isGetItem = (it: CartItemForPromo): boolean => {
      if (getMenu.size === 0 && getCat.size === 0) return true; // open — any item
      return (
        (getMenu.size > 0 && getMenu.has(it.menu_item_id)) ||
        (getCat.size  > 0 && !!it.category_id && getCat.has(it.category_id))
      );
    };

    // Only items from this merchant
    const items = normalizeCartItemsForPromo(cartItems).filter(
      (x) => x.merchant_id === merchantId,
    );

    if (items.length === 0) {
      return { valid: false, discount: 0, message: 'No cart items for this restaurant.' };
    }

    // Total qualifying buy units
    const buyCount = items.reduce(
      (acc, it) => acc + (isBuyItem(it) ? clampNum(it.qty, 0) : 0),
      0,
    );

    // Pool of individual get-eligible units (exploded for cheapest-sort)
    const getPool = items
      .filter(isGetItem)
      .flatMap((it) => {
        const qty = Math.max(0, clampNum(it.qty, 0));
        return Array.from({ length: qty }).map(() => ({
          unit_price: clampNum(it.unit_price, 0),
        }));
      })
      .filter((x) => x.unit_price > 0);

    const possibleSets = Math.min(
      Math.floor(buyCount  / buyQty),
      Math.floor(getPool.length / getQty),
      maxSets,
    );

    if (possibleSets <= 0) {
      const needed = buyQty - (buyCount % buyQty || buyQty);
      return {
        valid   : false,
        discount: 0,
        message : buyCount === 0
          ? `Add ${buyQty} qualifying item(s) to unlock this offer.`
          : `Add ${needed} more qualifying item(s) to unlock this offer.`,
      };
    }

    // Sort cheapest-first if auto_cheapest (maximises free savings for customer)
    let discountedUnits = getPool;
    if (selection === 'auto_cheapest') {
      discountedUnits = [...getPool].sort((a, b) => a.unit_price - b.unit_price);
    }

    const chosen = discountedUnits.slice(0, possibleSets * getQty);

    let discount = 0;
    for (const u of chosen) {
      if      (discType === 'free')       discount += u.unit_price;
      else if (discType === 'percentage') discount += (u.unit_price * discValue) / 100;
      else                                discount += Math.min(u.unit_price, discValue);
    }

    discount = Math.max(0, Math.round(discount * 100) / 100);

    const label =
      discType === 'free'
        ? `${possibleSets > 1 ? `${possibleSets}×` : ''}Get ${getQty} FREE`
        : `Get ${possibleSets * getQty} items at ${discType === 'percentage' ? `${discValue}%` : `₹${discValue}`} off`;

    return {
      valid   : true,
      discount,
      message : `🎁 ${label} — You save ₹${discount.toFixed(2)}!`,
    };
  }

  // ── Menu item helpers ──────────────────────────────────────────────────────
  async listMenuItems(params: {
    merchantId         : string;
    limit?             : number;
    offset?            : number;
    includeUnavailable?: boolean;
  }): Promise<MenuItemLite[]> {
    const merchantId = String(params.merchantId || '').trim();
    if (!merchantId) return [];

    const limit  = Math.max(1, clampNum(params.limit,  200));
    const offset = Math.max(0, clampNum(params.offset, 0));

    let qb = supabase
      .from('menu_items')
      .select(
        'id,merchant_id,name,description,price,category,discount_percentage,image_url,is_available,is_veg,preparation_time,category_id',
      )
      .eq('merchant_id', merchantId)
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (!(params.includeUnavailable ?? true)) qb = qb.eq('is_available', true);

    const { data, error } = await qb;
    if (error) throw error;
    return (data ?? []) as MenuItemLite[];
  }

  async listAllMenuItems(params: {
    merchantId          : string;
    includeUnavailable? : boolean;
    pageSize?           : number;
    hardLimit?          : number;
  }): Promise<MenuItemLite[]> {
    const merchantId = String(params.merchantId || '').trim();
    if (!merchantId) return [];

    const pageSize  = Math.min(Math.max(params.pageSize  ?? 500,    50),    1000);
    const hardLimit = Math.min(Math.max(params.hardLimit ?? 20000, 1000), 100000);

    let offset = 0;
    const out: MenuItemLite[] = [];

    while (true) {
      const page = await this.listMenuItems({
        merchantId,
        limit              : pageSize,
        offset,
        includeUnavailable : params.includeUnavailable ?? true,
      });
      out.push(...page);
      if (page.length < pageSize) break;
      offset += pageSize;
      if (out.length >= hardLimit) break;
    }

    return out;
  }

  async searchMenuItems(params: {
    merchantId          : string;
    query               : string;
    limit?              : number;
    includeUnavailable? : boolean;
    offset?             : number;
  }): Promise<MenuItemLite[]> {
    const merchantId = String(params.merchantId || '').trim();
    if (!merchantId) return [];

    const q    = String(params.query || '').trim();
    const like = `%${q}%`;

    let qb = supabase
      .from('menu_items')
      .select(
        'id,merchant_id,name,description,price,category,discount_percentage,image_url,is_available,is_veg,preparation_time,category_id',
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
        'id,merchant_id,name,description,price,category,discount_percentage,image_url,is_available,is_veg,preparation_time,category_id',
      )
      .in('id', clean);

    if (error) throw error;
    return (data ?? []) as MenuItemLite[];
  }

  // ── Targets (cart-discount) ────────────────────────────────────────────────
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
    promoCodeId  : string;
    merchantId   : string | null;
    menuItemIds  : string[];
    categoryIds? : string[];
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
        merchant_id  : params.merchantId,
        menu_item_id : id,
        category_id  : null,
      });
    }
    for (const id of params.categoryIds || []) {
      if (!isUuid(id)) continue;
      inserts.push({
        promo_code_id: params.promoCodeId,
        merchant_id  : params.merchantId,
        menu_item_id : null,
        category_id  : id,
      });
    }

    if (inserts.length === 0) return;

    const { error: insErr } = await supabase
      .from('promo_code_targets')
      .insert(inserts);
    if (insErr) throw insErr;
  }

  // ── BXGY targets ──────────────────────────────────────────────────────────
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
    promoCodeId     : string;
    merchantId?     : string | null;
    buyMenuItemIds  : string[];
    getMenuItemIds  : string[];
  }) {
    const { promoCodeId, buyMenuItemIds, getMenuItemIds } = params;

    const { error: delErr } = await supabase
      .from('promo_bxgy_targets')
      .delete()
      .eq('promo_code_id', promoCodeId);
    if (delErr) throw delErr;

    const rows: Array<{
      promo_code_id : string;
      side          : BxgySide;
      menu_item_id  : string;
      category_id   : null;
    }> = [];

    for (const id of buyMenuItemIds || []) {
      if (!isUuid(id)) continue;
      rows.push({ promo_code_id: promoCodeId, side: 'buy', menu_item_id: id, category_id: null });
    }
    for (const id of getMenuItemIds || []) {
      if (!isUuid(id)) continue;
      rows.push({ promo_code_id: promoCodeId, side: 'get', menu_item_id: id, category_id: null });
    }

    // ✅ Allow empty targets — means "all items" (don't insert, just return)
    if (rows.length === 0) return;

    const { error: insErr } = await supabase
      .from('promo_bxgy_targets')
      .insert(rows);
    if (insErr) throw insErr;
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────
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
    const { error } = await supabase
      .from('promo_codes')
      .update({ is_active: next })
      .eq('id', id);
    if (error) throw error;
  }

  // ── Customer / active promos ───────────────────────────────────────────────
  async getActivePromoCodes(params?: {
    merchantId?: string | null;
  }): Promise<PromoCodeRow[]> {
    const nowIso = new Date().toISOString();

    let qb = supabase
      .from('promo_codes')
      .select(
        [
          'id', 'code', 'description',
          'discount_type', 'discount_value',
          'min_order_amount', 'max_discount_amount',
          'usage_limit', 'used_count', 'max_uses_per_user',
          'is_active', 'valid_from', 'valid_until',
          'valid_days', 'start_time', 'end_time',
          'scope', 'merchant_id', 'created_by',
          'deal_type', 'deal_json', 'auto_apply', 'priority',
          'is_secret', 'secret_allowed_users', 'secret_note',
        ].join(','),
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

  // ── Customer / validatePromoCode (cart_discount only) ─────────────────────
  async validatePromoCode(
    params:
      | {
          code        : string;
          orderAmount : number;
          userId      : string;
          merchantId? : string | null;
          cartItems?  : CartItemForPromo[];
        }
      | string,
    orderAmount?: number,
    userId?     : string,
    options?    : { merchantId?: string | null; cartItems?: CartItemForPromo[] },
  ): Promise<{
    valid           : boolean;
    discount        : number;
    message         : string;
    promoCode?      : PromoCodeRow;
    eligibleAmount? : number;
  }> {
    const p =
      typeof params === 'object' && params
        ? params
        : ({
            code        : params as string,
            orderAmount : orderAmount as number,
            userId      : userId    as string,
            ...(options || {}),
          } as {
            code        : string;
            orderAmount : number;
            userId      : string;
            merchantId? : string | null;
            cartItems?  : CartItemForPromo[];
          });

    try {
      const promo  = normalizeCode(p.code);
      const amount = Number(p.orderAmount || 0);

      if (!promo)
        return { valid: false, discount: 0, message: 'Enter a promo code' };
      if (!Number.isFinite(amount) || amount <= 0)
        return { valid: false, discount: 0, message: 'Cart total is invalid' };
      if (!isUuid(p.userId))
        return { valid: false, discount: 0, message: 'Please sign in to use a promo code' };

      const { data: promoCode, error } = await supabase
        .from('promo_codes')
        .select('*')
        .ilike('code', promo)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (!promoCode)
        return { valid: false, discount: 0, message: 'Invalid or inactive promo code' };

      // BXGY codes cannot be entered manually
      if ((promoCode.deal_type ?? 'cart_discount') === 'bxgy') {
        return {
          valid   : false,
          discount: 0,
          message : 'This offer is applied automatically — no code needed.',
        };
      }

      const now = new Date();

      if (promoCode.valid_from) {
        const vf = new Date(promoCode.valid_from);
        if (!Number.isNaN(vf.getTime()) && now < vf)
          return { valid: false, discount: 0, message: 'Promo code is not active yet' };
      }
      if (promoCode.valid_until) {
        const vu = new Date(promoCode.valid_until);
        if (!Number.isNaN(vu.getTime()) && now > vu)
          return { valid: false, discount: 0, message: 'Promo code has expired' };
      }

      if (Array.isArray(promoCode.valid_days) && promoCode.valid_days.length > 0) {
        const today = dayNumberMon1Sun7(now);
        if (!promoCode.valid_days.includes(today))
          return { valid: false, discount: 0, message: 'Promo code not available today' };
      }

      if (!isNowWithinTimeWindow(now, promoCode.start_time, promoCode.end_time))
        return { valid: false, discount: 0, message: 'Promo code not available at this time' };

      if (
        promoCode.usage_limit != null &&
        promoCode.used_count  != null &&
        promoCode.used_count >= promoCode.usage_limit
      ) {
        return { valid: false, discount: 0, message: 'Promo code usage limit reached' };
      }

      if (amount < Number(promoCode.min_order_amount || 0))
        return {
          valid   : false,
          discount: 0,
          message : `Minimum order ₹${promoCode.min_order_amount} required`,
        };

      const orderMerchantId = p.merchantId ?? null;

      if (promoCode.scope === 'merchant') {
        if (!orderMerchantId || promoCode.merchant_id !== orderMerchantId)
          return { valid: false, discount: 0, message: 'Promo not valid for this restaurant' };
      }

      // Per-user usage check
      const maxPerUser = promoCode.max_uses_per_user ?? 1;
      if (maxPerUser > 0) {
        const { count, error: cErr } = await supabase
          .from('promo_usage')
          .select('id', { count: 'exact', head: true })
          .eq('promo_code_id', promoCode.id)
          .eq('user_id', p.userId);

        if (cErr) throw cErr;
        if ((count ?? 0) >= maxPerUser)
          return { valid: false, discount: 0, message: 'You have already used this promo code' };
      }

      // Targets scope — compute eligible subtotal
      let eligibleAmount = amount;

      if (promoCode.scope === 'targets') {
        if (!orderMerchantId)
          return { valid: false, discount: 0, message: 'Promo not valid for this order' };

        if (promoCode.merchant_id && promoCode.merchant_id !== orderMerchantId)
          return { valid: false, discount: 0, message: 'Promo not valid for this restaurant' };

        const targets    = await this.getPromoTargets(promoCode.id);
        const menuTargets = new Set(targets.filter((t) => t.menu_item_id).map((t) => t.menu_item_id as string));
        const catTargets  = new Set(targets.filter((t) => t.category_id ).map((t) => t.category_id  as string));

        const items = normalizeCartItemsForPromo(p.cartItems);
        if (items.length === 0)
          return { valid: false, discount: 0, message: 'Promo requires item details' };

        let eligibleSubtotal = 0;
        for (const it of items) {
          if (it.merchant_id !== orderMerchantId) continue;
          const hit =
            (menuTargets.size > 0 && menuTargets.has(it.menu_item_id)) ||
            (catTargets.size  > 0 && !!it.category_id && catTargets.has(it.category_id));
          if (hit) eligibleSubtotal += Number(it.unit_price || 0) * Number(it.qty || 0);
        }

        if (eligibleSubtotal <= 0)
          return { valid: false, discount: 0, message: 'Promo does not apply to items in your cart' };

        eligibleAmount = eligibleSubtotal;
      }

      // Compute discount
      let discount = 0;
      if (promoCode.discount_type === 'percentage') {
        discount = (eligibleAmount * Number(promoCode.discount_value || 0)) / 100;
        if (promoCode.max_discount_amount != null)
          discount = Math.min(discount, Number(promoCode.max_discount_amount || 0));
      } else {
        discount = Number(promoCode.discount_value || 0);
      }

      const finalDiscount = Math.max(0, Math.round(discount * 100) / 100);

      return {
        valid          : true,
        discount       : finalDiscount,
        eligibleAmount,
        message        : `🏷 Applied! You save ₹${finalDiscount.toFixed(2)}`,
        promoCode      : promoCode as PromoCodeRow,
      };
    } catch (err: any) {
      const info = formatErr(err);
      console.error('Promo validation error:', info);
      return { valid: false, discount: 0, message: info?.message || 'Failed to validate promo' };
    }
  }

  // ── Auto best offer (BXGY + auto cart-discounts) ───────────────────────────
  async getBestAutoOffer(params: {
    merchantId  : string | null;
    userId      : string;
    orderAmount : number;
    cartItems   : CartItemForPromo[];
  }): Promise<{ promoCode: PromoCodeRow | null; discount: number; message: string }> {
    const merchantId    = params.merchantId ?? null;
    const normalizedCart = normalizeCartItemsForPromo(params.cartItems);

    const promos = await this.getActivePromoCodes({ merchantId });
    const autos  = (promos || [])
      .filter((p) => !!p.auto_apply)
      .sort((a, b) => clampNum(b.priority, 0) - clampNum(a.priority, 0));

    let best: { promoCode: PromoCodeRow | null; discount: number; message: string } = {
      promoCode: null,
      discount : 0,
      message  : 'No offer applied',
    };

    for (const p of autos) {
      const dealType = (p.deal_type ?? 'cart_discount') as DealType;

      if (dealType === 'bxgy') {
        if (!merchantId) continue;

        const bxgyTargets = await this.getBxgyTargets(p.id);
        const r = this.computeBxgyDiscount({
          promo      : p,
          cartItems  : normalizedCart,
          merchantId,
          bxgyTargets,
        });

        if (r.valid && r.discount > best.discount) {
          best = { promoCode: p, discount: r.discount, message: r.message };
        }
        continue;
      }

      // cart_discount auto promo
      const v = await this.validatePromoCode({
        code        : p.code,
        orderAmount : params.orderAmount,
        userId      : params.userId,
        merchantId,
        cartItems   : normalizedCart,
      });

      if (v.valid && v.discount > best.discount) {
        best = { promoCode: v.promoCode || p, discount: v.discount, message: v.message };
      }
    }

    return best;
  }

  // ── Single entry point for checkout ───────────────────────────────────────
  async applyPromoToOrder(params: {
    code?       : string;
    merchantId  : string;
    userId      : string;
    orderAmount : number;
    cartItems   : CartItemForPromo[];
  }): Promise<PromoApplyResult> {
    const normalizedCart = normalizeCartItemsForPromo(params.cartItems);

    // Manual code entered
    if (params.code && params.code.trim()) {
      const result = await this.validatePromoCode({
        code        : params.code,
        orderAmount : params.orderAmount,
        userId      : params.userId,
        merchantId  : params.merchantId,
        cartItems   : normalizedCart,
      });
      return {
        valid    : result.valid,
        discount : result.discount,
        message  : result.message,
        promoCode: result.promoCode ?? null,
        isBxgy   : false,
      };
    }

    // Auto-apply path
    const best = await this.getBestAutoOffer({
      merchantId  : params.merchantId,
      userId      : params.userId,
      orderAmount : params.orderAmount,
      cartItems   : normalizedCart,
    });

    return {
      valid    : best.promoCode !== null && best.discount > 0,
      discount : best.discount,
      message  : best.message,
      promoCode: best.promoCode,
      isBxgy   : best.promoCode?.deal_type === 'bxgy',
    };
  }

  // ── Record usage after order is placed ────────────────────────────────────
  async incrementPromoUsage(params: {
    promoCodeId : string;
    userId      : string;
    orderId     : string;
    discount    : number;
  }): Promise<void> {
    // 1. Insert usage row (UNIQUE on order_id prevents duplicates)
    const { error: usageErr } = await supabase
      .from('promo_usage')
      .upsert(
        {
          promo_code_id : params.promoCodeId,
          user_id       : params.userId,
          order_id      : params.orderId,
          discount_given: params.discount,
          used_at       : new Date().toISOString(),
        },
        { onConflict: 'order_id' },
      );

    if (usageErr) console.error('[Promo] promo_usage upsert failed:', usageErr);

    // 2. Atomic increment via RPC (created in SQL migration)
    const { error: incErr } = await supabase.rpc('increment_promo_used_count', {
      p_promo_code_id: params.promoCodeId,
    });

    if (incErr) console.error('[Promo] increment_used_count rpc failed:', incErr);
  }
}

export const promoCodeService = new PromoCodeService();
