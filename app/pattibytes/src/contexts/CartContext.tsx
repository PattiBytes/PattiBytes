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
  menu_item_id?:        string
}

export type Cart = {
  merchant_id:   string
  merchant_name: string
  items:         CartItem[]
  subtotal:      number
  // legacy aliases
  merchantid:    string
  merchantname:  any
}

export type MultiCart = {
  mode:              'single_merchant' | 'multi_merchant'
  carts:             Record<string, Cart>   // merchantId → Cart
  activeMerchantId:  string | null
}

type AddPayload = Omit<CartItem, 'quantity'> & { quantity?: number }

type Action =
  | { type: 'ADD';            item: AddPayload; merchantId: string; merchantName: string }
  | { type: 'UPDATEQTY';      itemId: string; qty: number; merchantId?: string }
  | { type: 'REMOVE';         itemId: string; merchantId?: string }
  | { type: 'CLEAR' }
  | { type: 'CLEAR_MERCHANT'; merchantId: string }
  | { type: 'HYDRATE';        state: MultiCart | null }
  | { type: 'SET_MODE';       mode: 'single_merchant' | 'multi_merchant' }

export type CartCtx = {
  // Single-merchant back-compat
  cart:              Cart | null
  multiCart:         MultiCart
  // Cart ops
  addToCart:         (item: AddPayload, merchantId: string, merchantName: string) => void
  updateQuantity:    (itemId: string, qty: number, merchantId?: string) => void
  removeFromCart:    (itemId: string, merchantId?: string) => void
  clearCart:         () => void
  clearMerchantCart: (merchantId: string) => void
  setMode:           (mode: 'single_merchant' | 'multi_merchant') => void
  // Derived
  totalItemCount:    number
  merchantCount:     number
  allCarts:          Cart[]
  // Back-compat: items from first/active cart
  items:             CartItem[]
  // Per-merchant totals (for multi-billing summary)
  getMerchantSubtotal: (merchantId: string) => number
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

const EMPTY_MULTI: MultiCart = { mode: 'multi_merchant', carts: {}, activeMerchantId: null }

// ─── Reducer ──────────────────────────────────────────────────────────────────
function reducer(state: MultiCart, action: Action): MultiCart {
  switch (action.type) {
    case 'HYDRATE':
      return action.state ?? EMPTY_MULTI

    case 'SET_MODE':
      return { ...state, mode: action.mode }

    case 'CLEAR':
  return { ...state, carts: {}, activeMerchantId: null }

    case 'CLEAR_MERCHANT': {
      const { [action.merchantId]: _, ...rest } = state.carts
      const activeMerchantId =
        state.activeMerchantId === action.merchantId
          ? Object.keys(rest)[0] ?? null
          : state.activeMerchantId
      return { ...state, carts: rest, activeMerchantId }
    }

    case 'ADD': {
      const { item, merchantId, merchantName } = action
      const qty = Math.max(1, item.quantity ?? 1)

      if (state.mode === 'single_merchant') {
        // In single mode: caller already handled conflict alert
        const existing   = state.carts[merchantId]
        const prevItems  = existing?.items ?? []
        const itemInCart = prevItems.find(i => i.id === item.id)
        const newItems   = itemInCart
          ? prevItems.map(i => i.id === item.id ? { ...i, quantity: i.quantity + qty } : i)
          : [...prevItems, { ...item, quantity: qty }]
        return {
          ...state,
          activeMerchantId: merchantId,
          carts: { [merchantId]: buildCart(merchantId, merchantName, newItems) },
        }
      } else {
        // Multi-merchant: add freely to any merchant cart
        const existing   = state.carts[merchantId]
        const prevItems  = existing?.items ?? []
        const itemInCart = prevItems.find(i => i.id === item.id)
        const newItems   = itemInCart
          ? prevItems.map(i => i.id === item.id ? { ...i, quantity: i.quantity + qty } : i)
          : [...prevItems, { ...item, quantity: qty }]
        return {
          ...state,
          activeMerchantId: state.activeMerchantId ?? merchantId,
          carts: {
            ...state.carts,
            [merchantId]: buildCart(merchantId, merchantName, newItems),
          },
        }
      }
    }

    case 'UPDATEQTY': {
      const targetId = action.merchantId ?? state.activeMerchantId
      if (!targetId || !state.carts[targetId]) return state
      const cart = state.carts[targetId]
      if (action.qty <= 0) {
        const items = cart.items.filter(i => i.id !== action.itemId)
        if (!items.length) {
          const { [targetId]: _, ...rest } = state.carts
          const nextActive = Object.keys(rest)[0] ?? null
          return { ...state, carts: rest, activeMerchantId: nextActive }
        }
        return { ...state, carts: { ...state.carts, [targetId]: buildCart(targetId, cart.merchant_name, items) } }
      }
      const items = cart.items.map(i => i.id === action.itemId ? { ...i, quantity: action.qty } : i)
      return { ...state, carts: { ...state.carts, [targetId]: buildCart(targetId, cart.merchant_name, items) } }
    }

    case 'REMOVE': {
      const targetId = action.merchantId ?? state.activeMerchantId
      if (!targetId || !state.carts[targetId]) return state
      const cart  = state.carts[targetId]
      const items = cart.items.filter(i => i.id !== action.itemId)
      if (!items.length) {
        const { [targetId]: _, ...rest } = state.carts
        const nextActive = Object.keys(rest)[0] ?? null
        return { ...state, carts: rest, activeMerchantId: nextActive }
      }
      return { ...state, carts: { ...state.carts, [targetId]: buildCart(targetId, cart.merchant_name, items) } }
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
  clearCart: () => {}, clearMerchantCart: () => {}, setMode: () => {},
  totalItemCount: 0, merchantCount: 0, allCarts: [], items: [],
  getMerchantSubtotal: () => 0,
}

const Ctx = createContext<CartCtx>(defaultCtx)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [multiCart, dispatch] = useReducer(reducer, EMPTY_MULTI)

  // Hydrate from storage (supports old v2 single-cart format)
  useEffect(() => {
    AsyncStorage.getItem(KEY).then(raw => {
      if (!raw) {
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

  // Persist
  useEffect(() => {
    const hasItems = Object.keys(multiCart.carts).length > 0
    if (hasItems) AsyncStorage.setItem(KEY, JSON.stringify(multiCart)).catch(() => {})
    else          AsyncStorage.removeItem(KEY).catch(() => {})
  }, [multiCart])

  // ── Derived ──────────────────────────────────────────────────────────────
  const allCarts = Object.values(multiCart.carts)

  const activeCart = multiCart.activeMerchantId
    ? multiCart.carts[multiCart.activeMerchantId] ?? null
    : allCarts[0] ?? null

  const totalItemCount = allCarts.reduce(
    (s, c) => s + c.items.reduce((n, i) => n + i.quantity, 0), 0
  )

  const merchantCount = allCarts.length

  const getMerchantSubtotal = useCallback((merchantId: string) => {
    return multiCart.carts[merchantId]?.subtotal ?? 0
  }, [multiCart.carts])

  // ── addToCart — conflict alert only in single_merchant mode ──────────────
  const addToCart = useCallback((
    item:         AddPayload,
    merchantId:   string,
    merchantName: string,
  ) => {
    const active     = multiCart.activeMerchantId
    const hasOtherCart =
      multiCart.mode === 'single_merchant' &&
      active &&
      active !== merchantId &&
      Object.keys(multiCart.carts).length > 0

    if (hasOtherCart) {
      Alert.alert(
        'Add from another restaurant?',
        `You have items from "${Object.values(multiCart.carts)[0]?.merchant_name}". Clear that cart and start fresh, or switch to multi-restaurant mode to order from both at once.`,
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
          {
            text: '🛒 Add to Multi-Cart',
            onPress: () => {
              dispatch({ type: 'SET_MODE', mode: 'multi_merchant' })
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
    updateQuantity:    (itemId, qty, merchantId) =>
      dispatch({ type: 'UPDATEQTY', itemId, qty, merchantId }),
    removeFromCart:    (itemId, merchantId) =>
      dispatch({ type: 'REMOVE', itemId, merchantId }),
    clearCart:         () => dispatch({ type: 'CLEAR' }),
    clearMerchantCart: (merchantId) => dispatch({ type: 'CLEAR_MERCHANT', merchantId }),
    setMode:           (mode) => dispatch({ type: 'SET_MODE', mode }),
    totalItemCount,
    merchantCount,
    allCarts,
    items:             activeCart?.items ?? [],
    getMerchantSubtotal,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCart() { return useContext(Ctx) }