/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';
import { ShoppingCart, ArrowRight, Loader2, Heart, RefreshCw } from 'lucide-react';

import AppShell  from '@/components/common/AppShell';
import { supabase } from '@/lib/supabase';
import { useCart }  from '@/contexts/CartContext';

import { type CustomProduct, type SortOption } from './_components/types';
import { useDynamicCategories } from './_components/useDynamicCategories';
import { ShopHeader }   from './_components/ShopHeader';
import { CategoryNav }  from './_components/CategoryNav';
import { ProductGrid }  from './_components/ProductGrid';

const SHOP_MERCHANT_ID   = 'pattibytes-shop';
const SHOP_MERCHANT_NAME = 'PattiBytes Shop';

function sortProducts(products: CustomProduct[], sort: SortOption): CustomProduct[] {
  const arr = [...products];
  switch (sort) {
    case 'price_asc':  return arr.sort((a, b) => a.price - b.price);
    case 'price_desc': return arr.sort((a, b) => b.price - a.price);
    case 'name_asc':   return arr.sort((a, b) => a.name.localeCompare(b.name));
    case 'newest':     return arr.sort((a, b) =>
      new Date(b.createdat).getTime() - new Date(a.createdat).getTime());
    default:           return arr.sort((a, b) =>
      (a.sort_order ?? 999) - (b.sort_order ?? 999));
  }
}

// ── Inner component ───────────────────────────────────────────────────────────
function ShopPageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const initCat      = searchParams.get('category') || 'all';

  const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
  const { categories, loading: catLoading } = useDynamicCategories();

  const [allProducts, setAllProducts] = useState<CustomProduct[]>([]);
  const [loadingProds,setLoadingProds]= useState(true);
  const [category,    setCategory]    = useState(initCat);
  const [search,      setSearch]      = useState('');
  const [sort,        setSort]        = useState<SortOption>('default');
  const [viewMode,    setViewMode]    = useState<'grid' | 'list'>('grid');
  const [refreshKey,  setRefreshKey]  = useState(0);

  // Load ALL products once, then filter client-side (faster UX)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingProds(true);
      try {
        const { data, error } = await supabase
          .from('customproducts')
          .select('id,name,category,price,unit,imageurl,description,isactive,createdat,stock_qty,sort_order,available_from,available_to')
          .eq('isactive', true)
          .order('sort_order', { ascending: true, nullsFirst: false })
          .order('name', { ascending: true })
          .limit(500);

        if (error) throw error;
        if (cancelled) return;

        setAllProducts(((data as any[]) ?? []).map(p => ({
          id:             String(p.id),
          name:           String(p.name || ''),
          category:       String(p.category || 'other').trim().toLowerCase(),
          price:          Number(p.price || 0),
          unit:           p.unit           ?? null,
          imageurl:       p.imageurl       ?? null,
          description:    p.description   ?? null,
          isactive:       Boolean(p.isactive),
          createdat:      String(p.createdat || ''),
          stock_qty:      p.stock_qty      ?? null,
          sort_order:     p.sort_order     ?? null,
          available_from: p.available_from ?? null,
          available_to:   p.available_to   ?? null,
        })));
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load products');
      } finally {
        if (!cancelled) setLoadingProds(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  // Category → products
  const categoryProducts = useMemo(() =>
    category === 'all'
      ? allProducts
      : allProducts.filter(p => p.category === category),
    [allProducts, category]
  );

  // Search filter
  const searchFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categoryProducts;
    return categoryProducts.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }, [categoryProducts, search]);

  // Sort
  const displayProducts = useMemo(
    () => sortProducts(searchFiltered, sort),
    [searchFiltered, sort]
  );

  // Cart helpers
  const cartQtyMap = useMemo(() => {
    const map: Record<string, number> = {};
    cart?.items?.forEach(item => {
      map[item.menu_item_id ?? item.id] = item.quantity;
    });
    return map;
  }, [cart?.items]);

  const cartCount = useMemo(
    () => cart?.items?.reduce((s, i) => s + i.quantity, 0) ?? 0,
    [cart?.items]
  );
  const cartTotal = useMemo(() => cart?.subtotal ?? 0, [cart?.subtotal]);

  const handleAdd = useCallback((product: CustomProduct, qty: number) => {
    if (product.stock_qty === 0) {
      toast.error('This item is out of stock'); return;
    }
    if (cart?.merchant_id && cart.merchant_id !== SHOP_MERCHANT_ID) {
      toast.error('Clear your restaurant cart first to add shop items.', {
        position: 'top-center',
      });
      return;
    }
    const added = addToCart({
      id:                  product.id,
      menu_item_id:        product.id,
      name:                product.name,
      price:               product.price,
      quantity:            qty,
      image_url:           product.imageurl ?? null,
      is_veg:              null,
      category:            product.category,
      category_id:         null,
      discount_percentage: 0,
      merchant_id:         SHOP_MERCHANT_ID,
    }, SHOP_MERCHANT_NAME);
    if (!added) {
      toast.error('Could not add to cart.'); return;
    }
    toast.success(`${product.name} added! 🛒`, {
      position: 'bottom-center', autoClose: 1200,
    });
  }, [cart, addToCart]);

  const handleRemove    = useCallback((id: string) => removeFromCart(id), [removeFromCart]);
  const handleUpdateQty = useCallback((id: string, delta: number) => {
    const newQty = Math.max(1, Math.min(20, (cartQtyMap[id] ?? 0) + delta));
    updateQuantity(id, newQty);
  }, [cartQtyMap, updateQuantity]);

  const conflictCart = cart?.merchant_id && cart.merchant_id !== SHOP_MERCHANT_ID;

  return (
    <AppShell title="Shop">
      <div className="min-h-screen bg-gradient-to-br from-orange-50/60 via-white to-pink-50/40">

        {/* Header with integrated search */}
        <ShopHeader
          cartCount={cartCount}
          search={search}
          setSearch={setSearch}
          totalProducts={allProducts.length}
        />

        <div className="max-w-5xl mx-auto px-4 py-4 pb-44 space-y-4">

          {/* Category nav — dynamic */}
          <CategoryNav
            categories={categories}
            selected={category}
            loading={catLoading}
            onSelect={cat => { setCategory(cat); setSearch(''); }}
          />

          {/* Conflict banner */}
          {conflictCart && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl px-4 py-3
                            flex items-center gap-3 animate-in slide-in-from-top duration-300">
              <span className="text-xl">⚠️</span>
              <div className="flex-1 min-w-0">
                <p className="font-black text-amber-800 text-sm">Cart has restaurant items</p>
                <p className="text-xs text-amber-600 font-medium mt-0.5">
                  Clear your cart to add shop products
                </p>
              </div>
              <button onClick={() => router.push('/customer/cart')}
                className="text-xs font-black text-amber-700 border border-amber-400
                           px-2.5 py-1.5 rounded-xl hover:bg-amber-100 transition flex-shrink-0">
                View cart
              </button>
            </div>
          )}

          {/* Result count + refresh */}
          {!loadingProds && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 font-semibold">
                {search
                  ? `${displayProducts.length} results for "${search}"`
                  : `${displayProducts.length} ${displayProducts.length === 1 ? 'product' : 'products'}`
                }
                {category !== 'all' && (
                  <span className="text-primary font-black ml-1">
                    in {categories.find(c => c.id === category)?.label ?? category}
                  </span>
                )}
              </p>
              <button onClick={() => setRefreshKey(k => k + 1)}
                className="p-1.5 text-gray-400 hover:text-primary hover:bg-orange-50
                           rounded-xl transition-all hover:scale-110 active:scale-90">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Wishlist notice */}
          {!loadingProds && allProducts.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
              <Heart className="w-3 h-3 text-red-400 fill-red-400" />
              Tap the heart on any product to save to wishlist
            </div>
          )}

          {/* Grid / List */}
          <ProductGrid
            products={displayProducts}
            cartQtyMap={cartQtyMap}
            loading={loadingProds}
            sort={sort}
            setSort={setSort}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onAdd={handleAdd}
            onRemove={handleRemove}
            onUpdateQty={handleUpdateQty}
          />
        </div>

        {/* ── Sticky cart bar ── */}
        {cartCount > 0 && (
          <div className="fixed bottom-4 left-4 right-4 z-50
                          animate-in slide-in-from-bottom duration-400">
            <button onClick={() => router.push('/customer/cart')}
              className="w-full bg-gradient-to-r from-primary to-pink-500 text-white
                         px-5 py-4 rounded-2xl font-black shadow-2xl
                         hover:shadow-3xl hover:scale-[1.02] transition-all
                         flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-white/70 font-semibold leading-tight">
                    {cartCount} {cartCount === 1 ? 'item' : 'items'}
                  </p>
                  <p className="font-black text-sm leading-tight">
                    ₹{cartTotal.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-xl">
                <span className="text-sm font-black">Go to Cart</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ShopFallback() {
  return (
    <AppShell title="Shop">
      <div className="min-h-screen flex items-center justify-center
                      bg-gradient-to-br from-orange-50 via-white to-pink-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-semibold text-gray-400">Loading shop…</p>
        </div>
      </div>
    </AppShell>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<ShopFallback />}>
      <ShopPageInner />
    </Suspense>
  );
}
