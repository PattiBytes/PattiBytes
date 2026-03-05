 
import { supabase } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────
export type DiscountType  = 'percentage' | 'flat' | 'free_delivery'
export type DealType      = 'standard' | 'cartdiscount' | 'bxgy' | 'free_delivery' | 'item_free' | null

export interface PromoCode {
  id:                  string
  code:                string
  description:         string | null
  discount_type:       DiscountType
  discount_value:      number
  min_order_amount:    number | null
  max_discount_amount: number | null
  usage_limit:         number | null
  used_count:          number | null
  max_uses_per_user:   number | null
  is_active:           boolean
  valid_from:          string | null
  valid_until:         string | null
  valid_days:          number | null
  start_time:          string | null
  end_time:            string | null
  scope:               'global' | 'merchant'
  merchant_id:         string | null
  /** Array of specific menu_item UUIDs this promo applies to */
  menu_item_ids:       string[] | null
  category_ids:        string[] | null
  deal_type:           DealType
  deal_json:           any
  auto_apply:          boolean
  priority:            number
  created_by?:         string | null
  created_at?:         string
  updated_at?:         string
}

// Cart item shape passed into validation
export interface CartItemForPromo {
  menu_item_id: string
  merchant_id:  string
  category_id?: string | null
  qty:          number
  unit_price:   number
}

// BxGy free gift line (used by CartItemsList + checkout)
export interface BxGyGift {
  menuItemId: string
  name:       string
  qty:        number
  price:      number
  promoCode:  string
}

// Full validation result
export interface PromoValidationResult {
  valid:          boolean
  discount:       number         // monetary discount (0 for free_delivery — handled separately)
  message:        string
  promoCode?:     PromoCode
  isFreeDelivery: boolean        // true → waive delivery fee
  bxgyGifts?:     BxGyGift[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const isUuid  = (v: any): v is string => typeof v === 'string' && UUID_RE.test(v)
const toUpper = (v: any) => String(v ?? '').trim().toUpperCase()
const num     = (v: any, fb = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fb }

function timeToMins(t: string) {
  const [hh, mm] = String(t).split(':')
  return Number(hh || 0) * 60 + Number(mm || 0)
}

function isNowInWindow(start: string | null, end: string | null): boolean {
  if (!start || !end) return true
  const now = new Date()
  const cur  = now.getHours() * 60 + now.getMinutes()
  const s    = timeToMins(start)
  const e    = timeToMins(end)
  return s <= e ? cur >= s && cur <= e : cur >= s || cur <= e
}

// ─── BxGy computation ─────────────────────────────────────────────────────────
/**
 * Given a BxGy promo and cart items, compute:
 *  - how many "sets" apply
 *  - which items are free (cheapest-first selection)
 *  - total monetary discount
 */
function computeBxgyDiscount(
  promo:      PromoCode,
  cartItems:  CartItemForPromo[],
): { valid: boolean; discount: number; message: string; gifts: BxGyGift[] } {
  const deal     = promo.deal_json ?? {}
  const buyQty   = Math.max(1, num(deal?.buy?.qty, 1))
  const getQty   = Math.max(1, num(deal?.get?.qty, 1))
  const maxSets  = Math.max(1, num(deal?.max_sets_per_order, 999))
  const discPct  = num(deal?.get?.discount?.value, 100)   // 100 = fully free

  // Determine which item IDs qualify as "buy" items and "get" items
  // Uses promo.menu_item_ids array (combined buy+get when not split)
  // OR deal_json.buy.item_ids / deal_json.get.item_ids for explicit split
  const buyIds  = new Set<string>([
    ...(deal?.buy?.item_ids  ?? []),
    ...(promo.menu_item_ids  ?? []),   // fallback: all promo items
  ].filter(isUuid))

  const getIds  = new Set<string>([
    ...(deal?.get?.item_ids  ?? []),
    ...(promo.menu_item_ids  ?? []),   // fallback: same set
  ].filter(isUuid))

  const buyCats = new Set<string>((deal?.buy?.category_ids ?? promo.category_ids ?? []).filter(isUuid))
  const getCats = new Set<string>((deal?.get?.category_ids ?? promo.category_ids ?? []).filter(isUuid))

  const isBuyItem = (it: CartItemForPromo) =>
    (buyIds.size === 0 && buyCats.size === 0)    // no restriction = all items qualify
    || buyIds.has(it.menu_item_id)
    || (!!it.category_id && buyCats.has(it.category_id))

  const isGetItem = (it: CartItemForPromo) =>
    (getIds.size === 0 && getCats.size === 0)
    || getIds.has(it.menu_item_id)
    || (!!it.category_id && getCats.has(it.category_id))

  // Expand cart items into individual units (for correct qty accounting)
  const buyUnits = cartItems.filter(isBuyItem).reduce((s, it) => s + it.qty, 0)
  const getPool  = cartItems
    .filter(isGetItem)
    .flatMap(it => Array.from({ length: Math.max(0, it.qty) }, () => ({
      menu_item_id: it.menu_item_id,
      unit_price:   it.unit_price,
    })))
    .filter(u => u.unit_price > 0)

  const possibleSets = Math.min(
    Math.floor(buyUnits / buyQty),
    Math.floor(getPool.length / getQty),
    maxSets,
  )

  if (possibleSets <= 0)
    return { valid: false, discount: 0, message: 'Offer not applicable — add qualifying items', gifts: [] }

  // Apply to cheapest items first (most customer-friendly)
  const sorted   = [...getPool].sort((a, b) => a.unit_price - b.unit_price)
  const takeCount = possibleSets * getQty
  const chosen   = sorted.slice(0, takeCount)

  let discount = 0
  const giftMap = new Map<string, { unit_price: number; qty: number }>()

  for (const u of chosen) {
    discount += (u.unit_price * discPct) / 100
    const existing = giftMap.get(u.menu_item_id)
    if (existing) existing.qty++
    else giftMap.set(u.menu_item_id, { unit_price: u.unit_price, qty: 1 })
  }

  discount = Math.round(discount * 100) / 100

  // Build BxGyGift array (name resolved at call site from cart items)
  const gifts: BxGyGift[] = Array.from(giftMap.entries()).map(([id, g]) => ({
    menuItemId: id,
    name:       cartItems.find(c => c.menu_item_id === id)?.menu_item_id ?? 'Item',
    qty:        g.qty,
    price:      g.unit_price,
    promoCode:  promo.code,
  }))

  return {
    valid:    true,
    discount,
    message:  `🎁 Buy ${buyQty} Get ${getQty} Free — saved ₹${discount.toFixed(0)}!`,
    gifts,
  }
}

// ─── Item-free computation ────────────────────────────────────────────────────
/**
 * Applies discount_value% (usually 100) to items in menu_item_ids.
 * Used for "free specific item" promos.
 */
function computeItemFreeDiscount(
  promo:     PromoCode,
  cartItems: CartItemForPromo[],
): { valid: boolean; discount: number; message: string } {
  const targetIds = new Set<string>((promo.menu_item_ids ?? []).filter(isUuid))
  if (targetIds.size === 0)
    return { valid: false, discount: 0, message: 'Promo has no target items configured' }

  const disc = cartItems
    .filter(it => targetIds.has(it.menu_item_id))
    .reduce((s, it) => s + (it.unit_price * (promo.discount_value / 100)) * it.qty, 0)

  if (disc <= 0)
    return { valid: false, discount: 0, message: 'Add the required item to your cart to use this offer' }

  return {
    valid:    true,
    discount: Math.round(disc * 100) / 100,
    message:  `🎁 Item offer applied — saved ₹${disc.toFixed(0)}!`,
  }
}

// ─── Normalise cart items input ───────────────────────────────────────────────
function normaliseCartItems(input: any): CartItemForPromo[] {
  if (!Array.isArray(input)) return []
  return (input as any[])
    .map(x => ({
      menu_item_id: String(x?.menu_item_id ?? x?.menuitemid ?? x?.menuItemId ?? x?.id ?? ''),
      merchant_id:  String(x?.merchant_id  ?? x?.merchantid ?? x?.merchantId ?? ''),
      category_id:  x?.category_id ?? x?.categoryid ?? x?.categoryId ?? null,
      qty:          num(x?.qty ?? x?.quantity, 0),
      unit_price:   num(x?.unit_price ?? x?.unitprice ?? x?.unitPrice ?? x?.price, 0),
    }))
    .filter(it => isUuid(it.menu_item_id) && it.qty > 0 && it.unit_price > 0)
}

// ─── Active promos for a merchant (shown in cart) ─────────────────────────────
const SELECT_PROMO_COLS = [
  'id', 'code', 'description', 'discount_type', 'discount_value',
  'min_order_amount', 'max_discount_amount', 'usage_limit', 'used_count',
  'max_uses_per_user', 'is_active', 'valid_from', 'valid_until',
  'valid_days', 'start_time', 'end_time', 'scope', 'merchant_id',
  'menu_item_ids', 'category_ids',
  'deal_type', 'deal_json', 'auto_apply', 'priority',
].join(',')

export const promoCodeService = {

  /** Fetch active promos visible to a merchant's cart */
  async getActivePromos(merchantId?: string | null): Promise<PromoCode[]> {
    if (merchantId !== undefined && merchantId !== null && !isUuid(merchantId)) return []

    const nowIso = new Date().toISOString()
    let qb = supabase
      .from('promo_codes')
      .select(SELECT_PROMO_COLS)
      .eq('is_active', true)
      .or(`valid_from.is.null,valid_from.lte.${nowIso}`)
      .or(`valid_until.is.null,valid_until.gte.${nowIso}`)
      .order('priority', { ascending: false })
      .order('valid_until', { ascending: true })
      .limit(50)

    if (merchantId) {
      qb = qb.or(`merchant_id.eq.${merchantId},merchant_id.is.null`) as any
    } else {
      qb = qb.eq('scope', 'global') as any
    }

    const { data, error } = await qb
    if (error) { console.warn('[getActivePromos]', error.message); return [] }
    return (data ?? []) as unknown as PromoCode[]
  },

  /** Full validation — used by cart AND checkout */
  async validatePromoCode(
    code:        string,
    subtotal:    number,
    userId:      string,
    opts?: {
      merchantId?: string | null
      cartItems?:  any[]
    },
  ): Promise<PromoValidationResult> {
    const codeNorm = toUpper(code)
    if (!codeNorm)
      return { valid: false, discount: 0, message: 'Enter a promo code', isFreeDelivery: false }
    if (!isUuid(userId))
      return { valid: false, discount: 0, message: 'Please sign in to use promo codes', isFreeDelivery: false }
    if (!Number.isFinite(subtotal) || subtotal < 0)
      return { valid: false, discount: 0, message: 'Cart total is invalid', isFreeDelivery: false }
    if (opts?.merchantId && !isUuid(opts.merchantId))
      return { valid: false, discount: 0, message: 'Invalid merchant', isFreeDelivery: false }

    try {
      // 1. Fetch promo row
      const { data: promo, error } = await supabase
        .from('promo_codes')
        .select(SELECT_PROMO_COLS)
        .ilike('code', codeNorm)
        .eq('is_active', true)
        .maybeSingle()

      if (error) throw error
      if (!promo)
        return { valid: false, discount: 0, message: 'Invalid or inactive promo code', isFreeDelivery: false }

      const p = promo as unknown as PromoCode
      const now = new Date()

      // 2. Date window
      if (p.valid_until && new Date(p.valid_until) < now)
        return { valid: false, discount: 0, message: 'This promo code has expired', isFreeDelivery: false }
      if (p.valid_from && new Date(p.valid_from) > now)
        return { valid: false, discount: 0, message: 'This promo code is not active yet', isFreeDelivery: false }

      // 3. Time window
      if (!isNowInWindow(p.start_time, p.end_time))
        return { valid: false, discount: 0, message: 'This offer is not valid at this time', isFreeDelivery: false }

      // 4. Min order
      const minOrder = num(p.min_order_amount, 0)
      if (minOrder > 0 && subtotal < minOrder)
        return { valid: false, discount: 0, message: `Minimum order ₹${minOrder} required`, isFreeDelivery: false }

      // 5. Merchant scope
      if (p.scope === 'merchant' && opts?.merchantId && p.merchant_id !== opts.merchantId)
        return { valid: false, discount: 0, message: 'This code is not valid for this restaurant', isFreeDelivery: false }

      // 6. Global usage limit
      const usageLimit = num(p.usage_limit, 0)
      const usedCount  = num(p.used_count,  0)
      if (usageLimit > 0 && usedCount >= usageLimit)
        return { valid: false, discount: 0, message: 'This promo code has reached its usage limit', isFreeDelivery: false }

      // 7. Per-user limit
      const maxPerUser = num(p.max_uses_per_user, 0)
      if (maxPerUser > 0) {
        const { count } = await supabase
          .from('promo_usage')
          .select('*', { count: 'exact', head: true })
          .eq('promo_code_id', p.id)
          .eq('user_id', userId)
        if ((count ?? 0) >= maxPerUser)
          return { valid: false, discount: 0, message: 'You have already used this promo code the maximum number of times', isFreeDelivery: false }
      }

      const cartItems = normaliseCartItems(opts?.cartItems ?? [])

      // ── Deal type routing ─────────────────────────────────────────────────
      // A) Free delivery promo
      if (p.deal_type === 'free_delivery' || p.discount_type === 'free_delivery') {
        return {
          valid:          true,
          discount:       0,         // delivery fee waived — caller sets deliveryFee to 0
          message:        '🚚 Free delivery applied!',
          promoCode:      p,
          isFreeDelivery: true,
          bxgyGifts:      [],
        }
      }

      // B) BxGy (Buy X Get Y)
      if (p.deal_type === 'bxgy') {
        if (cartItems.length === 0)
          return { valid: false, discount: 0, message: 'Add items to cart first', isFreeDelivery: false }

        const bxgyResult = computeBxgyDiscount(p, cartItems)
        if (!bxgyResult.valid)
          return { valid: false, discount: 0, message: bxgyResult.message, isFreeDelivery: false }

        return {
          valid:          true,
          discount:       bxgyResult.discount,
          message:        bxgyResult.message,
          promoCode:      p,
          isFreeDelivery: false,
          bxgyGifts:      bxgyResult.gifts,
        }
      }

      // C) Item-free (free specific item)
      if (p.deal_type === 'item_free') {
        if (cartItems.length === 0)
          return { valid: false, discount: 0, message: 'Add qualifying items to cart first', isFreeDelivery: false }

        const r = computeItemFreeDiscount(p, cartItems)
        if (!r.valid)
          return { valid: false, discount: 0, message: r.message, isFreeDelivery: false }

        return {
          valid:          true,
          discount:       r.discount,
          message:        r.message,
          promoCode:      p,
          isFreeDelivery: false,
          bxgyGifts:      [],
        }
      }

      // D) Standard cart discount (percentage or flat)
      let discount = 0
      if (p.discount_type === 'percentage') {
        discount = (subtotal * p.discount_value) / 100
      } else if (p.discount_type === 'flat') {
        discount = p.discount_value
      }

      const maxDisc = num(p.max_discount_amount, 0)
      if (maxDisc > 0) discount = Math.min(discount, maxDisc)
      discount = Math.round(Math.min(discount, subtotal) * 100) / 100

      if (discount <= 0)
        return { valid: false, discount: 0, message: 'Promo code gives zero discount on your cart', isFreeDelivery: false }

      return {
        valid:          true,
        discount,
        message:        `✅ Saved ₹${discount.toFixed(0)}!`,
        promoCode:      p,
        isFreeDelivery: false,
        bxgyGifts:      [],
      }

    } catch (e: any) {
      console.error('[validatePromoCode]', e)
      return { valid: false, discount: 0, message: e?.message ?? 'Failed to apply promo code', isFreeDelivery: false }
    }
  },
}
