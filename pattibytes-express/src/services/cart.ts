import { MenuItem } from '@/types';

export interface CartItem extends MenuItem {
  quantity: number;
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
  },

  addItem(item: MenuItem) {
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

  removeItem(itemId: string) {
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

  updateQuantity(itemId: string, quantity: number) {
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
  },

  getTotal(): number {
    const cart = this.getCart();
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },

  getCount(): number {
    const cart = this.getCart();
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  },
};
