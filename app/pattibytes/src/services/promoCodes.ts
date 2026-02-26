import { supabase } from '../lib/supabase'

// ✅ EXPORTED — fixes TS2459 in both cart + checkout
export type PromoCode = {
  id: string
  code: string
  description: string | null
  discount_type: 'percentage' | 'flat'
  discount_value: number
  min_order_amount: number | null
  max_discount_amount: number | null
  scope: 'global' | 'merchant'
  merchant_id: string | null
  deal_type: string | null   // 'cart_discount' | 'bxgy'
  deal_json: any
  valid_from: string | null
  valid_until: string | null
  is_active: boolean
  usage_limit: number | null
  used_count: number | null
  auto_apply: boolean
  priority: number
  max_uses_per_user: number | null
}

export const promoCodeService = {

  async getActivePromos(merchantId?: string): Promise<PromoCode[]> {
    const now = new Date().toISOString()

    let q = supabase
      .from('promo_codes')
      .select(
        'id,code,description,discount_type,discount_value,min_order_amount,' +
        'max_discount_amount,scope,merchant_id,deal_type,deal_json,' +
        'valid_from,valid_until,is_active,usage_limit,used_count,' +
        'auto_apply,priority,max_uses_per_user'
      )
      .eq('is_active', true)
      .or(`valid_until.is.null,valid_until.gte.${now}`)
      .order('priority', { ascending: false })

    if (merchantId) {
      q = (q as any).or(
        `scope.eq.global,and(scope.eq.merchant,merchant_id.eq.${merchantId})`
      )
    } else {
      q = (q as any).eq('scope', 'global')
    }

    const { data, error } = await (q as any).limit(50)
    if (error) {
      console.warn('[promoCodes] getActivePromos:', error.message)
      return []
    }
    return (data ?? []) as PromoCode[]
  },

  async validatePromoCode(
    code: string,
    subtotal: number,
    userId: string,
    opts?: { merchantId?: string }
  ): Promise<{ valid: boolean; discount: number; message: string; promoCode?: PromoCode }> {

    const { data: promo, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .eq('is_active', true)
      .maybeSingle()

    if (error || !promo) {
      return { valid: false, discount: 0, message: 'Invalid promo code' }
    }

    const now = new Date()

    // Expiry
    if (promo.valid_until && new Date(promo.valid_until) < now)
      return { valid: false, discount: 0, message: 'This promo code has expired' }

    // Not started yet
    if (promo.valid_from && new Date(promo.valid_from) > now)
      return { valid: false, discount: 0, message: 'This promo code is not active yet' }

    // Min order
    const minOrder = Number(promo.min_order_amount ?? 0)
    if (minOrder > 0 && subtotal < minOrder)
      return { valid: false, discount: 0, message: `Minimum order ₹${minOrder} required` }

    // Merchant scope
    if (promo.scope === 'merchant' && opts?.merchantId && promo.merchant_id !== opts.merchantId)
      return { valid: false, discount: 0, message: 'This code is not valid for this restaurant' }

    // Global usage limit
    const usageLimit = Number(promo.usage_limit ?? 0)
    const usedCount  = Number(promo.used_count  ?? 0)
    if (usageLimit > 0 && usedCount >= usageLimit)
      return { valid: false, discount: 0, message: 'This promo code has reached its usage limit' }

    // Per-user limit
    const maxPerUser = Number(promo.max_uses_per_user ?? 0)
    if (maxPerUser > 0) {
      const { count } = await supabase
        .from('promo_usage')
        .select('*', { count: 'exact', head: true })
        .eq('promo_code_id', promo.id)
        .eq('user_id', userId)
      if ((count ?? 0) >= maxPerUser)
        return { valid: false, discount: 0, message: 'You have already used this promo code' }
    }

    // ── BxGy offer ──────────────────────────────────────────────────────────
    if (promo.deal_type === 'bxgy') {
      return {
        valid: true,
        discount: 0,
        message: `🎁 Buy-Get offer applied!`,
        promoCode: promo as PromoCode,
      }
    }

    // ── Cart discount (percentage / flat) ────────────────────────────────────
    let discount = 0
    if (promo.discount_type === 'percentage') {
      discount = subtotal * (Number(promo.discount_value) / 100)
      const maxDisc = Number(promo.max_discount_amount ?? 0)
      if (maxDisc > 0) discount = Math.min(discount, maxDisc)
    } else {
      discount = Number(promo.discount_value)
    }
    discount = Math.round(discount * 100) / 100

    return {
      valid: true,
      discount,
      message: `🎉 Promo applied! You save ₹${discount.toFixed(2)}`,
      promoCode: promo as PromoCode,
    }
  },

  async recordUsage(
    promoCodeId: string,
    orderId: string,
    userId: string,
    discount: number
  ): Promise<void> {
    // Insert usage record
    await supabase.from('promo_usage').insert({
      promo_code_id: promoCodeId,
      order_id:      orderId,
      user_id:       userId,
      discount:      discount,
      used_at:       new Date().toISOString(),
    })
    // Increment used_count
    await supabase.rpc('increment_promo_used_count', { promo_id: promoCodeId })
      .then(({ error }) => {
        if (error) {
          // Fallback manual increment if RPC doesn't exist
          supabase.from('promo_codes')
            .update({ used_count: (usedCount: number) => usedCount + 1 })
            .eq('id', promoCodeId)
        }
      })
  },
}
