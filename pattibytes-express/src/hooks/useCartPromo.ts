/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  promoCodeService,
  normalizeCartItemsForPromo,
} from '@/services/promoCodes';
import type { PromoCodeRow, CartItemForPromo, BxgyFreeItemId } from '@/services/promoCodes';

// ── Resolved free-item shape (name looked up from cartItems) ─────────────────
export interface BxgyFreeItem {
  name          : string;
  originalPrice : number;
  qty           : number;
}

export interface CartPromoState {
  promoCode   : PromoCodeRow | null;
  discount    : number;
  message     : string;
  isBxgy      : boolean;
  manualCode  : string;
  loading     : boolean;
  applied     : boolean;
  freeItemIds : BxgyFreeItemId[];  // raw IDs + prices from service
}

const BLANK: CartPromoState = {
  promoCode   : null,
  discount    : 0,
  message     : '',
  isBxgy      : false,
  manualCode  : '',
  loading     : false,
  applied     : false,
  freeItemIds : [],
};

export function useCartPromo(params: {
  merchantId  : string;
  userId      : string;
  orderAmount : number;
  cartItems   : any[];   // accepts raw CartContext items — normalised internally
}) {
  const [state, setState] = useState<CartPromoState>(BLANK);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const normalizedItems: CartItemForPromo[] = normalizeCartItemsForPromo(params.cartItems);

  // ── Auto-apply: runs on mount + whenever cart/amount changes ──────────────
  useEffect(() => {
    const { merchantId, userId, orderAmount } = params;
    if (!merchantId || !userId || orderAmount <= 0) return;

    // Don't override a manually applied code
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
            promoCode   : best.promoCode,
            discount    : best.discount,
            message     : best.message,
            isBxgy      : best.promoCode?.deal_type === 'bxgy',
            applied     : true,
            loading     : false,
            freeItemIds : best.freeItemIds ?? [],
          }));
        } else {
          // No auto offer — clear only if this was auto-applied (not manual)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params.merchantId,
    params.userId,
    params.orderAmount,
    params.cartItems.length,
    state.manualCode,
  ]);

  // ── Manual code apply ─────────────────────────────────────────────────────
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
        promoCode   : result.promoCode ?? null,
        discount    : result.discount,
        message     : result.message,
        isBxgy      : false,
        applied     : result.valid,
        loading     : false,
        freeItemIds : [],   // manual cart-discount codes never have free items
      }));

      return { valid: result.valid, discount: result.discount, message: result.message };
    } catch (e: any) {
      const msg = e?.message ?? 'Error validating code';
      setState((s) => ({ ...s, loading: false, message: msg, applied: false }));
      return { valid: false, discount: 0, message: msg };
    }
  }, [params.merchantId, params.userId, params.orderAmount, params.cartItems]);

  // ── Remove promo ──────────────────────────────────────────────────────────
  const removePromo = useCallback(() => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    setState({ ...BLANK });
  }, []);

  // ── Update manual code field ──────────────────────────────────────────────
  const setManualCode = useCallback((v: string) => {
    setState((s) => ({ ...s, manualCode: v.toUpperCase().replace(/\s/g, '') }));
  }, []);

  // ── Record usage — call AFTER order is successfully placed ────────────────
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

  // ── Resolve freeItems — maps raw IDs → human-readable names from cartItems ─
  // cartItems is searched by menu_item_id (all casing variants)
  const freeItems = useMemo((): BxgyFreeItem[] => {
    if (!state.isBxgy || state.freeItemIds.length === 0) return [];

    return state.freeItemIds.map((f) => {
      const raw = params.cartItems.find((i) => {
        const id =
          i?.menu_item_id ??
          i?.menuitemid   ??
          i?.menuItemId   ??
          i?.id           ??
          '';
        return String(id) === f.menu_item_id;
      });

      return {
        name         : String(raw?.name ?? 'Item'),
        originalPrice: f.unitPrice,
        qty          : f.qty,
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isBxgy, state.freeItemIds, params.cartItems.length]);

  return {
    // ── State ──────────────────────────────────────────────────────────────
    promoCode   : state.promoCode,
    discount    : state.discount,
    message     : state.message,
    isBxgy      : state.isBxgy,
    manualCode  : state.manualCode,
    loading     : state.loading,
    applied     : state.applied,
    freeItemIds : state.freeItemIds,  // raw — for internal use / serialisation
    freeItems,                        // resolved — pass directly to BillSummary
    // ── Actions ────────────────────────────────────────────────────────────
    applyManualCode,
    removePromo,
    setManualCode,
    recordUsage,
  };
}

