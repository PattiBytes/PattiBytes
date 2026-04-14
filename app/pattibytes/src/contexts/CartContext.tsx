import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Alert } from 'react-native'

// ─── Types ────────────────────────────────────────────────────────────────────
export type CartItem = {
  id:                   string
  name:                 string
  price:                number
  quantity:             number
  image_url?:           string | null
  discount_percentage?: number | null
  is_veg?:              boolean | null
  category?:            string | null
  merchant_id?:         string
  category_id?:         string | null
  // Future multi-merchant: keep the per-item merchant_id so
  // when we ship multi-cart ordering each item is traceable
}

export type Cart = {
  merchant_id:   string
  merchant_name: string
  items:         CartItem[]
  subtotal:      number
  // Canonical aliases (legacy compat)
  merchantid:    string
  merchantname:  any
}

/**
 * FUTURE-PROOF: MultiCart stores one Cart per merchant.
 * Today we only allow one active merchant (single_merchant mode).
 * When multi-merchant ordering ships, switch `mode` to 'multi_merchant'
 * and remove the conflict-detection block in ADD.
 */
export type MultiCart = {
  mode:     'single_merchant' | 'multi_merchant'
  carts:    Record<string, Cart>   // merchantId → Cart
  activeMerchantId: string | null  // single_merchant mode active merchant
}

type AddPayload = Omit<CartItem, 'quantity'> & { quantity?: number }

type Action =
  | { type: 'ADD';             item: AddPayload; merchantId: string; merchantName: string }
  | { type: 'UPDATEQTY';       itemId: string; qty: number }
  | { type: 'REMOVE';          itemId: string }
  | { type: 'CLEAR' }
  | { type: 'CLEAR_MERCHANT';  merchantId: string }
  | { type: 'HYDRATE';         state: MultiCart | null }
  | { type: 'SET_MODE';        mode: 'single_merchant' | 'multi_merchant' }

export type CartCtx = {
  // ── Current active single-merchant cart (back-compat) ──
  cart:              Cart | null
  // ── Multi-cart state (all merchants) ──
  multiCart:         MultiCart
  // ── Cart ops ──
  addToCart:         (item: AddPayload, merchantId: string, merchantName: string) => void
  updateQuantity:    (itemId: string, qty: number) => void
  removeFromCart:    (itemId: string) => void
  clearCart:         () => void
  clearMerchantCart: (merchantId: string) => void
  // ── Total item count across all carts ──
  totalItemCount:    number
  items:             CartItem[]   // items from active cart (back-compat)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcSubtotal(items: CartItem[]): number {
  return items.reduce((s, i) => {
    const p = i.discount_percentage ? i.price * (1 - i.discount_percentage / 100) : i.price
    return s + p * i.quantity
  }, 0)
}

function buildCart(merchantId: string, merchantName: string, items: CartItem[]): Cart {
  return {
    merchant_id:   merchantId,
    merchant_name: merchantName,
    merchantid:    merchantId,
    merchantname:  merchantName,
    items,
    subtotal:      calcSubtotal(items),
  }
}

const EMPTY_MULTI: MultiCart = { mode: 'single_merchant', carts: {}, activeMerchantId: null }

// ─── Reducer ──────────────────────────────────────────────────────────────────
function reducer(state: MultiCart, action: Action): MultiCart {
  switch (action.type) {

    case 'HYDRATE':
      return action.state ?? EMPTY_MULTI

    case 'SET_MODE':
      return { ...state, mode: action.mode }

    case 'CLEAR':
      return EMPTY_MULTI

    case 'CLEAR_MERCHANT': {
      const { [action.merchantId]: _, ...rest } = state.carts
      const activeMerchantId =
        state.activeMerchantId === action.merchantId ? null : state.activeMerchantId
      return { ...state, carts: rest, activeMerchantId }
    }

    case 'ADD': {
      const { item, merchantId, merchantName } = action
      const qty = Math.max(1, item.quantity ?? 1)

      if (state.mode === 'single_merchant') {
        // Single-merchant: replace entire cart when switching restaurant
        // (caller handles the Alert dialog — see addToCart wrapper)
        const existing = state.carts[merchantId]
        const prevItems = existing?.items ?? []
        const itemInCart = prevItems.find(i => i.id === item.id)
        const newItems = itemInCart
          ? prevItems.map(i => i.id === item.id ? { ...i, quantity: i.quantity + qty } : i)
          : [...prevItems, { ...item, quantity: qty }]

        return {
          ...state,
          activeMerchantId: merchantId,
          carts: {
            [merchantId]: buildCart(merchantId, merchantName, newItems),
          },
        }
      } else {
        // Multi-merchant mode (future): add to the specific merchant's cart
        const existing = state.carts[merchantId]
        const prevItems = existing?.items ?? []
        const itemInCart = prevItems.find(i => i.id === item.id)
        const newItems = itemInCart
          ? prevItems.map(i => i.id === item.id ? { ...i, quantity: i.quantity + qty } : i)
          : [...prevItems, { ...item, quantity: qty }]

        return {
          ...state,
          carts: {
            ...state.carts,
            [merchantId]: buildCart(merchantId, merchantName, newItems),
          },
        }
      }
    }

    case 'UPDATEQTY': {
      const activeId = state.activeMerchantId
      if (!activeId || !state.carts[activeId]) return state
      const cart = state.carts[activeId]
      if (action.qty <= 0) {
        const items = cart.items.filter(i => i.id !== action.itemId)
        if (!items.length) {
          const { [activeId]: _, ...rest } = state.carts
          return { ...state, carts: rest, activeMerchantId: null }
        }
        return { ...state, carts: { ...state.carts, [activeId]: buildCart(activeId, cart.merchant_name, items) } }
      }
      const items = cart.items.map(i =>
        i.id === action.itemId ? { ...i, quantity: action.qty } : i,
      )
      return { ...state, carts: { ...state.carts, [activeId]: buildCart(activeId, cart.merchant_name, items) } }
    }

    case 'REMOVE': {
      const activeId = state.activeMerchantId
      if (!activeId || !state.carts[activeId]) return state
      const cart = state.carts[activeId]
      const items = cart.items.filter(i => i.id !== action.itemId)
      if (!items.length) {
        const { [activeId]: _, ...rest } = state.carts
        return { ...state, carts: rest, activeMerchantId: null }
      }
      return { ...state, carts: { ...state.carts, [activeId]: buildCart(activeId, cart.merchant_name, items) } }
    }

    default:
      return state
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
const KEY = 'pbexpress_multicart_v1'

const defaultCtx: CartCtx = {
  cart: null, multiCart: EMPTY_MULTI,
  addToCart: () => {}, updateQuantity: () => {}, removeFromCart: () => {},
  clearCart: () => {}, clearMerchantCart: () => {},
  totalItemCount: 0, items: [],
}

const Ctx = createContext<CartCtx>(defaultCtx)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [multiCart, dispatch] = useReducer(reducer, EMPTY_MULTI)

  // Hydrate from AsyncStorage — supports both old v2 format and new v1 multi format
  useEffect(() => {
    AsyncStorage.getItem(KEY).then(raw => {
      if (!raw) {
        // Try migrating from old format
        AsyncStorage.getItem('pbexpress_cart_v2').then(oldRaw => {
          if (!oldRaw) return
          try {
            const old = JSON.parse(oldRaw)
            if (old?.merchant_id && Array.isArray(old?.items)) {
              const migrated: MultiCart = {
                mode: 'single_merchant',
                activeMerchantId: old.merchant_id,
                carts: {
                  [old.merchant_id]: buildCart(old.merchant_id, old.merchant_name ?? '', old.items),
                },
              }
              dispatch({ type: 'HYDRATE', state: migrated })
            }
          } catch {}
        })
        return
      }
      try { dispatch({ type: 'HYDRATE', state: JSON.parse(raw) }) } catch {}
    })
  }, [])

  // Persist on change
  useEffect(() => {
    const hasItems = Object.keys(multiCart.carts).length > 0
    if (hasItems) AsyncStorage.setItem(KEY, JSON.stringify(multiCart)).catch(() => {})
    else          AsyncStorage.removeItem(KEY).catch(() => {})
  }, [multiCart])

  // ── Derived values ──────────────────────────────────────────────────────
  const activeCart = multiCart.activeMerchantId
    ? multiCart.carts[multiCart.activeMerchantId] ?? null
    : null

  const totalItemCount = Object.values(multiCart.carts)
    .reduce((s, c) => s + c.items.reduce((n, i) => n + i.quantity, 0), 0)

  // ── addToCart — shows alert if switching merchants ──────────────────────
  const addToCart = useCallback((
    item:         AddPayload,
    merchantId:   string,
    merchantName: string,
  ) => {
    const active = multiCart.activeMerchantId

    if (
      multiCart.mode === 'single_merchant' &&
      active &&
      active !== merchantId &&
      Object.keys(multiCart.carts).length > 0
    ) {
      Alert.alert(
        'Start new order?',
        `Your cart has items from ${Object.values(multiCart.carts)[0]?.merchant_name ?? 'another restaurant'}. Adding items from ${merchantName} will clear your current cart.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear & Add',
            style: 'destructive',
            onPress: () => {
              dispatch({ type: 'CLEAR' })
              dispatch({ type: 'ADD', item, merchantId, merchantName })
            },
          },
        ],
      )
    } else {
      dispatch({ type: 'ADD', item, merchantId, merchantName })
    }
  }, [multiCart])

  const value: CartCtx = {
    cart:              activeCart,
    multiCart,
    addToCart,
    updateQuantity:    (itemId, qty) => dispatch({ type: 'UPDATEQTY', itemId, qty }),
    removeFromCart:    (itemId)      => dispatch({ type: 'REMOVE', itemId }),
    clearCart:         ()            => dispatch({ type: 'CLEAR' }),
    clearMerchantCart: (merchantId)  => dispatch({ type: 'CLEAR_MERCHANT', merchantId }),
    totalItemCount,
    items:             activeCart?.items ?? [],
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCart() { return useContext(Ctx) }
