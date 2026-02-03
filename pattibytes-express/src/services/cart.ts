/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';

export interface CartItem {
  id: string;
  merchantid: string;
  name: string;
  price: number;
  quantity: number;
  imageurl?: string;
  isveg?: boolean;
  category?: string;
  discountpercentage?: number;
}

export interface Cart {
  merchantid: string;
  merchantname: string;
  items: CartItem[];
  subtotal: number;

  // GST comes from merchant settings
  gstenabled?: boolean;
  gstpercentage?: number;

  tax: number;
  total: number;
}

type CartValidationResult = { valid: boolean; message?: string };

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

function safeParse<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function normalizeCartItem(raw: any): CartItem | null {
  if (!raw) return null;

  const id = String(raw.id ?? '');
  const merchantid = String(raw.merchantid ?? raw.merchant_id ?? raw.merchantId ?? '');

  if (!id || !merchantid) return null;

  return {
    id,
    merchantid,
    name: String(raw.name ?? ''),
    price: Number(raw.price ?? 0),
    quantity: Math.max(0, Number(raw.quantity ?? 0)),
    imageurl: raw.imageurl ?? raw.image_url ?? raw.imageUrl ?? undefined,
    isveg: raw.isveg ?? raw.is_veg ?? raw.isVeg ?? undefined,
    category: raw.category ?? undefined,
    discountpercentage:
      raw.discountpercentage ?? raw.discount_percentage ?? raw.discountPercentage ?? undefined,
  };
}

function normalizeCart(raw: any): Cart | null {
  if (!raw) return null;

  // sometimes stored as { cart: {...} }
  const c = raw.cart ?? raw;

  const merchantid = String(c.merchantid ?? c.merchant_id ?? c.merchantId ?? '');
  const merchantname = String(c.merchantname ?? c.merchant_name ?? c.merchantName ?? '');

  const rawItems = Array.isArray(c.items) ? c.items : Array.isArray(c.cartItems) ? c.cartItems : [];
  const items = rawItems.map(normalizeCartItem).filter(Boolean) as CartItem[];

  const gstenabled = Boolean(c.gstenabled ?? c.gst_enabled ?? c.gstEnabled ?? false);
  const gstpercentage = Number(c.gstpercentage ?? c.gst_percentage ?? c.gstPercentage ?? 0);

  const cart: Cart = {
    merchantid,
    merchantname,
    items,
    subtotal: 0,
    gstenabled,
    gstpercentage,
    tax: 0,
    total: 0,
  };

  // Prefer recomputing totals from items (more reliable than stored numbers)
  calculateTotals(cart);
  return cart;
}

function calculateTotals(cart: Cart): void {
  let subtotal = 0;

  for (const item of cart.items) {
    const price = Number(item.price || 0);
    const qty = Number(item.quantity || 0);
    const disc = Number(item.discountpercentage ?? 0);

    const effective = disc > 0 ? price * (1 - disc / 100) : price;
    subtotal += effective * qty;
  }

  cart.subtotal = round2(subtotal);

  const gstEnabled = Boolean(cart.gstenabled);
  const gstPct = Number(cart.gstpercentage ?? 0);

  if (!gstEnabled || !Number.isFinite(gstPct) || gstPct <= 0) {
    cart.tax = 0;
  } else {
    cart.tax = round2(cart.subtotal * (gstPct / 100));
  }

  cart.total = round2(cart.subtotal + cart.tax);
}

class CartService {
  // Use the same key your checkout/cart pages are already clearing/using
  private readonly CART_KEY = 'pattibytescart';

  // Read old keys too (migration)
  private readonly LEGACY_KEYS = ['pattibytes_cart', 'pattibytesCart', 'pattiBytesCart', 'cart'];

  private readRaw(): any | null {
    if (typeof window === 'undefined') return null;

    const primary = safeParse<any>(localStorage.getItem(this.CART_KEY));
    if (primary) return primary;

    for (const k of this.LEGACY_KEYS) {
      const v = safeParse<any>(localStorage.getItem(k));
      if (v) return v;
    }

    return null;
  }

  private write(cart: Cart | null): void {
    if (typeof window === 'undefined') return;

    if (!cart) {
      localStorage.removeItem(this.CART_KEY);
      for (const k of this.LEGACY_KEYS) localStorage.removeItem(k);
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: null }));
      return;
    }

    // always store normalized + recalculated
    calculateTotals(cart);

    localStorage.setItem(this.CART_KEY, JSON.stringify(cart));
    for (const k of this.LEGACY_KEYS) localStorage.removeItem(k);

    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }));
  }

  getCart(): Cart | null {
    const raw = this.readRaw();
    const cart = normalizeCart(raw);

    if (!cart || !cart.items.length) return null;

    // migrate into canonical key/schema
    this.write(cart);
    return cart;
  }

  saveCart(cart: Cart): void {
    if (typeof window === 'undefined') return;
    const normalized = normalizeCart(cart);
    this.write(normalized);
  }

  clearCart(): void {
    this.write(null);
  }

  getItemCount(): number {
    const cart = this.getCart();
    if (!cart) return 0;
    return cart.items.reduce((total, item) => total + Number(item.quantity || 0), 0);
  }

  /**
   * Add item. Pass merchant GST config if you have it at add-time.
   */
  addItem(
    itemInput: Partial<CartItem> & { id: string },
    merchantName: string,
    merchantMeta?: { gstenabled?: boolean; gstpercentage?: number }
  ): boolean {
    const existing = this.getCart();

    const item = normalizeCartItem(itemInput);
    if (!item) return false;

    // If cart exists and is from different merchant, reject
    if (existing && existing.merchantid !== item.merchantid) return false;

    const cart: Cart =
      existing ??
      ({
        merchantid: item.merchantid,
        merchantname: merchantName,
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        gstenabled: Boolean(merchantMeta?.gstenabled),
        gstpercentage: Number(merchantMeta?.gstpercentage ?? 0),
      } as Cart);

    // Update merchant meta if provided
    if (merchantMeta) {
      cart.gstenabled = Boolean(merchantMeta.gstenabled);
      cart.gstpercentage = Number(merchantMeta.gstpercentage ?? 0);
    }

    // Keep merchant name updated
    if (merchantName) cart.merchantname = merchantName;

    const idx = cart.items.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
      cart.items[idx].quantity = Math.max(1, Number(cart.items[idx].quantity || 0) + Number(item.quantity || 1));
    } else {
      cart.items.push({ ...item, quantity: Math.max(1, Number(item.quantity || 1)) });
    }

    calculateTotals(cart);
    this.write(cart);
    return true;
  }

  updateItemQuantity(itemId: string, quantity: number): void {
    const cart = this.getCart();
    if (!cart) return;

    const idx = cart.items.findIndex((i) => i.id === itemId);
    if (idx === -1) return;

    if (quantity <= 0) {
      cart.items.splice(idx, 1);
    } else {
      cart.items[idx].quantity = Math.min(99, Math.max(1, quantity));
    }

    if (!cart.items.length) {
      this.clearCart();
      return;
    }

    calculateTotals(cart);
    this.write(cart);
  }

  removeItem(itemId: string): void {
    const cart = this.getCart();
    if (!cart) return;

    cart.items = cart.items.filter((i) => i.id !== itemId);

    if (!cart.items.length) {
      this.clearCart();
      return;
    }

    calculateTotals(cart);
    this.write(cart);
  }

  /**
   * Call this on cart page load to ensure GST is correct (only if enabled by merchant).
   */
  async refreshMerchantMeta(): Promise<void> {
    const cart = this.getCart();
    if (!cart) return;

    const { data: merchant, error } = await supabase
      .from('merchants')
      .select('id, businessname, gstenabled, gstpercentage')
      .eq('id', cart.merchantid)
      .single();

    if (error || !merchant) return;

    cart.merchantname = merchant.businessname ?? cart.merchantname;
    cart.gstenabled = Boolean(merchant.gstenabled);
    cart.gstpercentage = Number(merchant.gstpercentage ?? 0);

    calculateTotals(cart);
    this.write(cart);
  }

  async validateCart(): Promise<CartValidationResult> {
    const cart = this.getCart();
    if (!cart) return { valid: true };

    try {
      // 1) Refresh merchant GST config so tax is never applied if disabled
      await this.refreshMerchantMeta();

      const latest = this.getCart();
      if (!latest) return { valid: true };

      // 2) Validate items against DB
      const ids = latest.items.map((i) => i.id);

      const { data: menuItems, error } = await supabase
        .from('menu_items')
        .select('id, price, is_available, discount_percentage')
        .in('id', ids);

      if (error) throw error;

      const map = new Map((menuItems ?? []).map((m: any) => [String(m.id), m]));

      for (const cartItem of latest.items) {
        const current = map.get(cartItem.id);

        if (!current) {
          return { valid: false, message: `${cartItem.name} is no longer available` };
        }

        if (!current.is_available) {
          return { valid: false, message: `${cartItem.name} is currently unavailable` };
        }

        // Compare prices with tolerance (DB numeric vs JS float)
        const dbPrice = Number(current.price ?? 0);
        const cartPrice = Number(cartItem.price ?? 0);
        if (Math.abs(dbPrice - cartPrice) > 0.001) {
          return { valid: false, message: 'Some item prices have changed. Please review your cart.' };
        }

        // Optional: discount changes should also force review
        const dbDisc = Number(current.discount_percentage ?? 0);
        const cartDisc = Number(cartItem.discountpercentage ?? 0);
        if (Math.abs(dbDisc - cartDisc) > 0.001) {
          return { valid: false, message: 'Some offers have changed. Please review your cart.' };
        }
      }

      return { valid: true };
    } catch (e) {
      console.error('Cart validation error:', e);
      return { valid: false, message: 'Failed to validate cart. Please try again.' };
    }
  }
}

export const cartService = new CartService();
