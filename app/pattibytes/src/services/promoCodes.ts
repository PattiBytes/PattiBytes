import { supabase } from '../lib/supabase'

// ─── Types ──────────────────────────────────────────────────────────────────
export type DiscountType  = 'percentage' | 'flat' | 'free_delivery'
export type DealType      = 'standard' | 'cartdiscount' | 'bxgy' | 'free_delivery' | 'item_free' | null

export interface PromoCode {
  id:                   string
  code:                 string
  description:          string | null
  discount_type:        DiscountType
  discount_value:       number
  min_order_amount:     number | null
  max_discount_amount:  number | null
  usage_limit:          number | null
  used_count:           number | null
  max_uses_per_user:    number | null
  is_active:            boolean
  valid_from:           string | null
  valid_until:          string | null
  valid_days:           string | null   // JSON "[\"1\",\"2\"...]" or null
  start_time:           string | null   // HH:mm:ss
  end_time:             string | null
  scope:                'global' | 'merchant'
  merchant_id:          string | null
  menu_item_ids:        string[] | null
  category_ids:         string[] | null
  deal_type:            DealType
  deal_json:            any
  auto_apply:           boolean
  priority:             number
  is_secret:            boolean
  secret_allowed_users: string[]
  secret_note?:         string | null
  created_by?:          string | null
  created_at?:          string
  updated_at?:          string
  // joined at call site
  merchant_name?:       string | null
}

// Cart item shape passed to validation – NOW includes name for gift display
export interface CartItemForPromo {
  menu_item_id: string
  merchant_id:  string
  category_id?: string | null
  qty:          number
  unit_price:   number
  name?:        string   // ← ADDED: needed for BxGy gift display
}

// BxGy free gift line
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
  discount:       number      // monetary discount (0 for free_delivery)
  message:        string
  promoCode?:     PromoCode
  isFreeDelivery: boolean
  bxgyGifts?:     BxGyGift[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
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
  // Handles cross-midnight windows (e.g. 22:00→02:00)
  return s <= e ? cur >= s && cur <= e : cur >= s || cur <= e
}

function isDayAllowed(validDays: string | null): boolean {
  if (!validDays) return true
  try {
    const days: string[] = JSON.parse(validDays)
    if (!days.length) return true
    // Sunday=0…Saturday=6; DB stores "1"=Mon…"7"=Sun
    const jsDay = new Date().getDay()           // 0=Sun
    const dbDay = jsDay === 0 ? 7 : jsDay       // convert to 1-7
    return days.includes(String(dbDay))
  } catch { return true }
}

// ─── BxGy computation ────────────────────────────────────────────────────────
function computeBxgyDiscount(
  promo:     PromoCode,
  cartItems: CartItemForPromo[],
): { valid: boolean; discount: number; message: string; gifts: BxGyGift[] } {
  const deal     = promo.deal_json ?? {}
  const buyQty   = Math.max(1, num(deal?.buy?.qty, 1))
  const getQty   = Math.max(1, num(deal?.get?.qty, 1))
  const maxSets  = Math.max(1, num(deal?.max_sets_per_order, 999))
  const discPct  = num(deal?.get?.discount?.value, 100)

  // Resolve buy/get item sets from deal_json first, fall back to menu_item_ids
  const buyIds = new Set<string>([
    ...(deal?.buy?.item_ids  ?? []),
    ...(promo.menu_item_ids  ?? []),
  ].filter(isUuid))

  const getIds = new Set<string>([
    ...(deal?.get?.item_ids  ?? []),
    ...(promo.menu_item_ids  ?? []),
  ].filter(isUuid))

  const buyCats = new Set<string>((deal?.buy?.category_ids ?? promo.category_ids ?? []).filter(isUuid))
  const getCats = new Set<string>((deal?.get?.category_ids ?? promo.category_ids ?? []).filter(isUuid))

  const isBuyItem = (it: CartItemForPromo) =>
    (buyIds.size === 0 && buyCats.size === 0)
    || buyIds.has(it.menu_item_id)
    || (!!it.category_id && buyCats.has(it.category_id))

  const isGetItem = (it: CartItemForPromo) =>
    (getIds.size === 0 && getCats.size === 0)
    || getIds.has(it.menu_item_id)
    || (!!it.category_id && getCats.has(it.category_id))

  const buyUnits = cartItems.filter(isBuyItem).reduce((s, it) => s + it.qty, 0)
  const getPool  = cartItems
    .filter(isGetItem)
    .flatMap(it => Array.from({ length: Math.max(0, it.qty) }, () => ({
      menu_item_id: it.menu_item_id,
      unit_price:   it.unit_price,
      name:         it.name ?? 'Item',
    })))
    .filter(u => u.unit_price > 0)

  const possibleSets = Math.min(
    Math.floor(buyUnits / buyQty),
    Math.floor(getPool.length / getQty),
    maxSets,
  )

  if (possibleSets <= 0)
    return { valid: false, discount: 0, message: 'Add qualifying items to unlock this offer', gifts: [] }

  // Give cheapest items free first
  const sorted   = [...getPool].sort((a, b) => a.unit_price - b.unit_price)
  const takeCount = possibleSets * getQty
  const chosen   = sorted.slice(0, takeCount)

  let discount = 0
  const giftMap = new Map<string, { unit_price: number; qty: number; name: string }>()

  for (const u of chosen) {
    discount += (u.unit_price * discPct) / 100
    const existing = giftMap.get(u.menu_item_id)
    if (existing) existing.qty++
    else giftMap.set(u.menu_item_id, { unit_price: u.unit_price, qty: 1, name: u.name })
  }

  discount = Math.round(discount * 100) / 100

  const gifts: BxGyGift[] = Array.from(giftMap.entries()).map(([id, g]) => ({
    menuItemId: id,
    name:       g.name,   // ← now correctly the item name, not its UUID
    qty:        g.qty,
    price:      g.unit_price,
    promoCode:  promo.code,
  }))

  return {
    valid:   true,
    discount,
    message: `🎁 Buy ${buyQty} Get ${getQty} Free — saved ₹${discount.toFixed(0)}!`,
    gifts,
  }
}

// ─── Item-free computation ──────────────────────────────────────────────────
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

// ─── Normalise cart items input ──────────────────────────────────────────────
function normaliseCartItems(input: any): CartItemForPromo[] {
  if (!Array.isArray(input)) return []
  return (input as any[])
    .map(x => ({
      menu_item_id: String(x?.menu_item_id ?? x?.menuitemid ?? x?.menuItemId ?? x?.id ?? ''),
      merchant_id:  String(x?.merchant_id  ?? x?.merchantid ?? x?.merchantId ?? ''),
      category_id:  x?.category_id ?? x?.categoryid ?? x?.categoryId ?? null,
      qty:          num(x?.qty ?? x?.quantity, 0),
      unit_price:   num(x?.unit_price ?? x?.unitprice ?? x?.unitPrice ?? x?.price, 0),
      name:         String(x?.name ?? x?.itemName ?? ''),  // ← ADDED
    }))
    .filter(it => isUuid(it.menu_item_id) && it.qty > 0 && it.unit_price > 0)
}

// ─── Column list ────────────────────────────────────────────────────────────
const SELECT_PROMO_COLS = [
  'id', 'code', 'description', 'discount_type', 'discount_value',
  'min_order_amount', 'max_discount_amount', 'usage_limit', 'used_count',
  'max_uses_per_user', 'is_active', 'valid_from', 'valid_until',
  'valid_days', 'start_time', 'end_time', 'scope', 'merchant_id',
  'menu_item_ids', 'category_ids',
  'deal_type', 'deal_json', 'auto_apply', 'priority',
  'is_secret', 'secret_allowed_users', 'secret_note',
].join(',')

// ─── Public service ──────────────────────────────────────────────────────────
export const promoCodeService = {

  /**
   * Fetch active, non-secret promos visible in the cart / offers page.
   * Secret promos are excluded from the visible list — they can only be
   * redeemed by typing the code manually.
   */
  async getActivePromos(merchantId?: string | null, userId?: string | null): Promise<PromoCode[]> {
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
      qb = qb.or(`merchant_id.eq.${merchantId},scope.eq.global`) as any
    } else {
      qb = qb.eq('scope', 'global') as any
    }

    const { data, error } = await qb
    if (error) { console.warn('[getActivePromos]', error.message); return [] }

    const all = (data ?? []) as unknown as PromoCode[]

    // Filter out secret promos unless this specific user is in the allowed list
    return all.filter(p => {
      if (!p.is_secret) return true
      if (!userId) return false
      const allowed = (p.secret_allowed_users ?? []) as string[]
      return allowed.length > 0 && allowed.includes(userId)
    })
  },

  /**
   * Fetch ALL active promos for the Offers page (including merchant promos).
   * Still hides secret promos unless the user is in the allowed list.
   */
  async getAllOffersPagePromos(userId?: string | null): Promise<PromoCode[]> {
    const nowIso = new Date().toISOString()
    const { data, error } = await supabase
      .from('promo_codes')
      .select(`${SELECT_PROMO_COLS}, merchants!merchant_id(business_name)`)
      .eq('is_active', true)
      .or(`valid_from.is.null,valid_from.lte.${nowIso}`)
      .or(`valid_until.is.null,valid_until.gte.${nowIso}`)
      .order('priority', { ascending: false })
      .order('valid_until', { ascending: true })
      .limit(100)

    if (error) { console.warn('[getAllOffersPagePromos]', error.message); return [] }

    const all = (data ?? []) as any[]
    return all
      .map(row => ({
        ...row,
        merchant_name: row.merchants?.business_name ?? null,
        merchants: undefined,
      }))
      .filter((p: PromoCode) => {
        if (!p.is_secret) return true
        if (!userId) return false
        const allowed = (p.secret_allowed_users ?? []) as string[]
        return allowed.length > 0 && allowed.includes(userId!)
      }) as PromoCode[]
  },

  /** Full validation — used by cart AND checkout */
  async validatePromoCode(
    code:     string,
    subtotal: number,
    userId:   string,
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

      const p   = promo as unknown as PromoCode
      const now = new Date()

      // 2. Date window
      if (p.valid_until && new Date(p.valid_until) < now)
        return { valid: false, discount: 0, message: 'This promo code has expired', isFreeDelivery: false }
      if (p.valid_from && new Date(p.valid_from) > now)
        return { valid: false, discount: 0, message: 'This promo code is not active yet', isFreeDelivery: false }

      // 3. Day-of-week window
      if (!isDayAllowed(p.valid_days as string | null))
        return { valid: false, discount: 0, message: 'This offer is not valid today', isFreeDelivery: false }

      // 4. Time window
      if (!isNowInWindow(p.start_time, p.end_time))
        return { valid: false, discount: 0, message: 'This offer is not valid at this time', isFreeDelivery: false }

      // 5. Min order
      const minOrder = num(p.min_order_amount, 0)
      if (minOrder > 0 && subtotal < minOrder)
        return { valid: false, discount: 0, message: `Minimum order ₹${minOrder} required`, isFreeDelivery: false }

      // 6. Merchant scope
      if (p.scope === 'merchant' && opts?.merchantId && p.merchant_id !== opts.merchantId)
        return { valid: false, discount: 0, message: 'This code is not valid for this restaurant', isFreeDelivery: false }

      // 7. Secret promo — verify user is in allowed list
      if (p.is_secret) {
        const allowed = (p.secret_allowed_users ?? []) as string[]
        if (allowed.length > 0 && !allowed.includes(userId))
          return { valid: false, discount: 0, message: 'This is a private offer not available to you', isFreeDelivery: false }
      }

      // 8. Global usage limit
      const usageLimit = num(p.usage_limit, 0)
      const usedCount  = num(p.used_count,  0)
      if (usageLimit > 0 && usedCount >= usageLimit)
        return { valid: false, discount: 0, message: 'This promo code has reached its usage limit', isFreeDelivery: false }

      // 9. Per-user limit  ← FIXED: column is promo_id, not promo_code_id
      const maxPerUser = num(p.max_uses_per_user, 0)
      if (maxPerUser > 0) {
        const { count } = await supabase
          .from('promo_usage')
          .select('*', { count: 'exact', head: true })
          .eq('promo_id', p.id)      // ← FIXED column name
          .eq('user_id', userId)
        if ((count ?? 0) >= maxPerUser)
          return { valid: false, discount: 0, message: 'You have already used this promo code the maximum number of times', isFreeDelivery: false }
      }

      const cartItems = normaliseCartItems(opts?.cartItems ?? [])

      // ── Deal type routing ────────────────────────────────────────────────
      // A) Free delivery
      if (p.deal_type === 'free_delivery' || p.discount_type === 'free_delivery') {
        return {
          valid:          true,
          discount:       0,
          message:        '🚚 Free delivery applied!',
          promoCode:      p,
          isFreeDelivery: true,
          bxgyGifts:      [],
        }
      }

      // B) BxGy
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

      // C) Item-free
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

      // D) Standard cart discount (percentage / flat)
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

  /**
   * Record promo usage after a successful order.
   * Call this immediately after the order row is inserted in DB.
   * Also atomically increments used_count.
   * FIXED: uses correct column name `promo_id`
   */
  async recordPromoUsage(
    promoId: string,
    userId:  string,
    orderId: string,
    discountApplied: number,
  ): Promise<void> {
    if (!isUuid(promoId) || !isUuid(userId) || !isUuid(orderId)) return

    await Promise.allSettled([
      // 1. Insert usage row
      supabase.from('promo_usage').insert({
        promo_id:         promoId,    // ← FIXED column name
        user_id:          userId,
        order_id:         orderId,
        discount_applied: discountApplied,
      }),
      // 2. Atomically increment used_count
      supabase.rpc('increment_promo_used_count', { promo_id_input: promoId }),
    ])
  },

  /**
   * Auto-apply the best eligible promo for a cart (highest discount wins).
   * Used on cart mount to auto-apply `auto_apply=true` promos.
   */
  async autoApplyBestPromo(
    subtotal:   number,
    userId:     string,
    merchantId: string,
    cartItems:  any[],
  ): Promise<PromoValidationResult | null> {
    const promos = await promoCodeService.getActivePromos(merchantId, userId)
    const autoPromos = promos
      .filter(p => p.auto_apply)
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))

    for (const p of autoPromos) {
      const result = await promoCodeService.validatePromoCode(
        p.code, subtotal, userId,
        { merchantId, cartItems },
      )
      if (result.valid) return result
    }
    return null
  },
}
