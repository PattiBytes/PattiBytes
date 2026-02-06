/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';

export interface PromoCode {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_discount_amount?: number | null;
  valid_from: string;
  valid_until: string;
  usage_limit?: number | null;
  used_count: number;
  is_active: boolean;
  description?: string | null;
}

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(v: any) {
  return typeof v === 'string' && uuidRegex.test(v);
}

function normalizeCode(v: any) {
  return String(v ?? '').trim().toUpperCase();
}

// PostgrestError sometimes logs as {} in some environments; extract key fields. [web:293]
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

class PromoCodeService {
  async validatePromoCode(
    code: string,
    orderAmount: number,
    userId: string
  ): Promise<{ valid: boolean; discount: number; message: string; promoCode?: PromoCode }> {
    try {
      const promo = normalizeCode(code);
      const amount = Number(orderAmount || 0);

      if (!promo) return { valid: false, discount: 0, message: 'Enter a promo code' };
      if (!Number.isFinite(amount) || amount <= 0)
        return { valid: false, discount: 0, message: 'Cart total is invalid' };

      if (!isUuid(userId)) {
        return { valid: false, discount: 0, message: 'Please sign in to use a promo code' };
      }

      const { data: promoCode, error } = await supabase
        .from('promo_codes')
        .select(
          'id,code,description,discount_type,discount_value,min_order_amount,max_discount_amount,usage_limit,used_count,is_active,valid_from,valid_until'
        )
        .eq('code', promo)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (!promoCode) return { valid: false, discount: 0, message: 'Invalid promo code' };

      const now = new Date();
      const validFrom = new Date(promoCode.valid_from);
      const validUntil = new Date(promoCode.valid_until);

      if (Number.isNaN(validFrom.getTime()) || Number.isNaN(validUntil.getTime())) {
        return { valid: false, discount: 0, message: 'Promo code date config is invalid' };
      }

      if (now < validFrom || now > validUntil) {
        return { valid: false, discount: 0, message: 'Promo code has expired' };
      }

      if (promoCode.usage_limit && promoCode.used_count >= promoCode.usage_limit) {
        return { valid: false, discount: 0, message: 'Promo code usage limit reached' };
      }

      if (amount < Number(promoCode.min_order_amount || 0)) {
        return {
          valid: false,
          discount: 0,
          message: `Minimum order amount ₹${promoCode.min_order_amount} required`,
        };
      }

      // ✅ Correct table name: promo_usage (fixes 404/PGRST205) [web:303]
      // Requires promo_usage.promo_code_id to exist (see SQL above).
      const { data: userUsage, error: usageErr } = await supabase
        .from('promo_usage')
        .select('id')
        .eq('promo_code_id', promoCode.id)
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (usageErr) throw usageErr;
      if (userUsage) {
        return { valid: false, discount: 0, message: 'You have already used this promo code' };
      }

      // Calculate discount
      let discount = 0;
      if (promoCode.discount_type === 'percentage') {
        discount = (amount * Number(promoCode.discount_value || 0)) / 100;
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
        message: `Promo code applied! You saved ₹${finalDiscount.toFixed(2)}`,
        promoCode: promoCode as PromoCode,
      };
    } catch (err: any) {
      const info = formatErr(err);
      console.error('Promo code validation error:', info); // more useful than {} [web:293]
      return { valid: false, discount: 0, message: info?.message || 'Failed to validate promo code' };
    }
  }
    async getActivePromoCodes(): Promise<PromoCode[]> {
    try {
      const nowIso = new Date().toISOString();

      const { data, error } = await supabase
        .from('promo_codes')
        .select(
          'id,code,description,discount_type,discount_value,min_order_amount,max_discount_amount,usage_limit,used_count,is_active,valid_from,valid_until'
        )
        .eq('is_active', true)
        .lte('valid_from', nowIso)
        .gte('valid_until', nowIso)
        .order('valid_until', { ascending: true });

      if (error) throw error;
      return (data ?? []) as PromoCode[];
    } catch (err: any) {
      const info = formatErr(err);
      console.error('getActivePromoCodes error:', info);
      return [];
    }
  }


  // Call this AFTER order is successfully placed
  async markPromoUsed(params: {
    promoCodeId: string;
    userId: string;
    orderId?: string | null;
    discountApplied: number;
  }): Promise<{ ok: boolean; message?: string }> {
    try {
      const { promoCodeId, userId, orderId, discountApplied } = params;

      if (!isUuid(promoCodeId) || !isUuid(userId)) return { ok: false, message: 'Invalid ids' };
      if (orderId && !isUuid(orderId)) return { ok: false, message: 'Invalid order id' };

      const { error } = await supabase.from('promo_usage').insert({
        promo_code_id: promoCodeId,
        user_id: userId,
        order_id: orderId || null,
        discount_applied: Number(discountApplied || 0),
        used_at: new Date().toISOString(),
      });

      if (error) throw error;
      return { ok: true };
    } catch (err: any) {
      const info = formatErr(err);
      console.error('markPromoUsed error:', info);
      return { ok: false, message: info?.message || 'Failed to mark promo used' };
    }
  }
}

export const promoCodeService = new PromoCodeService();
