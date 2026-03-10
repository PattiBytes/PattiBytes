/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  promoCodeService,
  normalizeCartItemsForPromo,
} from '@/services/promoCodes';
import type { PromoCodeRow, CartItemForPromo } from '@/services/promoCodes';

export interface CartPromoState {
  promoCode  : PromoCodeRow | null;
  discount   : number;
  message    : string;
  isBxgy     : boolean;
  manualCode : string;
  loading    : boolean;
  applied    : boolean;
}

const BLANK: CartPromoState = {
  promoCode : null,
  discount  : 0,
  message   : '',
  isBxgy    : false,
  manualCode: '',
  loading   : false,
  applied   : false,
};

export function useCartPromo(params: {
  merchantId  : string;
  userId      : string;
  orderAmount : number;
  cartItems   : any[];        // accepts raw CartContext items — normalised internally
}) {
  const [state, setState] = useState<CartPromoState>(BLANK);
  const autoTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const lastCartLen = useRef(0);

  // ── Derived normalised items ────────────────────────────────────────────
  const normalizedItems: CartItemForPromo[] = normalizeCartItemsForPromo(params.cartItems);

  // ── Auto-apply: runs on mount + whenever cart changes ──────────────────
  useEffect(() => {
    const { merchantId, userId, orderAmount } = params;
    if (!merchantId || !userId || orderAmount <= 0) return;

    // If user already manually applied a code, don't override
    if (state.manualCode && state.applied) return;

    if (autoTimer.current) clearTimeout(autoTimer.current);

    autoTimer.current = setTimeout(async () => {
      setState((s) => ({ ...s, loading: true }));
      try {
        const best = await promoCodeService.getBestAutoOffer({
          merchantId,
          userId,
          orderAmount,
          cartItems: normalizedItems,
        });

        if (best.promoCode && best.discount > 0) {
          setState((s) => ({
            ...s,
            promoCode : best.promoCode,
            discount  : best.discount,
            message   : best.message,
            isBxgy    : best.promoCode?.deal_type === 'bxgy',
            applied   : true,
            loading   : false,
          }));
        } else {
          // No auto offer available — clear only if currently auto-applied
          setState((s) =>
            s.applied && !s.manualCode
              ? { ...BLANK }
              : { ...s, loading: false },
          );
        }
      } catch (e: any) {
        console.error('[useCartPromo] auto-apply error:', e);
        setState((s) => ({ ...s, loading: false }));
      }
    }, 600);

    return () => {
      if (autoTimer.current) clearTimeout(autoTimer.current);
    };
    // Intentionally using cartItems.length + orderAmount as deps to avoid deep compare
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params.merchantId,
    params.userId,
    params.orderAmount,
    params.cartItems.length,
    state.manualCode,
  ]);

  // ── Manual code apply ───────────────────────────────────────────────────
  const applyManualCode = useCallback(async (code: string): Promise<{
    valid: boolean; discount: number; message: string;
  }> => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return { valid: false, discount: 0, message: 'Enter a code first' };

    setState((s) => ({ ...s, loading: true, manualCode: trimmed }));

    try {
      const result = await promoCodeService.validatePromoCode({
        code        : trimmed,
        orderAmount : params.orderAmount,
        userId      : params.userId,
        merchantId  : params.merchantId,
        cartItems   : normalizeCartItemsForPromo(params.cartItems),
      });

      setState((s) => ({
        ...s,
        promoCode : result.promoCode ?? null,
        discount  : result.discount,
        message   : result.message,
        isBxgy    : false,
        applied   : result.valid,
        loading   : false,
      }));

      return { valid: result.valid, discount: result.discount, message: result.message };
    } catch (e: any) {
      const msg = e?.message ?? 'Error validating code';
      setState((s) => ({ ...s, loading: false, message: msg, applied: false }));
      return { valid: false, discount: 0, message: msg };
    }
   
  }, [params.merchantId, params.userId, params.orderAmount, params.cartItems]);

  // ── Remove promo ────────────────────────────────────────────────────────
  const removePromo = useCallback(() => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    setState({ ...BLANK });
  }, []);

  // ── Update manual code field ─────────────────────────────────────────────
  const setManualCode = useCallback((v: string) => {
    setState((s) => ({ ...s, manualCode: v.toUpperCase().replace(/\s/g, '') }));
  }, []);

  // ── Record usage — call AFTER order is successfully placed ───────────────
  const recordUsage = useCallback(async (orderId: string): Promise<void> => {
    if (!state.promoCode || state.discount <= 0 || !orderId) return;
    try {
      await promoCodeService.incrementPromoUsage({
        promoCodeId : state.promoCode.id,
        userId      : params.userId,
        orderId,
        discount    : state.discount,
      });
    } catch (e) {
      console.error('[useCartPromo] recordUsage failed:', e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.promoCode?.id, state.discount, params.userId]);

  return {
    // State
    promoCode  : state.promoCode,
    discount   : state.discount,
    message    : state.message,
    isBxgy     : state.isBxgy,
    manualCode : state.manualCode,
    loading    : state.loading,
    applied    : state.applied,
    // Actions
    applyManualCode,
    removePromo,
    setManualCode,
    recordUsage,
  };
}
