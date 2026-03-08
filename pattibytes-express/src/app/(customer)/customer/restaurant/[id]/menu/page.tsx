/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

import DashboardLayout from '@/components/layouts/DashboardLayout';
import { restaurantService, type MenuByCategory } from '@/services/restaurants';
import { useCart } from '@/contexts/CartContext';
import { type CartItem } from '@/services/cart';
import { getSafeImageSrc } from '@/lib/safeImage';
import { toast } from 'react-toastify';

import {
  ShoppingCart, ArrowLeft, Search, X,
  SlidersHorizontal, Leaf, Image as ImageIcon, FileText,
} from 'lucide-react';

import { type MenuItem, type SortKey, finalPrice } from '../_components/types';
import { MenuGridCard }    from './_components/MenuGridCard';
import { MenuSheetModal }  from './_components/MenuSheetModal';

export default function RestaurantFullMenuPage() {
  const params    = useParams();
  const router    = useRouter();
  const { addToCart, itemCount } = useCart();

  const restaurantId = String((params as any)?.id || '');

  // ── state ──────────────────────────────────────────────────────────────────
  const [restaurant,      setRestaurant]      = useState<any | null>(null);
  const [menuByCategory,  setMenuByCategory]  = useState<MenuByCategory>({});
  const [loading,         setLoading]         = useState(true);

  const [search,    setSearch]    = useState('');
  const [vegOnly,   setVegOnly]   = useState(false);
  const [sortKey,   setSortKey]   = useState<SortKey>('recommended');
  const [quantities,setQuantities]= useState<Record<string, number>>({});

  // Progressive render for big menus
  const [visibleCount, setVisibleCount] = useState(48);

  // Sheet modal
  const [sheetOpen,      setSheetOpen]      = useState(false);
  const [sheetRenderAll, setSheetRenderAll]  = useState(false);

  // ── load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!restaurantId) return;
    (async () => {
      setLoading(true);
      try {
        const [r, menu] = await Promise.all([
          restaurantService.getRestaurantById(restaurantId),
          restaurantService.getMenuItemsByCategory(restaurantId),
        ]);
        if (!r) {
          toast.error('Restaurant not found');
          router.push('/customer/dashboard');
          return;
        }
        setRestaurant(r);
        setMenuByCategory(menu || {});
      } catch {
        toast.error('Failed to load menu');
      } finally {
        setLoading(false);
      }
    })();
  }, [restaurantId, router]);

  // Reset visible count when filters change
  useEffect(() => { setVisibleCount(48); }, [search, vegOnly, sortKey]);

  // ── cart ───────────────────────────────────────────────────────────────────
  const updateQty = (id: string, delta: number) =>
    setQuantities(prev => ({ ...prev, [id]: Math.max(1, Math.min(10, (prev[id] || 1) + delta)) }));

  const add = (item: MenuItem) => {
    const cartItem: CartItem = {
      id:                  item.id,
      merchant_id:         restaurantId,
      name:                item.name,
      price:               item.price,
      quantity:            quantities[item.id] || 1,
      image_url:           item.image_url,
      is_veg:              item.is_veg,
      category:            item.category,
      discount_percentage: item.discount_percentage,
      category_id:         null,
      menu_item_id:        item.id,
    };
    if (!addToCart(cartItem, restaurant?.business_name || 'Restaurant')) {
      toast.error('You have items from another restaurant. Please clear your cart first.');
      return;
    }
    toast.success(`${item.name} added to cart!`);
    setQuantities(prev => ({ ...prev, [item.id]: 1 }));
  };

  // ── derived ────────────────────────────────────────────────────────────────
  const flatItems = useMemo<MenuItem[]>(() => {
    const all = Object.entries(menuByCategory || {}).flatMap(([category, items]) =>
      (items || []).map((it: any) => ({ ...it, category: it.category || category }) as MenuItem)
    );
    const q    = search.trim().toLowerCase();
    let list   = vegOnly ? all.filter(it => it.is_veg === true) : all;
    if (q) list = list.filter(it =>
      String(it.name        || '').toLowerCase().includes(q) ||
      String(it.description || '').toLowerCase().includes(q) ||
      String(it.category    || '').toLowerCase().includes(q)
    );
    if (sortKey === 'price_low')  list = [...list].sort((a, b) => finalPrice(a.price, a.discount_percentage) - finalPrice(b.price, b.discount_percentage));
    if (sortKey === 'price_high') list = [...list].sort((a, b) => finalPrice(b.price, b.discount_percentage) - finalPrice(a.price, a.discount_percentage));
    return list;
  }, [menuByCategory, search, vegOnly, sortKey]);

  const gridItems    = flatItems.slice(0, visibleCount);
  const merchantLogo = getSafeImageSrc((restaurant as any)?.logo_url);

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-6 pb-28 md:pb-8">

          {/* Top bar */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 font-extrabold"
            >
              <ArrowLeft className="w-5 h-5" /> Back
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => { setSheetRenderAll(false); setSheetOpen(true); }}
                className="inline-flex items-center gap-2 bg-white border border-gray-200 shadow-sm hover:shadow px-3 py-2 rounded-xl font-extrabold text-gray-900 text-sm"
              >
                <FileText className="w-5 h-5 text-gray-700" />
                Menu sheet
              </button>

              {itemCount > 0 && (
                <button
                  onClick={() => router.push('/customer/cart')}
                  className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-extrabold hover:bg-orange-600 text-sm"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Cart ({itemCount})
                </button>
              )}
            </div>
          </div>

          {/* Restaurant header */}
          <div className="bg-white rounded-2xl shadow p-4 md:p-5 mb-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                {merchantLogo ? (
                  <Image src={merchantLogo} alt="Logo" width={56} height={56} className="object-cover w-full h-full" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 truncate">
                  {restaurant?.business_name || 'Full Menu'}
                </h1>
                <p className="text-xs text-gray-600 font-semibold mt-1">
                  Showing {gridItems.length} / {flatItems.length} items
                </p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white rounded-2xl shadow p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-3 md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary font-semibold"
                  placeholder="Search items, category…"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                    aria-label="Clear"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={() => setVegOnly(v => !v)}
                  className={`px-3 py-3 rounded-xl border-2 font-extrabold inline-flex items-center gap-2 transition ${
                    vegOnly ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Leaf className="w-5 h-5" /> Veg
                </button>

                <div className="px-3 py-3 rounded-xl border-2 border-gray-200 bg-white font-extrabold inline-flex items-center gap-2 hover:border-primary transition">
                  <SlidersHorizontal className="w-5 h-5 text-gray-600" />
                  <select
                    value={sortKey}
                    onChange={e => setSortKey(e.target.value as SortKey)}
                    className="bg-transparent outline-none font-extrabold text-gray-700"
                    aria-label="Sort"
                  >
                    <option value="recommended">Recommended</option>
                    <option value="price_low">Price: Low → High</option>
                    <option value="price_high">Price: High → Low</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : flatItems.length === 0 ? (
            <div className="bg-white rounded-2xl shadow p-16 text-center text-gray-600 font-bold">
              No menu items found
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {gridItems.map(item => (
                  <MenuGridCard
                    key={item.id}
                    item={item}
                    quantity={quantities[item.id] || 1}
                    onUpdateQty={updateQty}
                    onAdd={add} now={undefined} restaurantOpen={false}                  />
                ))}
              </div>

              {/* Load more */}
              {visibleCount < flatItems.length && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setVisibleCount(c => Math.min(c + 80, flatItems.length))}
                    className="px-5 py-3 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow font-extrabold text-gray-900"
                  >
                    Load more
                  </button>
                  <button
                    onClick={() => setVisibleCount(flatItems.length)}
                    className="px-5 py-3 rounded-2xl bg-gray-900 text-white hover:bg-black font-extrabold"
                  >
                    Show all ({flatItems.length})
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Mobile sticky cart */}
        {itemCount > 0 && (
          <div className="fixed bottom-4 left-4 right-4 md:hidden z-50">
            <button
              onClick={() => router.push('/customer/cart')}
              className="w-full bg-primary text-white px-6 py-4 rounded-2xl hover:bg-orange-600 font-extrabold flex items-center justify-between shadow-2xl"
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-6 h-6" />
                <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
              </div>
              <span>View Cart →</span>
            </button>
          </div>
        )}

        {/* Sheet modal */}
        <MenuSheetModal
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          restaurantName={restaurant?.business_name || 'Restaurant'}
          merchantLogo={merchantLogo}
          flatItems={flatItems}
          renderAll={sheetRenderAll}
          onSetRenderAll={setSheetRenderAll}
          onAdd={add}
        />
      </div>
    </DashboardLayout>
  );
}
