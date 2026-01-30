import { supabase } from '@/lib/supabase';

export interface PromoCode {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_discount_amount?: number;
  valid_from: string;
  valid_until: string;
  usage_limit?: number;
  used_count: number;
  is_active: boolean;
  description?: string;
}

class PromoCodeService {
  async validatePromoCode(
    code: string,
    orderAmount: number,
    userId: string
  ): Promise<{ valid: boolean; discount: number; message: string; promoCode?: PromoCode }> {
    try {
      const { data: promoCode, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !promoCode) {
        return {
          valid: false,
          discount: 0,
          message: 'Invalid promo code',
        };
      }

      // Check validity period
      const now = new Date();
      const validFrom = new Date(promoCode.valid_from);
      const validUntil = new Date(promoCode.valid_until);

      if (now < validFrom || now > validUntil) {
        return {
          valid: false,
          discount: 0,
          message: 'Promo code has expired',
        };
      }

      // Check usage limit
      if (promoCode.usage_limit && promoCode.used_count >= promoCode.usage_limit) {
        return {
          valid: false,
          discount: 0,
          message: 'Promo code usage limit reached',
        };
      }

      // Check minimum order amount
      if (orderAmount < promoCode.min_order_amount) {
        return {
          valid: false,
          discount: 0,
          message: `Minimum order amount ₹${promoCode.min_order_amount} required`,
        };
      }

      // Check if user has already used this promo
      const { data: userUsage } = await supabase
        .from('promo_code_usage')
        .select('id')
        .eq('promo_code_id', promoCode.id)
        .eq('user_id', userId)
        .single();

      if (userUsage) {
        return {
          valid: false,
          discount: 0,
          message: 'You have already used this promo code',
        };
      }

      // Calculate discount
      let discount = 0;
      if (promoCode.discount_type === 'percentage') {
        discount = (orderAmount * promoCode.discount_value) / 100;
        if (promoCode.max_discount_amount) {
          discount = Math.min(discount, promoCode.max_discount_amount);
        }
      } else {
        discount = promoCode.discount_value;
      }

      return {
        valid: true,
        discount: Math.round(discount * 100) / 100,
        message: `Promo code applied! You saved ₹${discount.toFixed(2)}`,
        promoCode,
      };
    } catch (error) {
      console.error('Promo code validation error:', error);
      return {
        valid: false,
        discount: 0,
        message: 'Failed to validate promo code',
      };
    }
  }

  async getActivePromoCodes(): Promise<PromoCode[]> {
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch promo codes:', error);
      return [];
    }
  }
}

export const promoCodeService = new PromoCodeService();
