import { supabase } from '../lib/supabase'

export type PromoCode = {
  id: string; code: string; description: string | null
  discount_type: 'percentage' | 'flat'; discount_value: number
  min_order_amount: number | null; max_discount_amount: number | null
  deal_type: 'standard' | 'bxgy' | 'cartdiscount' | null; deal_json: any
  scope: 'global' | 'merchant'; merchant_id: string | null
  is_active: boolean; valid_from: string | null; valid_until: string | null
  valid_days: number[] | null; valid_time_start: string | null
  valid_time_end: string | null; start_time: string | null
  end_time: string | null; auto_apply: boolean; priority: number
  usage_limit: number | null; max_uses_per_user: number | null
}

export type PromoResult = {
  valid: boolean; discount: number; message: string; promoCode: PromoCode | null
}

export function isPromoActiveNow(p: PromoCode): boolean {

  const now = new Date()
  if (p.valid_from && new Date(p.valid_from) > now) return false
  if (p.valid_until && new Date(p.valid_until) < now) return false
  if (p.valid_days?.length) {
    const jsDay = now.getDay() // 0=Sun
    const mon1 = jsDay === 0 ? 7 : jsDay
    if (!p.valid_days.includes(mon1)) return false
  }
  const start = p.start_time ?? p.valid_time_start
  const end   = p.end_time   ?? p.valid_time_end
  if (start && end) {
    const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
    const cur = now.getHours() * 60 + now.getMinutes()
    const s = toMin(start), e = toMin(end)
    if (s < e ? !(cur >= s && cur <= e) : !(cur >= s || cur <= e)) return false
  }
  return true
}

export async function getActiveMerchantPromos(merchantId: string): Promise<PromoCode[]> {
  const { data } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('is_active', true)
    .eq('scope', 'merchant')
    .eq('merchant_id', merchantId)
    .order('priority', { ascending: false })
    .limit(20)
  return ((data ?? []) as PromoCode[]).filter(isPromoActiveNow)
}

export async function validatePromo(
  code: string, subtotal: number, userId: string, merchantId: string,
  cartItems: { menu_item_id?: string | null; category_id?: string | null; quantity: number; price: number }[]
): Promise<PromoResult> {
  const FAIL = (msg: string): PromoResult => ({ valid: false, discount: 0, message: msg, promoCode: null })
  try {
    const { data: promo } = await supabase
      .from('promo_codes').select('*')
      .eq('code', code.toUpperCase().trim()).eq('is_active', true).maybeSingle()
    if (!promo) return FAIL('Promo code not found or inactive.')
    if (!isPromoActiveNow(promo as PromoCode)) return FAIL('Promo code is not valid right now.')
    if (promo.scope === 'merchant' && promo.merchant_id !== merchantId)
      return FAIL('This promo is not valid for this restaurant.')
    if (promo.min_order_amount && subtotal < promo.min_order_amount)
      return FAIL(`Minimum order ₹${promo.min_order_amount} required.`)

    // Check usage limits
    if (promo.usage_limit) {
      const { count } = await supabase.from('promo_usage')
        .select('*', { count: 'exact', head: true }).eq('promo_code_id', promo.id)
      if ((count ?? 0) >= promo.usage_limit) return FAIL('Promo usage limit reached.')
    }
    if (promo.max_uses_per_user) {
      const { count } = await supabase.from('promo_usage')
        .select('*', { count: 'exact', head: true })
        .eq('promo_code_id', promo.id).eq('user_id', userId)
      if ((count ?? 0) >= promo.max_uses_per_user) return FAIL('You have already used this promo.')
    }

    let discount = 0
    if (promo.discount_type === 'percentage') {
      discount = subtotal * promo.discount_value / 100
      if (promo.max_discount_amount) discount = Math.min(discount, promo.max_discount_amount)
    } else {
      discount = promo.discount_value
    }
    discount = Math.round(Math.min(discount, subtotal) * 100) / 100
    return { valid: true, discount, message: `✅ Saved ₹${discount.toFixed(2)}!`, promoCode: promo as PromoCode }
  } catch (e: any) {
    return FAIL(e?.message ?? 'Failed to validate promo.')
  }
}
