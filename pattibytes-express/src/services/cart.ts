import { supabase } from '@/lib/supabase';

export interface CartItem {
  id: string;
  merchant_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  is_veg?: boolean;
  category?: string;
  discount_percentage?: number;
}

export interface Cart {
  merchant_id: string;
  merchant_name: string;
  items: CartItem[];
  subtotal: number;
  total: number;
}

class CartService {
  private readonly CART_KEY = 'pattibytes_cart';

  getCart(): Cart | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const cartData = localStorage.getItem(this.CART_KEY);
      if (!cartData) return null;
      
      return JSON.parse(cartData);
    } catch (error) {
      console.error('Failed to get cart:', error);
      return null;
    }
  }

  saveCart(cart: Cart): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(this.CART_KEY, JSON.stringify(cart));
      // Dispatch custom event for cart updates
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }));
    } catch (error) {
      console.error('Failed to save cart:', error);
    }
  }

  addItem(item: CartItem, merchantName: string): boolean {
    const cart = this.getCart();

    // If cart exists and is from different merchant, return false
    if (cart && cart.merchant_id !== item.merchant_id) {
      return false;
    }

    const newCart: Cart = cart || {
      merchant_id: item.merchant_id,
      merchant_name: merchantName,
      items: [],
      subtotal: 0,
      total: 0,
    };

    // Check if item exists
    const existingItemIndex = newCart.items.findIndex((i) => i.id === item.id);

    if (existingItemIndex > -1) {
      newCart.items[existingItemIndex].quantity += item.quantity;
    } else {
      newCart.items.push(item);
    }

    this.calculateTotals(newCart);
    this.saveCart(newCart);
    return true;
  }

  updateItemQuantity(itemId: string, quantity: number): void {
    const cart = this.getCart();
    if (!cart) return;

    const itemIndex = cart.items.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) return;

    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }

    if (cart.items.length === 0) {
      this.clearCart();
      return;
    }

    this.calculateTotals(cart);
    this.saveCart(cart);
  }

  removeItem(itemId: string): void {
    const cart = this.getCart();
    if (!cart) return;

    cart.items = cart.items.filter((i) => i.id !== itemId);

    if (cart.items.length === 0) {
      this.clearCart();
      return;
    }

    this.calculateTotals(cart);
    this.saveCart(cart);
  }

  clearCart(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(this.CART_KEY);
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: null }));
  }

  getItemCount(): number {
    const cart = this.getCart();
    if (!cart) return 0;
    
    return cart.items.reduce((total, item) => total + item.quantity, 0);
  }

  private calculateTotals(cart: Cart): void {
    let subtotal = 0;

    cart.items.forEach((item) => {
      const itemPrice = item.discount_percentage
        ? item.price * (1 - item.discount_percentage / 100)
        : item.price;
      subtotal += itemPrice * item.quantity;
    });

    cart.subtotal = subtotal;
    cart.total = subtotal; // Add taxes, delivery fees here if needed
  }

  async validateCart(): Promise<{ valid: boolean; message?: string }> {
    const cart = this.getCart();
    if (!cart) return { valid: true };

    try {
      // Fetch current menu items to verify prices and availability
      const { data: menuItems, error } = await supabase
        .from('menu_items')
        .select('id, price, is_available, discount_percentage')
        .in('id', cart.items.map(i => i.id));

      if (error) throw error;

      const menuItemsMap = new Map(menuItems?.map(item => [item.id, item]) || []);

      for (const cartItem of cart.items) {
        const currentItem = menuItemsMap.get(cartItem.id);

        if (!currentItem) {
          return {
            valid: false,
            message: `${cartItem.name} is no longer available`,
          };
        }

        if (!currentItem.is_available) {
          return {
            valid: false,
            message: `${cartItem.name} is currently unavailable`,
          };
        }

        if (currentItem.price !== cartItem.price) {
          return {
            valid: false,
            message: 'Some item prices have changed. Please review your cart.',
          };
        }
      }

      return { valid: true };
    } catch (error) {
      console.error('Cart validation error:', error);
      return {
        valid: false,
        message: 'Failed to validate cart. Please try again.',
      };
    }
  }
}

export const cartService = new CartService();
