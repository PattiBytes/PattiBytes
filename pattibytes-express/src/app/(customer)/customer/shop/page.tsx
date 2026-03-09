/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';
import { ShoppingCart, ArrowRight, Search, X } from 'lucide-react';

import AppShell from '@/components/common/AppShell';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/contexts/CartContext';

import {
  type CustomProduct, type CategoryId,
  PRODUCT_CATEGORIES,
} from './_components/types';
import { ShopHeader }  from './_components/ShopHeader';
import { CategoryNav } from './_components/CategoryNav';
import { ProductGrid } from './_components/ProductGrid';

// Virtual merchant for shop products (no real restaurant)
const SHOP_MERCHANT_ID   = 'pattibytes-shop';
const SHOP_MERCHANT_NAME = 'PattiBytes Shop';

export default function ShopPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const initCat      = (searchParams.get('category') || 'all') as CategoryId;

  // ── Use the SAME CartContext as cart/checkout ──────────────────────────────
  const { cart, addToCart, updateQuantity, removeFromCart } = useCart();

  const [products,    setProducts]    = useState<CustomProduct[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [category,    setCategory]    = useState<CategoryId>(initCat);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Fetch products from Supabase ──────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('customproducts')
          .select('id,name,category,price,unit,imageurl,description,isactive,createdat')
          .eq('isactive', true)
          .order('category', { ascending: true })
          .order('name',     { ascending: true });

        if (category !== 'all') {
          query = query.eq('category', category);
        }

        const { data, error } = await query.limit(200);
        if (error) throw error;

        setProducts((data as any[] || []).map(p => ({
          id:          String(p.id),
          name:        String(p.name || ''),
          category:    String(p.category || 'other'),
          price:       Number(p.price || 0),
          unit:        p.unit ?? null,
          imageurl:    p.imageurl ?? null,
          description: p.description ?? null,
          isactive:    Boolean(p.isactive),
          createdat:   String(p.createdat || ''),
        })));
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [category]);

  // ── Category counts (for nav badges) ─────────────────────────────────────
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    products.forEach(p => { c[p.category] = (c[p.category] || 0) + 1; });
    return c;
  }, [products]);

  // ── Filtered by search ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  // ── Cart quantity map — product.id → qty ─────────────────────────────────
  const cartQtyMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (!cart?.items) return map;
    cart.items.forEach(item => {
      // Match by menu_item_id (which we set to product.id on add)
      const key = item.menu_item_id ?? item.id;
      map[key] = item.quantity;
    });
    return map;
  }, [cart?.items]);

  // ── Handlers — delegate to CartContext ────────────────────────────────────
  const handleAdd = useCallback((product: CustomProduct, qty: number) => {
    // Guard: if cart already has items from a REAL restaurant, block mixing
    if (cart?.merchant_id && cart.merchant_id !== SHOP_MERCHANT_ID) {
      toast.error('Your cart has items from a restaurant. Clear cart first to shop here.', {
        position: 'top-center',
      });
      return;
    }

    const cartItem = {
      id:                  product.id,        // cart item id = product id
      menu_item_id:        product.id,        // for qty lookup
      name:                product.name,
      price:               product.price,
      quantity:            qty,
      image_url:           product.imageurl ?? null,
      is_veg:              null,
      category:            product.category,
      category_id:         null,
      discount_percentage: 0,
      merchant_id:         SHOP_MERCHANT_ID,
    };

    const added = addToCart(cartItem, SHOP_MERCHANT_NAME);
    if (!added) {
      toast.error('Could not add to cart. Clear your cart and try again.');
      return;
    }
    toast.success(`${product.name} added to cart!`, {
      position: 'bottom-center',
      autoClose: 1200,
    });
  }, [cart, addToCart]);

  const handleRemove = useCallback((productId: string) => {
    // CartContext removeFromCart uses the cart item's `id` field
    removeFromCart(productId);
  }, [removeFromCart]);

  const handleUpdateQty = useCallback((productId: string, delta: number) => {
    const currentQty = cartQtyMap[productId] ?? 0;
    const newQty     = Math.max(1, Math.min(20, currentQty + delta));
    if (newQty === currentQty) return;
    updateQuantity(productId, newQty);
  }, [cartQtyMap, updateQuantity]);

  // ── Cart totals (from CartContext) ────────────────────────────────────────
  const cartCount = useMemo(() =>
    cart?.items?.reduce((s, i) => s + i.quantity, 0) ?? 0
  , [cart?.items]);

  const cartTotal = useMemo(() =>
    cart?.subtotal ?? 0
  , [cart?.subtotal]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AppShell title="Shop">
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50">
        <ShopHeader cartCount={cartCount} />

        <div className="max-w-5xl mx-auto px-4 py-4 pb-40 space-y-4">

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search products…"
              className="w-full pl-9 pr-9 py-3 bg-white border-2 border-gray-200 rounded-2xl
                         font-bold text-sm focus:ring-2 focus:ring-primary focus:border-primary transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category nav */}
          <CategoryNav
            selected={category}
            counts={counts}
            onSelect={cat => { setCategory(cat); setSearchQuery(''); }}
          />

          {/* Count label */}
          {!loading && (
            <p className="text-xs text-gray-500 font-semibold">
              {filtered.length} {filtered.length === 1 ? 'product' : 'products'}
              {category !== 'all' && ` in ${PRODUCT_CATEGORIES.find(c => c.id === category)?.label}`}
            </p>
          )}

          {/* Cross-cart warning banner */}
          {cart?.merchant_id && cart.merchant_id !== SHOP_MERCHANT_ID && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl px-4 py-3
                            flex items-center gap-3 animate-in fade-in">
              <span className="text-xl">⚠️</span>
              <div className="flex-1 min-w-0">
                <p className="font-black text-amber-800 text-sm">Cart has restaurant items</p>
                <p className="text-xs text-amber-600 font-medium mt-0.5">
                  Clear your cart to add shop products
                </p>
              </div>
              <button
                onClick={() => router.push('/customer/cart')}
                className="text-xs font-black text-amber-700 border border-amber-400
                           px-2 py-1 rounded-lg hover:bg-amber-100 transition flex-shrink-0"
              >
                View cart →
              </button>
            </div>
          )}

          {/* Product Grid */}
          <ProductGrid
            products={filtered}
            cartQtyMap={cartQtyMap}          // ← changed from cart array to map
            loading={loading}
            onAdd={handleAdd}
            onRemove={handleRemove}
            onUpdateQty={handleUpdateQty}
          />
        </div>

        {/* Floating cart bar → goes to /customer/cart (NOT custom-order) */}
        {cartCount > 0 && (
          <div className="fixed bottom-4 left-4 right-4 z-50
                          animate-in slide-in-from-bottom duration-400">
            <button
              onClick={() => router.push('/customer/cart')}
              className="w-full bg-gradient-to-r from-primary to-pink-500 text-white
                         px-5 py-4 rounded-2xl font-black shadow-2xl
                         hover:shadow-3xl hover:scale-[1.02] transition-all
                         flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-white/20 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <span>{cartCount} {cartCount === 1 ? 'item' : 'items'}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>₹{cartTotal.toFixed(0)} · Go to Cart</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
