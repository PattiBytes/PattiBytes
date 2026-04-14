/**
 * useCheckout.ts — drop-in replacement for your existing checkout hook.
 *
 * Key fixes vs the original:
 * 1. promo_id column written to orders row (was missing)
 * 2. promoCodeService.recordPromoUsage() called after successful insert
 * 3. BxGy gifts included in items[] with is_free:true flag
 * 4. merchant_ids[] populated (future multi-merchant prep)
 * 5. discount column written correctly
 */
import { useState, useCallback } from 'react'
import { Alert } from 'react-native'
import { supabase } from '../lib/supabase'
import { promoCodeService, BxGyGift, PromoCode } from '../services/promoCodes'
import type { Cart, CartItem } from '../contexts/CartContext'

export interface CheckoutInput {
  cart:                Cart
  userId:              string
  customerPhone?:      string
  deliveryAddress:     string
  deliveryAddressId?:  string | null
  deliveryAddressLabel?: string | null
  deliveryLat?:        number | null
  deliveryLng?:        number | null
  recipientName?:      string | null
  deliveryInstructions?: string | null
  paymentMethod:       'cod' | 'upi' | 'card' | 'wallet'
  orderNotes?:         string
  promoCode?:          string | null
  appliedPromo?:       PromoCode | null
  promoDiscount:       number
  isFreeDelivery:      boolean
  bxgyGifts:           BxGyGift[]
  deliveryFee:         number
  taxAmount:           number
  finalTotal:          number
  itemNotes?:          Record<string, string>
  // From app_settings
  gstPct?:             number
  preparationTime?:    number
}

export interface CheckoutResult {
  success:     boolean
  orderId?:    string
  orderNumber?: number
  error?:      string
}

/**
 * Build the items JSON array that goes into orders.items
 * Includes BxGy free gifts as separate line items with appliedDiscount=100.
 */
function buildOrderItems(
  cartItems:   CartItem[],
  bxgyGifts:   BxGyGift[],
  itemNotes:   Record<string, string>,
  merchantId:  string,
): object[] {
  const regular: object[] = cartItems.map(it => {
    const discPct = it.discount_percentage ?? 0
    const price   = discPct > 0 ? it.price * (1 - discPct / 100) : it.price
    return {
      id:                  it.id,
      menu_item_id:        it.id,
      name:                it.name,
      price,
      original_price:      it.price,
      is_veg:              it.is_veg ?? true,
      category:            it.category ?? null,
      quantity:            it.quantity,
      image_url:           it.image_url ?? null,
      merchant_id:         merchantId,
      category_id:         it.category_id ?? null,
      appliedDiscount:     discPct,
      discount_percentage: discPct,
      is_custom_product:   false,
      note:                itemNotes[it.id] ?? null,
      is_free:             false,
    }
  })

  const giftLines: object[] = bxgyGifts.map(g => ({
    id:                  g.menuItemId,
    menu_item_id:        g.menuItemId,
    name:                g.name,
    price:               0,              // billed at zero — already deducted as discount
    original_price:      g.price,
    is_veg:              true,
    category:            'Free Gift',
    quantity:            g.qty,
    image_url:           null,
    merchant_id:         merchantId,
    category_id:         null,
    appliedDiscount:     100,
    discount_percentage: 100,
    is_custom_product:   false,
    note:                null,
    is_free:             true,           // ← flag used by merchant + driver apps
    promo_code:          g.promoCode,
  }))

  return [...regular, ...giftLines]
}

export function useCheckout() {
  const [loading, setLoading] = useState(false)

  const placeOrder = useCallback(async (input: CheckoutInput): Promise<CheckoutResult> => {
    const {
      cart, userId, customerPhone,
      deliveryAddress, deliveryAddressId, deliveryAddressLabel,
      deliveryLat, deliveryLng, recipientName, deliveryInstructions,
      paymentMethod, orderNotes,
      promoCode, appliedPromo, promoDiscount, isFreeDelivery, bxgyGifts,
      deliveryFee, taxAmount, finalTotal,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      itemNotes = {}, gstPct = 5, preparationTime = 30,
    } = input

    if (!cart || !cart.items.length) {
      return { success: false, error: 'Cart is empty' }
    }

    setLoading(true)

    try {
      const merchantId = cart.merchant_id
      const subtotal   = cart.subtotal

      // Build items JSON
      const items = buildOrderItems(cart.items, bxgyGifts, itemNotes, merchantId)

      // Subtotal including item-level discounts (cart already applies them)
      const itemDiscountTotal = cart.items.reduce((s, it) => {
        const d = it.discount_percentage ?? 0
        return s + (d > 0 ? it.price * (d / 100) * it.quantity : 0)
      }, 0)

      const totalDiscount = itemDiscountTotal + promoDiscount

      const orderPayload: Record<string, any> = {
        customer_id:           userId,
        merchant_id:           merchantId,
        // Future multi-merchant: populate merchant_ids when multi-cart ships
        merchant_ids:          [merchantId],
        status:                'pending',
        order_type:            'restaurant',
        payment_method:        paymentMethod,
        payment_status:        'pending',
        subtotal:              parseFloat(subtotal.toFixed(2)),
        delivery_fee:          isFreeDelivery ? 0 : parseFloat(deliveryFee.toFixed(2)),
        tax:                   parseFloat(taxAmount.toFixed(2)),
        discount:              parseFloat(totalDiscount.toFixed(2)),
        total_amount:          parseFloat(finalTotal.toFixed(2)),
        items,
        delivery_address:      deliveryAddress,
        delivery_address_id:   deliveryAddressId   ?? null,
        delivery_address_label: deliveryAddressLabel ?? null,
        delivery_latitude:     deliveryLat          ?? null,
        delivery_longitude:    deliveryLng          ?? null,
        recipient_name:        recipientName        ?? null,
        delivery_instructions: deliveryInstructions ?? null,
        customer_phone:        customerPhone        ?? null,
        customer_notes:        orderNotes           ?? null,
        special_instructions:  orderNotes           ?? null,
        preparation_time:      preparationTime,
        // ── PROMO FIELDS ──────────────────────────────────────────────────
        promo_code: promoCode ?? null,
        // FIXED: write promo_id FK (was always null before)
        promo_id:   appliedPromo?.id ?? null,
      }

      const { data: order, error: insertErr } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select('id, order_number')
        .single()

      if (insertErr || !order) {
        throw new Error(insertErr?.message ?? 'Failed to create order')
      }

      // ── FIXED: Record promo usage AFTER successful order insert ────────
      if (appliedPromo?.id && userId && promoDiscount >= 0) {
        await promoCodeService.recordPromoUsage(
          appliedPromo.id,
          userId,
          order.id,
          promoDiscount,
        )
      }

      return {
        success:     true,
        orderId:     order.id,
        orderNumber: order.order_number,
      }

    } catch (e: any) {
      console.error('[useCheckout.placeOrder]', e)
      Alert.alert('Order Failed', e?.message ?? 'Something went wrong. Please try again.')
      return { success: false, error: e?.message ?? 'Unknown error' }
    } finally {
      setLoading(false)
    }
  }, [])

  return { placeOrder, loading }
}
