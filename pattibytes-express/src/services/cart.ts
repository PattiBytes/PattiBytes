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

  const id = String(raw.id ?? '').trim();
  const merchantid = String(raw.merchantid ?? raw.merchant_id ?? raw.merchantId ?? '').trim();
  if (!id || !merchantid) return null;

  const qty = Number(raw.quantity ?? 0);

  return {
    id,
    merchantid,
    name: String(raw.name ?? '').trim(),
    price: Number(raw.price ?? 0),
    quantity: Number.isFinite(qty) ? Math.max(0, qty) : 0,
    imageurl: raw.imageurl ?? raw.image_url ?? raw.imageUrl ?? undefined,
    isveg: raw.isveg ?? raw.is_veg ?? raw.isVeg ?? undefined,
    category: raw.category ?? undefined,
    discountpercentage: raw.discountpercentage ?? raw.discount_percentage ?? raw.discountPercentage ?? undefined,
  };
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

  // GST should be 0 unless enabled AND has a valid percentage (>0)
  const gstEnabled = Boolean(cart.gstenabled);
  const gstPct = Number(cart.gstpercentage ?? 0);

  if (!gstEnabled || !Number.isFinite(gstPct) || gstPct <= 0) {
    cart.tax = 0;
  } else {
    cart.tax = round2(cart.subtotal * (gstPct / 100));
  }

  cart.total = round2(cart.subtotal + cart.tax);
}

function normalizeCart(raw: any): Cart | null {
  if (!raw) return null;

  // sometimes stored as { cart: {...} }
  const c = raw.cart ?? raw;

  const merchantid = String(c.merchantid ?? c.merchant_id ?? c.merchantId ?? '').trim();
  const merchantname = String(c.merchantname ?? c.merchant_name ?? c.merchantName ?? '').trim();

  const rawItems = Array.isArray(c.items) ? c.items : Array.isArray(c.cartItems) ? c.cartItems : [];
  const items = rawItems.map(normalizeCartItem).filter(Boolean) as CartItem[];

  // Accept both camelCase and snake_case storage variants
  const gstenabled = Boolean(c.gstenabled ?? c.gst_enabled ?? c.gstEnabled ?? false);
  const gstpercentage = Number(c.gstpercentage ?? c.gst_percentage ?? c.gstPercentage ?? 0);

  if (!merchantid || !items.length) return null;

  const cart: Cart = {
    merchantid,
    merchantname: merchantname || 'Restaurant',
    items,
    subtotal: 0,
    gstenabled,
    gstpercentage,
    tax: 0,
    total: 0,
  };

  calculateTotals(cart);
  return cart;
}

class CartService {
  // Canonical key used across the app for cart persistence. [file:302]
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

      // Your app listens to this event to refresh UI. [file:302]
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: null }));
      return;
    }

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
   * Add item. If cart exists and belongs to another merchant, returns false.
   * You can optionally pass merchant GST config if you already have it.
   */
  addItem(
    itemInput: Partial<CartItem> & { id: string },
    merchantName: string,
    merchantMeta?: { gstenabled?: boolean; gstpercentage?: number }
  ): boolean {
    const existing = this.getCart();

    const item = normalizeCartItem(itemInput);
    if (!item) return false;

    if (existing && existing.merchantid !== item.merchantid) return false;

    const cart: Cart =
      existing ??
      ({
        merchantid: item.merchantid,
        merchantname: merchantName || 'Restaurant',
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        gstenabled: Boolean(merchantMeta?.gstenabled),
        gstpercentage: Number(merchantMeta?.gstpercentage ?? 0),
      } as Cart);

    // Keep merchant name updated
    if (merchantName) cart.merchantname = merchantName;

    // Update merchant meta if provided
    if (merchantMeta) {
      cart.gstenabled = Boolean(merchantMeta.gstenabled);
      cart.gstpercentage = Number(merchantMeta.gstpercentage ?? 0);
    }

    const idx = cart.items.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
      const current = Number(cart.items[idx].quantity || 0);
      const addQty = Math.max(1, Number(item.quantity || 1));
      cart.items[idx].quantity = Math.min(99, current + addQty);
    } else {
      cart.items.push({ ...item, quantity: Math.min(99, Math.max(1, Number(item.quantity || 1))) });
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
      cart.items[idx].quantity = Math.min(99, Math.max(1, Number(quantity)));
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
   * Refresh merchant GST config (and merchant name) from DB.
   * Tries camelCase columns first, then snake_case fallback.
   */
  async refreshMerchantMeta(): Promise<void> {
    const cart = this.getCart();
    if (!cart) return;

    // Try: gstenabled/gstpercentage (your app pages currently use these names). [file:302]
    let merchant: any | null = null;

    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('id, businessname, gstenabled, gstpercentage')
        .eq('id', cart.merchantid)
        .single();

      if (!error && data) merchant = data;
    } catch {
      // ignore; fallback below
    }

    // Fallback: gst_enabled/gst_percentage (if your DB uses snake_case)
    if (!merchant) {
      try {
        const { data, error } = await supabase
          .from('merchants')
          .select('id, businessname, gst_enabled, gst_percentage')
          .eq('id', cart.merchantid)
          .single();

        if (!error && data) merchant = data;
      } catch {
        // ignore
      }
    }

    if (!merchant) return;

    cart.merchantname = merchant.businessname ?? cart.merchantname;

    // normalize GST fields from whichever shape we got
    const enabled =
      merchant.gstenabled ?? merchant.gst_enabled ?? merchant.gstEnabled ?? false;

    const pct =
      merchant.gstpercentage ?? merchant.gst_percentage ?? merchant.gstPercentage ?? 0;

    cart.gstenabled = Boolean(enabled);
    cart.gstpercentage = Number(pct ?? 0);

    calculateTotals(cart);
    this.write(cart);
  }

  async validateCart(): Promise<CartValidationResult> {
    const cart = this.getCart();
    if (!cart) return { valid: true };

    try {
      // Ensure GST flags are correct before proceeding
      await this.refreshMerchantMeta();

      const latest = this.getCart();
      if (!latest) return { valid: true };

      const ids = latest.items.map((i) => i.id);
      if (!ids.length) return { valid: true };

      // Try common menu_items schema (snake_case)
      let menuItems: any[] | null = null;

      try {
        const { data, error } = await supabase
          .from('menu_items')
          .select('id, price, is_available, discount_percentage')
          .in('id', ids);

        if (error) throw error;
        menuItems = data ?? [];
      } catch {
        // Fallback schema (camelCase)
        const { data, error } = await supabase
          .from('menu_items')
          .select('id, price, isavailable, discountpercentage')
          .in('id', ids);

        if (error) throw error;
        menuItems = data ?? [];
      }

      const map = new Map((menuItems ?? []).map((m: any) => [String(m.id), m]));

      for (const cartItem of latest.items) {
        const current = map.get(cartItem.id);

        if (!current) return { valid: false, message: `${cartItem.name} is no longer available` };

        const available =
          current.is_available ?? current.isavailable ?? current.isAvailable ?? true;

        if (!available) return { valid: false, message: `${cartItem.name} is currently unavailable` };

        // price check (tolerance for numeric types)
        const dbPrice = Number(current.price ?? 0);
        const cartPrice = Number(cartItem.price ?? 0);
        if (Math.abs(dbPrice - cartPrice) > 0.001) {
          return { valid: false, message: 'Some item prices have changed. Please review your cart.' };
        }

        // discount check (optional but recommended)
        const dbDisc = Number(
          current.discount_percentage ?? current.discountpercentage ?? current.discountPercentage ?? 0
        );
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
