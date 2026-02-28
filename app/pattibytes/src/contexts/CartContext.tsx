import React, { createContext, useContext, useEffect, useReducer } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type CartItem = {
  id: string; name: string; price: number; quantity: number
  image_url?: string | null; discount_percentage?: number | null
  is_veg?: boolean | null; category?: string | null; merchant_id?: string
}
export type Cart = {
  merchantid: string;
  merchantname: any;
  merchant_id: string; merchant_name: string
  items: CartItem[]; subtotal: number
}
type AddPayload = Omit<CartItem, 'quantity'> & { quantity?: number }
type Action =
  | { type: 'ADD';      item: AddPayload; merchantId: string; merchantName: string }
  | { type: 'UPDATEQTY'; itemId: string; qty: number }
  | { type: 'REMOVE';   itemId: string }
  | { type: 'CLEAR' }
  | { type: 'HYDRATE';  cart: Cart | null }

export type CartCtx = {
  items: any;
  cart: Cart | null
  addToCart: (item: AddPayload, merchantId: string, merchantName: string) => void
  updateQuantity: (itemId: string, qty: number) => void
  removeFromCart: (itemId: string) => void
  clearCart: () => void
}

const Ctx = createContext<CartCtx>({
  cart: null,
  addToCart: () => {},
  updateQuantity: () => {},
  removeFromCart: () => {},
  clearCart: () => {},
})

const KEY = 'pbexpress_cart_v2'

function sub(items: CartItem[]) {
  return items.reduce((s, i) => {
    const p = i.discount_percentage ? i.price * (1 - i.discount_percentage / 100) : i.price
    return s + p * i.quantity
  }, 0)
}

function reducer(state: Cart | null, action: Action): Cart | null {
  switch (action.type) {
    case 'HYDRATE': return action.cart
    case 'CLEAR':   return null
    case 'ADD': {
      const { item, merchantId, merchantName } = action
      const qty = Math.max(1, item.quantity ?? 1)
      const base: Cart = state?.merchant_id === merchantId
        ? state
        : { merchant_id: merchantId, merchant_name: merchantName, items: [], subtotal: 0 }
      const existing = base.items.find(i => i.id === item.id)
      const items = existing
        ? base.items.map(i => i.id === item.id ? { ...i, quantity: Math.min(10, i.quantity + qty) } : i)
        : [...base.items, { ...item, quantity: qty }]
      return { ...base, items, subtotal: sub(items) }
    }
    case 'UPDATEQTY': {
      if (!state) return null
      if (action.qty <= 0) {
        const items = state.items.filter(i => i.id !== action.itemId)
        return items.length ? { ...state, items, subtotal: sub(items) } : null
      }
      const items = state.items.map(i => i.id === action.itemId ? { ...i, quantity: Math.min(10, action.qty) } : i)
      return { ...state, items, subtotal: sub(items) }
    }
    case 'REMOVE': {
      if (!state) return null
      const items = state.items.filter(i => i.id !== action.itemId)
      return items.length ? { ...state, items, subtotal: sub(items) } : null
    }
    default: return state
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, dispatch] = useReducer(reducer, null)

  // Hydrate from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(KEY).then(raw => {
      if (raw) { try { dispatch({ type: 'HYDRATE', cart: JSON.parse(raw) }) } catch {} }
    })
  }, [])

  // Persist whenever cart changes
  useEffect(() => {
    if (cart) { AsyncStorage.setItem(KEY, JSON.stringify(cart)).catch(() => {}) }
    else       { AsyncStorage.removeItem(KEY).catch(() => {}) }
  }, [cart])

  const value: CartCtx = {
    cart,
    addToCart:      (item, merchantId, merchantName) => dispatch({ type: 'ADD', item, merchantId, merchantName }),
    updateQuantity: (itemId, qty)                    => dispatch({ type: 'UPDATEQTY', itemId, qty }),
    removeFromCart: (itemId)                         => dispatch({ type: 'REMOVE', itemId }),
    clearCart:      ()                               => dispatch({ type: 'CLEAR' }),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCart() { return useContext(Ctx) }
