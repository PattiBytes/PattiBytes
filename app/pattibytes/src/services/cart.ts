import { storage } from '../lib/storage'

export type CartItem = {
  id: string
  menu_item_id?: string
  name: string
  price: number
  quantity: number
  image_url?: string | null
  category?: string | null
  category_id?: string | null
  is_veg?: boolean | null
  discount_percentage?: number | null
}

export type Cart = {
  merchant_id: string
  merchant_name: string
  items: CartItem[]
  subtotal: number
}

const CART_KEY = 'pb_cart'

function calcSubtotal(items: CartItem[]): number {
  return items.reduce((sum, it) => {
    const disc = it.discount_percentage ? it.price * (1 - it.discount_percentage / 100) : it.price
    return sum + disc * it.quantity
  }, 0)
}

export const cartService = {
  async getCart(): Promise<Cart | null> {
    return storage.get<Cart>(CART_KEY)
  },

  async setCart(cart: Cart) {
    cart.subtotal = calcSubtotal(cart.items)
    await storage.set(CART_KEY, cart)
  },

  async clearCart() {
    await storage.remove(CART_KEY)
  },

  async addItem(item: CartItem, merchantId: string, merchantName: string) {
    let cart = await this.getCart()
    if (cart && cart.merchant_id !== merchantId) {
      throw new Error(`DIFFERENT_MERCHANT:${cart.merchant_name}`)
    }
    if (!cart) {
      cart = { merchant_id: merchantId, merchant_name: merchantName, items: [], subtotal: 0 }
    }
    const existing = cart.items.find((i) => i.id === item.id)
    if (existing) {
      existing.quantity = Math.min(10, existing.quantity + item.quantity)
    } else {
      cart.items.push(item)
    }
    await this.setCart(cart)
    return cart
  },

  async updateQuantity(itemId: string, qty: number) {
    const cart = await this.getCart()
    if (!cart) return
    if (qty < 1) {
      cart.items = cart.items.filter((i) => i.id !== itemId)
    } else {
      const it = cart.items.find((i) => i.id === itemId)
      if (it) it.quantity = Math.min(10, qty)
    }
    if (cart.items.length === 0) {
      await this.clearCart()
    } else {
      await this.setCart(cart)
    }
    return cart
  },

  async removeItem(itemId: string) {
    return this.updateQuantity(itemId, 0)
  },
}
