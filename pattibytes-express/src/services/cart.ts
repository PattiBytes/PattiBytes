import { MenuItem } from '@/types';

export interface CartItem {
  id: string;
  merchant_id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image_url?: string;
  is_available: boolean;
  is_veg: boolean;
  quantity: number;
  created_at: string;
  updated_at: string;
}

const CART_KEY = 'pattibytes_cart';

export const cartService = {
  getCart(): CartItem[] {
    if (typeof window === 'undefined') return [];
    const cart = localStorage.getItem(CART_KEY);
    return cart ? JSON.parse(cart) : [];
  },

  saveCart(cart: CartItem[]) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
  },

  addItem(item: MenuItem): CartItem[] {
    const cart = this.getCart();
    const existing = cart.find((i) => i.id === item.id);

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ ...item, quantity: 1 });
    }

    this.saveCart(cart);
    return cart;
  },

  removeItem(itemId: string): CartItem[] {
    const cart = this.getCart();
    const existing = cart.find((i) => i.id === itemId);

    if (existing && existing.quantity > 1) {
      existing.quantity -= 1;
    } else {
      const filtered = cart.filter((i) => i.id !== itemId);
      this.saveCart(filtered);
      return filtered;
    }

    this.saveCart(cart);
    return cart;
  },

  updateQuantity(itemId: string, quantity: number): CartItem[] {
    const cart = this.getCart();
    const item = cart.find((i) => i.id === itemId);

    if (item) {
      item.quantity = Math.max(0, quantity);
    }

    this.saveCart(cart.filter((i) => i.quantity > 0));
    return this.getCart();
  },

  clearCart() {
    localStorage.removeItem(CART_KEY);
    window.dispatchEvent(new Event('cartUpdated'));
  },

  getTotal(): number {
    const cart = this.getCart();
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },

  getCount(): number {
    const cart = this.getCart();
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  },

  getMerchantId(): string | null {
    const cart = this.getCart();
    return cart.length > 0 ? cart[0].merchant_id : null;
  },
};
